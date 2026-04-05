import type { KlineBar, RawSymbolData } from "./types";

export type RuntimeStatus = {
  mode: "CONNECTING" | "LIVE" | "LIVE_PARTIAL" | "DEGRADED" | "OFFLINE";
  connectedSymbols: number;
  totalSymbols: number;
  wsConnected: boolean;
  lastUpdateTime: number;
  reconnectAttempts: number;
  // Runtime coverage diagnostics
  liveSubscribedCount: number;
  klinePrefetchedCount: number;
  hydrationComplete: boolean;
};

type SymbolUpdateCallback = (symbol: string, data: RawSymbolData) => void;
type StatusUpdateCallback = (status: RuntimeStatus) => void;

interface MiniTickerData {
  s: string;
  c: string;
  h: string;
  l: string;
  v: string;
  P: string;
}

function parseKlineREST(item: unknown[]): KlineBar {
  return {
    openTime: item[0] as number,
    open: Number.parseFloat(item[1] as string),
    high: Number.parseFloat(item[2] as string),
    low: Number.parseFloat(item[3] as string),
    close: Number.parseFloat(item[4] as string),
    volume: Number.parseFloat(item[5] as string),
    isClosed: true,
  };
}

// Maximum streams per single Binance combined-stream WebSocket connection.
// Binance documents 1024 streams/connection. We use 200 per connection for
// safety headroom and to keep URL lengths reasonable.
const WS_CHUNK_SIZE = 200;

export class BinanceRuntime {
  private symbolData = new Map<string, RawSymbolData>();
  private onSymbolUpdate: SymbolUpdateCallback;
  private onStatusUpdate: StatusUpdateCallback;

  // Multi-connection support for full-universe live subscription
  private wsConnections: WebSocket[] = [];
  private reconnectAttempts = 0;
  private maxReconnects = 10;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private connectedAt = 0;
  private allSymbols: string[] = [];
  // Volume-sorted symbols — populated after loadBulkTicker
  private volumeSortedSymbols: string[] = [];
  private prioritySymbols: string[] = [];
  private staleCheckInterval: ReturnType<typeof setInterval> | null = null;
  private running = false;
  private inSlowRetry = false;

  // Hydration tracking
  private klinePrefetchedCount = 0;
  private hydrationComplete = false;

  private status: RuntimeStatus = {
    mode: "CONNECTING",
    connectedSymbols: 0,
    totalSymbols: 0,
    wsConnected: false,
    lastUpdateTime: 0,
    reconnectAttempts: 0,
    liveSubscribedCount: 0,
    klinePrefetchedCount: 0,
    hydrationComplete: false,
  };

  constructor(
    onSymbolUpdate: SymbolUpdateCallback,
    onStatusUpdate: StatusUpdateCallback,
  ) {
    this.onSymbolUpdate = onSymbolUpdate;
    this.onStatusUpdate = onStatusUpdate;
  }

  async start() {
    this.running = true;
    try {
      await this.discoverSymbols();
      this.connectAll();
      this.staleCheckInterval = setInterval(() => this.checkStale(), 10000);
    } catch (e) {
      console.error("[BinanceRuntime] Failed to start:", e);
      this.setStatus({ mode: "OFFLINE", wsConnected: false });
      this.scheduleReconnect();
    }
  }

  stop() {
    this.running = false;
    for (const ws of this.wsConnections) {
      ws.close();
    }
    this.wsConnections = [];
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.staleCheckInterval) {
      clearInterval(this.staleCheckInterval);
      this.staleCheckInterval = null;
    }
  }

  getSymbolData(symbol: string): RawSymbolData | undefined {
    return this.symbolData.get(symbol);
  }

  getAllSymbols(): string[] {
    return this.allSymbols;
  }

  getStatus(): RuntimeStatus {
    return this.status;
  }

  private setStatus(partial: Partial<RuntimeStatus>) {
    const anyWsOpen = this.wsConnections.some(
      (ws) => ws.readyState === WebSocket.OPEN,
    );
    this.status = {
      ...this.status,
      ...partial,
      connectedSymbols: this.symbolData.size,
      totalSymbols: this.allSymbols.length,
      reconnectAttempts: this.reconnectAttempts,
      lastUpdateTime: Date.now(),
      liveSubscribedCount: this.allSymbols.length,
      klinePrefetchedCount: this.klinePrefetchedCount,
      hydrationComplete: this.hydrationComplete,
      // Override wsConnected only if not explicitly provided
      wsConnected:
        partial.wsConnected !== undefined ? partial.wsConnected : anyWsOpen,
    };
    this.onStatusUpdate(this.status);
  }

  private async discoverSymbols() {
    const res = await fetch("https://fapi.binance.com/fapi/v1/exchangeInfo");
    if (!res.ok) throw new Error("Failed to fetch exchangeInfo");
    const data = await res.json();
    const symbols: string[] = [];
    for (const sym of data.symbols) {
      if (
        sym.status === "TRADING" &&
        sym.quoteAsset === "USDT" &&
        sym.contractType === "PERPETUAL" &&
        !sym.symbol.includes("200") &&
        !sym.symbol.includes("DEFI")
      ) {
        symbols.push(sym.symbol as string);
      }
    }
    this.allSymbols = symbols;
    for (const sym of symbols) {
      if (!this.symbolData.has(sym)) {
        this.symbolData.set(sym, this.createEmptySymbolData(sym));
      }
    }

    // Step 1: load bulk ticker to get real volume data for priority ordering
    await this.loadBulkTicker();

    // Step 2: sort by 24h USDT volume descending — highest-liquidity symbols first
    this.volumeSortedSymbols = [...symbols].sort((a, b) => {
      const va = this.symbolData.get(a)?.volume ?? 0;
      const vb = this.symbolData.get(b)?.volume ?? 0;
      return vb - va;
    });

    // Step 3: priority = top 100 by volume (not alphabetical discovery order)
    this.prioritySymbols = this.volumeSortedSymbols.slice(0, 100);

    console.log(
      `[BinanceRuntime] Discovered ${symbols.length} symbols. ` +
        `Priority top-100 by volume: ${this.prioritySymbols.slice(0, 5).join(", ")}...`,
    );

    // Step 4: prefetch klines for top 100 priority symbols immediately
    await this.loadInitialKlines(this.prioritySymbols);
    this.klinePrefetchedCount = this.prioritySymbols.length;

    // Step 5: background hydration for remaining symbols
    const remaining = this.volumeSortedSymbols.slice(100);
    this.backgroundHydrate(remaining);

    this.setStatus({ totalSymbols: symbols.length });
  }

  private createEmptySymbolData(symbol: string): RawSymbolData {
    return {
      symbol,
      lastPrice: 0,
      bidPrice: 0,
      askPrice: 0,
      priceChangePercent: 0,
      volume: 0,
      highPrice: 0,
      lowPrice: 0,
      klines4h: [],
      klines1h: [],
      klines15m: [],
      klines5m: [],
      klines1m: [],
      lastTickTime: 0,
      wsConnected: false,
      dataQuality: 50,
    };
  }

  private async loadInitialKlines(symbols: string[]) {
    const intervals = ["4h", "1h", "15m", "5m", "1m"] as const;
    // Build flat list of all (symbol, interval) pairs
    const pairs: Array<{ symbol: string; interval: string }> = [];
    for (const sym of symbols) {
      for (const tf of intervals) {
        pairs.push({ symbol: sym, interval: tf });
      }
    }
    // Fetch with concurrency=8 to balance speed vs rate-limit pressure
    const concurrency = 8;
    for (let i = 0; i < pairs.length; i += concurrency) {
      const batch = pairs.slice(i, i + concurrency);
      await Promise.allSettled(
        batch.map(({ symbol, interval }) => this.fetchKlines(symbol, interval)),
      );
    }
  }

  /**
   * Background hydration: load klines for symbols outside the initial top-100.
   * Uses low concurrency (3) to avoid hammering the REST API while live ticks
   * are already running. All symbols are eventually hydrated; engine scoring
   * remains honest (capped) until klines arrive.
   */
  private async backgroundHydrate(symbols: string[]) {
    const intervals = ["4h", "1h", "15m", "5m"] as const; // skip 1m for background — loaded on Detail open
    const pairs: Array<{ symbol: string; interval: string }> = [];
    for (const sym of symbols) {
      for (const tf of intervals) {
        pairs.push({ symbol: sym, interval: tf });
      }
    }
    const concurrency = 3;
    let hydrated = 0;
    for (let i = 0; i < pairs.length; i += concurrency) {
      if (!this.running) break;
      const batch = pairs.slice(i, i + concurrency);
      await Promise.allSettled(
        batch.map(({ symbol, interval }) => this.fetchKlines(symbol, interval)),
      );
      // Count unique symbols completed
      if (i % (concurrency * 5) === 0) {
        hydrated = Math.floor(i / intervals.length);
        this.klinePrefetchedCount = this.prioritySymbols.length + hydrated;
        this.setStatus({});
      }
      // Small yield between batches to avoid blocking the event loop
      await new Promise((r) => setTimeout(r, 50));
    }
    this.hydrationComplete = true;
    this.klinePrefetchedCount = this.prioritySymbols.length + symbols.length;
    console.log(
      `[BinanceRuntime] Background hydration complete. Total kline-loaded symbols: ${this.klinePrefetchedCount}`,
    );
    this.setStatus({});
  }

  async loadKlinesForSymbol(symbol: string) {
    const intervals = ["4h", "1h", "15m", "5m", "1m"] as const;
    await Promise.allSettled(
      intervals.map((tf) => this.fetchKlines(symbol, tf)),
    );
  }

  private async fetchKlines(symbol: string, interval: string) {
    try {
      const res = await fetch(
        `https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=100`,
      );
      if (!res.ok) return;
      const data: unknown[][] = await res.json();
      const bars = data.map(parseKlineREST);
      const existing = this.symbolData.get(symbol);
      if (!existing) return;
      const updated: RawSymbolData = { ...existing };
      if (interval === "4h") updated.klines4h = bars;
      else if (interval === "1h") updated.klines1h = bars;
      else if (interval === "15m") updated.klines15m = bars;
      else if (interval === "5m") updated.klines5m = bars;
      else if (interval === "1m") updated.klines1m = bars;
      updated.dataQuality = Math.min(100, existing.dataQuality + 15);
      this.symbolData.set(symbol, updated);
    } catch (e) {
      console.warn(
        `[BinanceRuntime] klines fetch failed for ${symbol}/${interval}:`,
        e,
      );
    }
  }

  private async loadBulkTicker() {
    try {
      const res = await fetch("https://fapi.binance.com/fapi/v1/ticker/24hr");
      if (!res.ok) return;
      const tickers: Array<{
        symbol: string;
        lastPrice: string;
        highPrice: string;
        lowPrice: string;
        volume: string;
        priceChangePercent: string;
        bidPrice: string;
        askPrice: string;
      }> = await res.json();
      for (const t of tickers) {
        const existing = this.symbolData.get(t.symbol);
        if (!existing) continue;
        const lastPrice = Number.parseFloat(t.lastPrice) || existing.lastPrice;
        const pctChange = Number.parseFloat(t.priceChangePercent);
        this.symbolData.set(t.symbol, {
          ...existing,
          lastPrice: lastPrice || existing.lastPrice,
          bidPrice: Number.parseFloat(t.bidPrice) || lastPrice * 0.9997,
          askPrice: Number.parseFloat(t.askPrice) || lastPrice * 1.0003,
          highPrice: Number.parseFloat(t.highPrice) || existing.highPrice,
          lowPrice: Number.parseFloat(t.lowPrice) || existing.lowPrice,
          volume: Number.parseFloat(t.volume) || existing.volume,
          priceChangePercent: Number.isFinite(pctChange)
            ? pctChange
            : existing.priceChangePercent,
          lastTickTime: lastPrice > 0 ? Date.now() : existing.lastTickTime,
          dataQuality: Math.min(100, existing.dataQuality + 20),
        });
      }
    } catch (e) {
      console.warn("[BinanceRuntime] bulk ticker fetch failed:", e);
    }
  }

  /**
   * Connect to the full universe via multiple WebSocket connections.
   * Binance combined-stream supports up to 1024 streams/connection.
   * We chunk at WS_CHUNK_SIZE=200 for safety and URL-length headroom.
   * Each chunk gets its own WebSocket; all feed into the same symbolData map.
   */
  private connectAll() {
    if (!this.running) return;
    if (this.allSymbols.length === 0) {
      this.setStatus({ mode: "OFFLINE", wsConnected: false });
      this.scheduleReconnect();
      return;
    }

    // Close any existing connections before reconnecting
    for (const ws of this.wsConnections) {
      ws.close();
    }
    this.wsConnections = [];

    // Split full universe into chunks
    const chunks: string[][] = [];
    for (let i = 0; i < this.allSymbols.length; i += WS_CHUNK_SIZE) {
      chunks.push(this.allSymbols.slice(i, i + WS_CHUNK_SIZE));
    }

    console.log(
      `[BinanceRuntime] Opening ${chunks.length} WebSocket connection(s) ` +
        `for ${this.allSymbols.length} symbols (chunk size ${WS_CHUNK_SIZE})`,
    );

    let openCount = 0;
    let closeCount = 0;

    for (let chunkIdx = 0; chunkIdx < chunks.length; chunkIdx++) {
      const chunk = chunks[chunkIdx];
      const streams = chunk
        .map((s) => `${s.toLowerCase()}@miniTicker`)
        .join("/");
      const url = `wss://fstream.binance.com/stream?streams=${streams}`;

      try {
        const ws = new WebSocket(url);
        this.wsConnections.push(ws);

        ws.onopen = () => {
          openCount++;
          // On first connection open, reset reconnect state
          if (openCount === 1) {
            this.reconnectAttempts = 0;
            this.inSlowRetry = false;
            this.connectedAt = Date.now();
          }
          // Mark all symbols in this chunk as ws-connected
          for (const sym of chunk) {
            const d = this.symbolData.get(sym);
            if (d) this.symbolData.set(sym, { ...d, wsConnected: true });
          }
          // Once all chunks are open, go LIVE
          if (openCount === chunks.length) {
            this.setStatus({ mode: "LIVE", wsConnected: true });
          } else {
            this.setStatus({ mode: "CONNECTING", wsConnected: true });
          }
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data as string) as {
              stream: string;
              data: MiniTickerData;
            };
            this.handleMessage(msg);
          } catch (_) {
            // silently ignore malformed messages
          }
        };

        ws.onerror = () => {
          // Log but don't immediately degrade — other connections may still be live
          console.warn(`[BinanceRuntime] WS chunk ${chunkIdx} error`);
        };

        ws.onclose = () => {
          if (!this.running) return;
          closeCount++;
          // Mark symbols in this chunk as disconnected
          for (const sym of chunk) {
            const d = this.symbolData.get(sym);
            if (d) this.symbolData.set(sym, { ...d, wsConnected: false });
          }
          // If ALL connections have closed, schedule a full reconnect
          if (closeCount >= chunks.length) {
            closeCount = 0;
            openCount = 0;
            this.setStatus({ mode: "DEGRADED", wsConnected: false });
            this.scheduleReconnect();
          } else {
            // Partial — LIVE_PARTIAL, other connections still running
            this.setStatus({ mode: "LIVE_PARTIAL" });
          }
        };

        // Proactive reconnect at 23 hours (Binance drops streams at 24h)
        setTimeout(
          () => {
            if (this.running && ws.readyState === WebSocket.OPEN) {
              ws.close();
            }
          },
          23 * 60 * 60 * 1000,
        );
      } catch (e) {
        console.error(
          `[BinanceRuntime] WS chunk ${chunkIdx} constructor error:`,
          e,
        );
      }
    }

    if (this.wsConnections.length === 0) {
      this.setStatus({ mode: "DEGRADED", wsConnected: false });
      this.scheduleReconnect();
    }
  }

  private handleMessage(msg: {
    stream: string;
    data: MiniTickerData;
  }) {
    const data = msg.data;
    if (!data.s) return;
    const symbol = data.s;
    if (!this.symbolData.has(symbol)) return;

    const existing = this.symbolData.get(symbol)!;
    const lastPrice = Number.parseFloat(data.c) || existing.lastPrice;
    const spreadApprox = lastPrice * 0.0003;
    const updated: RawSymbolData = {
      ...existing,
      lastPrice,
      bidPrice: lastPrice - spreadApprox,
      askPrice: lastPrice + spreadApprox,
      priceChangePercent: (() => {
        const p = Number.parseFloat(data.P);
        return Number.isFinite(p) ? p : existing.priceChangePercent;
      })(),
      volume: (() => {
        const v = Number.parseFloat(data.v);
        return v > 0 ? v : existing.volume;
      })(),
      highPrice: (() => {
        const h = Number.parseFloat(data.h);
        return h > 0 ? h : existing.highPrice;
      })(),
      lowPrice: (() => {
        const l = Number.parseFloat(data.l);
        return l > 0 ? l : existing.lowPrice;
      })(),
      lastTickTime: Date.now(),
      wsConnected: true,
      dataQuality: Math.min(100, existing.dataQuality + 5),
    };
    this.symbolData.set(symbol, updated);
    this.onSymbolUpdate(symbol, updated);
  }

  private checkStale() {
    const now = Date.now();
    for (const [sym, d] of this.symbolData.entries()) {
      if (d.wsConnected && d.lastTickTime > 0 && now - d.lastTickTime > 30000) {
        this.symbolData.set(sym, {
          ...d,
          dataQuality: Math.max(0, d.dataQuality - 10),
        });
      }
    }
  }

  private scheduleReconnect() {
    if (!this.running) return;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    const isFastPhase =
      this.reconnectAttempts < this.maxReconnects && !this.inSlowRetry;

    if (isFastPhase) {
      const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 8000);
      this.reconnectAttempts++;
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null;
        this.connectAll();
      }, delay);
    } else {
      this.inSlowRetry = true;
      this.setStatus({ mode: "DEGRADED", wsConnected: false });
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null;
        this.reconnectAttempts = 0;
        this.connectAll();
      }, 30000);
    }
  }
}

import { useCallback, useEffect, useRef, useState } from "react";
import type { backendInterface } from "../backend";
import { createActorWithConfig } from "../config";
import { BinanceRuntime } from "./binanceRuntime";
import type { RuntimeStatus } from "./binanceRuntime";
import { runC16Engine } from "./c16Engine";
import { mergeCanonicalState } from "./canonicalMerger";
import { runContext7dEngine } from "./context7dEngine";
import { runExecutionResolver } from "./executionResolver";
import { runMTFEngine } from "./mtfEngine";
import type { CanonicalSymbolState, RawSymbolData } from "./types";

const UPDATE_INTERVAL_MS = 500;

// Lazy backend accessor — avoids module-level side effects
let backendInstance: backendInterface | null = null;
async function getBackend(): Promise<backendInterface> {
  if (!backendInstance) {
    backendInstance = await createActorWithConfig();
  }
  return backendInstance;
}

export function useCanonicalEngine() {
  const [symbolStates, setSymbolStates] = useState<
    Map<string, CanonicalSymbolState>
  >(new Map());
  const [runtimeStatus, setRuntimeStatus] = useState<RuntimeStatus>({
    mode: "CONNECTING",
    connectedSymbols: 0,
    totalSymbols: 0,
    wsConnected: false,
    lastUpdateTime: 0,
    reconnectAttempts: 0,
    liveSubscribedCount: 0,
    klinePrefetchedCount: 0,
    hydrationComplete: false,
  });
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [isInitializing, setIsInitializing] = useState(true);

  const runtimeRef = useRef<BinanceRuntime | null>(null);
  const pendingUpdates = useRef<Map<string, RawSymbolData>>(new Map());
  const flushTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prev7dScores = useRef<Map<string, number>>(new Map());
  // Fix G: maintain per-symbol trust history so stale/degraded reductions are cumulative
  const prevTrust = useRef<Map<string, number>>(new Map());

  const computeState = useCallback(
    (symbol: string, raw: RawSymbolData): CanonicalSymbolState => {
      const prev7d = prev7dScores.current.get(symbol);
      const prevTrustVal = prevTrust.current.get(symbol);
      const c16 = runC16Engine(raw, prevTrustVal);
      const context7d = runContext7dEngine(raw.klines4h, raw.klines1h, prev7d);
      const mtf = runMTFEngine(
        raw.klines4h,
        raw.klines1h,
        raw.klines15m,
        raw.klines5m,
        raw.klines1m,
      );
      const runtimeMode =
        !raw.wsConnected && Date.now() - raw.lastTickTime > 60000
          ? "OFFLINE"
          : !raw.wsConnected
            ? "DEGRADED"
            : Date.now() - raw.lastTickTime > 30000
              ? "LIVE_PARTIAL"
              : "LIVE";
      const exec = runExecutionResolver(
        c16,
        mtf,
        raw.klines1h,
        raw.klines15m,
        runtimeMode,
      );
      const state = mergeCanonicalState(raw, c16, context7d, mtf, exec);
      prev7dScores.current.set(symbol, context7d.score);
      prevTrust.current.set(symbol, c16.trust);
      return state;
    },
    [],
  );

  const flushUpdates = useCallback(() => {
    if (pendingUpdates.current.size === 0) return;
    const updates = new Map(pendingUpdates.current);
    pendingUpdates.current.clear();

    setSymbolStates((prev) => {
      const next = new Map(prev);
      for (const [symbol, raw] of updates.entries()) {
        try {
          const state = computeState(symbol, raw);
          next.set(symbol, state);
        } catch (e) {
          console.warn(`[Engine] Failed to compute state for ${symbol}:`, e);
        }
      }
      return next;
    });
  }, [computeState]);

  // Load watchlist from backend
  useEffect(() => {
    getBackend()
      .then((b) => b.getWatchlist())
      .then((wl) => setWatchlist(wl))
      .catch((e) => console.warn("[Engine] Failed to load watchlist:", e))
      .finally(() => setIsInitializing(false));
  }, []);

  // Initialize runtime
  useEffect(() => {
    const runtime = new BinanceRuntime(
      (symbol, data) => {
        pendingUpdates.current.set(symbol, data);
      },
      (status) => setRuntimeStatus(status),
    );
    runtimeRef.current = runtime;
    runtime
      .start()
      .catch((e) => console.error("[Engine] Runtime start failed:", e));

    // Flush updates at rate-limited interval
    flushTimerRef.current = setInterval(flushUpdates, UPDATE_INTERVAL_MS);

    return () => {
      runtime.stop();
      if (flushTimerRef.current) clearInterval(flushTimerRef.current);
    };
  }, [flushUpdates]);

  const getState = useCallback(
    (symbol: string): CanonicalSymbolState | undefined => {
      return symbolStates.get(symbol);
    },
    [symbolStates],
  );

  const addToWatchlist = useCallback(async (symbol: string) => {
    setWatchlist((prev) => {
      if (prev.includes(symbol)) return prev;
      return [...prev, symbol];
    });
    // Load klines if not yet loaded
    if (runtimeRef.current) {
      const data = runtimeRef.current.getSymbolData(symbol);
      if (data && data.klines4h.length === 0) {
        runtimeRef.current.loadKlinesForSymbol(symbol).catch(() => {});
      }
    }
    try {
      const b = await getBackend();
      await b.addToWatchlist(symbol);
    } catch (e) {
      console.warn("[Engine] Failed to persist watchlist add:", e);
    }
  }, []);

  const removeFromWatchlist = useCallback(async (symbol: string) => {
    setWatchlist((prev) => prev.filter((s) => s !== symbol));
    try {
      const b = await getBackend();
      await b.removeFromWatchlist(symbol);
    } catch (e) {
      console.warn("[Engine] Failed to persist watchlist remove:", e);
    }
  }, []);

  const loadKlinesForSymbol = useCallback(async (symbol: string) => {
    if (runtimeRef.current) {
      await runtimeRef.current.loadKlinesForSymbol(symbol);
    }
  }, []);

  // Derived lists
  const symbols = Array.from(symbolStates.keys());
  const priorityCore = symbols.filter(
    (s) => symbolStates.get(s)?.health.tier === "PRIORITY_CORE",
  );
  const layerB = symbols.filter(
    (s) => symbolStates.get(s)?.health.tier === "LAYER_B",
  );

  return {
    symbols,
    symbolStates,
    getState,
    watchlist,
    addToWatchlist,
    removeFromWatchlist,
    loadKlinesForSymbol,
    runtimeStatus,
    priorityCore,
    layerB,
    isInitializing,
  };
}

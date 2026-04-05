import type { KlineBar, Phase, RawSymbolData, Side } from "./types";

export interface C16Result {
  side: Side;
  phase: Phase;
  score: number;
  tradeReadiness: number;
  sideClarity: number;
  triggerQuality: number;
  executionQuality: number;
  risk: number;
  trust: number;
  mainBlockers: string[];
  secondaryBlockers: string[];
  tertiaryBlockers: string[];
}

function calcEMA(closes: number[], period: number): number[] {
  if (closes.length < period) return closes.map(() => 0);
  const k = 2 / (period + 1);
  const emas: number[] = [];
  let ema = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
  emas[period - 1] = ema;
  for (let i = period; i < closes.length; i++) {
    ema = closes[i] * k + ema * (1 - k);
    emas[i] = ema;
  }
  for (let i = 0; i < period - 1; i++) {
    emas[i] = emas[period - 1];
  }
  return emas;
}

function calcATR(bars: KlineBar[], period: number): number {
  if (bars.length < 2) return 0;
  const trs: number[] = [];
  for (let i = 1; i < bars.length; i++) {
    const hl = bars[i].high - bars[i].low;
    const hc = Math.abs(bars[i].high - bars[i - 1].close);
    const lc = Math.abs(bars[i].low - bars[i - 1].close);
    trs.push(Math.max(hl, hc, lc));
  }
  const slice = trs.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

function trendConsistency(closes: number[], lookback: number): number {
  const slice = closes.slice(-lookback);
  if (slice.length < 2) return 50;
  let upCount = 0;
  let downCount = 0;
  for (let i = 1; i < slice.length; i++) {
    if (slice[i] > slice[i - 1]) upCount++;
    else if (slice[i] < slice[i - 1]) downCount++;
  }
  const total = slice.length - 1;
  const dominant = Math.max(upCount, downCount);
  return (dominant / total) * 100;
}

export function runC16Engine(
  raw: RawSymbolData,
  previousTrust?: number,
): C16Result {
  const closes4h = raw.klines4h.map((k) => k.close);
  const closes1h = raw.klines1h.map((k) => k.close);
  const closes15m = raw.klines15m.map((k) => k.close);
  const closes5m = raw.klines5m.map((k) => k.close);

  // EMA-based side determination on 4H
  let side: Side = "NEUTRAL";
  let sideClarity = 0;

  if (closes4h.length >= 26) {
    const ema9 = calcEMA(closes4h, 9);
    const ema21 = calcEMA(closes4h, 21);
    const last = closes4h.length - 1;
    const e9 = ema9[last];
    const e21 = ema21[last];
    const price = closes4h[last];
    const separation = Math.abs(e9 - e21) / price;
    const trend = trendConsistency(closes4h, 8);

    // EMA separation magnitude as clarity
    const sepScore = Math.min(separation * 5000, 100);
    sideClarity = sepScore * 0.6 + trend * 0.4;

    if (e9 > e21 && sideClarity >= 30) {
      side = "LONG";
    } else if (e9 < e21 && sideClarity >= 30) {
      side = "SHORT";
    } else {
      side = "NEUTRAL";
      // Explicitly zero out sideClarity when neutral to prevent score inflation
      sideClarity = Math.min(sideClarity, 25);
    }
  } else if (closes4h.length >= 5) {
    const trend = trendConsistency(closes4h, Math.min(5, closes4h.length));
    sideClarity = trend * 0.5;
    const last = closes4h[closes4h.length - 1];
    const first = closes4h[0];
    if (last > first * 1.002) side = "LONG";
    else if (last < first * 0.998) side = "SHORT";
  }

  // 1H confirmation support
  // Only grant h1Support if it aligns with the 4H side
  let h1Support = 50;
  if (closes1h.length >= 9) {
    const ema9_1h = calcEMA(closes1h, 9);
    const ema21_1h = calcEMA(closes1h, Math.min(21, closes1h.length));
    const last = closes1h.length - 1;
    const h1Up = ema9_1h[last] > ema21_1h[last];
    const h1Down = ema9_1h[last] < ema21_1h[last];

    if (side === "LONG" && h1Up) {
      h1Support = 75;
    } else if (side === "SHORT" && h1Down) {
      h1Support = 75;
    } else if (side === "NEUTRAL") {
      // Neutral 4H: h1 cannot contribute directional support
      h1Support = 20;
    } else {
      // 1H contradicts or is unconfirmed vs 4H side
      h1Support = 25;
    }
  }

  // Trigger quality from 15M/5M
  let triggerQuality = 0;
  if (closes15m.length >= 5) {
    const last5 = closes15m.slice(-5);
    const atr = calcATR(raw.klines15m.slice(-20), 14);
    const price15 = closes15m[closes15m.length - 1];
    const move = Math.abs(last5[4] - last5[0]);
    const movePct = atr > 0 ? (move / atr) * 50 : 0;
    const cons15 = trendConsistency(closes15m, 5);
    triggerQuality = Math.min(movePct * 0.5 + cons15 * 0.5, 100);
    // Align trigger with side
    if (
      side === "LONG" &&
      closes15m[closes15m.length - 1] < closes15m[closes15m.length - 2]
    ) {
      triggerQuality *= 0.7;
    }
    if (
      side === "SHORT" &&
      closes15m[closes15m.length - 1] > closes15m[closes15m.length - 2]
    ) {
      triggerQuality *= 0.7;
    }
    // Neutral side: trigger quality is not directionally meaningful
    if (side === "NEUTRAL") {
      triggerQuality *= 0.4;
    }
    void price15;
  }
  if (closes5m.length >= 3) {
    const cons5 = trendConsistency(closes5m, Math.min(5, closes5m.length));
    triggerQuality = triggerQuality * 0.7 + cons5 * 0.3;
  }

  // Execution quality
  let executionQuality = 50;
  const spread =
    raw.lastPrice > 0
      ? ((raw.askPrice - raw.bidPrice) / raw.lastPrice) * 100
      : 5;
  if (spread < 0.05) executionQuality += 20;
  else if (spread < 0.1) executionQuality += 10;
  else if (spread > 0.3) executionQuality -= 20;
  executionQuality = Math.max(0, Math.min(100, executionQuality));

  // Risk
  let risk = 20;
  if (spread > 0.2) risk += 20;
  if (raw.dataQuality < 70) risk += 15;
  if (!raw.wsConnected) risk += 30;
  const atr4h = calcATR(raw.klines4h.slice(-20), 14);
  const atrPct = raw.lastPrice > 0 ? (atr4h / raw.lastPrice) * 100 : 0;
  if (atrPct > 5) risk += 10;
  risk = Math.min(100, risk);

  // Trust
  let trust = previousTrust !== undefined ? previousTrust : 100;
  if (raw.dataQuality < 80) trust = Math.max(trust - 10, 0);
  if (!raw.wsConnected) trust = Math.max(trust - 30, 0);
  const staleness = Date.now() - raw.lastTickTime;
  if (staleness > 30000) trust = Math.max(trust - 15, 0);
  trust = Math.max(0, Math.min(100, trust));

  // tradeReadiness composite
  let tradeReadiness = Math.max(
    0,
    Math.min(
      100,
      sideClarity * 0.3 +
        triggerQuality * 0.25 +
        executionQuality * 0.2 +
        h1Support * 0.15 +
        (100 - risk) * 0.1,
    ),
  );

  // -----------------------------------------------------------------------
  // TRADE READINESS CAPS — must match capped MTF maturity
  //
  // Tier 1 (hardest): 4H NEUTRAL
  //   → no directional structure — cap tighter than FORMING_SETUP threshold → cap 25
  //
  // Tier 2: 4H directional but 1H UNCONFIRMED
  //   → missing confirmation: tighter cap than plain "1H weak" → cap 38
  //
  // Tier 3: 4H directional + 1H contradicts (h1Support still low but not
  //   the UNCONFIRMED path from MTF) → cap 44 (existing behaviour)
  // -----------------------------------------------------------------------
  if (side === "NEUTRAL") {
    // 4H neutral: no directional structure — cap tighter than FORMING_SETUP threshold
    tradeReadiness = Math.min(tradeReadiness, 25);
  } else if (h1Support <= 25) {
    // Check which condition produced the low h1Support:
    // If h1Support is 25, it means 1H contradicts 4H (UNCONFIRMED path in mtfEngine
    // maps to h1Support 25 here). Apply the tighter cap to reflect missing confirmation.
    tradeReadiness = Math.min(tradeReadiness, 38);
  } else if (h1Support < 50) {
    // Weak but not fully unconfirmed
    tradeReadiness = Math.min(tradeReadiness, 44);
  }

  // C16 score
  const score = Math.min(
    100,
    sideClarity * 0.35 + tradeReadiness * 0.35 + triggerQuality * 0.3,
  );

  // Phase
  // NEUTRAL side is always DORMANT regardless of other scores
  let phase: Phase;
  if (sideClarity < 30 || side === "NEUTRAL") {
    phase = "DORMANT";
  } else if (sideClarity < 55) {
    phase = "BUILDING";
  } else if (sideClarity < 70) {
    phase = "PRESSURIZED";
  } else if (sideClarity >= 70 && triggerQuality >= 60) {
    phase = "TRIGGERABLE";
  } else {
    phase = "PRESSURIZED";
  }

  // Blockers
  const mainBlockers: string[] = [];
  const secondaryBlockers: string[] = [];
  const tertiaryBlockers: string[] = [];

  if (side === "NEUTRAL")
    mainBlockers.push("No directional structure — 4H neutral");
  else if (sideClarity < 50) mainBlockers.push("Side clarity too low");
  if (tradeReadiness < 30) mainBlockers.push("Trade readiness below threshold");
  if (trust < 65) mainBlockers.push("Trust degraded");

  if (triggerQuality < 40)
    secondaryBlockers.push("Trigger quality insufficient");
  if (executionQuality < 40) secondaryBlockers.push("Execution quality poor");
  if (risk > 70) secondaryBlockers.push("Risk too high");

  if (spread > 0.2) tertiaryBlockers.push("Spread too wide");
  if (atrPct > 5) tertiaryBlockers.push("High volatility risk");

  return {
    side,
    phase,
    score,
    tradeReadiness,
    sideClarity,
    triggerQuality,
    executionQuality,
    risk,
    trust,
    mainBlockers,
    secondaryBlockers,
    tertiaryBlockers,
  };
}

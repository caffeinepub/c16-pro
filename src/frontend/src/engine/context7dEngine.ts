import type { Context7dStage, ContinuationState, KlineBar } from "./types";

export interface Context7dResult {
  score: number;
  accumulation: number;
  tension: number;
  priceHold: number;
  twoWayFlow: number;
  releasePotential: number;
  stage: Context7dStage;
  supportsLong: number;
  supportsShort: number;
  tags: string[];
  continuationState: ContinuationState;
}

function calcVolumeSMA(bars: KlineBar[], period: number): number {
  const slice = bars.slice(-period);
  if (slice.length === 0) return 0;
  return slice.reduce((a, b) => a + b.volume, 0) / slice.length;
}

function calcPriceRange(bars: KlineBar[]): {
  high: number;
  low: number;
  range: number;
} {
  if (bars.length === 0) return { high: 0, low: 0, range: 0 };
  const high = Math.max(...bars.map((b) => b.high));
  const low = Math.min(...bars.map((b) => b.low));
  return { high, low, range: high - low };
}

function calcPriceVariance(bars: KlineBar[]): number {
  if (bars.length < 2) return 0;
  const closes = bars.map((b) => b.close);
  const mean = closes.reduce((a, b) => a + b, 0) / closes.length;
  const variance =
    closes.reduce((acc, c) => acc + (c - mean) ** 2, 0) / closes.length;
  return Math.sqrt(variance) / mean;
}

export function runContext7dEngine(
  klines4h: KlineBar[],
  klines1h: KlineBar[],
  previousScore?: number,
): Context7dResult {
  // Use 4H bars as primary lookback (represents ~7 days worth of 4H candles = 42 bars)
  const bars = klines4h.slice(-42);
  const hourBars = klines1h.slice(-168); // 7 days of 1H

  if (bars.length < 10) {
    return {
      score: 0,
      accumulation: 0,
      tension: 0,
      priceHold: 0,
      twoWayFlow: 0,
      releasePotential: 0,
      stage: "EARLY_SIGNS",
      supportsLong: 0,
      supportsShort: 0,
      tags: ["Insufficient data"],
      continuationState: "STABLE",
    };
  }

  // AccumulationGrowthScore: volume buildup without price release
  const recentVolSMA = calcVolumeSMA(bars, 7);
  const olderVolSMA = calcVolumeSMA(bars.slice(0, -7), 14);
  const { range: priceRange } = calcPriceRange(bars);
  const { range: recentRange } = calcPriceRange(bars.slice(-10));
  const mid = bars[bars.length - 1].close;

  let accumulation = 0;
  if (olderVolSMA > 0) {
    const volGrowth = (recentVolSMA / olderVolSMA - 1) * 100;
    const priceContainment =
      recentRange > 0 && priceRange > 0 ? 1 - recentRange / priceRange : 0;
    accumulation = Math.max(
      0,
      Math.min(100, volGrowth * 0.4 + priceContainment * 60),
    );
  }

  // TensionGrowthScore: ATR compression + maintained volume
  const recentATR =
    bars.slice(-7).reduce((acc, b, i, arr) => {
      if (i === 0) return acc;
      return (
        acc +
        Math.max(
          b.high - b.low,
          Math.abs(b.high - arr[i - 1].close),
          Math.abs(b.low - arr[i - 1].close),
        )
      );
    }, 0) / 6;
  const olderATR =
    bars
      .slice(0, -7)
      .slice(-14)
      .reduce((acc, b, i, arr) => {
        if (i === 0) return acc;
        return (
          acc +
          Math.max(
            b.high - b.low,
            Math.abs(b.high - arr[i - 1].close),
            Math.abs(b.low - arr[i - 1].close),
          )
        );
      }, 0) / 13;
  const atrCompression =
    olderATR > 0 ? Math.max(0, (1 - recentATR / olderATR) * 100) : 0;
  const tension = Math.min(100, atrCompression * 0.6 + accumulation * 0.4);

  // PriceHoldScore: low variance around a level
  const priceVariance = calcPriceVariance(bars.slice(-14));
  const priceHold = Math.max(0, Math.min(100, (1 - priceVariance * 50) * 100));

  // TwoWayFlowPersistenceScore: neither side dominates over period
  let bullBars = 0;
  let bearBars = 0;
  const sliceForFlow =
    hourBars.length > 0 ? hourBars.slice(-48) : bars.slice(-12);
  for (const b of sliceForFlow) {
    if (b.close > b.open) bullBars++;
    else bearBars++;
  }
  const total = sliceForFlow.length;
  const dominance = total > 0 ? Math.abs(bullBars - bearBars) / total : 0;
  const twoWayFlow = Math.max(0, Math.min(100, (1 - dominance) * 100));

  // ReleasePotentialScore: coiled energy
  const releasePotential = Math.min(
    100,
    tension * 0.4 + accumulation * 0.35 + twoWayFlow * 0.25,
  );

  // Composite 7D score
  const score = Math.min(
    100,
    accumulation * 0.25 +
      tension * 0.25 +
      priceHold * 0.2 +
      twoWayFlow * 0.15 +
      releasePotential * 0.15,
  );

  // Directional bias
  const recentBars = bars.slice(-7);
  const upClose = recentBars.filter((b) => b.close > b.open).length;
  const downClose = recentBars.length - upClose;
  const priceDirection = mid > bars[0].close ? 1 : -1;
  const supportsLong = Math.min(
    100,
    priceDirection > 0
      ? score * 0.7 + (upClose / recentBars.length) * 30
      : score * 0.3,
  );
  const supportsShort = Math.min(
    100,
    priceDirection < 0
      ? score * 0.7 + (downClose / recentBars.length) * 30
      : score * 0.3,
  );

  // Stage
  let stage: Context7dStage;
  if (score < 35) stage = "EARLY_SIGNS";
  else if (score < 55) stage = "FORMING_SETUP";
  else if (score < 75) stage = "BREWING";
  else stage = "STABLE";

  // ContinuationState
  let continuationState: ContinuationState = "STABLE";
  if (previousScore !== undefined) {
    const delta = score - previousScore;
    if (delta > 5) continuationState = "STRENGTHENING";
    else if (delta < -5) continuationState = "WEAKENING";
    else if (score > 70 && delta > 0) continuationState = "RELEASING";
    else continuationState = "STABLE";
  }

  // Tags
  const tags: string[] = [];
  if (accumulation > 60) tags.push("Accumulation building");
  if (tension > 60) tags.push("Tension coiling");
  if (priceHold > 70) tags.push("Price held tight");
  if (twoWayFlow > 65) tags.push("Two-way participation");
  if (releasePotential > 65) tags.push("Release potential high");
  if (tags.length === 0) tags.push("Background watch");

  return {
    score,
    accumulation,
    tension,
    priceHold,
    twoWayFlow,
    releasePotential,
    stage,
    supportsLong,
    supportsShort,
    tags,
    continuationState,
  };
}

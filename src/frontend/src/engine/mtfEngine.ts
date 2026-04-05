import type { KlineBar, MTFConfirm1h, Side } from "./types";

export interface MTFResult {
  bias4h: Side;
  confirm1h: MTFConfirm1h;
  growth15m: number;
  growth5m: number;
  gate1mLong: number;
  gate1mShort: number;
  breakoutConfidenceLong: number;
  breakoutConfidenceShort: number;
  reversalConfidenceLong: number;
  reversalConfidenceShort: number;
  entryAllowed: boolean;
  mainExecutionBlocker: string | null;
}

function calcSMA(values: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      result.push(values[0]);
    } else {
      const slice = values.slice(i - period + 1, i + 1);
      result.push(slice.reduce((a, b) => a + b, 0) / period);
    }
  }
  return result;
}

function isTrendingUp(closes: number[], n: number): boolean {
  const slice = closes.slice(-n);
  if (slice.length < n) return false;
  let ups = 0;
  for (let i = 1; i < slice.length; i++) {
    if (slice[i] > slice[i - 1]) ups++;
  }
  return ups >= Math.ceil(n * 0.6);
}

function isTrendingDown(closes: number[], n: number): boolean {
  const slice = closes.slice(-n);
  if (slice.length < n) return false;
  let downs = 0;
  for (let i = 1; i < slice.length; i++) {
    if (slice[i] < slice[i - 1]) downs++;
  }
  return downs >= Math.ceil(n * 0.6);
}

function calcMomentumScore(bars: KlineBar[], lookback: number): number {
  if (bars.length < lookback) return 0;
  const slice = bars.slice(-lookback);
  const price = slice[slice.length - 1].close;
  const priceStart = slice[0].close;
  if (priceStart === 0) return 0;
  const pctMove = ((price - priceStart) / priceStart) * 100;
  // Volume trend
  const volStart = slice[0].volume;
  const volEnd = slice[slice.length - 1].volume;
  const volGrowth = volStart > 0 ? (volEnd / volStart - 1) * 50 : 0;
  // Consecutive directional candles
  let consDir = 0;
  const direction = pctMove > 0 ? 1 : -1;
  for (let i = slice.length - 1; i >= 0; i--) {
    if ((slice[i].close - slice[i].open) * direction > 0) consDir++;
    else break;
  }
  const consDirScore = Math.min(consDir * 15, 45);
  return Math.max(
    0,
    Math.min(100, Math.abs(pctMove) * 10 + volGrowth * 0.3 + consDirScore),
  );
}

export function runMTFEngine(
  klines4h: KlineBar[],
  klines1h: KlineBar[],
  klines15m: KlineBar[],
  klines5m: KlineBar[],
  klines1m: KlineBar[],
): MTFResult {
  // 4H Bias
  let bias4h: Side = "NEUTRAL";
  if (klines4h.length >= 20) {
    const closes4h = klines4h.map((k) => k.close);
    const sma20 = calcSMA(closes4h, 20);
    const lastSMA = sma20[sma20.length - 1];
    const lastClose = closes4h[closes4h.length - 1];
    if (lastClose > lastSMA && isTrendingUp(closes4h, 3)) {
      bias4h = "LONG";
    } else if (lastClose < lastSMA && isTrendingDown(closes4h, 3)) {
      bias4h = "SHORT";
    }
  }

  // 1H Confirmation
  let confirm1h: MTFConfirm1h = "UNCONFIRMED";
  if (klines1h.length >= 9) {
    const closes1h = klines1h.map((k) => k.close);
    const lastClose1h = closes1h[closes1h.length - 1];
    const sma9_1h = calcSMA(closes1h, 9);
    const lastSMA1h = sma9_1h[sma9_1h.length - 1];
    const trending1hUp = isTrendingUp(closes1h, 3);
    const trending1hDown = isTrendingDown(closes1h, 3);

    if (bias4h === "LONG" && lastClose1h > lastSMA1h && trending1hUp) {
      confirm1h = "LONG";
    } else if (
      bias4h === "SHORT" &&
      lastClose1h < lastSMA1h &&
      trending1hDown
    ) {
      confirm1h = "SHORT";
    } else if (bias4h === "NEUTRAL") {
      confirm1h = "UNCONFIRMED";
    }
    // If contradicts 4H, stays UNCONFIRMED
  }

  // 15M Growth
  const growth15m = calcMomentumScore(klines15m, Math.min(8, klines15m.length));

  // 5M Build
  const growth5m = calcMomentumScore(klines5m, Math.min(6, klines5m.length));

  // 1M Gate
  let gate1mLong = 0;
  let gate1mShort = 0;
  if (klines1m.length >= 3) {
    const last1m = klines1m[klines1m.length - 1];
    const prev1m = klines1m[klines1m.length - 2];
    const last5m = klines5m.length > 0 ? klines5m[klines5m.length - 1] : null;
    const alignLong = last5m ? last5m.close > last5m.open : false;
    const alignShort = last5m ? last5m.close < last5m.open : false;
    const closed1mUp =
      last1m.close > last1m.open && last1m.close > prev1m.close;
    const closed1mDown =
      last1m.close < last1m.open && last1m.close < prev1m.close;
    const wickRatioUp =
      last1m.high > last1m.close
        ? (last1m.high - last1m.close) / (last1m.close - last1m.low + 0.0001)
        : 0;
    const wickRatioDown =
      last1m.low < last1m.close
        ? (last1m.close - last1m.low) / (last1m.high - last1m.close + 0.0001)
        : 0;
    const cleanBodyUp = wickRatioUp < 1.5;
    const cleanBodyDown = wickRatioDown < 1.5;

    gate1mLong = Math.min(
      100,
      (alignLong ? 30 : 0) +
        (closed1mUp ? 40 : 0) +
        (cleanBodyUp ? 20 : 0) +
        growth5m * 0.1,
    );
    gate1mShort = Math.min(
      100,
      (alignShort ? 30 : 0) +
        (closed1mDown ? 40 : 0) +
        (cleanBodyDown ? 20 : 0) +
        growth5m * 0.1,
    );
  }

  // Breakout confidence
  const breakoutConfidenceLong = Math.min(
    100,
    (confirm1h === "LONG" ? 30 : 0) +
      growth15m * 0.3 +
      growth5m * 0.2 +
      gate1mLong * 0.2,
  );
  const breakoutConfidenceShort = Math.min(
    100,
    (confirm1h === "SHORT" ? 30 : 0) +
      growth15m * 0.3 +
      growth5m * 0.2 +
      gate1mShort * 0.2,
  );

  // Reversal confidence (opposite direction, lower by default)
  const reversalConfidenceLong = Math.min(
    100,
    bias4h === "SHORT" && confirm1h === "LONG"
      ? 50 + gate1mLong * 0.3
      : gate1mLong * 0.25,
  );
  const reversalConfidenceShort = Math.min(
    100,
    bias4h === "LONG" && confirm1h === "SHORT"
      ? 50 + gate1mShort * 0.3
      : gate1mShort * 0.25,
  );

  // Entry allowed
  const gateMax = Math.max(gate1mLong, gate1mShort);
  const entryAllowed =
    confirm1h !== "UNCONFIRMED" && gateMax >= 50 && bias4h !== "NEUTRAL";

  // Main execution blocker
  let mainExecutionBlocker: string | null = null;
  if (bias4h === "NEUTRAL") {
    mainExecutionBlocker = "4H bias neutral — no directional structure";
  } else if (confirm1h === "UNCONFIRMED") {
    mainExecutionBlocker = "1H confirmation missing";
  } else if (gateMax < 50) {
    mainExecutionBlocker = "1M gate too weak — timing not confirmed";
  }

  return {
    bias4h,
    confirm1h,
    growth15m,
    growth5m,
    gate1mLong,
    gate1mShort,
    breakoutConfidenceLong,
    breakoutConfidenceShort,
    reversalConfidenceLong,
    reversalConfidenceShort,
    entryAllowed,
    mainExecutionBlocker,
  };
}

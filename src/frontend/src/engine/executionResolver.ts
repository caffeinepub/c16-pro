import type { C16Result } from "./c16Engine";
import type { MTFResult } from "./mtfEngine";
import type {
  EngineState,
  EntryClass,
  ExecutionDisplayMode,
  KlineBar,
  RuntimeMode,
  Side,
} from "./types";

export interface ExecutionResult {
  executionSide: Side;
  engineState: EngineState;
  displayMode: ExecutionDisplayMode;
  entryClass: EntryClass;
  entryAllowed: boolean;
  canShowExactExecutionPlan: boolean;
  entryAnchorResolved: boolean;
  exactEntryPrice: number | null;
  exactStopLoss: number | null;
  exactInvalidationPrice: number | null;
  tp1: number | null;
  tp2: number | null;
  tp3: number | null;
  rr1: number | null;
  rr2: number | null;
  rr3: number | null;
  entryConfidence: number;
  executionModeLabel: string;
  mainExecutionBlocker: string | null;
  executionReasoning: string[];
  executionWarnings: string[];
}

function findSwingHighs(bars: KlineBar[], lookback: number): number[] {
  const slice = bars.slice(-lookback);
  const highs: number[] = [];
  for (let i = 1; i < slice.length - 1; i++) {
    if (
      slice[i].high > slice[i - 1].high &&
      slice[i].high > slice[i + 1].high
    ) {
      highs.push(slice[i].high);
    }
  }
  return highs.sort((a, b) => a - b);
}

function findSwingLows(bars: KlineBar[], lookback: number): number[] {
  const slice = bars.slice(-lookback);
  const lows: number[] = [];
  for (let i = 1; i < slice.length - 1; i++) {
    if (slice[i].low < slice[i - 1].low && slice[i].low < slice[i + 1].low) {
      lows.push(slice[i].low);
    }
  }
  return lows.sort((a, b) => a - b);
}

function calcRR(entry: number, sl: number, tp: number): number {
  const risk = Math.abs(entry - sl);
  const reward = Math.abs(tp - entry);
  return risk > 0 ? reward / risk : 0;
}

// -----------------------------------------------------------------------
// MTF MIDDLE-LAYER GATE
// Exact plan requires 15M or 5M to be non-weak (>= 25), UNLESS the entry
// class is PULLBACK or RECLAIM (early-exact exception).
// BREAKOUT and REVERSAL require active short-TF momentum — not exceptions.
// -----------------------------------------------------------------------
function isMiddleLayerSufficient(
  mtf: MTFResult,
  entryClass: EntryClass,
): { pass: boolean; blocker: string | null } {
  const both15m5mWeak = mtf.growth15m < 25 && mtf.growth5m < 25;
  if (!both15m5mWeak) return { pass: true, blocker: null };

  if (entryClass === "PULLBACK" || entryClass === "RECLAIM") {
    return { pass: true, blocker: null };
  }

  return {
    pass: false,
    blocker: `15M/5M both weak (15M: ${mtf.growth15m.toFixed(0)}, 5M: ${mtf.growth5m.toFixed(0)}) — exact plan requires middle-layer pressure`,
  };
}

// -----------------------------------------------------------------------
// 1M GATE BLOCKER — contextual wording
// Distinguishes between:
//   A) micro gate is strong but higher-TF conditions are blocking entry
//   B) micro gate score itself is too weak
// -----------------------------------------------------------------------
function resolve1MGateBlockerWarning(mtf: MTFResult): string {
  const gateMax = Math.max(mtf.gate1mLong, mtf.gate1mShort);
  const higherTFBlocked =
    mtf.bias4h === "NEUTRAL" || mtf.confirm1h === "UNCONFIRMED";

  if (higherTFBlocked && gateMax >= 50) {
    // Gate score is actually strong — the block comes from 4H/1H, not the gate
    return "Micro gate strong — higher-timeframe conditions not yet met";
  }
  if (higherTFBlocked) {
    // Both gate and higher-TF are problematic
    return "Higher-timeframe blocked — 4H/1H alignment required before gate";
  }
  // Gate score itself is the bottleneck
  return "1M gate too weak — wait for micro timing to confirm";
}

export function runExecutionResolver(
  c16: C16Result,
  mtf: MTFResult,
  klines1h: KlineBar[],
  klines15m: KlineBar[],
  runtimeMode: RuntimeMode,
  previousEngineState?: EngineState,
): ExecutionResult {
  const executionWarnings: string[] = [];
  const executionReasoning: string[] = [];

  const executionSide: Side = c16.side;
  // FIX #5: engineState must not use raw c16.phase for ARMED assignment.
  // ARMED state is assigned by canonicalMerger based on safePhase.
  // Here we only track IDLE/SETUP/ENTERED/MANAGING/EXITED/CANCELLED.
  let engineState: EngineState = previousEngineState || "IDLE";
  // If previous state was ARMED/READY and conditions no longer hold, reset to SETUP
  if (engineState === "ARMED" || engineState === "READY") {
    if (c16.phase !== "TRIGGERABLE" && c16.phase !== "PRESSURIZED") {
      engineState = "IDLE";
    }
  }

  // -----------------------------------------------------------------------
  // ENTRY CLASS RESOLUTION
  // -----------------------------------------------------------------------
  let entryClass: EntryClass = "NONE";
  if (c16.phase === "TRIGGERABLE" && c16.sideClarity >= 65) {
    const recentBars = klines15m.slice(-10);
    const isConsolidating =
      recentBars.length >= 4 &&
      Math.max(...recentBars.map((b) => b.high)) -
        Math.min(...recentBars.map((b) => b.low)) <
        Math.max(...klines15m.slice(-20).map((b) => b.high)) -
          Math.min(...klines15m.slice(-20).map((b) => b.low)) * 0.5;
    if (isConsolidating) {
      entryClass = "BREAKOUT";
    } else if (c16.sideClarity >= 65) {
      entryClass = "PULLBACK";
    }
  }
  if (mtf.reversalConfidenceLong >= 65 && c16.side === "SHORT") {
    entryClass = "REVERSAL";
  }
  if (mtf.reversalConfidenceShort >= 65 && c16.side === "LONG") {
    entryClass = "REVERSAL";
  }

  // Find structural levels from 1H klines
  const swingHighs1h = findSwingHighs(klines1h, Math.min(30, klines1h.length));
  const swingLows1h = findSwingLows(klines1h, Math.min(30, klines1h.length));
  const current1hClose =
    klines1h.length > 0 ? klines1h[klines1h.length - 1].close : 0;

  // Resolve entry anchor
  let exactEntryPrice: number | null = null;
  let exactStopLoss: number | null = null;
  let exactInvalidationPrice: number | null = null;
  let entryAnchorResolved = false;

  if (c16.side === "LONG" && swingLows1h.length >= 2 && current1hClose > 0) {
    const nearestResistanceAbove = swingHighs1h.find((h) => h > current1hClose);
    const nearestSupportBelow = [...swingLows1h]
      .reverse()
      .find((l) => l < current1hClose);
    const sl = nearestSupportBelow ? nearestSupportBelow * 0.998 : null;
    if (nearestResistanceAbove && sl) {
      exactEntryPrice = current1hClose;
      exactStopLoss = sl;
      exactInvalidationPrice = sl * 0.999;
      entryAnchorResolved = true;
    }
  } else if (
    c16.side === "SHORT" &&
    swingHighs1h.length >= 2 &&
    current1hClose > 0
  ) {
    const nearestSupportBelow = swingLows1h.find((l) => l < current1hClose);
    const nearestResistanceAbove = [...swingHighs1h]
      .reverse()
      .find((h) => h > current1hClose);
    const sl = nearestResistanceAbove ? nearestResistanceAbove * 1.002 : null;
    if (nearestSupportBelow && sl) {
      exactEntryPrice = current1hClose;
      exactStopLoss = sl;
      exactInvalidationPrice = sl * 1.001;
      entryAnchorResolved = true;
    }
  }

  // TP derivation
  let tp1: number | null = null;
  let tp2: number | null = null;
  let tp3: number | null = null;
  let rr1: number | null = null;
  let rr2: number | null = null;
  let rr3: number | null = null;

  if (exactEntryPrice && exactStopLoss && entryAnchorResolved) {
    if (c16.side === "LONG") {
      const candidates = swingHighs1h
        .filter((h) => h > exactEntryPrice! * 1.003 && h > exactEntryPrice!)
        .sort((a, b) => a - b);

      for (const cand of candidates) {
        const rr = calcRR(exactEntryPrice!, exactStopLoss!, cand);
        if (!tp1 && rr >= 1.5) {
          tp1 = cand;
          rr1 = rr;
        } else if (tp1 && !tp2 && cand > tp1 * 1.003 && rr >= 2.0) {
          tp2 = cand;
          rr2 = rr;
        } else if (tp2 && !tp3 && cand > tp2 * 1.003 && rr >= 3.0) {
          tp3 = cand;
          rr3 = rr;
        }
      }
    } else if (c16.side === "SHORT") {
      const candidates = swingLows1h
        .filter((l) => l < exactEntryPrice! * 0.997)
        .sort((a, b) => b - a);

      for (const cand of candidates) {
        const rr = calcRR(exactEntryPrice!, exactStopLoss!, cand);
        if (!tp1 && rr >= 1.5) {
          tp1 = cand;
          rr1 = rr;
        } else if (tp1 && !tp2 && cand < tp1 * 0.997 && rr >= 2.0) {
          tp2 = cand;
          rr2 = rr;
        } else if (tp2 && !tp3 && cand < tp2 * 0.997 && rr >= 3.0) {
          tp3 = cand;
          rr3 = rr;
        }
      }
    }
  }

  // TP MONOTONIC VALIDATION
  if (tp1 !== null && exactEntryPrice !== null) {
    if (c16.side === "LONG" && tp1 <= exactEntryPrice) {
      tp1 = null;
      rr1 = null;
      tp2 = null;
      rr2 = null;
      tp3 = null;
      rr3 = null;
    } else if (c16.side === "SHORT" && tp1 >= exactEntryPrice) {
      tp1 = null;
      rr1 = null;
      tp2 = null;
      rr2 = null;
      tp3 = null;
      rr3 = null;
    }
  }
  if (tp1 !== null && tp2 !== null && tp3 !== null) {
    if (c16.side === "LONG" && !(tp1 < tp2 && tp2 < tp3)) {
      tp3 = null;
      rr3 = null;
      if (!(tp1 < tp2)) {
        tp2 = null;
        rr2 = null;
      }
    } else if (c16.side === "SHORT" && !(tp1 > tp2 && tp2 > tp3)) {
      tp3 = null;
      rr3 = null;
      if (!(tp1 > tp2)) {
        tp2 = null;
        rr2 = null;
      }
    }
  }

  // -----------------------------------------------------------------------
  // WARNINGS
  //
  // Hierarchy: warnings only add information not already visible as the
  // primary mainBlocker. The 1H confirmation missing case is already
  // surfaced as the ui.mainBlocker — do not repeat it here as a warning.
  // The !mtf.entryAllowed warning uses contextual wording to distinguish
  // between "micro gate strong but higher-TF blocked" vs "gate too weak".
  // -----------------------------------------------------------------------
  if (!entryAnchorResolved)
    executionWarnings.push(
      "No entry anchor — no clean structural entry level found",
    );
  if (!exactStopLoss)
    executionWarnings.push("No clean invalidation level — SL cannot be set");
  // NOTE: 1H confirmation missing is intentionally NOT added to executionWarnings here.
  // It is already the primary mainBlocker visible in ui.mainBlocker.
  // Adding it again as a warning creates duplicate wording in the UI.
  // The !mtf.entryAllowed warning below already captures the gate-level consequence.
  if (!mtf.entryAllowed)
    executionWarnings.push(resolve1MGateBlockerWarning(mtf));
  if (c16.trust < 65)
    executionWarnings.push(
      `Trust below execution threshold (${c16.trust.toFixed(0)}/100)`,
    );
  if (runtimeMode !== "LIVE" && runtimeMode !== "LIVE_PARTIAL") {
    executionWarnings.push(
      `Execution blocked — runtime mode is ${runtimeMode}`,
    );
  }
  if (!tp1)
    executionWarnings.push(
      "No structurally valid TP found with minimum RR 1.5",
    );
  if (rr1 !== null && rr1 < 1.5)
    executionWarnings.push("Reward-to-risk below minimum threshold (1.5)");

  if (entryClass === "NONE") {
    executionWarnings.push(
      "Entry class unresolved — exact execution requires BREAKOUT, PULLBACK, RECLAIM, or REVERSAL",
    );
  }

  const middleLayer = isMiddleLayerSufficient(mtf, entryClass);
  if (!middleLayer.pass && middleLayer.blocker) {
    executionWarnings.push(middleLayer.blocker);
  }

  // -----------------------------------------------------------------------
  // HARD GATE FOR EXACT PLAN
  // -----------------------------------------------------------------------
  const hasFatalWarning = executionWarnings.some(
    (w) =>
      w.includes("blocked") ||
      w.includes("missing") ||
      w.includes("No entry") ||
      w.includes("No clean") ||
      w.includes("unresolved") ||
      w.includes("both weak"),
  );

  const canShowExactExecutionPlan =
    exactEntryPrice !== null &&
    entryAnchorResolved &&
    exactInvalidationPrice !== null &&
    exactStopLoss !== null &&
    mtf.entryAllowed &&
    mtf.confirm1h !== "UNCONFIRMED" &&
    c16.trust >= 65 &&
    (runtimeMode === "LIVE" || runtimeMode === "LIVE_PARTIAL") &&
    entryClass !== "NONE" &&
    middleLayer.pass &&
    !hasFatalWarning &&
    tp1 !== null &&
    rr1 !== null &&
    rr1 >= 1.5;

  let displayMode: ExecutionDisplayMode;
  if (engineState === "ENTERED" || engineState === "MANAGING") {
    displayMode = "LIVE_MANAGEMENT";
  } else if (canShowExactExecutionPlan) {
    displayMode = "EXACT_PLAN";
  } else if (c16.tradeReadiness >= 30) {
    displayMode = "PROVISIONAL_PLAN";
  } else {
    displayMode = "NO_PLAN";
  }

  // FIX #5: engineState update — do NOT assign ARMED from raw c16.phase here.
  // ARMED is a display/user state managed by canonicalMerger.
  // Here we only need IDLE vs SETUP vs terminal states.
  if (engineState === "IDLE" || engineState === "SETUP") {
    if (displayMode === "EXACT_PLAN") {
      engineState = "READY";
    } else if (c16.phase === "PRESSURIZED" || c16.phase === "TRIGGERABLE") {
      engineState = "SETUP";
    } else {
      engineState = "IDLE";
    }
  }

  const labelMap: Record<ExecutionDisplayMode, string> = {
    NO_PLAN: "No Plan",
    PROVISIONAL_PLAN: "Provisional",
    EXACT_PLAN: "Exact Plan",
    LIVE_MANAGEMENT: "Live Management",
  };
  const executionModeLabel = labelMap[displayMode];

  executionReasoning.push(
    `C16 side: ${c16.side} (clarity ${c16.sideClarity.toFixed(0)}/100). ` +
      `Phase: ${c16.phase}. Trade readiness: ${c16.tradeReadiness.toFixed(0)}/100.`,
  );
  if (mtf.confirm1h !== "UNCONFIRMED") {
    executionReasoning.push(
      `1H confirms ${mtf.confirm1h} direction. 4H bias: ${mtf.bias4h}.`,
    );
  } else {
    executionReasoning.push(
      `1H confirmation not yet established. 4H bias: ${mtf.bias4h}.`,
    );
  }
  if (canShowExactExecutionPlan) {
    executionReasoning.push(
      `Exact execution structure present. Entry anchor resolved. Entry class: ${entryClass}. RR: ${rr1?.toFixed(2)}.`,
    );
  } else {
    const topWarning = executionWarnings[0];
    if (topWarning) executionReasoning.push(`Primary gap: ${topWarning}`);
  }

  const mainExecutionBlocker =
    executionWarnings.length > 0 ? executionWarnings[0] : null;

  const entryConfidence = Math.min(
    100,
    c16.sideClarity * 0.3 +
      mtf.growth15m * 0.2 +
      (mtf.confirm1h !== "UNCONFIRMED" ? 25 : 0) +
      (entryAnchorResolved ? 15 : 0) +
      (canShowExactExecutionPlan ? 10 : 0),
  );

  return {
    executionSide,
    engineState,
    displayMode,
    entryClass,
    entryAllowed: mtf.entryAllowed,
    canShowExactExecutionPlan,
    entryAnchorResolved,
    exactEntryPrice,
    exactStopLoss,
    exactInvalidationPrice,
    tp1,
    tp2,
    tp3,
    rr1,
    rr2,
    rr3,
    entryConfidence,
    executionModeLabel,
    mainExecutionBlocker,
    executionReasoning,
    executionWarnings,
  };
}

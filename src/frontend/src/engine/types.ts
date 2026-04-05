export type Tier = "LAYER_B" | "PRIORITY_CORE";
export type Side = "LONG" | "SHORT" | "NEUTRAL";
export type Phase =
  | "DORMANT"
  | "BUILDING"
  | "PRESSURIZED"
  | "TRIGGERABLE"
  | "DECAY";
export type UserStatus =
  | "EARLY_CANDIDATE"
  | "WORTH_WATCHING"
  | "FORMING_SETUP"
  | "ACTIVE_CANDIDATE"
  | "ARMED"
  | "READY"
  | "ENTERED"
  | "MANAGING"
  | "EXITED"
  | "CANCELLED"
  | "DIRECTION_UNCLEAR";
export type ExecutionDisplayMode =
  | "NO_PLAN"
  | "PROVISIONAL_PLAN"
  | "EXACT_PLAN"
  | "LIVE_MANAGEMENT";
export type EntryClass =
  | "NONE"
  | "BREAKOUT"
  | "PULLBACK"
  | "RECLAIM"
  | "REVERSAL";
export type RuntimeMode =
  | "LIVE"
  | "LIVE_PARTIAL"
  | "DEGRADED"
  | "OFFLINE"
  | "DEMO"
  | "HISTORICAL";
export type BoardSection =
  | "NOW"
  | "BREWING"
  | "SEVEN_DAY_BREWING"
  | "WATCH_OUT";
export type Context7dStage =
  | "EARLY_SIGNS"
  | "FORMING_SETUP"
  | "BREWING"
  | "STABLE";
export type ContinuationState =
  | "STRENGTHENING"
  | "STABLE"
  | "WEAKENING"
  | "RELEASING";
export type EngineState =
  | "IDLE"
  | "SETUP"
  | "ARMED"
  | "READY"
  | "ENTERED"
  | "MANAGING"
  | "EXITED"
  | "CANCELLED";
export type MTFConfirm1h = "LONG" | "SHORT" | "UNCONFIRMED";

export interface KlineBar {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isClosed: boolean;
}

export interface CanonicalSymbolState {
  symbol: string;
  lastUpdated: number;

  health: {
    tier: Tier;
    runtimeMode: RuntimeMode;
    trustScore: number;
    degraded: boolean;
    stale: boolean;
    runtimeHealthy: boolean;
    syncQuality: number;
    dataQuality: number;
  };

  context7d: {
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
  };

  c16: {
    side: Side;
    // raw internal phase — do NOT render directly in primary user-facing surfaces.
    // Use ui.safePhase for all display purposes.
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
  };

  mtf: {
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
  };

  execution: {
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
  };

  ui: {
    userFacingStatus: UserStatus;
    title: string;
    subtitle: string;
    // safePhase: MTF-capped phase for all primary user-facing display.
    // TRIGGERABLE never appears here unless MTF fully justifies it.
    // Use this instead of c16.phase on all non-debug surfaces.
    safePhase: Phase;
    directionLabel: string;
    boardSection: BoardSection;
    mainBlocker: string | null;
    secondaryBlocker: string | null;
    nextPromotionTarget: string | null;
    recentChangeText: string;
    doNow: string;
  };

  price: {
    last: number;
    bid: number;
    ask: number;
    change24h: number;
    volume24h: number;
    high24h: number;
    low24h: number;
    spreadPct: number;
  };

  klines: {
    tf4h: KlineBar[];
    tf1h: KlineBar[];
    tf15m: KlineBar[];
    tf5m: KlineBar[];
    tf1m: KlineBar[];
  };
}

export interface RawSymbolData {
  symbol: string;
  lastPrice: number;
  bidPrice: number;
  askPrice: number;
  priceChangePercent: number;
  volume: number;
  highPrice: number;
  lowPrice: number;
  klines4h: KlineBar[];
  klines1h: KlineBar[];
  klines15m: KlineBar[];
  klines5m: KlineBar[];
  klines1m: KlineBar[];
  lastTickTime: number;
  wsConnected: boolean;
  dataQuality: number;
}

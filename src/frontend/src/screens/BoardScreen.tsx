import { GlobalRuntimeBanner } from "../components/RuntimeBanner";
import { SymbolRow } from "../components/SymbolRow";
import type { RuntimeStatus } from "../engine/binanceRuntime";
import type { BoardSection, CanonicalSymbolState } from "../engine/types";

interface BoardScreenProps {
  symbolStates: Map<string, CanonicalSymbolState>;
  runtimeStatus: RuntimeStatus;
  onSelectSymbol: (symbol: string) => void;
}

const SECTION_ORDER: BoardSection[] = [
  "NOW",
  "BREWING",
  "SEVEN_DAY_BREWING",
  "WATCH_OUT",
];
const SECTION_LABELS: Record<BoardSection, string> = {
  NOW: "NOW",
  BREWING: "BREWING",
  SEVEN_DAY_BREWING: "7D BREWING",
  WATCH_OUT: "WATCH OUT",
};
const SECTION_DESC: Record<BoardSection, string> = {
  NOW: "Immediate attention required",
  BREWING: "Setups forming",
  SEVEN_DAY_BREWING: "Background accumulation",
  WATCH_OUT: "Degraded or decaying",
};
const SECTION_COLOR: Record<BoardSection, string> = {
  NOW: "text-long",
  BREWING: "text-info",
  SEVEN_DAY_BREWING: "text-neutral",
  WATCH_OUT: "text-short",
};
const SECTION_BADGE_CLASS: Record<BoardSection, string> = {
  NOW: "bg-long/10 text-long",
  BREWING: "bg-info/10 text-info",
  SEVEN_DAY_BREWING: "bg-neutral/10 text-neutral",
  WATCH_OUT: "bg-short/10 text-short",
};
const SECTION_HEADER_BG: Record<BoardSection, string> = {
  NOW: "bg-long/5",
  BREWING: "",
  SEVEN_DAY_BREWING: "",
  WATCH_OUT: "bg-short/5",
};

// -----------------------------------------------------------------------
// 2-STAGE RANKING MODEL
//
// Stage 1 — Maturity band (primary sort key, lower = closer to valid entry):
//   0  READY
//   1  ARMED
//   2  ACTIVE_CANDIDATE
//   3  FORMING_SETUP with directional 4H + confirmed 1H
//   4  FORMING_SETUP with one remaining medium blocker
//   5  WORTH_WATCHING / 4H neutral / 1H unconfirmed
//   6  Background brewing / EARLY_CANDIDATE / DIRECTION_UNCLEAR
//
// Penalty modifiers applied within each band (additive, push symbol down):
//   4H NEUTRAL          : +30
//   1H UNCONFIRMED      : +20
//   LAYER_B tier        : +15
//   entry class NONE    : +10
//   gate blocked        : +10
//
// Stage 2 — Tie-breaker inside the same effective rank:
//   7D score descending, then tradeReadiness descending.
//
// 7D strength is used ONLY as tie-breaker within the same maturity band.
// It must not promote a symbol over one that is structurally closer to entry.
// -----------------------------------------------------------------------
function computeEntryRank(s: CanonicalSymbolState): number {
  const status = s.ui.userFacingStatus;
  const neutral4h = s.mtf.bias4h === "NEUTRAL";
  const unconfirmed1h = s.mtf.confirm1h === "UNCONFIRMED";
  const layerB = s.health.tier === "LAYER_B";
  const entryClassNone = s.execution.entryClass === "NONE";
  const gateBlocked = !s.mtf.entryAllowed;

  // --- Stage 1: base band ---
  let base: number;
  switch (status) {
    case "READY":
      base = 0;
      break;
    case "ARMED":
      base = 100;
      break;
    case "ACTIVE_CANDIDATE":
      base = 200;
      break;
    case "FORMING_SETUP":
      // Distinguish better vs weaker FORMING_SETUP inside the band.
      // Better: 4H directional AND 1H confirmed (one structural gate away).
      // Weaker: still missing 1H or has a medium blocker.
      if (!neutral4h && !unconfirmed1h) {
        base = 300; // directional + confirmed — closest to promotion
      } else {
        base = 400; // still missing a critical mid-blocker
      }
      break;
    case "WORTH_WATCHING":
      base = 500;
      break;
    case "DIRECTION_UNCLEAR":
      // No directional clarity — ranked below all structured candidates
      base = 650;
      break;
    default:
      base = 600;
      break;
  }

  // --- Stage 1 penalties: blocker severity within the band ---
  let penalty = 0;
  if (neutral4h) penalty += 30;
  if (unconfirmed1h) penalty += 20;
  if (layerB) penalty += 15;
  if (entryClassNone) penalty += 10;
  if (gateBlocked) penalty += 10;

  // --- Stage 2: tie-breaker (packed into fractional offset) ---
  // Scale 7D score [0–100] and tradeReadiness [0–100] into a sub-1 offset.
  // Lower offset = better tie-breaker = comes first.
  const tiebreaker =
    1 - (s.context7d.score * 0.6 + s.c16.tradeReadiness * 0.4) / 100;
  // tiebreaker is in [0, 1). Multiply by 0.99 to ensure it never reaches 1
  // so it cannot bleed into the next penalty tier.
  const tiebreakerScaled = tiebreaker * 0.99;

  return base + penalty + tiebreakerScaled;
}

export function BoardScreen({
  symbolStates,
  runtimeStatus,
  onSelectSymbol,
}: BoardScreenProps) {
  const isConnecting = runtimeStatus.mode === "CONNECTING";
  const isOffline = runtimeStatus.mode === "OFFLINE";

  const sections: Record<BoardSection, CanonicalSymbolState[]> = {
    NOW: [],
    BREWING: [],
    SEVEN_DAY_BREWING: [],
    WATCH_OUT: [],
  };

  // 2-stage nearest-entry sort: lower rank = closer to valid entry = top of list
  const allStates = Array.from(symbolStates.values()).sort(
    (a, b) => computeEntryRank(a) - computeEntryRank(b),
  );

  for (const state of allStates) {
    sections[state.ui.boardSection].push(state);
  }

  return (
    <div className="flex flex-col h-full" data-ocid="board.page">
      <GlobalRuntimeBanner status={runtimeStatus} />

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-surface-border">
        <h1 className="text-sm font-sans font-semibold text-foreground tracking-wide">
          C16 PRO
        </h1>
        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] font-mono ${
              runtimeStatus.wsConnected ? "text-long" : "text-short"
            }`}
          >
            {runtimeStatus.wsConnected ? "● LIVE" : "● OFFLINE"}
          </span>
          {runtimeStatus.totalSymbols > 0 && (
            <span className="text-[10px] font-mono text-muted-foreground">
              {runtimeStatus.totalSymbols} symbols
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isConnecting && (
          <div
            className="flex flex-col items-center justify-center h-48 gap-3"
            data-ocid="board.loading_state"
          >
            <div className="w-4 h-4 border-2 border-info/50 border-t-info rounded-full animate-spin" />
            <span className="text-[12px] font-mono text-muted-foreground">
              Connecting to Binance...
            </span>
          </div>
        )}

        {isOffline && !isConnecting && (
          <div className="px-3 py-4" data-ocid="board.error_state">
            <div className="border border-short/30 bg-short/5 rounded p-3">
              <div className="text-[12px] font-mono text-short font-semibold">
                Offline — No live data available
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground font-sans">
                Execution is blocked in offline mode. Check your internet
                connection.
              </div>
              <div className="mt-2 text-[11px] font-mono text-muted-foreground">
                NOW section is empty until live connection is restored.
              </div>
            </div>
          </div>
        )}

        {!isConnecting &&
          SECTION_ORDER.map((section) => {
            const items = sections[section];
            if (items.length === 0) return null;

            return (
              <section key={section} className="mb-1">
                {/* Section header */}
                <div
                  className={`flex items-center gap-2 px-3 py-1.5 sticky top-0 backdrop-blur-sm border-b border-surface-border z-10 ${
                    SECTION_HEADER_BG[section]
                  } bg-background/95`}
                >
                  <span
                    className={`text-[11px] font-mono font-semibold tracking-widest ${SECTION_COLOR[section]}`}
                  >
                    {SECTION_LABELS[section]}
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground/60">
                    {SECTION_DESC[section]}
                  </span>
                  <span
                    className={`ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                      SECTION_BADGE_CLASS[section]
                    }`}
                  >
                    {items.length}
                  </span>
                </div>

                {/* Symbol rows */}
                {items.map((state, idx) => (
                  <SymbolRow
                    key={state.symbol}
                    state={state}
                    onClick={() => onSelectSymbol(state.symbol)}
                    index={idx + 1}
                  />
                ))}
              </section>
            );
          })}

        {!isConnecting &&
          !isOffline &&
          allStates.length > 0 &&
          SECTION_ORDER.every((s) => sections[s].length === 0) && (
            <div
              className="flex flex-col items-center justify-center h-48"
              data-ocid="board.empty_state"
            >
              <span className="text-[12px] font-mono text-muted-foreground">
                No actionable symbols at this time
              </span>
            </div>
          )}

        {/* Footer */}
        {!isConnecting && (
          <div className="px-3 py-3 border-t border-surface-border mt-2">
            <p className="text-[10px] text-muted-foreground/50 font-sans text-center">
              &copy; {new Date().getFullYear()}. Built with love using{" "}
              <a
                href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-muted-foreground"
              >
                caffeine.ai
              </a>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

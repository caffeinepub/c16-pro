import { ExecutionTag, SideBadge } from "../components/SharedComponents";
import { SymbolRow } from "../components/SymbolRow";
import { WatchSyncIndicator } from "../components/WatchSyncIndicator";
import type { RuntimeStatus } from "../engine/binanceRuntime";
import type { CanonicalSymbolState } from "../engine/types";

interface WatchlistScreenProps {
  watchlist: string[];
  symbolStates: Map<string, CanonicalSymbolState>;
  onSelectSymbol: (symbol: string) => void;
  onRemoveFromWatchlist: (symbol: string) => void;
  runtimeStatus: RuntimeStatus;
}

const BACKGROUND_WATCH_PLACEHOLDER = "Background watch — no action yet";

// Suppress nextPromotionTarget in sub-row if it substantially
// duplicates the mainBlocker (same timeframe and same concept).
function shouldShowNextTarget(
  nextTarget: string | null,
  mainBlocker: string | null,
): boolean {
  if (!nextTarget) return false;
  if (!mainBlocker) return true;
  const n = nextTarget.toLowerCase();
  const b = mainBlocker.toLowerCase();
  if (n.includes("4h") && b.includes("4h")) return false;
  if (
    n.includes("1h") &&
    b.includes("1h") &&
    n.includes("confirm") &&
    b.includes("miss")
  )
    return false;
  return true;
}

export function WatchlistScreen({
  watchlist,
  symbolStates,
  onSelectSymbol,
  onRemoveFromWatchlist,
  runtimeStatus,
}: WatchlistScreenProps) {
  const watchlistStates = watchlist
    .map((sym) => symbolStates.get(sym))
    .filter((s): s is CanonicalSymbolState => !!s);

  return (
    <div className="flex flex-col h-full" data-ocid="watchlist.page">
      {/* Header — symbol count + live sync indicator */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-surface-border">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-sans font-semibold text-foreground">
            Watchlist
          </h2>
          <span className="text-[10px] font-mono text-muted-foreground">
            {watchlist.length} symbols
          </span>
        </div>
        {/* Sync indicator — reads from canonical runtimeStatus, no fake polling */}
        <WatchSyncIndicator runtimeStatus={runtimeStatus} />
      </div>

      <div className="flex-1 overflow-y-auto">
        {watchlist.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center h-48 gap-2"
            data-ocid="watchlist.empty_state"
          >
            <span className="text-[12px] font-mono text-muted-foreground">
              No symbols in watchlist.
            </span>
            <span className="text-[11px] text-muted-foreground/60 font-sans">
              Add from Screener or Board.
            </span>
          </div>
        ) : (
          <div>
            {watchlistStates.map((state, idx) => {
              const doNowText =
                state.ui.doNow === BACKGROUND_WATCH_PLACEHOLDER
                  ? state.ui.recentChangeText
                  : state.ui.doNow;

              const doNowDisplay =
                doNowText.length > 40
                  ? `${doNowText.slice(0, 40)}…`
                  : doNowText;

              const showNextTarget = shouldShowNextTarget(
                state.ui.nextPromotionTarget,
                state.ui.mainBlocker,
              );

              return (
                <div key={state.symbol} className="relative group">
                  <SymbolRow
                    state={state}
                    onClick={() => onSelectSymbol(state.symbol)}
                    compact
                    index={idx + 1}
                  />
                  {/* Expanded operator sub-row */}
                  <div className="px-3 pb-2 border-b border-surface-border bg-surface/30 text-[11px] font-sans flex items-center gap-3 flex-wrap">
                    <SideBadge side={state.c16.side} size="sm" />
                    <ExecutionTag mode={state.execution.displayMode} />
                    <span className="text-info/70">{doNowDisplay}</span>
                    {state.ui.mainBlocker && (
                      <span className="text-short/60 text-[10px] font-sans">
                        ▸{" "}
                        {state.ui.mainBlocker.length > 30
                          ? `${state.ui.mainBlocker.slice(0, 30)}…`
                          : state.ui.mainBlocker}
                      </span>
                    )}
                    {showNextTarget && state.ui.nextPromotionTarget && (
                      <span className="text-muted-foreground/50 text-[10px] font-mono">
                        →{" "}
                        {state.ui.nextPromotionTarget.length > 36
                          ? `${state.ui.nextPromotionTarget.slice(0, 36)}…`
                          : state.ui.nextPromotionTarget}
                      </span>
                    )}
                    <button
                      type="button"
                      data-ocid={`watchlist.delete_button.${idx + 1}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveFromWatchlist(state.symbol);
                      }}
                      className="ml-auto text-[10px] text-muted-foreground/50 hover:text-short px-1.5 py-0.5 rounded border border-surface-border hover:border-short/30 transition-colors shrink-0"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Watchlist symbols with no loaded state */}
            {watchlist
              .filter((sym) => !symbolStates.has(sym))
              .map((sym) => (
                <div
                  key={sym}
                  className="flex items-center gap-2 px-3 py-2.5 border-b border-surface-border"
                >
                  <span className="font-mono text-[13px] text-muted-foreground">
                    {sym.replace("USDT", "")}
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground/50">
                    Loading...
                  </span>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

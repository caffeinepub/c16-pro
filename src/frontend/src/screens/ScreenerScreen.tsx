import { useMemo, useState } from "react";
import {
  ExecutionTag,
  SideBadge,
  StatusLabel,
} from "../components/SharedComponents";
import type { CanonicalSymbolState, Phase } from "../engine/types";

type SortKey = "tradeReadiness" | "symbol" | "score7d" | "phase" | "side";

interface ScreenerScreenProps {
  symbolStates: Map<string, CanonicalSymbolState>;
  onSelectSymbol: (symbol: string) => void;
  onAddToWatchlist: (symbol: string) => void;
  watchlist: string[];
}

// Phase order uses safePhase values only (TRIGGERABLE excluded from primary sort)
const PHASE_ORDER: Phase[] = ["PRESSURIZED", "BUILDING", "DORMANT", "DECAY"];

export function ScreenerScreen({
  symbolStates,
  onSelectSymbol,
  onAddToWatchlist,
  watchlist,
}: ScreenerScreenProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("tradeReadiness");
  const [sortDesc, setSortDesc] = useState(true);

  const allStates = useMemo(
    () => Array.from(symbolStates.values()),
    [symbolStates],
  );

  const filtered = useMemo(() => {
    let items = allStates;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toUpperCase();
      items = items.filter(
        (s) => s.symbol.includes(q) || s.symbol.replace("USDT", "").includes(q),
      );
    }
    return [...items].sort((a, b) => {
      let va = 0;
      let vb = 0;
      if (sortKey === "tradeReadiness") {
        va = a.c16.tradeReadiness;
        vb = b.c16.tradeReadiness;
      } else if (sortKey === "score7d") {
        va = a.context7d.score;
        vb = b.context7d.score;
      } else if (sortKey === "phase") {
        // Sort by safePhase — the MTF-capped user-facing phase
        const aIdx = PHASE_ORDER.indexOf(a.ui.safePhase);
        const bIdx = PHASE_ORDER.indexOf(b.ui.safePhase);
        va = aIdx === -1 ? PHASE_ORDER.length : aIdx;
        vb = bIdx === -1 ? PHASE_ORDER.length : bIdx;
        // For phase sort, lower index = higher maturity, so we invert
        return sortDesc ? va - vb : vb - va;
      } else if (sortKey === "symbol") {
        return sortDesc
          ? b.symbol.localeCompare(a.symbol)
          : a.symbol.localeCompare(b.symbol);
      } else if (sortKey === "side") {
        const sideOrd = { LONG: 2, SHORT: 1, NEUTRAL: 0 };
        va = sideOrd[a.c16.side];
        vb = sideOrd[b.c16.side];
      }
      return sortDesc ? vb - va : va - vb;
    });
  }, [allStates, searchQuery, sortKey, sortDesc]);

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDesc((d) => !d);
    else {
      setSortKey(key);
      setSortDesc(true);
    }
  }

  const TH = ({ k, label }: { k: SortKey; label: string }) => (
    <th
      className="px-2 py-1.5 text-left text-[10px] font-mono text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground select-none"
      onClick={() => handleSort(k)}
      onKeyDown={(e) => e.key === "Enter" && handleSort(k)}
    >
      {label}
      {sortKey === k && <span className="ml-1">{sortDesc ? "▼" : "▲"}</span>}
    </th>
  );

  return (
    <div className="flex flex-col h-full" data-ocid="screener.page">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-surface-border">
        <h2 className="text-sm font-sans font-semibold text-foreground shrink-0">
          Screener
        </h2>
        <input
          type="text"
          data-ocid="screener.search_input"
          placeholder="Search symbol..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 bg-surface border border-surface-border rounded px-2 py-1 text-[12px] font-mono text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-info/40"
        />
        <span className="text-[10px] font-mono text-muted-foreground shrink-0">
          {filtered.length} of {allStates.length}
        </span>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 bg-background/95 backdrop-blur-sm z-10">
            <tr className="border-b border-surface-border">
              <TH k="symbol" label="Symbol" />
              <th className="px-2 py-1.5 text-left text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                Side
              </th>
              <th className="px-2 py-1.5 text-left text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                Status
              </th>
              <TH k="tradeReadiness" label="Ready" />
              <TH k="phase" label="Phase" />
              <th className="px-2 py-1.5 text-left text-[10px] font-mono text-muted-foreground uppercase tracking-wider hidden md:table-cell">
                Mode
              </th>
              <TH k="score7d" label="7D" />
              <th className="px-2 py-1.5 text-left text-[10px] font-mono text-muted-foreground uppercase tracking-wider hidden lg:table-cell">
                Blocker
              </th>
              <th className="px-2 py-1.5 text-[10px] font-mono text-muted-foreground">
                +WL
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={9}
                  className="px-3 py-8 text-center text-[12px] font-mono text-muted-foreground"
                  data-ocid="screener.empty_state"
                >
                  {allStates.length === 0
                    ? "Loading market universe..."
                    : "No symbols match your search"}
                </td>
              </tr>
            )}
            {filtered.map((state, idx) => (
              <tr
                key={state.symbol}
                data-ocid={`screener.item.${idx + 1}`}
                onClick={() => onSelectSymbol(state.symbol)}
                onKeyDown={(e) =>
                  e.key === "Enter" && onSelectSymbol(state.symbol)
                }
                className="border-b border-surface-border hover:bg-surface/50 cursor-pointer transition-colors"
              >
                <td className="px-2 py-1">
                  <div className="font-mono text-[12px] font-semibold text-foreground">
                    {state.symbol.replace("USDT", "")}
                  </div>
                  {state.health.tier === "PRIORITY_CORE" && (
                    <div className="text-[9px] font-mono text-info/70">
                      PRIORITY
                    </div>
                  )}
                </td>
                <td className="px-2 py-1">
                  <SideBadge side={state.c16.side} size="sm" />
                </td>
                <td className="px-2 py-1">
                  <StatusLabel status={state.ui.userFacingStatus} />
                </td>
                <td className="px-2 py-1">
                  <span className="font-mono text-[12px] text-foreground">
                    {state.c16.tradeReadiness.toFixed(0)}
                  </span>
                </td>
                <td className="px-2 py-1">
                  {/*
                    Phase column: always use ui.safePhase, never c16.phase.
                    TRIGGERABLE is an internal C16 phase and must not appear
                    on primary user-facing surfaces like the Screener.
                  */}
                  <span
                    className={`font-mono text-[11px] ${
                      state.ui.safePhase === "PRESSURIZED"
                        ? "text-info"
                        : state.ui.safePhase === "BUILDING"
                          ? "text-neutral"
                          : "text-muted-foreground"
                    }`}
                  >
                    {state.ui.safePhase}
                  </span>
                </td>
                <td className="px-2 py-1 hidden md:table-cell">
                  <ExecutionTag mode={state.execution.displayMode} />
                </td>
                <td className="px-2 py-1">
                  <span className="font-mono text-[12px] text-foreground">
                    {state.context7d.score.toFixed(0)}
                  </span>
                </td>
                <td className="px-2 py-1 hidden lg:table-cell">
                  {state.ui.mainBlocker && (
                    <span className="text-[10px] text-short/70 font-sans">
                      {state.ui.mainBlocker.length > 28
                        ? `${state.ui.mainBlocker.slice(0, 28)}…`
                        : state.ui.mainBlocker}
                    </span>
                  )}
                </td>
                <td className="px-2 py-1">
                  <button
                    type="button"
                    data-ocid={`screener.toggle.${idx + 1}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddToWatchlist(state.symbol);
                    }}
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded border transition-colors ${
                      watchlist.includes(state.symbol)
                        ? "border-info/40 text-info/70 bg-info/10"
                        : "border-surface-border text-muted-foreground hover:border-info/40 hover:text-info"
                    }`}
                  >
                    {watchlist.includes(state.symbol) ? "✓" : "+"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

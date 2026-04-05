import { useCallback, useEffect } from "react";
import { CandlestickChart } from "../components/CandlestickChart";
import { MtfLadderDisplay } from "../components/MtfLadderDisplay";
import { RuntimeBanner } from "../components/RuntimeBanner";
import {
  ExecutionTag,
  MetricBar,
  SideBadge,
  StatusLabel,
} from "../components/SharedComponents";
import { resolveActionContext } from "../engine/canonicalMerger";
import type { CanonicalSymbolState } from "../engine/types";

function fmtPrice(p: number | null): string {
  if (p === null || p === 0) return "---";
  if (p >= 1000) return p.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (p >= 1) return p.toFixed(4);
  return p.toFixed(6);
}

function fmtRR(rr: number | null): string {
  if (rr === null) return "---";
  return `${rr.toFixed(2)}R`;
}

interface DetailScreenProps {
  symbol: string | null;
  symbolStates: Map<string, CanonicalSymbolState>;
  onLoadKlines: (symbol: string) => Promise<void>;
  onAddToWatchlist: (symbol: string) => void;
  onRemoveFromWatchlist: (symbol: string) => void;
  watchlist: string[];
  onBack: () => void;
}

export function DetailScreen({
  symbol,
  symbolStates,
  onLoadKlines,
  onAddToWatchlist,
  onRemoveFromWatchlist,
  watchlist,
  onBack,
}: DetailScreenProps) {
  const state = symbol ? symbolStates.get(symbol) : null;

  const loadKlines = useCallback(
    async (sym: string) => {
      await onLoadKlines(sym);
    },
    [onLoadKlines],
  );

  useEffect(() => {
    if (symbol && state && state.klines.tf4h.length === 0) {
      loadKlines(symbol).catch(() => {});
    }
  }, [symbol, state, loadKlines]);

  if (!symbol) {
    return (
      <div
        className="flex flex-col items-center justify-center h-full gap-2"
        data-ocid="detail.empty_state"
      >
        <span className="text-[12px] font-mono text-muted-foreground">
          No symbol selected
        </span>
        <span className="text-[11px] text-muted-foreground/60 font-sans">
          Tap a symbol from Board, Watchlist, or Screener
        </span>
      </div>
    );
  }

  if (!state) {
    return (
      <div
        className="flex flex-col items-center justify-center h-full"
        data-ocid="detail.loading_state"
      >
        <div className="w-4 h-4 border-2 border-info/50 border-t-info rounded-full animate-spin" />
        <span className="mt-2 text-[12px] font-mono text-muted-foreground">
          Loading {symbol}...
        </span>
      </div>
    );
  }

  const { c16, mtf, execution, context7d, health, price, ui, klines } = state;
  const inWatchlist = watchlist.includes(symbol);
  const change24hPos = price.change24h >= 0;

  return (
    <div className="flex flex-col h-full" data-ocid="detail.page">
      {/* Back + header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-surface-border">
        <button
          type="button"
          data-ocid="detail.secondary_button"
          onClick={onBack}
          className="text-[11px] font-mono text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded border border-surface-border hover:border-foreground/20 transition-colors"
        >
          ← Back
        </button>
        <span className="font-mono text-[14px] font-bold text-foreground">
          {symbol.replace("USDT", "")}
          <span className="text-muted-foreground text-[11px] font-normal">
            /USDT
          </span>
        </span>
        <SideBadge side={c16.side} />
        <StatusLabel status={ui.userFacingStatus} />
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            data-ocid={
              inWatchlist ? "detail.delete_button" : "detail.primary_button"
            }
            onClick={() =>
              inWatchlist
                ? onRemoveFromWatchlist(symbol)
                : onAddToWatchlist(symbol)
            }
            className={`text-[11px] font-mono px-2 py-0.5 rounded border transition-colors ${
              inWatchlist
                ? "border-info/40 text-info bg-info/10 hover:bg-info/20"
                : "border-surface-border text-muted-foreground hover:border-info/40 hover:text-info"
            }`}
          >
            {inWatchlist ? "✓ Watching" : "+ Watch"}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* 1. Runtime banner — only if NOT LIVE */}
        <RuntimeBanner
          runtimeMode={health.runtimeMode}
          trustScore={health.trustScore}
        />

        {/* 2. Top execution / stance block */}
        <div className="px-3 py-3 border-b border-surface-border">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[11px] font-sans text-muted-foreground">
                {ui.title}
              </div>
              <div className="font-mono text-[24px] font-bold text-foreground mt-0.5">
                {fmtPrice(price.last)}
              </div>
              <div
                className={`font-mono text-[13px] mt-0.5 ${
                  change24hPos ? "text-long" : "text-short"
                }`}
              >
                {change24hPos ? "+" : ""}
                {price.change24h.toFixed(2)}% 24h
              </div>
            </div>
            <div className="text-right">
              <ExecutionTag mode={execution.displayMode} />
              <div className="mt-1 text-[10px] font-mono text-muted-foreground">
                C16: {c16.score.toFixed(0)}/100
              </div>
              <div className="text-[10px] font-mono text-muted-foreground">
                Trust: {health.trustScore.toFixed(0)}/100
              </div>
              <div
                className={`text-[10px] font-mono mt-0.5 ${
                  health.tier === "PRIORITY_CORE"
                    ? "text-info"
                    : "text-muted-foreground/50"
                }`}
              >
                {health.tier}
              </div>
            </div>
          </div>
          <div className="mt-2 text-[11px] font-sans text-muted-foreground">
            {ui.subtitle}
          </div>
        </div>

        {/* 3. Projected Execution Context or Exact Execution block */}
        <div className="px-3 py-3 border-b border-surface-border">
          <ExecutionBlock state={state} />
        </div>

        {/* 4. Blocker hierarchy */}
        <div className="px-3 py-2 border-b border-surface-border">
          <div className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider mb-1.5">
            Blockers
          </div>
          {ui.mainBlocker ? (
            <div className="border-l-2 border-surface-border pl-2 space-y-1">
              <div className="flex items-start gap-1.5">
                <span className="text-short text-[11px] font-mono shrink-0">
                  ▸
                </span>
                <span className="text-[12px] font-sans text-short">
                  {ui.mainBlocker}
                </span>
              </div>
              {ui.secondaryBlocker && (
                <div className="flex items-start gap-1.5">
                  <span className="text-neutral/70 text-[11px] font-mono shrink-0">
                    ▸
                  </span>
                  <span className="text-[12px] font-sans text-neutral/70">
                    {ui.secondaryBlocker}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-[12px] font-sans text-long/80">
              No blockers — setup conditions met
            </div>
          )}
          {ui.nextPromotionTarget && (
            <div className="mt-2 text-[11px] font-mono text-info/70">
              → {ui.nextPromotionTarget}
            </div>
          )}
        </div>

        {/* 5. What to watch next */}
        <div className="px-3 py-2 border-b border-surface-border">
          <div className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider mb-1">
            Do Now
          </div>
          <div className="text-[13px] font-sans text-info">{ui.doNow}</div>
        </div>

        {/* 6. Recent changes */}
        <div className="px-3 py-2 border-b border-surface-border">
          <div className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider mb-1">
            Recent Changes
          </div>
          <div className="text-[12px] font-sans text-foreground/80">
            {ui.recentChangeText}
          </div>
          <div className="mt-0.5 text-[10px] font-mono text-muted-foreground/50">
            Updated: {new Date(state.lastUpdated).toLocaleTimeString()}
          </div>
        </div>

        {/* 7. Metrics */}
        <div className="px-3 py-2 border-b border-surface-border">
          <div className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider mb-2">
            C16 Metrics
          </div>
          <div className="space-y-0.5">
            <MetricBar label="C16 Score" value={c16.score} />
            <MetricBar label="Trade Readiness" value={c16.tradeReadiness} />
            <MetricBar label="Side Clarity" value={c16.sideClarity} />
            <MetricBar label="Trigger Quality" value={c16.triggerQuality} />
            <MetricBar label="Execution Quality" value={c16.executionQuality} />
            <MetricBar label="Risk" value={c16.risk} invert />
            <MetricBar label="Trust" value={c16.trust} />
            <MetricBar
              label="Entry Confidence"
              value={execution.entryConfidence}
            />
          </div>
        </div>

        {/* 8. MTF Ladder */}
        <div className="px-3 py-2 border-b border-surface-border">
          <div className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider mb-2">
            MTF Ladder
          </div>
          <MtfLadderDisplay state={state} />
        </div>

        {/* 9. 7D Context */}
        <div className="px-3 py-2 border-b border-surface-border">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">
              7D Context
            </span>
            <span
              className={`text-[10px] font-mono px-1.5 rounded ${
                context7d.stage === "BREWING"
                  ? "bg-neutral/20 text-neutral"
                  : context7d.stage === "FORMING_SETUP"
                    ? "bg-info/20 text-info"
                    : context7d.stage === "STABLE"
                      ? "bg-long/20 text-long"
                      : "bg-surface text-muted-foreground"
              }`}
            >
              {`7D: ${context7d.stage}`}
            </span>
            <span
              className={`text-[10px] font-mono ${
                context7d.continuationState === "STRENGTHENING"
                  ? "text-long"
                  : context7d.continuationState === "RELEASING"
                    ? "text-info"
                    : context7d.continuationState === "WEAKENING"
                      ? "text-short"
                      : "text-muted-foreground"
              }`}
            >
              {context7d.continuationState}
            </span>
          </div>
          <div className="space-y-0.5">
            <MetricBar label="7D Score" value={context7d.score} />
            <MetricBar label="Accumulation" value={context7d.accumulation} />
            <MetricBar label="Tension" value={context7d.tension} />
            <MetricBar label="Price Hold" value={context7d.priceHold} />
            <MetricBar label="Two-Way Flow" value={context7d.twoWayFlow} />
            <MetricBar
              label="Release Potential"
              value={context7d.releasePotential}
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {context7d.tags.map((tag) => (
              <span
                key={tag}
                className="px-1.5 py-0.5 text-[10px] font-mono border border-surface-border text-muted-foreground rounded"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* 10. Mini candlestick chart */}
        <div className="px-3 py-2 border-b border-surface-border">
          <div className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider mb-2">
            1M Chart (last 50)
          </div>
          <CandlestickChart
            bars={klines.tf1m}
            height={160}
            entryPrice={
              execution.canShowExactExecutionPlan
                ? execution.exactEntryPrice
                : null
            }
            slPrice={
              execution.canShowExactExecutionPlan
                ? execution.exactStopLoss
                : null
            }
            tp1={execution.canShowExactExecutionPlan ? execution.tp1 : null}
            tp2={execution.canShowExactExecutionPlan ? execution.tp2 : null}
            tp3={execution.canShowExactExecutionPlan ? execution.tp3 : null}
            className="rounded overflow-hidden"
          />
        </div>

        {/* 11. Advanced details */}
        <div className="px-3 py-2">
          <div className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider mb-2">
            Runtime Health
          </div>
          <div className="space-y-0.5 text-[11px] font-mono">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Runtime Mode</span>
              <span
                className={
                  health.runtimeMode === "LIVE" ? "text-long" : "text-short"
                }
              >
                {health.runtimeMode}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sync Quality</span>
              <span className="text-foreground">
                {health.syncQuality.toFixed(0)}/100
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Data Quality</span>
              <span className="text-foreground">
                {health.dataQuality.toFixed(0)}/100
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Stale</span>
              <span className={health.stale ? "text-short" : "text-long"}>
                {health.stale ? "Yes" : "No"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Last Updated</span>
              <span className="text-foreground">
                {new Date(state.lastUpdated).toLocaleTimeString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Spread</span>
              <span className="text-foreground">
                {price.spreadPct.toFixed(4)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">24h High</span>
              <span className="text-foreground">{fmtPrice(price.high24h)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">24h Low</span>
              <span className="text-foreground">{fmtPrice(price.low24h)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Volume 24h</span>
              <span className="text-foreground">
                {price.volume24h > 1e6
                  ? `${(price.volume24h / 1e6).toFixed(2)}M`
                  : price.volume24h.toFixed(0)}
              </span>
            </div>
          </div>
        </div>

        {/* Execution reasoning */}
        {execution.executionReasoning.length > 0 && (
          <div className="px-3 py-2 border-t border-surface-border">
            <div className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider mb-1.5">
              Execution Reasoning
            </div>
            <div className="space-y-1">
              {execution.executionReasoning.map((r) => (
                <p
                  key={r.slice(0, 40)}
                  className="text-[11px] font-sans text-foreground/70"
                >
                  {r}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* mtf info ref to suppress unused */}
        <div className="hidden">{mtf.entryAllowed ? "1" : "0"}</div>
      </div>
    </div>
  );
}

// Sub-component: Execution block varies by displayMode
function ExecutionBlock({ state }: { state: CanonicalSymbolState }) {
  const { execution, ui, mtf } = state;

  if (execution.displayMode === "NO_PLAN") {
    return (
      <div data-ocid="detail.panel">
        <div className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider mb-1.5">
          Execution
        </div>
        <div className="text-[12px] font-sans text-muted-foreground">
          No actionable setup.
          {execution.mainExecutionBlocker && (
            <span className="text-short ml-1">
              {execution.mainExecutionBlocker}
            </span>
          )}
        </div>
        {execution.executionWarnings.slice(0, 2).map((w) => (
          <div
            key={w.slice(0, 40)}
            className="mt-1 text-[11px] font-sans text-short/70"
          >
            ⚠ {w}
          </div>
        ))}
      </div>
    );
  }

  if (execution.displayMode === "PROVISIONAL_PLAN") {
    // Activation condition: a forward-looking trigger description.
    // Build from canonical state rather than restating the main blocker,
    // which is already shown in the Blockers section above.
    const activationCondition = (() => {
      if (mtf.bias4h === "NEUTRAL") {
        return "Watch for 4H to establish directional bias";
      }
      if (mtf.confirm1h === "UNCONFIRMED") {
        // Key case: 4H is directional but 1H has not yet confirmed.
        // Describe what needs to happen, not what is missing.
        const side = execution.executionSide === "LONG" ? "long" : "short";
        return `Watch for 1H to confirm ${side} — then reassess execution readiness`;
      }
      if (execution.mainExecutionBlocker) {
        return `Watch for: ${execution.mainExecutionBlocker}`;
      }
      return ui.doNow;
    })();

    // Deduplicate across Activation, Do Now, and Next Step
    const { activation, nextStep } = resolveActionContext(
      ui.doNow,
      ui.nextPromotionTarget,
      activationCondition,
    );

    return (
      <div data-ocid="detail.panel">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">
            Projected Execution Context
          </span>
          <span className="px-1.5 py-0.5 border border-short/30 bg-short/5 text-short/80 rounded font-mono text-[10px]">
            PROJECTED ONLY · NOT EXECUTABLE
          </span>
        </div>
        <div className="space-y-1.5">
          <ExecRow
            label="Side"
            value={execution.executionSide}
            color={
              execution.executionSide === "LONG" ? "text-long" : "text-short"
            }
          />
          <ExecRow
            label="Entry Class"
            value={
              execution.entryClass !== "NONE"
                ? execution.entryClass
                : "Unresolved"
            }
          />
          {/*
            Setup State: use ui.safePhase — the MTF-capped phase.
            TRIGGERABLE must not appear here when MTF conditions are incomplete.
            ui.safePhase is the canonical user-facing phase label.
          */}
          <ExecRow label="Setup State" value={ui.safePhase} />
          {ui.mainBlocker && (
            <ExecRow
              label="Main Blocker"
              value={ui.mainBlocker}
              color="text-short"
            />
          )}
          {activation && (
            <ExecRow label="Activation" value={activation} color="text-info" />
          )}
          {nextStep && (
            <ExecRow label="Next Step" value={nextStep} color="text-info/70" />
          )}
        </div>
        {execution.executionWarnings.length > 0 && (
          <div className="mt-2 space-y-0.5">
            {execution.executionWarnings.slice(0, 3).map((w) => (
              <div
                key={w.slice(0, 40)}
                className="text-[11px] font-sans text-short/70"
              >
                ⚠ {w}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (execution.displayMode === "EXACT_PLAN") {
    return (
      <div data-ocid="detail.panel" className="border-l-2 border-long/40 pl-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">
            Exact Execution Plan
          </span>
          <span className="px-1.5 py-0.5 text-[10px] font-mono bg-info/20 border border-info/40 text-info rounded">
            EXACT PLAN
          </span>
        </div>
        <div className="space-y-1.5">
          <ExecRow
            label="Entry"
            value={fmtPrice(execution.exactEntryPrice)}
            color="text-info"
          />
          <ExecRow
            label="Stop Loss"
            value={fmtPrice(execution.exactStopLoss)}
            color="text-short"
          />
          <ExecRow
            label="Invalidation"
            value={fmtPrice(execution.exactInvalidationPrice)}
            color="text-short/70"
          />
          {execution.tp1 && (
            <ExecRow
              label="TP1"
              value={`${fmtPrice(execution.tp1)}  ${fmtRR(execution.rr1)}`}
              color="text-long"
            />
          )}
          {execution.tp2 && (
            <ExecRow
              label="TP2"
              value={`${fmtPrice(execution.tp2)}  ${fmtRR(execution.rr2)}`}
              color="text-long/80"
            />
          )}
          {execution.tp3 && (
            <ExecRow
              label="TP3"
              value={`${fmtPrice(execution.tp3)}  ${fmtRR(execution.rr3)}`}
              color="text-long/60"
            />
          )}
          <ExecRow label="Entry Class" value={execution.entryClass} />
        </div>
      </div>
    );
  }

  if (execution.displayMode === "LIVE_MANAGEMENT") {
    return (
      <div data-ocid="detail.panel">
        <div className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider mb-2">
          Live Management
        </div>
        <div className="space-y-1.5">
          <ExecRow
            label="Engine State"
            value={execution.engineState}
            color="text-long"
          />
          {execution.tp1 && (
            <ExecRow
              label="TP1"
              value={`${fmtPrice(execution.tp1)}  ${fmtRR(execution.rr1)}`}
              color="text-long"
            />
          )}
          {execution.tp2 && (
            <ExecRow
              label="TP2"
              value={`${fmtPrice(execution.tp2)}  ${fmtRR(execution.rr2)}`}
              color="text-long/80"
            />
          )}
          {execution.exactStopLoss && (
            <ExecRow
              label="SL"
              value={fmtPrice(execution.exactStopLoss)}
              color="text-short"
            />
          )}
        </div>
      </div>
    );
  }

  return null;
}

function ExecRow({
  label,
  value,
  color = "text-foreground",
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-[11px] font-sans text-muted-foreground shrink-0">
        {label}
      </span>
      <span className={`font-mono text-[12px] ${color}`}>{value}</span>
    </div>
  );
}

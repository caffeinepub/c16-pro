import type { CanonicalSymbolState } from "../engine/types";
import { ExecutionTag, SideBadge, StatusLabel } from "./SharedComponents";

interface SymbolRowProps {
  state: CanonicalSymbolState;
  onClick?: () => void;
  compact?: boolean;
  index: number;
}

function fmtPrice(p: number): string {
  if (p === 0) return "---";
  if (p >= 1000) return p.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (p >= 1) return p.toFixed(4);
  return p.toFixed(6);
}

export function SymbolRow({
  state,
  onClick,
  compact = false,
  index,
}: SymbolRowProps) {
  const { symbol, price, ui, execution, health } = state;
  const change24h = price.change24h;
  const changePos = change24h >= 0;

  const hasBlocker = ui.mainBlocker !== null;

  const blockerText = ui.mainBlocker
    ? ui.mainBlocker.length > 32
      ? `${ui.mainBlocker.slice(0, 32)}…`
      : ui.mainBlocker
    : null;

  const recentShort =
    ui.recentChangeText.length > 22
      ? `${ui.recentChangeText.slice(0, 22)}…`
      : ui.recentChangeText;

  return (
    <button
      type="button"
      data-ocid={`symbol.item.${index}`}
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-3 text-left ${
        compact ? "py-2" : "py-2.5"
      } border-b border-surface-border hover:bg-surface/60 cursor-pointer transition-colors ${
        hasBlocker
          ? "border-l-2 border-l-short/20"
          : "border-l-2 border-l-transparent"
      }`}
    >
      {/* Symbol + side */}
      <div className="w-28 shrink-0">
        <div className="font-mono text-[13px] font-semibold text-foreground">
          {symbol.replace("USDT", "")}
        </div>
        <div className="mt-0.5">
          <StatusLabel status={ui.userFacingStatus} />
        </div>
      </div>

      {/* Side badge */}
      <div className="shrink-0">
        <SideBadge side={state.c16.side} size="sm" />
      </div>

      {/* Execution tag */}
      <div className="shrink-0 hidden sm:block">
        <ExecutionTag mode={execution.displayMode} />
      </div>

      {/* Entry class */}
      {execution.entryClass !== "NONE" && (
        <span className="hidden sm:inline text-[10px] font-mono text-info/80 border border-info/20 px-1.5 rounded">
          {execution.entryClass}
        </span>
      )}

      {/* Price */}
      <div className="ml-auto text-right shrink-0">
        <div className="font-mono text-[12px] text-foreground">
          {fmtPrice(price.last)}
        </div>
        <div
          className={`font-mono text-[11px] ${changePos ? "text-long" : "text-short"}`}
        >
          {changePos ? "+" : ""}
          {change24h.toFixed(2)}%
        </div>
      </div>

      {/* Recent change + blocker */}
      {!compact && (
        <div className="w-24 shrink-0 hidden md:block text-right">
          {blockerText ? (
            <div className="text-[10px] text-short/80 font-sans leading-tight">
              ● {blockerText}
            </div>
          ) : (
            <div className="text-[10px] text-muted-foreground/60 font-sans">
              {recentShort}
            </div>
          )}
        </div>
      )}

      {/* Health indicator */}
      {(health.degraded || health.stale) && (
        <div
          className="w-1.5 h-1.5 rounded-full bg-short shrink-0"
          title="Degraded"
        />
      )}
    </button>
  );
}

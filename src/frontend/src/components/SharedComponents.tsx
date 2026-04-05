import type { ExecutionDisplayMode, Side, UserStatus } from "../engine/types";

interface SideBadgeProps {
  side: Side;
  size?: "sm" | "md";
}
export function SideBadge({ side, size = "md" }: SideBadgeProps) {
  const sizeClass =
    size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs";
  if (side === "LONG")
    return (
      <span
        className={`${sizeClass} rounded-full font-mono font-semibold bg-long/20 text-long border border-long/40`}
      >
        LONG
      </span>
    );
  if (side === "SHORT")
    return (
      <span
        className={`${sizeClass} rounded-full font-mono font-semibold bg-short/20 text-short border border-short/40`}
      >
        SHORT
      </span>
    );
  return (
    <span
      className={`${sizeClass} rounded-full font-mono font-semibold bg-neutral/20 text-neutral border border-neutral/40`}
    >
      NEUT
    </span>
  );
}

interface StatusLabelProps {
  status: UserStatus;
}
export function StatusLabel({ status }: StatusLabelProps) {
  const colorMap: Record<UserStatus, string> = {
    EARLY_CANDIDATE: "text-muted-foreground/60",
    WORTH_WATCHING: "text-muted-foreground",
    FORMING_SETUP: "text-neutral",
    ACTIVE_CANDIDATE: "text-info",
    ARMED: "text-amber-400",
    READY: "text-long font-semibold",
    ENTERED: "text-long",
    MANAGING: "text-long",
    EXITED: "text-muted-foreground",
    CANCELLED: "text-muted-foreground",
    DIRECTION_UNCLEAR: "text-muted-foreground/50",
  };
  const labelMap: Record<UserStatus, string> = {
    EARLY_CANDIDATE: "Early Cand",
    WORTH_WATCHING: "Worth Watch",
    FORMING_SETUP: "Forming",
    ACTIVE_CANDIDATE: "Active",
    ARMED: "Armed",
    READY: "Ready",
    ENTERED: "Entered",
    MANAGING: "Managing",
    EXITED: "Exited",
    CANCELLED: "Cancelled",
    DIRECTION_UNCLEAR: "Unclear",
  };

  // Pill wrapper for ARMED and READY
  if (status === "ARMED") {
    return (
      <span className="inline-flex items-center bg-amber-400/10 border border-amber-400/30 rounded px-1.5 py-0.5">
        <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400">
          {labelMap[status]}
        </span>
      </span>
    );
  }
  if (status === "READY") {
    return (
      <span className="inline-flex items-center bg-long/10 border border-long/30 rounded px-1.5 py-0.5">
        <span className="text-[10px] font-mono uppercase tracking-widest text-long font-semibold">
          {labelMap[status]}
        </span>
      </span>
    );
  }

  return (
    <span
      className={`text-[10px] font-mono uppercase tracking-widest ${colorMap[status]}`}
    >
      {labelMap[status]}
    </span>
  );
}

interface ExecutionTagProps {
  mode: ExecutionDisplayMode;
}
export function ExecutionTag({ mode }: ExecutionTagProps) {
  if (mode === "NO_PLAN")
    return (
      <span className="px-1.5 py-0.5 text-[10px] font-mono rounded border border-surface-border text-muted-foreground">
        NO PLAN
      </span>
    );
  if (mode === "PROVISIONAL_PLAN")
    return (
      <span className="px-1.5 py-0.5 text-[10px] font-mono rounded border border-neutral/40 text-neutral/80 bg-neutral/5">
        PROVISIONAL
      </span>
    );
  if (mode === "EXACT_PLAN")
    return (
      <span className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-info/15 border border-info/50 text-info font-semibold">
        ● EXACT
      </span>
    );
  if (mode === "LIVE_MANAGEMENT")
    return (
      <span className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-long/20 border border-long/50 text-long">
        LIVE MGT
      </span>
    );
  return null;
}

interface MetricBarProps {
  label: string;
  value: number;
  max?: number;
  colorClass?: string;
  invert?: boolean; // higher = worse (for risk)
}
export function MetricBar({
  label,
  value,
  max = 100,
  colorClass,
  invert = false,
}: MetricBarProps) {
  const pct = Math.min(100, (value / max) * 100);
  const defaultColor = invert
    ? pct > 70
      ? "bg-short"
      : pct > 40
        ? "bg-neutral"
        : "bg-long"
    : pct > 65
      ? "bg-long"
      : pct > 35
        ? "bg-neutral"
        : "bg-short";
  const barColor = colorClass || defaultColor;
  return (
    <div className="flex items-center gap-2 py-0.5">
      <span className="text-[11px] text-muted-foreground font-sans w-28 shrink-0">
        {label}
      </span>
      <div className="flex-1 h-1.5 bg-surface-border rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[11px] font-mono text-foreground w-8 text-right">
        {value.toFixed(0)}
      </span>
    </div>
  );
}

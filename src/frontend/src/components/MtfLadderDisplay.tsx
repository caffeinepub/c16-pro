import type { CanonicalSymbolState } from "../engine/types";
import { MetricBar } from "./SharedComponents";

interface MtfLadderDisplayProps {
  state: CanonicalSymbolState;
}

type TFKey = "4H" | "1H" | "15M" | "5M" | "1M";

interface TFRow {
  tf: TFKey;
  sublabel: string;
  bias: string;
  score: number;
  status: string;
  statusColor: string;
}

// Contextual 1M gate status wording.
// Distinguishes between the micro gate being strong but higher-TF blocking,
// vs the gate score itself being too weak to allow entry.
function resolve1MGateStatus(
  entryAllowed: boolean,
  gate1mLong: number,
  gate1mShort: number,
  bias4h: string,
  confirm1h: string,
): { status: string; statusColor: string } {
  if (entryAllowed) {
    return { status: "Gate open", statusColor: "text-long" };
  }

  const gateMax = Math.max(gate1mLong, gate1mShort);
  const higherTFBlocked = bias4h === "NEUTRAL" || confirm1h === "UNCONFIRMED";

  if (higherTFBlocked && gateMax >= 50) {
    // Gate score is solid — the block is from 4H/1H, not the micro gate
    return {
      status: "Micro gate strong — higher-TF blocked",
      statusColor: "text-neutral",
    };
  }

  if (higherTFBlocked) {
    // Both gate and higher-TF are not ready
    return {
      status: "Higher-TF blocked",
      statusColor: "text-short",
    };
  }

  // Gate score itself is the bottleneck
  return {
    status: "Gate too weak — wait for micro timing",
    statusColor: "text-short",
  };
}

export function MtfLadderDisplay({ state }: MtfLadderDisplayProps) {
  const { mtf } = state;

  const gate1mStatus = resolve1MGateStatus(
    mtf.entryAllowed,
    mtf.gate1mLong,
    mtf.gate1mShort,
    mtf.bias4h,
    mtf.confirm1h,
  );

  const rows: TFRow[] = [
    {
      tf: "4H",
      sublabel: "Bias",
      bias: mtf.bias4h,
      score: mtf.bias4h === "LONG" ? 75 : mtf.bias4h === "SHORT" ? 75 : 25,
      status: mtf.bias4h === "NEUTRAL" ? "Neutral" : `${mtf.bias4h} bias`,
      statusColor:
        mtf.bias4h === "LONG"
          ? "text-long"
          : mtf.bias4h === "SHORT"
            ? "text-short"
            : "text-neutral",
    },
    {
      tf: "1H",
      sublabel: "Conf",
      bias: mtf.confirm1h,
      score: mtf.confirm1h !== "UNCONFIRMED" ? 70 : 20,
      status:
        mtf.confirm1h === "UNCONFIRMED"
          ? "⚠ Unconfirmed"
          : `${mtf.confirm1h} confirmed`,
      statusColor:
        mtf.confirm1h === "LONG"
          ? "text-long"
          : mtf.confirm1h === "SHORT"
            ? "text-short"
            : "text-short",
    },
    {
      tf: "15M",
      sublabel: "Growth",
      bias: mtf.growth15m > 50 ? "BUILDING" : "WEAK",
      score: mtf.growth15m,
      status:
        mtf.growth15m > 65
          ? "Strong growth"
          : mtf.growth15m > 40
            ? "Building"
            : "Weak",
      statusColor:
        mtf.growth15m > 65
          ? "text-long"
          : mtf.growth15m > 40
            ? "text-neutral"
            : "text-short",
    },
    {
      tf: "5M",
      sublabel: "Build",
      bias: mtf.growth5m > 50 ? "MATURE" : "FORMING",
      score: mtf.growth5m,
      status:
        mtf.growth5m > 65 ? "Mature" : mtf.growth5m > 40 ? "Forming" : "Weak",
      statusColor:
        mtf.growth5m > 65
          ? "text-long"
          : mtf.growth5m > 40
            ? "text-neutral"
            : "text-short",
    },
    {
      tf: "1M",
      sublabel: "Gate",
      bias: mtf.entryAllowed ? "OPEN" : "BLOCKED",
      score: Math.max(mtf.gate1mLong, mtf.gate1mShort),
      status: gate1mStatus.status,
      statusColor: gate1mStatus.statusColor,
    },
  ];

  return (
    <div className="space-y-1">
      {rows.map((row, i) => (
        <div key={row.tf}>
          {/* Divider between 1H and 15M (higher-TF vs lower-TF boundary) */}
          {i === 2 && (
            <div className="border-t border-surface-border/50 my-1" />
          )}
          <div className="flex items-center gap-2 py-0.5">
            {/* TF label: stacked two-line */}
            <div className="w-8 shrink-0 flex flex-col leading-none">
              <span className="text-[11px] font-mono text-muted-foreground">
                {row.tf}
              </span>
              <span className="text-[9px] font-mono text-muted-foreground/50">
                {row.sublabel}
              </span>
            </div>
            <div className="flex-1">
              <MetricBar
                label=""
                value={row.score}
                colorClass={
                  row.score > 60
                    ? "bg-long"
                    : row.score > 35
                      ? "bg-neutral"
                      : "bg-short"
                }
              />
            </div>
            <span
              className={`text-[11px] font-mono shrink-0 w-36 text-right ${
                row.tf === "1H" && row.status.startsWith("⚠")
                  ? "text-short"
                  : row.statusColor
              }`}
            >
              {row.status}
            </span>
          </div>
        </div>
      ))}
      {mtf.mainExecutionBlocker && (
        <div className="mt-1 text-[11px] text-short/80 font-sans">
          ⚠ {mtf.mainExecutionBlocker}
        </div>
      )}
    </div>
  );
}

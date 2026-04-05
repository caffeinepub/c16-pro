import type { RuntimeStatus } from "../engine/binanceRuntime";
import type { RuntimeMode } from "../engine/types";

interface RuntimeBannerProps {
  runtimeMode?: RuntimeMode;
  runtimeStatus?: RuntimeStatus;
  trustScore?: number;
}

export function RuntimeBanner({
  runtimeMode,
  runtimeStatus,
  trustScore,
}: RuntimeBannerProps) {
  if (!runtimeMode && !runtimeStatus) return null;
  const mode = runtimeMode || (runtimeStatus?.wsConnected ? "LIVE" : "OFFLINE");

  if (mode === "LIVE") return null; // no banner needed when healthy

  let bgClass = "bg-short/10 border-short/30";
  let textClass = "text-short";
  let message = "";

  if (mode === "OFFLINE") {
    bgClass = "bg-short/15 border-short/40";
    textClass = "text-short";
    message = "Offline — No live data available. Execution blocked.";
  } else if (mode === "DEGRADED") {
    bgClass = "bg-short/10 border-short/30";
    textClass = "text-short";
    message =
      "Degraded — WebSocket issues detected. Trust reduced. Do not execute.";
  } else if (mode === "LIVE_PARTIAL") {
    bgClass = "bg-neutral/10 border-neutral/30";
    textClass = "text-neutral";
    message =
      "Live Partial — Some data channels degraded. Execution may be unreliable.";
  } else if (mode === "DEMO") {
    bgClass = "bg-info/10 border-info/30";
    textClass = "text-info";
    message = "Demo Mode — Not live data. Execution blocked.";
  } else if (mode === "HISTORICAL") {
    bgClass = "bg-info/10 border-info/30";
    textClass = "text-info";
    message = "Historical Mode — Execution blocked. Review only.";
  }

  if (!message) return null;

  return (
    <div
      data-ocid="runtime.error_state"
      className={`flex items-center gap-2 px-3 py-2 border-b ${bgClass} ${textClass} text-[11px] font-mono`}
    >
      <span className="inline-block w-1.5 h-1.5 rounded-full bg-current shrink-0 animate-pulse" />
      <span>{message}</span>
      {trustScore !== undefined && trustScore < 100 && (
        <span className="ml-auto text-muted-foreground">
          Trust: {trustScore.toFixed(0)}/100
        </span>
      )}
    </div>
  );
}

export function GlobalRuntimeBanner({ status }: { status: RuntimeStatus }) {
  if (status.mode === "LIVE") return null;

  let bgClass = "bg-short/10 border-short/30 text-short";
  let message = "";

  if (status.mode === "CONNECTING") {
    bgClass = "bg-info/10 border-info/30 text-info";
    message = "Connecting to Binance...";
  } else if (status.mode === "OFFLINE") {
    bgClass = "bg-short/15 border-short/40 text-short";
    message = `Offline — No live data. Execution blocked. (${status.reconnectAttempts} reconnect attempts)`;
  } else if (status.mode === "DEGRADED") {
    bgClass = "bg-short/10 border-short/30 text-short";
    message = `Degraded — WebSocket reconnecting... (attempt ${status.reconnectAttempts})`;
  } else if (status.mode === "LIVE_PARTIAL") {
    bgClass = "bg-neutral/10 border-neutral/30 text-neutral";
    message = "Live Partial — Some data channels degraded.";
  }

  if (!message) return null;

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 border-b ${bgClass} text-[11px] font-mono`}
    >
      <span className="inline-block w-1.5 h-1.5 rounded-full bg-current shrink-0 animate-pulse" />
      <span>{message}</span>
    </div>
  );
}

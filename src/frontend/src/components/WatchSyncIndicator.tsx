import { useEffect, useState } from "react";
import type { RuntimeStatus } from "../engine/binanceRuntime";

/**
 * Thresholds for sync state transitions.
 * These are based on the canonical runtimeStatus.lastUpdateTime emitted
 * by BinanceRuntime.setStatus() on every real WebSocket tick cycle.
 *
 * DELAYED:      update gap > 5s  (heartbeat slowing but still connected)
 * STALE:        update gap > 15s (no live data arriving)
 * Auto-recover: transitions back to LIVE automatically when updates resume
 */
const DELAYED_THRESHOLD_MS = 5_000;
const STALE_THRESHOLD_MS = 15_000;

type SyncState = "LIVE" | "SYNCED" | "DELAYED" | "STALE" | "RECONNECTING";

function formatAge(ms: number): string {
  if (ms < 2000) return "just now";
  if (ms < 60_000) return `${Math.floor(ms / 1000)}s ago`;
  const mins = Math.floor(ms / 60_000);
  return `${mins}m ago`;
}

function resolveSyncState(status: RuntimeStatus, ageMs: number): SyncState {
  // Reconnecting takes precedence over everything
  if (
    status.mode === "CONNECTING" ||
    (status.mode === "DEGRADED" && !status.wsConnected) ||
    (status.mode === "OFFLINE" && status.reconnectAttempts > 0)
  ) {
    return "RECONNECTING";
  }

  // Offline with no reconnect attempt
  if (status.mode === "OFFLINE" && status.reconnectAttempts === 0) {
    return "STALE";
  }

  // WS connected but data age is too old — auto-stale
  if (ageMs >= STALE_THRESHOLD_MS) return "STALE";
  if (ageMs >= DELAYED_THRESHOLD_MS) return "DELAYED";

  // Live partial: treat as DELAYED since some channels are down
  if (status.mode === "LIVE_PARTIAL") return "DELAYED";

  // Healthy
  return "LIVE";
}

const STATE_CONFIG: Record<
  SyncState,
  { label: string; dot: string; text: string; border: string }
> = {
  LIVE: {
    label: "LIVE",
    dot: "bg-long animate-pulse",
    text: "text-long",
    border: "border-long/20",
  },
  SYNCED: {
    label: "SYNCED",
    dot: "bg-long",
    text: "text-long",
    border: "border-long/20",
  },
  DELAYED: {
    label: "DELAYED",
    dot: "bg-neutral animate-pulse",
    text: "text-neutral",
    border: "border-neutral/30",
  },
  STALE: {
    label: "STALE",
    dot: "bg-short",
    text: "text-short",
    border: "border-short/30",
  },
  RECONNECTING: {
    label: "RECONNECTING",
    dot: "bg-info animate-pulse",
    text: "text-info",
    border: "border-info/20",
  },
};

interface WatchSyncIndicatorProps {
  runtimeStatus: RuntimeStatus;
}

export function WatchSyncIndicator({ runtimeStatus }: WatchSyncIndicatorProps) {
  // Tick every second for age display — no data fetching, no fake polling.
  // The actual symbol state is driven by useCanonicalEngine's flushUpdates()
  // which already runs at 500ms. This tick is display-only.
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const lastUpdate = runtimeStatus.lastUpdateTime;
  const ageMs = lastUpdate > 0 ? now - lastUpdate : Number.POSITIVE_INFINITY;
  const syncState = resolveSyncState(runtimeStatus, ageMs);
  const cfg = STATE_CONFIG[syncState];

  const ageText =
    lastUpdate > 0
      ? formatAge(ageMs)
      : syncState === "RECONNECTING"
        ? "connecting..."
        : "no data";

  return (
    <div
      className={`flex items-center gap-1.5 px-2 py-0.5 rounded border ${cfg.border} bg-surface/40 shrink-0`}
      title={`Sync: ${syncState} — Last update: ${lastUpdate > 0 ? new Date(lastUpdate).toLocaleTimeString() : "never"}`}
    >
      {/* Pulse dot */}
      <span
        className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`}
      />
      {/* State label */}
      <span
        className={`text-[10px] font-mono font-semibold tracking-wide ${cfg.text}`}
      >
        {cfg.label}
      </span>
      {/* Age */}
      <span className="text-[9px] font-mono text-muted-foreground/60 leading-none">
        {ageText}
      </span>
    </div>
  );
}

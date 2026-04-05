import { useEffect, useState } from "react";
import type { RuntimeStatus } from "../engine/binanceRuntime";

interface Settings {
  showLayerBOnBoard: boolean;
  compactRowMode: boolean;
}

interface MoreScreenProps {
  runtimeStatus: RuntimeStatus;
  priorityCoreCount: number;
  layerBCount: number;
  settings: Settings;
  onSettingChange: (key: keyof Settings, value: boolean) => void;
}

export function MoreScreen({
  runtimeStatus,
  priorityCoreCount,
  layerBCount,
  settings,
  onSettingChange,
}: MoreScreenProps) {
  const [showDiag, setShowDiag] = useState(false);

  const modeBadgeClass =
    runtimeStatus.mode === "LIVE"
      ? "text-long"
      : runtimeStatus.mode === "CONNECTING"
        ? "text-info"
        : "text-short";

  return (
    <div className="flex flex-col h-full overflow-y-auto" data-ocid="more.page">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-surface-border">
        <h2 className="text-sm font-sans font-semibold text-foreground">
          More
        </h2>
      </div>

      {/* Runtime Health */}
      <section className="px-3 py-3 border-b border-surface-border">
        <div className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider mb-2">
          Runtime Health
        </div>
        <div className="space-y-1.5 text-[12px]">
          <div className="flex justify-between">
            <span className="font-sans text-muted-foreground">Status</span>
            <span className={`font-mono font-semibold ${modeBadgeClass}`}>
              {runtimeStatus.mode}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="font-sans text-muted-foreground">WebSocket</span>
            <span
              className={`font-mono ${
                runtimeStatus.wsConnected ? "text-long" : "text-short"
              }`}
            >
              {runtimeStatus.wsConnected ? "Connected" : "Disconnected"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="font-sans text-muted-foreground">
              Total Symbols
            </span>
            <span className="font-mono text-foreground">
              {runtimeStatus.totalSymbols}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="font-sans text-muted-foreground">
              Priority Core
            </span>
            <span className="font-mono text-info">{priorityCoreCount}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-sans text-muted-foreground">Layer B</span>
            <span className="font-mono text-muted-foreground">
              {layerBCount}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="font-sans text-muted-foreground">
              Reconnect Attempts
            </span>
            <span
              className={`font-mono ${
                runtimeStatus.reconnectAttempts > 0
                  ? "text-short"
                  : "text-muted-foreground"
              }`}
            >
              {runtimeStatus.reconnectAttempts}
            </span>
          </div>
        </div>
      </section>

      {/* Settings */}
      <section className="px-3 py-3 border-b border-surface-border">
        <div className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider mb-2">
          Settings
        </div>
        <div className="space-y-3">
          <ToggleRow
            label="Show Layer B on Board"
            description="Include background-tier symbols in board sections"
            checked={settings.showLayerBOnBoard}
            onChange={(v) => onSettingChange("showLayerBOnBoard", v)}
            ocid="more.switch"
          />
          <ToggleRow
            label="Compact Row Mode"
            description="Denser symbol rows across all list views"
            checked={settings.compactRowMode}
            onChange={(v) => onSettingChange("compactRowMode", v)}
            ocid="more.switch"
          />
        </div>
      </section>

      {/* Diagnostics */}
      <section className="px-3 py-3 border-b border-surface-border">
        <button
          type="button"
          data-ocid="more.toggle"
          className="flex items-center justify-between w-full text-[11px] font-mono text-muted-foreground uppercase tracking-wider"
          onClick={() => setShowDiag((s) => !s)}
        >
          <span>Diagnostics</span>
          <span>{showDiag ? "▲" : "▼"}</span>
        </button>
        {showDiag && (
          <div className="mt-2 space-y-1 text-[11px] font-mono">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Connected Symbols</span>
              <span className="text-foreground">
                {runtimeStatus.connectedSymbols}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Last Update</span>
              <span className="text-foreground">
                {runtimeStatus.lastUpdateTime > 0
                  ? new Date(runtimeStatus.lastUpdateTime).toLocaleTimeString()
                  : "Never"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Data Source</span>
              <span className="text-foreground">Binance USDT-M Futures WS</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Engine</span>
              <span className="text-foreground">C16 PRO v2 — G100 PRO</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Discovered Symbols</span>
              <span className="text-foreground">
                {runtimeStatus.totalSymbols}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Live-Subscribed</span>
              <span
                className={`${runtimeStatus.liveSubscribedCount === runtimeStatus.totalSymbols ? "text-long" : "text-short"}`}
              >
                {runtimeStatus.liveSubscribedCount} /{" "}
                {runtimeStatus.totalSymbols}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Klines Loaded</span>
              <span className="text-foreground">
                {runtimeStatus.klinePrefetchedCount} /{" "}
                {runtimeStatus.totalSymbols}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Background Hydration
              </span>
              <span
                className={`${runtimeStatus.hydrationComplete ? "text-long" : "text-info"}`}
              >
                {runtimeStatus.hydrationComplete ? "Complete" : "In Progress…"}
              </span>
            </div>
          </div>
        )}
      </section>

      {/* About */}
      <section className="px-3 py-3 border-b border-surface-border">
        <div className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider mb-2">
          About
        </div>
        <div className="text-[12px] font-sans text-muted-foreground">
          C16 PRO v2 — G100 PRO decision engine
        </div>
        <div className="mt-1 text-[11px] font-sans text-muted-foreground/60">
          Professional-grade live trading decision-support system.
          Structure-first. Trust-aware. Execution-honest.
        </div>
      </section>

      {/* Spec */}
      <SpecSection />

      {/* Footer */}
      <div className="mt-auto px-3 py-3 border-t border-surface-border">
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
    </div>
  );
}

function SpecSection() {
  const [specText, setSpecText] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (expanded && specText === null) {
      fetch("/spec.md")
        .then((r) => r.text())
        .then((t) => setSpecText(t))
        .catch(() => setSpecText("spec.md could not be loaded."));
    }
  }, [expanded, specText]);

  return (
    <section className="px-3 py-3 border-b border-surface-border">
      <button
        type="button"
        data-ocid="more.spec_toggle"
        className="flex items-center justify-between w-full text-[11px] font-mono text-muted-foreground uppercase tracking-wider"
        onClick={() => setExpanded((s) => !s)}
      >
        <span>Spec</span>
        <span>{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded && (
        <div className="mt-2">
          {specText === null ? (
            <div className="text-[11px] font-mono text-muted-foreground">
              Loading spec...
            </div>
          ) : (
            <pre className="text-[10px] font-mono text-foreground/70 whitespace-pre-wrap leading-relaxed overflow-x-auto">
              {specText}
            </pre>
          )}
        </div>
      )}
    </section>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  ocid,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  ocid: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="text-[12px] font-sans text-foreground">{label}</div>
        <div className="text-[10px] font-sans text-muted-foreground/70 mt-0.5">
          {description}
        </div>
      </div>
      <button
        type="button"
        data-ocid={ocid}
        onClick={() => onChange(!checked)}
        className={`shrink-0 w-9 h-5 rounded-full border transition-colors ${
          checked
            ? "bg-info/30 border-info/50"
            : "bg-surface border-surface-border"
        }`}
      >
        <div
          className={`w-3.5 h-3.5 rounded-full transition-transform mx-0.5 ${
            checked
              ? "translate-x-4 bg-info"
              : "translate-x-0 bg-muted-foreground/50"
          }`}
        />
      </button>
    </div>
  );
}

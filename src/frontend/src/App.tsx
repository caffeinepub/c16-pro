import { useState } from "react";
import { useCanonicalEngine } from "./engine/useCanonicalEngine";
import { BoardScreen } from "./screens/BoardScreen";
import { DetailScreen } from "./screens/DetailScreen";
import { MoreScreen } from "./screens/MoreScreen";
import { ScreenerScreen } from "./screens/ScreenerScreen";
import { WatchlistScreen } from "./screens/WatchlistScreen";

type Tab = "board" | "watchlist" | "screener" | "detail" | "more";

interface Settings {
  showLayerBOnBoard: boolean;
  compactRowMode: boolean;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("board");
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings>({
    showLayerBOnBoard: true,
    compactRowMode: false,
  });

  const {
    symbolStates,
    runtimeStatus,
    watchlist,
    addToWatchlist,
    removeFromWatchlist,
    loadKlinesForSymbol,
    priorityCore,
    layerB,
  } = useCanonicalEngine();

  function handleSelectSymbol(symbol: string) {
    setSelectedSymbol(symbol);
    setActiveTab("detail");
  }

  function handleSettingChange(key: keyof Settings, value: boolean) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  const tabs: Array<{ id: Tab; label: string; icon: string }> = [
    { id: "board", label: "Board", icon: "▣" },
    { id: "watchlist", label: "Watch", icon: "★" },
    { id: "screener", label: "Screen", icon: "☰" },
    { id: "detail", label: "Detail", icon: "▤" },
    { id: "more", label: "More", icon: "⋯" },
  ];

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        {activeTab === "board" && (
          <BoardScreen
            symbolStates={symbolStates}
            runtimeStatus={runtimeStatus}
            onSelectSymbol={handleSelectSymbol}
          />
        )}
        {activeTab === "watchlist" && (
          <WatchlistScreen
            watchlist={watchlist}
            symbolStates={symbolStates}
            onSelectSymbol={handleSelectSymbol}
            onRemoveFromWatchlist={removeFromWatchlist}
            runtimeStatus={runtimeStatus}
          />
        )}
        {activeTab === "screener" && (
          <ScreenerScreen
            symbolStates={symbolStates}
            onSelectSymbol={handleSelectSymbol}
            onAddToWatchlist={addToWatchlist}
            watchlist={watchlist}
          />
        )}
        {activeTab === "detail" && (
          <DetailScreen
            symbol={selectedSymbol}
            symbolStates={symbolStates}
            onLoadKlines={loadKlinesForSymbol}
            onAddToWatchlist={addToWatchlist}
            onRemoveFromWatchlist={removeFromWatchlist}
            watchlist={watchlist}
            onBack={() => setActiveTab("board")}
          />
        )}
        {activeTab === "more" && (
          <MoreScreen
            runtimeStatus={runtimeStatus}
            priorityCoreCount={priorityCore.length}
            layerBCount={layerB.length}
            settings={settings}
            onSettingChange={handleSettingChange}
          />
        )}
      </main>

      {/* Bottom tab bar */}
      <nav className="flex border-t border-surface-border bg-background shrink-0">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const isDetailWithSymbol =
            tab.id === "detail" && selectedSymbol !== null;
          return (
            <button
              type="button"
              key={tab.id}
              data-ocid={`nav.${tab.id}.link`}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors ${
                isActive
                  ? "text-info"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="text-[14px] leading-none">{tab.icon}</span>
              <span className="text-[10px] font-sans tracking-wide">
                {tab.id === "detail" && isDetailWithSymbol
                  ? selectedSymbol!.replace("USDT", "")
                  : tab.label}
              </span>
              {isActive && (
                <div className="w-4 h-0.5 rounded-full bg-info mt-0.5" />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

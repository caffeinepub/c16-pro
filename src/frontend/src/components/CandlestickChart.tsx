import type { KlineBar } from "../engine/types";

interface CandlestickChartProps {
  bars: KlineBar[];
  width?: number;
  height?: number;
  entryPrice?: number | null;
  slPrice?: number | null;
  tp1?: number | null;
  tp2?: number | null;
  tp3?: number | null;
  className?: string;
}

export function CandlestickChart({
  bars,
  width = 600,
  height = 200,
  entryPrice,
  slPrice,
  tp1,
  tp2,
  tp3,
  className = "",
}: CandlestickChartProps) {
  if (bars.length === 0) {
    return (
      <div
        className={`flex items-center justify-center text-muted-foreground text-[11px] font-mono bg-surface border border-surface-border rounded ${className}`}
        style={{ height }}
      >
        No candle data
      </div>
    );
  }

  const displayBars = bars.slice(-50);
  const highs = displayBars.map((b) => b.high);
  const lows = displayBars.map((b) => b.low);
  const allLevels = [
    Math.max(...highs),
    Math.min(...lows),
    entryPrice,
    slPrice,
    tp1,
    tp2,
    tp3,
  ]
    .filter((v): v is number => v !== null && v !== undefined)
    .filter((v) => !Number.isNaN(v));

  const maxPrice = Math.max(...allLevels);
  const minPrice = Math.min(...allLevels);
  const priceRange = maxPrice - minPrice || 1;

  const pad = { top: 8, bottom: 8, left: 4, right: 4 };
  const chartWidth = width - pad.left - pad.right;
  const chartHeight = height - pad.top - pad.bottom;

  const toY = (price: number) =>
    pad.top + ((maxPrice - price) / priceRange) * chartHeight;
  const candleWidth = Math.max(
    2,
    Math.floor((chartWidth / displayBars.length) * 0.7),
  );
  const gap = chartWidth / displayBars.length;

  const hLineLevels = [
    entryPrice && {
      price: entryPrice,
      color: "oklch(65% 0.18 240)",
      label: "E",
    },
    slPrice && { price: slPrice, color: "oklch(62% 0.22 22)", label: "SL" },
    tp1 && { price: tp1, color: "oklch(72% 0.18 145)", label: "TP1" },
    tp2 && { price: tp2, color: "oklch(68% 0.14 145)", label: "TP2" },
    tp3 && { price: tp3, color: "oklch(62% 0.10 145)", label: "TP3" },
  ].filter((v): v is { price: number; color: string; label: string } => !!v);

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${width} ${height}`}
      className={`block ${className}`}
      data-ocid="detail.canvas_target"
      role="img"
      aria-label="Candlestick price chart"
    >
      {/* Background */}
      <rect width={width} height={height} fill="oklch(14% 0.005 240)" rx="4" />

      {/* Candles */}
      {displayBars.map((bar, i) => {
        const cx = pad.left + i * gap + gap / 2;
        const isUp = bar.close >= bar.open;
        const color = isUp ? "oklch(72% 0.18 145)" : "oklch(62% 0.22 22)";
        const bodyTop = toY(Math.max(bar.open, bar.close));
        const bodyBot = toY(Math.min(bar.open, bar.close));
        const bodyH = Math.max(1, bodyBot - bodyTop);
        const wickTop = toY(bar.high);
        const wickBot = toY(bar.low);

        return (
          <g key={bar.openTime}>
            {/* Wick */}
            <line
              x1={cx}
              x2={cx}
              y1={wickTop}
              y2={wickBot}
              stroke={color}
              strokeWidth="1"
              opacity="0.7"
            />
            {/* Body */}
            <rect
              x={cx - candleWidth / 2}
              y={bodyTop}
              width={candleWidth}
              height={bodyH}
              fill={color}
              opacity="0.9"
            />
          </g>
        );
      })}

      {/* Horizontal level lines */}
      {hLineLevels.map(({ price, color, label }) => {
        const y = toY(price);
        return (
          <g key={label}>
            <line
              x1={pad.left}
              x2={width - pad.right}
              y1={y}
              y2={y}
              stroke={color}
              strokeWidth="1"
              strokeDasharray="4 3"
              opacity="0.8"
            />
            <text
              x={width - pad.right - 2}
              y={y - 2}
              fill={color}
              fontSize="9"
              textAnchor="end"
              fontFamily="JetBrains Mono, monospace"
            >
              {label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

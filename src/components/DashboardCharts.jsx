import { formatCurrency } from "../utils.js";

const breakdownPalettes = {
  night: ["#ff5c88", "#ff9f43", "#49c6ff", "#38d6b5", "#a78bfa", "#7dd56f"],
  dawn: ["#f43f5e", "#fb923c", "#38bdf8", "#14b8a6", "#8b5cf6", "#84cc16"],
};

const trendAccents = {
  night: {
    lineStart: "#6c63ff",
    lineEnd: "#ff4ecd",
    areaColor: "#9859ff",
    areaOpacity: 0.42,
  },
  dawn: {
    lineStart: "#8b5cf6",
    lineEnd: "#0ea5e9",
    areaColor: "#8b5cf6",
    areaOpacity: 0.24,
  },
};

export function TrendChart({ data, rangeLabel, delta = 0, theme = "night" }) {
  if (!data.length) {
    return (
      <div className="empty-chart empty-chart-dark">
        <p className="eyebrow">Waiting on data</p>
        <h3>No trend data available</h3>
        <p>Add transactions to reveal the month-by-month balance curve.</p>
      </div>
    );
  }

  const width = 560;
  const height = 250;
  const paddingX = 34;
  const paddingTop = 26;
  const paddingBottom = 40;
  const values = data.map((item) => item.balance);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = Math.max(max - min, 1);
  const stepX = data.length === 1 ? 0 : (width - paddingX * 2) / (data.length - 1);
  const points = data.map((item, index) => {
    const x = paddingX + index * stepX;
    const y = paddingTop + ((max - item.balance) / spread) * (height - paddingTop - paddingBottom);
    return { ...item, shortLabel: item.label.split(" ")[0], x, y };
  });
  const latest = points[points.length - 1];
  const path = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(" ");
  const areaPath = [
    path,
    `L ${latest.x.toFixed(1)} ${(height - paddingBottom).toFixed(1)}`,
    `L ${points[0].x.toFixed(1)} ${(height - paddingBottom).toFixed(1)}`,
    "Z",
  ].join(" ");
  const guides = [0, 0.33, 0.66, 1].map((ratio) => ({
    y: paddingTop + ratio * (height - paddingTop - paddingBottom),
    label: formatCurrency(Math.round(max - spread * ratio)),
  }));
  const bubbleWidth = 106;
  const bubbleHeight = 56;
  const bubbleX = Math.min(width - bubbleWidth - 8, Math.max(8, latest.x - bubbleWidth / 2));
  const bubbleY = Math.max(8, latest.y - bubbleHeight - 18);
  const accent = trendAccents[theme] ?? trendAccents.night;
  const lineGradientId = `trendLineGradient-${theme}`;
  const areaGradientId = `trendAreaGradient-${theme}`;

  return (
    <>
      <div className="finova-chart-header">
        <div>
          <h3>Balance Trend</h3>
          <p>Track the curve of your closing balance over time.</p>
        </div>
        <span className="chart-badge">{rangeLabel}</span>
      </div>

      <div className="trend-chart dark-trend-chart">
        <svg className="trend-svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Balance trend chart">
          <defs>
            <linearGradient id={lineGradientId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={accent.lineStart} />
              <stop offset="100%" stopColor={accent.lineEnd} />
            </linearGradient>
            <linearGradient id={areaGradientId} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={accent.areaColor} stopOpacity={accent.areaOpacity} />
              <stop offset="100%" stopColor={accent.areaColor} stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {guides.map((guide) => (
            <g key={guide.y}>
              <line
                x1={paddingX}
                y1={guide.y}
                x2={width - paddingX}
                y2={guide.y}
                className="chart-grid-line chart-grid-line-dark"
              />
              <text x="0" y={guide.y + 4} className="chart-grid-label chart-grid-label-dark">
                {guide.label}
              </text>
            </g>
          ))}

          <path d={areaPath} fill={`url(#${areaGradientId})`} className="trend-area-dark" />
          <path d={path} stroke={`url(#${lineGradientId})`} className="trend-line-dark" />

          {points.map((point) => (
            <g key={point.monthKey}>
              <circle cx={point.x} cy={point.y} r="4.4" className="trend-dot-dark" />
              <circle cx={point.x} cy={point.y} r="8.5" className="trend-dot-glow" />
              <text x={point.x} y={height - 12} className="chart-axis-label chart-axis-label-dark">
                {point.shortLabel}
              </text>
            </g>
          ))}

          <g className="chart-callout">
            <rect x={bubbleX} y={bubbleY} width={bubbleWidth} height={bubbleHeight} rx="14" />
            <text x={bubbleX + 12} y={bubbleY + 20} className="chart-callout-label">
              {latest.label}
            </text>
            <text x={bubbleX + 12} y={bubbleY + 40} className="chart-callout-value">
              {formatCurrency(latest.balance)}
            </text>
          </g>
        </svg>
      </div>

      <div className="chart-footer-note">
        <span className={`trend-footnote ${delta >= 0 ? "trend-footnote-positive" : "trend-footnote-negative"}`} />
        <p>
          Your balance has {delta >= 0 ? "grown" : "moved"} by <strong>{formatCurrency(Math.abs(delta))}</strong> in
          the latest month.
        </p>
      </div>
    </>
  );
}

export function BreakdownChart({ breakdown, rangeLabel, theme = "night" }) {
  if (!breakdown.length) {
    return (
      <div className="empty-chart empty-chart-dark">
        <p className="eyebrow">Waiting on data</p>
        <h3>No spending mix available</h3>
        <p>Expense categories will appear here once spending data is added.</p>
      </div>
    );
  }

  const palette = breakdownPalettes[theme] ?? breakdownPalettes.night;
  let start = 0;
  const stops = breakdown.map((item, index) => {
    const end = start + item.percent;
    const color = palette[index % palette.length];
    const segment = `${color} ${start.toFixed(1)}% ${end.toFixed(1)}%`;
    start = end;
    return segment;
  });
  const total = breakdown.reduce((sum, item) => sum + item.amount, 0);

  return (
    <>
      <div className="finova-chart-header">
        <div>
          <h3>Spending Breakdown</h3>
          <p>See where the bulk of your expense budget is going.</p>
        </div>
        <span className="chart-badge">{rangeLabel}</span>
      </div>

      <div className="donut-layout">
        <div className="donut-shell dark-donut-shell">
          <div className="donut-chart dark-donut-chart" style={{ background: `conic-gradient(${stops.join(", ")})` }}>
            <div className="donut-hole dark-donut-hole">
              <strong>{formatCurrency(total)}</strong>
              <span>Total</span>
            </div>
          </div>
        </div>

        <div className="breakdown-legend">
          {breakdown.map((item, index) => (
            <div key={item.category} className="breakdown-legend-item">
              <div className="breakdown-legend-main">
                <span
                  className="breakdown-legend-dot"
                  style={{ background: palette[index % palette.length] }}
                />
                <div>
                  <strong>{item.category}</strong>
                  <small>{formatCurrency(item.amount)}</small>
                </div>
              </div>
              <span>{Math.round(item.percent)}%</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

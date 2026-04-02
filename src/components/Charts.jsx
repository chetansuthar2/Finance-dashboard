import { formatCurrency } from "../utils.js";

const palette = ["#0f766e", "#d97706", "#0f4c81", "#be123c", "#6d28d9", "#047857"];

export function TrendChart({ data }) {
  if (!data.length) {
    return (
      <div className="empty-chart">
        <p className="eyebrow">Waiting on data</p>
        <h3>No trend data available</h3>
        <p>Add transactions to reveal the month-by-month balance curve.</p>
      </div>
    );
  }

  const width = 560;
  const height = 240;
  const padding = 30;
  const values = data.map((item) => item.balance);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = Math.max(max - min, 1);
  const stepX = data.length === 1 ? 0 : (width - padding * 2) / (data.length - 1);

  const points = data.map((item, index) => {
    const x = padding + index * stepX;
    const y = padding + ((max - item.balance) / spread) * (height - padding * 2);
    return { ...item, x, y };
  });

  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(" ");

  const lastPoint = points[points.length - 1];
  const firstPoint = points[0];
  const areaPath = [
    linePath,
    `L ${lastPoint.x.toFixed(1)} ${(height - padding).toFixed(1)}`,
    `L ${firstPoint.x.toFixed(1)} ${(height - padding).toFixed(1)}`,
    "Z",
  ].join(" ");

  const guides = [0, 0.5, 1].map((ratio) => {
    const y = padding + ratio * (height - padding * 2);
    const value = max - spread * ratio;
    return { y, label: formatCurrency(Math.round(value)) };
  });

  const latest = data[data.length - 1];
  const previous = data[data.length - 2];
  const delta = previous ? latest.balance - previous.balance : 0;

  return (
    <>
      <div className="chart-header">
        <div>
          <p className="eyebrow">Balance Trend</p>
          <h3>Closing balance over the last {data.length} months</h3>
        </div>
        <div className="chart-stat">
          <span>Latest</span>
          <strong>{formatCurrency(latest.balance)}</strong>
          <small>
            {previous
              ? `${delta >= 0 ? "+" : "-"}${formatCurrency(Math.abs(delta))} vs last month`
              : "Starting point"}
          </small>
        </div>
      </div>
      <div className="trend-chart">
        <svg
          className="trend-svg"
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label="Balance trend chart"
        >
          {guides.map((guide) => (
            <g key={guide.y}>
              <line
                x1={padding}
                y1={guide.y}
                x2={width - padding}
                y2={guide.y}
                className="chart-grid-line"
              />
              <text x="4" y={guide.y + 4} className="chart-grid-label">
                {guide.label}
              </text>
            </g>
          ))}
          <path d={areaPath} className="trend-area" />
          <path d={linePath} className="trend-line" pathLength="1" />
          {points.map((point) => (
            <g key={point.monthKey} className="trend-point-group">
              <circle cx={point.x} cy={point.y} r="5" className="trend-dot" />
              <circle cx={point.x} cy={point.y} r="10" className="trend-dot-ring" />
              <title>{`${point.label}: ${formatCurrency(point.balance)}`}</title>
              <text x={point.x} y={height - 6} className="chart-axis-label">
                {point.label}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </>
  );
}

export function BreakdownChart({ breakdown }) {
  if (!breakdown.length) {
    return (
      <div className="empty-chart">
        <p className="eyebrow">Waiting on data</p>
        <h3>No spending mix available</h3>
        <p>Expense categories will appear here once spending data is added.</p>
      </div>
    );
  }

  let start = 0;
  const stops = breakdown.map((item, index) => {
    const end = start + item.percent;
    const color = palette[index % palette.length];
    const segment = `${color} ${start.toFixed(1)}% ${end.toFixed(1)}%`;
    start = end;
    return segment;
  });

  return (
    <>
      <div className="chart-header">
        <div>
          <p className="eyebrow">Spending Breakdown</p>
          <h3>Where the money is going</h3>
        </div>
        <div className="chart-stat">
          <span>Top bucket</span>
          <strong>{breakdown[0].category}</strong>
          <small>{Math.round(breakdown[0].percent)}% of expenses</small>
        </div>
      </div>
      <div className="breakdown-layout">
        <div className="donut-shell">
          <div className="donut-chart" style={{ background: `conic-gradient(${stops.join(", ")})` }}>
            <div className="donut-hole">
              <span>Total spend</span>
              <strong>
                {formatCurrency(
                  Math.round(breakdown.reduce((sum, item) => sum + item.amount, 0))
                )}
              </strong>
            </div>
          </div>
        </div>
        <div className="legend-list">
          {breakdown.map((item, index) => (
            <div
              key={item.category}
              className="legend-item"
              style={{ "--legend-index": String(index) }}
            >
              <div className="legend-label">
                <span
                  className="legend-swatch"
                  style={{ background: palette[index % palette.length] }}
                />
                <div>
                  <strong>{item.category}</strong>
                  <small>{Math.round(item.percent)}% of expenses</small>
                  <div className="legend-meter">
                    <span
                      style={{
                        width: `${Math.max(12, Math.round(item.percent))}%`,
                        background: palette[index % palette.length],
                      }}
                    />
                  </div>
                </div>
              </div>
              <span>{formatCurrency(item.amount)}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

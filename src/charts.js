import { formatCurrency } from "./utils.js";

const palette = ["#0f766e", "#d97706", "#0f4c81", "#be123c", "#6d28d9", "#047857"];

export function renderTrendChart(data) {
  if (!data.length) {
    return renderEmptyChart(
      "No trend data available",
      "Add transactions to reveal the month-by-month balance curve."
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

  const areaPath = [
    linePath,
    `L ${points.at(-1).x.toFixed(1)} ${(height - padding).toFixed(1)}`,
    `L ${points[0].x.toFixed(1)} ${(height - padding).toFixed(1)}`,
    "Z",
  ].join(" ");

  const guides = [0, 0.5, 1].map((ratio) => {
    const y = padding + ratio * (height - padding * 2);
    const value = max - spread * ratio;
    return { y, label: formatCurrency(Math.round(value)) };
  });

  const latest = data.at(-1);
  const previous = data.at(-2);
  const delta = previous ? latest.balance - previous.balance : 0;

  return `
    <div class="chart-header">
      <div>
        <p class="eyebrow">Balance Trend</p>
        <h3>Closing balance over the last ${data.length} months</h3>
      </div>
      <div class="chart-stat">
        <span>Latest</span>
        <strong>${formatCurrency(latest.balance)}</strong>
        <small>${previous ? `${delta >= 0 ? "+" : "-"}${formatCurrency(Math.abs(delta))} vs last month` : "Starting point"}</small>
      </div>
    </div>
    <div class="trend-chart">
      <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Balance trend chart">
        ${guides
          .map(
            (guide) => `
              <line x1="${padding}" y1="${guide.y}" x2="${width - padding}" y2="${guide.y}" class="chart-grid-line"></line>
              <text x="4" y="${guide.y + 4}" class="chart-grid-label">${guide.label}</text>
            `
          )
          .join("")}
        <path d="${areaPath}" class="trend-area"></path>
        <path d="${linePath}" class="trend-line"></path>
        ${points
          .map(
            (point) => `
              <circle cx="${point.x}" cy="${point.y}" r="5" class="trend-dot"></circle>
              <text x="${point.x}" y="${height - 6}" class="chart-axis-label">${point.label}</text>
            `
          )
          .join("")}
      </svg>
    </div>
  `;
}

export function renderBreakdownChart(breakdown) {
  if (!breakdown.length) {
    return renderEmptyChart(
      "No spending mix available",
      "Expense categories will appear here once spending data is added."
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

  return `
    <div class="chart-header">
      <div>
        <p class="eyebrow">Spending Breakdown</p>
        <h3>Where the money is going</h3>
      </div>
      <div class="chart-stat">
        <span>Top bucket</span>
        <strong>${breakdown[0].category}</strong>
        <small>${Math.round(breakdown[0].percent)}% of expenses</small>
      </div>
    </div>
    <div class="breakdown-layout">
      <div class="donut-shell">
        <div class="donut-chart" style="background: conic-gradient(${stops.join(", ")});">
          <div class="donut-hole">
            <span>Total spend</span>
            <strong>${formatCurrency(
              Math.round(breakdown.reduce((sum, item) => sum + item.amount, 0))
            )}</strong>
          </div>
        </div>
      </div>
      <div class="legend-list">
        ${breakdown
          .map(
            (item, index) => `
              <div class="legend-item">
                <div class="legend-label">
                  <span class="legend-swatch" style="background:${palette[index % palette.length]};"></span>
                  <div>
                    <strong>${item.category}</strong>
                    <small>${Math.round(item.percent)}% of expenses</small>
                  </div>
                </div>
                <span>${formatCurrency(item.amount)}</span>
              </div>
            `
          )
          .join("")}
      </div>
    </div>
  `;
}

function renderEmptyChart(title, detail) {
  return `
    <div class="empty-chart">
      <p class="eyebrow">Waiting on data</p>
      <h3>${title}</h3>
      <p>${detail}</p>
    </div>
  `;
}

import React from "react";

interface Props {
  grid: number[][];
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const TIME_LABELS = ["06:00", "09:00", "12:00", "14:00", "17:00", "20:00"];

function getLevel(value: number, max: number): string {
  if (max === 0) return "l0";
  const ratio = value / max;
  if (ratio === 0) return "l0";
  if (ratio < 0.15) return "l1";
  if (ratio < 0.3) return "l2";
  if (ratio < 0.5) return "l3";
  if (ratio < 0.75) return "l4";
  return "l5";
}

export function ActivityHeatmap({ grid }: Props) {
  const maxVal = Math.max(...grid.flat(), 1);

  return (
    <div className="hotspot-card">
      <div className="chart-header">
        <div>
          <div className="chart-title">Activity Heatmap</div>
          <div className="chart-subtitle">Ping density by day and time slot</div>
        </div>
      </div>
      {/* Day headers: empty corner + 7 day columns */}
      <div className="heatmap-row heatmap-day-row">
        <div className="heatmap-time-label" />
        {DAY_LABELS.map((d) => (
          <div className="day-label" key={d}>{d}</div>
        ))}
      </div>
      {/* One row per time slot: label + 7 cells */}
      {grid.map((row, ri) => (
        <div className="heatmap-row" key={ri}>
          <div className="heatmap-time-label">{TIME_LABELS[ri]}</div>
          {row.map((val, ci) => (
            <div
              className={`heatmap-cell ${getLevel(val, maxVal)}`}
              key={ci}
              title={`${DAY_LABELS[ci]} ${TIME_LABELS[ri]}: ${val} pings`}
            />
          ))}
        </div>
      ))}
      <div className="heatmap-scale" style={{ justifyContent: "flex-end" }}>
        <span className="heatmap-scale-label">less</span>
        <div className="heatmap-scale-cells">
          {["rgba(29,158,117,0.05)", "rgba(29,158,117,0.15)", "rgba(29,158,117,0.3)", "rgba(29,158,117,0.5)", "rgba(29,158,117,0.75)", "#1D9E75"].map((bg, i) => (
            <div className="heatmap-scale-cell" style={{ background: bg }} key={i} />
          ))}
        </div>
        <span className="heatmap-scale-label">more</span>
      </div>
    </div>
  );
}

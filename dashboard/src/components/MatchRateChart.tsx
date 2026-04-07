import React from "react";
import { XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area, AreaChart } from "recharts";

interface Props {
  data: Array<{ hour: string; match_rate: number }>;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="custom-tooltip">
      <div className="tooltip-label">{label}</div>
      <div className="tooltip-row">
        <div className="tooltip-dot" style={{ background: "#1D9E75" }} />
        Rate: {Number(payload[0].value).toFixed(1)}%
      </div>
    </div>
  );
}

export function MatchRateChart({ data }: Props) {
  return (
    <div className="chart-card">
      <div className="chart-header">
        <div>
          <div className="chart-title">Match Success Rate</div>
          <div className="chart-subtitle">Percentage of pings that resulted in a match</div>
        </div>
        <div className="chart-legend">
          <div className="chart-legend-item">
            <div className="chart-legend-dot" style={{ background: "var(--accent)" }} />
            Rate %
          </div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ right: 20 }}>
          <defs>
            <linearGradient id="matchRateGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1D9E75" stopOpacity={0.15} />
              <stop offset="100%" stopColor="#1D9E75" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
          <XAxis
            dataKey="hour"
            interval={Math.max(0, Math.floor(data.length / 8) - 1)}
            tick={{ fontSize: 10, fill: "rgba(255,255,255,0.25)", fontFamily: "'Space Mono', monospace" }}
            axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
            tick={{ fontSize: 10, fill: "rgba(255,255,255,0.25)", fontFamily: "'Space Mono', monospace" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: "rgba(255,255,255,0.1)" }} />
          <Area
            type="monotone"
            dataKey="match_rate"
            stroke="#1D9E75"
            strokeWidth={2.5}
            fill="url(#matchRateGrad)"
            dot={false}
            activeDot={{ r: 4, fill: "#0e0e0e", stroke: "#1D9E75", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

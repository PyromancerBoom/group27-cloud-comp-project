import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

interface Props {
  data: Array<{ hour: string; ping_count: number; match_count: number }>;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="custom-tooltip">
      <div className="tooltip-label">{label}</div>
      {payload.map((p: any) => (
        <div className="tooltip-row" key={p.dataKey}>
          <div className="tooltip-dot" style={{ background: p.color }} />
          {p.name}: {p.value}
        </div>
      ))}
    </div>
  );
}

export function PingVolumeChart({ data }: Props) {
  return (
    <div className="chart-card">
      <div className="chart-header">
        <div>
          <div className="chart-title">Ping & Match Volume</div>
          <div className="chart-subtitle">Hourly breakdown</div>
        </div>
        <div className="chart-legend">
          <div className="chart-legend-item">
            <div className="chart-legend-dot" style={{ background: "var(--accent)" }} />
            Pings
          </div>
          <div className="chart-legend-item">
            <div className="chart-legend-dot" style={{ background: "var(--amber)" }} />
            Matches
          </div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} barGap={2} barSize={14} margin={{ right: 20 }}>
          <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
          <XAxis
            dataKey="hour"
            interval={Math.max(0, Math.floor(data.length / 8) - 1)}
            tick={{ fontSize: 10, fill: "rgba(255,255,255,0.25)", fontFamily: "'Space Mono', monospace" }}
            axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "rgba(255,255,255,0.25)", fontFamily: "'Space Mono', monospace" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
          <Bar dataKey="ping_count" fill="#1D9E75" name="Pings" radius={[4, 4, 0, 0]} />
          <Bar dataKey="match_count" fill="#EF9F27" name="Matches" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

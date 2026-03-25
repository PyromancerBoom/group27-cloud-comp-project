import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

interface Props {
  data: Array<{ hour: string; ping_count: number; match_count: number }>;
}

export function PingVolumeChart({ data }: Props) {
  return (
    <div>
      <h3>Ping & Match Volume (by hour)</h3>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
          <YAxis />
          <Tooltip />
          <Bar dataKey="ping_count" fill="#6366f1" name="Pings" />
          <Bar dataKey="match_count" fill="#22c55e" name="Matches" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

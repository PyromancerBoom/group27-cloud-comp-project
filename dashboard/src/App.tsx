import React, { useEffect, useState } from "react";
import { PingVolumeChart } from "./components/PingVolumeChart";
import { MatchRateChart } from "./components/MatchRateChart";
import { ActivityHeatmap } from "./components/ActivityHeatmap";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

function transformToChartData(items: any[]) {
  const byHour: Record<string, { ping_count: number; match_count: number }> = {};
  for (const item of items) {
    const hour = (item.sk as string).replace("HOUR#", "").slice(11, 16); // HH:00
    if (!byHour[hour]) byHour[hour] = { ping_count: 0, match_count: 0 };
    byHour[hour].ping_count += Number(item.ping_count ?? 0);
    byHour[hour].match_count += Number(item.match_count ?? 0);
  }
  return Object.entries(byHour)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([hour, v]) => ({ hour, ...v }));
}

function transformToMatchRate(chartData: ReturnType<typeof transformToChartData>) {
  return chartData.map((d) => ({
    hour: d.hour,
    match_rate: d.ping_count > 0 ? (d.match_count / d.ping_count) * 100 : 0,
  }));
}

function transformToHotspots(items: any[]) {
  return items.map((item) => {
    const [cell, activity_type] = (item.pk as string).split("#");
    const [lat, lon] = cell.split("_").map(Number);
    return { lat, lon, activity_type, count: Number(item.ping_count ?? 0) };
  });
}

export default function App() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/analytics/summary`)
      .then((r) => r.json())
      .then((d) => setItems(d.items ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const chartData = transformToChartData(items);
  const matchRateData = transformToMatchRate(chartData);
  const hotspots = transformToHotspots(items);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ color: "#6366f1" }}>Community Pulse</h1>
      <p style={{ color: "#888" }}>Need A Sidekick — Admin Analytics Dashboard</p>
      {loading ? (
        <p>Loading data...</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          <PingVolumeChart data={chartData} />
          <MatchRateChart data={matchRateData} />
          <ActivityHeatmap hotspots={hotspots} />
        </div>
      )}
    </div>
  );
}

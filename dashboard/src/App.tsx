import React, { useEffect, useMemo, useState } from "react";
import { StatCards } from "./components/StatCards";
import { PingVolumeChart } from "./components/PingVolumeChart";
import { MatchRateChart } from "./components/MatchRateChart";
import { ActivityBreakdown, ActivityRow } from "./components/ActivityBreakdown";
import { ActivityHeatmap } from "./components/ActivityHeatmap";
import { LiveFeed } from "./components/LiveFeed";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

type Period = "24h" | "7d" | "14d" | "30d";
const PERIODS: { key: Period; label: string; days: number }[] = [
  { key: "24h", label: "24h", days: 1 },
  { key: "7d",  label: "7d",  days: 7 },
  { key: "14d", label: "14d", days: 14 },
  { key: "30d", label: "30d", days: 30 },
];

function filterByPeriod(items: any[], period: Period): any[] {
  const now = new Date();
  const days = PERIODS.find((p) => p.key === period)!.days;
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().slice(0, 13);

  return items.filter((item) => {
    const dateStr = (item.sk as string).replace("HOUR#", "");
    return dateStr >= cutoffStr;
  });
}

function parseHourBucket(dateStr: string): Date | null {
  const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2})$/);
  if (!m) return null;
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4]));
}

function transformToChartData(items: any[]) {
  const byHour: Record<string, { ping_count: number; match_count: number }> = {};
  for (const item of items) {
    const hour = (item.sk as string).replace("HOUR#", "").slice(11, 13) + ":00";
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

function transformToActivityBreakdown(items: any[]): ActivityRow[] {
  const byActivity: Record<string, { ping_count: number; match_count: number }> = {};
  for (const item of items) {
    const parts = (item.pk as string).split("#");
    const activity_type = parts[1] ?? "unknown";
    if (!byActivity[activity_type]) byActivity[activity_type] = { ping_count: 0, match_count: 0 };
    byActivity[activity_type].ping_count += Number(item.ping_count ?? 0);
    byActivity[activity_type].match_count += Number(item.match_count ?? 0);
  }
  return Object.entries(byActivity)
    .map(([activity_type, v]) => ({
      activity_type,
      ...v,
      match_rate: v.ping_count > 0 ? (v.match_count / v.ping_count) * 100 : 0,
    }))
    .sort((a, b) => b.ping_count - a.ping_count);
}

function transformToHeatmapGrid(items: any[]): number[][] {
  const grid: number[][] = Array.from({ length: 6 }, () => Array(7).fill(0));
  const slotBounds = [6, 9, 12, 14, 17, 20];

  for (const item of items) {
    const dateStr = (item.sk as string).replace("HOUR#", "");
    const date = parseHourBucket(dateStr);
    if (!date) continue;
    const dayOfWeek = (date.getUTCDay() + 6) % 7; // Mon=0
    const hour = date.getUTCHours();

    let slotIdx = 0;
    for (let i = slotBounds.length - 1; i >= 0; i--) {
      if (hour >= slotBounds[i]) { slotIdx = i; break; }
    }

    grid[slotIdx][dayOfWeek] += Number(item.ping_count ?? 0);
  }

  return grid;
}

const ACTIVITY_DISPLAY: Record<string, string> = {
  gym_spotter: "Gym Spotter", table_tennis: "Table Tennis", board_game: "Board Games",
  badminton: "Badminton", chess: "Chess", running: "Jogging", other: "Activity Partner",
};

function formatRelativeTime(dateStr: string): string {
  const date = parseHourBucket(dateStr);
  if (!date) return "";
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function buildFeedItems(items: any[]) {
  const sorted = [...items]
    .filter((item) => item.sk && item.pk)
    .sort((a, b) => {
      const sa = (a.sk as string).replace("HOUR#", "");
      const sb = (b.sk as string).replace("HOUR#", "");
      return sb.localeCompare(sa);
    })
    .slice(0, 5);

  return sorted.map((item) => {
    const parts = (item.pk as string).split("#");
    const actKey = parts[1] ?? "other";
    const activity = ACTIVITY_DISPLAY[actKey] ?? actKey.replace(/_/g, " ");
    const matchCount = Number(item.match_count ?? 0);
    const pingCount = Number(item.ping_count ?? 0);
    const dateStr = (item.sk as string).replace("HOUR#", "");
    const time = formatRelativeTime(dateStr);

    if (matchCount > 0) {
      return { type: "match" as const, label: "Match formed", detail: `${activity} — ${matchCount} matches, ${pingCount} pings`, time };
    }
    return { type: "ping" as const, label: "New pings", detail: `${activity} — ${pingCount} pings`, time };
  });
}

function formatNow() {
  const d = new Date();
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${dd} ${months[d.getMonth()]} ${d.getFullYear()} · ${hh}:${mm} SGT`;
}

export default function App() {
  const [allItems, setAllItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("7d");

  useEffect(() => {
    fetch(`${API_URL}/analytics/summary`)
      .then((r) => r.json())
      .then((d) => setAllItems(d.items ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const items = useMemo(() => filterByPeriod(allItems, period), [allItems, period]);

  const chartData = transformToChartData(items);
  const matchRateData = transformToMatchRate(chartData);
  const activityData = transformToActivityBreakdown(items);
  const heatmapGrid = transformToHeatmapGrid(items);
  const feedItems = buildFeedItems(items);

  const totalPings = chartData.reduce((s, d) => s + d.ping_count, 0);
  const totalMatches = chartData.reduce((s, d) => s + d.match_count, 0);
  const matchRate = totalPings > 0 ? (totalMatches / totalPings) * 100 : 0;
  const peakHour = (() => {
    if (chartData.length === 0) return "—";
    const top = chartData.reduce((a, b) => (b.ping_count > a.ping_count ? b : a));
    if (top.ping_count === 0) return "—";
    const h = parseInt(top.hour.slice(0, 2), 10);
    if (h === 0) return "12am";
    if (h === 12) return "12pm";
    return h < 12 ? `${h}am` : `${h - 12}pm`;
  })();

  return (
    <>
      {/* ── NAV ── */}
      <div className="nav-outer">
        <nav className="nav">
          <div className="nav-logo">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <circle cx="9" cy="7" r="3.5" fill="#1D9E75" />
              <path d="M2 19c0-3.314 3.134-6 7-6s7 2.686 7 6" stroke="#1D9E75" strokeWidth="2" strokeLinecap="round" fill="none" />
              <circle cx="17" cy="7" r="2.8" fill="#1D9E75" opacity="0.55" />
              <path d="M17 13c2.761 0 5 2.019 5 4.5" stroke="#1D9E75" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.55" />
            </svg>
            need a <span>sidekick</span>
            <span className="nav-badge">admin</span>
          </div>
          <div className="nav-right">
            <div className="nav-status">
              <div className="nav-status-dot" />
              system healthy
            </div>
            <div className="nav-time">{formatNow()}</div>
          </div>
        </nav>
      </div>

      {/* ── DASHBOARD CONTENT ── */}
      <div className="dashboard">
        {/* HEADER */}
        <div className="dash-header">
          <div>
            <div className="dash-label">analytics</div>
            <h1 className="dash-title">community <span>pulse</span></h1>
            <p className="dash-subtitle">Real-time activity metrics and engagement insights</p>
          </div>
          <div className="period-toggle">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                className={`period-btn${period === p.key ? " active" : ""}`}
                onClick={() => setPeriod(p.key)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="loading-state">Loading data...</div>
        ) : (
          <>
            {/* STAT CARDS */}
            <StatCards
              totalPings={totalPings}
              totalMatches={totalMatches}
              matchRate={matchRate}
              peakHour={peakHour}
            />

            {/* PING VOLUME (full width) */}
            <div style={{ marginBottom: 16 }}>
              <PingVolumeChart data={chartData} />
            </div>

            {/* HEATMAP + ACTIVITY BREAKDOWN */}
            <div className="charts-row">
              <ActivityHeatmap grid={heatmapGrid} />
              <ActivityBreakdown data={activityData} />
            </div>

            {/* MATCH RATE + LIVE FEED */}
            <div className="bottom-row">
              <MatchRateChart data={matchRateData} />
              <LiveFeed items={feedItems} />
            </div>
          </>
        )}
      </div>

      {/* ── FOOTER ── */}
      <footer className="footer">
        <div className="footer-logo">need a <span>sidekick</span></div>
        <div className="footer-note">CS5224 · Cloud Computing · Group 27 · NUS 2026</div>
      </footer>
    </>
  );
}

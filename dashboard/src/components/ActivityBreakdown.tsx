import React from "react";

export interface ActivityRow {
  activity_type: string;
  ping_count: number;
  match_count: number;
  match_rate: number;
}

interface Props {
  data: ActivityRow[];
}

const ACTIVITY_META: Record<string, { label: string; category: string; color: "g" | "a" | "p" | "r"; emoji: string }> = {
  gym_spotter:  { label: "Gym Spotter",     category: "fitness", color: "g", emoji: "\u{1F3CB}\u{FE0F}" },
  running:      { label: "Jogging Partner",  category: "fitness", color: "g", emoji: "\u{1F3C3}" },
  table_tennis: { label: "Table Tennis",     category: "sports",  color: "a", emoji: "\u{1F3D3}" },
  board_game:   { label: "Board Game",       category: "games",   color: "p", emoji: "\u{1F3B2}" },
  chess:        { label: "Chess",            category: "games",   color: "p", emoji: "\u{265F}\u{FE0F}" },
  badminton:    { label: "Badminton",        category: "sports",  color: "r", emoji: "\u{1F3F8}" },
  other:        { label: "Activity Partner", category: "other",   color: "a", emoji: "\u{26A1}" },
};

function getMeta(type: string) {
  return ACTIVITY_META[type] ?? { label: type.replace(/_/g, " "), category: "other", color: "a" as const, emoji: "\u{26A1}" };
}

export function ActivityBreakdown({ data }: Props) {
  const maxPings = Math.max(...data.map((d) => d.ping_count), 1);

  return (
    <div className="table-card">
      <div className="chart-header">
        <div>
          <div className="chart-title">Activity Breakdown</div>
          <div className="chart-subtitle">Most pinged activities</div>
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Activity</th>
              <th>Pings</th>
              <th>Match Rate</th>
              <th>Volume</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: "center", color: "var(--text-dim)" }}>
                  No activity data available
                </td>
              </tr>
            ) : (
              data.map((row) => {
                const meta = getMeta(row.activity_type);
                const volumePct = (row.ping_count / maxPings) * 100;
                return (
                  <tr key={row.activity_type}>
                    <td>
                      <div className="table-activity">
                        <div className={`table-ico ${meta.color}`}>{meta.emoji}</div>
                        <div>
                          <div className="table-activity-name">{meta.label}</div>
                          <div className="table-activity-meta">{meta.category}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontWeight: 700, color: "#fff" }}>{row.ping_count}</td>
                    <td>{row.match_rate.toFixed(1)}%</td>
                    <td>
                      <div className="bar-meter">
                        <div
                          className={`bar-meter-fill ${meta.color}`}
                          style={{ width: `${volumePct}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

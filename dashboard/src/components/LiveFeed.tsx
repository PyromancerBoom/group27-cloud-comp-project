import React from "react";

interface FeedEntry {
  type: "ping" | "match" | "expire";
  label: string;
  detail: string;
  time: string;
}

interface Props {
  items: FeedEntry[];
}

const DEMO_ITEMS: FeedEntry[] = [
  { type: "match", label: "Match formed", detail: "Table Tennis — 3 matches, 8 pings", time: "2m ago" },
  { type: "ping",  label: "New pings",    detail: "Badminton — 5 pings",             time: "6m ago" },
  { type: "match", label: "Match formed", detail: "Board Games — 2 matches, 4 pings", time: "11m ago" },
  { type: "ping",  label: "New pings",    detail: "Jogging — 7 pings",               time: "18m ago" },
  { type: "ping",  label: "New pings",    detail: "Chess — 3 pings",                 time: "27m ago" },
];

export function LiveFeed({ items }: Props) {
  const displayItems = items.length === 0 ? DEMO_ITEMS : items;
  return (
    <div className="hotspot-card">
      <div className="chart-header" style={{ marginBottom: 16 }}>
        <div>
          <div className="chart-title">Live Feed</div>
          <div className="chart-subtitle">Recent platform activity</div>
        </div>
        <div className="nav-status" style={{ fontSize: 10, padding: "4px 10px" }}>
          <div className="nav-status-dot" style={{ width: 5, height: 5 }} />
          live
        </div>
      </div>
      <div className="feed-list">
        {displayItems.map((entry, i) => (
          <div className="feed-item" key={i}>
            <div className={`feed-dot ${entry.type}`} />
            <div className="feed-text">
              <strong>{entry.label}</strong> &mdash; {entry.detail}
            </div>
            <div className="feed-time">{entry.time}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

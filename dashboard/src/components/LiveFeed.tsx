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

export function LiveFeed({ items }: Props) {
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
        {items.length === 0 ? (
          <div className="feed-empty">No recent activity</div>
        ) : items.map((entry, i) => (
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

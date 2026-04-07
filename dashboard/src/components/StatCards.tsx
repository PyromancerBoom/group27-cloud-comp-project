import React from "react";

interface Props {
  totalPings: number;
  totalMatches: number;
  matchRate: number;
  activeHours: number;
}

export function StatCards({ totalPings, totalMatches, matchRate, activeHours }: Props) {
  return (
    <div className="stats-grid">
      <div className="stat-card">
        <div className="stat-card-header">
          <span className="stat-card-label">Total Pings</span>
          <div className="stat-card-icon g">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="3" fill="#9FE1CB" />
              <circle cx="12" cy="12" r="7" stroke="#9FE1CB" strokeWidth="1.5" fill="none" />
            </svg>
          </div>
        </div>
        <div className="stat-card-value">{totalPings.toLocaleString()}</div>
        <div className="stat-card-footer">
          <span className="stat-period">in selected period</span>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-card-header">
          <span className="stat-card-label">Matches Made</span>
          <div className="stat-card-icon a">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M5 12h14M12 5l7 7-7 7" stroke="#FAC775" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
        <div className="stat-card-value">{totalMatches.toLocaleString()}</div>
        <div className="stat-card-footer">
          <span className="stat-period">in selected period</span>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-card-header">
          <span className="stat-card-label">Match Rate</span>
          <div className="stat-card-icon p">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M9 12l2 2 4-4" stroke="#CECBF6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="12" cy="12" r="8" stroke="#CECBF6" strokeWidth="1.5" fill="none" />
            </svg>
          </div>
        </div>
        <div className="stat-card-value">{matchRate.toFixed(1)}%</div>
        <div className="stat-card-footer">
          <span className="stat-period">overall</span>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-card-header">
          <span className="stat-card-label">Active Hours</span>
          <div className="stat-card-icon g">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="8" stroke="#9FE1CB" strokeWidth="1.5" fill="none" />
              <path d="M12 8v4l3 2" stroke="#9FE1CB" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
        </div>
        <div className="stat-card-value">
          {activeHours}<span className="unit">h</span>
        </div>
        <div className="stat-card-footer">
          <span className="stat-period">with activity</span>
        </div>
      </div>
    </div>
  );
}

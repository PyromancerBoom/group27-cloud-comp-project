import React, { useState } from "react";
import { postPing } from "../api/client";

const ACTIVITY_TYPES = [
  { value: "gym_spotter",   label: "Gym Spotter" },
  { value: "table_tennis",  label: "Table Tennis" },
  { value: "board_game",    label: "Board Game" },
  { value: "badminton",     label: "Badminton" },
  { value: "chess",         label: "Chess" },
  { value: "running",       label: "Running / Jogging" },
  { value: "other",         label: "Other" },
];

interface Props {
  userId: string;
  coords: { lat: number; lon: number } | null;
  onPingCreated: (result: any) => void;
  onClose: () => void;
}

export function PingForm({ userId, coords, onPingCreated, onClose }: Props) {
  const [activity, setActivity] = useState(ACTIVITY_TYPES[0].value);
  const [message, setMessage] = useState("");
  const [radius, setRadius] = useState(10);
  const [capacity, setCapacity] = useState(2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coords || loading) return;
    setLoading(true);
    setError(null);
    try {
      const result = await postPing({
        user_id: userId,
        activity_type: activity,
        location: coords,
        message,
        radius_meters: radius,
        capacity,
      });
      onPingCreated(result);
    } catch {
      setError("Could not reach the server — is Docker running?");
    } finally {
      setLoading(false);
    }
  };

  const locStatus = coords ? "ready" : "locating";

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-card">
        <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        <div className="modal-title">Post a Ping</div>

        <div style={{ marginBottom: 20 }}>
          <div className="hero-pill" style={{ display: "inline-flex" }}>
            <div className={`hero-pill-dot ${locStatus}`}></div>
            <span className={`hero-pill-text ${locStatus}`}>
              {coords ? "location ready" : "locating you..."}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Activity</label>
            <select className="form-select" value={activity} onChange={(e) => setActivity(e.target.value)}>
              {ACTIVITY_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Message (optional)</label>
            <input
              className="form-input"
              placeholder="e.g. Need a spotter for squat rack"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={120}
            />
          </div>

          <div className="form-group">
            <div className="form-range-label">
              <label className="form-label">Search Radius</label>
              <span className="form-range-val">{radius}m</span>
            </div>
            <input
              type="range" className="form-range"
              min={5} max={10} value={radius}
              onChange={(e) => setRadius(+e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">People Needed</label>
            <select className="form-select" value={capacity} onChange={(e) => setCapacity(+e.target.value)}>
              {[2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>{n} people</option>
              ))}
            </select>
          </div>

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className="form-submit" disabled={loading || !coords}>
            {loading ? "Finding sidekick..." : !coords ? "Waiting for location..." : "Post Ping →"}
          </button>
        </form>
      </div>
    </div>
  );
}

import React, { useState } from "react";
import { postPing } from "../api/client";

const ACTIVITY_TYPES = [
  "gym_spotter", "table_tennis", "board_game", "badminton", "chess", "running", "other",
];

interface Props {
  userId: string;
  coords: { lat: number; lon: number } | null;
  onPingCreated: (result: any) => void;
}

export function PingForm({ userId, coords, onPingCreated }: Props) {
  const [activity, setActivity] = useState(ACTIVITY_TYPES[0]);
  const [message, setMessage] = useState("");
  const [radius, setRadius] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coords) { setError("Waiting for location..."); return; }
    setLoading(true);
    setError(null);
    try {
      const result = await postPing({
        user_id: userId,
        activity_type: activity,
        location: coords,
        message,
        radius_meters: radius,
      });
      onPingCreated(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <h2>Post a Ping</h2>
      <select value={activity} onChange={(e) => setActivity(e.target.value)}>
        {ACTIVITY_TYPES.map((t) => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
      </select>
      <input
        placeholder="Optional message..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        maxLength={120}
      />
      <label>
        Radius: {radius}m
        <input type="range" min={5} max={100} value={radius} onChange={(e) => setRadius(+e.target.value)} />
      </label>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <button type="submit" disabled={loading || !coords}>
        {loading ? "Finding sidekick..." : "Find a Sidekick"}
      </button>
    </form>
  );
}

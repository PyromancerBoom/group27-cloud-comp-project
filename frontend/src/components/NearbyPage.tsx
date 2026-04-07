import React, { useState, useEffect, useCallback } from "react";
import { getNearbyPings } from "../api/client";

const ACTIVITY_FILTERS = [
  { value: "all",          label: "all" },
  { value: "gym_spotter",  label: "gym" },
  { value: "table_tennis", label: "tennis" },
  { value: "board_game",   label: "board game" },
  { value: "badminton",    label: "badminton" },
  { value: "chess",        label: "chess" },
  { value: "running",      label: "running" },
  { value: "other",        label: "other" },
];

const ACTIVITY_LABELS: Record<string, string> = {
  gym_spotter:  "Gym Spotter",
  table_tennis: "Table Tennis",
  board_game:   "Board Game",
  badminton:    "Badminton",
  chess:        "Chess",
  running:      "Jogging Partner",
  other:        "Activity Partner",
};

const ACTIVITY_COLOR: Record<string, "g" | "a" | "p" | "r"> = {
  gym_spotter:  "g",
  running:      "g",
  table_tennis: "a",
  other:        "a",
  board_game:   "p",
  chess:        "p",
  badminton:    "r",
};

const ACTIVITY_ICON: Record<string, string> = {
  gym_spotter:  "🏋️",
  table_tennis: "🏓",
  board_game:   "🎲",
  badminton:    "🏸",
  chess:        "♟️",
  running:      "🏃",
  other:        "⚡",
};

function CountdownTimer({ expiresAt }: { expiresAt: string }) {
  const calc = () => {
    const diff = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
    const m = Math.floor(diff / 60);
    const s = diff % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };
  const [t, setT] = useState(calc);
  useEffect(() => {
    const id = setInterval(() => setT(calc()), 1000);
    return () => clearInterval(id);
  }, [expiresAt]);
  return <>{t}</>;
}

interface Props {
  coords: { lat: number; lon: number } | null;
  currentUserId: string;
  activeLobbyId: string | null;
  onBack: () => void;
  onPingClick: (lobbyId: string) => void;
  onDelete: (lobbyId: string) => void;
  onOpenPingForm: () => void;
}

export function NearbyPage({ coords, currentUserId, activeLobbyId, onBack, onPingClick, onDelete, onOpenPingForm }: Props) {
  const [lobbies, setLobbies] = useState<any[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    if (!coords) return;
    setLoading(true);
    try {
      const data = await getNearbyPings(coords.lat, coords.lon, 100);
      setLobbies(data.lobbies ?? []);
      setLastRefresh(new Date());
    } catch {}
    finally { setLoading(false); }
  }, [coords]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 15000);
    return () => clearInterval(id);
  }, [refresh]);

  const filtered = (filter === "all" ? lobbies : lobbies.filter((l) => l.activity_type === filter))
    .filter((l) => {
      const isFull = parseInt(l.current) >= parseInt(l.capacity);
      const isMember = l.creator_id === currentUserId || activeLobbyId === l.lobby_id;
      return !isFull || isMember;
    });

  const locText = coords
    ? `${filtered.length} ping${filtered.length !== 1 ? "s" : ""} nearby`
    : "waiting for location...";

  return (
    <div className="nearby-page">
      <button className="nearby-back" onClick={onBack}>
        ← back to home
      </button>

      <div className="nearby-header">
        <div className="section-label">live · updating every 15s</div>
        <h1 className="nearby-title">Nearby Pings</h1>
        <div className="nearby-sub">{locText}</div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        <div className="filter-chips">
          {ACTIVITY_FILTERS.map((f) => (
            <button
              key={f.value}
              className={`filter-chip${filter === f.value ? " active" : ""}`}
              onClick={() => setFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button className="nearby-refresh" onClick={refresh} disabled={loading}>
          {loading ? "refreshing..." : `↻ refresh${lastRefresh ? ` · ${lastRefresh.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}`}
        </button>
      </div>

      <div className="nearby-list">
        {filtered.length === 0 ? (
          <div className="nearby-empty">
            {!coords
              ? "Waiting for your location...\nAllow location access to see nearby pings."
              : filter === "all"
              ? "No pings nearby right now.\nPost one and be the first!"
              : `No ${ACTIVITY_LABELS[filter] ?? filter} pings nearby.\nTry a different filter or post your own.`}
          </div>
        ) : (
          filtered.map((lobby) => {
            const color = ACTIVITY_COLOR[lobby.activity_type] ?? "g";
            const label = ACTIVITY_LABELS[lobby.activity_type] ?? lobby.activity_type.replace(/_/g, " ");
            const dist = !lobby.distance_meters || lobby.distance_meters < 1
              ? "nearby"
              : `~${Math.round(lobby.distance_meters)}m away`;

            return (
              <div
                className="nearby-card clickable"
                key={lobby.lobby_id}
                onClick={() => onPingClick(lobby.lobby_id)}
                style={{ cursor: "pointer" }}
              >
                <div className={`nearby-card-ico ${color}`}>
                  {ACTIVITY_ICON[lobby.activity_type] ?? "⚡"}
                </div>
                <div className="nearby-card-body">
                  <div className="nearby-card-title">
                    {lobby.message || label}
                  </div>
                  <div className="nearby-card-meta">
                    {label} · {dist} · {lobby.current}/{lobby.capacity} joined
                  </div>
                </div>
                <div className="nearby-card-right">
                  <div className="nearby-card-timer">
                    <CountdownTimer expiresAt={lobby.expires_at} />
                  </div>
                  {lobby.creator_id === currentUserId && (
                    <button
                      className="ping-delete-btn"
                      onClick={(e) => { e.stopPropagation(); onDelete(lobby.lobby_id); }}
                      title="Delete ping"
                    >✕</button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="nearby-post-cta">
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-dim)", marginBottom: 16 }}>
          don't see what you need?
        </p>
        <button className="btn-primary" onClick={onOpenPingForm}>
          post a ping →
        </button>
      </div>
    </div>
  );
}

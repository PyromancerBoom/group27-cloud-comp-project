import React, { useState, useEffect } from "react";

interface Lobby {
  lobby_id: string;
  activity_type: string;
  message: string;
  current: number;
  capacity: number;
  distance_meters: number;
  expires_at: string;
  creator_id?: string;
}

interface Props {
  lobbies: Lobby[];
  currentUserId: string;
  onJoin: (lobbyId: string) => Promise<void>;
  onEnterChat: (lobbyId: string) => void;
  onOpenPingForm: () => void;
}

const ACTIVITY_LABELS: Record<string, string> = {
  gym_spotter:  "gym spotter",
  table_tennis: "table tennis",
  board_game:   "board game",
  badminton:    "badminton",
  chess:        "chess",
  running:      "jogging partner",
  other:        "activity partner",
};

// Color category per activity
const ACTIVITY_COLOR: Record<string, "g" | "a" | "p" | "r"> = {
  gym_spotter:  "g",
  running:      "g",
  table_tennis: "a",
  other:        "a",
  board_game:   "p",
  chess:        "p",
  badminton:    "r",
};

function ActivityIcon({ type, color }: { type: string; color: string }) {
  if (type === "gym_spotter") return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="10" width="18" height="4" rx="2" fill="#1D9E75" opacity="0.4"/>
      <rect x="2" y="8" width="4" height="8" rx="2" fill="#1D9E75"/>
      <rect x="18" y="8" width="4" height="8" rx="2" fill="#1D9E75"/>
    </svg>
  );
  if (type === "table_tennis") return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="6" fill="#EF9F27" opacity="0.3"/>
      <circle cx="12" cy="12" r="3" fill="#FAC775"/>
    </svg>
  );
  if (type === "board_game" || type === "chess") return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <rect x="4" y="4" width="7" height="7" rx="1.5" fill="#7F77DD" opacity="0.5"/>
      <rect x="13" y="4" width="7" height="7" rx="1.5" fill="#7F77DD" opacity="0.5"/>
      <rect x="4" y="13" width="7" height="7" rx="1.5" fill="#7F77DD" opacity="0.5"/>
      <rect x="13" y="13" width="7" height="7" rx="1.5" fill="#7F77DD"/>
    </svg>
  );
  if (type === "badminton") return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M12 4l2 6h6l-5 4 2 6-5-4-5 4 2-6-5-4h6z" fill="#E24B4A" opacity="0.5"/>
    </svg>
  );
  // running / other
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <circle cx="9" cy="9" r="4" stroke="#1D9E75" strokeWidth="1.5" fill="none"/>
      <path d="M15 21c0-3.314-2.686-6-6-6s-6 2.686-6 6" stroke="#1D9E75" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      <path d="M19 8v6M22 11h-6" stroke="#9FE1CB" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function CountdownTimer({ expiresAt }: { expiresAt: string }) {
  const calcRemaining = () => {
    const diff = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
    const m = Math.floor(diff / 60);
    const s = diff % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };
  const [time, setTime] = useState(calcRemaining);
  useEffect(() => {
    const id = setInterval(() => setTime(calcRemaining()), 1000);
    return () => clearInterval(id);
  }, [expiresAt]);
  return <>{time}</>;
}

export function LobbyList({ lobbies, currentUserId, onJoin, onEnterChat, onOpenPingForm }: Props) {
  const [joining, setJoining] = useState<string | null>(null);

  const handleJoin = async (lobbyId: string) => {
    setJoining(lobbyId);
    try { await onJoin(lobbyId); } finally { setJoining(null); }
  };

  const livePingCount = lobbies.length;

  return (
    <div className="map-sidebar">
      <div className="sidebar-label">active pings</div>

      {lobbies.length === 0 ? (
        <div className="sidebar-empty">
          No pings nearby yet.<br />Be the first to post one.
        </div>
      ) : (
        lobbies.map((lobby) => {
          const color = ACTIVITY_COLOR[lobby.activity_type] ?? "g";
          const label = ACTIVITY_LABELS[lobby.activity_type] ?? lobby.activity_type;
          const isMine = lobby.creator_id === currentUserId;
          const isFull = lobby.current >= lobby.capacity;
          const dist = lobby.distance_meters < 1 ? "nearby" : `~${Math.round(lobby.distance_meters)}m away`;

          return (
            <div className="ping-row" key={lobby.lobby_id}>
              <div className={`ping-ico ${color}`}>
                <ActivityIcon type={lobby.activity_type} color={color} />
              </div>
              <div className="ping-info">
                <div className="ping-title">
                  {lobby.message ? lobby.message : label}
                </div>
                <div className="ping-meta">
                  {dist} · {lobby.current}/{lobby.capacity} joined
                </div>
              </div>
              {isMine ? (
                <button
                  className={`ping-timer ${color}`}
                  style={{ cursor: "pointer", background: "none", border: "none", padding: 0 }}
                  onClick={() => onEnterChat(lobby.lobby_id)}
                  title="open chat"
                >
                  <CountdownTimer expiresAt={lobby.expires_at} />
                </button>
              ) : (
                <button
                  className="ping-join-btn"
                  onClick={() => handleJoin(lobby.lobby_id)}
                  disabled={isFull || joining === lobby.lobby_id}
                >
                  {joining === lobby.lobby_id ? "..." : isFull ? "full" : "join"}
                </button>
              )}
            </div>
          );
        })
      )}

      <button className="ping-post-btn" onClick={onOpenPingForm}>
        + post a ping
      </button>
    </div>
  );
}

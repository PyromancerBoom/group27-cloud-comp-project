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
  activeLobbyId: string | null;
  onPingClick: (lobbyId: string) => void;
  onDelete: (lobbyId: string) => void;
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

export function LobbyList({ lobbies, currentUserId, activeLobbyId, onPingClick, onDelete, onOpenPingForm }: Props) {
  const visible = lobbies.filter((l) => {
    const isFull = l.current >= l.capacity;
    const isMember = l.creator_id === currentUserId || activeLobbyId === l.lobby_id;
    return !isFull || isMember;
  });

  return (
    <div className="map-sidebar">
      <div className="sidebar-label">active pings</div>

      {visible.length === 0 ? (
        <div className="sidebar-empty">
          No pings nearby yet.<br />Be the first to post one.
        </div>
      ) : (
        visible.map((lobby) => {
          const color = ACTIVITY_COLOR[lobby.activity_type] ?? "g";
          const label = ACTIVITY_LABELS[lobby.activity_type] ?? lobby.activity_type;
          const dist = lobby.distance_meters < 1 ? "nearby" : `~${Math.round(lobby.distance_meters)}m away`;

          return (
            <div
              className="ping-row"
              key={lobby.lobby_id}
              onClick={() => onPingClick(lobby.lobby_id)}
              style={{ cursor: "pointer" }}
            >
              <div className={`ping-ico ${color}`}>
                {ACTIVITY_ICON[lobby.activity_type] ?? "⚡"}
              </div>
              <div className="ping-info">
                <div className="ping-title">
                  {lobby.message ? lobby.message : label}
                </div>
                <div className="ping-meta">
                  {dist} · {lobby.current}/{lobby.capacity} joined
                </div>
              </div>
              <div className={`ping-timer ${color}`}>
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
          );
        })
      )}

      <button className="ping-post-btn" onClick={onOpenPingForm}>
        + post a ping
      </button>
    </div>
  );
}

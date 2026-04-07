import React, { useState } from "react";
import { joinLobby } from "../api/client";

const ACTIVITY_LABELS: Record<string, string> = {
  gym_spotter:  "Gym Spotter",
  table_tennis: "Table Tennis",
  board_game:   "Board Game",
  badminton:    "Badminton",
  chess:        "Chess",
  running:      "Jogging Partner",
  other:        "Activity Partner",
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

const ACTIVITY_COLOR: Record<string, string> = {
  gym_spotter:  "g",
  running:      "g",
  table_tennis: "a",
  other:        "a",
  board_game:   "p",
  chess:        "p",
  badminton:    "r",
};

interface Props {
  lobby: any;
  currentUserId: string;
  onJoinSuccess: (lobbyId: string, result: any) => void;
  onClose: () => void;
}

export function PingDetailModal({ lobby, currentUserId, onJoinSuccess, onClose }: Props) {
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isFull = parseInt(lobby.current) >= parseInt(lobby.capacity);
  const label = ACTIVITY_LABELS[lobby.activity_type] ?? lobby.activity_type.replace(/_/g, " ");
  const icon = ACTIVITY_ICON[lobby.activity_type] ?? "⚡";
  const color = ACTIVITY_COLOR[lobby.activity_type] ?? "g";
  const dist = !lobby.distance_meters || parseFloat(lobby.distance_meters) < 1
    ? "nearby"
    : `~${Math.round(parseFloat(lobby.distance_meters))}m away`;

  const handleJoin = async () => {
    setJoining(true);
    setError(null);
    try {
      const result = await joinLobby(lobby.lobby_id, currentUserId);
      onJoinSuccess(lobby.lobby_id, result);
    } catch (e: any) {
      const msg = e?.message ?? "";
      if (msg.includes("full")) {
        setError("This ping is now full.");
      } else {
        setError("Could not join. Try again.");
      }
      setJoining(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card ping-detail-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>

        <div className="ping-detail-header">
          <div className={`ping-detail-ico ${color}`}>{icon}</div>
          <div>
            <div className="ping-detail-title">{lobby.message || label}</div>
            <div className="ping-detail-meta">
              {label} · {dist} · {lobby.current}/{lobby.capacity} joined
            </div>
          </div>
        </div>

        <div className="ping-detail-actions">
          {isFull ? (
            <div className="ping-detail-notice">this ping is full</div>
          ) : (
            <button className="btn-primary" onClick={handleJoin} disabled={joining}>
              {joining ? "joining..." : "join →"}
            </button>
          )}
          {error && <div className="ping-detail-error">{error}</div>}
        </div>
      </div>
    </div>
  );
}

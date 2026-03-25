import React from "react";

interface Props {
  lobbyId: string;
  activityType: string;
  members: string[];
  onAccept: () => void;
  onDecline: () => void;
}

export function ReadyCheck({ lobbyId, activityType, members, onAccept, onDecline }: Props) {
  return (
    <div style={{ background: "#6366f1", color: "#fff", borderRadius: 12, padding: 20, textAlign: "center" }}>
      <h2>Match Found!</h2>
      <p>Activity: <strong>{activityType.replace("_", " ")}</strong></p>
      <p>{members.length} sidekick(s) nearby</p>
      <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 16 }}>
        <button onClick={onAccept} style={{ background: "#fff", color: "#6366f1", padding: "10px 24px", borderRadius: 8, border: "none", fontWeight: 700 }}>
          Ready!
        </button>
        <button onClick={onDecline} style={{ background: "transparent", color: "#fff", padding: "10px 24px", borderRadius: 8, border: "1px solid #fff" }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

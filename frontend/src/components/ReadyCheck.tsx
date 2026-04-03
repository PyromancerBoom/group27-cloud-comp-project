import React from "react";

const ACTIVITY_LABELS: Record<string, string> = {
  gym_spotter:  "Gym Spotter",
  table_tennis: "Table Tennis",
  board_game:   "Board Game",
  badminton:    "Badminton",
  chess:        "Chess",
  running:      "Running / Jogging",
  other:        "Activity Partner",
};

interface Props {
  lobbyId: string;
  activityType: string;
  members: string[];
  onAccept: () => void;
  onDecline: () => void;
}

export function ReadyCheck({ lobbyId, activityType, members, onAccept, onDecline }: Props) {
  const label = ACTIVITY_LABELS[activityType] ?? activityType.replace(/_/g, " ");
  const partnerCount = members.length - 1;

  return (
    <div className="modal-overlay">
      <div className="modal-card ready-check">
        <div className="ready-activity-badge">{label}</div>
        <div className="ready-h">Match Found!</div>
        <div className="ready-sub">
          {partnerCount > 0
            ? `${partnerCount} sidekick${partnerCount > 1 ? "s" : ""} nearby and ready.`
            : "A sidekick is nearby and ready."}
          <br />Confirm to connect and find each other.
        </div>
        <div className="ready-btns">
          <button className="ready-accept" onClick={onAccept}>Ready!</button>
          <button className="ready-decline" onClick={onDecline}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

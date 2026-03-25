import React from "react";

interface Lobby {
  lobby_id: string;
  activity_type: string;
  message: string;
  current: number;
  capacity: number;
  distance_meters: number;
}

interface Props {
  lobbies: Lobby[];
}

export function LobbyList({ lobbies }: Props) {
  if (lobbies.length === 0) return <p>No nearby sidekicks yet.</p>;

  return (
    <ul style={{ listStyle: "none", padding: 0 }}>
      {lobbies.map((l) => (
        <li key={l.lobby_id} style={{ border: "1px solid #ccc", borderRadius: 8, padding: 12, marginBottom: 8 }}>
          <strong>{l.activity_type.replace("_", " ")}</strong>
          {l.message && <p style={{ margin: "4px 0" }}>{l.message}</p>}
          <small>{l.current}/{l.capacity} people · {l.distance_meters}m away</small>
        </li>
      ))}
    </ul>
  );
}

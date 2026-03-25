import React, { useState, useEffect, useCallback } from "react";
import { PingForm } from "./components/PingForm";
import { LobbyList } from "./components/LobbyList";
import { ReadyCheck } from "./components/ReadyCheck";
import { useGeolocation } from "./hooks/useGeolocation";
import { useWebSocket } from "./hooks/useWebSocket";
import { getNearbyPings } from "./api/client";

// Persist a simple anonymous user ID per browser
const USER_ID = (() => {
  const key = "nas_user_id";
  let id = localStorage.getItem(key);
  if (!id) { id = crypto.randomUUID(); localStorage.setItem(key, id); }
  return id;
})();

export default function App() {
  const { coords, error: geoError } = useGeolocation();
  const [lobbies, setLobbies] = useState<any[]>([]);
  const [matchEvent, setMatchEvent] = useState<any>(null);
  const [activeLobbyId, setActiveLobbyId] = useState<string | null>(null);

  const handleWsMessage = useCallback((msg: any) => {
    if (msg.type === "match_formed") setMatchEvent(msg.payload);
    if (msg.type === "lobby_update") setLobbies((prev) => [...prev]);
  }, []);

  const { send } = useWebSocket(USER_ID, handleWsMessage);

  // Poll nearby lobbies when location is available
  useEffect(() => {
    if (!coords) return;
    const refresh = async () => {
      try {
        const data = await getNearbyPings(coords.lat, coords.lon);
        setLobbies(data.lobbies ?? []);
      } catch {}
    };
    refresh();
    const interval = setInterval(refresh, 15000);
    return () => clearInterval(interval);
  }, [coords]);

  const handlePingCreated = (result: any) => {
    setActiveLobbyId(result.lobby_id);
    send({ type: "subscribe_lobby", lobby_id: result.lobby_id });
  };

  const handleReadyAccept = () => {
    if (activeLobbyId) send({ type: "ready_check_response", lobby_id: activeLobbyId, accepted: true });
    setMatchEvent(null);
  };

  const handleReadyDecline = () => {
    if (activeLobbyId) send({ type: "ready_check_response", lobby_id: activeLobbyId, accepted: false });
    setMatchEvent(null);
    setActiveLobbyId(null);
  };

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: 16, fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ color: "#6366f1" }}>Need A Sidekick</h1>
      {geoError && <p style={{ color: "orange" }}>Location: {geoError}</p>}
      {coords && <p style={{ fontSize: 12, color: "#888" }}>{coords.lat.toFixed(5)}, {coords.lon.toFixed(5)}</p>}

      {matchEvent ? (
        <ReadyCheck
          lobbyId={matchEvent.lobby_id}
          activityType={matchEvent.activity_type}
          members={matchEvent.members ?? []}
          onAccept={handleReadyAccept}
          onDecline={handleReadyDecline}
        />
      ) : (
        <>
          <PingForm userId={USER_ID} coords={coords} onPingCreated={handlePingCreated} />
          <hr style={{ margin: "24px 0" }} />
          <h3>Nearby Activity</h3>
          <LobbyList lobbies={lobbies} />
        </>
      )}
    </div>
  );
}

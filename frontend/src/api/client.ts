const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export async function postPing(body: {
  user_id: string;
  activity_type: string;
  location: { lat: number; lon: number };
  message?: string;
  radius_meters?: number;
  capacity?: number;
}) {
  const res = await fetch(`${API_URL}/pings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getNearbyPings(lat: number, lon: number, radius = 100) {
  const res = await fetch(`${API_URL}/pings/nearby?lat=${lat}&lon=${lon}&radius=${radius}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getLobby(lobbyId: string) {
  const res = await fetch(`${API_URL}/lobbies/${lobbyId}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function deleteLobby(lobbyId: string, userId: string) {
  const res = await fetch(`${API_URL}/lobbies/${lobbyId}?user_id=${encodeURIComponent(userId)}`, {
    method: "DELETE",
  });
  if (!res.ok && res.status !== 204) throw new Error(await res.text());
}

export async function joinLobby(lobbyId: string, userId: string) {
  const res = await fetch(`${API_URL}/lobbies/${lobbyId}/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

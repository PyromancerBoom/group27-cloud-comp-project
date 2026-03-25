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

export async function getNearbyPings(lat: number, lon: number, radius = 10) {
  const res = await fetch(`${API_URL}/pings/nearby?lat=${lat}&lon=${lon}&radius=${radius}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

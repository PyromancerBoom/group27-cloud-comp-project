import React from "react";

interface HotSpot {
  lat: number;
  lon: number;
  count: number;
  activity_type: string;
}

interface Props {
  hotspots: HotSpot[];
}

// Placeholder heatmap — replace with a proper map library (e.g. react-leaflet + leaflet.heat)
export function ActivityHeatmap({ hotspots }: Props) {
  return (
    <div>
      <h3>Activity Hotspots</h3>
      {hotspots.length === 0 ? (
        <p>No hotspot data available.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Activity", "Lat", "Lon", "Ping Count"].map((h) => (
                <th key={h} style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid #e5e7eb" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {hotspots.map((h, i) => (
              <tr key={i}>
                <td style={{ padding: "6px 8px" }}>{h.activity_type.replace("_", " ")}</td>
                <td style={{ padding: "6px 8px" }}>{h.lat}</td>
                <td style={{ padding: "6px 8px" }}>{h.lon}</td>
                <td style={{ padding: "6px 8px" }}>{h.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

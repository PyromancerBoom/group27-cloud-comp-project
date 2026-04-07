import { useState, useEffect, useRef } from "react";

interface Coords {
  lat: number;
  lon: number;
}

interface GeolocationResult {
  coords: Coords | null;
  accuracy: number | null; // metres
  loading: boolean;
  error: string | null;
}

// Only suppress updates smaller than this (reduces jitter without blocking first fix)
const MIN_MOVEMENT_METRES = 3;

// Only tighten accuracy for updates after the first fix
const FINE_ACCURACY = 50; // metres — required for subsequent updates

function haversineMetres(a: Coords, b: Coords): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const c =
    2 *
    Math.asin(
      Math.sqrt(
        sinLat * sinLat +
          Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLon * sinLon
      )
    );
  return R * c;
}

export function useGeolocation(): GeolocationResult {
  const [coords, setCoords]   = useState<Coords | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const lastCoords = useRef<Coords | null>(null);
  const hasFix     = useRef(false);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported");
      setLoading(false);
      return;
    }

    const applyPosition = (pos: GeolocationPosition) => {
      const { latitude: lat, longitude: lon, accuracy: acc } = pos.coords;
      const next: Coords = { lat, lon };

      // First fix: accept unconditionally — any position is better than none
      if (!hasFix.current) {
        hasFix.current = true;
        lastCoords.current = next;
        setCoords(next);
        setAccuracy(acc);
        setLoading(false);
        setError(null);
        return;
      }

      // Subsequent updates: only apply if accuracy improved and position moved meaningfully
      if (acc > FINE_ACCURACY) return;
      if (haversineMetres(lastCoords.current!, next) < MIN_MOVEMENT_METRES) return;

      lastCoords.current = next;
      setCoords(next);
      setAccuracy(acc);
    };

    const onError = (err: GeolocationPositionError) => {
      setError(err.message);
      setLoading(false);
    };

    const options: PositionOptions = {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 15_000,
    };

    const id = navigator.geolocation.watchPosition(applyPosition, onError, options);
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  return { coords, accuracy, loading, error };
}

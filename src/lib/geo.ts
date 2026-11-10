export const GEO_MIN_RADIUS = 30;
export const GEO_MAX_RADIUS = 2000;
export const GEO_DEFAULT_RADIUS = 150;
// A phone's GPS is rarely exact, so up to this much of its own reported error is allowed for
export const MAX_ACCURACY_SLACK = 100;

type P = { lat: number; lng: number };

// Straight-line distance in metres between two points on the earth
export function distanceM(a: P, b: P): number {
  const R = 6_371_000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

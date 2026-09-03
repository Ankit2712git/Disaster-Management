/**
 * Geographic calculation utilities for ResQMap Live Location
 */

/**
 * Calculates great-circle distance between two coordinates in meters (Haversine formula).
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Ray-casting algorithm to test if point is inside polygon.
 * Polygon coordinates are [lat, lng][].
 */
export function isPointInPolygon(
  point: [number, number],
  polygon: [number, number][]
): boolean {
  if (!polygon || polygon.length < 3) return false;

  const [lat, lng] = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];

    const intersect =
      yi > lng !== yj > lng &&
      lat < ((xj - xi) * (lng - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Minimum distance in meters from a point [lat, lng] to any vertex or center of a polygon
 */
export function distanceToPolygonMeters(
  point: [number, number],
  polygon: [number, number][]
): number {
  if (!polygon || polygon.length === 0) return Infinity;

  // If inside, distance is 0
  if (isPointInPolygon(point, polygon)) return 0;

  let minDistance = Infinity;
  for (const vertex of polygon) {
    const d = calculateDistanceMeters(point[0], point[1], vertex[0], vertex[1]);
    if (d < minDistance) {
      minDistance = d;
    }
  }

  return minDistance;
}

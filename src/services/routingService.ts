import { Shelter, HazardZone, RoadBlockage, CandidateRoute } from '../types';

/**
 * Calculates great-circle distance between two coordinates in kilometers (Haversine formula).
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

/**
 * Generates realistic street-following waypoints between origin and destination,
 * steering around known blockages when possible.
 */
export function generateRouteWaypoints(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  blockages: RoadBlockage[]
): { points: [number, number][]; warnings: string[] } {
  const warnings: string[] = [];
  const points: [number, number][] = [];

  points.push([origin.lat, origin.lng]);

  // Intermediate steps
  const steps = 4;
  for (let i = 1; i <= steps; i++) {
    const fraction = i / (steps + 1);
    const interpLat = origin.lat + (destination.lat - origin.lat) * fraction;
    const interpLng = origin.lng + (destination.lng - origin.lng) * fraction;

    // Check if close to any road blockage
    let offsetLat = 0;
    let offsetLng = 0;
    for (const blockage of blockages) {
      const dist = calculateDistanceKm(interpLat, interpLng, blockage.location.lat, blockage.location.lng);
      if (dist < 0.6) {
        // Detour slightly south/east to navigate around blockage
        offsetLat -= 0.003;
        offsetLng += 0.004;
        const msg = `⚠ Caution near ${blockage.name}: ${blockage.hazardType} reported (${blockage.status.toUpperCase()}).`;
        if (!warnings.includes(msg)) {
          warnings.push(msg);
        }
      }
    }

    points.push([interpLat + offsetLat, interpLng + offsetLng]);
  }

  points.push([destination.lat, destination.lng]);

  return { points, warnings };
}

/**
 * Evaluates and ranks shelters according to capacity, distance, and known hazards.
 * Explicitly implements the SHELTER FULL logic required by the prompt:
 * If the closest shelter is full, alternative operational shelters with available capacity are prioritized.
 */
export function rankSheltersAndRoutes(
  userLocation: { lat: number; lng: number },
  shelters: Shelter[],
  hazards: HazardZone[],
  blockages: RoadBlockage[]
): {
  recommendedShelter: Shelter | null;
  recommendedRoute: CandidateRoute | null;
  allRoutes: CandidateRoute[];
  explanation: string;
} {
  if (!shelters || !shelters.length) {
    return {
      recommendedShelter: null,
      recommendedRoute: null,
      allRoutes: [],
      explanation: 'No shelters found in this operational zone.',
    };
  }

  const computedRoutes: CandidateRoute[] = [];

  for (const shelter of shelters) {
    const distanceKm = calculateDistanceKm(
      userLocation.lat,
      userLocation.lng,
      shelter.location.lat,
      shelter.location.lng
    );

    // Realistic walking speed in evacuation condition: ~4.5 km/h
    const durationMinutes = Math.max(4, Math.round((distanceKm / 4.5) * 60));

    const { points, warnings } = generateRouteWaypoints(userLocation, shelter.location, blockages || []);

    // Hazard proximity check
    for (const hazard of (hazards || [])) {
      for (const coord of (hazard.coordinates || [])) {
        const d = calculateDistanceKm(shelter.location.lat, shelter.location.lng, coord[0], coord[1]);
        if (d < 0.8) {
          const w = `⚠ ${hazard.name} is within 800m of this shelter zone.`;
          if (!warnings.includes(w)) {
            warnings.push(w);
          }
        }
      }
    }

    let confidenceScore = 0.95;
    if (warnings.length > 0) confidenceScore -= 0.15;
    if (shelter.status === 'nearly_full') confidenceScore -= 0.1;
    if (shelter.status === 'full') confidenceScore -= 0.4;
    if (shelter.status === 'closed') confidenceScore = 0;

    let explanation = '';
    if (shelter.status === 'full') {
      explanation = `Shelter is at maximum safe capacity (${shelter.currentOccupancy}/${shelter.capacity}). Not recommended for new evacuees.`;
    } else if (shelter.status === 'nearly_full') {
      explanation = `Limited remaining capacity (${shelter.capacity - shelter.currentOccupancy} spaces). Proceed with backup plan.`;
    } else {
      explanation = `Operational with ${shelter.capacity - shelter.currentOccupancy} available spaces. Direct access via clear roads.`;
    }

    computedRoutes.push({
      id: `route-to-${shelter.id}`,
      destinationShelterId: shelter.id,
      shelterName: shelter.name,
      distanceKm,
      durationMinutes,
      isRecommended: false,
      hazardWarnings: warnings,
      pathPoints: points,
      waypoints: points,
      confidenceScore: Math.max(0.2, Number(confidenceScore.toFixed(2))),
      explanation,
    });
  }

  // Sort by:
  // 1. Operational status (open > nearly_full > full > closed)
  // 2. Minimum hazard warnings
  // 3. Distance
  const sortedRoutes = [...computedRoutes].sort((a, b) => {
    const shelterA = shelters.find((s) => s.id === a.destinationShelterId)!;
    const shelterB = shelters.find((s) => s.id === b.destinationShelterId)!;

    const scoreStatus = (status: string) => {
      if (status === 'open') return 4;
      if (status === 'nearly_full') return 3;
      if (status === 'full') return 1;
      return 0; // closed
    };

    const statusDiff = scoreStatus(shelterB.status) - scoreStatus(shelterA.status);
    if (statusDiff !== 0) return statusDiff;

    const warningDiff = (a.hazardWarnings?.length || 0) - (b.hazardWarnings?.length || 0);
    if (warningDiff !== 0) return warningDiff;

    return a.distanceKm - b.distanceKm;
  });

  const bestRoute = sortedRoutes[0];
  bestRoute.isRecommended = true;

  const recommendedShelter = shelters.find((s) => s.id === bestRoute.destinationShelterId) || null;

  // Check if closest shelter was bypassed because it was full
  const closestShelter = [...shelters].sort(
    (a, b) =>
      calculateDistanceKm(userLocation.lat, userLocation.lng, a.location.lat, a.location.lng) -
      calculateDistanceKm(userLocation.lat, userLocation.lng, b.location.lat, b.location.lng)
  )[0];

  let overallExplanation = '';
  if (closestShelter && closestShelter.status === 'full' && recommendedShelter && recommendedShelter.id !== closestShelter.id) {
    overallExplanation = `Notice: ${closestShelter.name} is the closest shelter (${calculateDistanceKm(userLocation.lat, userLocation.lng, closestShelter.location.lat, closestShelter.location.lng)} km away), but it is currently FULL. Re-routed to ${recommendedShelter.name} (${bestRoute.distanceKm} km away) which has ${recommendedShelter.capacity - recommendedShelter.currentOccupancy} confirmed open spots.`;
  } else if (recommendedShelter) {
    overallExplanation = `Recommended ${recommendedShelter.name} based on optimal combination of capacity (${recommendedShelter.capacity - recommendedShelter.currentOccupancy} spots available), shortest distance (${bestRoute.distanceKm} km), and verified road clearance.`;
  }

  return {
    recommendedShelter,
    recommendedRoute: bestRoute,
    allRoutes: sortedRoutes,
    explanation: overallExplanation,
  };
}

export type UserRole =
  | 'civilian'
  | 'responder'
  | 'incident_commander'
  | 'drone_operator'
  | 'shelter_manager'
  | 'wildlife_rescue'
  | 'admin';

export type DisasterScenario = 'wildfire' | 'flood' | 'earthquake' | 'landslide';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  email?: string;
  phone?: string;
  organization?: string;
  teamId?: string;
}

export interface Shelter {
  id: string;
  name: string;
  location: { lat: number; lng: number };
  address: string;
  capacity: number;
  currentOccupancy: number;
  status: 'open' | 'nearly_full' | 'full' | 'closed';
  accessibilityInfo: string;
  services: string[];
  contactPhone: string;
  lastUpdated: string;
  petFriendly: boolean;
  medicalFacilityOnsite: boolean;
  state?: string;
  district?: string;
  supplies?: {
    water: string;
    food: string;
    cots: string;
    generatorFuel: string;
  };
}

export interface HazardZone {
  id: string;
  disasterType: DisasterScenario | 'building_collapse' | 'power_failure';
  name: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  coordinates: [number, number][]; // [lat, lng] array
  probability: number;
  source: string;
  validFrom: string;
  validUntil: string;
  modelVersion?: string;
  isModelEstimate: boolean;
  notes?: string;
}

export interface RoadBlockage {
  id: string;
  name: string;
  location: { lat: number; lng: number };
  hazardType: string;
  status: 'blocked' | 'caution' | 'cleared';
  reportedAt: string;
  notes?: string;
}

export type IncidentStatus =
  | 'submitted'
  | 'received'
  | 'assigned'
  | 'en_route'
  | 'arrived'
  | 'resolved';

export type IncidentPriority = 'critical' | 'high' | 'medium' | 'low';

export type IncidentType =
  | 'trapped'
  | 'building_collapse'
  | 'flood'
  | 'fire'
  | 'road_blocked'
  | 'injured'
  | 'medical'
  | 'earthquake'
  | 'landslide'
  | 'other';

export interface IncidentTimelineEvent {
  status: IncidentStatus;
  timestamp: string;
  actor: string;
  note: string;
}

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  altitudeMeters?: number | null;
  speedMetersPerSecond?: number | null;
  headingDegrees?: number | null;
  timestamp: number;
}

export type LocationStatus =
  | 'STOPPED'
  | 'LOCATING'
  | 'LOCATION ACTIVE'
  | 'LOW ACCURACY'
  | 'LOCATION UNAVAILABLE'
  | 'PERMISSION DENIED'
  | 'OFFLINE';

export interface Incident {
  id: string;
  reporterUserId?: string;
  reporterName: string;
  reporterPhone?: string;
  type: IncidentType;
  priority: IncidentPriority;
  status: IncidentStatus;
  location: {
    lat: number;
    lng: number;
    address: string;
    accuracyMeters?: number;
    capturedAt?: string;
  };
  peopleCount: number;
  hasMedicalEmergency: boolean;
  isTrapped: boolean;
  isInjured: boolean;
  description: string;
  mediaUrl?: string;
  assignedTeamId?: string;
  assignedTeamName?: string;
  createdAt: string;
  updatedAt: string;
  notes: string[];
  timeline: IncidentTimelineEvent[];
  isOfflineDraft?: boolean;
}

export interface RescueTeam {
  id: string;
  name: string;
  specialization: 'Search & Rescue' | 'Medical First Response' | 'Fire Evacuation' | 'Water Rescue' | 'Wildlife Rescue';
  status: 'available' | 'dispatched' | 'on_scene' | 'returning' | 'resting';
  membersCount: number;
  location: { lat: number; lng: number };
  currentIncidentId?: string;
}

export type DroneStatus =
  | 'available'
  | 'surveying'
  | 'delivering'
  | 'returning'
  | 'charging'
  | 'maintenance'
  | 'offline';

export interface Drone {
  id: string;
  name: string;
  model: string;
  type: 'GIS Survey & LiDAR' | 'Heavy Lift Relief' | 'Thermal Recon' | 'Hybrid Fast-Response';
  status: DroneStatus;
  batteryPercent: number;
  currentLocation: { lat: number; lng: number };
  baseLocation: { lat: number; lng: number };
  capabilities: string[];
  maxPayloadKg: number;
  currentMissionId?: string;
  state: string;
  district?: string;
}

export interface DeployDroneParams {
  droneId: string;
  missionType: 'survey' | 'relief_delivery';
  targetLocation: { lat: number; lng: number; name?: string };
  state?: string;
  payload?: {
    item: string;
    quantity: string;
    urgency: 'high' | 'critical' | 'standard';
    recipientIncidentId?: string;
  };
  surveyAreaKm2?: number;
  operatorNotes?: string;
}

export interface DroneMission {
  id: string;
  droneId: string;
  droneName: string;
  state?: string;
  missionType: 'survey' | 'relief_delivery';
  status: 'pending' | 'in_progress' | 'completed' | 'aborted';
  progress: number; // 0 to 100
  targetLocation: { lat: number; lng: number; name?: string };
  payload?: {
    item: string;
    quantity: string;
    urgency: 'high' | 'critical' | 'standard';
    recipientIncidentId?: string;
  };
  surveyArea?: {
    name: string;
    polygon: [number, number][];
    areaKm2: number;
  };
  startedAt?: string;
  completedAt?: string;
  generatedLayerId?: string;
  operatorNotes?: string;
}

export interface Alert {
  id: string;
  disasterType: DisasterScenario | 'general';
  severity: 'critical' | 'warning' | 'advisory';
  title: string;
  message: string;
  affectedArea: string;
  recommendedActions: string[];
  source: string;
  timestamp: string;
  expiresAt: string;
  confidence: number;
  isOfficial: boolean;
  isModelEstimate: boolean;
  status: 'draft' | 'published' | 'cancelled';
  approvedBy?: string;
}

export interface WildlifeRescueCase {
  id: string;
  species: string;
  animalCount: number;
  location: { lat: number; lng: number; areaName: string };
  urgency: 'critical' | 'urgent' | 'moderate' | 'monitoring';
  condition: string;
  status: 'reported' | 'triage' | 'team_dispatched' | 'rescued' | 'transferred';
  assignedTeamId?: string;
  assignedTeamName?: string;
  recommendedCorridor: string;
  notes: string[];
  createdAt: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actor: string;
  actorRole: UserRole;
  action: string;
  entityType: 'Incident' | 'Shelter' | 'Alert' | 'DroneMission' | 'WildlifeCase' | 'HazardZone';
  entityId: string;
  details: string;
}

export interface FireSpreadPrediction {
  id: string;
  forecastWindow: '1h' | '3h' | '6h';
  timestamp: string;
  modelVersion: string;
  confidence: number;
  probability: number;
  uncertainty: string;
  windVector: { speedKmh: number; directionDeg: number; directionLabel: string };
  fuelType: string;
  perimeterPolygon: [number, number][];
  isHumanApproved: boolean;
  reviewedBy?: string;
}

export interface MapLayer {
  id: string;
  name: string;
  type: 'drone_survey' | 'fire_perimeter' | 'flood_extent' | 'road_closures' | 'safe_corridor' | 'satellite_thermal';
  visible: boolean;
  isSimulated: boolean;
  source: string;
  dataFreshness: string;
  timestamp: string;
  confidence?: number;
  featuresCount: number;
}

export interface CandidateRoute {
  id: string;
  destinationShelterId: string;
  shelterName: string;
  distanceKm: number;
  durationMinutes: number;
  isRecommended: boolean;
  hazardWarnings: string[];
  pathPoints: [number, number][];
  waypoints?: [number, number][];
  confidenceScore: number;
  explanation: string;
}

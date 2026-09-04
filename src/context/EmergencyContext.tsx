import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  User,
  UserRole,
  Shelter,
  HazardZone,
  RoadBlockage,
  Incident,
  RescueTeam,
  Drone,
  DroneMission,
  Alert,
  WildlifeRescueCase,
  AuditLog,
  FireSpreadPrediction,
  MapLayer,
  CandidateRoute,
  DisasterScenario,
  DeployDroneParams,
} from '../types';
import { ALL_INDIAN_REGIONS } from '../data/indianSheltersData';
import {
  INITIAL_USERS,
  INITIAL_SHELTERS,
  INITIAL_HAZARDS,
  INITIAL_ROAD_BLOCKAGES,
  INITIAL_INCIDENTS,
  INITIAL_RESCUE_TEAMS,
  INITIAL_DRONES,
  INITIAL_DRONE_MISSIONS,
  INITIAL_ALERTS,
  INITIAL_WILDLIFE_CASES,
  INITIAL_AUDIT_LOGS,
  INITIAL_PREDICTIONS,
  INITIAL_MAP_LAYERS,
  MAP_CENTER,
} from '../data/mockData';
import { rankSheltersAndRoutes } from '../services/routingService';
import {
  LocationData,
  LocationStatus,
  LocationErrorDetail,
  browserLocationService,
} from '../services/location/locationService';
import {
  ResponderLiveLocation,
  mockRealtimeLocationService,
  canViewResponderLocations,
} from '../services/location/responderLocationService';
import {
  calculateDistanceMeters,
  distanceToPolygonMeters,
} from '../services/location/geoUtils';

interface EmergencyContextType {
  // Current user & role
  currentUser: User;
  switchRole: (role: UserRole) => void;
  appMode: 'civilian' | 'operations';
  setAppMode: (mode: 'civilian' | 'operations') => void;

  // Network & Connectivity status
  isOnline: boolean;
  toggleConnectivity: () => void;
  lastSyncTime: string;

  // Location
  userLocation: { lat: number; lng: number; address: string };
  setUserLocation: (loc: { lat: number; lng: number; address: string }) => void;

  // Live Location Tracking Subsystem (Sections 1, 2, 3, 5, 6, 7, 8, 14, 15, 19)
  liveLocation: LocationData | null;
  locationStatus: LocationStatus;
  locationErrorDetail: LocationErrorDetail | null;
  isTrackingLocation: boolean;
  startLocationTracking: () => void;
  stopLocationTracking: () => void;
  isFollowMode: boolean;
  setIsFollowMode: (val: boolean) => void;
  recalculateThresholdMeters: number;
  setRecalculateThresholdMeters: (val: number) => void;
  showPermissionDialog: boolean;
  setShowPermissionDialog: (val: boolean) => void;
  requestLocationWithPrompt: () => void;
  confirmPermissionAndStartTracking: () => void;
  dismissPermissionPrompt: () => void;
  hazardWarningProximity: {
    inZone: boolean;
    nearZone: boolean;
    hazardName: string;
    disasterType: string;
    distanceMeters: number;
    isModelEstimate: boolean;
    source: string;
    hazard?: HazardZone;
  } | null;

  // Responder Live Location Layer (Sections 11, 12, 13)
  responderLocations: ResponderLiveLocation[];
  isSharingResponderLocation: boolean;
  toggleSharingResponderLocation: () => void;
  canViewResponders: boolean;

  // Active Disaster
  activeScenario: DisasterScenario;
  setActiveScenario: (scenario: DisasterScenario) => void;

  // Entities
  shelters: Shelter[];
  hazards: HazardZone[];
  roadBlockages: RoadBlockage[];
  incidents: Incident[];
  rescueTeams: RescueTeam[];
  drones: Drone[];
  droneMissions: DroneMission[];
  alerts: Alert[];
  wildlifeCases: WildlifeRescueCase[];
  auditLogs: AuditLog[];
  predictions: FireSpreadPrediction[];
  mapLayers: MapLayer[];

  // State and Region Partitioning
  selectedState: string;
  setSelectedState: (state: string) => void;
  selectedRegionId: string;
  setSelectedRegionId: (regionId: string) => void;

  // Selected State
  selectedIncident: Incident | null;
  setSelectedIncident: (inc: Incident | null) => void;
  selectedShelter: Shelter | null;
  setSelectedShelter: (s: Shelter | null) => void;
  activeRoute: CandidateRoute | null;
  setActiveRoute: (r: CandidateRoute | null) => void;

  // Actions
  submitRescueRequest: (req: Partial<Incident>) => Promise<Incident>;
  updateIncidentStatus: (id: string, status: Incident['status'], note?: string) => Promise<void>;
  assignRescueTeam: (incidentId: string, teamId: string) => Promise<void>;
  updateShelterCapacity: (id: string, occupancy: number, status?: Shelter['status']) => Promise<void>;
  reportHazard: (hazard: Partial<RoadBlockage>) => Promise<void>;
  createDroneSurveyMission: (droneId: string, areaName: string) => Promise<DroneMission>;
  createReliefDelivery: (droneId: string, incidentId: string, item: string, quantity: string) => Promise<DroneMission>;
  deployDroneToLocation: (params: DeployDroneParams) => Promise<DroneMission>;
  progressDroneMission: (missionId: string, progressDelta: number) => Promise<void>;
  publishAlert: (alert: Partial<Alert>) => Promise<void>;
  createWildlifeCase: (data: Partial<WildlifeRescueCase>) => Promise<void>;
  toggleMapLayer: (layerId: string) => void;

  // AI Actions
  summarizeIncidentsWithAI: () => Promise<string>;
  draftAlertWithAI: (incidentType: string, area: string, severity: string, details: string) => Promise<any>;

  // Simulation Triggers
  triggerSimulation: (scenario: string) => Promise<void>;

  // Routing Helper
  calculateShelterRoutes: (origin?: { lat: number; lng: number }) => {
    recommendedShelter: Shelter | null;
    recommendedRoute: CandidateRoute | null;
    allRoutes: CandidateRoute[];
    explanation: string;
  };
}

const EmergencyContext = createContext<EmergencyContextType | undefined>(undefined);

export const EmergencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User>(INITIAL_USERS[0]);
  const [appMode, setAppMode] = useState<'civilian' | 'operations'>('civilian');
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [lastSyncTime, setLastSyncTime] = useState<string>('Just now');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; address: string }>({
    lat: 28.6692,
    lng: 77.2315,
    address: 'Civil Lines, Yamuna River Basin, Delhi NCR 110054',
  });
  const [activeScenario, setActiveScenario] = useState<DisasterScenario>('wildfire');

  // State and Region Partitioning (Defaults to Delhi)
  const [selectedState, setSelectedStateState] = useState<string>('Delhi');
  const [selectedRegionId, setSelectedRegionIdState] = useState<string>('delhi-yamuna');

  const setSelectedState = useCallback((newState: string) => {
    setSelectedStateState(newState);
    const matchedRegion =
      ALL_INDIAN_REGIONS.find((r) => r.state.toLowerCase() === newState.toLowerCase()) ||
      ALL_INDIAN_REGIONS.find((r) => r.name.toLowerCase().includes(newState.toLowerCase())) ||
      ALL_INDIAN_REGIONS[0];
    if (matchedRegion) {
      setSelectedRegionIdState(matchedRegion.id);
      setUserLocation({
        lat: matchedRegion.center.lat,
        lng: matchedRegion.center.lng,
        address: `${matchedRegion.name} (${matchedRegion.state})`,
      });
    }
  }, []);

  const setSelectedRegionId = useCallback((newRegionId: string) => {
    setSelectedRegionIdState(newRegionId);
    const matchedRegion = ALL_INDIAN_REGIONS.find((r) => r.id === newRegionId);
    if (matchedRegion) {
      setSelectedStateState(matchedRegion.state);
      setUserLocation({
        lat: matchedRegion.center.lat,
        lng: matchedRegion.center.lng,
        address: `${matchedRegion.name} (${matchedRegion.state})`,
      });
    }
  }, []);

  const [shelters, setShelters] = useState<Shelter[]>(INITIAL_SHELTERS);
  const [hazards, setHazards] = useState<HazardZone[]>(INITIAL_HAZARDS);
  const [roadBlockages, setRoadBlockages] = useState<RoadBlockage[]>(INITIAL_ROAD_BLOCKAGES);
  const [incidents, setIncidents] = useState<Incident[]>(INITIAL_INCIDENTS);
  const [rescueTeams, setRescueTeams] = useState<RescueTeam[]>(INITIAL_RESCUE_TEAMS);
  const [drones, setDrones] = useState<Drone[]>(INITIAL_DRONES);
  const [droneMissions, setDroneMissions] = useState<DroneMission[]>(INITIAL_DRONE_MISSIONS);
  const [alerts, setAlerts] = useState<Alert[]>(INITIAL_ALERTS);
  const [wildlifeCases, setWildlifeCases] = useState<WildlifeRescueCase[]>(INITIAL_WILDLIFE_CASES);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(INITIAL_AUDIT_LOGS);
  const [predictions, setPredictions] = useState<FireSpreadPrediction[]>(INITIAL_PREDICTIONS);
  const [mapLayers, setMapLayers] = useState<MapLayer[]>(INITIAL_MAP_LAYERS);

  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(INITIAL_INCIDENTS[0]);
  const [selectedShelter, setSelectedShelter] = useState<Shelter | null>(null);
  const [activeRoute, setActiveRoute] = useState<CandidateRoute | null>(null);

  // Live Location Tracking Subsystem
  const [liveLocation, setLiveLocation] = useState<LocationData | null>(null);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('STOPPED');
  const [locationErrorDetail, setLocationErrorDetail] = useState<LocationErrorDetail | null>(null);
  const [isTrackingLocation, setIsTrackingLocation] = useState<boolean>(false);
  const [isFollowMode, setIsFollowMode] = useState<boolean>(false);
  const [recalculateThresholdMeters, setRecalculateThresholdMeters] = useState<number>(40);
  const [showPermissionDialog, setShowPermissionDialog] = useState<boolean>(false);
  const [hazardWarningProximity, setHazardWarningProximity] = useState<{
    inZone: boolean;
    nearZone: boolean;
    hazardName: string;
    disasterType: string;
    distanceMeters: number;
    isModelEstimate: boolean;
    source: string;
    hazard?: HazardZone;
  } | null>(null);

  // Responder Live Location Subsystem (Sections 11, 12, 13)
  const [responderLocations, setResponderLocations] = useState<ResponderLiveLocation[]>([]);
  const [isSharingResponderLocation, setIsSharingResponderLocation] = useState<boolean>(false);
  const canViewResponders = canViewResponderLocations(currentUser.role);

  const lastRouteOriginRef = React.useRef<{ lat: number; lng: number } | null>(null);

  // Start / Stop Location Tracking methods
  const requestLocationWithPrompt = useCallback(() => {
    setShowPermissionDialog(true);
  }, []);

  const dismissPermissionPrompt = useCallback(() => {
    setShowPermissionDialog(false);
  }, []);

  const confirmPermissionAndStartTracking = useCallback(() => {
    setShowPermissionDialog(false);
    setIsTrackingLocation(true);
    browserLocationService.startTracking();
  }, []);

  const startLocationTracking = useCallback(() => {
    setIsTrackingLocation(true);
    browserLocationService.startTracking();
  }, []);

  const stopLocationTracking = useCallback(() => {
    setIsTrackingLocation(false);
    setIsFollowMode(false);
    browserLocationService.stopTracking();
  }, []);

  // Subscribe to continuous browser location updates
  useEffect(() => {
    const unsubLoc = browserLocationService.subscribe((loc) => {
      setLiveLocation(loc);

      // Keep userLocation updated
      setUserLocation((prev) => {
        // If the user manually pinned a custom point, preserve label while updating coordinates
        const isManual = prev.address.includes('Pinned') || prev.address.includes('Manual');
        return {
          lat: loc.latitude,
          lng: loc.longitude,
          address: isManual
            ? prev.address
            : `Live GPS (${loc.latitude.toFixed(4)}° N, ${loc.longitude.toFixed(4)}° E ±${loc.accuracyMeters}m)`,
        };
      });

      // Section 14: Check route update threshold if an active route is present
      if (activeRoute && lastRouteOriginRef.current) {
        const movedMeters = calculateDistanceMeters(
          loc.latitude,
          loc.longitude,
          lastRouteOriginRef.current.lat,
          lastRouteOriginRef.current.lng
        );

        if (movedMeters >= recalculateThresholdMeters) {
          // Recalculate route for moved civilian
          const destShelter = shelters.find((s) => s.id === activeRoute.destinationShelterId);
          if (destShelter) {
            const recomputed = rankSheltersAndRoutes(
              { lat: loc.latitude, lng: loc.longitude },
              [destShelter],
              hazards,
              roadBlockages
            );
            if (recomputed.recommendedRoute) {
              setActiveRoute(recomputed.recommendedRoute);
              lastRouteOriginRef.current = { lat: loc.latitude, lng: loc.longitude };
            }
          }
        }
      }
    });

    const unsubStat = browserLocationService.subscribeStatus((status, err) => {
      setLocationStatus(status);
      setLocationErrorDetail(err || null);
    });

    return () => {
      unsubLoc();
      unsubStat();
    };
  }, [activeRoute, recalculateThresholdMeters, shelters, hazards, roadBlockages]);

  // Track origin when activeRoute changes
  useEffect(() => {
    if (activeRoute) {
      lastRouteOriginRef.current = {
        lat: liveLocation ? liveLocation.latitude : userLocation.lat,
        lng: liveLocation ? liveLocation.longitude : userLocation.lng,
      };
    } else {
      lastRouteOriginRef.current = null;
    }
  }, [activeRoute?.id]);

  // Section 15: Live Location + Disaster Warnings proximity calculation
  useEffect(() => {
    const curLat = liveLocation ? liveLocation.latitude : userLocation.lat;
    const curLng = liveLocation ? liveLocation.longitude : userLocation.lng;

    let closestMatch: {
      inZone: boolean;
      nearZone: boolean;
      hazardName: string;
      disasterType: string;
      distanceMeters: number;
      isModelEstimate: boolean;
      source: string;
      hazard?: HazardZone;
    } | null = null;

    let minDistance = Infinity;

    for (const h of hazards) {
      const dist = distanceToPolygonMeters([curLat, curLng], h.coordinates);
      if (dist <= 500 && dist < minDistance) {
        minDistance = dist;
        closestMatch = {
          inZone: dist === 0,
          nearZone: dist > 0 && dist <= 500,
          hazardName: h.name,
          disasterType: h.disasterType,
          distanceMeters: Math.round(dist),
          isModelEstimate: Boolean(h.isModelEstimate),
          source: h.source || 'Authorized Emergency Authority',
          hazard: h,
        };
      }
    }

    setHazardWarningProximity(closestMatch);
  }, [liveLocation, userLocation, hazards]);

  // Sections 11, 12, 13: Responder Live Location Lifecycle
  useEffect(() => {
    mockRealtimeLocationService.start();
    mockRealtimeLocationService.seedFromTeams(rescueTeams);

    const unsubResp = mockRealtimeLocationService.subscribe((locs) => {
      setResponderLocations(locs);
    });

    return () => {
      unsubResp();
      mockRealtimeLocationService.stop();
    };
  }, [rescueTeams]);

  const toggleSharingResponderLocation = useCallback(() => {
    setIsSharingResponderLocation((prev) => {
      const next = !prev;
      if (next && liveLocation && currentUser.teamId) {
        mockRealtimeLocationService.updateMyResponderLocation(
          currentUser.teamId,
          liveLocation.latitude,
          liveLocation.longitude,
          'online'
        );
      }
      return next;
    });
  }, [liveLocation, currentUser.teamId]);

  // Sync with backend if available
  useEffect(() => {
    async function loadBackendData() {
      try {
        const res = await fetch('/api/shelters');
        if (res.ok) {
          const data = await res.json();
          setShelters(data);
        }
      } catch {
        // Use local fallback
      }
    }
    loadBackendData();
  }, []);

  const addAudit = useCallback(
    (action: string, entityType: any, entityId: string, details: string) => {
      const log: AuditLog = {
        id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        timestamp: new Date().toISOString(),
        actor: currentUser.name,
        actorRole: currentUser.role,
        action,
        entityType,
        entityId,
        details,
      };
      setAuditLogs((prev) => [log, ...prev]);
    },
    [currentUser]
  );

  const switchRole = (role: UserRole) => {
    const user = INITIAL_USERS.find((u) => u.role === role) || {
      id: `usr-${role}`,
      name: role.replace('_', ' ').toUpperCase(),
      role,
    };
    setCurrentUser(user);
    if (role === 'civilian') {
      setAppMode('civilian');
    } else {
      setAppMode('operations');
    }
    addAudit('Switch Active Operator Role', 'Incident', user.id, `User context switched to ${user.name} (${user.role})`);
  };

  const toggleConnectivity = () => {
    setIsOnline((prev) => !prev);
  };

  const calculateShelterRoutes = useCallback(
    (origin = userLocation) => {
      // Filter shelters to selected state if set and not 'all'
      const stateShelters = selectedState && selectedState !== 'all'
        ? shelters.filter((s) => s.state?.toLowerCase() === selectedState.toLowerCase())
        : shelters;
      const effectiveShelters = stateShelters.length > 0 ? stateShelters : shelters;
      return rankSheltersAndRoutes(origin, effectiveShelters, hazards, roadBlockages);
    },
    [userLocation, selectedState, shelters, hazards, roadBlockages]
  );

  // Submit rescue request (handles offline drafting)
  const submitRescueRequest = async (req: Partial<Incident>): Promise<Incident> => {
    const id = `INC-2026-${String(incidents.length + 101).padStart(4, '0')}`;
    const now = new Date().toISOString();
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let priority: Incident['priority'] = 'medium';
    if (req.hasMedicalEmergency || (req.isTrapped && ['fire', 'flood', 'building_collapse'].includes(req.type || ''))) {
      priority = 'critical';
    } else if (req.isTrapped || req.isInjured || (req.peopleCount && req.peopleCount > 2)) {
      priority = 'high';
    }

    const targetLat = req.location?.lat ?? (liveLocation ? liveLocation.latitude : userLocation.lat);
    const targetLng = req.location?.lng ?? (liveLocation ? liveLocation.longitude : userLocation.lng);
    const accuracyMeters = liveLocation?.accuracyMeters;
    const capturedAt = now;

    const newInc: Incident = {
      id,
      reporterUserId: currentUser.id,
      reporterName: req.reporterName || currentUser.name || 'Civilian Caller',
      reporterPhone: req.reporterPhone || currentUser.phone || '+1 (555) 234-8901',
      type: req.type || 'trapped',
      priority,
      status: isOnline ? 'received' : 'submitted', // If offline, remains submitted (waiting to transmit)
      location: {
        lat: targetLat,
        lng: targetLng,
        address: req.location?.address || userLocation.address,
        accuracyMeters,
        capturedAt,
      },
      peopleCount: req.peopleCount || 1,
      hasMedicalEmergency: Boolean(req.hasMedicalEmergency),
      isTrapped: Boolean(req.isTrapped),
      isInjured: Boolean(req.isInjured),
      description: req.description || 'Emergency SOS signal received.',
      mediaUrl: req.mediaUrl,
      createdAt: now,
      updatedAt: now,
      notes: isOnline
        ? [`${timeStr} - SOS with live GPS coordinates (${targetLat.toFixed(4)}, ${targetLng.toFixed(4)} ±${accuracyMeters || 10}m) verified by ResQMap Operations Grid.`]
        : [`${timeStr} - Request queued on device in Offline Mode. Location saved locally. Waiting for connection.`],
      timeline: isOnline
        ? [
            { status: 'submitted', timestamp: timeStr, actor: req.reporterName || currentUser.name, note: 'Emergency request submitted via device.' },
            { status: 'received', timestamp: timeStr, actor: 'Operations Server', note: 'Request and GPS coordinates acknowledged by dispatch.' },
          ]
        : [
            { status: 'submitted', timestamp: timeStr, actor: req.reporterName || currentUser.name, note: 'Saved to local device cache. Awaiting network.' },
          ],
      isOfflineDraft: !isOnline,
    };

    setIncidents((prev) => [newInc, ...prev]);
    setSelectedIncident(newInc);

    addAudit(
      'Submit Rescue Request',
      'Incident',
      newInc.id,
      `${newInc.reporterName} submitted SOS: ${newInc.type} (${newInc.peopleCount} people) at ${newInc.location.address}. Status: ${newInc.status}`
    );

    if (isOnline) {
      try {
        await fetch('/api/incidents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newInc),
        });
      } catch {
        // in-memory state already updated
      }
    }

    return newInc;
  };

  const updateIncidentStatus = async (id: string, status: Incident['status'], note?: string) => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setIncidents((prev) =>
      prev.map((inc) => {
        if (inc.id === id) {
          const updatedTimeline = [
            ...inc.timeline,
            {
              status,
              timestamp: timeStr,
              actor: `${currentUser.name} (${currentUser.role})`,
              note: note || `Status transitioned to ${status.replace('_', ' ').toUpperCase()}`,
            },
          ];
          const updatedNotes = note ? [...inc.notes, `${timeStr} - [${currentUser.name}]: ${note}`] : inc.notes;
          return {
            ...inc,
            status,
            updatedAt: new Date().toISOString(),
            timeline: updatedTimeline,
            notes: updatedNotes,
          };
        }
        return inc;
      })
    );

    addAudit('Update Incident Status', 'Incident', id, `Incident status changed to ${status.toUpperCase()} by ${currentUser.name}`);
  };

  const assignRescueTeam = async (incidentId: string, teamId: string) => {
    const team = rescueTeams.find((t) => t.id === teamId);
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setIncidents((prev) =>
      prev.map((inc) => {
        if (inc.id === incidentId) {
          return {
            ...inc,
            assignedTeamId: teamId,
            assignedTeamName: team?.name || 'Assigned Unit',
            status: 'assigned',
            updatedAt: new Date().toISOString(),
            notes: [...inc.notes, `${timeStr} - Assigned to ${team?.name} by ${currentUser.name}.`],
            timeline: [
              ...inc.timeline,
              {
                status: 'assigned',
                timestamp: timeStr,
                actor: `${currentUser.name} (${currentUser.role})`,
                note: `Assigned to ${team?.name}.`,
              },
            ],
          };
        }
        return inc;
      })
    );

    setRescueTeams((prev) =>
      prev.map((t) => {
        if (t.id === teamId) {
          return { ...t, status: 'dispatched', currentIncidentId: incidentId };
        }
        return t;
      })
    );

    addAudit('Assign Rescue Team', 'Incident', incidentId, `Assigned ${team?.name || teamId} to incident.`);
  };

  const updateShelterCapacity = async (id: string, occupancy: number, newStatus?: Shelter['status']) => {
    setShelters((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          let status = newStatus;
          if (!status) {
            if (occupancy >= s.capacity) status = 'full';
            else if (occupancy >= s.capacity * 0.85) status = 'nearly_full';
            else status = 'open';
          }
          return {
            ...s,
            currentOccupancy: occupancy,
            status,
            lastUpdated: 'Just now',
          };
        }
        return s;
      })
    );

    const targetShelter = shelters.find((s) => s.id === id);
    addAudit(
      'Update Shelter Capacity',
      'Shelter',
      id,
      `${targetShelter?.name || id} capacity updated to ${occupancy} occupants.`
    );
  };

  const reportHazard = async (hazardData: Partial<RoadBlockage>) => {
    const blockage: RoadBlockage = {
      id: `rb-${Date.now()}`,
      name: hazardData.name || 'Reported Field Blockage',
      location: hazardData.location || userLocation,
      hazardType: hazardData.hazardType || 'Debris & Hazard obstruction',
      status: hazardData.status || 'blocked',
      reportedAt: 'Just now',
      notes: hazardData.notes,
    };

    setRoadBlockages((prev) => [blockage, ...prev]);
    addAudit('Report Hazard', 'HazardZone', blockage.id, `New obstacle logged: ${blockage.name} (${blockage.hazardType})`);
  };

  const createDroneSurveyMission = async (droneId: string, areaName: string): Promise<DroneMission> => {
    const drone = drones.find((d) => d.id === droneId);
    const missionId = `msn-${String(droneMissions.length + 1).padStart(2, '0')}`;
    const newMission: DroneMission = {
      id: missionId,
      droneId,
      droneName: drone?.name || 'Survey Drone',
      missionType: 'survey',
      status: 'in_progress',
      progress: 10,
      targetLocation: { lat: 37.777, lng: -122.435, name: areaName },
      surveyArea: {
        name: areaName,
        polygon: [
          [37.772, -122.441],
          [37.781, -122.438],
          [37.779, -122.427],
          [37.770, -122.432],
        ],
        areaKm2: 2.8,
      },
      startedAt: new Date().toISOString(),
      operatorNotes: `LiDAR and photogrammetry survey of ${areaName} initiated.`,
    };

    setDroneMissions((prev) => [newMission, ...prev]);
    setDrones((prev) =>
      prev.map((d) => (d.id === droneId ? { ...d, status: 'surveying', currentMissionId: missionId } : d))
    );

    addAudit('Launch Survey Mission', 'DroneMission', missionId, `Drone ${drone?.name} surveying ${areaName}`);
    return newMission;
  };

  const createReliefDelivery = async (
    droneId: string,
    incidentId: string,
    item: string,
    quantity: string
  ): Promise<DroneMission> => {
    const drone = drones.find((d) => d.id === droneId);
    const incident = incidents.find((i) => i.id === incidentId);
    const missionId = `msn-${String(droneMissions.length + 1).padStart(2, '0')}`;

    const newMission: DroneMission = {
      id: missionId,
      droneId,
      droneName: drone?.name || 'Relief Drone',
      missionType: 'relief_delivery',
      status: 'in_progress',
      progress: 15,
      targetLocation: incident?.location || { lat: 37.7745, lng: -122.4342, name: 'Victim Location' },
      payload: {
        item,
        quantity,
        urgency: 'critical',
        recipientIncidentId: incidentId,
      },
      startedAt: new Date().toISOString(),
      operatorNotes: `Emergency drops of ${quantity} ${item} to ${incident?.reporterName || 'Victim'}.`,
    };

    setDroneMissions((prev) => [newMission, ...prev]);
    setDrones((prev) =>
      prev.map((d) => (d.id === droneId ? { ...d, status: 'delivering', currentMissionId: missionId } : d))
    );

    addAudit(
      'Approve & Launch Relief Delivery',
      'DroneMission',
      missionId,
      `Drone ${drone?.name} delivering ${quantity} ${item} to incident ${incidentId}`
    );
    return newMission;
  };

  const deployDroneToLocation = async (params: DeployDroneParams): Promise<DroneMission> => {
    const { droneId, missionType, targetLocation, payload, surveyAreaKm2, operatorNotes, state } = params;
    const drone = drones.find((d) => d.id === droneId);
    const missionState = state || drone?.state || selectedState;
    const missionId = `msn-${missionState.toLowerCase().replace(/\s+/g, '').slice(0, 2)}-${Date.now().toString().slice(-4)}`;

    const newMission: DroneMission = {
      id: missionId,
      droneId,
      droneName: drone?.name || 'Emergency UAV',
      state: missionState,
      missionType,
      status: 'in_progress',
      progress: 12,
      targetLocation: {
        lat: targetLocation.lat,
        lng: targetLocation.lng,
        name: targetLocation.name || `Target Location (${targetLocation.lat.toFixed(4)}, ${targetLocation.lng.toFixed(4)})`,
      },
      payload: missionType === 'relief_delivery' ? payload : undefined,
      surveyArea: missionType === 'survey' ? {
        name: targetLocation.name || `Aerial Sector (${targetLocation.lat.toFixed(4)}, ${targetLocation.lng.toFixed(4)})`,
        polygon: [
          [targetLocation.lat - 0.006, targetLocation.lng - 0.006],
          [targetLocation.lat + 0.006, targetLocation.lng - 0.006],
          [targetLocation.lat + 0.006, targetLocation.lng + 0.006],
          [targetLocation.lat - 0.006, targetLocation.lng + 0.006],
        ],
        areaKm2: surveyAreaKm2 || 3.8,
      } : undefined,
      startedAt: new Date().toISOString(),
      operatorNotes: operatorNotes || (missionType === 'survey'
        ? `Aerial LiDAR reconnaissance over ${targetLocation.name || 'target coordinates'}.`
        : `Emergency air-drop of ${payload?.quantity || '1x'} ${payload?.item || 'Relief Supplies'} to ${targetLocation.name || 'target coordinates'}.`),
    };

    setDroneMissions((prev) => [newMission, ...prev]);
    setDrones((prev) =>
      prev.map((d) =>
        d.id === droneId
          ? {
              ...d,
              status: missionType === 'survey' ? 'surveying' : 'delivering',
              currentMissionId: missionId,
              currentLocation: {
                lat: Number(((d.currentLocation.lat * 2 + targetLocation.lat) / 3).toFixed(5)),
                lng: Number(((d.currentLocation.lng * 2 + targetLocation.lng) / 3).toFixed(5)),
              },
            }
          : d
      )
    );

    addAudit(
      missionType === 'survey' ? 'Deploy Aerial Survey UAV' : 'Deploy Relief Supply Drop UAV',
      'DroneMission',
      missionId,
      `Drone ${drone?.name} (${missionState}) deployed to (${targetLocation.lat.toFixed(4)}, ${targetLocation.lng.toFixed(4)})`
    );

    return newMission;
  };

  // Live flight path & mission progress simulation
  useEffect(() => {
    const flightInterval = setInterval(() => {
      setDroneMissions((prevMissions) => {
        let changed = false;
        const updated = prevMissions.map((m) => {
          if (m.status === 'in_progress' && m.progress < 100) {
            changed = true;
            const newProgress = Math.min(100, m.progress + 4);
            const isCompleted = newProgress >= 100;
            return {
              ...m,
              progress: newProgress,
              status: isCompleted ? 'completed' : m.status,
              completedAt: isCompleted ? new Date().toISOString() : m.completedAt,
            };
          }
          return m;
        });
        return changed ? updated : prevMissions;
      });

      setDrones((prevDrones) => {
        return prevDrones.map((d) => {
          if (d.status === 'surveying' || d.status === 'delivering') {
            const jitterLat = (Math.random() - 0.5) * 0.0004;
            const jitterLng = (Math.random() - 0.5) * 0.0004;
            return {
              ...d,
              currentLocation: {
                lat: Number((d.currentLocation.lat + jitterLat).toFixed(5)),
                lng: Number((d.currentLocation.lng + jitterLng).toFixed(5)),
              },
            };
          }
          return d;
        });
      });
    }, 4500);

    return () => clearInterval(flightInterval);
  }, []);

  const progressDroneMission = async (missionId: string, progressDelta: number) => {
    setDroneMissions((prev) =>
      prev.map((m) => {
        if (m.id === missionId) {
          const newProgress = Math.min(100, m.progress + progressDelta);
          const isFinished = newProgress >= 100;
          if (isFinished && m.status !== 'completed') {
            // Free up drone
            setDrones((dList) =>
              dList.map((d) =>
                d.id === m.droneId
                  ? { ...d, status: 'available', batteryPercent: Math.max(20, d.batteryPercent - 15) }
                  : d
              )
            );
            // If survey, create simulated map layer
            if (m.missionType === 'survey') {
              const layerId = `layer-drone-${Date.now()}`;
              const newLayer: MapLayer = {
                id: layerId,
                name: `Drone Survey: ${m.surveyArea?.name || 'Local Grid'} (Simulated)`,
                type: 'drone_survey',
                visible: true,
                isSimulated: true,
                source: `${m.droneName} LiDAR / Orthomosaic`,
                dataFreshness: 'Just compiled',
                timestamp: new Date().toISOString(),
                confidence: 0.99,
                featuresCount: 68,
              };
              setMapLayers((layers) => [newLayer, ...layers]);
            }
            addAudit('Complete Drone Mission', 'DroneMission', m.id, `${m.droneName} completed ${m.missionType} mission.`);
          }
          return {
            ...m,
            progress: newProgress,
            status: isFinished ? 'completed' : m.status,
            completedAt: isFinished ? new Date().toISOString() : m.completedAt,
          };
        }
        return m;
      })
    );
  };

  const publishAlert = async (alertData: Partial<Alert>) => {
    const newAlert: Alert = {
      id: `alt-${Date.now()}`,
      disasterType: alertData.disasterType || 'general',
      severity: alertData.severity || 'warning',
      title: alertData.title || 'EMERGENCY ADVISORY',
      message: alertData.message || 'Please follow instructions from emergency responders.',
      affectedArea: alertData.affectedArea || 'Regional Zone',
      recommendedActions: alertData.recommendedActions || ['Monitor updates'],
      source: `Official Command: ${currentUser.name}`,
      timestamp: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 6 * 3600 * 1000).toISOString(),
      confidence: 0.95,
      isOfficial: true,
      isModelEstimate: false,
      status: 'published',
      approvedBy: currentUser.name,
    };

    setAlerts((prev) => [newAlert, ...prev]);
    addAudit('Publish Official Emergency Alert', 'Alert', newAlert.id, `Broadcast alert "${newAlert.title}"`);
  };

  const createWildlifeCase = async (data: Partial<WildlifeRescueCase>) => {
    const id = `wlc-${String(wildlifeCases.length + 1).padStart(2, '0')}`;
    const newCase: WildlifeRescueCase = {
      id,
      species: data.species || 'Forest Wildlife',
      animalCount: data.animalCount || 1,
      location: data.location || { lat: 37.785, lng: -122.451, areaName: 'Upper Pine Ridge' },
      urgency: data.urgency || 'urgent',
      condition: data.condition || 'Trapped by advancing fireline.',
      status: 'reported',
      recommendedCorridor: data.recommendedCorridor || 'North Forest Trail Corridor (Azimuth 340°)',
      notes: data.notes || ['Case logged by wildlife response specialist.'],
      createdAt: new Date().toISOString(),
    };

    setWildlifeCases((prev) => [newCase, ...prev]);
    addAudit('Create Wildlife Rescue Case', 'WildlifeCase', id, `Logged ${newCase.animalCount}x ${newCase.species} in ${newCase.location.areaName}`);
  };

  const toggleMapLayer = (layerId: string) => {
    setMapLayers((prev) =>
      prev.map((l) => (l.id === layerId ? { ...l, visible: !l.visible } : l))
    );
  };

  const summarizeIncidentsWithAI = async (): Promise<string> => {
    try {
      const res = await fetch('/api/ai/summarize-incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activeIncidents: incidents }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.summary;
      }
    } catch {
      // fallback
    }
    return `### Operational Incident Cluster Summary\n- **Active Incidents**: ${incidents.length} total (${incidents.filter((i) => i.priority === 'critical').length} Critical).\n- **Primary Danger Zone**: Timber Ridge Lane attic entrapment (INC-2026-0102).\n- **Action Required**: Prioritize hydraulic extraction and verify passability of South Bypass.`;
  };

  const draftAlertWithAI = async (incidentType: string, area: string, severity: string, details: string) => {
    try {
      const res = await fetch('/api/ai/draft-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incidentType, area, severity, details }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // fallback
    }
    return {
      title: `MANDATORY WARNING: ${area.toUpperCase()}`,
      message: `Imminent ${incidentType} risk reported in ${area}. Evacuate immediately via designated open corridors.`,
      recommendedActions: [
        'Move to designated open shelter.',
        'Do not approach active firelines or flooded roadway crossings.',
        'Keep emergency supplies in vehicle.',
      ],
    };
  };

  const triggerSimulation = async (scenario: string) => {
    try {
      await fetch('/api/simulation/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario }),
      });
    } catch {
      // Continue local update
    }

    if (scenario === 'shelter_full') {
      updateShelterCapacity('shelter-a', 250, 'full');
    } else if (scenario === 'wildfire') {
      setActiveScenario('wildfire');
      publishAlert({
        disasterType: 'wildfire',
        severity: 'critical',
        title: 'SIMULATION: WILDFIRE FRONT ESCALATION',
        message: 'Timber Canyon fire front has accelerated south. Pine Ridge Gym (Shelter A) is full. Evacuate to Valley Civic Center (Shelter B).',
        affectedArea: 'West Ridge & Timber Canyon Corridors',
      });
    } else if (scenario === 'flood') {
      setActiveScenario('flood');
      publishAlert({
        disasterType: 'flood',
        severity: 'critical',
        title: 'SIMULATION: MILL CREEK DAM OVERWASH',
        message: 'Mill Creek basin flooded. Route 12 bridge impassable. Proceed to East River Regional Arena (Shelter D).',
        affectedArea: 'Mill Creek Lowlands',
      });
    } else if (scenario === 'trapped_person') {
      submitRescueRequest({
        reporterName: 'Marcus & Clara Wright',
        reporterPhone: '+1 (555) 776-9090',
        type: 'trapped',
        peopleCount: 4,
        hasMedicalEmergency: true,
        isTrapped: true,
        isInjured: false,
        description: 'Fallen burning oak tree blocked front exit. Smoke filtering into nursery on 2nd floor.',
        location: { lat: 37.773, lng: -122.438, address: '610 Timber Ridge Terrace' },
      });
    } else if (scenario === 'dispatch_team') {
      const pending = incidents.find((i) => !i.assignedTeamId);
      const team = rescueTeams.find((t) => t.status === 'available');
      if (pending && team) {
        assignRescueTeam(pending.id, team.id);
      }
    } else if (scenario === 'drone_delivery') {
      const drone = drones.find((d) => d.status === 'available' && d.type.includes('Relief'));
      const inc = incidents[0];
      if (drone && inc) {
        createReliefDelivery(drone.id, inc.id, 'Medical First Aid & Oxygen Canister', '2 Kits');
      }
    }
  };

  return (
    <EmergencyContext.Provider
      value={{
        currentUser,
        switchRole,
        appMode,
        setAppMode,
        isOnline,
        toggleConnectivity,
        lastSyncTime,
        userLocation,
        setUserLocation,
        // Live Location
        liveLocation,
        locationStatus,
        locationErrorDetail,
        isTrackingLocation,
        startLocationTracking,
        stopLocationTracking,
        isFollowMode,
        setIsFollowMode,
        recalculateThresholdMeters,
        setRecalculateThresholdMeters,
        showPermissionDialog,
        setShowPermissionDialog,
        requestLocationWithPrompt,
        confirmPermissionAndStartTracking,
        dismissPermissionPrompt,
        hazardWarningProximity,

        // Responders
        responderLocations,
        isSharingResponderLocation,
        toggleSharingResponderLocation,
        canViewResponders,

        // State and Region Partitioning
        selectedState,
        setSelectedState,
        selectedRegionId,
        setSelectedRegionId,

        activeScenario,
        setActiveScenario,
        shelters,
        hazards,
        roadBlockages,
        incidents,
        rescueTeams,
        drones,
        droneMissions,
        alerts,
        wildlifeCases,
        auditLogs,
        predictions,
        mapLayers,
        selectedIncident,
        setSelectedIncident,
        selectedShelter,
        setSelectedShelter,
        activeRoute,
        setActiveRoute,
        submitRescueRequest,
        updateIncidentStatus,
        assignRescueTeam,
        updateShelterCapacity,
        reportHazard,
        createDroneSurveyMission,
        createReliefDelivery,
        deployDroneToLocation,
        progressDroneMission,
        publishAlert,
        createWildlifeCase,
        toggleMapLayer,
        summarizeIncidentsWithAI,
        draftAlertWithAI,
        triggerSimulation,
        calculateShelterRoutes,
      }}
    >
      {children}
    </EmergencyContext.Provider>
  );
};

export const useEmergency = () => {
  const context = useContext(EmergencyContext);
  if (!context) {
    throw new Error('useEmergency must be used within an EmergencyProvider');
  }
  return context;
};

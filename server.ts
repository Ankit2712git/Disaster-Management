import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import {
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
  INITIAL_USERS,
} from './src/data/mockData.ts';
import {
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
  User,
} from './src/types.ts';

// In-memory persistent database for the prototype simulation
let shelters: Shelter[] = [...INITIAL_SHELTERS];
let hazards: HazardZone[] = [...INITIAL_HAZARDS];
let roadBlockages: RoadBlockage[] = [...INITIAL_ROAD_BLOCKAGES];
let incidents: Incident[] = [...INITIAL_INCIDENTS];
let rescueTeams: RescueTeam[] = [...INITIAL_RESCUE_TEAMS];
let drones: Drone[] = [...INITIAL_DRONES];
let droneMissions: DroneMission[] = [...INITIAL_DRONE_MISSIONS];
let alerts: Alert[] = [...INITIAL_ALERTS];
let wildlifeCases: WildlifeRescueCase[] = [...INITIAL_WILDLIFE_CASES];
let auditLogs: AuditLog[] = [...INITIAL_AUDIT_LOGS];
let predictions: FireSpreadPrediction[] = [...INITIAL_PREDICTIONS];
let mapLayers: MapLayer[] = [...INITIAL_MAP_LAYERS];
let currentUser: User = INITIAL_USERS[0];

function recordAudit(
  actor: string,
  actorRole: any,
  action: string,
  entityType: any,
  entityId: string,
  details: string
) {
  const log: AuditLog = {
    id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    actor,
    actorRole,
    action,
    entityType,
    entityId,
    details,
  };
  auditLogs.unshift(log);
  return log;
}

// Lazy Gemini API client
let genAIClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  if (!genAIClient && process.env.GEMINI_API_KEY) {
    try {
      genAIClient = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    } catch (err) {
      console.warn('Gemini client initialization warning:', err);
    }
  }
  return genAIClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // --- API ROUTES ---

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'operational',
      environment: 'ResQMap Emergency Grid Engine',
      timestamp: new Date().toISOString(),
      activeIncidents: incidents.filter((i) => i.status !== 'resolved').length,
    });
  });

  // Current session/role
  app.get('/api/me', (req, res) => {
    res.json(currentUser);
  });

  app.post('/api/auth/switch-role', (req, res) => {
    const { roleId } = req.body;
    const found = INITIAL_USERS.find((u) => u.id === roleId || u.role === roleId);
    if (found) {
      currentUser = found;
      recordAudit(
        currentUser.name,
        currentUser.role,
        'Role Switch',
        'Incident',
        'auth-session',
        `Switched active operator context to ${currentUser.name} (${currentUser.role})`
      );
      res.json(currentUser);
    } else {
      res.status(400).json({ error: 'User role not found' });
    }
  });

  // Shelters
  app.get('/api/shelters', (req, res) => {
    res.json(shelters);
  });

  app.patch('/api/shelters/:id/capacity', (req, res) => {
    const { id } = req.params;
    const { occupancy, status, reason } = req.body;
    const shelter = shelters.find((s) => s.id === id);
    if (!shelter) {
      return res.status(404).json({ error: 'Shelter not found' });
    }

    const prevOccupancy = shelter.currentOccupancy;
    const prevStatus = shelter.status;

    if (typeof occupancy === 'number') {
      shelter.currentOccupancy = occupancy;
    }
    if (status) {
      shelter.status = status;
    } else if (shelter.currentOccupancy >= shelter.capacity) {
      shelter.status = 'full';
    } else if (shelter.currentOccupancy >= shelter.capacity * 0.85) {
      shelter.status = 'nearly_full';
    } else {
      shelter.status = 'open';
    }
    shelter.lastUpdated = 'Just now';

    recordAudit(
      currentUser.name,
      currentUser.role,
      'Update Shelter Capacity',
      'Shelter',
      shelter.id,
      `${shelter.name}: Occupancy updated from ${prevOccupancy} to ${shelter.currentOccupancy}/${shelter.capacity} (Status: ${shelter.status}). ${reason || ''}`
    );

    res.json(shelter);
  });

  // Incidents
  app.get('/api/incidents', (req, res) => {
    // If civilian, only return incidents they filed (unless admin/responder)
    const isResponderOrCommander = ['responder', 'incident_commander', 'drone_operator', 'wildlife_rescue', 'admin'].includes(currentUser.role);
    if (isResponderOrCommander) {
      res.json(incidents);
    } else {
      // Civilian sees public summary and their own incidents
      const myIncidents = incidents.filter((i) => i.reporterUserId === currentUser.id || i.reporterName === currentUser.name);
      res.json(myIncidents);
    }
  });

  app.get('/api/incidents/:id', (req, res) => {
    const incident = incidents.find((i) => i.id === req.params.id);
    if (!incident) return res.status(404).json({ error: 'Incident not found' });
    res.json(incident);
  });

  app.post('/api/incidents', (req, res) => {
    const {
      type,
      location,
      peopleCount,
      hasMedicalEmergency,
      isTrapped,
      isInjured,
      description,
      reporterName,
      reporterPhone,
      mediaUrl,
    } = req.body;

    // Section 24: Never trust location values supplied by client - validate coordinates
    if (location) {
      const lat = Number(location.lat);
      const lng = Number(location.lng);
      if (isNaN(lat) || lat < -90 || lat > 90 || isNaN(lng) || lng < -180 || lng > 180) {
        return res.status(400).json({
          error: 'Invalid geographic coordinates. Latitude must be between -90 and 90, Longitude between -180 and 180.',
        });
      }
      if (location.accuracyMeters !== undefined) {
        const acc = Number(location.accuracyMeters);
        if (isNaN(acc) || acc < 0 || acc > 50000) {
          return res.status(400).json({ error: 'Invalid accuracy reading.' });
        }
      }
    }

    const id = `INC-${new Date().getFullYear()}-${String(incidents.length + 101).padStart(4, '0')}`;
    const now = new Date().toISOString();

    let calculatedPriority: 'critical' | 'high' | 'medium' | 'low' = 'medium';
    if (hasMedicalEmergency || (isTrapped && ['fire', 'flood', 'building_collapse'].includes(type))) {
      calculatedPriority = 'critical';
    } else if (isTrapped || isInjured || peopleCount > 3) {
      calculatedPriority = 'high';
    }

    const newIncident: Incident = {
      id,
      reporterUserId: currentUser.id,
      reporterName: reporterName || currentUser.name || 'Emergency Caller',
      reporterPhone: reporterPhone || '+1 (555) SOS-CALL',
      type: type || 'trapped',
      priority: calculatedPriority,
      status: 'received', // Server has received and confirmed
      location: location || { lat: 37.765, lng: -122.435, address: 'Reported GPS coordinate' },
      peopleCount: Number(peopleCount) || 1,
      hasMedicalEmergency: Boolean(hasMedicalEmergency),
      isTrapped: Boolean(isTrapped),
      isInjured: Boolean(isInjured),
      description: description || 'No additional narrative provided by civilian.',
      mediaUrl,
      createdAt: now,
      updatedAt: now,
      notes: [`${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - SOS transmitted via ResQMap Mobile and received by Emergency Operations Server.`],
      timeline: [
        {
          status: 'submitted',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          actor: reporterName || currentUser.name,
          note: 'Rescue request submitted from civilian device.',
        },
        {
          status: 'received',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          actor: 'ResQMap Dispatch Engine',
          note: `Verified incoming signal. Priority set to ${calculatedPriority.toUpperCase()}.`,
        },
      ],
    };

    incidents.unshift(newIncident);

    recordAudit(
      newIncident.reporterName,
      'civilian',
      'Submit Emergency Rescue Request',
      'Incident',
      newIncident.id,
      `SOS created at ${newIncident.location.address}: ${newIncident.peopleCount} people, ${newIncident.type}, Priority: ${newIncident.priority}`
    );

    res.status(201).json(newIncident);
  });

  app.patch('/api/incidents/:id', (req, res) => {
    const { id } = req.params;
    const { status, assignedTeamId, priority, note } = req.body;
    const incident = incidents.find((i) => i.id === id);
    if (!incident) return res.status(404).json({ error: 'Incident not found' });

    const now = new Date().toISOString();
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (assignedTeamId !== undefined) {
      const team = rescueTeams.find((t) => t.id === assignedTeamId);
      incident.assignedTeamId = assignedTeamId;
      incident.assignedTeamName = team?.name;
      if (team) {
        team.status = 'dispatched';
        team.currentIncidentId = incident.id;
      }
      incident.notes.push(`${timeStr} - Team ${team ? team.name : 'unassigned'} assigned by ${currentUser.name}.`);
      incident.timeline.push({
        status: 'assigned',
        timestamp: timeStr,
        actor: `${currentUser.name} (${currentUser.role})`,
        note: `Assigned to ${team ? team.name : 'Unknown Team'}.`,
      });
      if (incident.status === 'received' || incident.status === 'submitted') {
        incident.status = 'assigned';
      }
    }

    if (status && status !== incident.status) {
      const prevStatus = incident.status;
      incident.status = status;
      incident.timeline.push({
        status,
        timestamp: timeStr,
        actor: `${currentUser.name} (${currentUser.role})`,
        note: `Operational status updated to ${status.replace('_', ' ').toUpperCase()}.`,
      });
      incident.notes.push(`${timeStr} - Status changed from ${prevStatus} to ${status}.`);
    }

    if (priority) {
      incident.priority = priority;
    }

    if (note) {
      incident.notes.push(`${timeStr} - [${currentUser.name}]: ${note}`);
    }

    incident.updatedAt = now;

    recordAudit(
      currentUser.name,
      currentUser.role,
      'Update Incident',
      'Incident',
      incident.id,
      `Updated ${incident.id}: Status: ${incident.status}, Team: ${incident.assignedTeamName || 'None'}`
    );

    res.json(incident);
  });

  // Rescue Teams
  app.get('/api/teams', (req, res) => {
    res.json(rescueTeams);
  });

  // Drones & Drone Missions
  app.get('/api/drones', (req, res) => {
    res.json(drones);
  });

  app.get('/api/drone-missions', (req, res) => {
    res.json(droneMissions);
  });

  app.post('/api/drone-missions', (req, res) => {
    const { droneId, missionType, targetLocation, payload, surveyArea, operatorNotes } = req.body;
    const drone = drones.find((d) => d.id === droneId);
    if (!drone) return res.status(404).json({ error: 'Drone not found' });

    const missionId = `msn-${String(droneMissions.length + 1).padStart(2, '0')}`;
    const now = new Date().toISOString();

    const newMission: DroneMission = {
      id: missionId,
      droneId: drone.id,
      droneName: drone.name,
      missionType: missionType || 'survey',
      status: 'in_progress',
      progress: 5,
      targetLocation: targetLocation || drone.currentLocation,
      payload,
      surveyArea,
      startedAt: now,
      operatorNotes: operatorNotes || 'Mission initiated under simulated flight plan.',
    };

    drone.status = missionType === 'relief_delivery' ? 'delivering' : 'surveying';
    drone.currentMissionId = missionId;

    droneMissions.unshift(newMission);

    recordAudit(
      currentUser.name,
      currentUser.role,
      'Launch Drone Mission',
      'DroneMission',
      missionId,
      `Launched ${missionType} mission with ${drone.name} (${drone.type}). Target: ${targetLocation?.name || 'Assigned Coordinates'}`
    );

    res.status(201).json(newMission);
  });

  app.patch('/api/drone-missions/:id/progress', (req, res) => {
    const { id } = req.params;
    const { progress, status, generatedLayerName } = req.body;
    const mission = droneMissions.find((m) => m.id === id);
    if (!mission) return res.status(404).json({ error: 'Mission not found' });

    if (typeof progress === 'number') {
      mission.progress = Math.min(100, Math.max(0, progress));
    }
    if (status) {
      mission.status = status;
    }
    if (mission.progress >= 100) {
      mission.status = 'completed';
      mission.completedAt = new Date().toISOString();

      const drone = drones.find((d) => d.id === mission.droneId);
      if (drone) {
        drone.status = 'available';
        drone.batteryPercent = Math.max(15, drone.batteryPercent - 18);
        delete drone.currentMissionId;
      }

      // If survey mission completed, add a simulated GIS layer!
      if (mission.missionType === 'survey') {
        const layerId = `layer-drone-${Date.now()}`;
        const newLayer: MapLayer = {
          id: layerId,
          name: generatedLayerName || `Survey: ${mission.surveyArea?.name || 'Local Grid'} (Simulated)`,
          type: 'drone_survey',
          visible: true,
          isSimulated: true,
          source: `${mission.droneName} LiDAR/High-Res Telemetry`,
          dataFreshness: 'Just compiled',
          timestamp: new Date().toISOString(),
          confidence: 0.98,
          featuresCount: 56,
        };
        mapLayers.unshift(newLayer);
        mission.generatedLayerId = layerId;
      }

      recordAudit(
        currentUser.name,
        currentUser.role,
        'Complete Drone Mission',
        'DroneMission',
        mission.id,
        `${mission.missionType.toUpperCase()} mission completed by ${mission.droneName}.`
      );
    }

    res.json(mission);
  });

  // Alerts
  app.get('/api/alerts', (req, res) => {
    res.json(alerts);
  });

  app.post('/api/alerts', (req, res) => {
    const { disasterType, severity, title, message, affectedArea, recommendedActions, isOfficial, isModelEstimate } = req.body;
    const id = `alt-${String(alerts.length + 1).padStart(2, '0')}`;
    const now = new Date().toISOString();
    const expiry = new Date(Date.now() + 6 * 3600 * 1000).toISOString();

    const newAlert: Alert = {
      id,
      disasterType: disasterType || 'general',
      severity: severity || 'warning',
      title: title || 'EMERGENCY DISASTER ADVISORY',
      message: message || 'Please follow official safety guidelines.',
      affectedArea: affectedArea || 'General Area',
      recommendedActions: recommendedActions || ['Stay alert to updates'],
      source: isOfficial ? `Official Command Notice (${currentUser.name})` : 'Simulated Model Advisory',
      timestamp: now,
      expiresAt: expiry,
      confidence: 0.92,
      isOfficial: Boolean(isOfficial),
      isModelEstimate: Boolean(isModelEstimate),
      status: 'published',
      approvedBy: currentUser.name,
    };

    alerts.unshift(newAlert);

    recordAudit(
      currentUser.name,
      currentUser.role,
      'Publish Emergency Alert',
      'Alert',
      newAlert.id,
      `Published [${newAlert.severity.toUpperCase()}] "${newAlert.title}" for ${newAlert.affectedArea}`
    );

    res.status(201).json(newAlert);
  });

  // Hazards & Blockages
  app.get('/api/hazards', (req, res) => {
    res.json({
      hazards,
      roadBlockages,
      mapLayers,
    });
  });

  app.post('/api/hazards/report', (req, res) => {
    const { name, location, hazardType, notes } = req.body;
    const newBlockage: RoadBlockage = {
      id: `rb-${Date.now()}`,
      name: name || 'Reported Road Obstacle',
      location: location || { lat: 37.765, lng: -122.435 },
      hazardType: hazardType || 'Hazard / Blockage reported by field observer',
      status: 'blocked',
      reportedAt: 'Just now',
      notes,
    };
    roadBlockages.push(newBlockage);

    recordAudit(
      currentUser.name,
      currentUser.role,
      'Report Hazard',
      'HazardZone',
      newBlockage.id,
      `Field hazard reported at ${newBlockage.name}: ${newBlockage.hazardType}`
    );

    res.status(201).json(newBlockage);
  });

  // Wildlife Cases
  app.get('/api/wildlife', (req, res) => {
    res.json(wildlifeCases);
  });

  app.post('/api/wildlife', (req, res) => {
    const { species, animalCount, location, urgency, condition, recommendedCorridor, notes } = req.body;
    const id = `wlc-${String(wildlifeCases.length + 1).padStart(2, '0')}`;

    const newCase: WildlifeRescueCase = {
      id,
      species: species || 'Unknown Wildlife Species',
      animalCount: Number(animalCount) || 1,
      location: location || { lat: 37.785, lng: -122.455, areaName: 'Forestry Sector' },
      urgency: urgency || 'urgent',
      condition: condition || 'Trapped in smoke/hazard zone.',
      status: 'reported',
      recommendedCorridor: recommendedCorridor || 'Recommended North Forest Trail Corridor (Azimuth 340°)',
      notes: notes ? [notes] : ['Case created. Awaiting extraction team dispatch.'],
      createdAt: new Date().toISOString(),
    };

    wildlifeCases.unshift(newCase);

    recordAudit(
      currentUser.name,
      currentUser.role,
      'Create Wildlife Rescue Case',
      'WildlifeCase',
      newCase.id,
      `Reported ${newCase.animalCount}x ${newCase.species} in ${newCase.location.areaName} (${newCase.urgency})`
    );

    res.status(201).json(newCase);
  });

  // Predictions
  app.get('/api/predictions/fire-spread', (req, res) => {
    res.json(predictions);
  });

  // Audit Logs
  app.get('/api/audit-logs', (req, res) => {
    res.json(auditLogs);
  });

  // --- AI DECISION SUPPORT ENDPOINTS (Server-Side Gemini Integration) ---

  // 1. Incident Cluster Summarization
  app.post('/api/ai/summarize-incidents', async (req, res) => {
    const { activeIncidents } = req.body;
    const incidentData = activeIncidents || incidents;

    const ai = getGenAI();
    if (ai) {
      try {
        const prompt = `You are the ResQMap Emergency AI Incident Assistant.
Analyze these current disaster incidents and provide a structured operational summary for the Incident Commander:
${JSON.stringify(
  incidentData.map((i: any) => ({
    id: i.id,
    type: i.type,
    priority: i.priority,
    location: i.location,
    peopleCount: i.peopleCount,
    hasMedicalEmergency: i.hasMedicalEmergency,
    isTrapped: i.isTrapped,
    status: i.status,
    assignedTeam: i.assignedTeamName,
  })),
  null,
  2
)}

Strict Safety Rules:
- Clearly label this as an AI Decision-Support Summary.
- Highlight critical clusters where life safety is imminent.
- Identify any missing triage information (e.g., unknown ages, exact floor).
- Recommend immediate operational priorities for human commanders to review.
- Never claim 100% certainty.

Return clear, professional, concise bullet points formatted with markdown.`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
        });

        const summaryText = response.text || 'Summary unavailable.';
        return res.json({
          summary: summaryText,
          timestamp: new Date().toISOString(),
          modelVersion: 'gemini-3.8-flash',
          requiresHumanApproval: true,
          isAiGenerated: true,
        });
      } catch (err: any) {
        console.warn('Gemini API call failed, falling back to heuristic summary:', err.message);
      }
    }

    // Heuristic fallback
    const criticalCount = incidentData.filter((i: any) => i.priority === 'critical').length;
    const trappedPeople = incidentData
      .filter((i: any) => i.isTrapped)
      .reduce((sum: number, i: any) => sum + (i.peopleCount || 1), 0);

    res.json({
      summary: `### Operational Situation Summary (Decision-Support Heuristic)
- **Immediate Threat Level**: ${criticalCount} critical incidents active across Timber Canyon and Mill Creek corridors.
- **Life Safety Triage**: Approximately ${trappedPeople} civilians reported trapped in structures or rising waters.
- **Top Priority Target**: INC-2026-0102 (Attic trap near fire perimeter, medical emergency). Team Alpha is dispatched.
- **Missing Information**: Building layout and structural collapse risks require field visual verification by aerial reconnaissance or thermal sensor.
- **Notice**: Model estimate for operational support. Human authorized approval required for all deployments.`,
      timestamp: new Date().toISOString(),
      modelVersion: 'ResQMap-Heuristic-Triage-v2.1',
      requiresHumanApproval: true,
      isAiGenerated: false,
    });
  });

  // 2. Shelter Recommendation Explanation
  app.post('/api/ai/explain-recommendation', async (req, res) => {
    const { origin, recommendedShelter, alternativeShelter, hazardsReported } = req.body;

    const ai = getGenAI();
    if (ai) {
      try {
        const prompt = `You are the ResQMap Emergency Shelter Routing Assistant.
Explain to a stressed civilian why Shelter "${recommendedShelter?.name}" was chosen over Shelter "${alternativeShelter?.name}":
- Recommended Shelter Status: ${recommendedShelter?.status}, Occupancy: ${recommendedShelter?.currentOccupancy}/${recommendedShelter?.capacity}
- Alternative Shelter Status: ${alternativeShelter?.status}, Occupancy: ${alternativeShelter?.currentOccupancy}/${alternativeShelter?.capacity}
- Reported hazards: ${JSON.stringify(hazardsReported)}

Write a calm, reassuring 2-sentence explanation emphasizing safe capacity and avoidance of impassable routes.
Adhere strictly to safety rule: Do NOT use "100% safe". Use "Recommended route based on available hazard data".`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
        });

        return res.json({
          explanation: response.text,
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        console.warn('Gemini explain error:', err);
      }
    }

    // Heuristic fallback
    let fallback = '';
    if (alternativeShelter?.status === 'full') {
      fallback = `${alternativeShelter.name} is closer, but it has reached 100% maximum capacity. We recommend ${recommendedShelter?.name} because it has verified available beds and avoids reported electrical hazards on the main avenue.`;
    } else {
      fallback = `Recommended ${recommendedShelter?.name} based on verified operational capacity and currently clear access corridors.`;
    }

    res.json({
      explanation: fallback,
      timestamp: new Date().toISOString(),
    });
  });

  // 3. Draft Emergency Alert
  app.post('/api/ai/draft-alert', async (req, res) => {
    const { incidentType, area, severity, details } = req.body;

    const ai = getGenAI();
    if (ai) {
      try {
        const prompt = `Draft a concise, official public emergency warning alert for the Incident Commander to review:
Disaster Type: ${incidentType}
Affected Area: ${area}
Severity: ${severity}
Key Details: ${details}

Return JSON with:
{
  "title": "Short punchy uppercase title",
  "message": "Clear 2-sentence public warning with what is happening",
  "recommendedActions": ["Action 1", "Action 2", "Action 3"]
}`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        });

        const parsed = JSON.parse(response.text || '{}');
        return res.json(parsed);
      } catch (err) {
        console.warn('Gemini alert drafting error:', err);
      }
    }

    // Heuristic fallback
    res.json({
      title: `${(severity || 'WARNING').toUpperCase()}: ${area.toUpperCase()}`,
      message: `${incidentType.toUpperCase()} conditions reported near ${area}. Emergency crews are operating in this sector. Evacuate via south access corridors.`,
      recommendedActions: [
        'Do not drive across flooded or smoke-covered roadways.',
        'Proceed immediately to designated operational shelters.',
        'Keep mobile battery charged and monitor ResQMap alerts.',
      ],
    });
  });

  // 4. Custom Tactical Decision Support Query
  app.post('/api/ai/decision-support', async (req, res) => {
    const { prompt } = req.body;
    const ai = getGenAI();

    const liveContext = {
      activeDisaster: 'Wildfire (Timber Ridge) & Mill Creek Flash Flood',
      shelters: shelters.map((s) => ({
        name: s.name,
        capacity: s.capacity,
        occupancy: s.currentOccupancy,
        status: s.status,
      })),
      incidentsSummary: {
        total: incidents.length,
        critical: incidents.filter((i) => i.priority === 'critical').length,
        unassigned: incidents.filter((i) => !i.assignedTeamId && i.status !== 'resolved').length,
      },
      roadBlockages: roadBlockages.map((b) => ({ name: b.name, status: b.status })),
      droneFleet: drones.map((d) => ({ name: d.name, status: d.status, battery: d.batteryPercent })),
    };

    if (ai) {
      try {
        const fullPrompt = `You are the ResQMap Emergency Decision-Support AI operating for Incident Command.
Live Operational Context:
${JSON.stringify(liveContext, null, 2)}

Commander Inquiry:
"${prompt}"

Strict Protocol & Safety Rules:
1. Provide actionable, concise tactical advice (max 4-5 bullet points).
2. Clearly distinguish verified data from model projections.
3. Recommend human commander verification for all critical moves.
4. If Shelter A is mentioned, note that its capacity is at 100% and direct traffic to Shelter B (Valley Civic Center) or Shelter C.
5. Emphasize life-safety first (avoiding active fire fronts and flooded roadway dips).`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: fullPrompt,
        });

        return res.json({
          recommendation: response.text,
          modelVersion: 'gemini-3.8-flash',
          timestamp: new Date().toISOString(),
        });
      } catch (err: any) {
        console.warn('Gemini decision-support call error, using fallback:', err.message);
      }
    }

    // Heuristic intelligent fallback
    let fallbackText = '';
    if (prompt.toLowerCase().includes('shelter a') || prompt.toLowerCase().includes('capacity') || prompt.toLowerCase().includes('load')) {
      fallbackText = `### Tactical Shelter Load-Balancing Directive
- **Capacity Assessment**: Pine Ridge Gym (Shelter A) has reached 250/250 (100% maximum capacity).
- **Reroute Mandate**: Immediately divert upcoming traffic towards Valley Civic Community Center (Shelter B) located 2.1 km south (verified 175 beds remaining) and South Sector High School (Shelter C, 220 beds remaining).
- **Traffic Control**: Deploy auxiliary warning signs at Mile Marker 14 on North Ridge Way to prevent gridlock outside Shelter A.
- **Logistics**: Request emergency cot transfers from county reserve warehouse to Shelter B to support incoming surge.`;
    } else if (prompt.toLowerCase().includes('fire') || prompt.toLowerCase().includes('spread')) {
      fallbackText = `### Fire Spread & Recon Strategy
- **Perimeter Dynamic**: Active fire front advancing at 18 km/h driven by NW gusts. 3-hour spread model predicts containment breach near East Ridge.
- **Evacuation Corridor**: Keep Timber Valley Highway designated as one-way outbound south. Ensure North Ridge Way remains closed.
- **Aerial Recon**: Deploy Recon Drone 01 for continuous thermal infrared sweeps over Grid Quadrant 4 to locate trapped vehicles before smoke density peaks.
- **Commander Action**: Issue Level 3 (Go Now) evacuation order for residents within 1.5 km of the southeastern perimeter.`;
    } else {
      fallbackText = `### Tactical Decision-Support Assessment
- **Triage Priority**: Prioritize INC-2026-0102 (Family of 4 trapped on 2nd floor with advancing smoke). Team Alpha is recommended for rapid hydraulic ladder deployment.
- **Shelter Coordination**: Ensure all arriving evacuees are routed away from Shelter A (currently at maximum capacity) and towards Shelter B.
- **Secondary Hazards**: High voltage line reported down at Creek Road intersection; instruct all responder vehicles to use Highway 12 Bypass.
- **Operational Oversight**: Review team status and confirm mesh radio links remain active in sector 4.`;
    }

    res.json({
      recommendation: fallbackText,
      modelVersion: 'ResQMap-Tactical-Heuristic-v2.1',
      timestamp: new Date().toISOString(),
    });
  });

  // --- SIMULATION TRIGGER ENDPOINTS (DEMO SCENARIOS) ---
  app.post('/api/simulation/trigger', (req, res) => {
    const { scenario } = req.body;

    switch (scenario) {
      case 'wildfire':
        alerts.unshift({
          id: `alt-sim-${Date.now()}`,
          disasterType: 'wildfire',
          severity: 'critical',
          title: 'SIMULATION: RAPID WILDFIRE SPREAD',
          message: 'Timber Canyon fire perimeter has breached fireline Ridge 4. Fast-moving wind gusts to 35 km/h.',
          affectedArea: 'West Ridge & Timberline Sector',
          recommendedActions: ['Evacuate to Valley Civic Center (Shelter B) immediately.', 'Shelter A is full.'],
          source: 'Simulated Disaster Feed (DEMO)',
          timestamp: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
          confidence: 0.95,
          isOfficial: true,
          isModelEstimate: false,
          status: 'published',
          approvedBy: 'Demo Orchestrator',
        });
        break;

      case 'flood':
        alerts.unshift({
          id: `alt-sim-${Date.now()}`,
          disasterType: 'flood',
          severity: 'critical',
          title: 'SIMULATION: FLASH FLOOD EMERGENCY',
          message: 'Mill Creek dam release overflow. Water rising 15cm every 10 minutes.',
          affectedArea: 'Lower Valley River Road Basin',
          recommendedActions: ['Move to higher ground.', 'Do not enter flood waters.'],
          source: 'Hydrologic Sensor Network (DEMO)',
          timestamp: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 6 * 3600 * 1000).toISOString(),
          confidence: 0.9,
          isOfficial: true,
          isModelEstimate: false,
          status: 'published',
        });
        break;

      case 'shelter_full': {
        const shelterA = shelters.find((s) => s.id === 'shelter-a');
        if (shelterA) {
          shelterA.currentOccupancy = shelterA.capacity;
          shelterA.status = 'full';
          shelterA.lastUpdated = 'Just now (Simulated)';
          recordAudit('Simulator', 'admin', 'Trigger Shelter Full', 'Shelter', shelterA.id, 'Simulated capacity saturation at Pine Ridge Gym.');
        }
        break;
      }

      case 'trapped_person': {
        const newInc: Incident = {
          id: `INC-SIM-${Date.now().toString().slice(-4)}`,
          reporterName: 'Maria Santos',
          reporterPhone: '+1 (555) 303-9911',
          type: 'trapped',
          priority: 'critical',
          status: 'received',
          location: { lat: 37.772, lng: -122.438, address: '512 Alpine Ridge Road' },
          peopleCount: 4,
          hasMedicalEmergency: true,
          isTrapped: true,
          isInjured: false,
          description: 'Flash fire cutoff driveway. Smoke filling ground floor. 4 occupants sheltered in garage with wet towels.',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          notes: ['Simulated emergency request created.'],
          timeline: [
            {
              status: 'submitted',
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              actor: 'Maria Santos (Simulated)',
              note: 'Urgent SOS submitted.',
            },
            {
              status: 'received',
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              actor: 'ResQMap Server',
              note: 'Simulated SOS ingested.',
            },
          ],
        };
        incidents.unshift(newInc);
        recordAudit('Simulator', 'admin', 'Simulate Trapped Person SOS', 'Incident', newInc.id, 'Injected trapped civilian scenario.');
        break;
      }

      case 'dispatch_team': {
        const unassignedInc = incidents.find((i) => !i.assignedTeamId && i.status !== 'resolved');
        const availableTeam = rescueTeams.find((t) => t.status === 'available');
        if (unassignedInc && availableTeam) {
          unassignedInc.assignedTeamId = availableTeam.id;
          unassignedInc.assignedTeamName = availableTeam.name;
          unassignedInc.status = 'assigned';
          availableTeam.status = 'dispatched';
          availableTeam.currentIncidentId = unassignedInc.id;
          recordAudit('Simulator', 'incident_commander', 'Simulate Team Dispatch', 'Incident', unassignedInc.id, `Dispatched ${availableTeam.name}.`);
        }
        break;
      }
    }

    res.json({ success: true, scenario, timestamp: new Date().toISOString() });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ResQMap Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start ResQMap server:', err);
});

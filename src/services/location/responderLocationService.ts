import { RescueTeam, UserRole } from '../../types';

export interface ResponderLiveLocation {
  teamId: string;
  teamName: string;
  specialization: 'Search & Rescue' | 'Medical First Response' | 'Fire Evacuation' | 'Water Rescue' | 'Wildlife Rescue';
  icon: string;
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  status: 'online' | 'dispatched' | 'on_scene' | 'returning' | 'available';
  updatedAt: string;
  headingDegrees?: number;
  speedKmh?: number;
  assignedIncidentId?: string;
  lastReportSecondsAgo?: number;
}

export interface RealtimeLocationService {
  start(): void;
  stop(): void;
  getLocations(): ResponderLiveLocation[];
  subscribe(callback: (locations: ResponderLiveLocation[]) => void): () => void;
  updateMyResponderLocation(teamId: string, lat: number, lng: number, status?: string): void;
}

/**
 * Checks if a given user role is authorized to view sensitive responder live locations.
 * Non-authorized roles (e.g. civilian / public) are strictly restricted from tracking operational units.
 */
export function canViewResponderLocations(role?: UserRole): boolean {
  if (!role) return false;
  return ['responder', 'incident_commander', 'drone_operator', 'wildlife_rescue', 'admin'].includes(role);
}

const INITIAL_RESPONDERS: ResponderLiveLocation[] = [
  {
    teamId: 'team-ndrf-01',
    teamName: 'NDRF 8th Battalion Alpha',
    specialization: 'Search & Rescue',
    icon: '🚑',
    latitude: 28.6690,
    longitude: 77.2350,
    accuracyMeters: 6,
    status: 'dispatched',
    updatedAt: new Date().toISOString(),
    headingDegrees: 140,
    speedKmh: 28,
    assignedIncidentId: 'INC-2026-0101',
  },
  {
    teamId: 'team-fire-02',
    teamName: 'Delhi Fire Service Tactical Bravo',
    specialization: 'Fire Evacuation',
    icon: '🚒',
    latitude: 28.6620,
    longitude: 77.2480,
    accuracyMeters: 8,
    status: 'on_scene',
    updatedAt: new Date().toISOString(),
    headingDegrees: 90,
    speedKmh: 0,
    assignedIncidentId: 'INC-2026-0102',
  },
  {
    teamId: 'team-water-03',
    teamName: 'Yamuna Flood Water Rescue Charlie',
    specialization: 'Water Rescue',
    icon: '🛟',
    latitude: 28.6750,
    longitude: 77.2390,
    accuracyMeters: 5,
    status: 'online',
    updatedAt: new Date().toISOString(),
    headingDegrees: 195,
    speedKmh: 14,
  },
  {
    teamId: 'team-wildlife-04',
    teamName: 'Wildlife SOS Disaster Mobile Unit',
    specialization: 'Wildlife Rescue',
    icon: '🐾',
    latitude: 28.6580,
    longitude: 77.2300,
    accuracyMeters: 10,
    status: 'available',
    updatedAt: new Date().toISOString(),
    headingDegrees: 45,
    speedKmh: 18,
  },
];

/**
 * MockRealtimeLocationService simulates responder live movements and updates,
 * structured to plug into WebSockets or Server-Sent Events in production.
 */
export class MockRealtimeLocationService implements RealtimeLocationService {
  private responders: ResponderLiveLocation[] = [...INITIAL_RESPONDERS];
  private timer: any = null;
  private subscribers: Set<(locations: ResponderLiveLocation[]) => void> = new Set();
  private isRunning = false;

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    // Simulate realistic responder movement tick every 4 seconds
    this.timer = setInterval(() => {
      this.simulateMovementTick();
    }, 4000);
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
  }

  public getLocations(): ResponderLiveLocation[] {
    return [...this.responders];
  }

  public subscribe(callback: (locations: ResponderLiveLocation[]) => void): () => void {
    this.subscribers.add(callback);
    callback([...this.responders]);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  public updateMyResponderLocation(teamId: string, lat: number, lng: number, status?: string): void {
    const idx = this.responders.findIndex((r) => r.teamId === teamId);
    const now = new Date().toISOString();
    if (idx !== -1) {
      this.responders[idx] = {
        ...this.responders[idx],
        latitude: lat,
        longitude: lng,
        status: (status as any) || this.responders[idx].status,
        updatedAt: now,
      };
    } else {
      this.responders.push({
        teamId,
        teamName: `Rescue Unit ${teamId}`,
        specialization: 'Search & Rescue',
        icon: '🚑',
        latitude: lat,
        longitude: lng,
        accuracyMeters: 8,
        status: (status as any) || 'online',
        updatedAt: now,
        speedKmh: 20,
      });
    }
    this.notifySubscribers();
  }

  public seedFromTeams(teams: RescueTeam[], baseLat = 28.6653, baseLng = 77.2410): void {
    if (!teams || teams.length === 0) return;
    this.responders = teams.map((t, i) => {
      let icon = '🚑';
      if (t.specialization === 'Fire Evacuation') icon = '🚒';
      else if (t.specialization === 'Water Rescue') icon = '🛟';
      else if (t.specialization === 'Wildlife Rescue') icon = '🐾';
      else if (t.specialization === 'Medical First Response') icon = '🩺';

      const angle = (i * (360 / teams.length) * Math.PI) / 180;
      const lat = baseLat + Math.sin(angle) * 0.015;
      const lng = baseLng + Math.cos(angle) * 0.015;

      return {
        teamId: t.id,
        teamName: t.name,
        specialization: t.specialization,
        icon,
        latitude: Number(lat.toFixed(5)),
        longitude: Number(lng.toFixed(5)),
        accuracyMeters: 6 + (i % 5),
        status: (t.status === 'dispatched' ? 'dispatched' : t.status === 'on_scene' ? 'on_scene' : 'online') as any,
        updatedAt: new Date().toISOString(),
        headingDegrees: Math.floor(Math.random() * 360),
        speedKmh: t.status === 'on_scene' ? 0 : 25 + Math.floor(Math.random() * 15),
        assignedIncidentId: t.currentIncidentId,
      };
    });
    this.notifySubscribers();
  }

  private simulateMovementTick(): void {
    const now = new Date();
    this.responders = this.responders.map((resp) => {
      // If team is on scene, no movement
      if (resp.status === 'on_scene') {
        return {
          ...resp,
          updatedAt: now.toISOString(),
        };
      }

      // Small jitter/vector movement
      const dLat = (Math.random() - 0.48) * 0.0004;
      const dLng = (Math.random() - 0.48) * 0.0004;
      const newLat = Number((resp.latitude + dLat).toFixed(5));
      const newLng = Number((resp.longitude + dLng).toFixed(5));
      const newHeading = Math.round((Math.atan2(dLng, dLat) * 180) / Math.PI + 360) % 360;

      return {
        ...resp,
        latitude: newLat,
        longitude: newLng,
        headingDegrees: newHeading,
        updatedAt: now.toISOString(),
      };
    });

    this.notifySubscribers();
  }

  private notifySubscribers(): void {
    const copy = [...this.responders];
    this.subscribers.forEach((cb) => {
      try {
        cb(copy);
      } catch (err) {
        console.error('Responder location subscriber error:', err);
      }
    });
  }
}

export const mockRealtimeLocationService = new MockRealtimeLocationService();

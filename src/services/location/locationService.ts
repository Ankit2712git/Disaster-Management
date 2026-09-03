/**
 * ResQMap Browser Location Service
 * Implements real-time continuous user location tracking using the browser Geolocation API
 * (navigator.geolocation.watchPosition) with high battery efficiency and robust error handling.
 */

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

export interface LocationErrorDetail {
  code: 'PERMISSION_DENIED' | 'POSITION_UNAVAILABLE' | 'TIMEOUT' | 'UNKNOWN_ERROR';
  message: string;
  originalError?: GeolocationPositionError;
}

export interface LocationService {
  startTracking(): void;
  stopTracking(): void;
  getCurrentLocation(): LocationData | null;
  getStatus(): LocationStatus;
  subscribe(callback: (location: LocationData) => void): () => void;
  subscribeStatus(callback: (status: LocationStatus, error?: LocationErrorDetail | null) => void): () => void;
}

/**
 * Validates latitude (-90 to +90) and longitude (-180 to +180)
 */
export function isValidCoordinate(latitude: number, longitude: number): boolean {
  if (typeof latitude !== 'number' || typeof longitude !== 'number') return false;
  if (isNaN(latitude) || isNaN(longitude)) return false;
  return latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
}

/**
 * Threshold for flagging low accuracy (in meters)
 */
export const LOW_ACCURACY_THRESHOLD_METERS = 50;

/**
 * Browser implementation of LocationService using navigator.geolocation.watchPosition
 */
export class BrowserLocationService implements LocationService {
  private watchId: number | null = null;
  private currentLocation: LocationData | null = null;
  private status: LocationStatus = 'STOPPED';
  private lastError: LocationErrorDetail | null = null;
  private subscribers: Set<(location: LocationData) => void> = new Set();
  private statusSubscribers: Set<(status: LocationStatus, error?: LocationErrorDetail | null) => void> = new Set();

  private onlineHandler: () => void;
  private offlineHandler: () => void;

  constructor() {
    this.onlineHandler = () => {
      if (this.watchId !== null) {
        this.setStatus(this.currentLocation ? (this.currentLocation.accuracyMeters > LOW_ACCURACY_THRESHOLD_METERS ? 'LOW ACCURACY' : 'LOCATION ACTIVE') : 'LOCATING');
      }
    };
    this.offlineHandler = () => {
      if (this.watchId !== null) {
        this.setStatus('OFFLINE');
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.onlineHandler);
      window.addEventListener('offline', this.offlineHandler);
    }
  }

  public getStatus(): LocationStatus {
    return this.status;
  }

  public getLastError(): LocationErrorDetail | null {
    return this.lastError;
  }

  public getCurrentLocation(): LocationData | null {
    return this.currentLocation;
  }

  public startTracking(): void {
    if (this.watchId !== null) {
      // Already tracking
      return;
    }

    if (typeof window === 'undefined' || !navigator.geolocation) {
      this.lastError = {
        code: 'POSITION_UNAVAILABLE',
        message: 'Geolocation is not supported by your browser or device.',
      };
      this.setStatus('LOCATION UNAVAILABLE', this.lastError);
      return;
    }

    if (!navigator.onLine) {
      this.setStatus('OFFLINE');
    } else {
      this.setStatus('LOCATING');
    }

    // Geolocation options balancing accuracy, battery, and emergency responsiveness
    const options: PositionOptions = {
      enableHighAccuracy: true,
      maximumAge: 5000, // 5 seconds cache freshness
      timeout: 10000,   // 10 seconds timeout
    };

    this.watchId = navigator.geolocation.watchPosition(
      (position: GeolocationPosition) => this.handleSuccess(position),
      (error: GeolocationPositionError) => this.handleError(error),
      options
    );
  }

  public stopTracking(): void {
    if (this.watchId !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.setStatus('STOPPED');
  }

  public subscribe(callback: (location: LocationData) => void): () => void {
    this.subscribers.add(callback);
    // Immediately deliver current location if available
    if (this.currentLocation) {
      try {
        callback(this.currentLocation);
      } catch (e) {
        console.error('Error in location subscriber callback:', e);
      }
    }
    return () => {
      this.subscribers.delete(callback);
    };
  }

  public subscribeStatus(callback: (status: LocationStatus, error?: LocationErrorDetail | null) => void): () => void {
    this.statusSubscribers.add(callback);
    callback(this.status, this.lastError);
    return () => {
      this.statusSubscribers.delete(callback);
    };
  }

  private handleSuccess(position: GeolocationPosition): void {
    const { latitude, longitude, accuracy, altitude, speed, heading } = position.coords;

    // Validate coordinates
    if (!isValidCoordinate(latitude, longitude)) {
      console.warn('Rejected invalid GPS coordinate:', latitude, longitude);
      return;
    }

    const locData: LocationData = {
      latitude: Number(latitude.toFixed(6)),
      longitude: Number(longitude.toFixed(6)),
      accuracyMeters: Math.round(accuracy || 10),
      altitudeMeters: altitude !== null && altitude !== undefined ? Number(altitude.toFixed(1)) : null,
      speedMetersPerSecond: speed !== null && speed !== undefined ? Number(speed.toFixed(1)) : null,
      headingDegrees: heading !== null && heading !== undefined ? Number(heading.toFixed(0)) : null,
      timestamp: position.timestamp || Date.now(),
    };

    this.currentLocation = locData;
    this.lastError = null;

    // Check accuracy
    if (locData.accuracyMeters > LOW_ACCURACY_THRESHOLD_METERS) {
      this.setStatus('LOW ACCURACY');
    } else {
      this.setStatus('LOCATION ACTIVE');
    }

    // Notify subscribers
    this.subscribers.forEach((cb) => {
      try {
        cb(locData);
      } catch (err) {
        console.error('Subscriber callback error:', err);
      }
    });
  }

  private handleError(error: GeolocationPositionError): void {
    let code: LocationErrorDetail['code'] = 'UNKNOWN_ERROR';
    let message = 'An unknown location error occurred.';

    switch (error.code) {
      case error.PERMISSION_DENIED:
        code = 'PERMISSION_DENIED';
        message = 'Location access is unavailable. Location permission was denied. You can select your location manually.';
        this.setStatus('PERMISSION DENIED', { code, message, originalError: error });
        break;
      case error.POSITION_UNAVAILABLE:
        code = 'POSITION_UNAVAILABLE';
        message = 'Your device could not determine your location. Please check GPS reception or select manually.';
        this.setStatus('LOCATION UNAVAILABLE', { code, message, originalError: error });
        break;
      case error.TIMEOUT:
        code = 'TIMEOUT';
        message = 'Location detection is taking longer than expected. Please wait or pick your location manually.';
        // If we already have a previous fix, keep it but warn; otherwise mark as unavailable
        if (!this.currentLocation) {
          this.setStatus('LOCATION UNAVAILABLE', { code, message, originalError: error });
        }
        break;
      default:
        this.setStatus('LOCATION UNAVAILABLE', { code, message, originalError: error });
    }

    this.lastError = { code, message, originalError: error };
  }

  private setStatus(newStatus: LocationStatus, error: LocationErrorDetail | null = null): void {
    this.status = newStatus;
    if (error !== undefined) {
      this.lastError = error;
    }
    this.statusSubscribers.forEach((cb) => {
      try {
        cb(newStatus, this.lastError);
      } catch (err) {
        console.error('Status subscriber callback error:', err);
      }
    });
  }

  public destroy(): void {
    this.stopTracking();
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.onlineHandler);
      window.removeEventListener('offline', this.offlineHandler);
    }
    this.subscribers.clear();
    this.statusSubscribers.clear();
  }
}

// Singleton browser location service instance for application-wide consumption
export const browserLocationService = new BrowserLocationService();

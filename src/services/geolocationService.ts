export interface LocationResult {
  lat: number;
  lng: number;
  address: string;
  accuracy?: number;
  source: 'gps' | 'ip' | 'preset' | 'manual';
  timestamp: number;
}

export interface LocationErrorDetail {
  code?: number;
  message: string;
  isIframeBlocked?: boolean;
  isPermissionDenied?: boolean;
  isTimeout?: boolean;
}

// Popular disaster locations in India for quick fallback & search
export const POPULAR_INDIAN_LOCATIONS = [
  { name: 'Delhi - Yamuna River Basin (Old Bridge)', state: 'Delhi', lat: 28.6653, lng: 77.2410 },
  { name: 'Delhi - Kashmiri Gate ISBT', state: 'Delhi', lat: 28.6675, lng: 77.2285 },
  { name: 'Delhi - Mayur Vihar Relief Camp', state: 'Delhi', lat: 28.5985, lng: 77.2980 },
  { name: 'Wayanad - Meppadi Landslide Zone', state: 'Kerala', lat: 11.5540, lng: 76.1280 },
  { name: 'Wayanad - Chooralmala Bridge', state: 'Kerala', lat: 11.5160, lng: 76.1720 },
  { name: 'Mumbai - Mithi River BKC Corridor', state: 'Maharashtra', lat: 19.0657, lng: 72.8686 },
  { name: 'Mumbai - Kurla Flood Zone', state: 'Maharashtra', lat: 19.0726, lng: 72.8845 },
  { name: 'Puri - Coastal Cyclone Corridor', state: 'Odisha', lat: 19.8135, lng: 85.8312 },
  { name: 'Bhubaneswar - SDMA HQ', state: 'Odisha', lat: 20.2961, lng: 85.8245 },
  { name: 'Uttarkashi - Dharasu Cloudburst Sector', state: 'Uttarakhand', lat: 30.7268, lng: 78.4354 },
  { name: 'Guwahati - Brahmaputra Inundation Zone', state: 'Assam', lat: 26.1850, lng: 91.7500 },
  { name: 'Chennai - Adyar River Flood Sector', state: 'Tamil Nadu', lat: 13.0012, lng: 80.2565 },
  { name: 'Bengaluru - Bellandur Spillway', state: 'Karnataka', lat: 12.9352, lng: 77.6784 },
  { name: 'Kolkata - Sundarbans Delta Relief Hub', state: 'West Bengal', lat: 22.1500, lng: 88.7500 },
];

/**
 * Attempts to retrieve user location using multiple fallback tiers:
 * Tier 1: Hardware GPS with high accuracy
 * Tier 2: Low accuracy / cached browser geolocation
 * Tier 3: Network IP-based Geolocation (public APIs without API key)
 */
export async function getBestAvailableLocation(): Promise<{
  result: LocationResult;
  error?: LocationErrorDetail;
}> {
  // Step 1: Try browser geolocation with high accuracy first
  try {
    const gpsRes = await getBrowserCoordinates({
      enableHighAccuracy: true,
      timeout: 6000,
      maximumAge: 30000,
    });
    return {
      result: {
        lat: Number(gpsRes.coords.latitude.toFixed(5)),
        lng: Number(gpsRes.coords.longitude.toFixed(5)),
        accuracy: Math.round(gpsRes.coords.accuracy),
        source: 'gps',
        address: `Live GPS (${gpsRes.coords.latitude.toFixed(4)}° N, ${gpsRes.coords.longitude.toFixed(4)}° E ±${Math.round(gpsRes.coords.accuracy)}m)`,
        timestamp: Date.now(),
      },
    };
  } catch (err1: any) {
    console.warn('High accuracy GPS failed, falling back to low accuracy:', err1);

    // Step 2: Try low accuracy browser geolocation (faster, less power, works on desktop Wi-Fi)
    try {
      const lowRes = await getBrowserCoordinates({
        enableHighAccuracy: false,
        timeout: 7000,
        maximumAge: 300000,
      });
      return {
        result: {
          lat: Number(lowRes.coords.latitude.toFixed(5)),
          lng: Number(lowRes.coords.longitude.toFixed(5)),
          accuracy: Math.round(lowRes.coords.accuracy),
          source: 'gps',
          address: `Network Location (${lowRes.coords.latitude.toFixed(4)}° N, ${lowRes.coords.longitude.toFixed(4)}° E ±${Math.round(lowRes.coords.accuracy)}m)`,
          timestamp: Date.now(),
        },
      };
    } catch (err2: any) {
      console.warn('Browser geolocation failed completely:', err2);
      const isDenied = err2?.code === 1;
      const isTimeout = err2?.code === 3;
      const isIframe = window.self !== window.top;

      // Step 3: Fallback to IP-based Geolocation
      try {
        const ipLocation = await getIpGeolocation();
        if (ipLocation) {
          return {
            result: ipLocation,
            error: {
              code: err2?.code,
              message: isDenied
                ? 'Device GPS permission was denied or restricted. Using approximate network IP location.'
                : 'Device GPS timed out. Using approximate network IP location.',
              isPermissionDenied: isDenied,
              isIframeBlocked: isIframe && isDenied,
              isTimeout,
            },
          };
        }
      } catch (ipErr) {
        console.warn('IP geolocation also failed:', ipErr);
      }

      // Step 4: Fallback to Delhi default
      return {
        result: {
          lat: 28.6653,
          lng: 77.2410,
          accuracy: 500,
          source: 'preset',
          address: 'Delhi Disaster Sector (Old Yamuna Bridge fallback)',
          timestamp: Date.now(),
        },
        error: {
          code: err2?.code,
          message: err2?.message || 'Could not acquire GPS or IP location.',
          isPermissionDenied: isDenied,
          isIframeBlocked: isIframe,
          isTimeout,
        },
      };
    }
  }
}

/**
 * Promise wrapper for navigator.geolocation.getCurrentPosition
 */
function getBrowserCoordinates(options: PositionOptions): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

/**
 * Queries free, CORS-friendly IP geolocation endpoints
 */
async function getIpGeolocation(): Promise<LocationResult | null> {
  // Try freeipapi.com
  try {
    const res = await fetch('https://freeipapi.com/api/json', { signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      const data = await res.json();
      if (typeof data.latitude === 'number' && typeof data.longitude === 'number') {
        const city = data.cityName || data.regionName || '';
        const country = data.countryName || 'India';
        return {
          lat: Number(data.latitude.toFixed(5)),
          lng: Number(data.longitude.toFixed(5)),
          accuracy: 2500,
          source: 'ip',
          address: `${city ? `${city}, ` : ''}${country} (IP Geolocation)`,
          timestamp: Date.now(),
        };
      }
    }
  } catch {
    // try secondary service
  }

  // Try ipapi.co
  try {
    const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      const data = await res.json();
      if (data.latitude && data.longitude) {
        return {
          lat: Number(Number(data.latitude).toFixed(5)),
          lng: Number(Number(data.longitude).toFixed(5)),
          accuracy: 3000,
          source: 'ip',
          address: `${data.city || ''}, ${data.region || ''} (IP Geolocation)`,
          timestamp: Date.now(),
        };
      }
    }
  } catch {
    // fallback failed
  }

  return null;
}

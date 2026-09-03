import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import L from 'leaflet';
import {
  ShieldAlert,
  Home,
  Navigation,
  Flame,
  Waves,
  AlertTriangle,
  Radio,
  Layers,
  ZoomIn,
  ZoomOut,
  LocateFixed,
  Info,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Clock,
  Compass,
  Maximize2,
  Minimize2,
  MapPin,
  PhoneCall,
  Activity,
  Droplets,
  Wind,
  Mountain,
  Satellite,
  Eye,
  RefreshCw,
  HardDrive,
  WifiOff,
  Wifi,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { useEmergency } from '../../context/EmergencyContext';
import {
  Shelter,
  Incident,
  HazardZone,
  RoadBlockage,
  Drone,
  CandidateRoute,
} from '../../types';
import { INDIAN_DISASTER_REGIONS, IndianRegionConfig } from '../../data/mockData';
import { createResQMapTileLayer } from './ResQMapTileLayer';
import { OfflineMapsModal } from './OfflineMapsModal';
import { LocationModal } from './LocationModal';
import { LocationPermissionModal } from './LocationPermissionModal';
import {
  getBestAvailableLocation,
  LocationErrorDetail,
} from '../../services/geolocationService';
import { getOfflineCacheStats } from '../../services/offlineMapService';

interface EmergencyMapProps {
  heightClass?: string;
  onSelectShelter?: (shelter: Shelter) => void;
  onSelectIncident?: (incident: Incident) => void;
  showControls?: boolean;
}

// Available Live Map Tile Providers
const TILE_LAYERS = {
  dark: {
    name: 'Tactical Dark',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap contributors, &copy; CARTO',
    maxZoom: 19,
  },
  osm: {
    name: 'OpenStreetMap (Streets)',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
  satellite: {
    name: 'Satellite Imagery',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    maxZoom: 18,
  },
};

export const EmergencyMap: React.FC<EmergencyMapProps> = ({
  heightClass = 'h-[540px]',
  onSelectShelter,
  onSelectIncident,
  showControls = true,
}) => {
  const {
    shelters,
    hazards,
    roadBlockages,
    incidents,
    rescueTeams,
    drones,
    userLocation,
    setUserLocation,
    selectedIncident,
    selectedShelter,
    activeRoute,
    setSelectedIncident,
    setSelectedShelter,
    setActiveRoute,
    isOnline,
    toggleConnectivity,
    liveLocation,
    locationStatus,
    locationErrorDetail: contextLocationError,
    isTrackingLocation,
    startLocationTracking,
    stopLocationTracking,
    requestLocationWithPrompt,
    showPermissionDialog,
    setShowPermissionDialog,
    confirmPermissionAndStartTracking,
    isFollowMode,
    setIsFollowMode,
    hazardWarningProximity,
    responderLocations,
    isSharingResponderLocation,
    toggleSharingResponderLocation,
    canViewResponders,
    currentUser,
  } = useEmergency();

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const routeLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const hazardsLayerGroupRef = useRef<L.LayerGroup | null>(null);

  // Map state
  const [activeTileKey, setActiveTileKey] = useState<'dark' | 'osm' | 'satellite'>('dark');
  const [selectedRegionId, setSelectedRegionId] = useState<string>('delhi-yamuna');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationErrorDetail, setLocationErrorDetail] = useState<LocationErrorDetail | null>(null);
  const [showLayerMenu, setShowLayerMenu] = useState<boolean>(false);
  const [showOfflineModal, setShowOfflineModal] = useState<boolean>(false);
  const [showLocationModal, setShowLocationModal] = useState<boolean>(false);
  const [isPinDropMode, setIsPinDropMode] = useState<boolean>(false);
  const [cacheStats, setCacheStats] = useState<{ tileCount: number; sizeMb: number }>({
    tileCount: 0,
    sizeMb: 0,
  });
  const [currentMapBounds, setCurrentMapBounds] = useState<{
    north: number;
    south: number;
    east: number;
    west: number;
  } | undefined>(undefined);

  const [mapCenterCoords, setMapCenterCoords] = useState<{ lat: number; lng: number; zoom: number }>({
    lat: userLocation.lat,
    lng: userLocation.lng,
    zoom: 13,
  });

  // Layer Visibility
  const [layerFilters, setLayerFilters] = useState({
    shelters: true,
    hazards: true,
    blockages: true,
    incidents: true,
    rescueTeams: true,
    drones: true,
    route: true,
  });

  // Selected item modal/inspector
  const [inspectedItem, setInspectedItem] = useState<{
    type: 'shelter' | 'hazard' | 'blockage' | 'incident' | 'team' | 'drone';
    data: any;
  } | null>(null);

  // Refresh cache diagnostics
  const refreshCacheStats = useCallback(async () => {
    const stats = await getOfflineCacheStats();
    setCacheStats(stats);
  }, []);

  useEffect(() => {
    refreshCacheStats();
  }, [refreshCacheStats]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return; // already initialized

    const map = L.map(mapContainerRef.current, {
      center: [userLocation.lat, userLocation.lng],
      zoom: 13,
      zoomControl: false, // We render custom tactical controls
      attributionControl: false,
    });

    // Add Attribution in bottom-right corner with minimal design
    L.control.attribution({ position: 'bottomright', prefix: false }).addTo(map);

    // Initial Offline-Capable Tile Layer
    const tileConfig = TILE_LAYERS[activeTileKey];
    const initialTiles = createResQMapTileLayer(tileConfig.url, {
      attribution: tileConfig.attribution,
      maxZoom: tileConfig.maxZoom,
      isSimulatedOffline: !isOnline,
    }).addTo(map);

    tileLayerRef.current = initialTiles;

    // Create Layer Groups
    hazardsLayerGroupRef.current = L.layerGroup().addTo(map);
    routeLayerGroupRef.current = L.layerGroup().addTo(map);
    markersLayerGroupRef.current = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;

    // Initial bounds
    setTimeout(() => {
      if (map) {
        const b = map.getBounds();
        setCurrentMapBounds({
          north: Number(b.getNorth().toFixed(4)),
          south: Number(b.getSouth().toFixed(4)),
          east: Number(b.getEast().toFixed(4)),
          west: Number(b.getWest().toFixed(4)),
        });
      }
    }, 400);

    // Cancel Follow Mode on user manual drag (Section 5)
    map.on('dragstart', () => {
      setIsFollowMode(false);
    });

    // Track map movements & update bounds
    map.on('moveend', () => {
      const c = map.getCenter();
      setMapCenterCoords({
        lat: Number(c.lat.toFixed(4)),
        lng: Number(c.lng.toFixed(4)),
        zoom: map.getZoom(),
      });
      const b = map.getBounds();
      setCurrentMapBounds({
        north: Number(b.getNorth().toFixed(4)),
        south: Number(b.getSouth().toFixed(4)),
        east: Number(b.getEast().toFixed(4)),
        west: Number(b.getWest().toFixed(4)),
      });
    });

    // Map click for Pin Drop mode
    map.on('click', (e: L.LeafletMouseEvent) => {
      setUserLocation({
        lat: Number(e.latlng.lat.toFixed(5)),
        lng: Number(e.latlng.lng.toFixed(5)),
        address: `Map Pinned Point (${e.latlng.lat.toFixed(4)}° N, ${e.latlng.lng.toFixed(4)}° E)`,
      });
      setSelectedRegionId('custom-pin');
    });

    // Handle container resize
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(mapContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Tile Layer when tileKey or offline status changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const tileConfig = TILE_LAYERS[activeTileKey];
    const newTiles = createResQMapTileLayer(tileConfig.url, {
      attribution: tileConfig.attribution,
      maxZoom: tileConfig.maxZoom,
      isSimulatedOffline: !isOnline,
    }).addTo(map);

    // Keep tiles beneath markers
    newTiles.bringToBack();
    tileLayerRef.current = newTiles;
  }, [activeTileKey, isOnline]);

  // Switch Indian Disaster Sector
  const handleSelectRegion = (region: IndianRegionConfig) => {
    setSelectedRegionId(region.id);
    if (!mapInstanceRef.current) return;

    mapInstanceRef.current.flyTo([region.center.lat, region.center.lng], region.zoom, {
      duration: 1.5,
    });

    setUserLocation({
      lat: region.center.lat,
      lng: region.center.lng,
      address: `${region.name} (${region.state})`,
    });
  };

  // Robust Multi-Tier Live GPS Geolocation Hook
  const handleGetLiveLocation = useCallback(async () => {
    setIsLocating(true);
    setLocationError(null);
    setLocationErrorDetail(null);

    try {
      const { result, error } = await getBestAvailableLocation();

      const newLoc = {
        lat: result.lat,
        lng: result.lng,
        address: result.address,
      };

      setUserLocation(newLoc);
      setSelectedRegionId('live-gps');

      if (mapInstanceRef.current) {
        mapInstanceRef.current.flyTo([result.lat, result.lng], 15, {
          duration: 1.8,
        });
      }

      if (error) {
        setLocationErrorDetail(error);
        setLocationError(error.message);
        // If error occurred (e.g. iframe denied GPS or timed out), open the location modal after brief moment so user has full control
        setTimeout(() => {
          setShowLocationModal(true);
        }, 1200);
      }
    } catch (err: any) {
      const errorMsg = err?.message || 'Unable to retrieve GPS coordinates.';
      setLocationError(errorMsg);
      setLocationErrorDetail({ message: errorMsg });
      setShowLocationModal(true);
    } finally {
      setIsLocating(false);
    }
  }, [setUserLocation]);

  // Render Markers, Polygons, and Active Routes onto Leaflet Layers
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    const markersGroup = markersLayerGroupRef.current;
    const hazardsGroup = hazardsLayerGroupRef.current;
    const routeGroup = routeLayerGroupRef.current;

    if (!markersGroup || !hazardsGroup || !routeGroup) return;

    markersGroup.clearLayers();
    hazardsGroup.clearLayers();
    routeGroup.clearLayers();

    // 1. Render User GPS Location Beacon with Accuracy Circle & Heading (Section 4)
    const targetLat = liveLocation ? liveLocation.latitude : userLocation.lat;
    const targetLng = liveLocation ? liveLocation.longitude : userLocation.lng;
    const accuracy = liveLocation?.accuracyMeters ? Math.round(liveLocation.accuracyMeters) : 15;

    // Draw Accuracy Circle around User
    const accuracyCircle = L.circle([targetLat, targetLng], {
      radius: accuracy,
      color: '#0284c7',
      fillColor: '#38bdf8',
      fillOpacity: 0.14,
      weight: 1.5,
      dashArray: '4, 4',
    });
    markersGroup.addLayer(accuracyCircle);

    // Heading beam if available (Section 1)
    const headingDeg = liveLocation?.headingDegrees;
    const headingHtml =
      headingDeg !== undefined && headingDeg !== null
        ? `<div class="absolute -top-6 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[14px] border-b-sky-400 drop-shadow" style="transform: rotate(${headingDeg}deg); transform-origin: center bottom;"></div>`
        : '';

    const userPulseHtml = `
      <div class="relative flex flex-col items-center justify-center">
        ${headingHtml}
        <div class="relative flex items-center justify-center">
          <div class="absolute -inset-2.5 rounded-full bg-sky-500/30 animate-ping"></div>
          <div class="absolute -inset-1.5 rounded-full bg-sky-500/50"></div>
          <div class="relative w-5 h-5 rounded-full bg-sky-400 border-2 border-white shadow-xl flex items-center justify-center">
            <div class="w-1.5 h-1.5 rounded-full bg-white"></div>
          </div>
        </div>
        <div class="mt-0.5 px-1 py-0.2 rounded bg-sky-950/90 border border-sky-400/80 text-[8px] font-mono font-black text-sky-200 tracking-wider uppercase shadow">
          YOU
        </div>
      </div>
    `;

    const userMarker = L.marker([targetLat, targetLng], {
      icon: L.divIcon({
        className: 'user-gps-marker',
        html: userPulseHtml,
        iconSize: [28, 38],
        iconAnchor: [14, 19],
      }),
      zIndexOffset: 1000,
    });

    userMarker.bindPopup(`
      <div class="p-2.5 font-sans text-xs bg-stone-950 text-stone-100 rounded-xl border border-sky-800/60 max-w-xs shadow-2xl">
        <div class="flex items-center justify-between gap-2 border-b border-stone-800 pb-1.5 mb-1.5">
          <strong class="text-sky-400 font-mono flex items-center gap-1">📍 YOUR LIVE LOCATION</strong>
          <span class="px-1.5 py-0.2 rounded text-[9px] font-mono bg-sky-950 text-sky-300 border border-sky-800">
            ±${accuracy}m
          </span>
        </div>
        <p class="text-stone-300 text-[11px] leading-snug">${userLocation.address}</p>
        <div class="grid grid-cols-2 gap-1 mt-2 text-[10px] font-mono text-stone-400 bg-stone-900/80 p-1.5 rounded-lg">
          <div>Lat: <span class="text-stone-200">${targetLat.toFixed(5)}</span></div>
          <div>Lng: <span class="text-stone-200">${targetLng.toFixed(5)}</span></div>
          ${liveLocation?.speedKmh ? `<div>Speed: <span class="text-sky-300">${Math.round(liveLocation.speedKmh)} km/h</span></div>` : ''}
          ${liveLocation?.altitudeMeters ? `<div>Alt: <span class="text-sky-300">${Math.round(liveLocation.altitudeMeters)}m</span></div>` : ''}
          <div>Status: <span class="text-emerald-400 uppercase">${locationStatus}</span></div>
          <div>Source: <span class="text-stone-300">${liveLocation?.provider || 'GPS'}</span></div>
        </div>
        <div class="mt-1.5 text-[9px] font-mono text-stone-500">
          Last lock: ${liveLocation?.timestamp ? new Date(liveLocation.timestamp).toLocaleTimeString() : 'Current session'}
        </div>
      </div>
    `);

    markersGroup.addLayer(userMarker);

    // 2. Render Hazard Zones (Polygons)
    if (layerFilters.hazards) {
      hazards.forEach((hazard) => {
        const isCritical = hazard.severity === 'critical';
        const isHigh = hazard.severity === 'high';

        const fillColor =
          hazard.disasterType === 'wildfire'
            ? '#ef4444'
            : hazard.disasterType === 'flood'
            ? '#0284c7'
            : '#f59e0b';

        const polygon = L.polygon(hazard.coordinates, {
          color: fillColor,
          weight: isCritical ? 2.5 : 1.5,
          opacity: 0.85,
          fillColor,
          fillOpacity: isCritical ? 0.35 : 0.2,
          dashArray: hazard.isModelEstimate ? '6, 6' : undefined,
        });

        polygon.bindPopup(`
          <div class="p-2.5 font-sans text-xs bg-stone-950 text-stone-100 rounded-xl border border-stone-800 max-w-xs">
            <div class="flex items-center gap-1.5">
              <span class="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                isCritical ? 'bg-red-950 text-red-400 border border-red-800' : 'bg-amber-950 text-amber-400 border border-amber-800'
              }">${hazard.severity} HAZARD</span>
              ${hazard.isModelEstimate ? '<span class="text-[9px] font-mono text-stone-400 bg-stone-800 px-1 rounded">Prediction</span>' : ''}
            </div>
            <h4 class="font-bold text-stone-100 mt-1">${hazard.name}</h4>
            <p class="text-stone-300 mt-1 text-[11px] leading-snug">${hazard.notes || ''}</p>
            <div class="mt-2 pt-1.5 border-t border-stone-800 text-[10px] font-mono text-stone-400 flex justify-between">
              <span>Source: ${hazard.source}</span>
              <span>Prob: ${Math.round(hazard.probability * 100)}%</span>
            </div>
          </div>
        `);

        polygon.on('click', () => {
          setInspectedItem({ type: 'hazard', data: hazard });
        });

        hazardsGroup.addLayer(polygon);
      });
    }

    // 3. Render Shelters
    if (layerFilters.shelters) {
      shelters.forEach((shelter) => {
        const isFull = shelter.status === 'full';
        const isNearlyFull = shelter.status === 'nearly_full';
        const isSelected = selectedShelter?.id === shelter.id;

        const statusBg = isFull
          ? 'bg-red-600 text-white border-red-400'
          : isNearlyFull
          ? 'bg-amber-500 text-stone-950 border-amber-300'
          : 'bg-emerald-600 text-white border-emerald-300';

        const shelterHtml = `
          <div class="relative group cursor-pointer">
            ${
              isSelected
                ? '<div class="absolute -inset-2 rounded-xl bg-emerald-400/40 animate-ping"></div>'
                : ''
            }
            <div class="flex items-center justify-center w-8 h-8 rounded-xl shadow-xl border-2 ${statusBg} transition-transform hover:scale-110">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                <polyline points="9 22 9 12 15 12 15 22"></polyline>
              </svg>
            </div>
            <div class="absolute -bottom-1 -right-1 px-1 rounded bg-stone-950 text-[9px] font-mono font-bold text-stone-300 border border-stone-700">
              ${shelter.currentOccupancy}/${shelter.capacity}
            </div>
          </div>
        `;

        const marker = L.marker([shelter.location.lat, shelter.location.lng], {
          icon: L.divIcon({
            className: 'shelter-marker',
            html: shelterHtml,
            iconSize: [36, 36],
            iconAnchor: [18, 18],
          }),
        });

        const percentOccupied = Math.round((shelter.currentOccupancy / shelter.capacity) * 100);

        marker.bindPopup(`
          <div class="p-3 font-sans text-xs bg-stone-950 text-stone-100 rounded-xl border border-stone-800 w-64 shadow-2xl">
            <div class="flex items-center justify-between pb-1.5 border-b border-stone-800">
              <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                isFull ? 'bg-red-950 text-red-400 border border-red-800' : isNearlyFull ? 'bg-amber-950 text-amber-400 border border-amber-800' : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
              }">
                ${isFull ? 'SHELTER FULL' : isNearlyFull ? 'NEARLY FULL' : 'OPEN & ACCEPTING'}
              </span>
              <span class="text-[10px] font-mono text-stone-400">${shelter.lastUpdated}</span>
            </div>

            <h3 class="font-bold text-sm text-stone-100 mt-2 leading-tight">${shelter.name}</h3>
            <p class="text-[11px] text-stone-400 mt-1">${shelter.address}</p>

            <div class="mt-2.5">
              <div class="flex justify-between text-[11px] font-mono text-stone-300 mb-1">
                <span>Occupancy:</span>
                <span class="font-bold">${shelter.currentOccupancy} / ${shelter.capacity} (${percentOccupied}%)</span>
              </div>
              <div class="w-full h-2 rounded-full bg-stone-800 overflow-hidden">
                <div class="h-full rounded-full ${isFull ? 'bg-red-500' : isNearlyFull ? 'bg-amber-500' : 'bg-emerald-500'}" style="width: ${Math.min(100, percentOccupied)}%"></div>
              </div>
            </div>

            <div class="mt-2.5 flex flex-wrap gap-1">
              ${shelter.services.slice(0, 3).map((s) => `<span class="px-1.5 py-0.5 rounded bg-stone-800 text-[9px] font-mono text-stone-300">${s}</span>`).join('')}
            </div>

            <div class="mt-3 pt-2 border-t border-stone-800 flex items-center justify-between gap-2">
              <a href="tel:${shelter.contactPhone}" class="flex items-center gap-1 text-[11px] font-mono text-amber-400 hover:underline">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                <span>Call Center</span>
              </a>

              <button id="btn-select-shelter-${shelter.id}" class="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-[10px] uppercase">
                Select & Evacuate
              </button>
            </div>
          </div>
        `);

        marker.on('click', () => {
          setSelectedShelter(shelter);
          if (onSelectShelter) onSelectShelter(shelter);
        });

        marker.on('popupopen', () => {
          const btn = document.getElementById(`btn-select-shelter-${shelter.id}`);
          if (btn) {
            btn.onclick = () => {
              setSelectedShelter(shelter);
              if (onSelectShelter) onSelectShelter(shelter);
            };
          }
        });

        markersGroup.addLayer(marker);
      });
    }

    // 4. Render Road Blockages
    if (layerFilters.blockages) {
      roadBlockages.forEach((blockage) => {
        const isBlocked = blockage.status === 'blocked';
        const blockageHtml = `
          <div class="flex items-center justify-center w-7 h-7 rounded-lg bg-stone-950 border-2 ${
            isBlocked ? 'border-red-500 text-red-500' : 'border-amber-500 text-amber-500'
          } shadow-lg cursor-pointer hover:scale-110 transition-transform">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"></polygon>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
        `;

        const marker = L.marker([blockage.location.lat, blockage.location.lng], {
          icon: L.divIcon({
            className: 'blockage-marker',
            html: blockageHtml,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          }),
        });

        marker.bindPopup(`
          <div class="p-2.5 font-sans text-xs bg-stone-950 text-stone-100 rounded-xl border border-stone-800 max-w-xs">
            <span class="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
              isBlocked ? 'bg-red-950 text-red-400 border border-red-800' : 'bg-amber-950 text-amber-400 border border-amber-800'
            }">
              ROAD ${blockage.status.toUpperCase()}
            </span>
            <h4 class="font-bold text-stone-100 mt-1.5">${blockage.name}</h4>
            <p class="text-stone-300 text-[11px] mt-1">${blockage.hazardType}</p>
            <p class="text-stone-400 text-[10px] mt-1 italic">${blockage.notes}</p>
            <span class="text-[10px] font-mono text-stone-500 block mt-2">Reported: ${blockage.reportedAt}</span>
          </div>
        `);

        markersGroup.addLayer(marker);
      });
    }

    // 5. Render Incidents (SOS Calls)
    if (layerFilters.incidents) {
      incidents.forEach((inc) => {
        const isCritical = inc.priority === 'critical';
        const incidentHtml = `
          <div class="relative cursor-pointer group">
            <div class="absolute -inset-1 rounded-full ${isCritical ? 'bg-red-500/40 animate-ping' : 'bg-amber-500/40'}"></div>
            <div class="relative flex items-center justify-center w-7 h-7 rounded-full bg-stone-950 border-2 ${
              isCritical ? 'border-red-500 text-red-400' : 'border-amber-500 text-amber-400'
            } shadow-xl hover:scale-110 transition-transform">
              <span class="text-[10px] font-mono font-bold">SOS</span>
            </div>
          </div>
        `;

        const marker = L.marker([inc.location.lat, inc.location.lng], {
          icon: L.divIcon({
            className: 'incident-marker',
            html: incidentHtml,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          }),
        });

        marker.bindPopup(`
          <div class="p-2.5 font-sans text-xs bg-stone-950 text-stone-100 rounded-xl border border-stone-800 max-w-xs">
            <div class="flex items-center justify-between pb-1 border-b border-stone-800">
              <span class="text-red-400 font-mono font-bold text-[10px] uppercase">🚨 SOS #${inc.id}</span>
              <span class="text-stone-400 font-mono text-[9px] uppercase">${inc.status}</span>
            </div>
            <h4 class="font-bold text-stone-100 mt-1">${inc.location.address}</h4>
            <p class="text-stone-300 text-[11px] mt-1">${inc.description}</p>
            <div class="mt-2 text-[10px] font-mono text-stone-400">
              <span>Victims: <strong class="text-stone-200">${inc.peopleCount}</strong></span> |
              <span>Medical: <strong class="${inc.hasMedicalEmergency ? 'text-red-400' : 'text-stone-400'}">${inc.hasMedicalEmergency ? 'YES' : 'NO'}</strong></span>
            </div>
            ${inc.assignedTeamName ? `<div class="mt-1 text-[10px] font-mono text-emerald-400">Assigned: ${inc.assignedTeamName}</div>` : ''}
          </div>
        `);

        marker.on('click', () => {
          setSelectedIncident(inc);
          if (onSelectIncident) onSelectIncident(inc);
        });

        markersGroup.addLayer(marker);
      });
    }

    // 6. Render Rescue Teams (NDRF / SDRF) & Live Responder Updates (Section 11, 12, 13)
    if (layerFilters.rescueTeams) {
      if (canViewResponders && responderLocations.length > 0) {
        // Render live real-time responder telemetry
        responderLocations.forEach((resp) => {
          const isAlpha = resp.teamId === 'TEAM-ALPHA';
          const isBravo = resp.teamId === 'TEAM-BRAVO';
          const isFlood = resp.teamId === 'TEAM-FLOOD';

          const iconEmoji = isAlpha ? '🚑' : isBravo ? '🚒' : isFlood ? '🛟' : '🐾';
          const statusBg =
            resp.status === 'online'
              ? 'border-emerald-400 bg-emerald-950 text-emerald-300'
              : resp.status === 'on_scene'
              ? 'border-sky-400 bg-sky-950 text-sky-300'
              : 'border-amber-400 bg-amber-950 text-amber-300';

          const timeSecAgo = Math.max(1, Math.round((Date.now() - new Date(resp.updatedAt).getTime()) / 1000));

          const responderHtml = `
            <div class="relative flex flex-col items-center justify-center cursor-pointer group">
              <div class="absolute -inset-1 rounded-full ${resp.status === 'online' ? 'bg-emerald-500/30 animate-ping' : ''}"></div>
              <div class="relative flex items-center justify-center w-8 h-8 rounded-xl border-2 ${statusBg} shadow-2xl text-sm transition-transform hover:scale-110">
                <span>${iconEmoji}</span>
              </div>
              <div class="mt-0.5 px-1 py-0.2 rounded bg-stone-950/90 border border-stone-700 text-[8px] font-mono text-stone-200 font-bold whitespace-nowrap shadow">
                ${resp.teamName.replace('Rescue Team ', '').replace('Team ', '')}
              </div>
            </div>
          `;

          const marker = L.marker([resp.latitude, resp.longitude], {
            icon: L.divIcon({
              className: 'live-responder-marker',
              html: responderHtml,
              iconSize: [32, 42],
              iconAnchor: [16, 21],
            }),
            zIndexOffset: 900,
          });

          marker.bindPopup(`
            <div class="p-2.5 font-sans text-xs bg-stone-950 text-stone-100 rounded-xl border border-emerald-800/80 max-w-xs shadow-2xl">
              <div class="flex items-center justify-between gap-2 border-b border-stone-800 pb-1.5 mb-1.5">
                <strong class="text-emerald-400 font-mono flex items-center gap-1.5">
                  <span>${iconEmoji}</span> ${resp.teamName}
                </strong>
                <span class="px-1.5 py-0.2 rounded text-[9px] font-mono uppercase ${
                  resp.status === 'online'
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                    : 'bg-amber-950 text-amber-300 border border-amber-700'
                }">
                  ${resp.status.replace('_', ' ')}
                </span>
              </div>
              <p class="text-stone-300 text-[11px]">${resp.specialization}</p>
              <div class="grid grid-cols-2 gap-1 mt-2 text-[10px] font-mono text-stone-400 bg-stone-900/80 p-1.5 rounded-lg">
                <div>Speed: <span class="text-emerald-300">${resp.speedKmh ? Math.round(resp.speedKmh) : 0} km/h</span></div>
                <div>Radio: <span class="text-stone-200">CH 04 V-TAC</span></div>
                <div>Updated: <span class="text-stone-300">${timeSecAgo}s ago</span></div>
                <div>Lat: <span class="text-stone-200">${resp.latitude.toFixed(4)}</span></div>
              </div>
              <div class="mt-2 text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Tactical Satellite Telemetry Active</span>
              </div>
            </div>
          `);

          markersGroup.addLayer(marker);
        });
      } else {
        // Fallback to static mock rescue teams if responder layer is restricted
        rescueTeams.forEach((team) => {
          const teamHtml = `
            <div class="flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-950 border-2 border-emerald-400 text-emerald-300 shadow-xl cursor-pointer hover:scale-110 transition-transform">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <polyline points="16 11 18 13 22 9"></polyline>
              </svg>
            </div>
          `;

          const marker = L.marker([team.location.lat, team.location.lng], {
            icon: L.divIcon({
              className: 'rescue-team-marker',
              html: teamHtml,
              iconSize: [28, 28],
              iconAnchor: [14, 14],
            }),
          });

          marker.bindPopup(`
            <div class="p-2 font-sans text-xs bg-stone-950 text-stone-100 rounded-xl border border-stone-800">
              <strong class="text-emerald-400 font-mono">${team.name}</strong>
              <p class="text-stone-300 text-[11px] mt-0.5">Specialization: ${team.specialization}</p>
              <span class="text-[10px] font-mono text-stone-500 block mt-1">Crew: ${team.membersCount} personnel | Status: ${team.status}</span>
            </div>
          `);

          markersGroup.addLayer(marker);
        });
      }
    }

    // 7. Render Drones (UAVs)
    if (layerFilters.drones) {
      drones.forEach((drone) => {
        const droneHtml = `
          <div class="flex items-center justify-center w-6 h-6 rounded-full bg-cyan-950 border-2 border-cyan-400 text-cyan-300 shadow-xl cursor-pointer hover:scale-110 transition-transform">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <circle cx="12" cy="12" r="2"></circle>
              <path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"></path>
            </svg>
          </div>
        `;

        const marker = L.marker([drone.currentLocation.lat, drone.currentLocation.lng], {
          icon: L.divIcon({
            className: 'drone-marker',
            html: droneHtml,
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          }),
        });

        marker.bindPopup(`
          <div class="p-2 font-sans text-xs bg-stone-950 text-stone-100 rounded-xl border border-stone-800">
            <strong class="text-cyan-400 font-mono">${drone.name}</strong>
            <p class="text-stone-300 text-[11px] mt-0.5">Type: ${drone.type} (${drone.status})</p>
            <span class="text-[10px] font-mono text-cyan-400 block mt-1">Battery: ${drone.batteryPercent}% | Payload: ${drone.maxPayloadKg}kg</span>
          </div>
        `);

        markersGroup.addLayer(marker);
      });
    }

    // 8. Render Active Route Polyline
    if (layerFilters.route && activeRoute && activeRoute.waypoints.length > 1) {
      // Glow polyline beneath
      const glowLine = L.polyline(activeRoute.waypoints, {
        color: '#10b981',
        weight: 8,
        opacity: 0.35,
        lineCap: 'round',
        lineJoin: 'round',
      });

      // Core route polyline
      const coreLine = L.polyline(activeRoute.waypoints, {
        color: '#34d399',
        weight: 4,
        opacity: 0.95,
        dashArray: '8, 8',
        lineCap: 'round',
        lineJoin: 'round',
      });

      routeGroup.addLayer(glowLine);
      routeGroup.addLayer(coreLine);
    }
  }, [
    shelters,
    hazards,
    roadBlockages,
    incidents,
    rescueTeams,
    drones,
    userLocation,
    liveLocation,
    locationStatus,
    responderLocations,
    canViewResponders,
    selectedShelter,
    activeRoute,
    layerFilters,
    setSelectedIncident,
    setSelectedShelter,
    onSelectShelter,
    onSelectIncident,
  ]);

  // Zoom controls
  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();

  // "My Location" Center & Follow Mode Handler (Section 5)
  const handleMyLocation = () => {
    if (!isTrackingLocation) {
      requestLocationWithPrompt();
    }
    const targetLat = liveLocation ? liveLocation.latitude : userLocation.lat;
    const targetLng = liveLocation ? liveLocation.longitude : userLocation.lng;
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([targetLat, targetLng], 15, {
        duration: 1.2,
      });
    }
    setIsFollowMode(true);
  };

  // Auto-center in Follow Mode (Section 5)
  useEffect(() => {
    if (isFollowMode && mapInstanceRef.current) {
      const targetLat = liveLocation ? liveLocation.latitude : userLocation.lat;
      const targetLng = liveLocation ? liveLocation.longitude : userLocation.lng;
      mapInstanceRef.current.panTo([targetLat, targetLng], {
        animate: true,
        duration: 0.6,
      });
    }
  }, [isFollowMode, liveLocation, userLocation]);

  return (
    <div
      className={`relative w-full ${
        isFullscreen ? 'fixed inset-0 z-50 h-screen bg-stone-950' : heightClass
      } rounded-2xl overflow-hidden border border-stone-800 bg-stone-950 font-sans shadow-2xl flex flex-col`}
    >
      {/* Top Floating Tactical Header Bar */}
      <div className="absolute top-3 left-3 right-3 z-[400] flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Left Sector Switcher */}
        <div className="flex items-center gap-1.5 pointer-events-auto bg-stone-950/90 backdrop-blur-md p-1.5 rounded-xl border border-stone-800 shadow-xl max-w-full overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1 px-2 py-1 bg-amber-500/10 rounded-lg text-amber-400 text-xs font-mono font-bold flex-shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span>LIVE MAP:</span>
          </div>

          <select
            value={selectedRegionId}
            onChange={(e) => {
              const r = INDIAN_DISASTER_REGIONS.find((reg) => reg.id === e.target.value);
              if (r) handleSelectRegion(r);
            }}
            className="bg-stone-900 border border-stone-700 text-xs font-mono font-bold text-stone-100 rounded-lg px-2.5 py-1 focus:outline-none focus:border-amber-500"
          >
            {INDIAN_DISASTER_REGIONS.map((region) => (
              <option key={region.id} value={region.id}>
                {region.name} ({region.state})
              </option>
            ))}
            <option value="live-gps">📍 My Live GPS Location</option>
          </select>

          {/* Quick 1-Tap Live GPS Button */}
          <button
            onClick={handleGetLiveLocation}
            disabled={isLocating}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all active:scale-95 shadow-md ${
              isLocating
                ? 'bg-amber-600 text-stone-950 animate-pulse'
                : 'bg-sky-600 hover:bg-sky-500 text-white'
            }`}
            title="Locate me using device GPS or IP location fallback"
          >
            <LocateFixed className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">
              {isLocating ? 'Acquiring GPS...' : 'Use My GPS'}
            </span>
          </button>

          {/* Location Settings & Custom Pin Button */}
          <button
            onClick={() => setShowLocationModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-900 border border-stone-700 hover:border-sky-500 text-stone-300 hover:text-sky-300 text-xs font-mono transition-all active:scale-95 shadow-md"
            title="Search Indian Cities, Enter Coordinates, or Diagnose GPS"
          >
            <MapPin className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden md:inline">Pick / Pin</span>
          </button>
        </div>

        {/* Right Controls: Offline Maps, Tile switcher & Fullscreen */}
        <div className="flex items-center gap-1.5 pointer-events-auto">
          {/* Offline Maps Manager Button */}
          <button
            onClick={() => setShowOfflineModal(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all active:scale-95 shadow-xl ${
              !isOnline || !navigator.onLine
                ? 'bg-amber-600/30 text-amber-300 border-amber-500/60 animate-pulse'
                : 'bg-stone-950/90 text-stone-200 border-stone-800 hover:border-amber-500/50'
            }`}
            title="Open Offline Map Packs & Storage Manager"
          >
            <HardDrive className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Offline Maps</span>
            {cacheStats.tileCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-mono border border-amber-500/30">
                {cacheStats.tileCount}
              </span>
            )}
          </button>

          {/* Tile Layer Pills */}
          <div className="hidden md:flex items-center bg-stone-950/90 backdrop-blur-md p-1 rounded-xl border border-stone-800 shadow-xl">
            {(['dark', 'osm', 'satellite'] as const).map((tileKey) => (
              <button
                key={tileKey}
                onClick={() => setActiveTileKey(tileKey)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-colors ${
                  activeTileKey === tileKey
                    ? 'bg-stone-800 text-amber-400 font-bold shadow-sm'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                {TILE_LAYERS[tileKey].name}
              </button>
            ))}
          </div>

          {/* Layers Toggle */}
          <div className="relative">
            <button
              onClick={() => setShowLayerMenu(!showLayerMenu)}
              className="p-2 rounded-xl bg-stone-950/90 backdrop-blur-md border border-stone-800 text-stone-300 hover:text-white shadow-xl"
              title="Toggle GIS Layers"
            >
              <Layers className="w-4 h-4 text-amber-400" />
            </button>

            {showLayerMenu && (
              <div className="absolute right-0 mt-2 w-52 p-3 rounded-2xl bg-stone-900 border border-stone-800 shadow-2xl text-stone-200 text-xs font-mono space-y-2 z-[500]">
                <div className="font-bold text-stone-100 pb-1 border-b border-stone-800 text-[11px] uppercase tracking-wider text-amber-400">
                  GIS Layer Visibility
                </div>
                {Object.entries(layerFilters).map(([key, val]) => (
                  <label key={key} className="flex items-center justify-between cursor-pointer py-0.5">
                    <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                    <input
                      type="checkbox"
                      checked={val}
                      onChange={(e) =>
                        setLayerFilters({ ...layerFilters, [key]: e.target.checked })
                      }
                      className="rounded accent-amber-500"
                    />
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Fullscreen Button */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 rounded-xl bg-stone-950/90 backdrop-blur-md border border-stone-800 text-stone-300 hover:text-white shadow-xl"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Map'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Disaster Proximity Warning Alert Banner (Section 15) */}
      {hazardWarningProximity && (
        <div className="absolute top-16 left-3 right-3 z-[430] flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-red-950/95 border-2 border-red-600 text-red-100 text-xs font-mono shadow-2xl backdrop-blur-md animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-5 h-5 text-red-400 flex-shrink-0 animate-pulse" />
            <div>
              <span className="font-bold text-white uppercase">
                {hazardWarningProximity.isInside ? '🚨 DANGER: INSIDE HAZARD ZONE' : '⚠ HAZARD PROXIMITY ALERT'}:
              </span>{' '}
              <span>
                {hazardWarningProximity.isInside
                  ? `You are inside active ${hazardWarningProximity.hazard.disasterType} zone "${hazardWarningProximity.hazard.name}"! Evacuate immediately.`
                  : `You are ${Math.round(hazardWarningProximity.distanceMeters)}m from ${hazardWarningProximity.hazard.disasterType} zone "${hazardWarningProximity.hazard.name}".`}
              </span>
              {hazardWarningProximity.hazard.isModelEstimate && (
                <span className="ml-2 px-1.5 py-0.5 rounded bg-amber-900/80 text-amber-200 text-[10px] border border-amber-600">
                  AI Spread Prediction (Model Estimate)
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => {
              if (mapInstanceRef.current && hazardWarningProximity.hazard.coordinates.length > 0) {
                const [firstLat, firstLng] = hazardWarningProximity.hazard.coordinates[0];
                mapInstanceRef.current.flyTo([firstLat, firstLng], 14, { duration: 1.2 });
              }
            }}
            className="px-2.5 py-1 rounded-lg bg-red-800 hover:bg-red-700 text-white text-[10px] font-bold tracking-wider uppercase flex-shrink-0 ml-2 cursor-pointer shadow"
          >
            View Zone
          </button>
        </div>
      )}

      {/* Location Status & Telemetry Strip (Section 8 & 19) */}
      <div className="absolute top-16 right-3 z-[410] hidden sm:flex items-center gap-2 pointer-events-auto">
        <div className="flex items-center gap-2 bg-stone-950/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-stone-800 text-xs font-mono shadow-xl">
          {/* Status Indicator (Section 8) */}
          <div className="flex items-center gap-1.5">
            {locationStatus === 'LOCATING' ? (
              <>
                <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
                <span className="text-sky-300 font-bold text-[11px]">LOCATING GPS...</span>
              </>
            ) : locationStatus === 'LOCATION_ACTIVE' ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-emerald-300 font-bold text-[11px]">LOCATION ACTIVE</span>
                <span className="px-1 py-0.2 rounded bg-emerald-950 text-emerald-400 text-[10px] border border-emerald-800">
                  ±{liveLocation?.accuracyMeters ? Math.round(liveLocation.accuracyMeters) : 15}m
                </span>
              </>
            ) : locationStatus === 'LOW_ACCURACY' ? (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-amber-300 font-bold text-[11px]">LOW ACCURACY</span>
                <span className="px-1 py-0.2 rounded bg-amber-950 text-amber-400 text-[10px] border border-amber-800">
                  ±{liveLocation?.accuracyMeters ? Math.round(liveLocation.accuracyMeters) : 50}m
                </span>
              </>
            ) : locationStatus === 'PERMISSION_DENIED' ? (
              <>
                <span className="w-2 h-2 rounded-full bg-red-400" />
                <span className="text-red-300 font-bold text-[11px]">PERMISSION DENIED</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-stone-500" />
                <span className="text-stone-400 font-bold text-[11px]">{locationStatus}</span>
              </>
            )}
          </div>

          <div className="w-[1px] h-3.5 bg-stone-800" />

          {/* Follow Mode Toggle Button (Section 5) */}
          <button
            onClick={() => setIsFollowMode(!isFollowMode)}
            className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase transition-colors cursor-pointer ${
              isFollowMode
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-700 shadow-sm'
                : 'text-stone-400 hover:text-stone-200'
            }`}
            title="When active, keeps map centered on your moving GPS location"
          >
            {isFollowMode ? '● FOLLOWING LOCATION' : 'FOLLOW MODE'}
          </button>

          <div className="w-[1px] h-3.5 bg-stone-800" />

          {/* Battery Conservation Tracking Toggle (Section 19) */}
          <button
            onClick={isTrackingLocation ? stopLocationTracking : () => startLocationTracking()}
            className="text-[10px] font-bold text-stone-400 hover:text-amber-300 transition-colors cursor-pointer"
            title="Conserve battery by toggling continuous GPS sensor polling"
          >
            {isTrackingLocation ? 'Pause GPS' : 'Resume GPS'}
          </button>
        </div>
      </div>

      {/* Offline Status Active Banner */}
      {(!isOnline || !navigator.onLine) && (
        <div className="absolute top-28 left-3 right-3 z-[410] flex items-center justify-between px-3.5 py-2 rounded-xl bg-amber-950/95 border border-amber-600/90 text-amber-200 text-xs font-mono shadow-2xl backdrop-blur-md animate-in fade-in">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 text-amber-400 animate-pulse flex-shrink-0" />
            <div>
              <span className="font-bold text-amber-300">OFFLINE MAP ACTIVE:</span>{' '}
              <span className="text-stone-300">
                Serving cached tiles & tactical grid. All shelter pins and evacuation routes remain functional.
              </span>
            </div>
          </div>
          <button
            onClick={() => setShowOfflineModal(true)}
            className="px-2.5 py-1 rounded-lg bg-amber-900/80 hover:bg-amber-800 border border-amber-700 text-amber-200 text-[11px] font-bold transition-all flex-shrink-0 ml-2"
          >
            Manage Packs
          </button>
        </div>
      )}

      {/* Geolocation Notification Toast */}
      {locationError && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[450] px-4 py-2 rounded-xl bg-red-950/90 border border-red-700 text-red-200 text-xs font-mono shadow-2xl backdrop-blur-md animate-in fade-in flex items-center gap-2">
          <span>{locationError}</span>
          <button
            onClick={() => setShowLocationModal(true)}
            className="underline text-amber-400 hover:text-amber-300 font-bold ml-1"
          >
            Options
          </button>
        </div>
      )}

      {/* Real Leaflet Map DOM Canvas */}
      <div ref={mapContainerRef} className="w-full h-full min-h-[380px] flex-1 z-0" />

      {/* Bottom Floating Navigation HUD & Coordinates Bar */}
      <div className="absolute bottom-3 left-3 right-3 z-[400] flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Left Coordinates HUD */}
        <div className="pointer-events-auto flex items-center gap-2 bg-stone-950/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-stone-800 shadow-xl text-[11px] font-mono text-stone-300">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>
            {mapCenterCoords.lat}° N, {mapCenterCoords.lng}° E
          </span>
          <span className="text-stone-500">|</span>
          <span className="text-stone-400">Zoom: {mapCenterCoords.zoom}x</span>
          {cacheStats.tileCount > 0 && (
            <>
              <span className="text-stone-500">|</span>
              <span className="text-amber-400">Cached: {cacheStats.tileCount} tiles</span>
            </>
          )}
        </div>

        {/* Right Tactical Zoom & My Location Buttons (Section 5) */}
        <div className="pointer-events-auto flex items-center gap-1.5 bg-stone-950/90 backdrop-blur-md p-1 rounded-xl border border-stone-800 shadow-xl">
          <button
            onClick={handleMyLocation}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all shadow-md active:scale-95 cursor-pointer ${
              isFollowMode
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                : 'bg-stone-800 hover:bg-sky-600 text-stone-200 hover:text-white'
            }`}
            title="Center on My Location & Enable Follow Mode"
          >
            <LocateFixed className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">◎ My Location</span>
          </button>
          <div className="w-[1px] h-4 bg-stone-800" />
          <button
            onClick={handleZoomIn}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Location Permission & Fallback Modal (Section 3) */}
      <LocationPermissionModal
        isOpen={showPermissionDialog}
        onClose={() => setShowPermissionDialog(false)}
        status={locationStatus}
        errorDetail={contextLocationError}
        onGrantPermission={confirmPermissionAndStartTracking}
        onOpenManualModal={() => setShowLocationModal(true)}
        onEnablePinDrop={() => setIsPinDropMode(true)}
      />

      {/* Offline Maps Management Modal */}
      <OfflineMapsModal
        isOpen={showOfflineModal}
        onClose={() => {
          setShowOfflineModal(false);
          refreshCacheStats();
        }}
        currentMapBounds={currentMapBounds}
        isSimulatedOffline={!isOnline}
        onToggleOfflineMode={toggleConnectivity}
        onSelectRegionBounds={(bounds) => {
          setShowOfflineModal(false);
          if (mapInstanceRef.current) {
            mapInstanceRef.current.fitBounds([
              [bounds.south, bounds.west],
              [bounds.north, bounds.east],
            ]);
          }
        }}
      />

      {/* Location Selector & GPS Diagnostics Modal */}
      <LocationModal
        isOpen={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        currentLocation={userLocation}
        locationError={locationErrorDetail}
        onSelectLocation={(loc) => {
          setUserLocation(loc);
          setSelectedRegionId('custom-pin');
          if (mapInstanceRef.current) {
            mapInstanceRef.current.flyTo([loc.lat, loc.lng], 15, { duration: 1.5 });
          }
        }}
        onRetryGps={handleGetLiveLocation}
        isLocating={isLocating}
      />
    </div>
  );
};

export interface OfflineMapPack {
  id: string;
  name: string;
  region: string;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  minZoom: number;
  maxZoom: number;
  tileCount: number;
  sizeBytes: number;
  downloadedAt: string;
}

export interface DownloadProgress {
  total: number;
  completed: number;
  failed: number;
  percent: number;
  activePackId: string;
  isFinished: boolean;
}

export const CACHE_NAME = 'resqmap-offline-tiles-v1';
const PACKS_STORAGE_KEY = 'resqmap_offline_packs_meta';

// Pre-packaged Disaster Map Packs in India
export const PRESET_OFFLINE_PACKS: Omit<OfflineMapPack, 'downloadedAt' | 'sizeBytes' | 'tileCount'>[] = [
  {
    id: 'pack-delhi-yamuna',
    name: 'Delhi Yamuna River Flood Basin',
    region: 'Delhi NCR',
    bounds: {
      north: 28.740,
      south: 28.580,
      east: 77.340,
      west: 77.180,
    },
    minZoom: 12,
    maxZoom: 14,
  },
  {
    id: 'pack-kerala-wayanad',
    name: 'Wayanad Landslide & Meppadi Sector',
    region: 'Kerala',
    bounds: {
      north: 11.620,
      south: 11.480,
      east: 76.240,
      west: 76.080,
    },
    minZoom: 12,
    maxZoom: 14,
  },
  {
    id: 'pack-mumbai-flood',
    name: 'Mumbai Coastal & Mithi River Basin',
    region: 'Maharashtra',
    bounds: {
      north: 19.140,
      south: 18.980,
      east: 72.950,
      west: 72.800,
    },
    minZoom: 12,
    maxZoom: 14,
  },
  {
    id: 'pack-odisha-cyclone',
    name: 'Odisha Coastal Cyclone Corridor (Puri/Bhubaneswar)',
    region: 'Odisha',
    bounds: {
      north: 20.350,
      south: 19.750,
      east: 85.900,
      west: 85.700,
    },
    minZoom: 12,
    maxZoom: 14,
  },
  {
    id: 'pack-uttarakhand-hills',
    name: 'Uttarakhand Cloudburst & Valley Sector',
    region: 'Uttarakhand',
    bounds: {
      north: 30.800,
      south: 30.650,
      east: 78.550,
      west: 78.350,
    },
    minZoom: 12,
    maxZoom: 14,
  },
];

/**
 * Converts lat/lng to tile numbers
 */
export function long2tile(lon: number, zoom: number): number {
  return Math.floor(((lon + 180) / 360) * Math.pow(2, zoom));
}

export function lat2tile(lat: number, zoom: number): number {
  return Math.floor(
    ((1 -
      Math.log(
        Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)
      ) /
        Math.PI) /
      2) *
      Math.pow(2, zoom)
  );
}

/**
 * Calculates list of all tile coordinates (z, x, y) within a bounding box
 */
export function getTileCoordinatesForBounds(
  bounds: { north: number; south: number; east: number; west: number },
  minZoom: number,
  maxZoom: number
): { z: number; x: number; y: number }[] {
  const tiles: { z: number; x: number; y: number }[] = [];

  for (let z = minZoom; z <= maxZoom; z++) {
    const minX = Math.min(long2tile(bounds.west, z), long2tile(bounds.east, z));
    const maxX = Math.max(long2tile(bounds.west, z), long2tile(bounds.east, z));
    const minY = Math.min(lat2tile(bounds.north, z), lat2tile(bounds.south, z));
    const maxY = Math.max(lat2tile(bounds.north, z), lat2tile(bounds.south, z));

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        tiles.push({ z, x, y });
      }
    }
  }

  return tiles;
}

/**
 * Builds tile URL for CARTO Dark / OSM
 */
export function getTileUrl(
  tile: { z: number; x: number; y: number },
  provider: 'dark' | 'osm' = 'dark'
): string {
  const subdomains = ['a', 'b', 'c', 'd'];
  const s = subdomains[(tile.x + tile.y) % subdomains.length];
  if (provider === 'osm') {
    return `https://${s}.tile.openstreetmap.org/${tile.z}/${tile.x}/${tile.y}.png`;
  }
  return `https://${s}.basemaps.cartocdn.com/dark_all/${tile.z}/${tile.x}/${tile.y}.png`;
}

/**
 * Generates an in-memory Canvas data URL representing a tactical offline grid tile.
 * Used when offline and the tile wasn't pre-cached, so map is never blank.
 */
const offlineTileCache = new Map<string, string>();

export function getOfflineFallbackTile(x: number, y: number, z: number): string {
  const key = `${z}/${x}/${y}`;
  if (offlineTileCache.has(key)) {
    return offlineTileCache.get(key)!;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    // Dark military base color
    ctx.fillStyle = '#141413';
    ctx.fillRect(0, 0, 256, 256);

    // Subtle grid lines
    ctx.strokeStyle = '#292524';
    ctx.lineWidth = 1;

    for (let i = 0; i <= 256; i += 32) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 256);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(256, i);
      ctx.stroke();
    }

    // Border
    ctx.strokeStyle = '#38322e';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(0, 0, 256, 256);

    // Tactical crosshairs in corners
    ctx.strokeStyle = '#78716c';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(10, 16);
    ctx.lineTo(22, 16);
    ctx.moveTo(16, 10);
    ctx.lineTo(16, 22);
    ctx.stroke();

    // Text watermark
    ctx.fillStyle = '#78716c';
    ctx.font = '9px monospace';
    ctx.fillText(`OFFLINE SECTOR [Z${z}]`, 28, 20);

    ctx.fillStyle = '#57534e';
    ctx.font = '8px monospace';
    ctx.fillText(`Grid ${x},${y} • Cached Overlays Active`, 14, 240);
  }

  const dataUrl = canvas.toDataURL('image/png');
  offlineTileCache.set(key, dataUrl);
  return dataUrl;
}

/**
 * Retrieves list of installed offline map packs
 */
export function getSavedOfflinePacks(): OfflineMapPack[] {
  try {
    const raw = localStorage.getItem(PACKS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Saves or updates an offline pack in local metadata
 */
export function saveOfflinePackMeta(pack: OfflineMapPack): void {
  const existing = getSavedOfflinePacks().filter((p) => p.id !== pack.id);
  existing.push(pack);
  localStorage.setItem(PACKS_STORAGE_KEY, JSON.stringify(existing));
}

/**
 * Deletes an offline pack from local metadata and removes its tiles from cache
 */
export async function deleteOfflinePack(packId: string): Promise<void> {
  const existing = getSavedOfflinePacks();
  const filtered = existing.filter((p) => p.id !== packId);
  localStorage.setItem(PACKS_STORAGE_KEY, JSON.stringify(filtered));

  // If no packs remain, we can clear the whole tile cache
  if (filtered.length === 0 && 'caches' in window) {
    try {
      await caches.delete(CACHE_NAME);
    } catch (e) {
      console.warn('Could not clear caches', e);
    }
  }
}

/**
 * Downloads a map area and stores all tiles into CacheStorage
 */
export async function downloadAreaTiles(
  packId: string,
  packName: string,
  region: string,
  bounds: { north: number; south: number; east: number; west: number },
  minZoom: number,
  maxZoom: number,
  onProgress?: (progress: DownloadProgress) => void
): Promise<OfflineMapPack> {
  if (!('caches' in window)) {
    throw new Error('CacheStorage API is not supported in this browser.');
  }

  const cache = await caches.open(CACHE_NAME);
  const tiles = getTileCoordinatesForBounds(bounds, minZoom, maxZoom);

  const total = tiles.length;
  let completed = 0;
  let failed = 0;
  let totalBytes = 0;

  // Process in batches to avoid browser socket exhaustion
  const BATCH_SIZE = 6;
  for (let i = 0; i < tiles.length; i += BATCH_SIZE) {
    const batch = tiles.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async (tile) => {
        const url = getTileUrl(tile, 'dark');

        try {
          // Check if already in cache
          const existing = await cache.match(url);
          if (existing) {
            completed++;
            const blob = await existing.blob();
            totalBytes += blob.size;
          } else {
            const res = await fetch(url, { mode: 'cors' });
            if (res.ok) {
              const clone = res.clone();
              await cache.put(url, clone);
              const blob = await res.blob();
              totalBytes += blob.size;
              completed++;
            } else {
              failed++;
            }
          }
        } catch {
          failed++;
        }

        if (onProgress) {
          onProgress({
            total,
            completed,
            failed,
            percent: Math.round(((completed + failed) / total) * 100),
            activePackId: packId,
            isFinished: false,
          });
        }
      })
    );
  }

  const newPack: OfflineMapPack = {
    id: packId,
    name: packName,
    region,
    bounds,
    minZoom,
    maxZoom,
    tileCount: completed,
    sizeBytes: totalBytes,
    downloadedAt: new Date().toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
  };

  saveOfflinePackMeta(newPack);

  if (onProgress) {
    onProgress({
      total,
      completed,
      failed,
      percent: 100,
      activePackId: packId,
      isFinished: true,
    });
  }

  return newPack;
}

/**
 * Returns cache diagnostics: estimated size and tile count
 */
export async function getOfflineCacheStats(): Promise<{
  tileCount: number;
  sizeMb: number;
}> {
  if (!('caches' in window)) {
    return { tileCount: 0, sizeMb: 0 };
  }

  try {
    const cache = await caches.open(CACHE_NAME);
    const keys = await cache.keys();
    const packs = getSavedOfflinePacks();
    const totalBytes = packs.reduce((acc, p) => acc + (p.sizeBytes || 0), 0);
    const sizeMb = Number((totalBytes / (1024 * 1024)).toFixed(2));
    return {
      tileCount: keys.length,
      sizeMb: sizeMb > 0 ? sizeMb : Number((keys.length * 0.02).toFixed(2)),
    };
  } catch {
    return { tileCount: 0, sizeMb: 0 };
  }
}

/**
 * Completely purges offline tile cache
 */
export async function clearAllOfflineTiles(): Promise<void> {
  if ('caches' in window) {
    await caches.delete(CACHE_NAME);
  }
  localStorage.removeItem(PACKS_STORAGE_KEY);
}

import L from 'leaflet';
import { CACHE_NAME, getOfflineFallbackTile } from '../../services/offlineMapService';

/**
 * Custom Leaflet TileLayer that supports:
 * 1. Read from CacheStorage (instant offline loading)
 * 2. Background caching of visited tiles
 * 3. Tactical fallback canvas grid tile when offline and tile is uncached (no broken map!)
 */
export function createResQMapTileLayer(
  urlTemplate: string,
  options: L.TileLayerOptions & { isSimulatedOffline?: boolean }
): L.TileLayer {
  const CustomLayer = L.TileLayer.extend({
    createTile(coords: L.Coords, done: (error: any, tile: HTMLImageElement) => void) {
      const tile = document.createElement('img') as HTMLImageElement;

      tile.alt = '';
      tile.setAttribute('role', 'presentation');

      const url = this.getTileUrl(coords);
      const isOffline = options.isSimulatedOffline || !navigator.onLine;

      // Clean cleanup helper for object URLs
      const assignSrc = (src: string, isObjectUrl = false) => {
        tile.onload = () => {
          if (isObjectUrl) {
            URL.revokeObjectURL(src);
          }
          done(null, tile);
        };
        tile.onerror = () => {
          if (isObjectUrl) {
            URL.revokeObjectURL(src);
          }
          // Fallback to offline tactical grid
          tile.onload = () => done(null, tile);
          tile.src = getOfflineFallbackTile(coords.x, coords.y, coords.z);
        };
        tile.src = src;
      };

      if (!('caches' in window)) {
        if (isOffline) {
          assignSrc(getOfflineFallbackTile(coords.x, coords.y, coords.z));
        } else {
          assignSrc(url);
        }
        return tile;
      }

      // Check CacheStorage first
      caches
        .open(CACHE_NAME)
        .then((cache) => {
          return cache.match(url).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse.blob().then((blob) => {
                const objectUrl = URL.createObjectURL(blob);
                assignSrc(objectUrl, true);
              });
            }

            // Not in cache
            if (isOffline) {
              // Directly use offline fallback canvas tile
              assignSrc(getOfflineFallbackTile(coords.x, coords.y, coords.z));
              return;
            }

            // Online: fetch tile and save to cache
            fetch(url, { mode: 'cors' })
              .then((res) => {
                if (res.ok) {
                  const clone = res.clone();
                  cache.put(url, clone).catch(() => {});
                  return res.blob();
                }
                throw new Error('Tile fetch failed');
              })
              .then((blob) => {
                const objectUrl = URL.createObjectURL(blob);
                assignSrc(objectUrl, true);
              })
              .catch(() => {
                // If fetch fails even though online, fall back to offline canvas tile
                assignSrc(getOfflineFallbackTile(coords.x, coords.y, coords.z));
              });
          });
        })
        .catch(() => {
          if (isOffline) {
            assignSrc(getOfflineFallbackTile(coords.x, coords.y, coords.z));
          } else {
            assignSrc(url);
          }
        });

      return tile;
    },
  });

  return new (CustomLayer as any)(urlTemplate, options);
}

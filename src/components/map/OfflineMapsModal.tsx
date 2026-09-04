import React, { useState, useEffect } from 'react';
import {
  Download,
  HardDrive,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Layers,
  X,
  RefreshCw,
  Wifi,
  WifiOff,
  MapPin,
  Check,
  Compass,
} from 'lucide-react';
import {
  OfflineMapPack,
  PRESET_OFFLINE_PACKS,
  getSavedOfflinePacks,
  deleteOfflinePack,
  downloadAreaTiles,
  getOfflineCacheStats,
  clearAllOfflineTiles,
  DownloadProgress,
} from '../../services/offlineMapService';

interface OfflineMapsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMapBounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  isSimulatedOffline?: boolean;
  onToggleOfflineMode?: () => void;
  onSelectRegionBounds?: (bounds: { north: number; south: number; east: number; west: number }) => void;
}

export const OfflineMapsModal: React.FC<OfflineMapsModalProps> = ({
  isOpen,
  onClose,
  currentMapBounds,
  isSimulatedOffline,
  onToggleOfflineMode,
  onSelectRegionBounds,
}) => {
  const [savedPacks, setSavedPacks] = useState<OfflineMapPack[]>([]);
  const [cacheStats, setCacheStats] = useState<{ tileCount: number; sizeMb: number }>({
    tileCount: 0,
    sizeMb: 0,
  });
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const loadData = async () => {
    setSavedPacks(getSavedOfflinePacks());
    const stats = await getOfflineCacheStats();
    setCacheStats(stats);
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isDownloading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDownloading, onClose]);

  if (!isOpen) return null;

  // Handle download of a preset pack
  const handleDownloadPreset = async (preset: typeof PRESET_OFFLINE_PACKS[0]) => {
    if (isDownloading) return;
    setIsDownloading(true);
    setStatusMessage(`Preparing offline tiles for ${preset.name}...`);

    try {
      await downloadAreaTiles(
        preset.id,
        preset.name,
        preset.region,
        preset.bounds,
        preset.minZoom,
        preset.maxZoom,
        (prog) => {
          setDownloadProgress(prog);
        }
      );
      setStatusMessage(`Successfully downloaded offline map for ${preset.name}!`);
      await loadData();
    } catch (err: any) {
      setStatusMessage(`Download error: ${err.message}`);
    } finally {
      setIsDownloading(false);
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  // Handle download of current visible screen
  const handleDownloadCurrentView = async () => {
    if (!currentMapBounds || isDownloading) return;
    setIsDownloading(true);
    const customId = `pack-custom-${Date.now()}`;
    setStatusMessage('Downloading current visible sector for offline use...');

    try {
      await downloadAreaTiles(
        customId,
        'Current Map View (Custom Sector)',
        'Local Area',
        currentMapBounds,
        12,
        14,
        (prog) => {
          setDownloadProgress(prog);
        }
      );
      setStatusMessage('Current map area cached for offline navigation!');
      await loadData();
    } catch (err: any) {
      setStatusMessage(`Error caching view: ${err.message}`);
    } finally {
      setIsDownloading(false);
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  // Handle delete
  const handleDeletePack = async (packId: string) => {
    await deleteOfflinePack(packId);
    await loadData();
  };

  // Handle clear all
  const handleClearAll = async () => {
    if (window.confirm('Clear all cached offline maps? You will need internet connection to reload tiles.')) {
      await clearAllOfflineTiles();
      await loadData();
      setStatusMessage('All offline tile caches cleared.');
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-2.5 sm:p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isDownloading) {
          onClose();
        }
      }}
    >
      <div
        className="relative w-full max-w-2xl max-h-[92vh] sm:max-h-[90vh] flex flex-col rounded-2xl bg-stone-900 border border-stone-800 shadow-2xl text-stone-100 font-sans overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-800 bg-stone-950">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-stone-100">
                  Offline Maps & Disaster Tile Storage
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">
                  ResQ-Cache v1
                </span>
              </div>
              <p className="text-xs text-stone-400">
                Download high-risk Indian disaster sectors to navigate when cell towers & power fail
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cache Diagnostics & Status Banner */}
        <div className="p-4 bg-stone-950/60 border-b border-stone-800 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
          <div className="p-3 rounded-xl bg-stone-900/80 border border-stone-800">
            <span className="text-stone-400 block text-[11px]">Storage In Use:</span>
            <span className="text-base font-bold text-amber-400 mt-0.5 block">
              {cacheStats.sizeMb} MB
            </span>
            <span className="text-[10px] text-stone-500">{cacheStats.tileCount} tiles in CacheStorage</span>
          </div>

          <div className="p-3 rounded-xl bg-stone-900/80 border border-stone-800">
            <span className="text-stone-400 block text-[11px]">Saved Packs:</span>
            <span className="text-base font-bold text-emerald-400 mt-0.5 block">
              {savedPacks.length} Sectors
            </span>
            <span className="text-[10px] text-stone-500">Available 100% offline</span>
          </div>

          <div className="p-3 rounded-xl bg-stone-900/80 border border-stone-800 flex flex-col justify-between">
            <span className="text-stone-400 block text-[11px]">Offline Simulation:</span>
            <button
              onClick={onToggleOfflineMode}
              className={`mt-1 flex items-center justify-between px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                isSimulatedOffline
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
              }`}
            >
              <div className="flex items-center gap-1.5">
                {isSimulatedOffline ? <WifiOff className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5" />}
                <span>{isSimulatedOffline ? 'Offline Active' : 'Online Mode'}</span>
              </div>
              <span className="text-[10px] underline">Toggle</span>
            </button>
          </div>
        </div>

        {/* Progress Bar if Downloading */}
        {isDownloading && downloadProgress && (
          <div className="p-4 bg-amber-950/40 border-b border-amber-800/60 animate-pulse">
            <div className="flex items-center justify-between text-xs font-mono text-amber-300 mb-1.5">
              <span className="flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Downloading Tiles ({downloadProgress.completed}/{downloadProgress.total})...</span>
              </span>
              <span className="font-bold">{downloadProgress.percent}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-stone-800 overflow-hidden">
              <div
                className="h-full bg-amber-500 transition-all duration-300 rounded-full"
                style={{ width: `${downloadProgress.percent}%` }}
              />
            </div>
          </div>
        )}

        {/* Status Notification Toast */}
        {statusMessage && (
          <div className="p-3 bg-emerald-950/80 border-b border-emerald-800 text-emerald-200 text-xs font-mono flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{statusMessage}</span>
            </div>
          </div>
        )}

        {/* Quick Action: Download Current View */}
        <div className="p-4 border-b border-stone-800 bg-stone-900/50 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-bold font-mono text-stone-200 uppercase tracking-wider">
              Cache Current Visible View
            </h3>
            <p className="text-[11px] text-stone-400 mt-0.5">
              Downloads map tiles for your currently visible screen across zoom levels 12-14 (~30-80 tiles)
            </p>
          </div>
          <button
            onClick={handleDownloadCurrentView}
            disabled={isDownloading || !currentMapBounds}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-stone-950 font-bold font-mono text-xs shadow-md transition-all active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>Download Current Screen</span>
          </button>
        </div>

        {/* Main Content: Preset Indian Disaster Packs */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="text-[11px] font-mono uppercase tracking-wider text-amber-400 font-bold flex items-center justify-between">
            <span>High-Risk Disaster Sector Packs (India)</span>
            <span className="text-[10px] text-stone-500 lowercase">pre-configured bounding boxes</span>
          </div>

          <div className="space-y-2.5">
            {PRESET_OFFLINE_PACKS.map((preset) => {
              const installed = savedPacks.find((p) => p.id === preset.id);

              return (
                <div
                  key={preset.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl bg-stone-950/80 border border-stone-800 hover:border-stone-700 gap-3 transition-all"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-stone-100">{preset.name}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-stone-800 text-stone-300">
                        {preset.region}
                      </span>
                      {installed && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center gap-1">
                          <Check className="w-2.5 h-2.5" />
                          <span>Installed ({installed.tileCount} tiles)</span>
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-stone-400 mt-1">
                      Coverage: Lat {preset.bounds.south.toFixed(2)}° to {preset.bounds.north.toFixed(2)}° • Lng {preset.bounds.west.toFixed(2)}° to {preset.bounds.east.toFixed(2)}° (Zooms {preset.minZoom}-{preset.maxZoom})
                    </p>
                    {installed && (
                      <p className="text-[10px] font-mono text-stone-500 mt-1">
                        Downloaded on {installed.downloadedAt} • Approx {(installed.sizeBytes / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                    {installed ? (
                      <>
                        <button
                          onClick={() => onSelectRegionBounds && onSelectRegionBounds(preset.bounds)}
                          className="px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-mono"
                          title="View on Map"
                        >
                          Show on Map
                        </button>
                        <button
                          onClick={() => handleDeletePack(preset.id)}
                          className="p-2 rounded-lg bg-red-950/50 hover:bg-red-900/60 text-red-400 border border-red-900/80 transition-colors"
                          title="Delete from offline storage"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleDownloadPreset(preset)}
                        disabled={isDownloading}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-400 border border-stone-700 text-xs font-mono font-bold transition-all active:scale-95 disabled:opacity-50"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download Pack</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Installed Custom Packs List */}
          {savedPacks.filter((p) => p.id.startsWith('pack-custom-')).length > 0 && (
            <div className="mt-4 pt-3 border-t border-stone-800 space-y-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-stone-400 font-bold">
                Custom Downloaded Viewports
              </span>
              {savedPacks
                .filter((p) => p.id.startsWith('pack-custom-'))
                .map((pack) => (
                  <div
                    key={pack.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-stone-950 border border-stone-800 text-xs font-mono"
                  >
                    <div>
                      <span className="font-bold text-stone-200 block">{pack.name}</span>
                      <span className="text-[10px] text-stone-500">
                        {pack.tileCount} tiles • {pack.downloadedAt}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeletePack(pack.id)}
                      className="p-1.5 rounded-lg text-red-400 hover:bg-red-950"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Footer info & Clear All */}
        <div className="p-4 border-t border-stone-800 bg-stone-950 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-stone-400">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Automatic Cache: Visited areas stay offline-cached automatically</span>
          </div>

          {cacheStats.tileCount > 0 && (
            <button
              onClick={handleClearAll}
              className="text-red-400 hover:text-red-300 hover:underline flex items-center gap-1 text-[11px]"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Purge Cache</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

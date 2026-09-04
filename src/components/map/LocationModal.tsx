import React, { useState, useEffect } from 'react';
import {
  MapPin,
  LocateFixed,
  Search,
  AlertTriangle,
  ExternalLink,
  Check,
  X,
  Compass,
  Radio,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import {
  POPULAR_INDIAN_LOCATIONS,
  LocationResult,
  LocationErrorDetail,
} from '../../services/geolocationService';

interface LocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLocation: { lat: number; lng: number; address: string };
  locationError?: LocationErrorDetail | null;
  onSelectLocation: (loc: { lat: number; lng: number; address: string }) => void;
  onRetryGps: () => void;
  isLocating?: boolean;
}

export const LocationModal: React.FC<LocationModalProps> = ({
  isOpen,
  onClose,
  currentLocation,
  locationError,
  onSelectLocation,
  onRetryGps,
  isLocating,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [customLat, setCustomLat] = useState(currentLocation.lat.toString());
  const [customLng, setCustomLng] = useState(currentLocation.lng.toString());
  const [customAddress, setCustomAddress] = useState(currentLocation.address);
  const [activeTab, setActiveTab] = useState<'search' | 'manual'>('search');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredPresets = POPULAR_INDIAN_LOCATIONS.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.state.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleApplyManual = (e: React.FormEvent) => {
    e.preventDefault();
    const lat = parseFloat(customLat);
    const lng = parseFloat(customLng);
    if (!isNaN(lat) && !isNaN(lng)) {
      onSelectLocation({
        lat,
        lng,
        address: customAddress || `Manual Coordinates (${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E)`,
      });
      onClose();
    }
  };

  const handleOpenStandalone = () => {
    // Open in standalone tab so browser prompts for direct hardware GPS without iframe restrictions
    window.open(window.location.href, '_blank');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-2.5 sm:p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="relative w-full max-w-lg max-h-[92vh] sm:max-h-[90vh] flex flex-col rounded-2xl bg-stone-900 border border-stone-800 shadow-2xl text-stone-100 font-sans overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-800 bg-stone-950">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400">
              <LocateFixed className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-stone-100">
                Set Evacuation GPS Location
              </h2>
              <p className="text-xs text-stone-400">
                Determines closest shelters, flood alerts, and rescue routes
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

        {/* Current Active Location Banner */}
        <div className="p-4 bg-stone-950/80 border-b border-stone-800">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-sky-400 font-bold block">
                Current Active Location:
              </span>
              <p className="text-xs font-bold text-stone-100 mt-0.5">{currentLocation.address}</p>
              <p className="text-[11px] font-mono text-stone-400 mt-0.5">
                Lat: {currentLocation.lat.toFixed(4)}° N • Lng: {currentLocation.lng.toFixed(4)}° E
              </p>
            </div>
            <button
              onClick={onRetryGps}
              disabled={isLocating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-mono text-xs font-bold transition-all active:scale-95 shadow-md flex-shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
              <span>{isLocating ? 'Locking...' : 'Re-acquire GPS'}</span>
            </button>
          </div>

          {/* GPS Diagnostics Warning / Explanation if restricted or timed out */}
          {locationError && (
            <div className="mt-3 p-3 rounded-xl bg-amber-950/50 border border-amber-800/80 text-xs font-mono text-amber-300">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold block">Notice on Live GPS Detection:</span>
                  <p className="text-[11px] text-stone-300 leading-snug">
                    {locationError.message}
                  </p>
                  <p className="text-[10px] text-stone-400">
                    Browsers or embedded preview iframes can block hardware satellite GPS. You can either search your city below or open in a direct tab.
                  </p>
                  <button
                    onClick={handleOpenStandalone}
                    className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-sky-400 hover:underline"
                  >
                    <span>Open in New Standalone Tab for Native Hardware GPS</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tab Toggle: Search Presets vs. Manual Coordinates */}
        <div className="flex border-b border-stone-800 bg-stone-950 px-4 pt-2 gap-2 text-xs font-mono">
          <button
            onClick={() => setActiveTab('search')}
            className={`pb-2 px-3 font-bold border-b-2 transition-colors ${
              activeTab === 'search'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            Search Disaster Zones & Cities (India)
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`pb-2 px-3 font-bold border-b-2 transition-colors ${
              activeTab === 'manual'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            Manual Lat / Lng
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'search' ? (
            <div className="space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search Indian disaster location (e.g., Yamuna, Wayanad, Mumbai, Puri, Kurla)..."
                  className="w-full pl-9 pr-4 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-200 placeholder-stone-500 focus:outline-none focus:border-sky-500 font-sans"
                />
              </div>

              <div className="space-y-2">
                {filteredPresets.map((loc) => (
                  <button
                    key={loc.name}
                    onClick={() => {
                      onSelectLocation({
                        lat: loc.lat,
                        lng: loc.lng,
                        address: `${loc.name}, ${loc.state}`,
                      });
                      onClose();
                    }}
                    className="w-full text-left p-3 rounded-xl bg-stone-950/70 hover:bg-stone-950 border border-stone-800 hover:border-sky-500/50 transition-all flex items-center justify-between group"
                  >
                    <div>
                      <span className="text-xs font-bold text-stone-200 group-hover:text-sky-300 block">
                        {loc.name}
                      </span>
                      <span className="text-[10px] font-mono text-stone-500">
                        {loc.state} • {loc.lat.toFixed(4)}° N, {loc.lng.toFixed(4)}° E
                      </span>
                    </div>
                    <span className="text-xs font-mono text-stone-500 group-hover:text-sky-400">
                      Select →
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <form onSubmit={handleApplyManual} className="space-y-3">
              <div>
                <label className="block text-[11px] font-mono text-stone-400 mb-1">
                  Location / Sector Name
                </label>
                <input
                  type="text"
                  value={customAddress}
                  onChange={(e) => setCustomAddress(e.target.value)}
                  placeholder="e.g. My Current Basecamp, Delhi"
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-200 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono text-stone-400 mb-1">
                    Latitude (° N)
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={customLat}
                    onChange={(e) => setCustomLat(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-200 focus:outline-none focus:border-sky-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-stone-400 mb-1">
                    Longitude (° E)
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={customLng}
                    onChange={(e) => setCustomLng(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-200 focus:outline-none focus:border-sky-500 font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-mono text-xs font-bold transition-all shadow-md mt-2"
              >
                Apply Custom Coordinates
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

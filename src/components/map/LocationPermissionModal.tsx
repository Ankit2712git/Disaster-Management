import React from 'react';
import {
  MapPin,
  ShieldCheck,
  AlertTriangle,
  LocateFixed,
  Compass,
  Search,
  ExternalLink,
  X,
  Radio,
  BatteryCharging,
} from 'lucide-react';
import { LocationStatus, LocationErrorDetail } from '../../services/location/locationService';

interface LocationPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: LocationStatus;
  errorDetail: LocationErrorDetail | null;
  onGrantPermission: () => void;
  onOpenManualModal: () => void;
  onEnablePinDrop: () => void;
}

export const LocationPermissionModal: React.FC<LocationPermissionModalProps> = ({
  isOpen,
  onClose,
  status,
  errorDetail,
  onGrantPermission,
  onOpenManualModal,
  onEnablePinDrop,
}) => {
  if (!isOpen) return null;

  const isDenied = status === 'PERMISSION_DENIED' || errorDetail?.code === 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-md rounded-2xl bg-stone-900 border border-stone-800 shadow-2xl text-stone-100 font-sans overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-800 bg-stone-950">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${
              isDenied
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                : 'bg-sky-500/10 border-sky-500/30 text-sky-400'
            }`}>
              {isDenied ? <AlertTriangle className="w-5 h-5" /> : <LocateFixed className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-100">
                {isDenied ? 'Location Access Unavailable' : 'Enable Live GPS Location'}
              </h2>
              <p className="text-xs text-stone-400">
                {isDenied ? 'Fallback options available below' : 'ResQMap Emergency System'}
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

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          {!isDenied ? (
            <>
              {/* Disclosure required by Section 3 */}
              <div className="p-3.5 rounded-xl bg-sky-950/40 border border-sky-800/60 text-sky-200 space-y-2">
                <p className="text-xs leading-relaxed font-medium">
                  "ResQMap needs your location to show where you are, find nearby shelters, and calculate emergency routes."
                </p>
              </div>

              <div className="space-y-2 text-stone-300">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>Privacy First:</strong> Your raw location coordinates remain local to your browser and are only transmitted when an emergency SOS rescue is explicitly submitted.
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <BatteryCharging className="w-4 h-4 text-sky-400 mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>Battery Conservation:</strong> Tracking uses efficient event watching and can be paused at any time via the map controls.
                  </span>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={onGrantPermission}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold font-mono text-xs flex items-center justify-center gap-2 shadow-lg transition-colors cursor-pointer"
                >
                  <LocateFixed className="w-4 h-4" /> Allow Location Tracking
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenManualModal();
                  }}
                  className="px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-mono text-xs cursor-pointer transition-colors"
                >
                  Select Manually
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Permission Denied / Unavailable Flow (Section 3) */}
              <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-800/60 text-amber-200 space-y-2">
                <div className="font-bold flex items-center gap-1.5 text-amber-300">
                  <AlertTriangle className="w-4 h-4" /> Location access is unavailable.
                </div>
                <p className="text-[11px] text-amber-200/80 leading-relaxed">
                  {errorDetail?.message ||
                    'Browser permission was blocked or hardware GPS is disabled. You can continue using ResQMap by selecting an alternative below.'}
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-stone-300 font-mono font-bold uppercase text-[10px] tracking-wider">
                  Alternative ways to set your location:
                </p>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenManualModal();
                  }}
                  className="w-full p-3 rounded-xl bg-stone-950 hover:bg-stone-800 border border-stone-800 flex items-center gap-3 text-left transition-colors cursor-pointer"
                >
                  <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400">
                    <Search className="w-4 h-4" />
                  </div>
                  <div>
                    <strong className="block text-stone-100 text-xs">Search for a location</strong>
                    <span className="text-[11px] text-stone-400">Search city, neighborhood, or sector preset</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onEnablePinDrop();
                  }}
                  className="w-full p-3 rounded-xl bg-stone-950 hover:bg-stone-800 border border-stone-800 flex items-center gap-3 text-left transition-colors cursor-pointer"
                >
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <strong className="block text-stone-100 text-xs">Drop a pin manually</strong>
                    <span className="text-[11px] text-stone-400">Click anywhere on the map to place your position</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenManualModal();
                  }}
                  className="w-full p-3 rounded-xl bg-stone-950 hover:bg-stone-800 border border-stone-800 flex items-center gap-3 text-left transition-colors cursor-pointer"
                >
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                    <Compass className="w-4 h-4" />
                  </div>
                  <div>
                    <strong className="block text-stone-100 text-xs">Enter coordinates manually</strong>
                    <span className="text-[11px] text-stone-400">Input exact Latitude and Longitude degrees</span>
                  </div>
                </button>
              </div>

              <div className="pt-2 flex justify-between items-center">
                <span className="text-[10px] text-stone-500">ResQMap will never crash on missing GPS</span>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 font-mono text-xs cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

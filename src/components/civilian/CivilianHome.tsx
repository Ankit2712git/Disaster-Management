import React, { useState } from 'react';
import {
  Home,
  ShieldAlert,
  Bell,
  AlertTriangle,
  Navigation,
  MapPin,
  Clock,
  Wifi,
  WifiOff,
  ChevronRight,
  Flame,
  CheckCircle,
  PhoneCall,
  Compass,
  Layers,
} from 'lucide-react';
import { useEmergency } from '../../context/EmergencyContext';
import { EmergencyMap } from '../map/EmergencyMap';
import { IndianHelplinesModal } from '../common/IndianHelplinesModal';

interface CivilianHomeProps {
  onNavigateTab: (tab: 'home' | 'map' | 'shelters' | 'alerts' | 'sos') => void;
  onOpenSOSModal: () => void;
  onOpenHazardModal: () => void;
}

export const CivilianHome: React.FC<CivilianHomeProps> = ({
  onNavigateTab,
  onOpenSOSModal,
  onOpenHazardModal,
}) => {
  const {
    userLocation,
    isOnline,
    lastSyncTime,
    alerts,
    shelters,
    activeScenario,
    incidents,
    currentUser,
  } = useEmergency();

  const [showHelplinesModal, setShowHelplinesModal] = useState<boolean>(false);

  const mySOS = incidents.find(
    (i) => (i.reporterUserId === currentUser.id || i.reporterName === currentUser.name) && i.status !== 'resolved'
  );

  const criticalAlert = alerts.find((a) => a.severity === 'critical');
  const availableSheltersCount = shelters.filter((s) => s.status === 'open').length;

  return (
    <div className="max-w-4xl mx-auto space-y-4 pb-12">
      {/* Offline Alert Banner if offline */}
      {!isOnline && (
        <div className="bg-red-950/90 border-2 border-red-600 rounded-xl p-3.5 flex items-start gap-3 shadow-lg">
          <div className="p-2 rounded-lg bg-red-900 text-red-100 flex-shrink-0">
            <WifiOff className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-red-100 uppercase tracking-wide">
              DEGRADED OFFLINE MODE ACTIVE
            </h3>
            <p className="text-xs text-red-200 mt-0.5">
              Operating on locally cached emergency maps and shelter locations. SOS requests will be queued locally and transmitted automatically once connection is restored.
            </p>
          </div>
        </div>
      )}

      {/* Emergency Status Card */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 sm:p-5 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-800 pb-3">
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
            </span>
            <span className="text-stone-300 font-semibold uppercase">
              Current Situation: {activeScenario.toUpperCase()} EMERGENCY
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-stone-400 font-mono">
            <Clock className="w-3.5 h-3.5 text-stone-500" />
            <span>Map Freshness: {lastSyncTime}</span>
          </div>
        </div>

        {/* Location Display */}
        <div className="mt-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-stone-300 truncate">
            <MapPin className="w-4 h-4 text-sky-400 flex-shrink-0" />
            <span className="text-stone-400">Your Location:</span>
            <span className="font-medium text-stone-200 truncate">{userLocation.address}</span>
          </div>
          <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800 flex-shrink-0">
            GPS Locked
          </span>
        </div>
      </div>

      {/* Active User SOS Bar (if civilian has an active request) */}
      {mySOS && (
        <div
          onClick={() => onNavigateTab('sos')}
          className="bg-gradient-to-r from-red-950 via-stone-900 to-amber-950 border-2 border-red-500 rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:border-red-400 transition-all shadow-xl"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-600 text-white rounded-xl font-bold animate-pulse">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-red-400 uppercase">
                  Active Rescue Request: {mySOS.id}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-red-900/80 text-red-200 uppercase font-mono font-bold">
                  {mySOS.status.replace('_', ' ')}
                </span>
              </div>
              <p className="text-sm font-semibold text-stone-100">
                {mySOS.assignedTeamName ? `Assigned: ${mySOS.assignedTeamName}` : 'Received by Dispatch. Awaiting Unit Assignment.'}
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-stone-400" />
        </div>
      )}

      {/* PRIMARY EMERGENCY ACTIONS (BIG TOUCH TARGETS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {/* 1. FIND SAFE SHELTER */}
        <button
          onClick={() => onNavigateTab('shelters')}
          className="group relative bg-emerald-950/60 hover:bg-emerald-900/80 border-2 border-emerald-600/90 rounded-2xl p-5 text-left transition-all shadow-lg flex items-start gap-4"
          id="btn-find-shelter"
        >
          <div className="p-3 bg-emerald-600 text-white rounded-xl shadow-md group-hover:scale-105 transition-transform flex-shrink-0">
            <Home className="w-7 h-7" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-emerald-100 uppercase tracking-wide">
                FIND SAFE SHELTER
              </h2>
              <ChevronRight className="w-5 h-5 text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <p className="text-xs text-emerald-200/90 mt-1 leading-relaxed">
              Find nearest open shelters with verified capacity and recommended evacuation routes avoiding reported hazards.
            </p>
            <div className="mt-2.5 flex items-center gap-2 text-[11px] font-mono text-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>{availableSheltersCount} Open Shelters Nearby</span>
            </div>
          </div>
        </button>

        {/* 2. REQUEST RESCUE (SOS) */}
        <button
          onClick={onOpenSOSModal}
          className="group relative bg-red-950/70 hover:bg-red-900/90 border-2 border-red-600 rounded-2xl p-5 text-left transition-all shadow-lg flex items-start gap-4 animate-pulse hover:animate-none"
          id="btn-request-rescue"
        >
          <div className="p-3 bg-red-600 text-white rounded-xl shadow-md group-hover:scale-105 transition-transform flex-shrink-0">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-red-100 uppercase tracking-wide">
                REQUEST RESCUE (SOS)
              </h2>
              <ChevronRight className="w-5 h-5 text-red-400 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <p className="text-xs text-red-200/90 mt-1 leading-relaxed">
              Trapped, injured, or facing imminent danger? Transmit your exact location and situation directly to Search & Rescue teams.
            </p>
            <div className="mt-2.5 flex items-center gap-2 text-[11px] font-mono text-red-300">
              <span className="w-2 h-2 rounded-full bg-red-400" />
              <span>Priority 1 Emergency Dispatch</span>
            </div>
          </div>
        </button>

        {/* 3. DISASTER ALERTS */}
        <button
          onClick={() => onNavigateTab('alerts')}
          className="group bg-stone-900 hover:bg-stone-800 border border-stone-700/80 rounded-2xl p-4 sm:p-5 text-left transition-all shadow-md flex items-start gap-4"
          id="btn-disaster-alerts"
        >
          <div className="p-3 bg-amber-600/90 text-white rounded-xl shadow-md group-hover:scale-105 transition-transform flex-shrink-0">
            <Bell className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-stone-100 uppercase tracking-wide">
                DISASTER ALERTS
              </h2>
              <ChevronRight className="w-4 h-4 text-stone-400 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <p className="text-xs text-stone-400 mt-1">
              Official evacuation orders, perimeter forecasts, and emergency safety guidelines for your area.
            </p>
            <div className="mt-2 text-[11px] font-mono text-amber-400">
              {alerts.length} Active Notifications ({alerts.filter((a) => a.severity === 'critical').length} Critical)
            </div>
          </div>
        </button>

        {/* 4. REPORT HAZARD */}
        <button
          onClick={onOpenHazardModal}
          className="group bg-stone-900 hover:bg-stone-800 border border-stone-700/80 rounded-2xl p-4 sm:p-5 text-left transition-all shadow-md flex items-start gap-4"
          id="btn-report-hazard"
        >
          <div className="p-3 bg-stone-800 border border-stone-700 text-amber-400 rounded-xl shadow-md group-hover:scale-105 transition-transform flex-shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-stone-100 uppercase tracking-wide">
                REPORT HAZARD
              </h2>
              <ChevronRight className="w-4 h-4 text-stone-400 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <p className="text-xs text-stone-400 mt-1">
              Report impassable roads, collapsed trees, arcing electrical lines, or flash flood waters to warn others.
            </p>
            <div className="mt-2 text-[11px] font-mono text-stone-400">
              Helps reroute evacuees safely
            </div>
          </div>
        </button>
      </div>

      {/* Live Map Preview Card */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-bold text-stone-100 uppercase tracking-wide">
              Live Tactical Situation Map
            </h3>
          </div>
          <button
            onClick={() => onNavigateTab('map')}
            className="text-xs text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1"
          >
            Open Full Map <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <EmergencyMap
          heightClass="h-72 sm:h-96"
          onSelectShelter={() => onNavigateTab('shelters')}
          showControls={true}
        />
      </div>

      {/* Indian National Emergency Helplines Bar */}
      <div className="bg-stone-950 border border-stone-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs text-stone-300 font-mono shadow-md">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <PhoneCall className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span className="text-stone-400">EMERGENCY (INDIA):</span>
            <a
              href="tel:112"
              className="text-red-300 font-bold hover:underline px-2 py-0.5 rounded-lg bg-red-950/80 border border-red-700/80"
              title="Call 112 National All-in-One Emergency"
            >
              112 (National)
            </a>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-stone-400">DISASTER (NDMA):</span>
            <a
              href="tel:1078"
              className="text-amber-300 font-bold hover:underline px-2 py-0.5 rounded-lg bg-amber-950/80 border border-amber-700/80"
              title="Call 1078 NDMA Control Room"
            >
              1078
            </a>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-stone-400">AMBULANCE:</span>
            <a
              href="tel:108"
              className="text-emerald-300 font-bold hover:underline px-2 py-0.5 rounded-lg bg-emerald-950/80 border border-emerald-700/80"
              title="Call 108 Medical Ambulance"
            >
              108
            </a>
          </div>
        </div>

        <button
          onClick={() => setShowHelplinesModal(true)}
          className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-400 hover:text-amber-300 border border-stone-700 text-xs font-bold transition-all active:scale-95"
        >
          View All Indian Helplines Directory →
        </button>
      </div>

      {/* Indian Helplines Directory Modal */}
      <IndianHelplinesModal
        isOpen={showHelplinesModal}
        onClose={() => setShowHelplinesModal(false)}
      />
    </div>
  );
};

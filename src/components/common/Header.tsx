import React, { useState } from 'react';
import {
  ShieldAlert,
  Radio,
  Wifi,
  WifiOff,
  UserCheck,
  Flame,
  Waves,
  Activity,
  Layers,
  PhoneCall,
  Sliders,
  ChevronDown,
  Phone,
} from 'lucide-react';
import { useEmergency } from '../../context/EmergencyContext';
import { UserRole } from '../../types';
import { PWAInstallButton } from './PWAInstallButton';
import { IndianHelplinesModal } from './IndianHelplinesModal';

export const Header: React.FC = () => {
  const {
    currentUser,
    switchRole,
    appMode,
    setAppMode,
    isOnline,
    toggleConnectivity,
    activeScenario,
    setActiveScenario,
    alerts,
  } = useEmergency();

  const [showHelplinesModal, setShowHelplinesModal] = useState(false);

  const criticalAlert = alerts.find((a) => a.severity === 'critical');

  const roleLabels: Record<UserRole, { title: string; color: string }> = {
    civilian: { title: 'Civilian (Citizen Mobile)', color: 'bg-sky-500/10 text-sky-400 border-sky-500/30' },
    responder: { title: 'Search & Rescue Responder', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
    incident_commander: { title: 'Incident Commander', color: 'bg-rose-500/10 text-rose-400 border-rose-500/30' },
    drone_operator: { title: 'Tactical Drone Operator', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' },
    shelter_manager: { title: 'Shelter Coordinator', color: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
    wildlife_rescue: { title: 'Wildlife Rescue Unit', color: 'bg-lime-500/10 text-lime-400 border-lime-500/30' },
    admin: { title: 'GIS Systems Administrator', color: 'bg-purple-500/10 text-purple-400 border-purple-500/30' },
  };

  return (
    <header className="sticky top-0 z-[1200] bg-stone-950 border-b border-stone-800 text-stone-100 shadow-xl">
      {/* Top Critical Alert Marquee if exists */}
      {criticalAlert && (
        <div className="bg-red-950/90 border-b border-red-800/80 px-4 py-1.5 flex items-center justify-between text-xs text-red-200">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="flex-shrink-0 flex items-center justify-center w-4 h-4 rounded-full bg-red-600 text-white font-bold text-[10px] animate-pulse">
              !
            </span>
            <span className="font-bold text-red-100 uppercase tracking-wide flex-shrink-0">
              {criticalAlert.title}:
            </span>
            <span className="truncate text-red-200 text-[11px] font-sans">
              {criticalAlert.message}
            </span>
          </div>
          <span className="hidden sm:inline-block flex-shrink-0 font-mono text-[10px] text-red-400 pl-2">
            OFFICIAL COMMAND NOTICE
          </span>
        </div>
      )}

      {/* Main Bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Brand & Platform Identity */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-red-600 to-amber-600 text-white shadow-lg border border-red-400/30">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black tracking-tight text-white font-mono">
                ResQ<span className="text-amber-500">Map</span>
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-800 uppercase tracking-wider font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                INDIA NDMA / SDMA
              </span>
            </div>
            <p className="hidden md:block text-[11px] text-stone-400 -mt-0.5">
              National Disaster Management, Live GIS Mapping & Rescue Grid
            </p>
          </div>
        </div>

        {/* Center/Status Controls: Helplines, Connectivity, Scenario, Role */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 flex-wrap">
          {/* Quick Indian Helplines Button */}
          <button
            type="button"
            onClick={() => setShowHelplinesModal(true)}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-red-950/80 hover:bg-red-900/90 text-red-200 border border-red-700/80 text-xs font-mono font-bold transition-all active:scale-95 shadow-sm min-h-[36px] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
            title="Open National Emergency Helplines (112, 1078, 108)"
            aria-label="Open Indian Emergency Helplines directory"
          >
            <Phone className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
            <span>112 Helplines</span>
          </button>

          {/* Connectivity Status & Toggle (Critical for Offline Testing) */}
          <button
            type="button"
            onClick={toggleConnectivity}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-mono transition-all min-h-[36px] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
              isOnline
                ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/80 hover:bg-emerald-900/60'
                : 'bg-red-950/90 text-red-300 border-red-600 animate-pulse hover:bg-red-900/90'
            }`}
            title="Click to toggle simulated network connectivity"
            aria-label={isOnline ? 'Network status: Online. Click to simulate offline mode.' : 'Network status: Offline. Click to reconnect.'}
          >
            {isOnline ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span className="font-bold">ONLINE</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                <span className="font-bold">OFFLINE</span>
              </>
            )}
          </button>

          {/* Role Switcher Dropdown */}
          <div className="relative">
            <label htmlFor="user-role-select" className="sr-only">Switch User Role</label>
            <select
              id="user-role-select"
              value={currentUser.role}
              onChange={(e) => switchRole(e.target.value as UserRole)}
              className="appearance-none bg-stone-900 hover:bg-stone-850 border border-stone-700 hover:border-stone-600 text-stone-200 text-xs rounded-xl px-2.5 sm:px-3 py-1.5 pr-7 font-mono font-semibold focus:outline-none focus:border-amber-500 focus-visible:ring-2 focus-visible:ring-amber-500 cursor-pointer shadow-sm min-h-[36px] transition-colors"
              aria-label="Switch User Role"
            >
              <option value="civilian">Civilian (Citizen)</option>
              <option value="responder">Search & Rescue Responder</option>
              <option value="incident_commander">Incident Commander</option>
              <option value="drone_operator">Drone Operator</option>
              <option value="shelter_manager">Shelter Manager</option>
              <option value="wildlife_rescue">Wildlife Rescue Unit</option>
              <option value="admin">GIS System Admin</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-stone-400 absolute right-2.5 top-3 pointer-events-none" />
          </div>

          {/* Mode Switch Button (Civilian Mobile vs Responder Dashboard) */}
          <button
            type="button"
            onClick={() => setAppMode(appMode === 'civilian' ? 'operations' : 'civilian')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold tracking-wide transition-all flex items-center gap-1.5 border shadow-sm min-h-[36px] cursor-pointer active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
              appMode === 'operations'
                ? 'bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold border-amber-400'
                : 'bg-stone-850 hover:bg-stone-800 text-stone-100 border-stone-700'
            }`}
            aria-label={appMode === 'civilian' ? 'Switch to Operations Mode' : 'Switch to Civilian App'}
          >
            <Radio className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="hidden sm:inline">
              {appMode === 'civilian' ? 'Operations Mode' : 'Civilian App'}
            </span>
            <span className="sm:hidden">
              {appMode === 'civilian' ? 'Ops' : 'Civilian'}
            </span>
          </button>

          {/* In-App PWA Install Trigger */}
          <PWAInstallButton />
        </div>
      </div>

      {/* Indian Helplines Directory Modal */}
      <IndianHelplinesModal
        isOpen={showHelplinesModal}
        onClose={() => setShowHelplinesModal(false)}
      />
    </header>
  );
};

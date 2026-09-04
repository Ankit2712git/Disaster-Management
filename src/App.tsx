import React, { useState } from 'react';
import { EmergencyProvider, useEmergency } from './context/EmergencyContext';
import { Header } from './components/common/Header';
import { SimulationBar } from './components/common/SimulationBar';
import { CivilianHome } from './components/civilian/CivilianHome';
import { FindShelterView } from './components/civilian/FindShelterView';
import { EmergencyMap } from './components/map/EmergencyMap';
import { AlertsView } from './components/civilian/AlertsView';
import { RescueStatusTracker } from './components/civilian/RescueStatusTracker';
import { RequestRescueModal } from './components/civilian/RequestRescueModal';
import { ReportHazardModal } from './components/civilian/ReportHazardModal';
import { OperationsDashboard } from './components/operations/OperationsDashboard';
import { OfflineIndicator } from './components/common/OfflineIndicator';
import {
  Home,
  Navigation,
  MapPin,
  Bell,
  ShieldAlert,
  Radio,
  AlertTriangle,
  Compass,
  Layers,
} from 'lucide-react';

const ResQMapApp: React.FC = () => {
  const {
    appMode,
    setAppMode,
    currentUser,
    incidents,
    alerts,
    isOnline,
    setSelectedIncident,
  } = useEmergency();

  // Civilian navigation state
  const [civilianTab, setCivilianTab] = useState<'home' | 'shelters' | 'map' | 'alerts' | 'sos'>('home');

  // Modals state
  const [isSOSModalOpen, setIsSOSModalOpen] = useState<boolean>(false);
  const [isHazardModalOpen, setIsHazardModalOpen] = useState<boolean>(false);

  // Check if current user has an active SOS
  const activeSOS = incidents.find(
    (i) => (i.reporterUserId === currentUser.id || i.reporterName === currentUser.name) && i.status !== 'resolved'
  );

  const handleSOSSuccess = (incidentId: string) => {
    setCivilianTab('sos');
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans selection:bg-amber-500 selection:text-stone-950">
      {/* Global Header with Role Switcher & Network Toggle */}
      <Header />

      {/* Simulation Scenario Toolbar */}
      <SimulationBar />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5">
        {appMode === 'operations' ? (
          /* RESPONDER / OPERATIONS DASHBOARD */
          <OperationsDashboard />
        ) : (
          /* CIVILIAN EMERGENCY CITIZEN APP */
          <div className="space-y-4">
            {/* Civilian Tab Navigation Bar */}
            <div className="bg-stone-900 border border-stone-800 rounded-2xl p-1.5 flex items-center justify-start gap-1.5 overflow-x-auto no-scrollbar shadow-md">
              <button
                onClick={() => setCivilianTab('home')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold font-mono transition-colors whitespace-nowrap flex-shrink-0 ${
                  civilianTab === 'home'
                    ? 'bg-amber-600 text-stone-950 shadow'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
                }`}
              >
                <Home className="w-3.5 h-3.5" />
                <span>Home</span>
              </button>

              <button
                onClick={() => setCivilianTab('shelters')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold font-mono transition-colors whitespace-nowrap flex-shrink-0 ${
                  civilianTab === 'shelters'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
                }`}
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>Find Safe Shelter</span>
              </button>

              <button
                onClick={() => setCivilianTab('map')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold font-mono transition-colors whitespace-nowrap flex-shrink-0 ${
                  civilianTab === 'map'
                    ? 'bg-sky-600 text-white shadow'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Tactical Map</span>
              </button>

              <button
                onClick={() => setCivilianTab('alerts')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold font-mono transition-colors whitespace-nowrap flex-shrink-0 ${
                  civilianTab === 'alerts'
                    ? 'bg-amber-600 text-stone-950 shadow'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
                }`}
              >
                <Bell className="w-3.5 h-3.5" />
                <span>Alerts ({alerts.length})</span>
              </button>

              <button
                onClick={() => setCivilianTab('sos')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold font-mono transition-colors whitespace-nowrap flex-shrink-0 ${
                  civilianTab === 'sos'
                    ? 'bg-red-600 text-white shadow'
                    : activeSOS
                    ? 'text-red-400 bg-red-950/40 border border-red-800/80 animate-pulse'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>My SOS Status {activeSOS && '(!)'}</span>
              </button>
            </div>

            {/* Civilian Tab View Router */}
            {civilianTab === 'home' && (
              <CivilianHome
                onNavigateTab={(tab) => setCivilianTab(tab)}
                onOpenSOSModal={() => setIsSOSModalOpen(true)}
                onOpenHazardModal={() => setIsHazardModalOpen(true)}
              />
            )}

            {civilianTab === 'shelters' && <FindShelterView />}

            {civilianTab === 'map' && (
              <div className="space-y-3">
                <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold uppercase tracking-wide text-stone-100">
                      Full Screen Tactical Situation Map
                    </h2>
                    <p className="text-xs text-stone-400">
                      Toggle active hazards, flood levels, fire perimeter models, and drone survey grid overlays.
                    </p>
                  </div>
                  <button
                    onClick={() => setIsHazardModalOpen(true)}
                    className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-amber-400 border border-stone-700 rounded-xl text-xs font-mono flex items-center gap-1.5"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" /> Report Hazard
                  </button>
                </div>
                <EmergencyMap heightClass="h-[650px]" showControls={true} />
              </div>
            )}

            {civilianTab === 'alerts' && <AlertsView />}

            {civilianTab === 'sos' && (
              <RescueStatusTracker
                onBack={() => setCivilianTab('home')}
                onOpenNewSOS={() => setIsSOSModalOpen(true)}
              />
            )}
          </div>
        )}
      </main>

      {/* Floating Emergency SOS Action Button (Civilian Mode) */}
      {appMode === 'civilian' && (
        <aside aria-label="Emergency SOS Action" className="fixed bottom-5 right-5 z-40">
          <button
            onClick={() => setIsSOSModalOpen(true)}
            className="flex items-center gap-2 px-4 py-3 rounded-full bg-red-600 hover:bg-red-500 text-white font-black font-mono uppercase tracking-wider text-xs shadow-2xl border-2 border-red-400 ring-4 ring-red-600/30 transition-transform hover:scale-105 active:scale-95 animate-pulse"
            aria-label="Trigger Emergency SOS"
          >
            <ShieldAlert className="w-5 h-5" />
            <span>EMERGENCY SOS</span>
          </button>
        </aside>
      )}

      {/* Emergency Request Modal */}
      <RequestRescueModal
        isOpen={isSOSModalOpen}
        onClose={() => setIsSOSModalOpen(false)}
        onSuccess={handleSOSSuccess}
      />

      {/* Hazard Report Modal */}
      <ReportHazardModal
        isOpen={isHazardModalOpen}
        onClose={() => setIsHazardModalOpen(false)}
      />

      {/* Offline Status Floating Indicator */}
      <OfflineIndicator />

      {/* Footer Disclaimers */}
      <footer className="mt-auto border-t border-stone-800 bg-stone-950/90 py-4 px-4 text-center text-xs text-stone-400 font-mono space-y-1">
        <p>
          ResQMap Disaster Logistics & Emergency Response Platform — Built for Life-Safety Resilience.
        </p>
        <p className="text-[11px] text-stone-400">
          Simulation Data Mode active. All hazard perimeters, shelter capacities, and drone telemetry are live simulated vectors.
        </p>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <EmergencyProvider>
      <ResQMapApp />
    </EmergencyProvider>
  );
}

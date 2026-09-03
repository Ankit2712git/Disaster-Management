import React from 'react';
import {
  ShieldAlert,
  Clock,
  CheckCircle2,
  Users,
  MapPin,
  PhoneCall,
  AlertTriangle,
  Radio,
  BatteryCharging,
  Flame,
  ArrowLeft,
} from 'lucide-react';
import { useEmergency } from '../../context/EmergencyContext';
import { Incident } from '../../types';

interface RescueStatusTrackerProps {
  onBack: () => void;
  onOpenNewSOS: () => void;
}

export const RescueStatusTracker: React.FC<RescueStatusTrackerProps> = ({
  onBack,
  onOpenNewSOS,
}) => {
  const { incidents, currentUser, updateIncidentStatus, isOnline } = useEmergency();

  // Find user's active SOS incident
  const activeIncident = incidents.find(
    (i) => (i.reporterUserId === currentUser.id || i.reporterName === currentUser.name) && i.status !== 'resolved'
  ) || incidents[0]; // fallback to first incident if demo

  if (!activeIncident) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-stone-900 border border-stone-800 rounded-2xl text-center space-y-4 font-sans">
        <div className="p-3 bg-stone-800 text-stone-400 rounded-xl w-fit mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h3 className="text-base font-bold text-stone-200">No Active Rescue Request Found</h3>
        <p className="text-xs text-stone-400 max-w-md mx-auto">
          You currently have no open SOS requests on file. If you are in danger or trapped, submit an emergency SOS immediately.
        </p>
        <button
          onClick={onOpenNewSOS}
          className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold font-mono rounded-xl uppercase tracking-wider shadow-lg"
        >
          Submit Rescue Request
        </button>
      </div>
    );
  }

  const steps = [
    { id: 'reported', label: 'Signal Transmitted', desc: 'Received at Central Command' },
    { id: 'triaged', label: 'Triaged & Priority Set', desc: `Assigned Priority: ${activeIncident.priority.toUpperCase()}` },
    { id: 'assigned', label: 'Rescue Team Dispatched', desc: activeIncident.assignedTeamName ? `Team: ${activeIncident.assignedTeamName}` : 'Designating nearest ground unit' },
    { id: 'en_route', label: 'Team En Route', desc: activeIncident.assignedTeamName ? 'In transit via clear corridor' : 'Awaiting team departure' },
    { id: 'on_scene', label: 'Responders On Scene', desc: 'Tactical extraction active' },
    { id: 'resolved', label: 'Evacuation Complete', desc: 'Transported to safety' },
  ];

  const getStepStatus = (stepId: string) => {
    const order = ['reported', 'triaged', 'assigned', 'en_route', 'on_scene', 'resolved'];
    const currentIndex = order.indexOf(activeIncident.status);
    const stepIndex = order.indexOf(stepId);

    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'current';
    return 'pending';
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4 pb-12 font-sans">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-200 font-mono transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>

        <span className="text-xs font-mono text-stone-400">
          Incident #{activeIncident.id}
        </span>
      </div>

      {/* Hero Status Card */}
      <div className="bg-stone-900 border-2 border-red-600 rounded-2xl p-5 shadow-2xl text-stone-100 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-stone-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-600 text-white rounded-xl font-black text-lg animate-pulse">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-red-400 uppercase tracking-wide">
                  INCIDENT {activeIncident.id} ACTIVE
                </span>
                <span className="px-2 py-0.5 rounded bg-red-950 border border-red-800 text-red-300 font-mono text-[10px] font-bold uppercase">
                  {activeIncident.status.replace('_', ' ')}
                </span>
              </div>
              <h2 className="text-lg font-black text-stone-100 mt-0.5">
                {activeIncident.assignedTeamName ? `${activeIncident.assignedTeamName} Dispatched` : 'Rescue Request Queued for Dispatch'}
              </h2>
            </div>
          </div>

          <div className="text-right font-mono text-xs">
            <span className="text-stone-500 block text-[10px]">TIME REPORTED</span>
            <span className="text-stone-200 font-bold">{activeIncident.reportedAt}</span>
          </div>
        </div>

        {/* Status Timeline */}
        <div className="py-2">
          <h3 className="text-xs font-mono uppercase text-stone-400 font-bold mb-3 tracking-wide">
            Search & Rescue Dispatch Timeline
          </h3>

          <div className="relative border-l-2 border-stone-800 ml-4 pl-5 space-y-4">
            {steps.map((step, idx) => {
              const status = getStepStatus(step.id);
              return (
                <div key={step.id} className="relative group">
                  {/* Status Circle */}
                  <div
                    className={`absolute -left-[29px] top-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                      status === 'completed'
                        ? 'bg-emerald-500 border-emerald-400'
                        : status === 'current'
                        ? 'bg-red-600 border-red-400 ring-4 ring-red-500/20 animate-pulse'
                        : 'bg-stone-900 border-stone-700'
                    }`}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-bold uppercase tracking-wider font-mono ${
                          status === 'completed'
                            ? 'text-emerald-400'
                            : status === 'current'
                            ? 'text-red-400 font-black'
                            : 'text-stone-500'
                        }`}
                      >
                        {step.label}
                      </span>
                      {status === 'current' && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-red-950 text-red-300 font-mono">
                          ACTIVE STAGE
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-stone-400 mt-0.5">{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Incident Summary Info Box */}
        <div className="bg-stone-950/80 p-3.5 rounded-xl border border-stone-800 space-y-2 text-xs font-mono">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <div>
              <span className="text-stone-500 block text-[10px]">PEOPLE COUNT</span>
              <span className="text-stone-200 font-bold">{activeIncident.peopleCount} individuals</span>
            </div>
            <div>
              <span className="text-stone-500 block text-[10px]">SITUATION TYPE</span>
              <span className="text-red-400 font-bold uppercase">{activeIncident.type.replace('_', ' ')}</span>
            </div>
            <div>
              <span className="text-stone-500 block text-[10px]">MEDICAL TRIAGE</span>
              <span className={activeIncident.hasMedicalEmergency ? 'text-red-400 font-bold' : 'text-stone-300'}>
                {activeIncident.hasMedicalEmergency ? 'URGENT MEDICAL' : 'STABLE'}
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-stone-800 text-stone-300 text-xs">
            <span className="text-stone-500 block text-[10px]">REPORTED LOCATION:</span>
            <span>{activeIncident.location.address}</span>
          </div>

          {activeIncident.description && (
            <div className="pt-2 border-t border-stone-800 text-stone-300 text-xs">
              <span className="text-stone-500 block text-[10px]">FIELD NOTES:</span>
              <span className="italic">"{activeIncident.description}"</span>
            </div>
          )}
        </div>
      </div>

      {/* Safety Instructions While Waiting */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 sm:p-5 shadow-lg space-y-3">
        <div className="flex items-center gap-2 text-amber-400">
          <AlertTriangle className="w-5 h-5" />
          <h3 className="text-sm font-bold uppercase tracking-wide font-mono">
            Safety Advice While Waiting for First Responders
          </h3>
        </div>

        <ul className="space-y-2 text-xs text-stone-300">
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0 mt-1.5" />
            <span>
              <strong>Stay Low & Seal Doors:</strong> If smoke is present, stay close to the floor where air is cleanest. Place damp towels or clothing at door thresholds.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0 mt-1.5" />
            <span>
              <strong>Signal Your Position:</strong> Hang a bright cloth or whistle loudly if you hear rescuers approaching. Use your phone flashlight with intermittent flashes.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0 mt-1.5" />
            <span>
              <strong>Conserve Battery Power:</strong> Dim phone screen brightness, close unnecessary background apps, and keep notifications on for dispatch messages.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0 mt-1.5" />
            <span>
              <strong>Avoid Floodwaters:</strong> Never attempt to wade or swim through moving water above ankle height; rapid currents and downed power lines pose extreme hazards.
            </span>
          </li>
        </ul>
      </div>

      {/* Responder Comms / Update Incident Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-stone-950 border border-stone-800 rounded-xl text-xs font-mono">
        <div className="flex items-center gap-2 text-stone-400 flex-wrap">
          <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span>NDRF & Control Room Frequency Active</span>
          <span className="text-stone-600">|</span>
          <span className="text-stone-400">Escalate:</span>
          <a
            href="tel:112"
            className="text-red-400 font-bold hover:underline px-2 py-0.5 rounded bg-red-950/70 border border-red-800"
          >
            Call 112
          </a>
          <a
            href="tel:1078"
            className="text-amber-400 font-bold hover:underline px-2 py-0.5 rounded bg-amber-950/70 border border-amber-800"
          >
            NDMA 1078
          </a>
        </div>

        <button
          onClick={() => updateIncidentStatus(activeIncident.id, 'resolved')}
          className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg text-xs transition-colors"
        >
          Mark as Safe / Cancel Request
        </button>
      </div>
    </div>
  );
};

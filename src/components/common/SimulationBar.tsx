import React, { useState } from 'react';
import {
  Sparkles,
  Flame,
  Waves,
  Home,
  UserPlus,
  Send,
  PlaneTakeoff,
  WifiOff,
  Cpu,
  CheckCircle,
} from 'lucide-react';
import { useEmergency } from '../../context/EmergencyContext';

export const SimulationBar: React.FC = () => {
  const { triggerSimulation, isOnline, toggleConnectivity } = useEmergency();
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const handleTrigger = async (name: string, label: string) => {
    await triggerSimulation(name);
    setFeedbackMsg(`Activated: ${label}`);
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  return (
    <div className="bg-stone-900/95 border-b border-stone-800 px-3 py-2 text-stone-200 text-xs">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-[11px] font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            DEMO SIMULATION CONTROLS
          </span>
          {feedbackMsg && (
            <span className="flex items-center gap-1 text-emerald-400 font-mono text-[11px] animate-in fade-in">
              <CheckCircle className="w-3.5 h-3.5" />
              {feedbackMsg}
            </span>
          )}
        </div>

        {/* Quick Scenario Triggers */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 max-w-full">
          {/* Scenario: Wildfire */}
          <button
            onClick={() => handleTrigger('wildfire', 'Wildfire Front Escalation')}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-stone-800 hover:bg-stone-700 border border-stone-700 text-red-400 text-xs font-medium whitespace-nowrap transition-colors"
          >
            <Flame className="w-3 h-3" />
            Wildfire
          </button>

          {/* Scenario: Flood */}
          <button
            onClick={() => handleTrigger('flood', 'Mill Creek Flash Flood')}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-stone-800 hover:bg-stone-700 border border-stone-700 text-sky-400 text-xs font-medium whitespace-nowrap transition-colors"
          >
            <Waves className="w-3 h-3" />
            Flood
          </button>

          {/* Scenario: Shelter Full */}
          <button
            onClick={() => handleTrigger('shelter_full', 'Shelter A 100% Full (Auto-Reroute)')}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-stone-800 hover:bg-stone-700 border border-stone-700 text-amber-400 text-xs font-medium whitespace-nowrap transition-colors"
            title="Sets Shelter A to 250/250 to demonstrate dynamic rerouting to Shelter B"
          >
            <Home className="w-3 h-3" />
            Fill Shelter A
          </button>

          {/* Scenario: Trapped Person SOS */}
          <button
            onClick={() => handleTrigger('trapped_person', 'Trapped Civilian SOS Injection')}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-stone-800 hover:bg-stone-700 border border-stone-700 text-rose-400 text-xs font-medium whitespace-nowrap transition-colors"
          >
            <UserPlus className="w-3 h-3" />
            Trapped SOS
          </button>

          {/* Scenario: Dispatch Rescue Team */}
          <button
            onClick={() => handleTrigger('dispatch_team', 'Rescue Team Alpha Dispatched')}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-stone-800 hover:bg-stone-700 border border-stone-700 text-emerald-400 text-xs font-medium whitespace-nowrap transition-colors"
          >
            <Send className="w-3 h-3" />
            Dispatch Team
          </button>

          {/* Scenario: Drone Delivery */}
          <button
            onClick={() => handleTrigger('drone_delivery', 'Simulated Drone Relief Drop')}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-stone-800 hover:bg-stone-700 border border-stone-700 text-cyan-400 text-xs font-medium whitespace-nowrap transition-colors"
          >
            <PlaneTakeoff className="w-3 h-3" />
            Drone Delivery
          </button>

          {/* Scenario: Toggle Offline */}
          <button
            onClick={toggleConnectivity}
            className={`flex items-center gap-1 px-2.5 py-1 rounded border text-xs font-medium whitespace-nowrap transition-colors ${
              isOnline
                ? 'bg-stone-800 hover:bg-stone-700 text-stone-300 border-stone-700'
                : 'bg-red-950 text-red-300 border-red-800 font-bold'
            }`}
          >
            <WifiOff className="w-3 h-3" />
            {isOnline ? 'Simulate Offline' : 'Restore Online'}
          </button>
        </div>
      </div>
    </div>
  );
};

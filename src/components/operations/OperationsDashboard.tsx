import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  Radio,
  Home,
  Bot,
  PlaneTakeoff,
  FileText,
  Activity,
  HeartHandshake,
  Users,
  CheckCircle,
  AlertTriangle,
  Clock,
  Send,
  Sparkles,
  Download,
  Filter,
  Plane,
  MapPin,
  Building,
  Navigation,
  ExternalLink,
  ChevronRight,
  Battery,
} from 'lucide-react';
import { useEmergency } from '../../context/EmergencyContext';
import { Incident, Shelter, Drone, IncidentPriority, IncidentStatus } from '../../types';
import { EmergencyMap } from '../map/EmergencyMap';
import { DroneTelemetryWidget } from './DroneTelemetryWidget';
import { DeployDroneModal } from './DeployDroneModal';

export const OperationsDashboard: React.FC = () => {
  const {
    incidents,
    shelters,
    drones,
    droneMissions,
    wildlifeCases,
    rescueTeams,
    currentUser,
    selectedState,
    setSelectedState,
    updateIncidentStatus,
    assignRescueTeam,
    updateShelterCapacity,
    summarizeIncidentsWithAI,
    selectedIncident,
    setSelectedIncident,
    auditLogs,
  } = useEmergency();

  const [activeSubTab, setActiveSubTab] = useState<
    'incidents' | 'ai_assistant' | 'drones' | 'shelters' | 'wildlife' | 'audit'
  >('incidents');

  // Deploy Drone Modal State
  const [showDeployDroneModal, setShowDeployDroneModal] = useState<boolean>(false);
  const [deployDroneTarget, setDeployDroneTarget] = useState<{
    lat: number;
    lng: number;
    name?: string;
  } | undefined>(undefined);
  const [deployDronePreselectedId, setDeployDronePreselectedId] = useState<string | undefined>(undefined);

  // Available States in Indian Network
  const availableStates = useMemo(() => {
    const statesSet = new Set<string>();
    shelters.forEach((s) => {
      if (s.state) statesSet.add(s.state);
    });
    drones.forEach((d) => {
      if (d.state) statesSet.add(d.state);
    });
    return Array.from(statesSet).sort();
  }, [shelters, drones]);

  // Derived State-Filtered Drones
  const stateDrones = useMemo(() => {
    if (!selectedState || selectedState === 'all') return drones;
    return drones.filter((d) => d.state?.toLowerCase() === selectedState.toLowerCase());
  }, [drones, selectedState]);

  // Derived State-Filtered Drone Missions
  const stateDroneMissions = useMemo(() => {
    if (!selectedState || selectedState === 'all') return droneMissions;
    return droneMissions.filter(
      (m) =>
        m.state?.toLowerCase() === selectedState.toLowerCase() ||
        stateDrones.some((d) => d.id === m.droneId)
    );
  }, [droneMissions, stateDrones, selectedState]);

  // Derived State-Filtered Shelters
  const stateShelters = useMemo(() => {
    if (!selectedState || selectedState === 'all') return shelters;
    return shelters.filter((s) => s.state?.toLowerCase() === selectedState.toLowerCase());
  }, [shelters, selectedState]);

  // AI Prompt State
  const [aiPrompt, setAiPrompt] = useState<string>(
    'Analyze current shelter capacities, fire spread prediction towards East Valley, and recommend optimal route detours for emergency dispatch.'
  );
  const [aiRecommendation, setAiRecommendation] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);

  // Filters for Incidents
  const [incidentPriorityFilter, setIncidentPriorityFilter] = useState<string>('all');
  const [incidentStatusFilter, setIncidentStatusFilter] = useState<string>('active');

  const filteredIncidents = incidents.filter((inc) => {
    if (incidentPriorityFilter !== 'all' && inc.priority !== incidentPriorityFilter) return false;
    if (incidentStatusFilter === 'active' && inc.status === 'resolved') return false;
    if (incidentStatusFilter === 'resolved' && inc.status !== 'resolved') return false;
    return true;
  });

  const handleAskAI = async () => {
    if (!aiPrompt.trim()) return;
    setIsAiLoading(true);
    try {
      const res = await fetch('/api/ai/decision-support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt }),
      });
      if (res.ok) {
        const data = await res.json();
        setAiRecommendation(data.recommendation);
      } else {
        const fallback = await summarizeIncidentsWithAI();
        setAiRecommendation(fallback);
      }
    } catch {
      const fallback = await summarizeIncidentsWithAI();
      setAiRecommendation(fallback);
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4 pb-16 font-sans">
      {/* Top Banner with Responder Badges */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 sm:p-5 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-600 text-stone-950 font-black">
              <Radio className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black text-stone-100 uppercase tracking-wide">
                  TACTICAL OPERATIONS COMMAND
                </h1>
                <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 font-mono text-[10px] font-bold">
                  {currentUser.role.toUpperCase().replace('_', ' ')}
                </span>
              </div>
              <p className="text-xs text-stone-400 mt-0.5">
                Multi-agency rescue dispatch, automated shelter load-balancing & drone telemetry.
              </p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-3 font-mono text-xs">
            <div className="bg-stone-950 px-3 py-1.5 rounded-lg border border-stone-800">
              <span className="text-stone-500 block text-[10px]">ACTIVE SOS</span>
              <span className="text-red-400 font-bold">
                {incidents.filter((i) => i.status !== 'resolved').length} Open
              </span>
            </div>
            <div className="bg-stone-950 px-3 py-1.5 rounded-lg border border-stone-800">
              <span className="text-stone-500 block text-[10px]">RESCUE UNITS</span>
              <span className="text-emerald-400 font-bold">
                {rescueTeams.length} Deployed
              </span>
            </div>
            <div className="bg-stone-950 px-3 py-1.5 rounded-lg border border-stone-800">
              <span className="text-stone-500 block text-[10px]">ACTIVE DRONES</span>
              <span className="text-cyan-400 font-bold">
                {drones.filter((d) => d.status === 'airborne').length} Airborne
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-stone-800 overflow-x-auto text-xs font-mono">
          <button
            onClick={() => setActiveSubTab('incidents')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeSubTab === 'incidents'
                ? 'bg-amber-600 text-stone-950 shadow'
                : 'bg-stone-950 text-stone-400 hover:text-stone-200 border border-stone-800'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            Rescue Incidents ({incidents.filter((i) => i.status !== 'resolved').length})
          </button>

          <button
            onClick={() => setActiveSubTab('ai_assistant')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeSubTab === 'ai_assistant'
                ? 'bg-amber-600 text-stone-950 shadow'
                : 'bg-stone-950 text-stone-400 hover:text-stone-200 border border-stone-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            AI Decision Support (Gemini)
          </button>

          <button
            onClick={() => setActiveSubTab('drones')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeSubTab === 'drones'
                ? 'bg-cyan-600 text-stone-950 shadow'
                : 'bg-stone-950 text-stone-400 hover:text-cyan-300 border border-stone-800'
            }`}
          >
            <PlaneTakeoff className="w-3.5 h-3.5" />
            Drone Fleet ({stateDrones.length})
          </button>

          <button
            onClick={() => setActiveSubTab('shelters')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeSubTab === 'shelters'
                ? 'bg-emerald-600 text-stone-950 shadow'
                : 'bg-stone-950 text-stone-400 hover:text-emerald-300 border border-stone-800'
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            Shelter Logistics ({stateShelters.length})
          </button>

          <button
            onClick={() => setActiveSubTab('wildlife')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeSubTab === 'wildlife'
                ? 'bg-amber-600 text-stone-950 shadow'
                : 'bg-stone-950 text-stone-400 hover:text-stone-200 border border-stone-800'
            }`}
          >
            <HeartHandshake className="w-3.5 h-3.5" />
            Wildlife & Pets ({wildlifeCases.length})
          </button>

          <button
            onClick={() => setActiveSubTab('audit')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeSubTab === 'audit'
                ? 'bg-amber-600 text-stone-950 shadow'
                : 'bg-stone-950 text-stone-400 hover:text-stone-200 border border-stone-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Audit Logs ({auditLogs.length})
          </button>
        </div>

        {/* State Jurisdiction Filter Bar */}
        <div className="mt-3 pt-3 border-t border-stone-800/80 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2 py-1 rounded bg-stone-950 border border-stone-700 text-stone-300 font-mono text-xs font-bold flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-amber-400" />
              <span>STATE JURISDICTION:</span>
            </span>
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="bg-stone-950 border border-stone-700 hover:border-amber-500 text-stone-100 text-xs font-mono font-bold rounded-lg px-3 py-1.5 focus:outline-none focus:border-amber-500 cursor-pointer shadow-inner"
            >
              <option value="all">🇮🇳 All India (National Overview)</option>
              {availableStates.map((st) => (
                <option key={st} value={st}>
                  📍 {st} (SDMA Ops • {shelters.filter((s) => s.state?.toLowerCase() === st.toLowerCase()).length} Shelters • {drones.filter((d) => d.state?.toLowerCase() === st.toLowerCase()).length} UAVs)
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setDeployDroneTarget(undefined);
                setDeployDronePreselectedId(undefined);
                setShowDeployDroneModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-mono font-bold shadow-lg transition-all active:scale-95"
            >
              <Plane className="w-3.5 h-3.5" />
              <span>Deploy Drone to Any Location</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Map Overview for Operations */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-lg space-y-2">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-stone-300 font-bold uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            Active Tactical Grid & Responding Units
          </span>
          <span className="text-stone-500">Click any marker to inspect & dispatch</span>
        </div>
        <EmergencyMap
          heightClass="h-80 sm:h-96"
          onSelectIncident={(inc) => {
            setSelectedIncident(inc);
            setActiveSubTab('incidents');
          }}
        />
      </div>

      {/* TAB 1: INCIDENTS & RESCUE QUEUE */}
      {activeSubTab === 'incidents' && (
        <div className="space-y-4">
          {/* Controls & Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-stone-900 border border-stone-800 rounded-2xl p-3.5">
            <div className="flex items-center gap-2 text-xs font-mono">
              <Filter className="w-4 h-4 text-stone-400" />
              <span className="text-stone-400">Filter Priority:</span>
              <select
                value={incidentPriorityFilter}
                onChange={(e) => setIncidentPriorityFilter(e.target.value)}
                className="bg-stone-950 border border-stone-700 text-stone-200 text-xs rounded-lg px-2 py-1"
              >
                <option value="all">All Priorities</option>
                <option value="critical">Critical Only</option>
                <option value="high">High Only</option>
                <option value="moderate">Moderate Only</option>
              </select>

              <span className="text-stone-400 ml-2">Status:</span>
              <select
                value={incidentStatusFilter}
                onChange={(e) => setIncidentStatusFilter(e.target.value)}
                className="bg-stone-950 border border-stone-700 text-stone-200 text-xs rounded-lg px-2 py-1"
              >
                <option value="active">Active Only</option>
                <option value="resolved">Resolved Only</option>
                <option value="all">All Incidents</option>
              </select>
            </div>

            <div className="text-xs font-mono text-stone-400">
              Showing {filteredIncidents.length} of {incidents.length} rescue cases
            </div>
          </div>

          {/* Incidents Table / Cards */}
          <div className="grid grid-cols-1 gap-3">
            {filteredIncidents.map((incident) => {
              const isSelected = selectedIncident?.id === incident.id;
              const isCritical = incident.priority === 'critical';

              return (
                <div
                  key={incident.id}
                  className={`bg-stone-900 border rounded-2xl p-4 transition-all ${
                    isSelected
                      ? 'border-sky-500 ring-2 ring-sky-500/20'
                      : isCritical
                      ? 'border-red-600/80 shadow-md'
                      : 'border-stone-800 hover:border-stone-700'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    {/* Left: Incident info */}
                    <div className="space-y-1.5 flex-1 min-w-[280px]">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-black text-stone-100">
                          {incident.id}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                            incident.priority === 'critical'
                              ? 'bg-red-950 text-red-300 border border-red-700'
                              : incident.priority === 'high'
                              ? 'bg-amber-950 text-amber-300 border border-amber-700'
                              : 'bg-stone-800 text-stone-300'
                          }`}
                        >
                          {incident.priority}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-stone-800 text-stone-300 text-[10px] font-mono uppercase">
                          {incident.type.replace('_', ' ')}
                        </span>
                        <span className="text-xs font-mono text-stone-400">
                          • {incident.peopleCount} {incident.peopleCount === 1 ? 'person' : 'people'}
                        </span>
                        {incident.hasMedicalEmergency && (
                          <span className="px-1.5 py-0.5 rounded bg-red-600 text-white text-[10px] font-bold font-mono">
                            MED URGENT
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-stone-200 font-medium">
                        "{incident.description}"
                      </p>

                      <div className="flex items-center gap-3 text-[11px] font-mono text-stone-400 flex-wrap">
                        <span>📍 {incident.location.address}</span>
                        <span>⏱ Reported: {incident.reportedAt}</span>
                        {incident.reporterPhone && <span>📞 {incident.reporterPhone}</span>}
                      </div>

                      {/* Photo preview if present */}
                      {incident.mediaUrl && (
                        <div className="mt-2">
                          <span className="text-[10px] font-mono text-stone-400 block mb-1">Civilian Photo Attachment:</span>
                          <img
                            src={incident.mediaUrl}
                            alt="Scene photo"
                            className="w-32 h-20 object-cover rounded-lg border border-stone-700"
                          />
                        </div>
                      )}
                    </div>

                    {/* Right: Team Assignment & Status Actions */}
                    <div className="flex flex-col items-end gap-2 flex-shrink-0 min-w-[220px]">
                      {/* Current Status Badge */}
                      <div className="text-right text-xs font-mono">
                        <span className="text-stone-500 block text-[10px]">CURRENT STATUS</span>
                        <span
                          className={`font-bold uppercase ${
                            incident.status === 'resolved'
                              ? 'text-emerald-400'
                              : incident.status === 'on_scene'
                              ? 'text-sky-400'
                              : 'text-amber-400'
                          }`}
                        >
                          {incident.status.replace('_', ' ')}
                        </span>
                      </div>

                      {/* Team Assignment Selector */}
                      <div className="w-full">
                        <label className="text-[10px] font-mono text-stone-400 block mb-0.5">
                          Assigned Team:
                        </label>
                        <select
                          value={incident.assignedTeamId || ''}
                          onChange={(e) => assignRescueTeam(incident.id, e.target.value)}
                          className="w-full bg-stone-950 border border-stone-700 text-stone-200 text-xs rounded-lg px-2 py-1 font-mono"
                        >
                          <option value="">-- Unassigned --</option>
                          {rescueTeams.map((team) => (
                            <option key={team.id} value={team.id}>
                              {team.name} ({team.type})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Status Transition Buttons */}
                      <div className="flex gap-1.5 flex-wrap justify-end">
                        {incident.status !== 'en_route' && incident.status !== 'resolved' && (
                          <button
                            onClick={() => updateIncidentStatus(incident.id, 'en_route')}
                            className="px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded text-xs font-mono"
                          >
                            Mark En Route
                          </button>
                        )}
                        {incident.status !== 'on_scene' && incident.status !== 'resolved' && (
                          <button
                            onClick={() => updateIncidentStatus(incident.id, 'on_scene')}
                            className="px-2.5 py-1 bg-sky-950 border border-sky-800 text-sky-300 hover:bg-sky-900 rounded text-xs font-mono"
                          >
                            Mark On Scene
                          </button>
                        )}
                        {incident.status !== 'resolved' && (
                          <button
                            onClick={() => updateIncidentStatus(incident.id, 'resolved')}
                            className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-xs font-mono font-bold"
                          >
                            Resolve / Rescued
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: AI DECISION SUPPORT (GEMINI) */}
      {activeSubTab === 'ai_assistant' && (
        <div className="space-y-4">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-lg space-y-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-stone-100 uppercase tracking-wide">
                  Gemini Tactical Incident Commander Assistant
                </h2>
                <p className="text-xs text-stone-400">
                  AI-assisted spatial optimization, shelter load redistribution, and evacuation logistics.
                </p>
              </div>
            </div>

            {/* AI Prompt Input */}
            <div className="space-y-2 pt-2">
              <textarea
                rows={3}
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Ask Gemini to synthesize evacuation bottlenecks, suggest alternate shelter capacity distributions, or prioritize rescue triage..."
                className="w-full bg-stone-950 border border-stone-700 rounded-xl p-3 text-xs text-stone-200 focus:outline-none focus:border-amber-500 font-mono"
              />

              <div className="flex flex-wrap items-center justify-between gap-2">
                {/* Preset Quick Prompts */}
                <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] font-mono">
                  <button
                    onClick={() =>
                      setAiPrompt(
                        'Shelter A (Pine Ridge) is at 100% capacity. Outline an emergency load-balancing order to direct oncoming evacuees to Shelter B and C.'
                      )
                    }
                    className="px-2.5 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700 whitespace-nowrap"
                  >
                    Load-Balance Shelter A
                  </button>
                  <button
                    onClick={() =>
                      setAiPrompt(
                        'Analyze 3-hour fire spread forecast. Which roads must be evacuated first, and where should drone recon sweeps focus?'
                      )
                    }
                    className="px-2.5 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700 whitespace-nowrap"
                  >
                    Fire Spread Strategy
                  </button>
                  <button
                    onClick={() =>
                      setAiPrompt(
                        'Prioritize pending rescue incidents for 4 people trapped in smoke vs 1 medical diabetic case with road blockage.'
                      )
                    }
                    className="px-2.5 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700 whitespace-nowrap"
                  >
                    Triage Prioritization
                  </button>
                </div>

                <button
                  onClick={handleAskAI}
                  disabled={isAiLoading}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-amber-600 hover:from-purple-500 hover:to-amber-500 text-white text-xs font-bold font-mono rounded-xl flex items-center gap-2 shadow-lg disabled:opacity-50"
                >
                  {isAiLoading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Analyzing Live GIS...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      Generate Tactical Assessment
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* AI Output Response Card */}
          {aiRecommendation && (
            <div className="bg-stone-900 border-2 border-purple-500/80 rounded-2xl p-5 shadow-2xl space-y-3">
              <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-pulse" />
                  <h3 className="text-sm font-bold text-purple-200 uppercase tracking-wide font-mono">
                    Gemini AI Tactical Recommendation (Model Assisted)
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800">
                  AI ADVISORY — VERIFY BEFORE COMMAND
                </span>
              </div>

              <div className="text-xs text-stone-200 leading-relaxed font-mono whitespace-pre-wrap bg-stone-950 p-4 rounded-xl border border-stone-800">
                {aiRecommendation}
              </div>

              <div className="text-[10px] text-stone-400 flex items-center gap-1.5 pt-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                <span>
                  Notice: Model outputs are real-time algorithmic syntheses based on connected sensor vectors. All critical life-safety commands must be reviewed by the Incident Commander.
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: DRONE FLEET & MISSIONS (STATE ISOLATED) */}
      {activeSubTab === 'drones' && (
        <div className="space-y-5">
          {/* State Drone Fleet Header & Quick Deployment Trigger */}
          <div className="bg-stone-900 border border-cyan-900/60 rounded-2xl p-4 sm:p-5 shadow-lg flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-stone-100 uppercase tracking-wide font-mono flex items-center gap-2">
                  <PlaneTakeoff className="w-4 h-4 text-cyan-400" />
                  {selectedState && selectedState !== 'all'
                    ? `${selectedState} State UAV Fleet & Aerial Telemetry`
                    : 'Pan-India Drone Fleet & Aerial Telemetry'}
                </h2>
                <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 text-[10px] font-mono font-bold">
                  {stateDrones.length} DRONES IN STATE
                </span>
              </div>
              <p className="text-xs text-stone-400 mt-1">
                Isolated state squadron management, automated high-altitude mesh routing, and precision supply drops.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setDeployDroneTarget(undefined);
                  setDeployDronePreselectedId(undefined);
                  setShowDeployDroneModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-sky-600 hover:from-cyan-500 hover:to-sky-500 text-white text-xs font-mono font-bold rounded-xl shadow-lg transition-all active:scale-95"
              >
                <Plane className="w-4 h-4" />
                Deploy State UAV to Any Location
              </button>
            </div>
          </div>

          {/* Drone Telemetry Recharts Analytics Widget (Filtered to State) */}
          <DroneTelemetryWidget drones={stateDrones} droneMissions={stateDroneMissions} />

          {/* State Drone Fleet Cards Grid */}
          <div>
            <div className="flex items-center justify-between mb-3 text-xs font-mono">
              <span className="text-stone-300 font-bold uppercase">
                {selectedState && selectedState !== 'all' ? `${selectedState} Fleet Squadrons` : 'All State Fleet Units'} ({stateDrones.length})
              </span>
              <span className="text-stone-500 text-[11px]">
                Showing drones allocated specifically to {selectedState && selectedState !== 'all' ? selectedState : 'all states'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {stateDrones.map((drone) => (
                <div key={drone.id} className="bg-stone-900 border border-stone-800 rounded-2xl p-4 space-y-3 shadow-md">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-cyan-950 text-cyan-400 rounded-xl border border-cyan-800">
                        <PlaneTakeoff className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-stone-100">{drone.name}</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs font-mono text-stone-400">{drone.model}</span>
                          <span className="px-1.5 py-0.2 rounded bg-stone-800 text-cyan-300 text-[10px] font-mono font-bold">
                            {drone.state} • {drone.district || 'State Air Wing'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold ${
                        drone.status === 'airborne' || drone.status === 'delivering'
                          ? 'bg-cyan-950 text-cyan-300 border border-cyan-700 animate-pulse'
                          : drone.status === 'surveying'
                          ? 'bg-amber-950 text-amber-300 border border-amber-700'
                          : 'bg-stone-800 text-stone-400'
                      }`}
                    >
                      {drone.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-stone-950 p-2.5 rounded-xl border border-stone-800">
                    <div>
                      <span className="text-stone-500 block text-[10px]">BATTERY</span>
                      <span className="text-cyan-400 font-bold">{drone.batteryPercent}% Remaining</span>
                    </div>
                    <div>
                      <span className="text-stone-500 block text-[10px]">MAX PAYLOAD</span>
                      <span className="text-stone-200 font-bold">{drone.maxPayloadKg} kg</span>
                    </div>
                    <div>
                      <span className="text-stone-500 block text-[10px]">CURRENT ALTITUDE</span>
                      <span className="text-stone-200 font-bold">
                        {drone.status === 'airborne' ? '120m AGL (Cruising)' : 'Ground Station'}
                      </span>
                    </div>
                    <div>
                      <span className="text-stone-500 block text-[10px]">COMM LINK</span>
                      <span className="text-emerald-400 font-bold">
                        {drone.batteryPercent > 20 ? 'Mesh Band 4 (99%)' : 'Low Battery Standby'}
                      </span>
                    </div>
                  </div>

                  <div className="text-[11px] text-stone-400 font-mono">
                    Payload Capabilities: {drone.capabilities.join(' • ')}
                  </div>

                  {/* Direct Drone Action Bar */}
                  <div className="pt-2 border-t border-stone-800/80 flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono text-stone-500">
                      Coordinates: {drone.currentLocation.lat.toFixed(4)}, {drone.currentLocation.lng.toFixed(4)}
                    </span>
                    <button
                      onClick={() => {
                        setDeployDronePreselectedId(drone.id);
                        setDeployDroneTarget(undefined);
                        setShowDeployDroneModal(true);
                      }}
                      className="px-3 py-1.5 bg-cyan-950 hover:bg-cyan-900 border border-cyan-700 text-cyan-300 hover:text-cyan-100 text-xs font-mono font-bold rounded-lg flex items-center gap-1.5 transition-all"
                    >
                      <Plane className="w-3.5 h-3.5" />
                      {drone.status === 'airborne' ? 'Retarget Drone' : 'Deploy This Drone'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Active Missions in this State */}
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <h3 className="font-bold uppercase text-stone-200 tracking-wider">
                Active Recon & Supply Drop Missions ({stateDroneMissions.length})
              </h3>
              <span className="text-stone-500 text-[11px]">
                {selectedState && selectedState !== 'all' ? `Missions in ${selectedState}` : 'All State Missions'}
              </span>
            </div>

            {stateDroneMissions.length === 0 ? (
              <div className="p-6 text-center text-xs font-mono text-stone-500 bg-stone-950 rounded-xl border border-stone-800">
                No active missions currently flying in this jurisdiction. Click "Deploy State UAV to Any Location" above to launch a new mission.
              </div>
            ) : (
              <div className="space-y-2">
                {stateDroneMissions.map((mission) => (
                  <div
                    key={mission.id}
                    className="bg-stone-950 p-3 rounded-xl border border-stone-800 flex flex-wrap items-center justify-between gap-2 text-xs font-mono"
                  >
                    <div>
                      <span className="font-bold text-cyan-300">
                        {(mission as any).title || `${mission.droneName} — ${mission.missionType.replace('_', ' ').toUpperCase()}`}
                      </span>
                      <span className="text-stone-400 block text-[11px] mt-0.5">
                        Target: {(mission as any).targetLocation?.name || `${(mission as any).targetLocation?.lat?.toFixed(4)}, ${(mission as any).targetLocation?.lng?.toFixed(4)}`} • {(mission as any).notes || mission.operatorNotes || 'Flight path monitored'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-stone-800 text-stone-300 uppercase text-[10px]">
                        {mission.missionType}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold text-[10px] uppercase">
                        {mission.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: SHELTER LOGISTICS (STATE ISOLATED) */}
      {activeSubTab === 'shelters' && (
        <div className="space-y-4">
          {/* State Shelter Logistics Header */}
          <div className="bg-stone-900 border border-emerald-900/60 rounded-2xl p-4 sm:p-5 shadow-lg flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-stone-100 uppercase tracking-wide font-mono flex items-center gap-2">
                  <Home className="w-4 h-4 text-emerald-400" />
                  {selectedState && selectedState !== 'all'
                    ? `${selectedState} Disaster Shelters & Relief Camps`
                    : 'Pan-India Disaster Shelters & Relief Camps'}
                </h2>
                <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-mono font-bold">
                  {stateShelters.length} SHELTERS IN STATE
                </span>
              </div>
              <p className="text-xs text-stone-400 mt-1">
                Real-time bed capacities, supply inventory, and drone delivery dispatch for disaster evacuees.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-stone-400">Filter State:</span>
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="bg-stone-950 border border-stone-700 text-stone-200 text-xs font-mono font-bold rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="all">All India ({shelters.length} Shelters)</option>
                {availableStates.map((st) => (
                  <option key={st} value={st}>
                    {st} ({shelters.filter((s) => s.state?.toLowerCase() === st.toLowerCase()).length})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stateShelters.map((shelter) => {
              const isFull = shelter.status === 'full';
              const percent = Math.min(100, Math.round((shelter.currentOccupancy / shelter.capacity) * 100));

              return (
                <div key={shelter.id} className="bg-stone-900 border border-stone-800 rounded-2xl p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-stone-100">{shelter.name}</h3>
                      <p className="text-xs text-stone-400">{shelter.address}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="px-1.5 py-0.2 rounded bg-stone-800 text-emerald-300 text-[10px] font-mono font-bold">
                          {shelter.state} • {shelter.district}
                        </span>
                        {shelter.medicalFacilityOnsite && (
                          <span className="text-[10px] font-mono text-sky-400">🏥 Medical On-site</span>
                        )}
                        {shelter.petFriendly && (
                          <span className="text-[10px] font-mono text-amber-400">🐾 Pet Friendly</span>
                        )}
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold uppercase ${
                        isFull
                          ? 'bg-red-950 text-red-300 border border-red-700'
                          : 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                      }`}
                    >
                      {isFull ? `FULL (${shelter.capacity}/${shelter.capacity})` : `${shelter.capacity - shelter.currentOccupancy} OPEN`}
                    </span>
                  </div>

                  {/* Occupancy Stepper */}
                  <div className="bg-stone-950 p-3 rounded-xl border border-stone-800 space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-stone-400">Current Occupancy:</span>
                      <span className="text-stone-100 font-bold">
                        {shelter.currentOccupancy} / {shelter.capacity} ({percent}%)
                      </span>
                    </div>

                    <div className="w-full bg-stone-900 rounded-full h-2 overflow-hidden border border-stone-800">
                      <div
                        className={`h-full ${isFull ? 'bg-red-600' : 'bg-emerald-500'}`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>

                    {/* Stepper Buttons & Drone Delivery Dispatch */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 font-mono text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-stone-500">Triage Check-In:</span>
                        <button
                          onClick={() => updateShelterCapacity(shelter.id, shelter.currentOccupancy - 10)}
                          className="px-2 py-1 bg-stone-800 hover:bg-stone-700 rounded text-stone-200"
                        >
                          -10
                        </button>
                        <button
                          onClick={() => updateShelterCapacity(shelter.id, shelter.currentOccupancy + 10)}
                          className="px-2 py-1 bg-stone-800 hover:bg-stone-700 rounded text-stone-200"
                        >
                          +10
                        </button>
                        <button
                          onClick={() => updateShelterCapacity(shelter.id, shelter.capacity)}
                          className="px-2 py-1 bg-red-950 border border-red-800 text-red-300 hover:bg-red-900 rounded font-bold"
                          title="Mark 100% full to demonstrate rerouting"
                        >
                          Set Full
                        </button>
                      </div>

                      <button
                        onClick={() => {
                          setDeployDroneTarget({
                            lat: shelter.location.lat,
                            lng: shelter.location.lng,
                            name: shelter.name,
                          });
                          setDeployDronePreselectedId(undefined);
                          setShowDeployDroneModal(true);
                        }}
                        className="px-2.5 py-1 bg-cyan-950 hover:bg-cyan-900 border border-cyan-700 text-cyan-300 hover:text-cyan-100 rounded text-xs font-mono font-bold flex items-center gap-1 transition-all"
                        title="Dispatch supply drop drone to this shelter"
                      >
                        <Plane className="w-3 h-3" />
                        Dispatch Supply UAV
                      </button>
                    </div>
                  </div>

                  {/* Supply Status */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono">
                    <div className="bg-stone-950 p-2 rounded-lg border border-stone-800">
                      <span className="text-stone-500 block">WATER</span>
                      <span className="text-emerald-400 font-bold">{shelter.supplies?.water || '4,500 L'}</span>
                    </div>
                    <div className="bg-stone-950 p-2 rounded-lg border border-stone-800">
                      <span className="text-stone-500 block">FOOD</span>
                      <span className="text-emerald-400 font-bold">{shelter.supplies?.food || '3,200 Rations'}</span>
                    </div>
                    <div className="bg-stone-950 p-2 rounded-lg border border-stone-800">
                      <span className="text-stone-500 block">COTS</span>
                      <span className="text-stone-200 font-bold">{shelter.supplies?.cots || `${shelter.capacity} Beds`}</span>
                    </div>
                    <div className="bg-stone-950 p-2 rounded-lg border border-stone-800">
                      <span className="text-stone-500 block">FUEL</span>
                      <span className="text-amber-400 font-bold">{shelter.supplies?.generatorFuel || '90% (DG Backup)'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 5: WILDLIFE & PETS */}
      {activeSubTab === 'wildlife' && (
        <div className="space-y-4">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4">
            <h3 className="text-sm font-bold uppercase text-stone-100 font-mono mb-3">
              Reported Trapped Pets & Livestock Evacuation
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {wildlifeCases.map((wlc) => (
                <div key={wlc.id} className="bg-stone-950 p-4 rounded-xl border border-stone-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 bg-lime-950 border border-lime-800 text-lime-400 rounded-lg">
                        🐾
                      </span>
                      <span className="font-bold text-stone-100">{wlc.species} ({wlc.animalCount} Animals)</span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-stone-800 font-mono text-[10px] uppercase text-stone-300">
                      {wlc.status}
                    </span>
                  </div>

                  <p className="text-stone-300 italic">
                    "{Array.isArray(wlc.notes) ? wlc.notes.join(' • ') : wlc.notes || wlc.condition}"
                  </p>
                  <div className="text-[11px] font-mono text-stone-400">
                    Location: {wlc.location.lat.toFixed(4)}, {wlc.location.lng.toFixed(4)} ({wlc.location.areaName || 'Designated Zone'})
                  </div>
                  <div className="text-[11px] font-mono text-lime-400">
                    Corridor: {wlc.recommendedCorridor || 'Standard Safe Corridor'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: AUDIT LOGS */}
      {activeSubTab === 'audit' && (
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-stone-800 pb-2">
            <h3 className="font-bold text-stone-100 uppercase tracking-wide">
              Incident Command System (ICS) Event Audit Stream
            </h3>
            <button
              onClick={() => {
                const blob = new Blob([JSON.stringify(auditLogs, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `resqmap-audit-${Date.now()}.json`;
                a.click();
              }}
              className="px-3 py-1 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg flex items-center gap-1 text-[11px]"
            >
              <Download className="w-3.5 h-3.5" /> Export JSON
            </button>
          </div>

          <div className="space-y-1.5 max-h-96 overflow-y-auto">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-2 bg-stone-950 rounded-lg border border-stone-800/80 flex items-start gap-2">
                <span className="text-stone-500 text-[10px] flex-shrink-0">{log.timestamp}</span>
                <span className="text-amber-400 font-bold uppercase text-[10px] flex-shrink-0">[{log.action}]</span>
                <span className="text-stone-300">{log.details}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Deploy Drone Modal */}
      <DeployDroneModal
        isOpen={showDeployDroneModal}
        onClose={() => {
          setShowDeployDroneModal(false);
          setDeployDroneTarget(undefined);
          setDeployDronePreselectedId(undefined);
        }}
        initialTarget={deployDroneTarget}
        initialDroneId={deployDronePreselectedId}
      />
    </div>
  );
};

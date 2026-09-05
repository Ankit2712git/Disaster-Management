import React, { useState, useEffect } from 'react';
import {
  X,
  Send,
  MapPin,
  Battery,
  Shield,
  Plane,
  Package,
  Layers,
  AlertTriangle,
  Compass,
  CheckCircle2,
  Radio,
  FileText,
} from 'lucide-react';
import { useEmergency } from '../../context/EmergencyContext';
import { ALL_INDIAN_REGIONS } from '../../data/indianSheltersData';
import { Drone, DeployDroneParams } from '../../types';

interface DeployDroneModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCoordinates?: { lat: number; lng: number; name?: string };
  initialDroneId?: string;
  initialState?: string;
}

export const DeployDroneModal: React.FC<DeployDroneModalProps> = ({
  isOpen,
  onClose,
  initialCoordinates,
  initialDroneId,
  initialState,
}) => {
  const {
    drones,
    selectedState,
    setSelectedState,
    deployDroneToLocation,
    incidents,
    userLocation,
  } = useEmergency();

  // State selection (defaults to passed state or context selectedState)
  const [targetState, setTargetState] = useState<string>(initialState || selectedState || 'Delhi');

  // Filter drones strictly to selected state
  const stateDrones = drones.filter((d) => d.state?.toLowerCase() === targetState.toLowerCase());

  // Selected Drone
  const [selectedDroneId, setSelectedDroneId] = useState<string>('');

  // Mission Type
  const [missionType, setMissionType] = useState<'survey' | 'relief_delivery'>('survey');

  // Target Location inputs (ANY location)
  const [latInput, setLatInput] = useState<string>('');
  const [lngInput, setLngInput] = useState<string>('');
  const [locationName, setLocationName] = useState<string>('');

  // Relief Payload inputs
  const [payloadItem, setPayloadItem] = useState<string>('Emergency First Aid & Trauma Kit');
  const [payloadQuantity, setPayloadQuantity] = useState<string>('2 Units (8.5 kg)');
  const [urgency, setUrgency] = useState<'high' | 'critical' | 'standard'>('critical');

  // Survey inputs
  const [surveyAreaKm2, setSurveyAreaKm2] = useState<number>(3.5);
  const [operatorNotes, setOperatorNotes] = useState<string>('');

  // Submission feedback
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync initial state or coordinates when modal opens
  useEffect(() => {
    if (isOpen) {
      const activeSt = initialState || selectedState || 'Delhi';
      setTargetState(activeSt);

      const availableInState = drones.filter((d) => d.state?.toLowerCase() === activeSt.toLowerCase());
      if (initialDroneId && availableInState.some((d) => d.id === initialDroneId)) {
        setSelectedDroneId(initialDroneId);
      } else if (availableInState.length > 0) {
        // Prefer available drone
        const readyDrone = availableInState.find((d) => d.status === 'available') || availableInState[0];
        setSelectedDroneId(readyDrone.id);
      }

      if (initialCoordinates) {
        setLatInput(initialCoordinates.lat.toFixed(5));
        setLngInput(initialCoordinates.lng.toFixed(5));
        setLocationName(initialCoordinates.name || `Pinned Sector (${initialCoordinates.lat.toFixed(3)}, ${initialCoordinates.lng.toFixed(3)})`);
      } else {
        // Set default to matched region or user location
        const reg = ALL_INDIAN_REGIONS.find((r) => r.state.toLowerCase() === activeSt.toLowerCase()) || ALL_INDIAN_REGIONS[0];
        setLatInput(reg.center.lat.toFixed(5));
        setLngInput(reg.center.lng.toFixed(5));
        setLocationName(`${reg.name} Sector`);
      }
      setSuccessMessage(null);
      setErrorMessage(null);
    }
  }, [isOpen, initialState, selectedState, initialDroneId, initialCoordinates, drones]);

  // When target state changes, auto-select a drone from that state & update default coordinates
  const handleStateChange = (newState: string) => {
    setTargetState(newState);
    const available = drones.filter((d) => d.state?.toLowerCase() === newState.toLowerCase());
    if (available.length > 0) {
      const readyDrone = available.find((d) => d.status === 'available') || available[0];
      setSelectedDroneId(readyDrone.id);
    }
    const reg = ALL_INDIAN_REGIONS.find((r) => r.state.toLowerCase() === newState.toLowerCase());
    if (reg) {
      setLatInput(reg.center.lat.toFixed(5));
      setLngInput(reg.center.lng.toFixed(5));
      setLocationName(`${reg.name} Sector`);
    }
  };

  const handleUseUserLocation = () => {
    setLatInput(userLocation.lat.toFixed(5));
    setLngInput(userLocation.lng.toFixed(5));
    setLocationName(userLocation.address || 'Civilian Evac / Pinned Location');
  };

  const handleSelectIncidentTarget = (incidentId: string) => {
    const inc = incidents.find((i) => i.id === incidentId);
    if (inc) {
      setLatInput(inc.location.lat.toFixed(5));
      setLngInput(inc.location.lng.toFixed(5));
      setLocationName(`${inc.reporterName || 'Incident'} (${inc.type.toUpperCase()})`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const lat = parseFloat(latInput);
    const lng = parseFloat(lngInput);

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setErrorMessage('Please enter valid GPS coordinates (Latitude between -90 and 90, Longitude between -180 and 180).');
      return;
    }

    if (!selectedDroneId) {
      setErrorMessage('Please select a drone from this state fleet to deploy.');
      return;
    }

    const drone = drones.find((d) => d.id === selectedDroneId);
    if (!drone) {
      setErrorMessage('Selected drone not found.');
      return;
    }

    setIsSubmitting(true);
    try {
      const params: DeployDroneParams = {
        droneId: selectedDroneId,
        missionType,
        state: targetState,
        targetLocation: {
          lat,
          lng,
          name: locationName.trim() || `Target (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
        },
        payload: missionType === 'relief_delivery' ? {
          item: payloadItem,
          quantity: payloadQuantity,
          urgency,
        } : undefined,
        surveyAreaKm2: missionType === 'survey' ? surveyAreaKm2 : undefined,
        operatorNotes: operatorNotes.trim() || undefined,
      };

      const mission = await deployDroneToLocation(params);

      setSuccessMessage(
        `Mission ${mission.id} Authorized: ${drone.name} deployed to ${locationName || 'target coordinates'}!`
      );

      setTimeout(() => {
        setIsSubmitting(false);
        onClose();
      }, 1800);
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMessage(err.message || 'Failed to dispatch drone mission.');
    }
  };

  if (!isOpen) return null;

  const selectedDrone = drones.find((d) => d.id === selectedDroneId);
  const statesSet = new Set<string>();
  drones.forEach((d) => {
    if (d.state) statesSet.add(d.state);
  });
  const availableStates: string[] = [];
  statesSet.forEach((s) => availableStates.push(s));
  availableStates.sort();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div
        className="relative w-full max-w-2xl bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl overflow-hidden font-sans my-6"
        id="deploy-drone-modal"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-stone-950 via-stone-900 to-cyan-950/40 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Plane className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-stone-100 uppercase tracking-wide">
                  Deploy Drone to Any Location
                </h2>
                <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono text-[10px] font-bold uppercase border border-cyan-500/30">
                  State Fleet Dispatch
                </span>
              </div>
              <p className="text-xs text-stone-400">
                Dispatch state UAVs for high-resolution aerial survey or rapid relief air-drops.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-stone-800/80 hover:bg-stone-700 text-stone-400 hover:text-stone-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Notification Banners */}
          {errorMessage && (
            <div className="p-3 bg-red-950/70 border border-red-800 rounded-xl text-xs text-red-200 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-950/80 border border-emerald-700 rounded-xl text-xs text-emerald-200 flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span className="font-bold">{successMessage}</span>
            </div>
          )}

          {/* 1. STATE FLEET PARTITION SELECTION */}
          <div className="space-y-2 bg-stone-950/80 p-3.5 rounded-xl border border-stone-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-cyan-400 uppercase tracking-wide font-mono flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5" />
                1. Select State Disaster Response Fleet
              </label>
              <span className="text-[11px] font-mono text-stone-400">
                {stateDrones.length} UAVs in {targetState} Fleet
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {availableStates.map((st) => {
                const count = drones.filter((d) => d.state === st).length;
                const isSelected = targetState.toLowerCase() === st.toLowerCase();
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => handleStateChange(st)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${
                      isSelected
                        ? 'bg-cyan-600 text-white font-bold shadow-md ring-1 ring-cyan-400'
                        : 'bg-stone-900 text-stone-400 border border-stone-800 hover:text-stone-200'
                    }`}
                  >
                    {st} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. DRONE UNIT SELECTION WITHIN THIS STATE */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-stone-200 uppercase tracking-wide font-mono flex items-center gap-1.5">
              <Plane className="w-3.5 h-3.5 text-cyan-400" />
              2. Select UAV from {targetState} Fleet
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {stateDrones.map((drone) => {
                const isSelected = selectedDroneId === drone.id;
                const isAvailable = drone.status === 'available';

                return (
                  <div
                    key={drone.id}
                    onClick={() => setSelectedDroneId(drone.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-cyan-950/40 border-cyan-500 shadow-md ring-1 ring-cyan-500/50'
                        : 'bg-stone-950 border-stone-800 hover:border-stone-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-stone-200 truncate">{drone.name}</span>
                      <span
                        className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded uppercase ${
                          isAvailable
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {drone.status}
                      </span>
                    </div>

                    <p className="text-[11px] text-stone-400 mt-1 truncate">{drone.model}</p>

                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-stone-800 text-[10px] font-mono text-stone-400">
                      <span className="flex items-center gap-1">
                        <Battery className="w-3 h-3 text-cyan-400" /> {drone.batteryPercent}%
                      </span>
                      <span>Payload: {drone.maxPayloadKg}kg</span>
                      <span className="text-stone-500">{drone.district || targetState}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. MISSION TYPE SELECTION */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-stone-200 uppercase tracking-wide font-mono flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              3. Mission Type
            </label>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMissionType('survey')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  missionType === 'survey'
                    ? 'bg-cyan-950/40 border-cyan-500 ring-1 ring-cyan-500'
                    : 'bg-stone-950 border-stone-800 text-stone-400 hover:border-stone-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Compass className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold text-stone-200">Aerial LiDAR Survey</span>
                </div>
                <p className="text-[11px] text-stone-400 mt-1">
                  High-res terrain mapping, flood inundation tracking, and infrared recon.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setMissionType('relief_delivery')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  missionType === 'relief_delivery'
                    ? 'bg-cyan-950/40 border-cyan-500 ring-1 ring-cyan-500'
                    : 'bg-stone-950 border-stone-800 text-stone-400 hover:border-stone-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold text-stone-200">Relief Supply Drop</span>
                </div>
                <p className="text-[11px] text-stone-400 mt-1">
                  Precision winch air-drop of medicine, water purification, and emergency rations.
                </p>
              </button>
            </div>
          </div>

          {/* 4. TARGET LOCATION (ANY LOCATION INPUT) */}
          <div className="space-y-3 bg-stone-950/90 p-4 rounded-xl border border-stone-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-cyan-400 uppercase tracking-wide font-mono flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                4. Target Destination (Any Location / Coordinates)
              </label>
              <button
                type="button"
                onClick={handleUseUserLocation}
                className="text-[11px] font-mono text-cyan-400 hover:underline flex items-center gap-1"
              >
                Use My Pinned Point
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] font-mono text-stone-400 block mb-1">LATITUDE (°N)</label>
                <input
                  type="number"
                  step="0.0001"
                  value={latInput}
                  onChange={(e) => setLatInput(e.target.value)}
                  placeholder="e.g. 28.6620"
                  required
                  className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-xs font-mono text-stone-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono text-stone-400 block mb-1">LONGITUDE (°E)</label>
                <input
                  type="number"
                  step="0.0001"
                  value={lngInput}
                  onChange={(e) => setLngInput(e.target.value)}
                  placeholder="e.g. 77.2420"
                  required
                  className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-xs font-mono text-stone-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono text-stone-400 block mb-1">SECTOR / LANDMARK NAME</label>
                <input
                  type="text"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  placeholder="e.g. Yamuna Bazar Bund / Sector 4"
                  required
                  className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Quick Presets from Active Incidents in this State */}
            {incidents.length > 0 && (
              <div className="pt-2 border-t border-stone-800">
                <span className="text-[10px] font-mono text-stone-400 block mb-1.5">
                  Quick Select Active Incident in Sector:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {incidents.slice(0, 3).map((inc) => (
                    <button
                      key={inc.id}
                      type="button"
                      onClick={() => handleSelectIncidentTarget(inc.id)}
                      className="px-2 py-1 rounded bg-stone-900 hover:bg-stone-800 text-stone-300 text-[10px] font-mono border border-stone-700 truncate max-w-[200px]"
                    >
                      {inc.reporterName || inc.type} ({inc.location.lat.toFixed(2)}, {inc.location.lng.toFixed(2)})
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 5. PAYLOAD OR SURVEY SPECIFICS */}
          {missionType === 'relief_delivery' ? (
            <div className="space-y-3 bg-stone-950/60 p-4 rounded-xl border border-stone-800">
              <label className="text-xs font-bold text-stone-200 uppercase tracking-wide font-mono flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-cyan-400" />
                5. Relief Supply Package
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono text-stone-400 block mb-1">SUPPLY CARGO TYPE</label>
                  <select
                    value={payloadItem}
                    onChange={(e) => setPayloadItem(e.target.value)}
                    className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="Emergency First Aid & Trauma Kit">Emergency First Aid & Trauma Kit</option>
                    <option value="Purified Water Pouches (10 Liters)">Purified Water Pouches (10 Liters)</option>
                    <option value="High-Energy Meal Rations & Biscuits">High-Energy Meal Rations & Biscuits</option>
                    <option value="Pediatric ORS & Anti-Cholera Packs">Pediatric ORS & Anti-Cholera Packs</option>
                    <option value="Inflatable Marine Rescue Life Buoy">Inflatable Marine Rescue Life Buoy</option>
                    <option value="Satellite Distress Beacon & Radio Relay">Satellite Distress Beacon & Radio Relay</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-mono text-stone-400 block mb-1">QUANTITY & WEIGHT</label>
                  <input
                    type="text"
                    value={payloadQuantity}
                    onChange={(e) => setPayloadQuantity(e.target.value)}
                    placeholder="e.g. 2 Kits (6.5 kg)"
                    className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-mono text-stone-400 block mb-1">DELIVERY URGENCY</label>
                <div className="flex gap-2">
                  {(['critical', 'high', 'standard'] as const).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setUrgency(lvl)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition-colors ${
                        urgency === lvl
                          ? lvl === 'critical'
                            ? 'bg-red-600 text-white'
                            : lvl === 'high'
                            ? 'bg-amber-600 text-white'
                            : 'bg-emerald-600 text-white'
                          : 'bg-stone-900 text-stone-400 border border-stone-800'
                      }`}
                    >
                      {lvl} Priority
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3 bg-stone-950/60 p-4 rounded-xl border border-stone-800">
              <label className="text-xs font-bold text-stone-200 uppercase tracking-wide font-mono flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-cyan-400" />
                5. Survey Parameters
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono text-stone-400 block mb-1">RECON AREA (KM²)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="15"
                    value={surveyAreaKm2}
                    onChange={(e) => setSurveyAreaKm2(parseFloat(e.target.value) || 2)}
                    className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-xs font-mono text-stone-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono text-stone-400 block mb-1">PAYLOAD SENSOR FOCUS</label>
                  <div className="px-3 py-2 bg-stone-900 border border-stone-700 rounded-lg text-xs text-stone-300 font-mono">
                    {selectedDrone?.capabilities?.[0] || 'LiDAR & Thermal Sensors'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 6. OPERATOR DISPATCH NOTES */}
          <div>
            <label className="text-[10px] font-mono text-stone-400 block mb-1 flex items-center gap-1">
              <FileText className="w-3 h-3" />
              COMMAND & OPERATOR NOTES (OPTIONAL)
            </label>
            <textarea
              rows={2}
              value={operatorNotes}
              onChange={(e) => setOperatorNotes(e.target.value)}
              placeholder="e.g. Target stranded civilians on 2nd floor terrace; approach from south to avoid high tension power cables."
              className="w-full bg-stone-950 border border-stone-700 rounded-xl p-3 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-cyan-500 font-sans"
            />
          </div>

          {/* Action Footer */}
          <div className="pt-3 border-t border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-[11px] font-mono text-stone-400">
              Ready to deploy {selectedDrone?.name || 'UAV'} to {targetState} sector.
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-mono text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !selectedDroneId}
                className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:bg-stone-800 disabled:text-stone-500 text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg active:scale-98 transition-all"
              >
                {isSubmitting ? (
                  <>
                    <Radio className="w-4 h-4 animate-spin" />
                    Transmitting Mission...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Launch & Deploy UAV
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

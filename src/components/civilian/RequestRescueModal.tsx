import React, { useState } from 'react';
import {
  ShieldAlert,
  MapPin,
  Users,
  HeartPulse,
  Flame,
  Waves,
  Building2,
  AlertTriangle,
  Upload,
  CheckCircle2,
  X,
  Camera,
  ArrowRight,
  WifiOff,
} from 'lucide-react';
import { useEmergency } from '../../context/EmergencyContext';
import { IncidentType } from '../../types';

interface RequestRescueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (incidentId: string) => void;
}

export const RequestRescueModal: React.FC<RequestRescueModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { userLocation, liveLocation, locationStatus, isOnline, submitRescueRequest, currentUser } = useEmergency();

  const [step, setStep] = useState<'form' | 'confirm' | 'submitting'>('form');

  const [customLat, setCustomLat] = useState<number>(liveLocation ? liveLocation.latitude : userLocation.lat);
  const [customLng, setCustomLng] = useState<number>(liveLocation ? liveLocation.longitude : userLocation.lng);
  const [isManualAdjustOpen, setIsManualAdjustOpen] = useState<boolean>(false);
  const [locationAddress, setLocationAddress] = useState<string>(userLocation.address);
  const [situation, setSituation] = useState<IncidentType>('trapped');
  const [peopleCount, setPeopleCount] = useState<number>(2);
  const [hasMedicalEmergency, setHasMedicalEmergency] = useState<boolean>(true);
  const [isInjured, setIsInjured] = useState<boolean>(false);
  const [isTrapped, setIsTrapped] = useState<boolean>(true);
  const [description, setDescription] = useState<string>('');
  const [reporterPhone, setReporterPhone] = useState<string>('+91 98101 44521');
  const [reporterName, setReporterName] = useState<string>(currentUser.name || 'Aarav Sharma');
  const [uploadedImagePreview, setUploadedImagePreview] = useState<string | null>(null);

  if (!isOpen) return null;

  const situationOptions: { type: IncidentType; label: string; icon: React.ReactNode }[] = [
    { type: 'trapped', label: 'Trapped in House / Structure', icon: <Building2 className="w-4 h-4" /> },
    { type: 'fire', label: 'Surrounded by Wildfire / Smoke', icon: <Flame className="w-4 h-4" /> },
    { type: 'flood', label: 'Rising Floodwaters / Submerged', icon: <Waves className="w-4 h-4" /> },
    { type: 'building_collapse', label: 'Structural / Roof Collapse', icon: <AlertTriangle className="w-4 h-4" /> },
    { type: 'medical', label: 'Critical Medical Emergency', icon: <HeartPulse className="w-4 h-4" /> },
    { type: 'injured', label: 'Severe Injury / Bleeding', icon: <HeartPulse className="w-4 h-4" /> },
    { type: 'road_blocked', label: 'Evac Route Cut Off / Blocked', icon: <MapPin className="w-4 h-4" /> },
    { type: 'earthquake', label: 'Earthquake Trapping Debris', icon: <Building2 className="w-4 h-4" /> },
    { type: 'landslide', label: 'Mudslide / Landslide', icon: <AlertTriangle className="w-4 h-4" /> },
    { type: 'other', label: 'Other Life Safety Hazard', icon: <ShieldAlert className="w-4 h-4" /> },
  ];

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    setStep('submitting');
    const createdIncident = await submitRescueRequest({
      reporterName,
      reporterPhone,
      type: situation,
      peopleCount,
      hasMedicalEmergency,
      isInjured,
      isTrapped,
      description: description || `Civilian reported: ${situation.replace('_', ' ')}. ${peopleCount} people requiring immediate extraction.`,
      location: {
        lat: customLat,
        lng: customLng,
        address: locationAddress,
      },
      mediaUrl: uploadedImagePreview || undefined,
    });

    onSuccess(createdIncident.id);
    onClose();
    setStep('form');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-xl bg-stone-900 border-2 border-red-600 rounded-2xl shadow-2xl overflow-hidden font-sans text-stone-100 my-8">
        {/* Header */}
        <div className="bg-red-950/80 border-b border-red-800 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-red-600 text-white shadow-md">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-wide uppercase text-red-100">
                EMERGENCY RESCUE REQUEST (SOS)
              </h2>
              <p className="text-xs text-red-200">
                Direct dispatch to Search & Rescue, Fire, and Medical First Responders.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-100 p-1.5 rounded-lg hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Offline Warning Banner inside Modal */}
        {!isOnline && (
          <div className="bg-red-950 px-4 py-2 border-b border-red-800 text-xs text-red-200 flex items-center gap-2">
            <WifiOff className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>
              <strong>OFFLINE NOTICE:</strong> Your emergency request will be saved to your device and queued for transmission as soon as connectivity resumes.
            </span>
          </div>
        )}

        {/* STEP 1: FORM */}
        {step === 'form' && (
          <div className="p-4 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            {/* Location (Section 9 & 10) */}
            <div className="bg-stone-950 p-3.5 rounded-xl border border-stone-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono font-bold text-stone-200 uppercase flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-red-400" />
                  1. Rescue Location Coordinates
                </label>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Location attached
                </span>
              </div>

              <p className="text-[11px] text-stone-400">
                Your current location will be included with this rescue request. Search & Rescue dispatch units will navigate to these exact coordinates.
              </p>

              {/* Coordinates & Accuracy Readout */}
              <div className="flex flex-wrap items-center gap-2 p-2 rounded-lg bg-stone-900 border border-stone-800 text-xs font-mono">
                <span className="text-stone-300">
                  Lat: <strong className="text-stone-100">{customLat.toFixed(5)}</strong>, Lng: <strong className="text-stone-100">{customLng.toFixed(5)}</strong>
                </span>
                <span className="px-1.5 py-0.5 rounded bg-sky-950 text-sky-300 text-[10px] border border-sky-800">
                  Accuracy ±{liveLocation?.accuracyMeters ? Math.round(liveLocation.accuracyMeters) : 12}m
                </span>
                <button
                  type="button"
                  onClick={() => setIsManualAdjustOpen(!isManualAdjustOpen)}
                  className="text-[10px] text-amber-400 hover:text-amber-300 underline ml-auto cursor-pointer"
                >
                  {isManualAdjustOpen ? 'Done Adjusting' : 'Adjust Manually'}
                </button>
              </div>

              {isManualAdjustOpen && (
                <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-stone-900/90 border border-amber-900/60">
                  <div>
                    <label className="block text-[10px] font-mono text-stone-400 mb-0.5">Latitude (-90 to 90)</label>
                    <input
                      type="number"
                      step="any"
                      value={customLat}
                      onChange={(e) => setCustomLat(parseFloat(e.target.value) || 0)}
                      className="w-full bg-stone-950 border border-stone-700 rounded-lg px-2 py-1 text-xs text-stone-100 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-stone-400 mb-0.5">Longitude (-180 to 180)</label>
                    <input
                      type="number"
                      step="any"
                      value={customLng}
                      onChange={(e) => setCustomLng(parseFloat(e.target.value) || 0)}
                      className="w-full bg-stone-950 border border-stone-700 rounded-lg px-2 py-1 text-xs text-stone-100 font-mono"
                    />
                  </div>
                </div>
              )}

              <div className="relative">
                <input
                  type="text"
                  value={locationAddress}
                  onChange={(e) => setLocationAddress(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-red-500 font-mono"
                  placeholder="Street address, floor, room number, or landmark"
                  required
                />
              </div>
            </div>

            {/* Situation Selector */}
            <div>
              <label className="block text-xs font-mono font-bold text-stone-300 uppercase mb-1.5">
                2. What is your current situation?
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {situationOptions.map((opt) => (
                  <button
                    key={opt.type}
                    type="button"
                    onClick={() => setSituation(opt.type)}
                    className={`p-2.5 rounded-xl border text-left text-xs font-medium flex items-center gap-2.5 transition-colors ${
                      situation === opt.type
                        ? 'bg-red-950/80 border-red-500 text-white font-bold ring-1 ring-red-500'
                        : 'bg-stone-950 border-stone-800 text-stone-300 hover:border-stone-700'
                    }`}
                  >
                    <span className={situation === opt.type ? 'text-red-400' : 'text-stone-500'}>
                      {opt.icon}
                    </span>
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* People Count & Medical Urgency */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-mono font-bold text-stone-300 uppercase mb-1">
                  Number of People Trapped / In Group
                </label>
                <div className="flex items-center bg-stone-950 border border-stone-700 rounded-xl px-2 py-1">
                  <Users className="w-4 h-4 text-stone-400 ml-2" />
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={peopleCount}
                    onChange={(e) => setPeopleCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-transparent px-3 py-1.5 text-sm font-bold text-stone-100 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-stone-300 uppercase mb-1">
                  Contact Phone Number
                </label>
                <input
                  type="tel"
                  value={reporterPhone}
                  onChange={(e) => setReporterPhone(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs font-mono text-stone-100 focus:outline-none focus:border-red-500"
                  placeholder="+91 98765 43210"
                />
              </div>
            </div>

            {/* Triage Questions (Binary Yes / No) */}
            <div className="space-y-2 pt-1 border-t border-stone-800">
              <div className="flex items-center justify-between bg-stone-950/70 p-2.5 rounded-xl border border-stone-800">
                <div className="text-xs">
                  <span className="font-bold text-stone-200 block">Is anyone unable to escape?</span>
                  <span className="text-[11px] text-stone-400">Path blocked, locked in room, or disabled</span>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setIsTrapped(true)}
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-bold ${
                      isTrapped ? 'bg-red-600 text-white' : 'bg-stone-800 text-stone-400'
                    }`}
                  >
                    YES
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsTrapped(false)}
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-bold ${
                      !isTrapped ? 'bg-stone-700 text-white' : 'bg-stone-800 text-stone-400'
                    }`}
                  >
                    NO
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between bg-stone-950/70 p-2.5 rounded-xl border border-stone-800">
                <div className="text-xs">
                  <span className="font-bold text-stone-200 block">Is there a medical emergency?</span>
                  <span className="text-[11px] text-stone-400">Difficulty breathing, unconscious, cardiac</span>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setHasMedicalEmergency(true)}
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-bold ${
                      hasMedicalEmergency ? 'bg-red-600 text-white' : 'bg-stone-800 text-stone-400'
                    }`}
                  >
                    YES
                  </button>
                  <button
                    type="button"
                    onClick={() => setHasMedicalEmergency(false)}
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-bold ${
                      !hasMedicalEmergency ? 'bg-stone-700 text-white' : 'bg-stone-800 text-stone-400'
                    }`}
                  >
                    NO
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between bg-stone-950/70 p-2.5 rounded-xl border border-stone-800">
                <div className="text-xs">
                  <span className="font-bold text-stone-200 block">Is anyone injured?</span>
                  <span className="text-[11px] text-stone-400">Fractures, severe burns, heavy bleeding</span>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setIsInjured(true)}
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-bold ${
                      isInjured ? 'bg-red-600 text-white' : 'bg-stone-800 text-stone-400'
                    }`}
                  >
                    YES
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsInjured(false)}
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-bold ${
                      !isInjured ? 'bg-stone-700 text-white' : 'bg-stone-800 text-stone-400'
                    }`}
                  >
                    NO
                  </button>
                </div>
              </div>
            </div>

            {/* Additional details */}
            <div>
              <label className="block text-xs font-mono font-bold text-stone-300 uppercase mb-1">
                Additional Details (Optional)
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="E.g., In 2nd floor attic room, smoke coming under door, need oxygen support..."
                className="w-full bg-stone-950 border border-stone-700 rounded-xl p-2.5 text-xs text-stone-200 focus:outline-none focus:border-red-500 resize-none"
              />
            </div>

            {/* Optional Photo Attachment */}
            <div>
              <label className="block text-xs font-mono font-bold text-stone-300 uppercase mb-1">
                Attach Photo / Debris Hazard (Optional)
              </label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 px-3 py-2 bg-stone-950 border border-stone-700 hover:border-stone-600 rounded-xl text-xs text-stone-300 cursor-pointer font-mono">
                  <Camera className="w-4 h-4 text-amber-400" />
                  <span>Choose Photo</span>
                  <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                </label>
                {uploadedImagePreview && (
                  <span className="text-xs text-emerald-400 font-mono flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Attached
                  </span>
                )}
              </div>
              {uploadedImagePreview && (
                <div className="mt-2 relative w-24 h-24 rounded-lg overflow-hidden border border-stone-700">
                  <img src={uploadedImagePreview} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    onClick={() => setUploadedImagePreview(null)}
                    className="absolute top-1 right-1 bg-black/70 text-white rounded-full p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="pt-3 border-t border-stone-800 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-medium font-mono"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setStep('confirm')}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold font-mono tracking-wider flex items-center gap-2 shadow-lg"
              >
                Review & Confirm <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: PRE-SUBMISSION CONFIRMATION */}
        {step === 'confirm' && (
          <div className="p-4 sm:p-6 space-y-4">
            <div className="bg-stone-950 p-4 rounded-xl border border-stone-800 space-y-2.5 text-xs">
              <h3 className="font-bold text-sm text-stone-100 uppercase tracking-wide border-b border-stone-800 pb-2 flex items-center justify-between">
                <span>Confirm SOS Details Before Dispatch</span>
                <span className="px-2 py-0.5 rounded bg-red-600 text-white font-mono text-[10px]">
                  PRIORITY 1
                </span>
              </h3>

              <div className="grid grid-cols-2 gap-2 text-stone-300 font-mono">
                <div>Location: <strong className="text-stone-100 block">{locationAddress}</strong></div>
                <div>GPS Telemetry: <strong className="text-emerald-400 block">{customLat.toFixed(5)}, {customLng.toFixed(5)} (±{liveLocation?.accuracyMeters ? Math.round(liveLocation.accuracyMeters) : 12}m)</strong></div>
                <div>Situation: <strong className="text-red-400 uppercase block">{situation.replace('_', ' ')}</strong></div>
                <div>People Count: <strong className="text-stone-100 block">{peopleCount} persons</strong></div>
                <div>Phone: <strong className="text-stone-100 block">{reporterPhone}</strong></div>
                <div>Medical Emergency: <strong className={hasMedicalEmergency ? 'text-red-400 block' : 'text-stone-400 block'}>{hasMedicalEmergency ? 'YES' : 'NO'}</strong></div>
                <div>Unable to Escape: <strong className={isTrapped ? 'text-red-400 block' : 'text-stone-400 block'}>{isTrapped ? 'YES' : 'NO'}</strong></div>
              </div>

              {description && (
                <div className="pt-2 border-t border-stone-800 text-stone-300">
                  <span className="text-[10px] text-stone-500 uppercase block font-mono">Notes to Responders:</span>
                  "{description}"
                </div>
              )}
            </div>

            {/* Offline notice before submission (Section 10) */}
            {!isOnline ? (
              <div className="p-3 bg-red-950/80 border border-red-700 rounded-xl text-xs text-red-200 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-amber-300">
                  <WifiOff className="w-4 h-4" /> Location saved locally. Waiting for connection.
                </div>
                <p className="text-[11px] text-stone-300">
                  ResQMap guarantees that "Rescue team received your location" is never displayed until the backend server confirms receipt.
                </p>
              </div>
            ) : (
              <div className="p-2.5 bg-emerald-950/50 border border-emerald-800/80 rounded-xl text-xs text-emerald-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Ready to transmit high-priority SOS with GPS telemetry to Regional Incident Command.</span>
              </div>
            )}

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep('form')}
                className="px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-mono"
              >
                Back / Edit
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                className="px-6 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-black font-mono uppercase tracking-wider flex items-center gap-2 shadow-2xl animate-pulse"
              >
                <ShieldAlert className="w-5 h-5" /> TRANSMIT SOS TO RESCUE TEAMS
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: SUBMITTING */}
        {step === 'submitting' && (
          <div className="p-12 text-center space-y-4 font-mono">
            <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <h3 className="text-base font-bold text-stone-100">Transmitting Emergency Signal...</h3>
            <p className="text-xs text-stone-400">Locking coordinate geofence and pinging regional command.</p>
          </div>
        )}
      </div>
    </div>
  );
};

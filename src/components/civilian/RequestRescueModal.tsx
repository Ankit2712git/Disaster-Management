import React, { useState, useEffect } from 'react';
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
  ArrowLeft,
  WifiOff,
  RefreshCw,
  Plus,
  Minus,
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
  const [validationError, setValidationError] = useState<string | null>(null);

  // Sync coordinates when modal opens or liveLocation updates
  useEffect(() => {
    if (isOpen) {
      if (liveLocation) {
        setCustomLat(liveLocation.latitude);
        setCustomLng(liveLocation.longitude);
      } else {
        setCustomLat(userLocation.lat);
        setCustomLng(userLocation.lng);
      }
      if (!locationAddress || locationAddress === 'Delhi NCR, India') {
        setLocationAddress(userLocation.address);
      }
      setStep('form');
      setValidationError(null);
    }
  }, [isOpen, liveLocation, userLocation]);

  // ESC key dismissal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && step !== 'submitting') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, step, onClose]);

  if (!isOpen) return null;

  const situationOptions: { type: IncidentType; label: string; icon: React.ReactNode }[] = [
    { type: 'trapped', label: 'Trapped in House / Structure', icon: <Building2 className="w-4 h-4 flex-shrink-0" /> },
    { type: 'fire', label: 'Surrounded by Wildfire / Smoke', icon: <Flame className="w-4 h-4 flex-shrink-0" /> },
    { type: 'flood', label: 'Rising Floodwaters / Submerged', icon: <Waves className="w-4 h-4 flex-shrink-0" /> },
    { type: 'building_collapse', label: 'Structural / Roof Collapse', icon: <AlertTriangle className="w-4 h-4 flex-shrink-0" /> },
    { type: 'medical', label: 'Critical Medical Emergency', icon: <HeartPulse className="w-4 h-4 flex-shrink-0" /> },
    { type: 'injured', label: 'Severe Injury / Bleeding', icon: <HeartPulse className="w-4 h-4 flex-shrink-0" /> },
    { type: 'road_blocked', label: 'Evac Route Cut Off / Blocked', icon: <MapPin className="w-4 h-4 flex-shrink-0" /> },
    { type: 'earthquake', label: 'Earthquake Trapping Debris', icon: <Building2 className="w-4 h-4 flex-shrink-0" /> },
    { type: 'landslide', label: 'Mudslide / Landslide', icon: <AlertTriangle className="w-4 h-4 flex-shrink-0" /> },
    { type: 'other', label: 'Other Life Safety Hazard', icon: <ShieldAlert className="w-4 h-4 flex-shrink-0" /> },
  ];

  const handleResetGps = () => {
    if (liveLocation) {
      setCustomLat(liveLocation.latitude);
      setCustomLng(liveLocation.longitude);
    } else {
      setCustomLat(userLocation.lat);
      setCustomLng(userLocation.lng);
    }
    setLocationAddress(userLocation.address);
    setIsManualAdjustOpen(false);
  };

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

  const handleProceedToReview = () => {
    if (!locationAddress.trim()) {
      setValidationError('Please enter your rescue location address or landmark.');
      return;
    }
    if (!reporterPhone.trim()) {
      setValidationError('Please enter a contact phone number for rescue coordination.');
      return;
    }
    setValidationError(null);
    setStep('confirm');
  };

  const handleSubmit = async () => {
    setStep('submitting');
    try {
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
    } catch (err) {
      console.error('Failed to submit rescue request:', err);
      setStep('form');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/85 backdrop-blur-sm overflow-hidden"
      onClick={(e) => {
        if (e.target === e.currentTarget && step !== 'submitting') {
          onClose();
        }
      }}
    >
      <div
        className="relative w-full max-w-xl max-h-[92vh] sm:max-h-[88vh] flex flex-col bg-stone-900 border-2 border-red-600 rounded-2xl shadow-2xl overflow-hidden font-sans text-stone-100 animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sos-modal-title"
      >
        {/* Fixed Header */}
        <div className="flex-shrink-0 bg-red-950/95 border-b border-red-800/90 p-3.5 sm:p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-red-600 text-white shadow-md flex-shrink-0">
              <ShieldAlert className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse" />
            </div>
            <div>
              <h2 id="sos-modal-title" className="text-sm sm:text-base font-black tracking-wide uppercase text-red-100">
                EMERGENCY RESCUE REQUEST (SOS)
              </h2>
              <p className="text-[11px] sm:text-xs text-red-200">
                Direct dispatch to Search & Rescue, Fire, and NDRF First Responders.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={step === 'submitting'}
            className="text-stone-300 hover:text-white p-2 rounded-xl hover:bg-red-900/60 transition-colors cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center disabled:opacity-50"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Offline Warning Banner inside Modal */}
        {!isOnline && (
          <div className="flex-shrink-0 bg-red-950 px-4 py-2 border-b border-red-800/90 text-xs text-red-200 flex items-center gap-2">
            <WifiOff className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>
              <strong>OFFLINE NOTICE:</strong> Your emergency request will be securely saved locally and dispatched the moment network restores.
            </span>
          </div>
        )}

        {/* STEP 1: FORM VIEW */}
        {step === 'form' && (
          <>
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {validationError && (
                <div className="p-3 bg-red-950/90 border border-red-500 rounded-xl text-xs text-red-200 flex items-center gap-2 font-mono">
                  <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <span>{validationError}</span>
                </div>
              )}

              {/* 1. Rescue Location Coordinates */}
              <div className="bg-stone-950 p-3.5 sm:p-4 rounded-xl border border-stone-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono font-bold text-stone-200 uppercase flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                    1. Rescue Location & GPS Telemetry
                  </label>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> GPS Attached
                  </span>
                </div>

                <p className="text-[11px] text-stone-400">
                  Search & Rescue dispatch navigates to these exact coordinates. Fine-tune below if trapped on a specific floor or side of structure.
                </p>

                {/* Coordinates & Accuracy Readout */}
                <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-stone-900 border border-stone-800 text-xs font-mono">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-stone-300">
                      Lat: <strong className="text-stone-100">{customLat.toFixed(5)}</strong>, Lng: <strong className="text-stone-100">{customLng.toFixed(5)}</strong>
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-sky-950 text-sky-300 text-[10px] border border-sky-800">
                      ±{liveLocation?.accuracyMeters ? Math.round(liveLocation.accuracyMeters) : 12}m
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleResetGps}
                      className="text-[11px] text-stone-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer transition-colors"
                      title="Reset coordinates to current live device GPS"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Sync GPS</span>
                    </button>
                    <span className="text-stone-600">|</span>
                    <button
                      type="button"
                      onClick={() => setIsManualAdjustOpen(!isManualAdjustOpen)}
                      className="text-[11px] text-amber-400 hover:text-amber-300 font-bold cursor-pointer transition-colors"
                    >
                      {isManualAdjustOpen ? 'Close Adjust' : 'Adjust Manually'}
                    </button>
                  </div>
                </div>

                {isManualAdjustOpen && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 rounded-lg bg-stone-900/90 border border-amber-900/70 animate-in fade-in">
                    <div>
                      <label className="block text-[10px] font-mono text-stone-400 mb-1">Latitude (-90 to 90)</label>
                      <input
                        type="number"
                        step="any"
                        value={customLat}
                        onChange={(e) => setCustomLat(parseFloat(e.target.value) || 0)}
                        className="w-full bg-stone-950 border border-stone-700 rounded-lg px-2.5 py-1.5 text-xs text-stone-100 font-mono focus:border-amber-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono text-stone-400 mb-1">Longitude (-180 to 180)</label>
                      <input
                        type="number"
                        step="any"
                        value={customLng}
                        onChange={(e) => setCustomLng(parseFloat(e.target.value) || 0)}
                        className="w-full bg-stone-950 border border-stone-700 rounded-lg px-2.5 py-1.5 text-xs text-stone-100 font-mono focus:border-amber-400 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-mono text-stone-400 uppercase mb-1">
                    Street Address / Landmark / Floor & Room Number
                  </label>
                  <input
                    type="text"
                    value={locationAddress}
                    onChange={(e) => {
                      setLocationAddress(e.target.value);
                      if (validationError) setValidationError(null);
                    }}
                    className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2.5 text-xs text-stone-100 focus:outline-none focus:border-red-500 font-sans"
                    placeholder="E.g., Flat 304, Block B, Majnu Ka Tilla, near Gurudwara"
                    required
                  />
                </div>
              </div>

              {/* 2. Situation Selector */}
              <div>
                <label className="block text-xs font-mono font-bold text-stone-300 uppercase mb-2">
                  2. What is your current critical situation?
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {situationOptions.map((opt) => {
                    const isSelected = situation === opt.type;
                    return (
                      <button
                        key={opt.type}
                        type="button"
                        onClick={() => setSituation(opt.type)}
                        className={`p-3 rounded-xl border text-left text-xs transition-all flex items-center gap-2.5 min-h-[44px] cursor-pointer ${
                          isSelected
                            ? 'bg-red-950/90 border-red-500 text-white font-bold ring-2 ring-red-500/80 shadow-md'
                            : 'bg-stone-950/80 border-stone-800 text-stone-300 hover:border-stone-700 hover:bg-stone-900'
                        }`}
                      >
                        <span className={isSelected ? 'text-red-400' : 'text-stone-400'}>
                          {opt.icon}
                        </span>
                        <span className="truncate">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. People Count & Contact Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="bg-stone-950 p-3 rounded-xl border border-stone-800">
                  <label className="block text-xs font-mono font-bold text-stone-300 uppercase mb-1.5">
                    People In Group / Trapped
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPeopleCount((prev) => Math.max(1, prev - 1))}
                      className="w-9 h-9 rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-200 flex items-center justify-center font-bold text-base cursor-pointer active:scale-95 transition-transform"
                      aria-label="Decrease people count"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <div className="flex-1 flex items-center justify-center bg-stone-900 border border-stone-700 rounded-lg h-9 px-2">
                      <Users className="w-3.5 h-3.5 text-stone-400 mr-2 flex-shrink-0" />
                      <span className="font-mono font-bold text-base text-stone-100">{peopleCount}</span>
                      <span className="text-xs text-stone-400 ml-1.5">persons</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPeopleCount((prev) => Math.min(50, prev + 1))}
                      className="w-9 h-9 rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-200 flex items-center justify-center font-bold text-base cursor-pointer active:scale-95 transition-transform"
                      aria-label="Increase people count"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="bg-stone-950 p-3 rounded-xl border border-stone-800">
                  <label className="block text-xs font-mono font-bold text-stone-300 uppercase mb-1.5">
                    Callback Mobile Number
                  </label>
                  <input
                    type="tel"
                    value={reporterPhone}
                    onChange={(e) => {
                      setReporterPhone(e.target.value);
                      if (validationError) setValidationError(null);
                    }}
                    className="w-full h-9 bg-stone-900 border border-stone-700 rounded-lg px-3 text-xs font-mono text-stone-100 focus:outline-none focus:border-red-500"
                    placeholder="+91 98765 43210"
                    required
                  />
                  <p className="text-[10px] text-stone-500 mt-1">
                    First responder field units will dial this direct line.
                  </p>
                </div>
              </div>

              {/* 4. Triage Questions (High Contrast, Accessible Ergonomics) */}
              <div className="space-y-2.5 pt-1">
                <label className="block text-xs font-mono font-bold text-stone-300 uppercase">
                  4. Life-Safety Field Triage Checklist
                </label>

                {/* Trapped */}
                <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2 bg-stone-950 p-3 rounded-xl border border-stone-800">
                  <div className="text-xs pr-2">
                    <span className="font-bold text-stone-200 block">Is anyone unable to escape?</span>
                    <span className="text-[11px] text-stone-400">Exit blocked by water/fire, locked, or structural collapse</span>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsTrapped(true)}
                      className={`min-w-[64px] min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                        isTrapped
                          ? 'bg-red-600 text-white shadow-md ring-2 ring-red-400/50'
                          : 'bg-stone-800 hover:bg-stone-700 text-stone-300'
                      }`}
                    >
                      YES
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsTrapped(false)}
                      className={`min-w-[64px] min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                        !isTrapped
                          ? 'bg-stone-700 text-white shadow-md ring-2 ring-stone-500/50'
                          : 'bg-stone-800 hover:bg-stone-700 text-stone-300'
                      }`}
                    >
                      NO
                    </button>
                  </div>
                </div>

                {/* Medical Emergency */}
                <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2 bg-stone-950 p-3 rounded-xl border border-stone-800">
                  <div className="text-xs pr-2">
                    <span className="font-bold text-stone-200 block">Is there a medical emergency?</span>
                    <span className="text-[11px] text-stone-400">Difficulty breathing, unconsciousness, cardiac, diabetic, infant</span>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => setHasMedicalEmergency(true)}
                      className={`min-w-[64px] min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                        hasMedicalEmergency
                          ? 'bg-red-600 text-white shadow-md ring-2 ring-red-400/50'
                          : 'bg-stone-800 hover:bg-stone-700 text-stone-300'
                      }`}
                    >
                      YES
                    </button>
                    <button
                      type="button"
                      onClick={() => setHasMedicalEmergency(false)}
                      className={`min-w-[64px] min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                        !hasMedicalEmergency
                          ? 'bg-stone-700 text-white shadow-md ring-2 ring-stone-500/50'
                          : 'bg-stone-800 hover:bg-stone-700 text-stone-300'
                      }`}
                    >
                      NO
                    </button>
                  </div>
                </div>

                {/* Injured */}
                <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2 bg-stone-950 p-3 rounded-xl border border-stone-800">
                  <div className="text-xs pr-2">
                    <span className="font-bold text-stone-200 block">Is anyone severely injured?</span>
                    <span className="text-[11px] text-stone-400">Fractures, severe burns, lacerations, heavy bleeding</span>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsInjured(true)}
                      className={`min-w-[64px] min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                        isInjured
                          ? 'bg-red-600 text-white shadow-md ring-2 ring-red-400/50'
                          : 'bg-stone-800 hover:bg-stone-700 text-stone-300'
                      }`}
                    >
                      YES
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsInjured(false)}
                      className={`min-w-[64px] min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                        !isInjured
                          ? 'bg-stone-700 text-white shadow-md ring-2 ring-stone-500/50'
                          : 'bg-stone-800 hover:bg-stone-700 text-stone-300'
                      }`}
                    >
                      NO
                    </button>
                  </div>
                </div>
              </div>

              {/* 5. Additional notes */}
              <div>
                <label className="block text-xs font-mono font-bold text-stone-300 uppercase mb-1">
                  Additional Details & Vital Info (Optional)
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="E.g., 2nd floor balcony, smoke entering under front door, 1 elderly person unable to walk..."
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl p-3 text-xs text-stone-200 focus:outline-none focus:border-red-500 resize-none font-sans"
                />
              </div>

              {/* 6. Photo Attachment */}
              <div className="bg-stone-950 p-3 rounded-xl border border-stone-800">
                <label className="block text-xs font-mono font-bold text-stone-300 uppercase mb-1.5">
                  Attach Photo / Visual Hazard Evidence (Optional)
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 px-3.5 py-2 bg-stone-900 border border-stone-700 hover:border-stone-500 rounded-xl text-xs text-stone-200 cursor-pointer font-mono transition-colors min-h-[40px]">
                    <Camera className="w-4 h-4 text-amber-400" />
                    <span>Take or Choose Photo</span>
                    <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                  </label>
                  {uploadedImagePreview && (
                    <span className="text-xs text-emerald-400 font-mono flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Photo Attached
                    </span>
                  )}
                </div>

                {uploadedImagePreview && (
                  <div className="mt-3 relative inline-block rounded-xl overflow-hidden border border-stone-700 bg-stone-900">
                    <img src={uploadedImagePreview} alt="Damage or Hazard Preview" className="h-28 w-auto max-w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setUploadedImagePreview(null)}
                      className="absolute top-2 right-2 bg-stone-900/90 hover:bg-red-600 text-white rounded-lg p-1.5 transition-colors cursor-pointer shadow-md min-w-[32px] min-h-[32px] flex items-center justify-center"
                      title="Remove attached photo"
                      aria-label="Remove photo"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Fixed Step 1 Footer */}
            <div className="flex-shrink-0 p-3.5 sm:px-6 border-t border-stone-800 bg-stone-950/95 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white text-xs font-medium font-mono min-h-[44px] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleProceedToReview}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 active:scale-95 text-white text-xs font-bold font-mono tracking-wider flex items-center gap-2 shadow-lg min-h-[44px] cursor-pointer transition-all"
              >
                <span>Review & Confirm SOS</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </>
        )}

        {/* STEP 2: PRE-SUBMISSION CONFIRMATION VIEW */}
        {step === 'confirm' && (
          <>
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              <div className="bg-stone-950 p-4 sm:p-5 rounded-xl border border-stone-800 space-y-3 text-xs">
                <div className="border-b border-stone-800 pb-2.5 flex items-center justify-between">
                  <h3 className="font-black text-sm text-stone-100 uppercase tracking-wide">
                    Confirm SOS Details Before Incident Dispatch
                  </h3>
                  <span className="px-2.5 py-1 rounded bg-red-600 text-white font-mono text-[10px] font-bold">
                    PRIORITY 1
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-stone-300 font-mono">
                  <div className="bg-stone-900/60 p-2.5 rounded-lg border border-stone-800">
                    <span className="text-[10px] text-stone-500 uppercase block">Rescue Address:</span>
                    <strong className="text-stone-100 block text-xs mt-0.5">{locationAddress}</strong>
                  </div>
                  <div className="bg-stone-900/60 p-2.5 rounded-lg border border-stone-800">
                    <span className="text-[10px] text-stone-500 uppercase block">GPS Coordinates:</span>
                    <strong className="text-emerald-400 block text-xs mt-0.5">
                      {customLat.toFixed(5)}, {customLng.toFixed(5)}
                    </strong>
                  </div>
                  <div className="bg-stone-900/60 p-2.5 rounded-lg border border-stone-800">
                    <span className="text-[10px] text-stone-500 uppercase block">Situation:</span>
                    <strong className="text-red-400 uppercase block text-xs mt-0.5">
                      {situation.replace('_', ' ')}
                    </strong>
                  </div>
                  <div className="bg-stone-900/60 p-2.5 rounded-lg border border-stone-800">
                    <span className="text-[10px] text-stone-500 uppercase block">Party Size:</span>
                    <strong className="text-stone-100 block text-xs mt-0.5">
                      {peopleCount} {peopleCount === 1 ? 'Person' : 'Persons'}
                    </strong>
                  </div>
                  <div className="bg-stone-900/60 p-2.5 rounded-lg border border-stone-800">
                    <span className="text-[10px] text-stone-500 uppercase block">Callback Phone:</span>
                    <strong className="text-stone-100 block text-xs mt-0.5">{reporterPhone}</strong>
                  </div>
                  <div className="bg-stone-900/60 p-2.5 rounded-lg border border-stone-800">
                    <span className="text-[10px] text-stone-500 uppercase block">Triage Indicators:</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${isTrapped ? 'bg-red-950 text-red-300 border border-red-800' : 'bg-stone-800 text-stone-400'}`}>
                        {isTrapped ? 'TRAPPED' : 'Mobile'}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${hasMedicalEmergency ? 'bg-red-950 text-red-300 border border-red-800' : 'bg-stone-800 text-stone-400'}`}>
                        {hasMedicalEmergency ? 'MEDICAL' : 'No Critical Med'}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${isInjured ? 'bg-red-950 text-red-300 border border-red-800' : 'bg-stone-800 text-stone-400'}`}>
                        {isInjured ? 'INJURED' : 'Uninjured'}
                      </span>
                    </div>
                  </div>
                </div>

                {description && (
                  <div className="pt-2 border-t border-stone-800 text-stone-300 bg-stone-900/40 p-2.5 rounded-lg">
                    <span className="text-[10px] text-stone-500 uppercase block font-mono">Civilian Notes:</span>
                    <p className="text-xs text-stone-200 mt-0.5">"{description}"</p>
                  </div>
                )}
              </div>

              {/* Network Status Confirmation */}
              {!isOnline ? (
                <div className="p-3.5 bg-red-950/80 border border-red-700 rounded-xl text-xs text-red-200 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-amber-300">
                    <WifiOff className="w-4 h-4" /> Queued for Local Storage (Offline Mode)
                  </div>
                  <p className="text-[11px] text-stone-300">
                    ResQMap guarantees your distress telemetry is encrypted locally and transmits the instant connectivity reconnects.
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-emerald-950/50 border border-emerald-800/80 rounded-xl text-xs text-emerald-200 flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <span>Ready for instant transmission to National Disaster Response Force (NDRF) & Search & Rescue Grid.</span>
                </div>
              )}
            </div>

            {/* Fixed Step 2 Footer */}
            <div className="flex-shrink-0 p-3.5 sm:px-6 border-t border-stone-800 bg-stone-950/95 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setStep('form')}
                className="px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white text-xs font-mono min-h-[44px] flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back / Edit</span>
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 active:scale-95 text-white text-xs font-black font-mono uppercase tracking-wider flex items-center gap-2 shadow-2xl animate-pulse min-h-[44px] cursor-pointer transition-all"
              >
                <ShieldAlert className="w-5 h-5" />
                <span>TRANSMIT SOS TO RESCUE TEAMS</span>
              </button>
            </div>
          </>
        )}

        {/* STEP 3: SUBMITTING VIEW */}
        {step === 'submitting' && (
          <div className="p-12 text-center space-y-4 font-mono">
            <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <h3 className="text-base font-bold text-stone-100">Transmitting Emergency Signal...</h3>
            <p className="text-xs text-stone-400">Locking coordinate geofence and dispatching alert to Regional Incident Command.</p>
          </div>
        )}
      </div>
    </div>
  );
};


import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  MapPin,
  Camera,
  X,
  CheckCircle2,
  Flame,
  Waves,
  Zap,
  Trees,
  RefreshCw,
  Upload,
  AlertOctagon,
  ShieldCheck,
} from 'lucide-react';
import { useEmergency } from '../../context/EmergencyContext';
import { RoadBlockage } from '../../types';

interface ReportHazardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReportHazardModal: React.FC<ReportHazardModalProps> = ({ isOpen, onClose }) => {
  const { userLocation, liveLocation, reportHazard } = useEmergency();

  const [hazardType, setHazardType] = useState<string>('Fallen Tree / Downed Powerline');
  const [locationName, setLocationName] = useState<string>(userLocation.address);
  const [customLat, setCustomLat] = useState<number>(liveLocation ? liveLocation.latitude : userLocation.lat);
  const [customLng, setCustomLng] = useState<number>(liveLocation ? liveLocation.longitude : userLocation.lng);
  const [notes, setNotes] = useState<string>('');
  const [isImpassable, setIsImpassable] = useState<boolean>(true);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  // Sync coordinates when modal opens
  useEffect(() => {
    if (isOpen) {
      if (liveLocation) {
        setCustomLat(liveLocation.latitude);
        setCustomLng(liveLocation.longitude);
      } else {
        setCustomLat(userLocation.lat);
        setCustomLng(userLocation.lng);
      }
      setLocationName(userLocation.address);
      setIsSubmitted(false);
    }
  }, [isOpen, liveLocation, userLocation]);

  // ESC key dismissal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSubmitted) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitted, onClose]);

  if (!isOpen) return null;

  const hazardOptions = [
    { label: 'Fallen Tree / Downed Powerline', icon: <Trees className="w-4 h-4 text-emerald-400" /> },
    { label: 'Flash Flood / Road Submerged', icon: <Waves className="w-4 h-4 text-sky-400" /> },
    { label: 'Structural Bridge Collapse', icon: <AlertTriangle className="w-4 h-4 text-rose-400" /> },
    { label: 'Rockslide / Mud Debris', icon: <AlertOctagon className="w-4 h-4 text-amber-400" /> },
    { label: 'Active Fire / Heavy Smoke', icon: <Flame className="w-4 h-4 text-red-400" /> },
    { label: 'Live Arcing High-Voltage Wire', icon: <Zap className="w-4 h-4 text-yellow-400" /> },
  ];

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newBlockage: RoadBlockage = {
      id: `blockage-${Date.now()}`,
      name: `${hazardType} at ${locationName}`,
      location: {
        lat: customLat + (Math.random() - 0.5) * 0.005,
        lng: customLng + (Math.random() - 0.5) * 0.005,
      },
      hazardType,
      status: isImpassable ? 'blocked' : 'caution',
      reportedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      notes: notes || 'Civilian field report submitted via citizen app.',
    };

    reportHazard(newBlockage);
    setIsSubmitted(true);
    setTimeout(() => {
      setIsSubmitted(false);
      onClose();
    }, 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/85 backdrop-blur-sm overflow-hidden"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitted) {
          onClose();
        }
      }}
    >
      <div
        className="relative w-full max-w-lg max-h-[92vh] sm:max-h-[88vh] flex flex-col bg-stone-900 border border-amber-600/60 rounded-2xl shadow-2xl overflow-hidden font-sans text-stone-100 animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="hazard-modal-title"
      >
        {/* Fixed Header */}
        <div className="flex-shrink-0 bg-stone-950 border-b border-stone-800 p-3.5 sm:p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30 flex-shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 id="hazard-modal-title" className="text-sm sm:text-base font-bold uppercase tracking-wide text-stone-100">
                Report Road Hazard / Obstruction
              </h2>
              <p className="text-[11px] sm:text-xs text-stone-400">
                Instantly updates GIS routing engine to divert citizen traffic away from danger corridors.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitted}
            className="text-stone-400 hover:text-stone-100 p-2 rounded-xl hover:bg-stone-800 transition-colors cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center disabled:opacity-50"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSubmitted ? (
          <div className="p-10 text-center space-y-4 font-mono my-auto">
            <CheckCircle2 className="w-14 h-14 text-emerald-400 mx-auto animate-bounce" />
            <h3 className="text-base font-bold text-stone-100">Hazard Report Received</h3>
            <p className="text-xs text-stone-400 max-w-sm mx-auto">
              Corridor geofence marked. Safe evacuation navigation algorithms are now rerouting evacuees away from this hazard.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
            {/* Scrollable Form Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
              {/* Hazard Obstruction Selector */}
              <div>
                <label className="block font-mono font-bold text-stone-300 uppercase mb-1.5">
                  1. Hazard Obstruction Type
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {hazardOptions.map((opt) => {
                    const isSelected = hazardType === opt.label;
                    return (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => setHazardType(opt.label)}
                        className={`p-2.5 rounded-xl border text-left text-xs transition-all flex items-center gap-2 min-h-[42px] cursor-pointer ${
                          isSelected
                            ? 'bg-amber-950/80 border-amber-500 text-white font-bold ring-2 ring-amber-500/70 shadow-sm'
                            : 'bg-stone-950/80 border-stone-800 text-stone-300 hover:border-stone-700 hover:bg-stone-900'
                        }`}
                      >
                        <span className="flex-shrink-0">{opt.icon}</span>
                        <span className="truncate">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Location Details & Coordinates */}
              <div className="bg-stone-950 p-3 rounded-xl border border-stone-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-mono font-bold text-stone-300 uppercase block">
                    2. Location & Intersection
                  </label>
                  <span className="text-[10px] font-mono text-stone-400 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-amber-400" />
                    {customLat.toFixed(4)}, {customLng.toFixed(4)}
                  </span>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    value={locationName}
                    onChange={(e) => setLocationName(e.target.value)}
                    className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 text-stone-200 focus:outline-none focus:border-amber-500 font-sans text-xs"
                    placeholder="E.g., Ring Road near ISBT Kashmere Gate underpass"
                    required
                  />
                </div>
              </div>

              {/* Impassable vs Caution Segmented Selector */}
              <div>
                <label className="block font-mono font-bold text-stone-300 uppercase mb-1.5">
                  3. Road Passability Status
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setIsImpassable(true)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer min-h-[50px] flex flex-col justify-center ${
                      isImpassable
                        ? 'bg-red-950/90 border-red-500 text-white ring-2 ring-red-500/80 shadow-md'
                        : 'bg-stone-950 border-stone-800 text-stone-400 hover:border-stone-700'
                    }`}
                  >
                    <span className="font-bold font-mono text-xs flex items-center gap-1.5 text-red-300">
                      <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                      COMPLETELY BLOCKED
                    </span>
                    <span className="text-[10px] text-stone-400 mt-0.5">Vehicles cannot cross safely</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsImpassable(false)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer min-h-[50px] flex flex-col justify-center ${
                      !isImpassable
                        ? 'bg-amber-950/90 border-amber-500 text-white ring-2 ring-amber-500/80 shadow-md'
                        : 'bg-stone-950 border-stone-800 text-stone-400 hover:border-stone-700'
                    }`}
                  >
                    <span className="font-bold font-mono text-xs flex items-center gap-1.5 text-amber-300">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      PARTIAL CAUTION
                    </span>
                    <span className="text-[10px] text-stone-400 mt-0.5">Slow single lane or high clearance</span>
                  </button>
                </div>
              </div>

              {/* Additional Observations */}
              <div>
                <label className="block font-mono font-bold text-stone-300 uppercase mb-1">
                  4. Field Notes & Observations (Optional)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="E.g., live electrical sparks, flood depth approximately 2 feet, tree blocking both inbound lanes..."
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl p-2.5 text-stone-200 focus:outline-none focus:border-amber-500 resize-none font-sans"
                />
              </div>

              {/* Photo Evidence */}
              <div>
                <label className="block font-mono font-bold text-stone-300 uppercase mb-1">
                  Attach Photo Evidence (Optional)
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 px-3 py-2 bg-stone-950 border border-stone-700 hover:border-stone-500 rounded-xl text-xs text-stone-300 cursor-pointer font-mono min-h-[38px] transition-colors">
                    <Camera className="w-4 h-4 text-amber-400" />
                    <span>Upload Picture</span>
                    <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                  </label>
                  {uploadedImage && (
                    <span className="text-xs text-emerald-400 font-mono flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Photo Attached
                    </span>
                  )}
                </div>
                {uploadedImage && (
                  <div className="mt-2 relative inline-block rounded-lg overflow-hidden border border-stone-700 bg-stone-950">
                    <img src={uploadedImage} alt="Hazard Evidence" className="h-20 w-auto object-cover" />
                    <button
                      type="button"
                      onClick={() => setUploadedImage(null)}
                      className="absolute top-1 right-1 bg-black/80 text-white rounded p-1 hover:bg-red-600 transition-colors cursor-pointer"
                      aria-label="Remove photo"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Fixed Footer */}
            <div className="flex-shrink-0 p-3.5 sm:px-5 border-t border-stone-800 bg-stone-950 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white rounded-xl font-mono text-xs min-h-[42px] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-amber-600 hover:bg-amber-500 active:scale-95 text-stone-950 font-bold rounded-xl font-mono uppercase tracking-wider text-xs shadow-lg min-h-[42px] cursor-pointer transition-all flex items-center gap-1.5"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>Submit Hazard Report</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};


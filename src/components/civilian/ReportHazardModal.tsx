import React, { useState } from 'react';
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
} from 'lucide-react';
import { useEmergency } from '../../context/EmergencyContext';
import { RoadBlockage } from '../../types';

interface ReportHazardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReportHazardModal: React.FC<ReportHazardModalProps> = ({ isOpen, onClose }) => {
  const { userLocation, reportHazard } = useEmergency();

  const [hazardType, setHazardType] = useState<string>('Fallen Tree / Downed Powerline');
  const [locationName, setLocationName] = useState<string>(userLocation.address);
  const [notes, setNotes] = useState<string>('');
  const [isImpassable, setIsImpassable] = useState<boolean>(true);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newBlockage: RoadBlockage = {
      id: `blockage-${Date.now()}`,
      name: `${hazardType} at ${locationName}`,
      location: {
        lat: userLocation.lat + (Math.random() - 0.5) * 0.01,
        lng: userLocation.lng + (Math.random() - 0.5) * 0.01,
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
    }, 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl overflow-hidden font-sans text-stone-100">
        <div className="bg-stone-950 border-b border-stone-800 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold uppercase tracking-wide text-stone-100">
                Report Road Hazard / Obstruction
              </h2>
              <p className="text-xs text-stone-400">
                Informs emergency evacuation routing to bypass dangerous corridors.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-100 p-1.5 rounded-lg hover:bg-stone-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSubmitted ? (
          <div className="p-8 text-center space-y-3 font-mono">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
            <h3 className="text-base font-bold text-stone-100">Hazard Report Received</h3>
            <p className="text-xs text-stone-400">
              Corridor marked. Evacuation routing algorithms will divert traffic around this sector.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
            <div>
              <label className="block font-mono font-bold text-stone-300 uppercase mb-1">
                Hazard Obstruction Type
              </label>
              <select
                value={hazardType}
                onChange={(e) => setHazardType(e.target.value)}
                className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-stone-200 focus:outline-none focus:border-amber-500 font-mono"
              >
                <option value="Fallen Tree / Downed Powerline">Fallen Tree / Downed Powerline</option>
                <option value="Flash Flood / Road Submerged">Flash Flood / Road Submerged</option>
                <option value="Structural Bridge Collapse">Structural Bridge Collapse</option>
                <option value="Rockslide / Mud Debris">Rockslide / Mud Debris</option>
                <option value="Active Fire / Heavy Smoke">Active Fire / Heavy Smoke</option>
                <option value="Abandoned Vehicle Gridlock">Abandoned Vehicle Gridlock</option>
              </select>
            </div>

            <div>
              <label className="block font-mono font-bold text-stone-300 uppercase mb-1">
                Location Details
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-stone-200 focus:outline-none focus:border-amber-500 font-mono"
                  placeholder="Street intersection or landmark"
                  required
                />
                <MapPin className="w-4 h-4 text-amber-400 absolute right-3 top-2.5" />
              </div>
            </div>

            <div className="flex items-center justify-between bg-stone-950 p-3 rounded-xl border border-stone-800">
              <div>
                <span className="font-bold text-stone-200 block">Is the road completely impassable?</span>
                <span className="text-[11px] text-stone-400">Cannot be traversed by emergency or civilian vehicles</span>
              </div>
              <input
                type="checkbox"
                checked={isImpassable}
                onChange={(e) => setIsImpassable(e.target.checked)}
                className="w-4 h-4 rounded accent-amber-500 cursor-pointer"
              />
            </div>

            <div>
              <label className="block font-mono font-bold text-stone-300 uppercase mb-1">
                Additional Observations
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="E.g., live arcing sparks, water is approx knee-deep, debris covering both lanes..."
                className="w-full bg-stone-950 border border-stone-700 rounded-xl p-2.5 text-stone-200 focus:outline-none focus:border-amber-500 resize-none"
              />
            </div>

            <div className="pt-2 border-t border-stone-800 flex items-center justify-between">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl font-mono"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold rounded-xl font-mono uppercase tracking-wider"
              >
                Submit Hazard Report
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

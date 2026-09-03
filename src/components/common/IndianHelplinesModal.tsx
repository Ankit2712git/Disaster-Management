import React, { useState, useMemo } from 'react';
import {
  PhoneCall,
  Shield,
  X,
  Search,
  Check,
  Copy,
  ExternalLink,
  Flame,
  HeartPulse,
  Truck,
  Users,
  AlertOctagon,
  Sparkles,
} from 'lucide-react';
import { INDIAN_HELPLINES, IndianEmergencyHelpline } from '../../data/mockData';

interface IndianHelplinesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const IndianHelplinesModal: React.FC<IndianHelplinesModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [copiedNumber, setCopiedNumber] = useState<string | null>(null);

  const categories = [
    { id: 'all', label: 'All Helplines' },
    { id: 'national', label: 'National (112 / NDMA)' },
    { id: 'disaster', label: 'Disaster (NDMA / SDMA)' },
    { id: 'medical', label: 'Medical (108 Ambulance)' },
    { id: 'police_fire', label: 'Police & Fire' },
    { id: 'specialized', label: 'Specialized (Women / Rail)' },
  ];

  const filteredHelplines = useMemo(() => {
    return INDIAN_HELPLINES.filter((h) => {
      const matchesCategory =
        selectedCategory === 'all' || h.category === selectedCategory;
      const matchesSearch =
        h.number.includes(searchQuery) ||
        h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        h.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
        h.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  const handleCopy = (num: string) => {
    navigator.clipboard.writeText(num);
    setCopiedNumber(num);
    setTimeout(() => setCopiedNumber(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-stone-900 border border-stone-800 shadow-2xl text-stone-100 font-sans overflow-hidden">
        {/* Header with Indian Flag Accent */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-800 bg-stone-950/80">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-600 via-stone-800 to-emerald-600 text-white shadow-lg p-0.5">
              <div className="h-full w-full rounded-[10px] bg-stone-950 flex items-center justify-center">
                <PhoneCall className="w-5 h-5 text-amber-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-stone-100">
                  National Emergency Helplines (India)
                </h2>
                <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-800">
                  24x7 Toll-Free
                </span>
              </div>
              <p className="text-xs text-stone-400">
                Direct 1-tap emergency dialers for NDMA, NDRF, SDMA, Fire & 108 Ambulance
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Priority Quick-Dial Grid (112, 1078, 108, 101) */}
        <div className="p-4 bg-stone-950 border-b border-stone-800">
          <div className="text-[11px] font-mono uppercase tracking-wider text-amber-400 font-bold mb-2 flex items-center gap-1.5">
            <AlertOctagon className="w-3.5 h-3.5" />
            <span>Priority Emergency Quick Dial (Pan-India)</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <a
              href="tel:112"
              className="group flex flex-col items-center justify-center p-3 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-700/80 text-center transition-all active:scale-95 shadow-md"
            >
              <span className="text-xl font-black font-mono text-red-300 group-hover:text-red-100">
                112
              </span>
              <span className="text-[10px] font-bold text-stone-300 uppercase tracking-tight">
                National All-in-One
              </span>
              <span className="text-[9px] font-mono text-red-400">Police / Fire / SAR</span>
            </a>

            <a
              href="tel:1078"
              className="group flex flex-col items-center justify-center p-3 rounded-xl bg-amber-950/40 hover:bg-amber-900/60 border border-amber-700/80 text-center transition-all active:scale-95 shadow-md"
            >
              <span className="text-xl font-black font-mono text-amber-300 group-hover:text-amber-100">
                1078
              </span>
              <span className="text-[10px] font-bold text-stone-300 uppercase tracking-tight">
                NDMA Disaster
              </span>
              <span className="text-[9px] font-mono text-amber-400">National Control Room</span>
            </a>

            <a
              href="tel:108"
              className="group flex flex-col items-center justify-center p-3 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-700/80 text-center transition-all active:scale-95 shadow-md"
            >
              <span className="text-xl font-black font-mono text-emerald-300 group-hover:text-emerald-100">
                108
              </span>
              <span className="text-[10px] font-bold text-stone-300 uppercase tracking-tight">
                108 Ambulance
              </span>
              <span className="text-[9px] font-mono text-emerald-400">Medical Trauma (EMRI)</span>
            </a>

            <a
              href="tel:101"
              className="group flex flex-col items-center justify-center p-3 rounded-xl bg-orange-950/40 hover:bg-orange-900/60 border border-orange-700/80 text-center transition-all active:scale-95 shadow-md"
            >
              <span className="text-xl font-black font-mono text-orange-300 group-hover:text-orange-100">
                101
              </span>
              <span className="text-[10px] font-bold text-stone-300 uppercase tracking-tight">
                Fire & Rescue
              </span>
              <span className="text-[9px] font-mono text-orange-400">Extrication Services</span>
            </a>
          </div>
        </div>

        {/* Search & Category Filter */}
        <div className="p-3 sm:px-5 sm:py-3 border-b border-stone-800 bg-stone-900/90 space-y-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search helpline by number, agency (NDMA, Police, Railway) or keyword..."
              className="w-full pl-9 pr-4 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-500 font-sans"
            />
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1 rounded-lg text-xs font-mono whitespace-nowrap transition-colors ${
                  selectedCategory === cat.id
                    ? 'bg-amber-600 text-stone-950 font-bold'
                    : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Helplines List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-2.5">
          {filteredHelplines.length === 0 ? (
            <div className="py-12 text-center text-stone-500 text-xs font-mono">
              No helpline found matching "{searchQuery}". Dial <strong className="text-red-400">112</strong> for any emergency assistance in India.
            </div>
          ) : (
            filteredHelplines.map((item) => (
              <div
                key={item.number}
                className="flex items-center justify-between p-3 sm:p-3.5 rounded-xl bg-stone-950/70 hover:bg-stone-950 border border-stone-800/90 transition-all hover:border-stone-700 gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-base sm:text-lg font-bold font-mono text-amber-400">
                      {item.number}
                    </span>
                    <span className="text-xs font-bold text-stone-200 truncate">
                      {item.name}
                    </span>
                    {item.isTollFree && (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-900">
                        Toll-Free
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-stone-400 mt-0.5 leading-snug">
                    {item.description}
                  </p>
                  <p className="text-[10px] font-mono text-stone-500 mt-1">
                    Department: {item.department}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => handleCopy(item.number)}
                    className="p-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 transition-colors"
                    title="Copy number"
                  >
                    {copiedNumber === item.number ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>

                  <a
                    href={`tel:${item.number}`}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs shadow-md transition-all active:scale-95"
                    title={`Call ${item.number}`}
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    <span>Call</span>
                  </a>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Note */}
        <div className="px-5 py-3 border-t border-stone-800 bg-stone-950 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-stone-400">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Operational Across All States & Union Territories of India</span>
          </div>
          <span className="text-stone-500">Government of India Standard (ERSS-112)</span>
        </div>
      </div>
    </div>
  );
};

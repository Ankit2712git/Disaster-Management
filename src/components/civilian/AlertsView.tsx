import React from 'react';
import {
  Bell,
  AlertTriangle,
  Flame,
  Waves,
  ShieldAlert,
  Clock,
  MapPin,
  CheckCircle2,
  ExternalLink,
  Info,
} from 'lucide-react';
import { useEmergency } from '../../context/EmergencyContext';
import { Alert } from '../../types';

export const AlertsView: React.FC = () => {
  const { alerts, lastSyncTime } = useEmergency();

  const getSeverityBadge = (severity: Alert['severity']) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-950 text-red-300 border-red-700 font-bold';
      case 'warning':
        return 'bg-amber-950 text-amber-300 border-amber-700 font-bold';
      case 'advisory':
      default:
        return 'bg-yellow-950 text-yellow-300 border-yellow-800';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 pb-12 font-sans">
      {/* Header */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 sm:p-5 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-black text-stone-100 uppercase tracking-wide">
                Disaster & Emergency Alerts
              </h1>
              <p className="text-xs text-stone-400 mt-0.5">
                Official civil defense notifications, evacuation orders, and life-safety advisories.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-stone-400 bg-stone-950 px-3 py-1.5 rounded-lg border border-stone-800">
            <Clock className="w-3.5 h-3.5 text-stone-500" />
            <span>Feed Verified: {lastSyncTime}</span>
          </div>
        </div>
      </div>

      {/* Alerts Feed */}
      <div className="space-y-3.5">
        {alerts.map((alert) => {
          const isCritical = alert.severity === 'critical';

          return (
            <div
              key={alert.id}
              className={`bg-stone-900 rounded-2xl p-4 sm:p-5 border transition-all ${
                isCritical
                  ? 'border-2 border-red-600 shadow-xl'
                  : 'border-stone-800 hover:border-stone-700 shadow-md'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2 border-b border-stone-800 pb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`px-2.5 py-0.5 rounded text-xs font-mono uppercase tracking-wide border ${getSeverityBadge(
                      alert.severity
                    )}`}
                  >
                    {alert.severity} ADVISORY
                  </span>
                  <span className="text-xs font-mono text-stone-400">
                    ID: {alert.id}
                  </span>
                  <span className="text-xs font-mono text-stone-400">
                    • Source: {alert.source}
                  </span>
                </div>

                <div className="text-right text-xs font-mono text-stone-400">
                  <span>Issued: {alert.timestamp}</span>
                </div>
              </div>

              <div className="mt-3 space-y-2">
                <h3 className="text-base font-bold text-stone-100 leading-snug">
                  {alert.title}
                </h3>
                <p className="text-xs text-stone-300 leading-relaxed">
                  {alert.message}
                </p>
              </div>

              {/* Affected Area & Validity */}
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono bg-stone-950 p-2.5 rounded-xl border border-stone-800">
                <div className="flex items-center gap-1.5 text-stone-300 truncate">
                  <MapPin className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                  <span className="text-stone-500">AFFECTED ZONE:</span>
                  <span className="text-stone-200 truncate font-semibold">{alert.affectedArea}</span>
                </div>
                <div className="flex items-center gap-1.5 text-stone-300">
                  <Clock className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
                  <span className="text-stone-500">VALIDITY:</span>
                  <span className="text-stone-200 font-semibold">{alert.validUntil}</span>
                </div>
              </div>

              {/* Recommended Actions */}
              {alert.recommendedActions && alert.recommendedActions.length > 0 && (
                <div className="mt-3 pt-3 border-t border-stone-800 space-y-1.5">
                  <span className="text-[11px] font-mono text-amber-400 font-bold uppercase tracking-wider block">
                    Mandatory & Recommended Citizen Actions:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {alert.recommendedActions.map((action, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 p-2 rounded-lg bg-stone-950/60 border border-stone-800 text-xs text-stone-200"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                        <span>{action}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

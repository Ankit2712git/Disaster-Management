import React, { useEffect, useState } from 'react';
import { WifiOff, CheckCircle2 } from 'lucide-react';
import { useEmergency } from '../../context/EmergencyContext';

export const OfflineIndicator: React.FC = () => {
  const { isOnline } = useEmergency();
  const [nativeOnline, setNativeOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setNativeOnline(true);
    const handleOffline = () => setNativeOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const effectivelyOffline = !isOnline || !nativeOnline;

  if (!effectivelyOffline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2.5 rounded-xl bg-red-950/90 border border-red-700 px-3.5 py-2 text-xs font-mono text-red-200 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2">
      <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
      <WifiOff className="w-4 h-4 text-red-400" />
      <span>Offline Mesh Active — Cached GIS & Shelters</span>
    </div>
  );
};

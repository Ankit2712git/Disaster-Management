import React, { useState } from 'react';
import { Download, Share, X, CheckCircle2, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA, do not display
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold font-mono text-xs shadow-md transition-all active:scale-95 border border-amber-400"
        title="Install ResQMap as native Progressive Web App"
        id="btn-install-pwa"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Install App</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 font-mono text-xs transition-colors"
          id="btn-install-ios"
        >
          <Smartphone className="w-3.5 h-3.5 text-amber-400" />
          <span>Install App</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-2xl bg-stone-900 border border-stone-800 p-6 shadow-2xl text-stone-100 font-sans">
              <div className="flex items-center justify-between pb-3 border-b border-stone-800">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-amber-500" />
                  <h3 className="text-base font-bold text-stone-100">Install ResQMap on iOS</h3>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded-lg text-stone-400 hover:text-stone-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-4 space-y-3 text-xs text-stone-300">
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-stone-950 border border-stone-800">
                  <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-mono font-bold flex items-center justify-center flex-shrink-0">
                    1
                  </span>
                  <p>
                    Tap the <strong>Share</strong> button <Share className="w-3.5 h-3.5 inline mx-1 text-sky-400" /> in Safari's bottom toolbar.
                  </p>
                </div>

                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-stone-950 border border-stone-800">
                  <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-mono font-bold flex items-center justify-center flex-shrink-0">
                    2
                  </span>
                  <p>
                    Scroll down and select <strong>"Add to Home Screen"</strong>.
                  </p>
                </div>

                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-stone-950 border border-stone-800">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono font-bold flex items-center justify-center flex-shrink-0">
                    3
                  </span>
                  <p>
                    Launch from your Home Screen for full offline disaster mapping support.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 text-xs font-bold font-mono transition-colors uppercase tracking-wider"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Fallback desktop / browser install button if browser hasn't fired beforeinstallprompt yet or standard browser
  return (
    <button
      onClick={() => {
        if (!install()) {
          alert('To install ResQMap, use your browser menu (e.g., Chrome address bar "Install" icon or Menu > Save and share > Install ResQMap).');
        }
      }}
      className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700 font-mono text-xs transition-colors"
      title="Install as Progressive Web App"
    >
      <Download className="w-3.5 h-3.5 text-amber-400" />
      <span>Install App</span>
    </button>
  );
};

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import App from './App.tsx';
import './index.css';

// Defensive monkeypatch for Leaflet to prevent "Cannot read properties of undefined (reading '_leaflet_pos')"
// when maps unmount or re-render during async events, animations, timeouts, or React StrictMode
if (typeof window !== 'undefined' && L && L.DomUtil) {
  const origGetPosition = L.DomUtil.getPosition;
  L.DomUtil.getPosition = function (el: HTMLElement) {
    if (!el) {
      return new L.Point(0, 0);
    }
    return origGetPosition ? origGetPosition(el) : ((el as any)._leaflet_pos || new L.Point(0, 0));
  };

  if (L.Map && L.Map.prototype) {
    const origGetMapPanePos = (L.Map.prototype as any)._getMapPanePos;
    (L.Map.prototype as any)._getMapPanePos = function () {
      if (!this._mapPane) {
        return new L.Point(0, 0);
      }
      return origGetMapPanePos
        ? origGetMapPanePos.call(this)
        : L.DomUtil.getPosition(this._mapPane) || new L.Point(0, 0);
    };
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

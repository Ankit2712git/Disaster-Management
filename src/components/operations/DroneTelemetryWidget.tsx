import React, { useState, useEffect, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Cell,
  PieChart,
  Pie,
  AreaChart,
  Area,
  CartesianGrid,
} from 'recharts';
import {
  BatteryCharging,
  BatteryMedium,
  BatteryWarning,
  Clock,
  Compass,
  Gauge,
  MapPin,
  Plane,
  Radar,
  Radio,
  RefreshCw,
  ShieldAlert,
  Signal,
  Wind,
  Zap,
} from 'lucide-react';
import { Drone, DroneMission } from '../../types';

interface DroneTelemetryWidgetProps {
  drones: Drone[];
  droneMissions: DroneMission[];
  onSelectDrone?: (droneId: string) => void;
}

interface SimulatedDroneTelemetry {
  id: string;
  code: string;
  name: string;
  model: string;
  status: string;
  battery: number;
  flightDurationMinutes: number;
  estRemainingMinutes: number;
  areaCoveragePercent: number;
  areaCoveredKm2: number;
  targetAreaKm2: number;
  altitudeM: number;
  speedKmh: number;
  signalStrengthPercent: number;
  temperatureC: number;
  currentSector: string;
  lat: number;
  lng: number;
  payloadKg: number;
  maxPayloadKg: number;
}

export const DroneTelemetryWidget: React.FC<DroneTelemetryWidgetProps> = ({
  drones,
  droneMissions,
  onSelectDrone,
}) => {
  const [selectedDroneId, setSelectedDroneId] = useState<string>(
    drones[0]?.id || 'drone-103'
  );
  const [ticker, setTicker] = useState<number>(0);
  const [activeMetricTab, setActiveMetricTab] = useState<'battery' | 'flight' | 'coverage'>('battery');

  // Live telemetry pulse simulator (simulates real-time telemetry fluctuations)
  useEffect(() => {
    const timer = setInterval(() => {
      setTicker((prev) => prev + 1);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  // Compute live telemetry for all drones
  const telemetryData: SimulatedDroneTelemetry[] = useMemo(() => {
    return drones.map((drone, idx) => {
      // Find matching mission if any
      const mission = droneMissions.find(
        (m) => m.droneId === drone.id && m.status === 'in_progress'
      ) || droneMissions.find((m) => m.droneId === drone.id);

      // Base metrics derived from mock data + dynamic ticker
      const jitter = ((ticker + idx * 7) % 5) - 2;
      const baseBattery = drone.batteryPercent;
      const battery = Math.max(8, Math.min(100, baseBattery + (idx === 2 ? -((ticker % 3) * 0.5) : 0)));

      const flightDurationMinutes =
        drone.id === 'drone-103'
          ? 38 + Math.floor(ticker / 4)
          : drone.id === 'drone-101'
          ? 24 + Math.floor(ticker / 5)
          : drone.id === 'drone-102'
          ? 15 + Math.floor(ticker / 6)
          : 6;

      const estRemainingMinutes = Math.max(2, Math.round((battery / 100) * 45));

      const targetAreaKm2 = mission?.surveyArea?.areaKm2 || (idx === 0 ? 8.5 : idx === 1 ? 4.2 : idx === 2 ? 12.0 : 6.0);
      const missionProgress = mission?.progress || (idx === 2 ? 72 : idx === 0 ? 45 : idx === 1 ? 88 : 20);
      const areaCoveragePercent = Math.min(100, missionProgress + ((ticker * 0.4) % 4));
      const areaCoveredKm2 = Number(((areaCoveragePercent / 100) * targetAreaKm2).toFixed(2));

      const altitudeM =
        drone.status === 'surveying' || drone.status === 'airborne'
          ? 110 + jitter * 3
          : drone.status === 'delivering'
          ? 85 + jitter * 2
          : 0;

      const speedKmh =
        drone.status === 'surveying' || drone.status === 'airborne'
          ? 36 + jitter * 1.5
          : drone.status === 'delivering'
          ? 48 + jitter * 2
          : 0;

      const signalStrengthPercent = Math.min(100, 94 + (jitter % 5));
      const temperatureC = 31 + (idx * 2) + Math.abs(jitter);

      const sectorNames = [
        'Yamuna Basin North (Zone A)',
        'Kashmere Gate Lowlands (Zone B)',
        'Majnu Ka Tilla Highline (Zone C)',
        'Shastri Park Relief Corridor',
      ];

      return {
        id: drone.id,
        code: `UAV-0${idx + 1}`,
        name: drone.name,
        model: drone.model,
        status: drone.status,
        battery: Math.round(battery),
        flightDurationMinutes,
        estRemainingMinutes,
        areaCoveragePercent: Math.round(areaCoveragePercent),
        areaCoveredKm2,
        targetAreaKm2,
        altitudeM: Math.round(altitudeM),
        speedKmh: Math.round(speedKmh),
        signalStrengthPercent,
        temperatureC: Math.round(temperatureC),
        currentSector: sectorNames[idx % sectorNames.length],
        lat: drone.currentLocation.lat,
        lng: drone.currentLocation.lng,
        payloadKg: idx === 1 ? 8.5 : idx === 3 ? 2.4 : 0,
        maxPayloadKg: drone.maxPayloadKg,
      };
    });
  }, [drones, droneMissions, ticker]);

  const selectedDrone =
    telemetryData.find((d) => d.id === selectedDroneId) || telemetryData[0];

  // Battery bar chart data
  const batteryChartData = telemetryData.map((d) => ({
    name: d.code,
    battery: d.battery,
    fullName: d.name,
    status: d.status,
    remainingMin: d.estRemainingMinutes,
  }));

  // Flight duration chart data
  const flightDurationChartData = telemetryData.map((d) => ({
    name: d.code,
    durationMin: d.flightDurationMinutes,
    estRemainingMin: d.estRemainingMinutes,
    totalEnduranceMin: d.flightDurationMinutes + d.estRemainingMinutes,
    fullName: d.name,
  }));

  // Area coverage chart data
  const areaCoverageChartData = telemetryData.map((d) => ({
    name: d.code,
    coveragePercent: d.areaCoveragePercent,
    scannedKm2: d.areaCoveredKm2,
    targetKm2: d.targetAreaKm2,
    sector: d.currentSector,
  }));

  // Sector coverage pie data for active mission zones
  const sectorPieData = [
    { name: 'Yamuna Inundation Grid', value: 34, color: '#38bdf8' },
    { name: 'Kashmere Gate ISBT', value: 28, color: '#34d399' },
    { name: 'Majnu Ka Tilla Slopes', value: 23, color: '#fbbf24' },
    { name: 'Shastri Park Outer', value: 15, color: '#a78bfa' },
  ];

  // Timeline area trend mock data for the selected drone
  const batteryDrainTrendData = [
    { time: 'T-30m', battery: 100, altitude: 0, speed: 0 },
    { time: 'T-25m', battery: 94, altitude: 90, speed: 32 },
    { time: 'T-20m', battery: 86, altitude: 115, speed: 38 },
    { time: 'T-15m', battery: 78, altitude: 120, speed: 36 },
    { time: 'T-10m', battery: 71, altitude: 118, speed: 35 },
    { time: 'T-5m', battery: selectedDrone?.battery ? Math.min(100, selectedDrone.battery + 4) : 66, altitude: selectedDrone?.altitudeM || 110, speed: selectedDrone?.speedKmh || 36 },
    { time: 'Live', battery: selectedDrone?.battery || 62, altitude: selectedDrone?.altitudeM || 110, speed: selectedDrone?.speedKmh || 36 },
  ];

  // Battery status color helper
  const getBatteryColor = (percent: number) => {
    if (percent > 60) return '#10b981'; // Emerald
    if (percent > 30) return '#f59e0b'; // Amber
    return '#ef4444'; // Red
  };

  return (
    <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-5 font-sans">
      {/* Widget Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-950 text-cyan-400 border border-cyan-800 shadow-inner">
            <Radar className="w-5 h-5 animate-spin" style={{ animationDuration: '6s' }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-black text-stone-100 uppercase tracking-wide">
                LIVE DRONE FLEET TELEMETRY & FLIGHT METRICS
              </h2>
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-mono font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                LIVE MESH LINK
              </span>
            </div>
            <p className="text-xs text-stone-400">
              Real-time battery reserve, flight endurance timeline, and spatial GIS area coverage.
            </p>
          </div>
        </div>

        {/* Metric Mode Switcher Tabs */}
        <div className="flex items-center bg-stone-950 p-1 rounded-xl border border-stone-800 text-xs font-mono">
          <button
            onClick={() => setActiveMetricTab('battery')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer font-bold ${
              activeMetricTab === 'battery'
                ? 'bg-cyan-900 text-cyan-100 shadow-sm border border-cyan-700'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Battery</span>
          </button>
          <button
            onClick={() => setActiveMetricTab('flight')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer font-bold ${
              activeMetricTab === 'flight'
                ? 'bg-cyan-900 text-cyan-100 shadow-sm border border-cyan-700'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Flight Time</span>
          </button>
          <button
            onClick={() => setActiveMetricTab('coverage')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer font-bold ${
              activeMetricTab === 'coverage'
                ? 'bg-cyan-900 text-cyan-100 shadow-sm border border-cyan-700'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Area Coverage</span>
          </button>
        </div>
      </div>

      {/* Top 4 KPI Cards for Fleet Status */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 font-mono">
        <div className="bg-stone-950 border border-stone-800/90 rounded-xl p-3">
          <div className="flex items-center justify-between text-stone-400 text-xs mb-1">
            <span>ACTIVE UAVs</span>
            <Plane className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-black text-stone-100">
              {telemetryData.filter((d) => d.status !== 'offline' && d.status !== 'charging').length}
            </span>
            <span className="text-xs text-stone-500">/ {telemetryData.length} Airborne</span>
          </div>
          <div className="mt-1 text-[10px] text-cyan-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            1 Surveying • 1 Relieving
          </div>
        </div>

        <div className="bg-stone-950 border border-stone-800/90 rounded-xl p-3">
          <div className="flex items-center justify-between text-stone-400 text-xs mb-1">
            <span>AVG BATTERY</span>
            <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-black text-emerald-400">
              {telemetryData.length > 0
                ? Math.round(
                    telemetryData.reduce((acc, d) => acc + d.battery, 0) / telemetryData.length
                  )
                : 0}
              %
            </span>
            <span className="text-xs text-stone-500">Fleet Nominal</span>
          </div>
          <div className="mt-1 text-[10px] text-stone-400">
            Min: {telemetryData.length > 0 ? Math.min(...telemetryData.map((d) => d.battery)) : 0}% • Max: {telemetryData.length > 0 ? Math.max(...telemetryData.map((d) => d.battery)) : 0}%
          </div>
        </div>

        <div className="bg-stone-950 border border-stone-800/90 rounded-xl p-3">
          <div className="flex items-center justify-between text-stone-400 text-xs mb-1">
            <span>TOTAL AIR TIME</span>
            <Clock className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-black text-amber-400">
              {telemetryData.reduce((acc, d) => acc + d.flightDurationMinutes, 0)}
            </span>
            <span className="text-xs text-stone-500">Mins Logged</span>
          </div>
          <div className="mt-1 text-[10px] text-stone-400">
            Avg mission endurance: 32 min
          </div>
        </div>

        <div className="bg-stone-950 border border-stone-800/90 rounded-xl p-3">
          <div className="flex items-center justify-between text-stone-400 text-xs mb-1">
            <span>AREA SCANNED</span>
            <Compass className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-black text-sky-400">
              {telemetryData.reduce((acc, d) => acc + d.areaCoveredKm2, 0).toFixed(1)}
            </span>
            <span className="text-xs text-stone-500">km² Total</span>
          </div>
          <div className="mt-1 text-[10px] text-stone-400">
            Across 4 disaster sectors
          </div>
        </div>
      </div>

      {/* Main Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left 8 Cols: Dynamic Recharts Visualizer */}
        <div className="lg:col-span-8 bg-stone-950 border border-stone-800 rounded-xl p-4 space-y-3">
          {/* Chart Header */}
          <div className="flex items-center justify-between border-b border-stone-800 pb-2">
            <div>
              <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">
                {activeMetricTab === 'battery' && '📊 BATTERY LEVELS & REMAINING RESERVE (RECHARTS)'}
                {activeMetricTab === 'flight' && '⏱ FLIGHT DURATION VS ENDURANCE LIMIT (RECHARTS)'}
                {activeMetricTab === 'coverage' && '🗺 GIS SECTOR COVERAGE PERCENTAGE (RECHARTS)'}
              </span>
              <p className="text-[11px] text-stone-400">
                {activeMetricTab === 'battery' && 'Live power reserve by airframe with automatic return-to-base threshold'}
                {activeMetricTab === 'flight' && 'Airborne mission minutes logged vs estimated remaining mission battery'}
                {activeMetricTab === 'coverage' && 'Scanned terrain orthomosaic area vs target disaster quadrant'}
              </p>
            </div>
            <span className="text-[10px] font-mono text-stone-500 hidden sm:inline">
              Update #{ticker} • Synced
            </span>
          </div>

          {/* TAB 1: BATTERY LEVELS CHART */}
          {activeMetricTab === 'battery' && (
            <div className="space-y-2">
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={batteryChartData} margin={{ top: 15, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#292524" vertical={false} />
                    <XAxis dataKey="name" stroke="#78716c" tick={{ fill: '#a8a29e', fontSize: 12, fontFamily: 'monospace' }} />
                    <YAxis domain={[0, 100]} stroke="#78716c" tick={{ fill: '#a8a29e', fontSize: 11, fontFamily: 'monospace' }} unit="%" />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-stone-900 border border-stone-700 p-2.5 rounded-xl shadow-2xl text-xs font-mono text-stone-200">
                              <p className="font-bold text-cyan-300">{data.fullName}</p>
                              <p className="text-stone-400 text-[11px]">Status: {data.status}</p>
                              <div className="mt-1 pt-1 border-t border-stone-800 flex items-center justify-between gap-3">
                                <span>Battery:</span>
                                <span className="font-bold" style={{ color: getBatteryColor(data.battery) }}>
                                  {data.battery}%
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-3 text-stone-400 text-[10px]">
                                <span>Est. Flight:</span>
                                <span>~{data.remainingMin} mins</span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="battery" radius={[6, 6, 0, 0]} name="Battery Level (%)">
                      {batteryChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getBatteryColor(entry.battery)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Battery Indicator Legend */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-800 text-[11px] font-mono">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-emerald-400">
                    <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> &gt;60% Nominal
                  </span>
                  <span className="flex items-center gap-1 text-amber-400">
                    <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" /> 30-60% Warning
                  </span>
                  <span className="flex items-center gap-1 text-red-400">
                    <span className="w-2.5 h-2.5 rounded-sm bg-red-500" /> &lt;30% Return Base
                  </span>
                </div>
                <span className="text-stone-500 text-[10px]">
                  Failsafe RTB Trigger: 20%
                </span>
              </div>
            </div>
          )}

          {/* TAB 2: FLIGHT DURATION CHART */}
          {activeMetricTab === 'flight' && (
            <div className="space-y-2">
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={flightDurationChartData} margin={{ top: 15, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#292524" vertical={false} />
                    <XAxis dataKey="name" stroke="#78716c" tick={{ fill: '#a8a29e', fontSize: 12, fontFamily: 'monospace' }} />
                    <YAxis stroke="#78716c" tick={{ fill: '#a8a29e', fontSize: 11, fontFamily: 'monospace' }} unit="m" />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-stone-900 border border-stone-700 p-2.5 rounded-xl shadow-2xl text-xs font-mono text-stone-200">
                              <p className="font-bold text-amber-300">{data.fullName}</p>
                              <div className="mt-1 pt-1 border-t border-stone-800 space-y-1">
                                <div className="flex justify-between gap-3 text-cyan-400">
                                  <span>Elapsed Flight:</span>
                                  <span className="font-bold">{data.durationMin} mins</span>
                                </div>
                                <div className="flex justify-between gap-3 text-stone-400">
                                  <span>Est. Remaining:</span>
                                  <span>{data.estRemainingMin} mins</span>
                                </div>
                                <div className="flex justify-between gap-3 text-amber-300 font-bold">
                                  <span>Total Endurance:</span>
                                  <span>{data.totalEnduranceMin} mins</span>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend
                      wrapperStyle={{ paddingTop: '8px', fontSize: '11px', fontFamily: 'monospace' }}
                    />
                    <Bar dataKey="durationMin" name="Elapsed Flight Time (min)" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="estRemainingMin" name="Est. Remaining Time (min)" fill="#34d399" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono text-stone-400 pt-2 border-t border-stone-800">
                <span>Standard Max Mission Window: 60 Minutes</span>
                <span className="text-cyan-400">Average Battery Discharge: 1.4% / min</span>
              </div>
            </div>
          )}

          {/* TAB 3: AREA COVERAGE PERCENTAGES */}
          {activeMetricTab === 'coverage' && (
            <div className="space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 h-64">
                {/* Bar Chart of Percentages */}
                <div className="h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={areaCoverageChartData} layout="vertical" margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#292524" horizontal={false} />
                      <XAxis type="number" domain={[0, 100]} stroke="#78716c" tick={{ fill: '#a8a29e', fontSize: 10, fontFamily: 'monospace' }} unit="%" />
                      <YAxis type="category" dataKey="name" stroke="#78716c" tick={{ fill: '#a8a29e', fontSize: 11, fontFamily: 'monospace' }} />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-stone-900 border border-stone-700 p-2.5 rounded-xl shadow-2xl text-xs font-mono text-stone-200">
                                <p className="font-bold text-sky-400">{data.name} - {data.sector}</p>
                                <div className="mt-1 pt-1 border-t border-stone-800 space-y-0.5">
                                  <div className="flex justify-between gap-3 text-emerald-400 font-bold">
                                    <span>Coverage:</span>
                                    <span>{data.coveragePercent}%</span>
                                  </div>
                                  <div className="flex justify-between gap-3 text-stone-400">
                                    <span>Scanned Area:</span>
                                    <span>{data.scannedKm2} / {data.targetKm2} km²</span>
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="coveragePercent" name="Area Coverage %" fill="#0284c7" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Donut Chart of Sector Breakdown */}
                <div className="h-full flex flex-col items-center justify-center">
                  <ResponsiveContainer width="100%" height="80%">
                    <PieChart>
                      <Pie
                        data={sectorPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={75}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {sectorPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const item = payload[0];
                            return (
                              <div className="bg-stone-900 border border-stone-700 p-2 rounded-lg text-xs font-mono text-stone-200">
                                <span className="font-bold text-cyan-300">{item.name}</span>
                                <span className="block text-stone-300">{item.value}% of fleet effort</span>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="text-[10px] font-mono text-stone-400 text-center">
                    Disaster Zone Scan Priority Breakdown
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono text-stone-400 pt-2 border-t border-stone-800">
                <span>LiDAR Grid Density: 120 pts/m²</span>
                <span className="text-emerald-400">Cumulative: {telemetryData.reduce((acc, d) => acc + d.areaCoveredKm2, 0).toFixed(1)} km² Completed</span>
              </div>
            </div>
          )}
        </div>

        {/* Right 4 Cols: Selected Drone Telemetry Deep Dive */}
        <div className="lg:col-span-4 bg-stone-950 border border-stone-800 rounded-xl p-4 space-y-3 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-stone-800 pb-2">
              <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Plane className="w-3.5 h-3.5" /> UNIT TELEMETRY
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-stone-800 text-stone-300 uppercase">
                {selectedDrone.status}
              </span>
            </div>

            {/* Quick UAV Selector Pills */}
            <div className="grid grid-cols-4 gap-1.5 font-mono text-xs">
              {telemetryData.map((d) => (
                <button
                  key={d.id}
                  onClick={() => {
                    setSelectedDroneId(d.id);
                    onSelectDrone?.(d.id);
                  }}
                  className={`py-1.5 px-2 rounded-lg font-bold text-center transition-all cursor-pointer ${
                    d.id === selectedDroneId
                      ? 'bg-cyan-900 border border-cyan-500 text-cyan-100 shadow'
                      : 'bg-stone-900 hover:bg-stone-800 text-stone-400 border border-stone-800'
                  }`}
                >
                  {d.code}
                </button>
              ))}
            </div>

            {/* Drone Identity Header */}
            <div>
              <h4 className="text-sm font-bold text-stone-100">{selectedDrone.name}</h4>
              <p className="text-[11px] font-mono text-stone-400">{selectedDrone.model}</p>
            </div>

            {/* Telemetry Sensor Gauges */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="bg-stone-900/80 p-2 rounded-lg border border-stone-800">
                <span className="text-stone-500 block text-[9px] uppercase">BATTERY</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-base font-bold" style={{ color: getBatteryColor(selectedDrone.battery) }}>
                    {selectedDrone.battery}%
                  </span>
                  <span className="text-[10px] text-stone-400">~{selectedDrone.estRemainingMinutes}m left</span>
                </div>
              </div>

              <div className="bg-stone-900/80 p-2 rounded-lg border border-stone-800">
                <span className="text-stone-500 block text-[9px] uppercase">ALTITUDE (AGL)</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-base font-bold text-stone-100">{selectedDrone.altitudeM}</span>
                  <span className="text-[10px] text-stone-400">meters</span>
                </div>
              </div>

              <div className="bg-stone-900/80 p-2 rounded-lg border border-stone-800">
                <span className="text-stone-500 block text-[9px] uppercase">GROUND SPEED</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-base font-bold text-stone-100">{selectedDrone.speedKmh}</span>
                  <span className="text-[10px] text-stone-400">km/h</span>
                </div>
              </div>

              <div className="bg-stone-900/80 p-2 rounded-lg border border-stone-800">
                <span className="text-stone-500 block text-[9px] uppercase">MESH SIGNAL</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-base font-bold text-emerald-400">{selectedDrone.signalStrengthPercent}%</span>
                  <span className="text-[10px] text-stone-400">-62 dBm</span>
                </div>
              </div>
            </div>

            {/* Mini Battery Trend AreaChart for this unit */}
            <div className="bg-stone-900/60 p-2.5 rounded-lg border border-stone-800 space-y-1">
              <span className="text-[10px] font-mono text-stone-400 block">
                Unit Battery Discharge Profile
              </span>
              <div className="h-16 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={batteryDrainTrendData} margin={{ top: 2, right: 5, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="batteryGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <YAxis domain={[0, 100]} hide />
                    <XAxis dataKey="time" hide />
                    <Area type="monotone" dataKey="battery" stroke="#22d3ee" strokeWidth={2} fillOpacity={1} fill="url(#batteryGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* GPS & Sector Location */}
            <div className="text-[11px] font-mono text-stone-400 bg-stone-900/50 p-2 rounded-lg border border-stone-800 space-y-0.5">
              <div className="flex items-center justify-between text-stone-300">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-cyan-400" /> Sector:
                </span>
                <span className="text-cyan-300 font-bold truncate max-w-[150px]">{selectedDrone.currentSector}</span>
              </div>
              <div className="text-[10px] text-stone-500">
                Lat: {selectedDrone.lat.toFixed(4)}° N, Lng: {selectedDrone.lng.toFixed(4)}° E
              </div>
            </div>
          </div>

          {/* Action Button for Commander */}
          <div className="pt-2 border-t border-stone-800 flex gap-2">
            <button
              onClick={() => onSelectDrone?.(selectedDrone.id)}
              className="w-full py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 hover:text-white rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow"
            >
              <Radar className="w-3.5 h-3.5 text-cyan-400" />
              Focus on Tactical Map
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

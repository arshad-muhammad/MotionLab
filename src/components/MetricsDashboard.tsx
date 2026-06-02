/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HandGesture, TrackingMetrics, MovementLog } from '../types';
import { 
  Activity, 
  Hand, 
  Gauge, 
  Terminal, 
  Eye, 
  CircleDot, 
  HelpCircle,
  Hash,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MetricsDashboardProps {
  metrics: TrackingMetrics | null;
  logs: MovementLog[];
  sessionDuration: number;
}

export default function MetricsDashboard({ metrics, logs, sessionDuration }: MetricsDashboardProps) {
  // Format seconds to standard mm:ss tracker style
  const formatTime = (secs: number) => {
    const minutes = Math.floor(secs / 60);
    const seconds = secs % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Maps gestures to readable titles and Tailwind status colors - aligned with Artistic Kinetic lime and off-white limits
  const getGestureTailwindBadge = (gesture: HandGesture) => {
    switch (gesture) {
      case 'None':
        return 'bg-[#0A0A0A] text-zinc-500 border border-[#333]';
      default:
        return 'bg-[#D1FF26]/10 text-[#D1FF26] border border-[#D1FF26] shadow-[0_0_10px_rgba(209,255,38,0.15)]';
    }
  };

  // Speeds can go from 0 to 5 relative units. Let's compute percentage for progress bars
  const speedPercentage = Math.min(100, (metrics?.speed || 0) * 80);

  return (
    <div id="metrics-dashboard" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      
      {/* 1. PRIMARY METRICS PANEL */}
      <div id="primary-metrics-card" className="bg-[#080808] border border-[#333] p-6 flex flex-col justify-between relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-[#D1FF26]" />
        
        <div className="flex items-center justify-between mb-4 border-b border-[#333] pb-3">
          <div className="flex items-center gap-2">
            <Gauge className="w-4 h-4 text-[#D1FF26]" />
            <h3 className="font-sans font-black uppercase tracking-wider text-xs text-[#F0F0F0]">Active Feed Metrics</h3>
          </div>
          <span className="font-mono text-[9px] text-[#D1FF26] bg-[#D1FF26]/10 px-2 py-0.5 border border-[#D1FF26]/20">
            KINETIC_FEED
          </span>
        </div>

        {/* Big numbers row */}
        <div className="grid grid-cols-2 gap-4 my-2">
          <div className="bg-[#050505] border border-[#333] p-4 flex flex-col">
            <span className="font-mono text-[9px] text-zinc-500 tracking-wider uppercase">// Active Hands</span>
            <span className="font-sans text-3xl font-black italic tracking-tighter text-[#D1FF26] mt-1 flex items-baseline gap-1">
              {metrics ? metrics.activeHandCount : 0}
              <span className="text-[10px] uppercase font-mono tracking-widest text-[#F0F0F0]/60">units</span>
            </span>
          </div>

          <div className="bg-[#050505] border border-[#333] p-4 flex flex-col">
            <span className="font-mono text-[9px] text-zinc-500 tracking-wider uppercase">// Runtime Elapsed</span>
            <span className="font-mono text-3xl font-black italic tracking-tighter text-[#F0F0F0] mt-1">
              {formatTime(sessionDuration)}
            </span>
          </div>
        </div>

        {/* Dynamic Speed Gauge */}
        <div className="space-y-1.5 mt-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-zinc-500 tracking-wider">MOVEMENT VELOCITY</span>
            <span className="font-medium text-[#D1FF26] tracking-tight">
              {metrics ? metrics.speed.toFixed(3) : '0.000'} rel/s
            </span>
          </div>
          <div className="w-full h-1.5 bg-[#050505] border border-[#333] overflow-hidden">
            <motion.div 
              className="h-full bg-[#D1FF26] shadow-[0_0_8px_#D1FF26]"
              initial={{ width: 0 }}
              animate={{ width: `${speedPercentage}%` }}
              transition={{ type: 'spring', stiffness: 80, damping: 12 }}
            />
          </div>
        </div>

        {/* Palm Openness metrics */}
        <div className="space-y-1.5 mt-4">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-zinc-500 tracking-wider">PALM OPEN PERCENT</span>
            <span className="font-medium text-[#F0F0F0] tracking-tight">
              {metrics ? Math.round(metrics.handOpenScore * 100) : 0}%
            </span>
          </div>
          <div className="w-full h-1.5 bg-[#050505] border border-[#333] overflow-hidden">
            <motion.div 
              className="h-full bg-[#F0F0F0]"
              initial={{ width: 0 }}
              animate={{ width: `${metrics ? metrics.handOpenScore * 100 : 0}%` }}
              transition={{ type: 'spring', stiffness: 85, damping: 10 }}
            />
          </div>
        </div>
      </div>

      {/* 2. REAL-TIME POSTURE DECODER */}
      <div id="gesture-decoder-card" className="bg-[#080808] border border-[#333] p-6 flex flex-col justify-between relative overflow-hidden">
        <div className="flex items-center justify-between mb-4 border-b border-[#333] pb-3">
          <div className="flex items-center gap-2">
            <Hand className="w-4 h-4 text-[#D1FF26]" />
            <h3 className="font-sans font-black uppercase tracking-wider text-xs text-[#F0F0F0]">Posture Decoder</h3>
          </div>
          <span className="font-mono text-[9px] text-[#F0F0F0]/60 bg-zinc-900 border border-[#333] px-2 py-0.5">
            CLASS_MODEL
          </span>
        </div>

        {/* Active Gesture Large Display */}
        <div className="bg-[#050505] border border-[#333] p-4 flex flex-col items-center justify-center min-h-[105px] text-center">
          <span className="font-mono text-[9px] text-zinc-500 tracking-widest uppercase mb-2">// Classified Gesture Struct</span>
          <AnimatePresence mode="wait">
            <motion.div 
              key={metrics?.gesture || 'None'}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`px-4 py-2 text-md font-black italic tracking-wider ${getGestureTailwindBadge(metrics?.gesture || 'None')}`}
            >
              {metrics?.gesture || 'AWAITING HAND'}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Individual Finger Tracking Flags */}
        <div className="mt-4">
          <span className="font-mono text-[9px] text-zinc-500 tracking-wider uppercase block mb-2">// Finger Node States</span>
          <div className="grid grid-cols-5 gap-1.5 text-center text-[9px] font-mono">
            {['thumb', 'index', 'middle', 'ring', 'pinky'].map((finger) => {
              const isActive = metrics?.fingerStates?.[finger as keyof typeof metrics.fingerStates] ?? false;
              return (
                <div 
                  key={finger} 
                  className={`py-2 transition-all border ${
                    isActive 
                      ? 'bg-[#D1FF26]/10 border-[#D1FF26] text-[#D1FF26] font-bold shadow-[0_0_8px_rgba(209,255,38,0.1)]' 
                      : 'bg-[#050505] border-[#333] text-zinc-500'
                  }`}
                >
                  <div className={`w-1 h-1 rounded-full mx-auto mb-1 ${
                    isActive ? 'bg-[#D1FF26] shadow-[0_0_8px_#D1FF26]' : 'bg-zinc-800'
                  }`} />
                  {finger.slice(0, 3).toUpperCase()}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. DIAGNOSTIC LOGGING CORE */}
      <div id="diagnostic-logs-card" className="bg-[#080808] border border-[#333] p-6 flex flex-col md:col-span-2 lg:col-span-1">
        <div className="flex items-center justify-between mb-3 border-b border-[#333] pb-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-[#D1FF26]" />
            <h3 className="font-sans font-black uppercase tracking-wider text-xs text-[#F0F0F0]">Telemetry Logs</h3>
          </div>
          <span className="font-mono text-[9px] text-zinc-500 bg-zinc-900 border border-[#333] px-2 py-0.5">
            SECURE_TTY
          </span>
        </div>

        {/* Real-time TTY Scrolling logs */}
        <div className="bg-[#050505] border border-[#333] p-3 font-mono text-[10px] h-[166px] overflow-y-auto flex flex-col gap-1.5 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-zinc-950">
          {logs.length === 0 ? (
            <div className="h-full flex items-center justify-center text-zinc-600 italic">
              // Awaiting hand interaction feed...
            </div>
          ) : (
            logs.slice(0, 20).map((log) => {
              let tagColor = 'text-[#F0F0F0]';
              if (log.type === 'success') tagColor = 'text-[#D1FF26] font-bold';
              if (log.type === 'warning') tagColor = 'text-yellow-400';
              if (log.type === 'gesture') tagColor = 'text-[#D1FF26] italic';

              const logTime = new Date(log.timestamp).toLocaleTimeString([], { hour12: false, fractionSecDigits: 1 } as any);

              return (
                <div key={log.id} className="leading-normal transition-all duration-150 flex items-start gap-1">
                  <span className="text-zinc-600 shrink-0">[{logTime}]</span>
                  <span className={`${tagColor} shrink-0`}>[{log.event}]</span>
                  <span className="text-zinc-400">{log.details}</span>
                </div>
              );
            })
          )}
        </div>
      </div>

    </div>
  );
}

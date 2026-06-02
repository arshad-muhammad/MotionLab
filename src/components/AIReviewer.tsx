/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Sparkles, Loader2, FileText, CheckCircle, Flame, ShieldAlert } from 'lucide-react';
import { HandGesture, AIReviewReport, MovementLog } from '../types';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';

interface AIReviewerProps {
  logs: MovementLog[];
  gestureCounts: Record<HandGesture, number>;
  averageOpenScore: number;
  maxSpeed: number;
  sessionDuration: number;
  resetSessionStats: () => void;
}

export default function AIReviewer({
  logs,
  gestureCounts,
  averageOpenScore,
  maxSpeed,
  sessionDuration,
  resetSessionStats,
}: AIReviewerProps) {
  const [loading, setLoading] = useState<boolean>(false);
  const [report, setReport] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Generate prompt payloads and query local backend endpoint
  const requestAIReport = async () => {
    setLoading(true);
    setReport(null);
    setErrorMsg(null);

    const steps = [
      'Compiling spatial trajectory coordinates...',
      'Mapping joint strain distribution models...',
      'Analyzing gesture posture frequency metrics...',
      'Formulating clinical physical therapy regimens...',
      'Synthesizing biometric ergonomic hygiene report...'
    ];

    // Simple visual trick: cycle through simulated loader messages as the backend processes
    let stepIndex = 0;
    setLoadingStep(steps[0]);
    const interval = setInterval(() => {
      stepIndex = (stepIndex + 1) % steps.length;
      setLoadingStep(steps[stepIndex]);
    }, 1800);

    try {
      // Filter logs to only send human-friendly summary statements to reduce payload
      const eventCompact = logs
        .filter((l) => l.type === 'gesture' || l.type === 'warning')
        .slice(0, 20)
        .map((l) => ({
          time: new Date(l.timestamp).toLocaleTimeString([], { hour12: false }),
          event: l.event,
          info: l.details
        }));

      const payload = {
        trackingDuration: sessionDuration,
        gesturesDetected: gestureCounts,
        averageOpenScore: parseFloat(averageOpenScore.toFixed(3)),
        maxSpeed: parseFloat(maxSpeed.toFixed(3)),
        eventHistory: eventCompact
      };

      const response = await fetch('/api/biomechanical-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      clearInterval(interval);

      if (data.success && data.report) {
        setReport(data.report);
      } else {
        setErrorMsg(data.error || 'Failed to generate physical therapist analysis. Please verify your GEMINI_API_KEY.');
      }
    } catch (error: any) {
      clearInterval(interval);
      console.error('API trigger failed:', error);
      setErrorMsg('Network request error. Make sure your server is online and running.');
    } finally {
      setLoading(false);
    }
  };

  // Check if there is any movement logged to enable study
  const hasHistory = sessionDuration > 0 || Object.values(gestureCounts).some((c) => c > 0);

  return (
    <div id="ai-reviewer-card" className="bg-[#080808] border border-[#333] p-6 shadow-2xl select-none space-y-4 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-[200%] h-[200%] bg-gradient-to-bl from-[#D1FF26]/10 to-transparent rotate-45 transform origin-top-right" />
      </div>

      <div className="flex items-center justify-between border-b border-[#333] pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#D1FF26]" />
          <h3 className="font-sans font-black uppercase tracking-wider text-xs text-[#F0F0F0]">Biomechanical Coach</h3>
        </div>
        <span className="font-mono text-[9px] text-[#D1FF26] bg-[#D1FF26]/10 border border-[#D1FF26]/20 px-2 py-0.5">
          GEMINI_VISION
        </span>
      </div>

      {/* GESTURE FREQUENCY ACCUMULATOR BAR CHART */}
      <div className="space-y-2">
        <span className="text-[9px] font-mono text-zinc-500 tracking-wider uppercase block">// Recorded Postures</span>
        
        {!hasHistory ? (
          <div className="py-4 text-center text-xs text-zinc-600 bg-[#050505] border border-[#333] border-dashed italic">
            Calibrating... start moving hands in view.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(gestureCounts)
              .filter(([gesture]) => gesture !== 'None')
              .map(([gesture, count]) => (
                <div key={gesture} className="bg-[#050505] border border-[#333] p-2 flex items-center justify-between">
                  <span className="text-[10px] text-zinc-400 font-mono truncate max-w-[90px]" title={gesture}>
                    {gesture.toUpperCase()}
                  </span>
                  <span className="text-[10px] font-bold text-[#D1FF26] bg-[#D1FF26]/10 border border-[#D1FF26]/25 px-1.5 py-0.5 font-mono">
                    {count}
                  </span>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* ACTION CARD */}
      <div className="pt-2">
        {!report && !loading ? (
          <div className="bg-[#050505] border border-[#333] p-4 flex flex-col items-center text-center space-y-3">
            <div className="bg-[#D1FF26]/5 p-2 rounded-none border border-[#D1FF26]/10">
              <FileText className="w-4 h-4 text-[#D1FF26]" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">Ergonomic Diagnosis report</h4>
              <p className="text-[10.5px] text-zinc-500 leading-normal max-w-sm">
                Resolves spatial joint velocity models, palm curvature patterns, and gesture durations to produce dynamic recovery recommendations.
              </p>
            </div>
            <button
              onClick={requestAIReport}
              disabled={!hasHistory}
              className={`w-full py-2.5 text-xs font-bold uppercase tracking-widest cursor-pointer transition-all border ${
                hasHistory
                  ? 'bg-[#D1FF26] hover:bg-[#D1FF26]/95 border-transparent text-[#0A0A0A] shadow-[0_0_15px_rgba(209,255,38,0.25)]'
                  : 'bg-[#050505] border-[#333] text-zinc-650 cursor-not-allowed'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 inline mr-1" />
              Analyze Kinematics
            </button>
          </div>
        ) : null}

        {/* LOADING SCREEN */}
        {loading ? (
          <div className="bg-[#050505] border border-[#333] p-8 flex flex-col items-center justify-center space-y-4 text-center min-h-[220px]">
            <Loader2 className="w-6 h-6 text-[#D1FF26] animate-spin" />
            <div className="space-y-1.5 max-w-xs">
              <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-300">// Consulting AI Analyst</p>
              <p className="text-[9px] text-[#D1FF26] font-mono tracking-wide uppercase animate-pulse">
                {loadingStep.toUpperCase()}
              </p>
            </div>
          </div>
        ) : null}

        {/* ERROR SCREEN */}
        {errorMsg ? (
          <div className="bg-red-950/10 border border-red-500/20 p-4 space-y-3">
            <div className="flex gap-2 text-red-305 text-xs items-start">
              <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold uppercase tracking-wide text-red-200">Analysis Failed</p>
                <p className="mt-1 text-red-450/80 leading-relaxed text-[11px]">{errorMsg}</p>
              </div>
            </div>
            <button
              onClick={requestAIReport}
              className="w-full py-1.5 bg-red-500/10 border border-red-500/20 text-xs font-semibold text-red-300 hover:bg-red-500/25 transition-all text-center cursor-pointer uppercase tracking-wider"
            >
              Retry Pipeline
            </button>
          </div>
        ) : null}

        {/* COMPLETED REPORT RENDERER */}
        <AnimatePresence>
          {report ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="bg-[#050505] border border-[#333] p-5 space-y-4 leading-relaxed text-[#F0F0F0] max-h-[460px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-zinc-950"
            >
              <div className="flex items-center justify-between border-b border-[#333] pb-2 mb-2">
                <div className="flex items-center gap-1.5 text-[10px] text-[#D1FF26] font-bold font-mono tracking-wider uppercase">
                  <CheckCircle className="w-3.5 h-3.5 text-[#D1FF26]" />
                  ANALYSIS COMPLETED
                </div>
                <button
                  onClick={() => setReport(null)}
                  className="text-[9px] font-mono text-zinc-500 hover:text-zinc-300 border border-[#333] px-2 py-0.5 cursor-pointer transition-all uppercase"
                >
                  Clear
                </button>
              </div>

              {/* Renders markdown cleanly */}
              <div id="rehab-markdown-body" className="markdown-body prose prose-invert prose-xs text-[11px] text-zinc-300 space-y-3 leading-relaxed font-sans">
                <ReactMarkdown>{report}</ReactMarkdown>
              </div>

              <div className="pt-3 border-t border-[#333] flex gap-2">
                <button
                  onClick={resetSessionStats}
                  className="grow py-1.5 bg-[#080808] hover:bg-zinc-900 text-[10px] uppercase font-bold tracking-wider text-zinc-400 border border-[#333] transition-all text-center cursor-pointer"
                >
                  Reset Tracker
                </button>
                <button
                  onClick={requestAIReport}
                  className="grow py-1.5 bg-[#D1FF26]/10 hover:bg-[#D1FF26]/20 text-[10px] uppercase font-bold tracking-wider text-[#D1FF26] border border-[#D1FF26]/30 transition-all text-center cursor-pointer"
                >
                  Recalculate
                </button>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

    </div>
  );
}

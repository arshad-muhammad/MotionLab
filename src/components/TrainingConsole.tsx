/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { SavedGesture } from '../types';
import { PlusCircle, Info, Hand, ShieldAlert, Sparkles, Check, CornerDownRight } from 'lucide-react';

interface TrainingConsoleProps {
  leftHandVisible: boolean;
  rightHandVisible: boolean;
  onSaveGesture: (label: string, hand: 'left' | 'right' | 'both') => void;
  selectedPresetGesture: SavedGesture | null;
  onClearPresetSelection: () => void;
}

export default function TrainingConsole({
  leftHandVisible,
  rightHandVisible,
  onSaveGesture,
  selectedPresetGesture,
  onClearPresetSelection,
}: TrainingConsoleProps) {
  const [label, setLabel] = useState('');
  const [handConfig, setHandConfig] = useState<'left' | 'right' | 'both'>('right');

  // Sync state if a predefined gesture is requested to be trained
  useEffect(() => {
    if (selectedPresetGesture) {
      setLabel(selectedPresetGesture.label);
      setHandConfig(selectedPresetGesture.hand);
    }
  }, [selectedPresetGesture]);

  const handleCreateAndTrain = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;
    onSaveGesture(label.trim().toUpperCase(), handConfig);
    
    // Clear selection or input if custom
    if (!selectedPresetGesture) {
      setLabel('');
    }
  };

  // Check if hand requirements are satisfied as per configuration
  const areHandsReady = () => {
    if (handConfig === 'left') return leftHandVisible;
    if (handConfig === 'right') return rightHandVisible;
    return leftHandVisible && rightHandVisible;
  };

  return (
    <div id="gesture-training-console-panel" className="bg-[#080808] border border-[#333] p-6 h-full flex flex-col justify-between space-y-5 relative">
      <div className="absolute top-0 left-0 w-1 h-full bg-[#D1FF26]" />
      
      {/* 1. SECTION TITLE */}
      <div>
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#D1FF26]" />
          <h3 className="font-sans font-black uppercase tracking-wider text-xs text-[#F0F0F0]">Gesture Trainer</h3>
        </div>
        <p className="text-[10px] text-zinc-500 font-mono mt-1">// INTUITIVE PATTERN RECOGNITION STUDIO</p>
      </div>

      {/* Selected slot information if active */}
      {selectedPresetGesture && (
        <div className="bg-[#D1FF26]/5 border border-[#D1FF26]/20 p-3 flex items-center justify-between">
          <div className="flex items-start gap-2">
            <CornerDownRight className="w-4 h-4 text-[#D1FF26] shrink-0 mt-0.5" />
            <div>
              <p className="font-mono text-[9px] text-[#D1FF26] tracking-widest uppercase">// TARGET SLOT SELECTED</p>
              <p className="font-sans font-black text-xs text-[#F0F0F0]">{selectedPresetGesture.label}</p>
            </div>
          </div>
          <button
            onClick={onClearPresetSelection}
            className="text-[8px] font-mono border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 px-2 py-0.5 transition-all uppercase cursor-pointer"
          >
            Switch to Custom
          </button>
        </div>
      )}

      {/* 2. FORM CONFIGURATION */}
      <form onSubmit={handleCreateAndTrain} className="space-y-4">
        {/* Label input */}
        <div className="space-y-1.5">
          <label className="text-[9px] font-mono text-zinc-500 tracking-wider uppercase block">
            // Sign Word or Phrase
          </label>
          <input
            type="text"
            required
            placeholder="Type word, letter or phrase..."
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            disabled={!!selectedPresetGesture} // locked when training preset slots
            className="w-full bg-[#050505] border border-[#333] focus:border-[#D1FF26] text-[10px] font-mono p-3 outline-none text-[#F0F0F0] uppercase placeholder-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {/* Hand Selectors */}
        <div className="space-y-1.5">
          <label className="text-[9px] font-mono text-zinc-500 tracking-wider uppercase block">
            // Hand Topology Required
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['left', 'right', 'both'] as const).map((hand) => (
              <button
                key={hand}
                type="button"
                disabled={!!selectedPresetGesture} // locked when training preset slots
                onClick={() => setHandConfig(hand)}
                className={`py-2 text-[9px] font-mono border uppercase transition-all cursor-pointer ${
                  handConfig === hand
                    ? 'bg-[#D1FF26]/10 border-[#D1FF26] text-[#D1FF26] font-bold'
                    : 'bg-[#050505] border-[#333] text-zinc-500 hover:text-zinc-400 disabled:opacity-60'
                }`}
              >
                {hand === 'both' ? 'Both (42 pts)' : `${hand} (21 pts)`}
              </button>
            ))}
          </div>
        </div>

        {/* 3. DYNAMIC WEBCAM PLACEMENT FEEDBACK */}
        <div className="bg-[#050505] border border-[#333] p-3.5 space-y-2.5">
          <label className="text-[9px] font-mono text-zinc-500 tracking-wider uppercase block">
            // Device Capture Hand Interlock
          </label>
          
          <div className="grid grid-cols-2 gap-3 text-[9px] font-mono">
            {/* Left Hand Indicator */}
            <div className={`p-2 border flex items-center gap-1.5 ${
              leftHandVisible 
                ? 'bg-[#22D3EE]/5 border-[#22D3EE]/30 text-[#22D3EE]' 
                : 'bg-zinc-950 border-[#222] text-zinc-650'
            }`}>
              <Hand className="w-3.5 h-3.5" />
              <div className="truncate">
                <p className="font-extrabold uppercase shrink">LEFT SENSOR</p>
                <p className="text-[8px] opacity-75">{leftHandVisible ? 'LOCKED' : 'OFFLINE'}</p>
              </div>
            </div>

            {/* Right Hand Indicator */}
            <div className={`p-2 border flex items-center gap-1.5 ${
              rightHandVisible 
                ? 'bg-[#D1FF26]/5 border-[#D1FF26]/30 text-[#D1FF26]' 
                : 'bg-zinc-950 border-[#222] text-zinc-650'
            }`}>
              <Hand className="w-3.5 h-3.5" />
              <div className="truncate">
                <p className="font-extrabold uppercase shrink">RIGHT SENSOR</p>
                <p className="text-[8px] opacity-75">{rightHandVisible ? 'LOCKED' : 'OFFLINE'}</p>
              </div>
            </div>
          </div>

          {/* Validation Warnings */}
          {!areHandsReady() ? (
            <div className="flex gap-1.5 text-zinc-500 text-[9px] font-mono pt-1 leading-snug">
              <ShieldAlert className="w-3.5 h-3.5 text-yellow-600 shrink-0" />
              <span>
                Please position your <strong className="text-zinc-400 uppercase">{handConfig}</strong> hand{handConfig === 'both' ? 's' : ''} in the camera view frame.
              </span>
            </div>
          ) : (
            <div className="flex gap-1.5 text-emerald-400 text-[9px] font-mono pt-1 leading-snug">
              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Coordinates alignment verified. Ready to capture pose.</span>
            </div>
          )}
        </div>

        {/* 4. SUBMIT ACTION BUTTON */}
        <button
          type="submit"
          disabled={!areHandsReady() || !label.trim()}
          className={`w-full py-3 text-xs font-bold uppercase tracking-widest transition-all duration-150 border cursor-pointer ${
            areHandsReady() && label.trim()
              ? 'bg-[#D1FF26] text-[#0A0A0A] border-transparent shadow-[0_0_15px_rgba(209,255,38,0.25)] hover:shadow-[0_0_20px_rgba(209,255,38,0.4)]'
              : 'bg-[#050505] border-[#333] text-zinc-650 cursor-not-allowed'
          }`}
        >
          <PlusCircle className="w-4 h-4 inline mr-1.5 shrink-0" />
          {selectedPresetGesture ? 'Save & Confirm Preset' : 'Register Custom sign'}
        </button>
      </form>

      {/* Guide details */}
      <div className="text-[9px] text-zinc-500 leading-normal flex items-start gap-1.5 border-t border-zinc-900 pt-3">
        <Info className="w-3.5 h-3.5 font-bold shrink-0 text-[#D1FF26]/80 mt-0.5" />
        <div>
          <span className="text-[#F0F0F0] font-bold">Calibration Tip:</span> Hold your posture stable inside the camera view, then click the Save button above. We will capture and normalize all 21 joints, preserving them in localStorage automatically.
        </div>
      </div>
    </div>
  );
}

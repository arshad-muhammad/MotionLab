/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { SavedGesture } from '../types';
import { Search, Trash2, CheckCircle2, XCircle, RotateCcw, FileSpreadsheet, Star, Sparkles } from 'lucide-react';

interface GestureListProps {
  gestures: SavedGesture[];
  activeSelectedId: string | null;
  onSelectGesture: (g: SavedGesture) => void;
  onDeleteGesture: (id: string) => void;
  onResetPredefined: () => void;
  onTrainLive: (g: SavedGesture) => void;
}

type TabFilter = 'all' | 'trained' | 'untrained' | 'predefined' | 'custom' | 'alphabet' | 'numbers' | 'phrases';

export default function GestureList({
  gestures,
  activeSelectedId,
  onSelectGesture,
  onDeleteGesture,
  onResetPredefined,
  onTrainLive,
}: GestureListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabFilter>('all');

  // Filter items elegantly
  const filteredGestures = gestures.filter((g) => {
    // 1. Label match
    const matchesSearch = g.label.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    // 2. Tab filters
    switch (activeTab) {
      case 'trained':
        return g.isTrained;
      case 'untrained':
        return !g.isTrained;
      case 'predefined':
        return g.isPredefined;
      case 'custom':
        return !g.isPredefined;
      case 'alphabet':
        return g.isPredefined && g.label.length === 1 && /[A-Z]/.test(g.label);
      case 'numbers':
        return g.isPredefined && g.label.startsWith('Num ');
      case 'phrases':
        return g.isPredefined && g.label.length > 1 && !g.label.startsWith('Num ');
      case 'all':
      default:
        return true;
    }
  });

  const trainedCount = gestures.filter((g) => g.isTrained).length;
  const totalCount = gestures.length;

  return (
    <div id="gesture-library-container" className="bg-[#080808] border border-[#333] p-6 relative overflow-hidden flex flex-col h-full space-y-4">
      {/* Decorative gradient corner */}
      <div className="absolute top-0 right-0 w-24 h-24 pointer-events-none">
        <div className="absolute top-0 right-0 w-[200%] h-[200%] bg-gradient-to-bl from-[#D1FF26]/5 to-transparent rotate-45 transform origin-top-right animate-pulse" />
      </div>

      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#333] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-[#D1FF26]" />
            <h3 className="font-sans font-black uppercase tracking-wider text-xs text-[#F0F0F0]">Gestures Library</h3>
          </div>
          <p className="text-[10px] text-zinc-500 font-mono mt-1">// {trainedCount} / {totalCount} ACTIVE SIGNS REGISTERED</p>
        </div>
        
        <button
          onClick={onResetPredefined}
          title="Reset library state back to initial synthesized slots"
          className="mt-2 sm:mt-0 text-[10px] font-mono text-[#D1FF26] hover:bg-[#D1FF26]/10 border border-[#D1FF26]/20 hover:border-[#D1FF26] px-2.5 py-1 transition-all uppercase flex items-center gap-1 cursor-pointer"
        >
          <RotateCcw className="w-3 h-3" />
          Reset Defaults
        </button>
      </div>

      {/* Tab Selectors */}
      <div className="flex flex-wrap gap-1.5 border-b border-zinc-900 pb-3">
        {(['all', 'trained', 'untrained', 'predefined', 'custom', 'alphabet', 'numbers', 'phrases'] as TabFilter[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`text-[9px] font-mono uppercase px-2 py-1 border transition-all cursor-pointer ${
              activeTab === tab
                ? 'bg-[#D1FF26] text-[#0A0A0A] font-bold border-[#D1FF26]'
                : 'bg-[#050505] text-zinc-400 border-[#333] hover:border-zinc-500'
            }`}
          >
            {tab === 'all' ? 'Show All' : tab}
          </button>
        ))}
      </div>

      {/* Search Field */}
      <div className="relative">
        <input
          type="text"
          placeholder="SEARCH GESTURES OR CHARACTER KEYS..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-[#050505] border border-[#333] focus:border-[#D1FF26] text-[10px] font-mono p-2.5 pl-9 outline-none text-[#F0F0F0] uppercase placeholder-zinc-650"
        />
        <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-3" />
      </div>

      {/* Grid List View */}
      <div className="max-h-[350px] overflow-y-auto pr-1 space-y-1.5 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-zinc-950">
        {filteredGestures.length === 0 ? (
          <div className="py-12 text-center text-[10px] text-zinc-500 italic border border-[#333] border-dashed font-mono">
            // NO CORRESPONDING SIGN GESTURE FOUND
          </div>
        ) : (
          filteredGestures.map((item) => {
            const isSelected = activeSelectedId === item.id;
            return (
              <div
                key={item.id}
                onClick={() => onSelectGesture(item)}
                className={`flex items-center justify-between p-3 border transition-all duration-150 select-none cursor-pointer ${
                  isSelected 
                    ? 'bg-[#D1FF26]/10 border-[#D1FF26] shadow-[0_0_12px_rgba(209,255,38,0.1)]' 
                    : 'bg-[#050505] border-[#333] hover:border-zinc-600'
                }`}
              >
                {/* Left labels */}
                <div className="flex items-center gap-2.5 truncate max-w-[65%]">
                  {item.isTrained ? (
                    <span title="Gesture coordinates trained!">
                      <CheckCircle2 className="w-4 h-4 text-[#D1FF26] shrink-0" />
                    </span>
                  ) : (
                    <span title="Awaiting hand pose recording">
                      <XCircle className="w-4 h-4 text-zinc-600 shrink-0" />
                    </span>
                  )}
                  
                  <div className="truncate">
                    <div className="flex items-center gap-1.5">
                      <span className="font-sans font-black text-xs uppercase text-[#F0F0F0] tracking-wide truncate">
                        {item.label}
                      </span>
                      {item.isPredefined && (
                        <span title="Predefined Slot">
                          <Star className="w-2.5 h-2.5 text-yellow-500 fill-yellow-500" />
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-[8px] text-zinc-500 uppercase block mt-0.5">
                      // {item.hand} hand {item.isTrained ? '• calibrated' : '• vacant slot'}
                    </span>
                  </div>
                </div>

                {/* Practical command buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onTrainLive(item);
                    }}
                    className={`text-[8px] font-mono border uppercase px-2 py-1 transition-all flex items-center gap-0.5 cursor-pointer ${
                      item.isTrained
                        ? 'bg-zinc-900 border-[#333] hover:border-[#D1FF26] text-zinc-400 hover:text-[#D1FF26]'
                        : 'bg-[#D1FF26]/10 border-[#D1FF26]/30 hover:bg-[#D1FF26] hover:text-[#0A0A0A] text-[#D1FF26] font-bold'
                    }`}
                  >
                    <Sparkles className="w-2.5 h-2.5" />
                    {item.isTrained ? 'Re-Train' : 'Record'}
                  </button>

                  {!item.isPredefined ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteGesture(item.id);
                      }}
                      className="p-1 px-1.5 border border-red-950 text-red-400 hover:bg-red-500/10 hover:border-red-500 transition-all cursor-pointer"
                      title="Delete custom gesture"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  ) : (
                    item.isTrained && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteGesture(item.id); // Re-sets training on predefined
                        }}
                        className="text-[8px] font-mono bg-[#050505] border border-red-950 text-red-500 hover:bg-red-950/10 hover:border-red-500 px-2 py-1 transition-all cursor-pointer"
                        title="Reset coordinates on this predefined word"
                      >
                        Reset
                      </button>
                    )
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Eraser, Paintbrush, Sparkles, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface DrawingBoardProps {
  drawMode: boolean;
  setDrawMode: (val: boolean) => void;
  brushColor: string;
  setBrushColor: (val: string) => void;
  brushSize: number;
  setBrushSize: (val: number) => void;
  clearCanvas: () => void;
  hasDrawings: boolean;
}

export default function DrawingBoard({
  drawMode,
  setDrawMode,
  brushColor,
  setBrushColor,
  brushSize,
  setBrushSize,
  clearCanvas,
  hasDrawings,
}: DrawingBoardProps) {
  // Preset list of neon paint colors - with Lime included first!
  const colors = [
    { value: '#D1FF26', name: 'Neon Lime' },
    { value: '#06b6d4', name: 'Neon Cyan' },
    { value: '#ec4899', name: 'Laser Pink' },
    { value: '#f59e0b', name: 'Solar Amber' },
    { value: '#a855f7', name: 'Acid Purple' },
    { value: '#ffffff', name: 'Polar White' },
  ];

  const strokeSizes = [
    { value: 3, name: 'Fine' },
    { value: 6, name: 'Normal' },
    { value: 12, name: 'Chunky' },
  ];

  return (
    <div id="drawing-board-panel" className="bg-[#080808] border border-[#333] p-6 select-none space-y-4">
      {/* Header section with toggle switch */}
      <div className="flex items-center justify-between border-b border-[#333] pb-3">
        <div className="flex items-center gap-2">
          <Paintbrush className="w-4 h-4 text-[#D1FF26]" />
          <h3 className="font-sans font-black uppercase tracking-wider text-xs text-[#F0F0F0]">Spatial Air Doodle</h3>
        </div>

        <button
          onClick={() => setDrawMode(!drawMode)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
            drawMode ? 'bg-[#D1FF26]' : 'bg-zinc-800'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              drawMode ? 'translate-x-6' : 'translate-x-1'
            }`}
            style={{ backgroundColor: drawMode ? '#0A0A0A' : '#ffffff' }}
          />
        </button>
      </div>

      {drawMode ? (
        <div className="space-y-4 animate-fade-in">
          {/* Instructions Box */}
          <div className="bg-[#D1FF26]/5 border border-[#D1FF26]/25 p-3 text-xs text-[#D1FF26] flex items-start gap-2 leading-relaxed">
            <Sparkles className="w-4 h-4 text-[#D1FF26] shrink-0 mt-0.5" />
            <div>
              <p className="font-bold uppercase tracking-wide">// Air Canvas Active</p>
              <p className="mt-1 opacity-80">
                Extend ONLY your index finger (<span className="font-mono text-white font-bold">POINTING</span> gesture) to draw. Raise multiple fingers or close your fist to stop drawing!
              </p>
            </div>
          </div>

          {/* Color Presets */}
          <div className="space-y-1.5">
            <span className="text-[9px] font-mono text-zinc-500 tracking-wider uppercase block">// Paint Color Vector</span>
            <div className="flex flex-wrap gap-2">
              {colors.map((color) => (
                <button
                  key={color.value}
                  onClick={() => setBrushColor(color.value)}
                  className={`w-6 h-6 rounded-none cursor-pointer border-2 transition-all relative ${
                    brushColor === color.value 
                      ? 'border-[#D1FF26] scale-110 shadow-[0_0_10px_rgba(209,255,38,0.4)]' 
                      : 'border-[#333]'
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
            </div>
          </div>

          {/* Brush Sizes */}
          <div className="space-y-1.5">
            <span className="text-[9px] font-mono text-zinc-500 tracking-wider uppercase block">// Brush Dimension</span>
            <div className="grid grid-cols-3 gap-2">
              {strokeSizes.map((size) => (
                <button
                  key={size.value}
                  onClick={() => setBrushSize(size.value)}
                  className={`py-1.5 text-[10px] font-mono border transition-all cursor-pointer ${
                    brushSize === size.value
                      ? 'bg-[#D1FF26]/10 border-[#D1FF26] text-[#D1FF26]'
                      : 'bg-[#050505] border-[#333] text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  {size.name.toUpperCase()} ({size.value}PX)
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <button
            onClick={clearCanvas}
            disabled={!hasDrawings}
            className={`w-full py-2.5 text-xs font-bold uppercase tracking-widest border transition-all cursor-pointer ${
              hasDrawings
                ? 'bg-[#050505] border-[#333] text-red-400 hover:bg-red-950/10 hover:border-red-500/40'
                : 'bg-[#050505]/40 border-zinc-900 text-zinc-600 cursor-not-allowed'
            }`}
          >
            <Eraser className="w-4 h-4 inline shrink-0 mr-1.5" />
            Clear Canvas Buffer
          </button>
        </div>
      ) : (
        <div className="py-6 text-center text-zinc-500 flex flex-col items-center justify-center gap-2">
          <AlertCircle className="w-6 h-6 text-zinc-700" />
          <div className="text-xs">
            <p className="font-bold text-zinc-400 uppercase tracking-wider">// Air Canvas Sleep Mode</p>
            <p className="mt-1 text-zinc-600 text-[11px]">Toggle the switch above to enable spatial drawing over the camera matrix.</p>
          </div>
        </div>
      )}
    </div>
  );
}

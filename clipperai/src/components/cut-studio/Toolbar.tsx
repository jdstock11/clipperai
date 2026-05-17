"use client";

import { useEditorStore } from '@/store/editorStore';
import { Scissors, Split, Trash2, Undo2, Redo2, Wand2, EyeOff } from 'lucide-react';

export default function Toolbar() {
  const { mode, setMode, undo, redo, history, historyIndex, watermark, setWatermark } = useEditorStore();

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  return (
    <div className="flex items-center gap-2 bg-[var(--surface)] border border-[var(--border)] p-1.5 rounded-xl shadow-lg">
      <div className="flex items-center gap-1 bg-black/20 p-1 rounded-lg">
        <button
          onClick={() => setMode('trim')}
          className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-semibold transition-all ${
            mode === 'trim' ? 'bg-[var(--primary)] text-white shadow-[0_0_10px_var(--primary)]' : 'text-[var(--muted)] hover:text-white hover:bg-white/5'
          }`}
        >
          <Scissors className="w-4 h-4" /> Trim
        </button>
        <button
          onClick={() => setMode('remove')}
          className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-semibold transition-all ${
            mode === 'remove' || mode === 'multi' ? 'bg-red-600 text-white shadow-[0_0_10px_rgba(220,38,38,0.8)]' : 'text-[var(--muted)] hover:text-white hover:bg-white/5'
          }`}
        >
          <Trash2 className="w-4 h-4" /> Remove Section
        </button>
      </div>

      <div className="w-px h-6 bg-[var(--border)] mx-1" />

      <div className="flex items-center gap-1">
        <button
          onClick={undo}
          disabled={!canUndo}
          className="p-2 rounded-md text-[var(--muted)] hover:text-white hover:bg-[var(--surface-2)] disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="w-4 h-4" />
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          className="p-2 rounded-md text-[var(--muted)] hover:text-white hover:bg-[var(--surface-2)] disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          title="Redo (Ctrl+Y)"
        >
          <Redo2 className="w-4 h-4" />
        </button>
      </div>

      <div className="w-px h-6 bg-[var(--border)] mx-1" />

      <button
        onClick={() => setWatermark({ enabled: !watermark.enabled })}
        className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-semibold transition-all ${
          watermark.enabled ? 'bg-indigo-600 text-white shadow-[0_0_10px_rgba(79,70,229,0.8)]' : 'text-[var(--muted)] hover:text-white hover:bg-white/5'
        }`}
        title="Remove Watermark / Overlay"
      >
        <EyeOff className="w-4 h-4" /> Watermark Tool
      </button>

      <button className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-semibold text-purple-400 hover:text-purple-300 hover:bg-purple-900/20 transition-all ml-auto">
        <Wand2 className="w-4 h-4" /> Smart Silence Cut (Pro)
      </button>
    </div>
  );
}

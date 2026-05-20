"use client";

import { useEditorStore } from '@/store/editorStore';
import { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Scissors, MousePointer2 } from 'lucide-react';

export default function Timeline() {
  const { 
    currentTime, duration, mode, startTime, endTime, removals, 
    setCurrentTime, setTrimRange, updateRemoval, addRemoval
  } = useEditorStore();
  
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);

  const getTimeFromEvent = (e: React.MouseEvent | MouseEvent | React.TouchEvent) => {
    if (!trackRef.current) return 0;
    const rect = trackRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    return (x / rect.width) * duration;
  };

  const handleTrackClick = (e: React.MouseEvent) => {
    if (!isDraggingPlayhead) {
      setCurrentTime(getTimeFromEvent(e));
    }
  };

  const handleSplit = () => {
    if ((mode === 'remove' || mode === 'multi') && duration > 0) {
      // Create a 5-second cut or until the end of the video
      const end = Math.min(currentTime + 5, duration);
      addRemoval({ start: currentTime, end });
    }
  };

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 's' || e.key === 'S') {
        handleSplit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentTime, duration, mode]);

  // Global mouse move for drag
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isDraggingPlayhead) {
        setCurrentTime(getTimeFromEvent(e));
      }
    };
    const handleGlobalMouseUp = () => {
      setIsDraggingPlayhead(false);
    };

    if (isDraggingPlayhead) {
      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);
    }
    
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDraggingPlayhead, duration]);

  if (duration === 0) return null;

  return (
    <div className="w-full flex flex-col">
      <div className="relative w-full h-36 bg-[#0a0a0c] border border-[var(--border)] rounded-xl overflow-hidden flex flex-col select-none shadow-[0_0_40px_rgba(0,0,0,0.5)]">
        
        {/* Waveform Fake Visualization (Stylized) */}
        <div className="absolute inset-0 top-6 flex items-center px-1 gap-[2px] opacity-20 pointer-events-none">
          {Array.from({ length: 150 }).map((_, i) => (
            <div 
              key={i} 
              className="flex-1 bg-gradient-to-t from-[var(--primary)] to-white rounded-full" 
              style={{ 
                height: `${20 + Math.sin(i * 0.2) * 40 + Math.random() * 40}%`,
                opacity: 0.5 + Math.random() * 0.5
              }} 
            />
          ))}
        </div>

        {/* Time ruler */}
        <div className="h-6 w-full bg-[var(--surface)] border-b border-[var(--border)] flex items-end relative overflow-hidden text-[10px] text-[var(--muted)] font-mono">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="absolute bottom-0 border-l border-[var(--border)] pl-1 h-2" style={{ left: `${i * 10}%` }}>
              {((duration / 10) * i).toFixed(1)}s
            </div>
          ))}
        </div>

        {/* Interactive Track */}
        <div className="flex-1 relative cursor-pointer" ref={trackRef} onMouseDown={handleTrackClick}>
          
          {/* TRIM MODE */}
          {mode === 'trim' && (
            <>
              {/* Dim out non-selected parts */}
              <div className="absolute inset-y-0 left-0 bg-black/60 z-10 pointer-events-none" style={{ width: `${(startTime / duration) * 100}%` }} />
              <div className="absolute inset-y-0 right-0 bg-black/60 z-10 pointer-events-none" style={{ width: `${(1 - endTime / duration) * 100}%` }} />
              
              {/* Highlight selection */}
              <div 
                className="absolute inset-y-0 bg-[var(--primary)]/10 border-y border-[var(--primary)]/50 z-10"
                style={{ left: `${(startTime / duration) * 100}%`, width: `${((endTime - startTime) / duration) * 100}%` }}
              >
                {/* Start Handle — draggable */}
                <div 
                  className="absolute top-0 bottom-0 -left-1.5 w-3 bg-[var(--primary)] rounded-full shadow-[0_0_15px_var(--primary)] cursor-ew-resize z-20 flex items-center justify-center"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    const onMove = (ev: MouseEvent) => {
                      if (!trackRef.current) return;
                      const rect = trackRef.current.getBoundingClientRect();
                      const x = Math.max(0, Math.min(ev.clientX - rect.left, rect.width));
                      const time = (x / rect.width) * duration;
                      const clamped = Math.max(0, Math.min(time, endTime - 1));
                      setTrimRange(clamped, endTime);
                      setCurrentTime(clamped);
                    };
                    const onUp = () => {
                      window.removeEventListener('mousemove', onMove);
                      window.removeEventListener('mouseup', onUp);
                    };
                    window.addEventListener('mousemove', onMove);
                    window.addEventListener('mouseup', onUp);
                  }}
                  onTouchStart={(e) => {
                    e.stopPropagation();
                    const onMove = (ev: TouchEvent) => {
                      if (!trackRef.current) return;
                      const rect = trackRef.current.getBoundingClientRect();
                      const x = Math.max(0, Math.min(ev.touches[0].clientX - rect.left, rect.width));
                      const time = (x / rect.width) * duration;
                      const clamped = Math.max(0, Math.min(time, endTime - 1));
                      setTrimRange(clamped, endTime);
                      setCurrentTime(clamped);
                    };
                    const onEnd = () => {
                      window.removeEventListener('touchmove', onMove);
                      window.removeEventListener('touchend', onEnd);
                    };
                    window.addEventListener('touchmove', onMove);
                    window.addEventListener('touchend', onEnd);
                  }}
                >
                  <div className="w-0.5 h-4 bg-black/50 rounded-full" />
                </div>
                {/* End Handle — draggable */}
                <div 
                  className="absolute top-0 bottom-0 -right-1.5 w-3 bg-[var(--primary)] rounded-full shadow-[0_0_15px_var(--primary)] cursor-ew-resize z-20 flex items-center justify-center"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    const onMove = (ev: MouseEvent) => {
                      if (!trackRef.current) return;
                      const rect = trackRef.current.getBoundingClientRect();
                      const x = Math.max(0, Math.min(ev.clientX - rect.left, rect.width));
                      const time = (x / rect.width) * duration;
                      const clamped = Math.max(startTime + 1, Math.min(time, duration));
                      setTrimRange(startTime, clamped);
                      setCurrentTime(clamped);
                    };
                    const onUp = () => {
                      window.removeEventListener('mousemove', onMove);
                      window.removeEventListener('mouseup', onUp);
                    };
                    window.addEventListener('mousemove', onMove);
                    window.addEventListener('mouseup', onUp);
                  }}
                  onTouchStart={(e) => {
                    e.stopPropagation();
                    const onMove = (ev: TouchEvent) => {
                      if (!trackRef.current) return;
                      const rect = trackRef.current.getBoundingClientRect();
                      const x = Math.max(0, Math.min(ev.touches[0].clientX - rect.left, rect.width));
                      const time = (x / rect.width) * duration;
                      const clamped = Math.max(startTime + 1, Math.min(time, duration));
                      setTrimRange(startTime, clamped);
                      setCurrentTime(clamped);
                    };
                    const onEnd = () => {
                      window.removeEventListener('touchmove', onMove);
                      window.removeEventListener('touchend', onEnd);
                    };
                    window.addEventListener('touchmove', onMove);
                    window.addEventListener('touchend', onEnd);
                  }}
                >
                  <div className="w-0.5 h-4 bg-black/50 rounded-full" />
                </div>
              </div>
            </>
          )}

          {/* MULTI / REMOVE MODE */}
          {(mode === 'remove' || mode === 'multi') && removals.map(cut => (
            <motion.div 
              initial={{ opacity: 0, scaleY: 0 }}
              animate={{ opacity: 1, scaleY: 1 }}
              key={cut.id}
              className="absolute inset-y-0 bg-red-600/30 border-x border-red-500 z-10 backdrop-blur-[1px]"
              style={{ left: `${(cut.start / duration) * 100}%`, width: `${((cut.end - cut.start) / duration) * 100}%` }}
            >
              <div className="absolute top-1 left-1.5 bg-red-600/90 text-white text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-widest shadow-md">
                Removed
              </div>
              
              {/* Handles */}
              <div className="absolute top-0 bottom-0 -left-1 w-2 bg-red-500 hover:w-3 hover:-left-1.5 transition-all cursor-ew-resize shadow-[0_0_10px_rgba(239,68,68,0.8)] z-20" />
              <div className="absolute top-0 bottom-0 -right-1 w-2 bg-red-500 hover:w-3 hover:-right-1.5 transition-all cursor-ew-resize shadow-[0_0_10px_rgba(239,68,68,0.8)] z-20" />
            </motion.div>
          ))}

          {/* PLAYHEAD */}
          <div 
            className="absolute top-0 bottom-0 w-px bg-white z-30 flex flex-col items-center"
            style={{ left: `${(currentTime / duration) * 100}%` }}
          >
            <div 
              className="w-4 h-4 bg-white rounded-full -mt-2 shadow-[0_0_15px_rgba(255,255,255,1)] cursor-grab active:cursor-grabbing flex items-center justify-center text-black"
              onMouseDown={(e) => { e.stopPropagation(); setIsDraggingPlayhead(true); }}
            >
              <div className="w-1 h-1 rounded-full bg-black/30" />
            </div>
            <div className="w-px h-full bg-gradient-to-b from-white to-transparent" />
          </div>
        </div>
      </div>

      {/* Toolbar / Helper */}
      <div className="mt-3 flex items-center justify-between text-xs text-[var(--muted)] font-medium">
        <div className="flex gap-4">
          <span className="flex items-center gap-1.5 text-white bg-[var(--surface)] px-2 py-1 rounded-md border border-[var(--border)] shadow-sm">
            <MousePointer2 className="w-3 h-3 text-[var(--primary)]" />
            Mode: <span className="capitalize">{mode}</span>
          </span>
          <span className="flex items-center gap-1.5 text-[var(--muted)] px-2 py-1">
            <kbd className="bg-[var(--surface-2)] border border-[var(--border)] px-1.5 py-0.5 rounded shadow-sm text-white font-mono text-[10px]">S</kbd> to split here
          </span>
        </div>
        <button onClick={handleSplit} className="text-[var(--primary)] hover:text-white transition-colors flex items-center gap-1.5">
          <Scissors className="w-3.5 h-3.5" /> Split Playhead
        </button>
      </div>
    </div>
  );
}

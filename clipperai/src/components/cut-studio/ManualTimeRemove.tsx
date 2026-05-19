"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { useEditorStore } from '@/store/editorStore';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, Trash2, X, Play, SkipForward, Plus, AlertCircle, CheckCircle2, 
  TimerReset, ChevronRight
} from 'lucide-react';

function formatMMSS(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function parseMMSS(value: string): number | null {
  const match = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const minutes = parseInt(match[1], 10);
  const seconds = parseInt(match[2], 10);
  if (seconds >= 60) return null;
  return minutes * 60 + seconds;
}

// Auto-format input as user types
function autoFormatTimeInput(raw: string): string {
  // Strip non-digit characters
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 0) return '';
  if (digits.length <= 2) return digits;
  // Insert colon after the minute part
  const mins = digits.slice(0, digits.length - 2);
  const secs = digits.slice(digits.length - 2);
  return `${mins}:${secs}`;
}

interface RemovalEntry {
  id: string;
  startFormatted: string;
  endFormatted: string;
  durationSecs: number;
}

export default function ManualTimeRemove() {
  const { 
    duration, removals, addRemoval, removeRemoval, 
    setCurrentTime, setPlaying, mode, setMode 
  } = useEditorStore();

  const [startInput, setStartInput] = useState('');
  const [endInput, setEndInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const errorTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const successTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Format removals for display
  const removalEntries: RemovalEntry[] = removals.map(r => ({
    id: r.id,
    startFormatted: formatMMSS(r.start),
    endFormatted: formatMMSS(r.end),
    durationSecs: r.end - r.start,
  }));

  const showError = useCallback((msg: string) => {
    setError(msg);
    setSuccess(null);
    if (errorTimeout.current) clearTimeout(errorTimeout.current);
    errorTimeout.current = setTimeout(() => setError(null), 4000);
  }, []);

  const showSuccess = useCallback((msg: string) => {
    setSuccess(msg);
    setError(null);
    if (successTimeout.current) clearTimeout(successTimeout.current);
    successTimeout.current = setTimeout(() => setSuccess(null), 3000);
  }, []);

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      if (errorTimeout.current) clearTimeout(errorTimeout.current);
      if (successTimeout.current) clearTimeout(successTimeout.current);
    };
  }, []);

  const handleStartInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStartInput(autoFormatTimeInput(e.target.value));
  };

  const handleEndInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEndInput(autoFormatTimeInput(e.target.value));
  };

  const validate = (): { start: number; end: number } | null => {
    if (!startInput.trim() || !endInput.trim()) {
      showError('Both Start and End times are required');
      return null;
    }

    const startSecs = parseMMSS(startInput.trim());
    const endSecs = parseMMSS(endInput.trim());

    if (startSecs === null) {
      showError(`Invalid Start format "${startInput}". Use MM:SS (e.g., 01:53)`);
      return null;
    }
    if (endSecs === null) {
      showError(`Invalid End format "${endInput}". Use MM:SS (e.g., 02:32)`);
      return null;
    }
    if (startSecs >= endSecs) {
      showError('Start time must be before End time');
      return null;
    }
    if (endSecs > duration) {
      showError(`End time (${endInput}) exceeds video duration (${formatMMSS(duration)})`);
      return null;
    }
    if (startSecs < 0) {
      showError('Start time cannot be negative');
      return null;
    }

    // Check for overlap with existing removals
    for (const r of removals) {
      if (startSecs < r.end && endSecs > r.start) {
        showError(`Overlaps with existing removal (${formatMMSS(r.start)} → ${formatMMSS(r.end)})`);
        return null;
      }
    }

    return { start: startSecs, end: endSecs };
  };

  const handleApplyRemove = () => {
    // Ensure we are in remove mode
    if (mode !== 'remove' && mode !== 'multi') {
      setMode('remove');
    }

    const result = validate();
    if (!result) return;

    addRemoval({ start: result.start, end: result.end });
    showSuccess(`Removed ${startInput} → ${endInput} (${(result.end - result.start).toFixed(1)}s)`);
    setStartInput('');
    setEndInput('');
  };

  const handleClear = () => {
    setStartInput('');
    setEndInput('');
    setError(null);
  };

  const handleJumpToStart = () => {
    const secs = parseMMSS(startInput.trim());
    if (secs !== null && secs >= 0 && secs <= duration) {
      setCurrentTime(secs);
      setPlaying(false);
    } else {
      showError('Invalid Start time to jump to');
    }
  };

  const handleJumpToEnd = () => {
    const secs = parseMMSS(endInput.trim());
    if (secs !== null && secs >= 0 && secs <= duration) {
      setCurrentTime(secs);
      setPlaying(false);
    } else {
      showError('Invalid End time to jump to');
    }
  };

  const handlePreviewRange = () => {
    const result = validate();
    if (!result) return;

    // Jump to start time and play
    setCurrentTime(result.start);
    setPlaying(true);

    // Auto-stop at end time
    const checkInterval = setInterval(() => {
      const { currentTime } = useEditorStore.getState();
      if (currentTime >= result.end) {
        setPlaying(false);
        clearInterval(checkInterval);
      }
    }, 100);

    // Safety: clear after 5 mins
    setTimeout(() => clearInterval(checkInterval), 300000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleApplyRemove();
    }
  };

  const totalRemoved = removals.reduce((acc, r) => acc + (r.end - r.start), 0);

  return (
    <div className="w-full space-y-3">
      {/* Manual Remove Panel */}
      <div className="bg-[#0c0c10] border border-[var(--border)] rounded-xl p-4 shadow-[0_0_30px_rgba(0,0,0,0.4)]">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-600/20 flex items-center justify-center">
              <Clock className="w-4 h-4 text-red-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Manual Time Remove</h3>
              <p className="text-[10px] text-[var(--muted)] mt-0.5">Enter timestamps to remove sections</p>
            </div>
          </div>
          {removals.length > 0 && (
            <div className="flex items-center gap-2 text-[10px] font-mono">
              <span className="text-red-400 bg-red-500/10 px-2 py-1 rounded-md border border-red-500/20">
                {removals.length} cut{removals.length > 1 ? 's' : ''} • {totalRemoved.toFixed(1)}s removed
              </span>
            </div>
          )}
        </div>

        {/* Input Row */}
        <div className="flex items-end gap-2 flex-wrap">
          {/* Start Time */}
          <div className="flex-1 min-w-[120px]">
            <label className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-1.5 block">
              Remove Start
            </label>
            <div className="relative">
              <input
                type="text"
                value={startInput}
                onChange={handleStartInputChange}
                onKeyDown={handleKeyDown}
                placeholder="00:15"
                className="w-full bg-[#111118] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm font-mono text-white placeholder-white/20 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500/30 transition-all"
                maxLength={6}
              />
              {startInput && (
                <button
                  onClick={handleJumpToStart}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded text-[var(--muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  title="Jump to this time"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Arrow */}
          <div className="pb-2.5">
            <ChevronRight className="w-4 h-4 text-[var(--muted)]" />
          </div>

          {/* End Time */}
          <div className="flex-1 min-w-[120px]">
            <label className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-1.5 block">
              Remove End
            </label>
            <div className="relative">
              <input
                type="text"
                value={endInput}
                onChange={handleEndInputChange}
                onKeyDown={handleKeyDown}
                placeholder="02:32"
                className="w-full bg-[#111118] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm font-mono text-white placeholder-white/20 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500/30 transition-all"
                maxLength={6}
              />
              {endInput && (
                <button
                  onClick={handleJumpToEnd}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded text-[var(--muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  title="Jump to this time"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 pb-0.5">
            <button
              onClick={handlePreviewRange}
              className="p-2.5 rounded-lg bg-[#111118] border border-[var(--border)] text-[var(--muted)] hover:text-white hover:border-[var(--muted)] transition-all"
              title="Preview selected range"
            >
              <Play className="w-4 h-4" />
            </button>
            <button
              onClick={handleApplyRemove}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-bold transition-all shadow-[0_0_15px_rgba(220,38,38,0.3)] hover:shadow-[0_0_25px_rgba(220,38,38,0.5)]"
            >
              <Plus className="w-4 h-4" />
              Apply
            </button>
            <button
              onClick={handleClear}
              className="p-2.5 rounded-lg bg-[#111118] border border-[var(--border)] text-[var(--muted)] hover:text-white hover:border-[var(--muted)] transition-all"
              title="Clear inputs"
            >
              <TimerReset className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Error / Success Messages */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -8, height: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="mt-3 flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
              <button onClick={() => setError(null)} className="ml-auto text-red-500/60 hover:text-red-400">
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -8, height: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="mt-3 flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2"
            >
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{success}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active Removals List */}
        {removalEntries.length > 0 && (
          <div className="mt-4 space-y-1.5">
            <div className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider mb-2">
              Active Removals
            </div>
            {removalEntries.map((entry, idx) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-2 bg-red-950/30 border border-red-500/15 rounded-lg px-3 py-2 group hover:border-red-500/40 transition-all"
              >
                <div className="w-5 h-5 rounded bg-red-600/30 flex items-center justify-center text-[10px] font-bold text-red-400 flex-shrink-0">
                  {idx + 1}
                </div>
                <span className="font-mono text-xs text-white">
                  {entry.startFormatted}
                </span>
                <ChevronRight className="w-3 h-3 text-red-500/50" />
                <span className="font-mono text-xs text-white">
                  {entry.endFormatted}
                </span>
                <span className="text-[10px] text-red-400/70 ml-1">
                  ({entry.durationSecs.toFixed(1)}s)
                </span>
                <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => {
                      const r = removals.find(rm => rm.id === entry.id);
                      if (r) {
                        setCurrentTime(r.start);
                        setPlaying(true);
                      }
                    }}
                    className="p-1 rounded text-[var(--muted)] hover:text-white hover:bg-white/5 transition-colors"
                    title="Preview this cut"
                  >
                    <Play className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => removeRemoval(entry.id)}
                    className="p-1 rounded text-red-400/50 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    title="Remove this cut"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

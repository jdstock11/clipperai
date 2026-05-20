"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useEditorStore } from '@/store/editorStore';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock, ChevronLeft, ChevronRight, AlertCircle, X,
  ChevronsLeft, ChevronsRight
} from 'lucide-react';

// ── Format / Parse helpers (HH:MM:SS) ──────────────────────────────

function formatHHMMSS(totalSeconds: number): string {
  if (!isFinite(totalSeconds) || totalSeconds < 0) return '00:00:00';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function parseHHMMSS(value: string): number | null {
  // Accept HH:MM:SS or H:MM:SS
  const match = value.match(/^(\d{1,2}):(\d{2}):(\d{2})$/);
  if (!match) return null;
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const s = parseInt(match[3], 10);
  if (m >= 60 || s >= 60) return null;
  return h * 3600 + m * 60 + s;
}

function autoFormatHHMMSS(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 0) return '';
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) {
    const secs = digits.slice(-2);
    const mins = digits.slice(0, -2);
    return `${mins}:${secs}`;
  }
  // 5+ digits → HH:MM:SS
  const secs = digits.slice(-2);
  const mins = digits.slice(-4, -2);
  const hrs = digits.slice(0, -4);
  return `${hrs}:${mins}:${secs}`;
}

// ── Single time input with nudge buttons ────────────────────────────

interface TimeFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onApply: (secs: number) => void;
  onNudge: (delta: number) => void;
  error?: string | null;
  placeholder?: string;
}

function TimeField({ label, value, onChange, onApply, onNudge, error, placeholder }: TimeFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(autoFormatHHMMSS(e.target.value));
  };

  const handleBlur = () => {
    const secs = parseHHMMSS(value);
    if (secs !== null) {
      onApply(secs);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const secs = parseHHMMSS(value);
      if (secs !== null) onApply(secs);
    } else if (e.key === 'Escape') {
      inputRef.current?.blur();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      onNudge(e.shiftKey ? 5 : 1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      onNudge(e.shiftKey ? -5 : -1);
    }
  };

  return (
    <div className="flex-1 min-w-[140px]">
      <label className="text-[10px] font-bold text-[var(--primary)] uppercase tracking-wider mb-1.5 block">
        {label}
      </label>
      <div className="flex items-center gap-1">
        {/* -5s */}
        <button
          type="button"
          onClick={() => onNudge(-5)}
          className="p-1.5 rounded-md bg-[#111118] border border-[var(--border)] text-[var(--muted)] hover:text-white hover:border-[var(--primary)]/40 transition-all flex-shrink-0"
          title="-5 seconds"
        >
          <ChevronsLeft className="w-3.5 h-3.5" />
        </button>
        {/* -1s */}
        <button
          type="button"
          onClick={() => onNudge(-1)}
          className="p-1.5 rounded-md bg-[#111118] border border-[var(--border)] text-[var(--muted)] hover:text-white hover:border-[var(--primary)]/40 transition-all flex-shrink-0"
          title="-1 second"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || '00:00:00'}
          maxLength={8}
          className={`w-full bg-[#111118] border rounded-lg px-3 py-2.5 text-sm font-mono text-white text-center placeholder-white/20 focus:outline-none focus:ring-1 transition-all ${
            error
              ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30'
              : 'border-[var(--border)] focus:border-[var(--primary)] focus:ring-[var(--primary)]/30'
          }`}
        />

        {/* +1s */}
        <button
          type="button"
          onClick={() => onNudge(1)}
          className="p-1.5 rounded-md bg-[#111118] border border-[var(--border)] text-[var(--muted)] hover:text-white hover:border-[var(--primary)]/40 transition-all flex-shrink-0"
          title="+1 second"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
        {/* +5s */}
        <button
          type="button"
          onClick={() => onNudge(5)}
          className="p-1.5 rounded-md bg-[#111118] border border-[var(--border)] text-[var(--muted)] hover:text-white hover:border-[var(--primary)]/40 transition-all flex-shrink-0"
          title="+5 seconds"
        >
          <ChevronsRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────

export default function TrimTimeInputs() {
  const {
    startTime, endTime, duration,
    setTrimRange, setCurrentTime, setPlaying
  } = useEditorStore();

  const [startInput, setStartInput] = useState(formatHHMMSS(startTime));
  const [endInput, setEndInput] = useState(formatHHMMSS(endTime));
  const [error, setError] = useState<string | null>(null);
  const [startError, setStartError] = useState(false);
  const [endError, setEndError] = useState(false);
  const errorTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track whether the user is actively editing an input
  const isEditingStart = useRef(false);
  const isEditingEnd = useRef(false);

  // Sync store → inputs (when handles are dragged externally)
  useEffect(() => {
    if (!isEditingStart.current) {
      setStartInput(formatHHMMSS(startTime));
    }
  }, [startTime]);

  useEffect(() => {
    if (!isEditingEnd.current) {
      setEndInput(formatHHMMSS(endTime));
    }
  }, [endTime]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (errorTimeout.current) clearTimeout(errorTimeout.current);
    };
  }, []);

  const showError = useCallback((msg: string, field?: 'start' | 'end') => {
    setError(msg);
    if (field === 'start') setStartError(true);
    else if (field === 'end') setEndError(true);
    if (errorTimeout.current) clearTimeout(errorTimeout.current);
    errorTimeout.current = setTimeout(() => {
      setError(null);
      setStartError(false);
      setEndError(false);
    }, 4000);
  }, []);

  const clearErrors = () => {
    setError(null);
    setStartError(false);
    setEndError(false);
  };

  const applyStart = useCallback((secs: number) => {
    clearErrors();
    if (secs < 0) {
      showError('Start time cannot be negative', 'start');
      return;
    }
    if (secs >= endTime) {
      showError('Start time must be before end time', 'start');
      return;
    }
    setTrimRange(secs, endTime);
    setCurrentTime(secs);
    setPlaying(false);
    setStartInput(formatHHMMSS(secs));
  }, [endTime, setTrimRange, setCurrentTime, setPlaying, showError]);

  const applyEnd = useCallback((secs: number) => {
    clearErrors();
    if (secs > duration) {
      showError(`End time exceeds video duration (${formatHHMMSS(duration)})`, 'end');
      return;
    }
    if (secs <= startTime) {
      showError('End time must be after start time', 'end');
      return;
    }
    setTrimRange(startTime, secs);
    setCurrentTime(secs);
    setPlaying(false);
    setEndInput(formatHHMMSS(secs));
  }, [startTime, duration, setTrimRange, setCurrentTime, setPlaying, showError]);

  const nudgeStart = useCallback((delta: number) => {
    clearErrors();
    const newVal = Math.max(0, Math.min(startTime + delta, endTime - 1));
    setTrimRange(newVal, endTime);
    setCurrentTime(newVal);
    setPlaying(false);
    setStartInput(formatHHMMSS(newVal));
  }, [startTime, endTime, setTrimRange, setCurrentTime, setPlaying]);

  const nudgeEnd = useCallback((delta: number) => {
    clearErrors();
    const newVal = Math.max(startTime + 1, Math.min(endTime + delta, duration));
    setTrimRange(startTime, newVal);
    setCurrentTime(newVal);
    setPlaying(false);
    setEndInput(formatHHMMSS(newVal));
  }, [startTime, endTime, duration, setTrimRange, setCurrentTime, setPlaying]);

  // Computed clip duration
  const clipDuration = endTime - startTime;

  return (
    <div className="w-full">
      <div className="bg-[#0c0c10] border border-[var(--border)] rounded-xl p-4 shadow-[0_0_30px_rgba(0,0,0,0.4)]">

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/20 flex items-center justify-center">
              <Clock className="w-4 h-4 text-[var(--primary)]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Precise Time Selection</h3>
              <p className="text-[10px] text-[var(--muted)] mt-0.5">Enter timestamps or use ±buttons • Arrow keys supported</p>
            </div>
          </div>
          {clipDuration > 0 && (
            <div className="flex items-center gap-2 text-[10px] font-mono">
              <span className="text-[var(--primary)] bg-[var(--primary)]/10 px-2 py-1 rounded-md border border-[var(--primary)]/20">
                Clip: {formatHHMMSS(clipDuration)}
              </span>
            </div>
          )}
        </div>

        {/* Input Row */}
        <div className="flex items-end gap-3 flex-wrap">
          <TimeField
            label="Start Time"
            value={startInput}
            onChange={(v) => { isEditingStart.current = true; setStartInput(v); }}
            onApply={(secs) => { isEditingStart.current = false; applyStart(secs); }}
            onNudge={nudgeStart}
            error={startError ? error : null}
            placeholder="00:00:00"
          />

          {/* Divider arrow */}
          <div className="pb-3 text-[var(--muted)] hidden sm:block">
            <ChevronRight className="w-5 h-5" />
          </div>

          <TimeField
            label="End Time"
            value={endInput}
            onChange={(v) => { isEditingEnd.current = true; setEndInput(v); }}
            onApply={(secs) => { isEditingEnd.current = false; applyEnd(secs); }}
            onNudge={nudgeEnd}
            error={endError ? error : null}
            placeholder={formatHHMMSS(duration)}
          />
        </div>

        {/* Keyboard hint */}
        <div className="mt-3 flex items-center gap-3 text-[10px] text-[var(--muted)]">
          <span className="flex items-center gap-1">
            <kbd className="bg-[var(--surface-2)] border border-[var(--border)] px-1 py-0.5 rounded shadow-sm text-white font-mono text-[9px]">↑↓</kbd>
            ±1s
          </span>
          <span className="flex items-center gap-1">
            <kbd className="bg-[var(--surface-2)] border border-[var(--border)] px-1 py-0.5 rounded shadow-sm text-white font-mono text-[9px]">Shift+↑↓</kbd>
            ±5s
          </span>
          <span className="flex items-center gap-1">
            <kbd className="bg-[var(--surface-2)] border border-[var(--border)] px-1 py-0.5 rounded shadow-sm text-white font-mono text-[9px]">Enter</kbd>
            Apply
          </span>
        </div>

        {/* Error Message */}
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
              <button onClick={() => { setError(null); setStartError(false); setEndError(false); }} className="ml-auto text-red-500/60 hover:text-red-400">
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

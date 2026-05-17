import { create } from 'zustand';

export type CutMode = 'trim' | 'remove' | 'multi';

export interface Cut {
  id: string;
  start: number;
  end: number;
}

export type WatermarkMode = 'none' | 'blur' | 'crop';

export interface Watermark {
  enabled: boolean;
  mode: WatermarkMode;
  x: number; // percentage 0-1
  y: number; // percentage 0-1
  w: number; // percentage 0-1
  h: number; // percentage 0-1
}

interface EditorState {
  playing: boolean;
  currentTime: number;
  duration: number;
  mode: CutMode;
  
  // Single trim (mode === 'trim')
  startTime: number;
  endTime: number;
  
  // Removals (mode === 'remove' | 'multi')
  removals: Cut[];
  
  // History for Undo/Redo
  history: Cut[][];
  historyIndex: number;
  
  // Watermark
  watermark: Watermark;
  
  // Actions
  setPlaying: (p: boolean) => void;
  setCurrentTime: (t: number) => void;
  setDuration: (d: number) => void;
  setMode: (m: CutMode) => void;
  setTrimRange: (start: number, end: number) => void;
  addRemoval: (cut: Omit<Cut, 'id'>) => void;
  removeRemoval: (id: string) => void;
  updateRemoval: (id: string, updates: Partial<Cut>) => void;
  undo: () => void;
  redo: () => void;
  setWatermark: (w: Partial<Watermark>) => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  playing: false,
  currentTime: 0,
  duration: 0,
  mode: 'trim',
  
  startTime: 0,
  endTime: 0,
  removals: [],
  
  history: [[]],
  historyIndex: 0,
  
  watermark: {
    enabled: false,
    mode: 'blur',
    x: 0.1,
    y: 0.1,
    w: 0.2,
    h: 0.2
  },
  
  setPlaying: (playing) => set({ playing }),
  setCurrentTime: (currentTime) => set({ currentTime }),
  setDuration: (duration) => set((state) => ({ 
    duration, 
    endTime: state.endTime === 0 ? duration : state.endTime 
  })),
  setMode: (mode) => set({ mode }),
  setTrimRange: (startTime, endTime) => set({ startTime, endTime }),
  
  addRemoval: (cut) => {
    const { removals, history, historyIndex } = get();
    const newRemovals = [...removals, { ...cut, id: Math.random().toString(36).substr(2, 9) }].sort((a, b) => a.start - b.start);
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newRemovals);
    
    set({ removals: newRemovals, history: newHistory, historyIndex: newHistory.length - 1 });
  },
  
  removeRemoval: (id) => {
    const { removals, history, historyIndex } = get();
    const newRemovals = removals.filter(c => c.id !== id);
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newRemovals);
    
    set({ removals: newRemovals, history: newHistory, historyIndex: newHistory.length - 1 });
  },
  
  updateRemoval: (id, updates) => {
    const { removals } = get();
    set({
      removals: removals.map(c => c.id === id ? { ...c, ...updates } : c).sort((a, b) => a.start - b.start)
    });
  },
  
  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex > 0) {
      set({ 
        historyIndex: historyIndex - 1, 
        removals: history[historyIndex - 1] 
      });
    }
  },
  
  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex < history.length - 1) {
      set({ 
        historyIndex: historyIndex + 1, 
        removals: history[historyIndex + 1] 
      });
    }
  },
  
  setWatermark: (updates) => {
    set((state) => ({ watermark: { ...state.watermark, ...updates } }));
  }
}));

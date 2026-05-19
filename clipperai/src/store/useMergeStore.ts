import { create } from 'zustand';

export interface MergeClip {
  id: string;
  file?: File;
  url?: string;
  streamUrl?: string;
  thumbnail?: string;
  duration: number;
}

interface MergeStore {
  clips: MergeClip[];
  activeClipId: string | null;
  playing: boolean;
  exportFormat: string;
  
  // Actions
  addClip: (clip: MergeClip) => void;
  removeClip: (id: string) => void;
  reorderClips: (startIndex: number, endIndex: number) => void;
  setActiveClip: (id: string | null) => void;
  setPlaying: (playing: boolean) => void;
  setExportFormat: (format: string) => void;
  clearClips: () => void;
  updateClip: (id: string, updates: Partial<MergeClip>) => void;
}

export const useMergeStore = create<MergeStore>((set) => ({
  clips: [],
  activeClipId: null,
  playing: false,
  exportFormat: 'landscape',

  addClip: (clip) => set((state) => ({ clips: [...state.clips, clip] })),
  
  removeClip: (id) => set((state) => ({ 
    clips: state.clips.filter(c => c.id !== id),
    activeClipId: state.activeClipId === id ? null : state.activeClipId
  })),
  
  reorderClips: (startIndex, endIndex) => set((state) => {
    const result = Array.from(state.clips);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    return { clips: result };
  }),
  
  setActiveClip: (id) => set({ activeClipId: id }),
  setPlaying: (playing) => set({ playing }),
  setExportFormat: (exportFormat) => set({ exportFormat }),
  clearClips: () => set({ clips: [], activeClipId: null, playing: false }),
  
  updateClip: (id, updates) => set((state) => ({
    clips: state.clips.map(clip => 
      clip.id === id ? { ...clip, ...updates } : clip
    )
  })),
}));

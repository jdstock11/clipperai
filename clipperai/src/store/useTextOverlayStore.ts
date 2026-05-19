import { create } from 'zustand';

// ── Text Layer Types ─────────────────────────────────────────────────

export type TextAnimation = 'none' | 'fadeIn' | 'fadeOut' | 'zoom' | 'slideUp' | 'bounce';
export type TextAlign = 'left' | 'center' | 'right';

export interface TextShadow {
  enabled: boolean;
  color: string;
  blur: number;
  x: number;
  y: number;
}

export interface TextStroke {
  enabled: boolean;
  color: string;
  width: number;
}

export interface TextLayer {
  id: string;
  text: string;
  x: number;            // percentage 0–1
  y: number;            // percentage 0–1
  fontSize: number;     // px
  fontFamily: string;
  color: string;
  backgroundColor: string;
  backgroundOpacity: number; // 0–1
  opacity: number;      // 0–1
  rotation: number;     // degrees
  scaleX: number;
  scaleY: number;
  bold: boolean;
  italic: boolean;
  uppercase: boolean;
  textAlign: TextAlign;
  lineSpacing: number;  // multiplier e.g. 1.4
  letterSpacing: number; // px
  shadow: TextShadow;
  stroke: TextStroke;
  animation: TextAnimation;
  startTime: number;    // seconds
  endTime: number;      // 0 = entire duration
  visible: boolean;
  clipId?: string;      // merge studio: null = global, string = per-clip
}

// ── Default factory ──────────────────────────────────────────────────

const createDefaultLayer = (partial?: Partial<TextLayer>): TextLayer => ({
  id: `txt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
  text: 'Your Text',
  x: 0.5,
  y: 0.5,
  fontSize: 48,
  fontFamily: 'Montserrat',
  color: '#ffffff',
  backgroundColor: '#000000',
  backgroundOpacity: 0,
  opacity: 1,
  rotation: 0,
  scaleX: 1,
  scaleY: 1,
  bold: true,
  italic: false,
  uppercase: false,
  textAlign: 'center',
  lineSpacing: 1.2,
  letterSpacing: 0,
  shadow: { enabled: false, color: '#000000', blur: 4, x: 2, y: 2 },
  stroke: { enabled: false, color: '#000000', width: 2 },
  animation: 'none',
  startTime: 0,
  endTime: 0,
  visible: true,
  ...partial,
});

// ── Store ────────────────────────────────────────────────────────────

interface TextOverlayState {
  layers: TextLayer[];
  activeLayerId: string | null;

  // Actions
  addLayer: (partial?: Partial<TextLayer>) => void;
  removeLayer: (id: string) => void;
  duplicateLayer: (id: string) => void;
  updateLayer: (id: string, updates: Partial<TextLayer>) => void;
  setActiveLayerId: (id: string | null) => void;
  reorderLayers: (startIdx: number, endIdx: number) => void;
  clearLayers: () => void;
  getActiveLayer: () => TextLayer | undefined;
  getVisibleLayers: (currentTime: number, duration: number, clipId?: string) => TextLayer[];
}

export const useTextOverlayStore = create<TextOverlayState>((set, get) => ({
  layers: [],
  activeLayerId: null,

  addLayer: (partial) => {
    const layer = createDefaultLayer(partial);
    set((state) => ({
      layers: [...state.layers, layer],
      activeLayerId: layer.id,
    }));
  },

  removeLayer: (id) =>
    set((state) => ({
      layers: state.layers.filter((l) => l.id !== id),
      activeLayerId: state.activeLayerId === id ? null : state.activeLayerId,
    })),

  duplicateLayer: (id) => {
    const { layers } = get();
    const source = layers.find((l) => l.id === id);
    if (!source) return;
    const dup = createDefaultLayer({
      ...source,
      id: undefined as any, // will be replaced by factory
      text: source.text + ' (copy)',
      x: Math.min(source.x + 0.03, 0.95),
      y: Math.min(source.y + 0.03, 0.95),
    });
    set((state) => ({
      layers: [...state.layers, dup],
      activeLayerId: dup.id,
    }));
  },

  updateLayer: (id, updates) =>
    set((state) => ({
      layers: state.layers.map((l) => (l.id === id ? { ...l, ...updates } : l)),
    })),

  setActiveLayerId: (id) => set({ activeLayerId: id }),

  reorderLayers: (startIdx, endIdx) =>
    set((state) => {
      const result = [...state.layers];
      const [removed] = result.splice(startIdx, 1);
      result.splice(endIdx, 0, removed);
      return { layers: result };
    }),

  clearLayers: () => set({ layers: [], activeLayerId: null }),

  getActiveLayer: () => {
    const { layers, activeLayerId } = get();
    return layers.find((l) => l.id === activeLayerId);
  },

  getVisibleLayers: (currentTime, duration, clipId) => {
    const { layers } = get();
    return layers.filter((l) => {
      if (!l.visible) return false;
      // Per-clip filtering for merge studio
      if (clipId !== undefined && l.clipId && l.clipId !== clipId) return false;
      // Time-based visibility
      const end = l.endTime === 0 ? duration : l.endTime;
      return currentTime >= l.startTime && currentTime <= end;
    });
  },
}));

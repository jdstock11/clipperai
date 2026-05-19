"use client";

import { useState, useCallback } from "react";
import { useTextOverlayStore, TextLayer, TextAnimation, TextAlign } from "@/store/useTextOverlayStore";
import {
  Plus, Trash2, Copy, Eye, EyeOff, Type, ChevronDown, ChevronRight,
  AlignLeft, AlignCenter, AlignRight, Bold, Italic, CaseSensitive
} from "lucide-react";
import "./text-overlay.css";

// ── Font list ────────────────────────────────────────────────────────

const FONT_OPTIONS = [
  "Montserrat",
  "Poppins",
  "Bebas Neue",
  "Anton",
  "Oswald",
  "Roboto",
  "Playfair Display",
];

const ANIMATION_OPTIONS: { value: TextAnimation; label: string }[] = [
  { value: "none", label: "None" },
  { value: "fadeIn", label: "Fade In" },
  { value: "fadeOut", label: "Fade Out" },
  { value: "zoom", label: "Zoom" },
  { value: "slideUp", label: "Slide Up" },
  { value: "bounce", label: "Bounce" },
];

// ── Helper ───────────────────────────────────────────────────────────

function formatTimeInput(s: number): string {
  if (!s || isNaN(s)) return "0.0";
  return s.toFixed(1);
}

function parseTimeInput(v: string): number {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : Math.max(0, n);
}

// ── Component ────────────────────────────────────────────────────────

interface TextOverlayEditorProps {
  duration: number;
  /** For merge studio: current clip ID for per-clip text */
  clipId?: string;
  /** Show per-clip toggle */
  showClipToggle?: boolean;
}

export default function TextOverlayEditor({ duration, clipId, showClipToggle }: TextOverlayEditorProps) {
  const {
    layers, activeLayerId,
    addLayer, removeLayer, duplicateLayer, updateLayer, setActiveLayerId,
  } = useTextOverlayStore();

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    style: true,
    effects: false,
    timing: false,
  });

  const activeLayer = layers.find((l) => l.id === activeLayerId);

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleAddLayer = () => {
    addLayer({
      clipId: clipId || undefined,
      endTime: duration > 0 ? duration : 0,
    });
  };

  const handleUpdate = useCallback(
    (updates: Partial<TextLayer>) => {
      if (activeLayerId) updateLayer(activeLayerId, updates);
    },
    [activeLayerId, updateLayer]
  );

  return (
    <div className="text-editor-panel">
      {/* ── Header + Add Button ──────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h3 style={{ fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
          <Type style={{ width: 14, height: 14, color: "var(--primary)" }} />
          Text Overlays
        </h3>
        <button
          onClick={handleAddLayer}
          style={{
            display: "flex", alignItems: "center", gap: 4,
            padding: "6px 12px", borderRadius: 8,
            background: "var(--primary-dim)", border: "1px solid rgba(0,229,191,0.25)",
            color: "var(--primary)", fontSize: 11, fontWeight: 700,
            cursor: "pointer", transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => { (e.target as HTMLElement).style.background = "rgba(0,229,191,0.25)"; }}
          onMouseLeave={(e) => { (e.target as HTMLElement).style.background = "var(--primary-dim)"; }}
        >
          <Plus style={{ width: 12, height: 12 }} />
          Add Text
        </button>
      </div>

      {/* ── Layers List ──────────────────────────────────────── */}
      {layers.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {layers.map((layer, idx) => (
            <div
              key={layer.id}
              className={`text-layer-item ${activeLayerId === layer.id ? "is-active" : ""}`}
              onClick={() => setActiveLayerId(layer.id)}
            >
              <Type style={{ width: 12, height: 12, flexShrink: 0, color: activeLayerId === layer.id ? "var(--primary)" : "var(--muted)" }} />
              <span className="layer-preview">{layer.text || "Empty"}</span>
              <div className="layer-actions">
                <button
                  className="layer-action-btn"
                  title="Toggle Visibility"
                  onClick={(e) => { e.stopPropagation(); updateLayer(layer.id, { visible: !layer.visible }); }}
                >
                  {layer.visible ? <Eye style={{ width: 12, height: 12 }} /> : <EyeOff style={{ width: 12, height: 12 }} />}
                </button>
                <button
                  className="layer-action-btn"
                  title="Duplicate"
                  onClick={(e) => { e.stopPropagation(); duplicateLayer(layer.id); }}
                >
                  <Copy style={{ width: 12, height: 12 }} />
                </button>
                <button
                  className="layer-action-btn delete"
                  title="Delete"
                  onClick={(e) => { e.stopPropagation(); removeLayer(layer.id); }}
                >
                  <Trash2 style={{ width: 12, height: 12 }} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {layers.length === 0 && (
        <div style={{ padding: "16px 0", textAlign: "center", color: "var(--muted)", fontSize: 12 }}>
          No text layers yet. Click &quot;Add Text&quot; to start.
        </div>
      )}

      {/* ── Active Layer Editor ───────────────────────────────── */}
      {activeLayer && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, borderTop: "1px solid var(--border)", paddingTop: 12 }}>

          {/* Text Content */}
          <div className="text-editor-section">
            <label className="text-editor-label">Text Content</label>
            <textarea
              className="text-editor-textarea"
              value={activeLayer.text}
              onChange={(e) => handleUpdate({ text: e.target.value })}
              placeholder="Enter your text..."
            />
          </div>

          {/* Font Family + Size */}
          <div className="text-editor-section">
            <label className="text-editor-label">Font</label>
            <div className="text-editor-row">
              <select
                className="text-editor-select"
                value={activeLayer.fontFamily}
                onChange={(e) => handleUpdate({ fontFamily: e.target.value })}
                style={{ fontFamily: `'${activeLayer.fontFamily}', sans-serif` }}
              >
                {FONT_OPTIONS.map((f) => (
                  <option key={f} value={f} style={{ fontFamily: `'${f}', sans-serif` }}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
            <div className="text-editor-row">
              <label className="text-editor-label" style={{ width: 32, flexShrink: 0 }}>Size</label>
              <input
                type="range"
                className="text-editor-slider"
                min={8}
                max={200}
                step={1}
                value={activeLayer.fontSize}
                onChange={(e) => handleUpdate({ fontSize: Number(e.target.value) })}
              />
              <span style={{ fontSize: 11, fontFamily: "monospace", color: "var(--muted)", width: 36, textAlign: "right" }}>
                {activeLayer.fontSize}px
              </span>
            </div>
          </div>

          {/* Text Color + BG Color */}
          <div className="text-editor-section">
            <label className="text-editor-label">Colors</label>
            <div className="text-editor-row">
              <div className="text-editor-color-swatch" style={{ backgroundColor: activeLayer.color }}>
                <input
                  type="color"
                  value={activeLayer.color}
                  onChange={(e) => handleUpdate({ color: e.target.value })}
                  title="Text Color"
                />
              </div>
              <span style={{ fontSize: 11, color: "var(--muted)", flex: 1 }}>Text</span>

              <div className="text-editor-color-swatch" style={{ backgroundColor: activeLayer.backgroundColor }}>
                <input
                  type="color"
                  value={activeLayer.backgroundColor}
                  onChange={(e) => handleUpdate({ backgroundColor: e.target.value })}
                  title="Background Color"
                />
              </div>
              <span style={{ fontSize: 11, color: "var(--muted)" }}>BG</span>
            </div>
            <div className="text-editor-row">
              <label className="text-editor-label" style={{ width: 48, flexShrink: 0 }}>BG α</label>
              <input
                type="range"
                className="text-editor-slider"
                min={0}
                max={1}
                step={0.05}
                value={activeLayer.backgroundOpacity}
                onChange={(e) => handleUpdate({ backgroundOpacity: Number(e.target.value) })}
              />
              <span style={{ fontSize: 11, fontFamily: "monospace", color: "var(--muted)", width: 36, textAlign: "right" }}>
                {Math.round(activeLayer.backgroundOpacity * 100)}%
              </span>
            </div>
          </div>

          {/* Bold / Italic / Uppercase / Align */}
          <div className="text-editor-section">
            <label className="text-editor-label">Format</label>
            <div className="text-editor-row">
              <button
                className={`text-editor-toggle ${activeLayer.bold ? "is-active" : ""}`}
                onClick={() => handleUpdate({ bold: !activeLayer.bold })}
                title="Bold"
              >
                <Bold style={{ width: 14, height: 14 }} />
              </button>
              <button
                className={`text-editor-toggle ${activeLayer.italic ? "is-active" : ""}`}
                onClick={() => handleUpdate({ italic: !activeLayer.italic })}
                title="Italic"
              >
                <Italic style={{ width: 14, height: 14 }} />
              </button>
              <button
                className={`text-editor-toggle ${activeLayer.uppercase ? "is-active" : ""}`}
                onClick={() => handleUpdate({ uppercase: !activeLayer.uppercase })}
                title="Uppercase"
              >
                <CaseSensitive style={{ width: 14, height: 14 }} />
              </button>
              <div style={{ width: 1, height: 20, background: "var(--border)", margin: "0 2px" }} />
              <button
                className={`text-editor-toggle ${activeLayer.textAlign === "left" ? "is-active" : ""}`}
                onClick={() => handleUpdate({ textAlign: "left" })}
                title="Align Left"
              >
                <AlignLeft style={{ width: 14, height: 14 }} />
              </button>
              <button
                className={`text-editor-toggle ${activeLayer.textAlign === "center" ? "is-active" : ""}`}
                onClick={() => handleUpdate({ textAlign: "center" })}
                title="Align Center"
              >
                <AlignCenter style={{ width: 14, height: 14 }} />
              </button>
              <button
                className={`text-editor-toggle ${activeLayer.textAlign === "right" ? "is-active" : ""}`}
                onClick={() => handleUpdate({ textAlign: "right" })}
                title="Align Right"
              >
                <AlignRight style={{ width: 14, height: 14 }} />
              </button>
            </div>
          </div>

          {/* Opacity */}
          <div className="text-editor-section">
            <label className="text-editor-label">Opacity</label>
            <div className="text-editor-row">
              <input
                type="range"
                className="text-editor-slider"
                min={0}
                max={1}
                step={0.05}
                value={activeLayer.opacity}
                onChange={(e) => handleUpdate({ opacity: Number(e.target.value) })}
              />
              <span style={{ fontSize: 11, fontFamily: "monospace", color: "var(--muted)", width: 36, textAlign: "right" }}>
                {Math.round(activeLayer.opacity * 100)}%
              </span>
            </div>
          </div>

          {/* ── Style Section (collapsible) ─────────────────── */}
          <div className="text-editor-collapse-header" onClick={() => toggleSection("style")}>
            <span className="text-editor-label" style={{ margin: 0 }}>Spacing & Transform</span>
            {openSections.style ? <ChevronDown style={{ width: 14, height: 14, color: "var(--muted)" }} /> : <ChevronRight style={{ width: 14, height: 14, color: "var(--muted)" }} />}
          </div>
          {openSections.style && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {/* Line Spacing */}
              <div className="text-editor-row">
                <label className="text-editor-label" style={{ width: 56, flexShrink: 0 }}>Line</label>
                <input
                  type="range"
                  className="text-editor-slider"
                  min={0.8}
                  max={3}
                  step={0.1}
                  value={activeLayer.lineSpacing}
                  onChange={(e) => handleUpdate({ lineSpacing: Number(e.target.value) })}
                />
                <span style={{ fontSize: 11, fontFamily: "monospace", color: "var(--muted)", width: 30, textAlign: "right" }}>
                  {activeLayer.lineSpacing.toFixed(1)}
                </span>
              </div>
              {/* Letter Spacing */}
              <div className="text-editor-row">
                <label className="text-editor-label" style={{ width: 56, flexShrink: 0 }}>Letter</label>
                <input
                  type="range"
                  className="text-editor-slider"
                  min={-5}
                  max={20}
                  step={0.5}
                  value={activeLayer.letterSpacing}
                  onChange={(e) => handleUpdate({ letterSpacing: Number(e.target.value) })}
                />
                <span style={{ fontSize: 11, fontFamily: "monospace", color: "var(--muted)", width: 30, textAlign: "right" }}>
                  {activeLayer.letterSpacing}px
                </span>
              </div>
              {/* Rotation */}
              <div className="text-editor-row">
                <label className="text-editor-label" style={{ width: 56, flexShrink: 0 }}>Rotate</label>
                <input
                  type="range"
                  className="text-editor-slider"
                  min={-180}
                  max={180}
                  step={1}
                  value={activeLayer.rotation}
                  onChange={(e) => handleUpdate({ rotation: Number(e.target.value) })}
                />
                <span style={{ fontSize: 11, fontFamily: "monospace", color: "var(--muted)", width: 30, textAlign: "right" }}>
                  {activeLayer.rotation}°
                </span>
              </div>
            </div>
          )}

          {/* ── Effects Section (collapsible) ───────────────── */}
          <div className="text-editor-collapse-header" onClick={() => toggleSection("effects")}>
            <span className="text-editor-label" style={{ margin: 0 }}>Shadow & Stroke</span>
            {openSections.effects ? <ChevronDown style={{ width: 14, height: 14, color: "var(--muted)" }} /> : <ChevronRight style={{ width: 14, height: 14, color: "var(--muted)" }} />}
          </div>
          {openSections.effects && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {/* Shadow */}
              <div className="text-editor-row">
                <button
                  className={`text-editor-toggle ${activeLayer.shadow.enabled ? "is-active" : ""}`}
                  onClick={() => handleUpdate({ shadow: { ...activeLayer.shadow, enabled: !activeLayer.shadow.enabled } })}
                  style={{ width: "auto", padding: "4px 10px", fontSize: 11 }}
                >
                  Shadow
                </button>
                {activeLayer.shadow.enabled && (
                  <>
                    <div className="text-editor-color-swatch" style={{ backgroundColor: activeLayer.shadow.color, width: 26, height: 26 }}>
                      <input
                        type="color"
                        value={activeLayer.shadow.color}
                        onChange={(e) => handleUpdate({ shadow: { ...activeLayer.shadow, color: e.target.value } })}
                      />
                    </div>
                    <input
                      type="range"
                      className="text-editor-slider"
                      min={0}
                      max={30}
                      step={1}
                      value={activeLayer.shadow.blur}
                      onChange={(e) => handleUpdate({ shadow: { ...activeLayer.shadow, blur: Number(e.target.value) } })}
                      title="Blur"
                    />
                  </>
                )}
              </div>

              {/* Stroke */}
              <div className="text-editor-row">
                <button
                  className={`text-editor-toggle ${activeLayer.stroke.enabled ? "is-active" : ""}`}
                  onClick={() => handleUpdate({ stroke: { ...activeLayer.stroke, enabled: !activeLayer.stroke.enabled } })}
                  style={{ width: "auto", padding: "4px 10px", fontSize: 11 }}
                >
                  Stroke
                </button>
                {activeLayer.stroke.enabled && (
                  <>
                    <div className="text-editor-color-swatch" style={{ backgroundColor: activeLayer.stroke.color, width: 26, height: 26 }}>
                      <input
                        type="color"
                        value={activeLayer.stroke.color}
                        onChange={(e) => handleUpdate({ stroke: { ...activeLayer.stroke, color: e.target.value } })}
                      />
                    </div>
                    <input
                      type="range"
                      className="text-editor-slider"
                      min={0.5}
                      max={8}
                      step={0.5}
                      value={activeLayer.stroke.width}
                      onChange={(e) => handleUpdate({ stroke: { ...activeLayer.stroke, width: Number(e.target.value) } })}
                      title="Width"
                    />
                  </>
                )}
              </div>
            </div>
          )}

          {/* ── Timing Section (collapsible) ─────────────────── */}
          <div className="text-editor-collapse-header" onClick={() => toggleSection("timing")}>
            <span className="text-editor-label" style={{ margin: 0 }}>Animation & Timing</span>
            {openSections.timing ? <ChevronDown style={{ width: 14, height: 14, color: "var(--muted)" }} /> : <ChevronRight style={{ width: 14, height: 14, color: "var(--muted)" }} />}
          </div>
          {openSections.timing && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {/* Animation Preset */}
              <div className="text-editor-row">
                <label className="text-editor-label" style={{ width: 56, flexShrink: 0 }}>Anim</label>
                <select
                  className="text-editor-select"
                  value={activeLayer.animation}
                  onChange={(e) => handleUpdate({ animation: e.target.value as TextAnimation })}
                >
                  {ANIMATION_OPTIONS.map((a) => (
                    <option key={a.value} value={a.value}>{a.label}</option>
                  ))}
                </select>
              </div>

              {/* Start / End Time */}
              <div className="text-editor-row">
                <label className="text-editor-label" style={{ width: 40, flexShrink: 0 }}>Start</label>
                <input
                  type="number"
                  className="text-time-input"
                  value={formatTimeInput(activeLayer.startTime)}
                  onChange={(e) => handleUpdate({ startTime: parseTimeInput(e.target.value) })}
                  min={0}
                  max={duration}
                  step={0.1}
                />
                <label className="text-editor-label" style={{ width: 28, flexShrink: 0, textAlign: "center" }}>End</label>
                <input
                  type="number"
                  className="text-time-input"
                  value={formatTimeInput(activeLayer.endTime === 0 ? duration : activeLayer.endTime)}
                  onChange={(e) => handleUpdate({ endTime: parseTimeInput(e.target.value) })}
                  min={0}
                  max={duration}
                  step={0.1}
                />
              </div>
              <div style={{ fontSize: 10, color: "var(--muted)", marginTop: -4 }}>
                Set end to video duration for &quot;always visible&quot;
              </div>
            </div>
          )}

          {/* ── Per-Clip Toggle (Merge Studio) ────────────────── */}
          {showClipToggle && (
            <div className="text-editor-section" style={{ borderTop: "1px solid var(--border)", paddingTop: 8 }}>
              <label className="text-editor-label">Scope</label>
              <div className="text-editor-row">
                <button
                  className={`text-editor-toggle ${!activeLayer.clipId ? "is-active" : ""}`}
                  onClick={() => handleUpdate({ clipId: undefined })}
                  style={{ width: "auto", padding: "4px 12px", fontSize: 11, flex: 1 }}
                >
                  Global
                </button>
                <button
                  className={`text-editor-toggle ${activeLayer.clipId ? "is-active" : ""}`}
                  onClick={() => handleUpdate({ clipId: clipId || "current" })}
                  style={{ width: "auto", padding: "4px 12px", fontSize: 11, flex: 1 }}
                >
                  This Clip
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

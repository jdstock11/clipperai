"use client";

import { useRef, useCallback, useEffect, useState } from "react";
import { useTextOverlayStore, TextLayer } from "@/store/useTextOverlayStore";
import "./text-overlay.css";

interface TextOverlayCanvasProps {
  currentTime: number;
  duration: number;
  clipId?: string;
}

export default function TextOverlayCanvas({ currentTime, duration, clipId }: TextOverlayCanvasProps) {
  const { layers, activeLayerId, setActiveLayerId, updateLayer, getVisibleLayers } = useTextOverlayStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);

  const visibleLayers = getVisibleLayers(currentTime, duration, clipId);

  // ── Drag handling ─────────────────────────────────────────────────

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, layer: TextLayer) => {
      e.preventDefault();
      e.stopPropagation();
      setActiveLayerId(layer.id);

      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const mouseXPercent = (e.clientX - rect.left) / rect.width;
      const mouseYPercent = (e.clientY - rect.top) / rect.height;

      draggingRef.current = {
        id: layer.id,
        offsetX: mouseXPercent - layer.x,
        offsetY: mouseYPercent - layer.y,
      };

      const target = e.currentTarget as HTMLElement;
      target.setPointerCapture(e.pointerId);
    },
    [setActiveLayerId]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!draggingRef.current || !containerRef.current) return;
      e.preventDefault();

      const rect = containerRef.current.getBoundingClientRect();
      const mouseXPercent = (e.clientX - rect.left) / rect.width;
      const mouseYPercent = (e.clientY - rect.top) / rect.height;

      const newX = Math.max(0.02, Math.min(0.98, mouseXPercent - draggingRef.current.offsetX));
      const newY = Math.max(0.02, Math.min(0.98, mouseYPercent - draggingRef.current.offsetY));

      updateLayer(draggingRef.current.id, { x: newX, y: newY });
    },
    [updateLayer]
  );

  const handlePointerUp = useCallback(() => {
    draggingRef.current = null;
  }, []);

  // ── Build inline styles for a layer ────────────────────────────────

  const getLayerStyle = (layer: TextLayer): React.CSSProperties => {
    const style: React.CSSProperties = {
      left: `${layer.x * 100}%`,
      top: `${layer.y * 100}%`,
      transform: `translate(-50%, -50%) rotate(${layer.rotation}deg) scale(${layer.scaleX}, ${layer.scaleY})`,
      fontSize: `${layer.fontSize}px`,
      fontFamily: `'${layer.fontFamily}', sans-serif`,
      color: layer.color,
      opacity: layer.opacity,
      fontWeight: layer.bold ? 700 : 400,
      fontStyle: layer.italic ? "italic" : "normal",
      textTransform: layer.uppercase ? "uppercase" : "none",
      textAlign: layer.textAlign,
      lineHeight: layer.lineSpacing,
      letterSpacing: `${layer.letterSpacing}px`,
      // CSS custom property for animation keyframes
      ["--layer-rotation" as any]: `${layer.rotation}deg`,
    };

    // Background
    if (layer.backgroundOpacity > 0) {
      const bgColor = hexToRgba(layer.backgroundColor, layer.backgroundOpacity);
      style.backgroundColor = bgColor;
      style.padding = "4px 12px";
      style.borderRadius = "4px";
    }

    // Shadow
    if (layer.shadow.enabled) {
      style.textShadow = `${layer.shadow.x}px ${layer.shadow.y}px ${layer.shadow.blur}px ${layer.shadow.color}`;
    }

    // Stroke
    if (layer.stroke.enabled) {
      style.WebkitTextStroke = `${layer.stroke.width}px ${layer.stroke.color}`;
      // Paint-order trick for cleaner stroke rendering
      style.paintOrder = "stroke fill";
    }

    return style;
  };

  const getAnimationClass = (layer: TextLayer): string => {
    if (layer.animation === "none") return "";
    return `text-anim-${layer.animation}`;
  };

  return (
    <div
      ref={containerRef}
      className="text-overlay-canvas"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {visibleLayers.map((layer) => (
        <div
          key={layer.id}
          className={`text-overlay-layer ${activeLayerId === layer.id ? "is-active" : ""} ${getAnimationClass(layer)}`}
          style={getLayerStyle(layer)}
          onPointerDown={(e) => handlePointerDown(e, layer)}
        >
          {layer.text || "…"}
        </div>
      ))}
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

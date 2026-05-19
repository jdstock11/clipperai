"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useEditorStore } from "@/store/editorStore";
import Timeline from "@/components/cut-studio/Timeline";
import Toolbar from "@/components/cut-studio/Toolbar";
import ManualTimeRemove from "@/components/cut-studio/ManualTimeRemove";
import {
  ArrowLeft, Film, Monitor, Smartphone, Square, Music, 
  Loader2, Zap, Clock, Cpu, Volume2, CheckCircle2, Layers, Download, Play, Pause
} from "lucide-react";

const BACKEND_API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

function formatTime(s: number): string {
  if (!s || isNaN(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

const FORMAT_OPTIONS = [
  { id: "landscape", label: "Landscape", sub: "16:9", icon: Monitor },
  { id: "portrait", label: "Portrait", sub: "9:16", icon: Smartphone },
  { id: "square", label: "Square", sub: "1:1", icon: Square },
  { id: "audio", label: "Audio", sub: "MP3", icon: Music },
];

export default function Editor() {
  const router = useRouter();
  
  const { 
    playing, currentTime, duration, mode, startTime, endTime, removals, watermark, setWatermark,
    setPlaying, setCurrentTime, setDuration, setTrimRange 
  } = useEditorStore();

  const [videoData, setVideoData] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  // Preview state
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewReady, setPreviewReady] = useState(false);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState("Preparing HD Preview...");
  const [metadata, setMetadata] = useState<any>(null);

  // Export & Queue state
  const [exportFormat, setExportFormat] = useState("landscape");
  const [isExporting, setIsExporting] = useState(false);
  const [exportResult, setExportResult] = useState<string | null>(null);
  const [exportProgress, setExportProgress] = useState(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    setMounted(true);
    const data = sessionStorage.getItem("videoData");
    if (data) {
      const parsed = JSON.parse(data);
      setVideoData(parsed);
      setDuration(parsed.duration || 0);
      
      // If it's a local upload, we already have the streamUrl ready
      if (parsed.isLocalUpload && parsed.streamUrl) {
        setStreamUrl(parsed.streamUrl);
        setPreviewReady(true);
      }
    } else {
      router.push("/");
    }
  }, [router, setDuration]);

  // Handle Playhead Sync
  useEffect(() => {
    if (videoRef.current) {
      if (Math.abs(videoRef.current.currentTime - currentTime) > 0.5) {
        videoRef.current.currentTime = currentTime;
      }
    }
  }, [currentTime]);

  useEffect(() => {
    if (videoRef.current) {
      if (playing) videoRef.current.play().catch(() => setPlaying(false));
      else videoRef.current.pause();
    }
  }, [playing, setPlaying]);

  const handleTimeUpdate = () => {
    if (videoRef.current && playing) {
      setCurrentTime(videoRef.current.currentTime);
      
      // Auto-skip removals
      if (mode === 'remove' || mode === 'multi') {
        const cur = videoRef.current.currentTime;
        const skipRemoval = removals.find(r => cur >= r.start && cur < r.end);
        if (skipRemoval) {
          videoRef.current.currentTime = skipRemoval.end;
          setCurrentTime(skipRemoval.end);
        }
      }
      
      // Trim mode auto-stop
      if (mode === 'trim' && videoRef.current.currentTime >= endTime) {
        setPlaying(false);
        videoRef.current.currentTime = startTime;
        setCurrentTime(startTime);
      }
    }
  };

  const handleGeneratePreview = async () => {
    if (!videoData) return;
    setPreviewLoading(true);
    try {
      const res = await fetch(`${BACKEND_API}/prepare-preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: videoData.url, duration: videoData.duration })
      });
      const data = await res.json();

      if (data.status === 'ready') {
        setStreamUrl(data.streamUrl);
        if (data.thumbnails && data.thumbnails.length > 0) setThumbnail(data.thumbnails[0].url);
        if (data.metadata) {
          setMetadata(data.metadata);
          if (data.metadata.duration > 0) setDuration(data.metadata.duration);
        }
        setPreviewReady(true);
      } else {
        alert(data.error || 'Preview generation failed');
      }
    } catch (err: any) {
      alert('Error generating preview: ' + err.message);
    } finally {
      setPreviewLoading(false);
    }
  };

  // Convert Removals to Keeps for backend
  const calculateKeeps = () => {
    if (removals.length === 0) return [];
    const keeps: Array<{start: number, end: number}> = [];
    let cur = 0;
    
    // Sort removals by start time
    const sorted = [...removals].sort((a, b) => a.start - b.start);
    
    sorted.forEach(r => {
      if (r.start > cur) {
        keeps.push({ start: cur, end: r.start });
      }
      cur = Math.max(cur, r.end);
    });
    
    if (cur < duration) {
      keeps.push({ start: cur, end: duration });
    }
    
    return keeps;
  };

  const pollJobStatus = async (jobId: string) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${BACKEND_API}/jobs/${jobId}`);
        const data = await res.json();
        
        if (data.status === 'PROCESSING') {
          setExportProgress(data.progress || 10);
        } else if (data.status === 'COMPLETED') {
          clearInterval(interval);
          setExportProgress(100);
          const filename = data.result?.fileUrl?.split('/').pop();
          setExportResult(`${BACKEND_API}/download/${filename}`);
          setIsExporting(false);
        } else if (data.status === 'FAILED') {
          clearInterval(interval);
          setIsExporting(false);
          alert('Export failed: ' + data.error);
        }
      } catch (err) {
        console.error('Polling error', err);
      }
    }, 2000);
  };

  const handleExport = async () => {
    setIsExporting(true);
    setExportResult(null);
    setExportProgress(0);

    const cuts = mode === 'trim' ? [{ start: startTime, end: endTime }] : calculateKeeps();

    try {
      const res = await fetch(`${BACKEND_API}/cut-video`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceUrl: videoData.url,
          streamUrl,
          startTime: mode === 'trim' ? startTime : 0,
          endTime: mode === 'trim' ? endTime : duration,
          cuts: (mode === 'remove' || mode === 'multi') ? cuts : undefined,
          watermark: watermark.enabled ? watermark : undefined,
          format: exportFormat,
        }),
      });

      const data = await res.json();
      if (data.jobId) {
        pollJobStatus(data.jobId);
      } else {
        throw new Error(data.error || 'Export failed');
      }
    } catch (err: any) {
      alert("Export error: " + err.message);
      setIsExporting(false);
    }
  };

  if (!videoData || !mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  // Calculate final clip duration
  let clipDuration = duration;
  if (mode === 'trim') {
    clipDuration = endTime - startTime;
  } else if (mode === 'remove' || mode === 'multi') {
    const removedSecs = removals.reduce((acc, cur) => acc + (cur.end - cur.start), 0);
    clipDuration = Math.max(0, duration - removedSecs);
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#050505]">
      {/* HEADER */}
      <header className="px-5 py-3.5 flex items-center gap-4 z-20 border-b border-[var(--border)] bg-[#0a0a0c]">
        <button
          className="text-[var(--muted)] hover:text-white flex items-center gap-2 transition-colors text-sm font-medium"
          onClick={() => router.push("/")}
        >
          <ArrowLeft size={16} /> Back
        </button>
        <div className="font-bold text-sm">ClipForge <span className="text-gradient">AI</span> / Editor</div>
      </header>

      {/* MAIN */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* LEFT: Player + Timeline */}
        <div className="flex-1 flex flex-col min-w-0 p-5 space-y-4 overflow-y-auto">
          
          {/* Top Toolbar */}
          {previewReady && <Toolbar />}

          {/* Video Player */}
          <div className="flex-1 flex items-center justify-center min-h-[40vh]">
            <div className="w-full max-w-4xl aspect-video rounded-xl overflow-hidden relative border border-[var(--border)] bg-black shadow-[0_0_50px_rgba(0,0,0,0.8)]">
              {!previewReady ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-5">
                  {previewLoading ? (
                    <div className="text-center space-y-4">
                      <Loader2 className="w-8 h-8 text-[var(--primary)] animate-spin mx-auto" />
                      <p className="font-semibold text-white">Processing HD Source...</p>
                    </div>
                  ) : (
                    <button
                      onClick={handleGeneratePreview}
                      className="btn-glow px-6 py-2.5 rounded-xl font-bold flex items-center gap-2"
                    >
                      <Zap className="w-4 h-4" /> Load Video Editor
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    src={streamUrl ? `${BACKEND_API.replace('/api', '')}${streamUrl}` : undefined}
                    className="w-full h-full object-contain pointer-events-none"
                    onTimeUpdate={handleTimeUpdate}
                  />

                  {/* Watermark Overlay */}
                  {watermark.enabled && (
                    <div 
                      className="absolute border-2 border-[var(--accent)] shadow-[0_0_20px_rgba(0,0,0,0.5)] cursor-move group z-10"
                      style={{
                        left: `${watermark.x * 100}%`,
                        top: `${watermark.y * 100}%`,
                        width: `${watermark.w * 100}%`,
                        height: `${watermark.h * 100}%`,
                        backdropFilter: watermark.mode === 'blur' ? 'blur(15px)' : 'none',
                        backgroundColor: watermark.mode === 'crop' ? 'rgba(0,0,0,0.9)' : 'rgba(255,255,255,0.05)',
                      }}
                      onPointerDown={(e) => {
                        e.preventDefault();
                        const target = e.currentTarget;
                        const parent = target.parentElement;
                        if (!parent) return;
                        
                        const rect = parent.getBoundingClientRect();
                        const startX = e.clientX;
                        const startY = e.clientY;
                        const startLeft = watermark.x * rect.width;
                        const startTop = watermark.y * rect.height;

                        const onPointerMove = (moveEvent: PointerEvent) => {
                          const dx = moveEvent.clientX - startX;
                          const dy = moveEvent.clientY - startY;
                          let newX = (startLeft + dx) / rect.width;
                          let newY = (startTop + dy) / rect.height;
                          
                          newX = Math.max(0, Math.min(newX, 1 - watermark.w));
                          newY = Math.max(0, Math.min(newY, 1 - watermark.h));
                          setWatermark({ x: newX, y: newY });
                        };

                        const onPointerUp = () => {
                          window.removeEventListener('pointermove', onPointerMove);
                          window.removeEventListener('pointerup', onPointerUp);
                        };

                        window.addEventListener('pointermove', onPointerMove);
                        window.addEventListener('pointerup', onPointerUp);
                      }}
                    >
                      <div className="absolute -top-6 left-0 bg-[var(--accent)] text-white text-[10px] px-2 py-0.5 rounded font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                        {watermark.mode.toUpperCase()} WATERMARK
                      </div>
                      {/* Resize Handle */}
                      <div 
                        className="absolute bottom-0 right-0 w-4 h-4 bg-[var(--accent)] cursor-se-resize rounded-tl opacity-0 group-hover:opacity-100 transition-opacity"
                        onPointerDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const target = e.currentTarget;
                          const parent = target.parentElement?.parentElement;
                          if (!parent) return;
                          
                          const rect = parent.getBoundingClientRect();
                          const startX = e.clientX;
                          const startY = e.clientY;
                          const startW = watermark.w * rect.width;
                          const startH = watermark.h * rect.height;

                          const onPointerMove = (moveEvent: PointerEvent) => {
                            const dx = moveEvent.clientX - startX;
                            const dy = moveEvent.clientY - startY;
                            let newW = (startW + dx) / rect.width;
                            let newH = (startH + dy) / rect.height;
                            
                            newW = Math.max(0.05, Math.min(newW, 1 - watermark.x));
                            newH = Math.max(0.05, Math.min(newH, 1 - watermark.y));
                            setWatermark({ w: newW, h: newH });
                          };

                          const onPointerUp = () => {
                            window.removeEventListener('pointermove', onPointerMove);
                            window.removeEventListener('pointerup', onPointerUp);
                          };

                          window.addEventListener('pointermove', onPointerMove);
                          window.addEventListener('pointerup', onPointerUp);
                        }}
                      />
                    </div>
                  )}

                  {/* Invisible click overlay for play/pause to avoid interfering with watermark box */}
                  <div className="absolute inset-0 z-0" onClick={() => setPlaying(!playing)} />

                  {/* Custom Player Controls overlay */}
                  <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/80 to-transparent flex items-center gap-4 opacity-0 hover:opacity-100 transition-opacity">
                    <button onClick={() => setPlaying(!playing)} className="w-10 h-10 rounded-full bg-[var(--primary)] flex items-center justify-center text-white shadow-[0_0_15px_var(--primary)]">
                      {playing ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
                    </button>
                    <span className="font-mono text-sm text-white drop-shadow-md">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Manual Time Remove */}
          {previewReady && (mode === 'remove' || mode === 'multi') && <ManualTimeRemove />}

          {/* Timeline */}
          {previewReady && <Timeline />}
        </div>

        {/* RIGHT: Sidebar */}
        <aside className="w-full lg:w-[320px] bg-[#0a0a0c] border-l border-[var(--border)] flex flex-col overflow-y-auto">
          <div className="p-5 space-y-6">
            
            {/* Format Selection */}
            <div className="space-y-3">
              <h3 className="font-bold text-sm flex items-center gap-2 text-white">
                <Layers className="w-4 h-4 text-[var(--primary)]" /> Export Settings
              </h3>
              
              {watermark.enabled && (
                <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-xl p-3 mb-3">
                  <div className="text-xs font-bold text-indigo-400 mb-2">Watermark Removal</div>
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => setWatermark({ mode: 'blur' })}
                      className={`text-[10px] py-1.5 rounded border transition-colors ${watermark.mode === 'blur' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-black/20 border-white/10 text-[var(--muted)] hover:border-white/30'}`}
                    >
                      AI BLUR (delogo)
                    </button>
                    <button 
                      onClick={() => setWatermark({ mode: 'crop' })}
                      className={`text-[10px] py-1.5 rounded border transition-colors ${watermark.mode === 'crop' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-black/20 border-white/10 text-[var(--muted)] hover:border-white/30'}`}
                    >
                      CROP VIDEO
                    </button>
                  </div>
                  <p className="text-[9px] text-[var(--muted)] mt-2 leading-tight">
                    {watermark.mode === 'blur' 
                      ? 'Replaces the selected area by interpolating surrounding pixels. May increase render time.' 
                      : 'Crops out the selected edges of the video entirely.'}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                {FORMAT_OPTIONS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setExportFormat(f.id)}
                    className={`relative rounded-xl p-3 border transition-all duration-200 text-left ${
                      exportFormat === f.id
                        ? "border-[var(--primary)] bg-[var(--primary)]/10"
                        : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-hover)]"
                    }`}
                  >
                    <f.icon className={`w-4 h-4 mb-2 ${exportFormat === f.id ? "text-[var(--primary)]" : "text-[var(--muted)]"}`} />
                    <div className="text-xs font-bold text-white">{f.label}</div>
                    <div className="text-[10px] text-[var(--muted)]">{f.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Export Summary */}
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 space-y-3 shadow-inner">
              <div className="flex justify-between items-center text-sm">
                <span className="text-[var(--muted)]">Original</span>
                <span className="font-mono text-white">{formatTime(duration)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-[var(--muted)]">Final Length</span>
                <span className="font-mono font-bold text-[var(--primary)]">{formatTime(clipDuration)}</span>
              </div>
              {mode !== 'trim' && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-[var(--muted)]">Cuts</span>
                  <span className="font-mono text-red-400">{removals.length} removed</span>
                </div>
              )}
            </div>

            {/* Export Button */}
            <div className="space-y-3">
              <button
                onClick={handleExport}
                disabled={isExporting || !previewReady}
                className="w-full btn-glow py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 text-sm transition-all"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Rendering... {exportProgress}%</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Export Video</span>
                  </>
                )}
              </button>

              {isExporting && (
                <div className="w-full h-1.5 bg-[var(--surface)] rounded-full overflow-hidden border border-[var(--border)]">
                  <div 
                    className="h-full bg-[var(--primary)] transition-all duration-300"
                    style={{ width: `${exportProgress}%` }}
                  />
                </div>
              )}

              {exportResult && (
                <a
                  href={exportResult}
                  download
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-emerald-500/50 bg-emerald-500/10 text-emerald-400 text-sm font-bold hover:bg-emerald-500/20 transition-colors shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                >
                  <CheckCircle2 className="w-4 h-4" /> Save Final Video
                </a>
              )}
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}

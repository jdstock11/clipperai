"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Scissors, Play, Pause, Download, Film,
  Monitor, Smartphone, Square, Music, Loader2, Zap,
  Clock, HardDrive, Cpu, Volume2, CheckCircle2, Layers, Type, Lock
} from "lucide-react";
import TextOverlayCanvas from "@/components/text-overlay/TextOverlayCanvas";
import TextOverlayEditor from "@/components/text-overlay/TextOverlayEditor";
import { useTextOverlayStore } from "@/store/useTextOverlayStore";

const BACKEND_API = process.env.NEXT_PUBLIC_API_URL || '';

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

const QUALITY_OPTIONS = [
  "Fast Preview",
  "Standard",
  "HD 720p",
  "Full HD 1080p",
];

export default function Editor() {
  const router = useRouter();

  const [videoData, setVideoData] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  // Player state
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Trim state
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);

  // Preview state
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewReady, setPreviewReady] = useState(false);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState("Preparing HD Preview...");
  const [metadata, setMetadata] = useState<any>(null);

  // Export state
  const [exportFormat, setExportFormat] = useState("landscape");
  const [exportQuality, setExportQuality] = useState("HD 720p");
  const [isExporting, setIsExporting] = useState(false);
  const [exportResult, setExportResult] = useState<string | null>(null);

  // Text overlay
  const [sidebarTab, setSidebarTab] = useState<'export' | 'text'>('export');
  const { layers: textLayers, clearLayers: clearTextLayers } = useTextOverlayStore();

  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    setMounted(true);
    const data = sessionStorage.getItem("videoData");
    if (data) {
      const parsed = JSON.parse(data);
      setVideoData(parsed);
      setDuration(parsed.duration || 0);
      
      if (parsed.startTime !== undefined) {
        setStartTime(parsed.startTime);
      }
      
      if (parsed.endTime !== undefined) {
        setEndTime(parsed.endTime);
      } else {
        setEndTime(parsed.duration || 0);
      }
      
      if (parsed.exportFormat) {
        setExportFormat(parsed.exportFormat);
      }
    } else {
      router.push("/");
    }
  }, [router]);

  // Auto-generate preview
  useEffect(() => {
    if (videoData && !previewReady && !previewLoading && !streamUrl) {
      handleGeneratePreview();
    }
  }, [videoData, previewReady, previewLoading, streamUrl]);

  // Loading message rotation
  useEffect(() => {
    if (!previewLoading) return;
    const messages = [
      "Downloading from YouTube...",
      "Analyzing video streams...",
      "Processing HD preview...",
      "Encoding for browser playback...",
      "Optimizing audio tracks...",
      "Generating timeline...",
      "Almost ready...",
    ];
    let i = 0;
    const interval = setInterval(() => {
      i = (i + 1) % messages.length;
      setLoadingMessage(messages[i]);
    }, 4000);
    return () => clearInterval(interval);
  }, [previewLoading]);

  const handleGeneratePreview = async () => {
    if (!videoData) return;
    setPreviewLoading(true);
    try {
      const res = await fetch(`${BACKEND_API}/prepare-preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: videoData.url, duration: videoData.duration })
      });
      let data = await res.json();

      if (data.status === 'processing') {
        const previewId = data.previewId;
        while (data.status === 'processing') {
          await new Promise(resolve => setTimeout(resolve, 2000));
          const statusRes = await fetch(`${BACKEND_API}/preview-status/${previewId}`);
          data = await statusRes.json();
        }
      }

      if (data.status === 'ready') {
        setStreamUrl(data.streamUrl);
        if (data.thumbnails && data.thumbnails.length > 0) {
          setThumbnail(data.thumbnails[0].url);
        }
        if (data.metadata) {
          setMetadata(data.metadata);
          if (data.metadata.duration && data.metadata.duration > 0) {
            setDuration(data.metadata.duration);
            
            // Fix: Don't overwrite pre-loaded endTime from AI Analyzer
            if (videoData?.endTime !== undefined) {
              // Ensure it doesn't exceed actual duration
              setEndTime(Math.min(videoData.endTime, data.metadata.duration));
            } else {
              setEndTime(data.metadata.duration);
            }
          }
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

  const [exportProgress, setExportProgress] = useState(0);

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
          const downloadUrl = `${BACKEND_API}/download/${filename}`;
          setExportResult(downloadUrl);
          
          // Auto trigger download for PC/Mobile
          const a = document.createElement('a');
          a.href = downloadUrl;
          a.download = filename || 'clip.mp4';
          a.style.display = 'none';
          document.body.appendChild(a);
          a.click();
          
          // Cleanup
          setTimeout(() => {
            document.body.removeChild(a);
          }, 100);
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

    try {
      const res = await fetch(`${BACKEND_API}/create-clip`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          sourceUrl: videoData.url,
          streamUrl,
          startTime,
          endTime,
          format: exportFormat,
          quality: exportQuality,
          textLayers: textLayers.length > 0 ? textLayers : undefined,
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

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (playing) videoRef.current.pause();
      else videoRef.current.play();
      setPlaying(!playing);
    }
  };

  const seekTo = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    seekTo(x * duration);
  };

  if (!videoData || !mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  const clipDuration = endTime - startTime;

  return (
    <div className="min-h-screen flex flex-col" style={{ fontFamily: 'var(--font-outfit), system-ui, sans-serif' }}>
      {/* ── Header ──────────────────────────────────────────── */}
      <header className="glass-strong px-5 py-3.5 flex items-center gap-4 z-20 border-b border-[var(--border)]">
        <button
          className="text-[var(--muted)] hover:text-white flex items-center gap-2 transition-colors text-sm font-medium"
          onClick={() => router.push("/")}
        >
          <ArrowLeft size={16} /> Back
        </button>

        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="absolute inset-0 bg-[var(--primary)] blur-md opacity-30 rounded-full" />
            <Scissors size={16} className="text-[var(--primary)] relative z-10" />
          </div>
          <span className="font-bold text-sm">ClipForge <span className="text-gradient">AI</span></span>
        </div>

        <div className="ml-auto text-sm text-[var(--muted)] truncate max-w-md font-medium">
          {videoData.title}
        </div>
      </header>

      {/* ── Main Layout ─────────────────────────────────────── */}
      <main className="flex-1 flex flex-col lg:flex-row gap-0 overflow-hidden">

        {/* ── Left: Player + Timeline ──────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0">

          {/* Video Player */}
          <div className="flex-1 flex items-center justify-center p-5 pb-3">
            <div className="w-full max-w-4xl aspect-video rounded-2xl overflow-hidden relative border border-[var(--border)] bg-black/80">
              {/* Glow behind player */}
              <div className="absolute -inset-1 bg-gradient-to-br from-[var(--primary)]/5 to-[var(--accent)]/5 rounded-2xl blur-xl -z-10" />

              {!previewReady ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-5">
                  {previewLoading ? (
                    <>
                      {/* Animated loading state */}
                      <div className="relative">
                        <div className="w-20 h-20 rounded-full border-2 border-[var(--border)]" />
                        <div className="absolute inset-0 w-20 h-20 rounded-full border-2 border-t-[var(--primary)] animate-spin" />
                        <Film className="absolute inset-0 m-auto w-8 h-8 text-[var(--primary)] pulse-glow" />
                      </div>
                      <div className="text-center">
                        <p className="text-white font-semibold mb-1.5">{loadingMessage}</p>
                        <p className="text-[var(--muted)] text-sm">This may take a moment for longer videos</p>
                      </div>
                      {/* Shimmer bars */}
                      <div className="w-64 space-y-2">
                        <div className="h-1.5 rounded-full shimmer bg-[var(--surface-2)]" />
                        <div className="h-1.5 rounded-full shimmer bg-[var(--surface-2)] w-3/4 mx-auto" style={{ animationDelay: '0.3s' }} />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-16 h-16 rounded-full bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center">
                        <Film className="w-7 h-7 text-[var(--muted)]" />
                      </div>
                      <div className="text-center">
                        <p className="text-[var(--muted)] mb-3">Preview not generated yet</p>
                        <button
                          onClick={handleGeneratePreview}
                          disabled={previewLoading}
                          className="btn-glow px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 text-sm mx-auto"
                        >
                          <Zap className="w-4 h-4" />
                          <span>Generate Preview</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    src={streamUrl ? (streamUrl.startsWith('http') ? streamUrl : `${BACKEND_API.replace('/api', '')}${streamUrl}`) : undefined}
                    className="w-full h-full object-contain"
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={() => {
                      if (videoRef.current) {
                        const d = videoRef.current.duration;
                        if (d && d > 0 && !isNaN(d)) {
                          setDuration(d);
                          setEndTime(d);
                        }
                      }
                    }}
                    onPlay={() => setPlaying(true)}
                    onPause={() => setPlaying(false)}
                    controls
                    preload="metadata"
                  />
                  {/* Text Overlay Canvas */}
                  <TextOverlayCanvas currentTime={currentTime} duration={duration} />
                </>
              )}
            </div>
          </div>

          {/* Timeline + Controls */}
          {previewReady && (
            <div className="px-5 pb-5 space-y-3">
              {/* Time display + controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={togglePlay}
                    className="w-9 h-9 rounded-full bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center hover:border-[var(--primary)]/30 transition-colors"
                  >
                    {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                  </button>
                  <span className="text-sm font-mono text-[var(--muted)]">
                    <span className="text-white">{formatTime(currentTime)}</span>
                    {" / "}
                    {formatTime(duration)}
                  </span>
                </div>
                <div className="text-xs text-[var(--muted)] font-medium">
                  Selection: {formatTime(startTime)} → {formatTime(endTime)} ({formatTime(clipDuration)})
                </div>
              </div>

              {/* Visual Timeline */}
              <div className="timeline-track" onClick={handleTimelineClick}>
                {/* Selection range */}
                <div
                  className="timeline-selection"
                  style={{
                    left: `${(startTime / duration) * 100}%`,
                    width: `${((endTime - startTime) / duration) * 100}%`,
                  }}
                />
                {/* Playhead */}
                <div
                  className="timeline-playhead"
                  style={{ left: `${(currentTime / duration) * 100}%` }}
                />
                {/* Waveform bars (decorative) */}
                <div className="absolute inset-0 flex items-end px-1 gap-[2px] opacity-20">
                  {Array.from({ length: 80 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex-1 bg-[var(--primary)] rounded-t-sm"
                      style={{ height: `${15 + Math.sin(i * 0.5) * 30 + Math.random() * 20}%` }}
                    />
                  ))}
                </div>
              </div>

              {/* Trim range sliders */}
              <div className="flex items-center gap-4">
                <div className="flex-1 flex items-center gap-2">
                  <span className="text-xs text-[var(--muted)] w-8 font-medium">Start</span>
                  <input
                    type="range"
                    min={0}
                    max={duration}
                    step={0.1}
                    value={startTime}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      if (v < endTime) setStartTime(v);
                    }}
                    className="flex-1"
                  />
                  <span className="text-xs font-mono text-[var(--muted)] w-10 text-right">{formatTime(startTime)}</span>
                </div>
                <div className="flex-1 flex items-center gap-2">
                  <span className="text-xs text-[var(--muted)] w-8 font-medium">End</span>
                  <input
                    type="range"
                    min={0}
                    max={duration}
                    step={0.1}
                    value={endTime}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      if (v > startTime) setEndTime(v);
                    }}
                    className="flex-1"
                  />
                  <span className="text-xs font-mono text-[var(--muted)] w-10 text-right">{formatTime(endTime)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Right Sidebar ────────────────────────────────── */}
        <aside className="w-full lg:w-[340px] border-t lg:border-t-0 lg:border-l border-[var(--border)] flex flex-col overflow-y-auto">
          {/* Sidebar Tab Toggle */}
          <div className="flex border-b border-[var(--border)]">
            <button
              onClick={() => setSidebarTab('export')}
              className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                sidebarTab === 'export'
                  ? 'text-[var(--primary)] border-b-2 border-[var(--primary)] bg-[var(--primary-dim)]'
                  : 'text-[var(--muted)] hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Export
            </button>
            <button
              onClick={() => setSidebarTab('text')}
              className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                sidebarTab === 'text'
                  ? 'text-[var(--primary)] border-b-2 border-[var(--primary)] bg-[var(--primary-dim)]'
                  : 'text-[var(--muted)] hover:text-white'
              }`}
            >
              <Type className="w-3.5 h-3.5" />
              Text{textLayers.length > 0 ? ` (${textLayers.length})` : ''}
            </button>
          </div>

          <div className="p-5 space-y-5 flex-1">

            {sidebarTab === 'text' ? (
              <TextOverlayEditor duration={duration} />
            ) : (
            <>
            {/* Video Info Card */}
            <div className="glass rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Film className="w-4 h-4 text-[var(--primary)]" />
                <h3 className="font-bold text-sm">Video Info</h3>
              </div>
              {thumbnail && (
                <img
                  src={thumbnail.startsWith('http') ? thumbnail : `${BACKEND_API.replace('/api', '')}${thumbnail}`}
                  alt="Thumbnail"
                  className="w-full aspect-video object-cover rounded-lg border border-[var(--border)]"
                />
              )}
              <p className="text-sm text-[var(--muted)] leading-relaxed line-clamp-2">{videoData.title}</p>

              {/* Metadata grid */}
              {metadata && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="bg-[var(--surface)] rounded-lg p-2.5 border border-[var(--border)]">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Clock className="w-3 h-3 text-[var(--muted)]" />
                      <span className="text-[10px] text-[var(--muted)] uppercase font-semibold tracking-wider">Duration</span>
                    </div>
                    <span className="text-sm font-bold">{formatTime(metadata.duration || duration)}</span>
                  </div>
                  <div className="bg-[var(--surface)] rounded-lg p-2.5 border border-[var(--border)]">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Monitor className="w-3 h-3 text-[var(--muted)]" />
                      <span className="text-[10px] text-[var(--muted)] uppercase font-semibold tracking-wider">Resolution</span>
                    </div>
                    <span className="text-sm font-bold">{metadata.width}×{metadata.height}</span>
                  </div>
                  <div className="bg-[var(--surface)] rounded-lg p-2.5 border border-[var(--border)]">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Cpu className="w-3 h-3 text-[var(--muted)]" />
                      <span className="text-[10px] text-[var(--muted)] uppercase font-semibold tracking-wider">Codec</span>
                    </div>
                    <span className="text-sm font-bold">{metadata.codec || 'H.264'}</span>
                  </div>
                  <div className="bg-[var(--surface)] rounded-lg p-2.5 border border-[var(--border)]">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Volume2 className="w-3 h-3 text-[var(--muted)]" />
                      <span className="text-[10px] text-[var(--muted)] uppercase font-semibold tracking-wider">Audio</span>
                    </div>
                    <span className="text-sm font-bold">{metadata.audioCodec || 'AAC'}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Format Selection */}
            <div className="space-y-3">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Layers className="w-4 h-4 text-[var(--primary)]" />
                Export Format
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {FORMAT_OPTIONS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setExportFormat(f.id)}
                    className={`relative rounded-xl p-3.5 border transition-all duration-200 text-left ${
                      exportFormat === f.id
                        ? "border-[var(--primary)] bg-[var(--primary-dim)]"
                        : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-hover)]"
                    }`}
                  >
                    <f.icon className={`w-5 h-5 mb-2 ${exportFormat === f.id ? "text-[var(--primary)]" : "text-[var(--muted)]"}`} />
                    <div className="text-sm font-bold">{f.label}</div>
                    <div className="text-[11px] text-[var(--muted)]">{f.sub}</div>
                    {exportFormat === f.id && (
                      <div className="absolute top-2 right-2">
                        <CheckCircle2 className="w-4 h-4 text-[var(--primary)]" />
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {/* Quality Selection */}
              <div className="mt-4">
                <div className="text-xs font-bold text-white mb-2 flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-yellow-400" /> Export Quality
                </div>
                <div className="flex flex-col gap-1.5">
                  {QUALITY_OPTIONS.map(q => (
                    <button
                      key={q}
                      onClick={() => setExportQuality(q)}
                      className={`text-left px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
                        exportQuality === q
                          ? 'bg-[var(--primary)]/20 border-[var(--primary)] text-white font-bold'
                          : 'bg-black/20 border-[var(--border)] text-[var(--muted)] hover:border-white/30 hover:text-white'
                      }`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Clip Info */}
            <div className="glass rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--muted)]">Clip Duration</span>
                <span className="font-bold font-mono">{formatTime(clipDuration)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--muted)]">Quality</span>
                <span className="font-bold flex items-center gap-1.5">
                  {exportQuality}
                </span>
              </div>
              {metadata && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--muted)]">Bitrate</span>
                  <span className="font-bold font-mono">{metadata.bitrate || '—'} kbps</span>
                </div>
              )}
            </div>

            {/* Export Button */}
            <button
              onClick={handleExport}
              disabled={isExporting || !previewReady}
              className="w-full btn-glow py-3.5 rounded-xl font-bold flex items-center justify-center gap-2.5 text-base disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Exporting...</span>
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  <span>Export Clip</span>
                </>
              )}
            </button>

            {/* Export result */}
            {exportResult && (
              <div className="space-y-2 mt-4">
                <a
                  href={exportResult}
                  download
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-emerald-500/50 bg-emerald-500/10 text-emerald-400 text-sm font-bold hover:bg-emerald-500/20 transition-colors shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                >
                  <Download className="w-4 h-4" /> Download to Device
                </a>
                <p className="text-[10px] text-center text-emerald-500/80 font-medium">
                  <CheckCircle2 className="w-3 h-3 inline mr-1" /> Render completed successfully
                </p>
              </div>
            )}

            {/* Privacy Message */}
            <div className="pt-2">
              <p className="text-[9px] text-center text-[var(--muted)]/70 px-2 leading-relaxed">
                <Lock className="w-3 h-3 inline mr-1 mb-0.5" />
                Your videos are processed securely and are <strong className="text-white/60 font-medium">never permanently stored</strong> on our servers.
              </p>
            </div>
            </>
            )}
          </div>
        </aside>
      </main>
    </div>
  );
}

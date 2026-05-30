"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Film, Monitor, Smartphone, Square, Music, 
  Loader2, Zap, Download, Play, Pause, Lock, Mic, Volume2, VolumeX,
  Plus, Settings, Sliders, AudioLines, Waves, Wand2, CheckCircle2, Layers
} from "lucide-react";

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

// Mock AI Audio Layer for UI
interface AudioLayer {
  id: string;
  name: string;
  type: 'music' | 'voiceover' | 'meme' | 'dub';
  volume: number;
  start: number;
  ducking: boolean;
  color: string;
}

export default function AudioStudio() {
  const router = useRouter();

  const [videoData, setVideoData] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  // Player state
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Preview state
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewReady, setPreviewReady] = useState(false);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);

  // Audio Studio State
  const [originalVolume, setOriginalVolume] = useState(100);
  const [originalMuted, setOriginalMuted] = useState(false);
  const [layers, setLayers] = useState<AudioLayer[]>([]);
  const [activeTab, setActiveTab] = useState<'layers' | 'ai' | 'export'>('layers');
  
  // AI Mock States
  const [isSyncing, setIsSyncing] = useState(false);
  const [isIsolating, setIsIsolating] = useState(false);

  // Export state
  const [exportFormat, setExportFormat] = useState("landscape");
  const [exportQuality, setExportQuality] = useState("HD 720p");
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
      
      if (parsed.isLocalUpload && parsed.streamUrl) {
        setStreamUrl(parsed.streamUrl);
        setPreviewReady(true);
      } else {
        handleGeneratePreview(parsed.url, parsed.duration);
      }
    } else {
      router.push("/");
    }
  }, [router]);

  const handleGeneratePreview = async (url: string, dur: number) => {
    setPreviewLoading(true);
    try {
      const res = await fetch(`${BACKEND_API}/prepare-preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, duration: dur })
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
        if (data.metadata && data.metadata.duration > 0) {
          setDuration(data.metadata.duration);
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

  const addMockLayer = (type: AudioLayer['type']) => {
    const colors = {
      music: 'bg-emerald-500',
      voiceover: 'bg-blue-500',
      meme: 'bg-amber-500',
      dub: 'bg-fuchsia-500'
    };
    const names = {
      music: 'Cinematic BGM',
      voiceover: 'AI Narrator (Deep)',
      meme: 'Funny Sound Effect',
      dub: 'Hindi AI Dub'
    };
    
    setLayers([...layers, {
      id: Math.random().toString(36).substr(2, 9),
      name: names[type],
      type,
      volume: 100,
      start: currentTime,
      ducking: type === 'voiceover' || type === 'dub',
      color: colors[type]
    }]);
  };

  const removeLayer = (id: string) => {
    setLayers(layers.filter(l => l.id !== id));
  };

  const mockAiSync = (action: string) => {
    if (action === 'isolate') setIsIsolating(true);
    else setIsSyncing(true);
    
    setTimeout(() => {
      if (action === 'isolate') {
        setIsIsolating(false);
        setOriginalVolume(100);
      } else {
        setIsSyncing(false);
      }
    }, 2000);
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

    try {
      const res = await fetch(`${BACKEND_API}/process-audio`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceUrl: videoData.url,
          streamUrl,
          format: exportFormat,
          quality: exportQuality,
          audioSettings: {
            originalVolume: originalMuted ? 0 : originalVolume / 100,
            layers: layers.map(l => ({
              ...l,
              volume: l.volume / 100
            }))
          }
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
      <div className="min-h-screen flex items-center justify-center bg-[#050505]">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#050505] text-white" style={{ fontFamily: 'var(--font-outfit), system-ui, sans-serif' }}>
      {/* ── Header ──────────────────────────────────────────── */}
      <header className="px-5 py-3.5 flex items-center gap-4 z-20 border-b border-white/10 bg-black">
        <button
          className="text-white/60 hover:text-white flex items-center gap-2 transition-colors text-sm font-medium"
          onClick={() => router.push("/")}
        >
          <ArrowLeft size={16} /> Back
        </button>
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="absolute inset-0 bg-amber-500 blur-md opacity-30 rounded-full" />
            <Mic size={16} className="text-amber-500 relative z-10" />
          </div>
          <span className="font-bold text-sm">ClipForge <span className="text-gradient">AI</span> / Audio Studio</span>
        </div>
      </header>

      {/* ── Main Layout ─────────────────────────────────────── */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* ── Left: Player & Timeline ──────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0">
          
          {/* Video Player */}
          <div className="flex-1 flex items-center justify-center p-5 min-h-[40vh]">
            <div className="w-full max-w-3xl aspect-video rounded-xl overflow-hidden relative border border-white/10 bg-black/80 shadow-[0_0_50px_rgba(245,158,11,0.05)]">
              {!previewReady ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                  <Waves className="w-10 h-10 text-amber-500 animate-pulse" />
                  <p className="font-bold text-white/80">Analyzing Audio Channels...</p>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    src={streamUrl ? (streamUrl.startsWith('http') ? streamUrl : `${BACKEND_API.replace('/api', '')}${streamUrl}`) : undefined}
                    className="w-full h-full object-contain"
                    onTimeUpdate={() => {
                      if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
                    }}
                    onPlay={() => setPlaying(true)}
                    onPause={() => setPlaying(false)}
                    controls={false}
                  />
                  {/* Cinematic Audio Visualizer Mockup */}
                  {playing && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-end gap-1 h-8 opacity-40 mix-blend-screen pointer-events-none">
                      {Array.from({ length: 32 }).map((_, i) => (
                        <div 
                          key={i} 
                          className="w-1.5 bg-amber-500 rounded-full" 
                          style={{
                            height: `${Math.random() * 100}%`,
                            animation: `pulse ${0.3 + Math.random() * 0.5}s infinite alternate`
                          }}
                        />
                      ))}
                    </div>
                  )}
                  {/* Custom Controls */}
                  <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/90 to-transparent flex items-center gap-4">
                    <button onClick={togglePlay} className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center text-black shadow-[0_0_15px_rgba(245,158,11,0.5)] hover:scale-105 transition-transform">
                      {playing ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
                    </button>
                    <span className="font-mono text-sm font-bold text-white drop-shadow-md">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Timeline Editor */}
          {previewReady && (
            <div className="h-[280px] bg-[#0a0a0c] border-t border-white/10 flex flex-col">
              <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-black/40">
                <div className="text-xs font-bold text-white/60 flex items-center gap-2">
                  <AudioLines className="w-4 h-4 text-amber-500" /> MULTI-TRACK AUDIO
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => addMockLayer('music')} className="text-[10px] px-2 py-1 bg-white/5 hover:bg-white/10 rounded flex items-center gap-1"><Plus className="w-3 h-3"/> Music</button>
                  <button onClick={() => addMockLayer('voiceover')} className="text-[10px] px-2 py-1 bg-white/5 hover:bg-white/10 rounded flex items-center gap-1"><Plus className="w-3 h-3"/> Voiceover</button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto relative" onClick={handleTimelineClick}>
                {/* Playhead */}
                <div 
                  className="absolute top-0 bottom-0 w-px bg-red-500 z-50 pointer-events-none"
                  style={{ left: `${(currentTime / duration) * 100}%` }}
                >
                  <div className="absolute -top-1 -translate-x-1/2 w-3 h-3 rotate-45 bg-red-500" />
                </div>

                <div className="p-4 space-y-3">
                  {/* Master Track (Original) */}
                  <div className="relative h-14 rounded-lg bg-white/5 border border-white/10 flex overflow-hidden">
                    <div className="w-32 bg-black/60 border-r border-white/10 flex flex-col justify-center px-3 z-10 shrink-0">
                      <div className="text-xs font-bold truncate">Original Audio</div>
                      <div className="flex items-center justify-between mt-1">
                        <button onClick={(e) => { e.stopPropagation(); setOriginalMuted(!originalMuted); }}>
                          {originalMuted ? <VolumeX className="w-3 h-3 text-red-400" /> : <Volume2 className="w-3 h-3 text-amber-400" />}
                        </button>
                        <span className="text-[10px] text-white/50">{originalVolume}%</span>
                      </div>
                    </div>
                    <div className="flex-1 relative flex items-center px-2 opacity-50">
                      {/* Fake waveform */}
                      {Array.from({ length: 150 }).map((_, i) => (
                        <div key={i} className="flex-1 bg-white/30 mx-[1px] rounded-full" style={{ height: `${20 + Math.random() * 60}%` }} />
                      ))}
                      {originalMuted && <div className="absolute inset-0 bg-red-500/20 mix-blend-overlay" />}
                    </div>
                  </div>

                  {/* Added Layers */}
                  {layers.map((layer) => (
                    <div key={layer.id} className="relative h-14 rounded-lg bg-white/5 border border-white/10 flex overflow-hidden group">
                      <div className="w-32 bg-black/60 border-r border-white/10 flex flex-col justify-center px-3 z-10 shrink-0 relative">
                        <div className="text-xs font-bold truncate pr-4">{layer.name}</div>
                        <div className="text-[9px] text-white/50">{layer.ducking ? 'Ducking On' : 'No Ducking'}</div>
                        <button onClick={(e) => { e.stopPropagation(); removeLayer(layer.id); }} className="absolute right-2 top-2 text-white/30 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                          &times;
                        </button>
                      </div>
                      <div className="flex-1 relative">
                        {/* Layer Block */}
                        <div 
                          className={`absolute top-2 bottom-2 rounded-md ${layer.color} bg-opacity-30 border border-${layer.color.replace('bg-', '')}/50 overflow-hidden shadow-[0_0_10px_rgba(255,255,255,0.05)]`}
                          style={{ left: `${(layer.start / duration) * 100}%`, right: '5%' }}
                        >
                          <div className="absolute inset-0 flex items-center px-1 opacity-70">
                            {Array.from({ length: 100 }).map((_, i) => (
                              <div key={i} className={`flex-1 ${layer.color.replace('bg-', 'bg-')} mx-[1px] rounded-full`} style={{ height: `${10 + Math.random() * 80}%` }} />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {layers.length === 0 && (
                    <div className="h-14 border border-dashed border-white/10 rounded-lg flex items-center justify-center text-xs text-white/30 pointer-events-none">
                      Drag or add audio tracks here
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Right Sidebar ────────────────────────────────── */}
        <aside className="w-full lg:w-[340px] bg-[#0a0a0c] border-l border-white/10 flex flex-col overflow-y-auto">
          {/* Tabs */}
          <div className="flex border-b border-white/10">
            <button
              onClick={() => setActiveTab('layers')}
              className={`flex-1 py-3 text-[11px] font-bold uppercase tracking-wider transition-colors ${activeTab === 'layers' ? 'text-amber-500 border-b-2 border-amber-500 bg-amber-500/5' : 'text-white/40 hover:text-white'}`}
            >
              Mixer
            </button>
            <button
              onClick={() => setActiveTab('ai')}
              className={`flex-1 py-3 text-[11px] font-bold uppercase tracking-wider transition-colors ${activeTab === 'ai' ? 'text-amber-500 border-b-2 border-amber-500 bg-amber-500/5' : 'text-white/40 hover:text-white'}`}
            >
              AI Magic
            </button>
            <button
              onClick={() => setActiveTab('export')}
              className={`flex-1 py-3 text-[11px] font-bold uppercase tracking-wider transition-colors ${activeTab === 'export' ? 'text-amber-500 border-b-2 border-amber-500 bg-amber-500/5' : 'text-white/40 hover:text-white'}`}
            >
              Export
            </button>
          </div>

          <div className="p-5 flex-1">
            
            {activeTab === 'layers' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xs font-bold text-white/80 mb-3 flex items-center gap-2"><Sliders className="w-4 h-4 text-amber-500"/> Original Audio</h3>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Mute Original</span>
                      <button 
                        onClick={() => setOriginalMuted(!originalMuted)}
                        className={`w-10 h-6 rounded-full transition-colors relative ${originalMuted ? 'bg-amber-500' : 'bg-white/20'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${originalMuted ? 'left-5' : 'left-1'}`} />
                      </button>
                    </div>
                    {!originalMuted && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs text-white/50"><span>Volume</span><span>{originalVolume}%</span></div>
                        <input type="range" min="0" max="200" value={originalVolume} onChange={(e) => setOriginalVolume(Number(e.target.value))} className="w-full accent-amber-500" />
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-white/80 mb-3 flex items-center gap-2"><Plus className="w-4 h-4 text-amber-500"/> Add Audio Layer</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => addMockLayer('music')} className="bg-white/5 border border-white/10 hover:border-amber-500/50 p-3 rounded-xl flex flex-col items-center gap-2 text-xs transition-colors">
                      <Music className="w-5 h-5 text-emerald-400"/> Add Music
                    </button>
                    <button onClick={() => addMockLayer('voiceover')} className="bg-white/5 border border-white/10 hover:border-amber-500/50 p-3 rounded-xl flex flex-col items-center gap-2 text-xs transition-colors">
                      <Mic className="w-5 h-5 text-blue-400"/> Voiceover
                    </button>
                    <button onClick={() => addMockLayer('dub')} className="bg-white/5 border border-white/10 hover:border-amber-500/50 p-3 rounded-xl flex flex-col items-center gap-2 text-xs transition-colors col-span-2">
                      <Wand2 className="w-5 h-5 text-fuchsia-400"/> AI Dubbing (Auto)
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'ai' && (
              <div className="space-y-4">
                <div className="p-4 bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20 rounded-xl relative overflow-hidden">
                  <div className="absolute -right-4 -top-4 w-16 h-16 bg-amber-500/20 blur-2xl rounded-full" />
                  <h3 className="font-bold text-amber-400 mb-1 flex items-center gap-2"><Zap className="w-4 h-4"/> Voice Isolation</h3>
                  <p className="text-xs text-white/60 mb-3">Uses AI to perfectly separate voice from background noise.</p>
                  <button 
                    onClick={() => mockAiSync('isolate')}
                    disabled={isIsolating}
                    className="w-full py-2 bg-amber-500/20 text-amber-400 font-bold text-xs rounded-lg border border-amber-500/30 hover:bg-amber-500/30 transition-colors flex items-center justify-center gap-2"
                  >
                    {isIsolating ? <Loader2 className="w-3 h-3 animate-spin" /> : <AudioLines className="w-3 h-3" />}
                    {isIsolating ? "Processing..." : "Isolate Voice"}
                  </button>
                </div>

                <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                  <h3 className="font-bold text-white mb-1">Auto Audio Ducking</h3>
                  <p className="text-[10px] text-white/50 mb-3">Automatically lowers background music when voiceover is speaking.</p>
                  <div className="flex items-center justify-between bg-black/40 p-2 rounded border border-white/5">
                    <span className="text-xs font-medium">Smart Ducking</span>
                    <div className="w-8 h-4 rounded-full bg-amber-500 relative">
                      <div className="absolute top-0.5 left-4 w-3 h-3 rounded-full bg-white" />
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                  <h3 className="font-bold text-white mb-1">AI Beat Sync</h3>
                  <p className="text-[10px] text-white/50 mb-3">Syncs cuts and transitions to the music beat drops.</p>
                  <button 
                    onClick={() => mockAiSync('beat')}
                    disabled={isSyncing}
                    className="w-full py-2 bg-white/10 text-white font-bold text-xs rounded-lg hover:bg-white/20 transition-colors flex items-center justify-center gap-2"
                  >
                    {isSyncing ? <Loader2 className="w-3 h-3 animate-spin" /> : "Sync to Beat"}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'export' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-2">
                  {FORMAT_OPTIONS.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setExportFormat(f.id)}
                      className={`relative rounded-xl p-3 border transition-all duration-200 text-left ${
                        exportFormat === f.id
                          ? "border-amber-500 bg-amber-500/10"
                          : "border-white/10 bg-white/5 hover:border-white/30"
                      }`}
                    >
                      <f.icon className={`w-4 h-4 mb-2 ${exportFormat === f.id ? "text-amber-500" : "text-white/40"}`} />
                      <div className="text-xs font-bold text-white">{f.label}</div>
                      <div className="text-[10px] text-white/40">{f.sub}</div>
                    </button>
                  ))}
                </div>

                <div>
                  <div className="text-xs font-bold text-white/80 mb-2 flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-amber-500" /> Export Quality
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {QUALITY_OPTIONS.map(q => (
                      <button
                        key={q}
                        onClick={() => setExportQuality(q)}
                        className={`text-left px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
                          exportQuality === q
                            ? 'bg-amber-500/20 border-amber-500 text-amber-400 font-bold'
                            : 'bg-white/5 border-white/10 text-white/50 hover:border-white/30 hover:text-white'
                        }`}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    onClick={handleExport}
                    disabled={isExporting || !previewReady}
                    className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 text-sm text-black shadow-[0_0_20px_rgba(245,158,11,0.4)] disabled:opacity-50 transition-all"
                  >
                    {isExporting ? (
                      exportProgress === 100 ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /><span>Finishing...</span></>
                      ) : (
                        <><Loader2 className="w-4 h-4 animate-spin" /><span>Rendering... {exportProgress}%</span></>
                      )
                    ) : (
                      <><Download className="w-4 h-4" /><span>Export Final Mix</span></>
                    )}
                  </button>

                  {exportResult && (
                    <div className="mt-4 space-y-2 animate-in fade-in slide-in-from-bottom-2">
                      <a
                        href={exportResult}
                        download
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-emerald-500/50 bg-emerald-500/10 text-emerald-400 text-sm font-bold hover:bg-emerald-500/20 transition-colors"
                      >
                        <Download className="w-4 h-4" /> Download to Device
                      </a>
                      <p className="text-[10px] text-center text-emerald-500/80 font-medium">
                        <CheckCircle2 className="w-3 h-3 inline mr-1" /> Audio mix processed successfully
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </aside>
      </main>
    </div>
  );
}

"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Palette, Film, Monitor, Smartphone, Square, Music, 
  Loader2, Zap, Play, Pause, Download, Type, Image as ImageIcon, Sparkles, Wand2, Layers, CheckCircle2, Lock
} from "lucide-react";

const BACKEND_API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

const VISUAL_STYLES = [
  "Anime", "Cartoon", "Pixar Style", "Bollywood Anime", "Motion Comic",
  "Emotional Drama", "Romantic Aesthetic", "Dark Thriller", "Neon Cyberpunk",
  "Fantasy World", "Vintage Animation"
];

const FORMAT_OPTIONS = [
  { id: "landscape", label: "Landscape", sub: "16:9", icon: Monitor },
  { id: "portrait", label: "Portrait", sub: "9:16", icon: Smartphone },
  { id: "square", label: "Square", sub: "1:1", icon: Square },
];

export default function AICartoon() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [videoData, setVideoData] = useState<any>(null);

  const [selectedStyle, setSelectedStyle] = useState("Anime");
  const [exportFormat, setExportFormat] = useState("portrait");
  
  // Time selection
  const [startTime, setStartTime] = useState("01:35");
  const [endTime, setEndTime] = useState("02:10");
  const [aiStage, setAiStage] = useState("");
  
  // Editor toggles
  const [editorToggles, setEditorToggles] = useState({
    captions: true,
    subtitles: false,
    overlays: true,
    transitions: true,
    music: false,
    effects: true
  });

  // AI Detection State
  const [isDetecting, setIsDetecting] = useState(true);
  const [detectedData, setDetectedData] = useState<any>(null);

  // Generation State
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [resultReady, setResultReady] = useState(false);
  const [finalVideoUrl, setFinalVideoUrl] = useState("");
  const [finalDownloadUrl, setFinalDownloadUrl] = useState("");

  useEffect(() => {
    setMounted(true);
    const data = sessionStorage.getItem("videoData");
    if (data) {
      setVideoData(JSON.parse(data));
      // Simulate AI detection
      setTimeout(() => {
        setDetectedData({
          voice: "Female",
          emotion: "Romantic Tone",
          confidence: 94
        });
        setIsDetecting(false);
      }, 2500);
    } else {
      router.push("/");
    }
  }, [router]);

  const parseTimeToSeconds = (timeStr: string) => {
    const parts = timeStr.split(':').map(Number);
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return parseFloat(timeStr) || 0;
  };

  const handleGenerate = async () => {
    if (!videoData) return;
    setIsGenerating(true);
    setProgress(0);
    
    try {
      const res = await fetch("/api/generate-cartoon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceUrl: videoData.url,
          streamUrl: videoData.streamUrl,
          style: selectedStyle,
          startTime: parseTimeToSeconds(startTime),
          endTime: parseTimeToSeconds(endTime) || videoData.duration || 0
        })
      });
      
      const data = await res.json();
      if (!data.jobId) throw new Error("No job ID returned");
      
      const poll = setInterval(async () => {
        try {
          const jobRes = await fetch(`/api/cartoon-jobs/${data.jobId}`);
          if (!jobRes.ok) return;
          const jobData = await jobRes.json();
          
          if (jobData.progress) {
            setProgress(jobData.progress);
          }
          if (jobData.stage) {
            setAiStage(jobData.stage);
          }
          
          if (jobData.status === "COMPLETED") {
            clearInterval(poll);
            setProgress(100);
            setIsGenerating(false);
            setResultReady(true);
            const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
            
            // Handle both string result and JSON object result formats
            let resultData = jobData.result;
            if (typeof resultData === 'string') {
              try { resultData = JSON.parse(resultData); } catch(e) {}
            }

            const previewUrl = `${backendUrl.replace('/api', '')}${resultData?.fileUrl || resultData}`;
            const downloadUrl = resultData?.downloadUrl 
              ? `${backendUrl.replace('/api', '')}${resultData.downloadUrl}` 
              : `${backendUrl}/download/${previewUrl.split('/').pop()}`;

            setFinalVideoUrl(previewUrl);
            setFinalDownloadUrl(downloadUrl);
            
            // Auto download
            const link = document.createElement("a");
            link.href = downloadUrl;
            link.download = `clipforge-export.mp4`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          } else if (jobData.status === "FAILED") {
            clearInterval(poll);
            setIsGenerating(false);
            alert("Generation failed: " + jobData.error);
          }
        } catch (e) {
           console.error("Polling error", e);
        }
      }, 1500);

    } catch (err) {
      console.error(err);
      setIsGenerating(false);
      alert("Failed to start generation");
    }
  };

  const handleDownload = () => {
    // Download actual generated file
    const link = document.createElement("a");
    link.href = finalVideoUrl;
    link.download = `clipforge-export.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportAnother = () => {
    setResultReady(false);
    setProgress(0);
    setFinalVideoUrl("");
  };

  const toggleEditorOption = (key: keyof typeof editorToggles) => {
    setEditorToggles(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (!mounted || !videoData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#050505] text-white">
        <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#050505] text-white font-sans">
      {/* ── Header ──────────────────────────────────────────── */}
      <header className="px-5 py-3.5 flex items-center justify-between z-20 border-b border-[var(--border)] bg-[#0a0a0c]">
        <div className="flex items-center gap-4">
          <button
            className="text-[var(--muted)] hover:text-white flex items-center gap-2 transition-colors text-sm font-medium"
            onClick={() => router.push("/")}
          >
            <ArrowLeft size={16} /> Back
          </button>
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="absolute inset-0 bg-pink-500 blur-md opacity-30 rounded-full" />
              <Palette size={16} className="text-pink-400 relative z-10" />
            </div>
            <span className="font-bold text-sm">AI Cartoon <span className="text-gradient from-pink-500 to-rose-400">Generator</span></span>
          </div>
        </div>
      </header>

      {/* ── Main Layout ─────────────────────────────────────── */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* LEFT: Preview & AI Analysis */}
        <div className="flex-1 flex flex-col min-w-0 p-5 space-y-4 overflow-y-auto">
          
          <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh]">
            <div className="w-full max-w-4xl aspect-video rounded-xl overflow-hidden relative border border-[var(--border)] bg-black shadow-[0_0_50px_rgba(0,0,0,0.8)] flex items-center justify-center">
              {resultReady ? (
                <>
                  <video 
                    src={finalVideoUrl} 
                    autoPlay loop controls 
                    className="absolute inset-0 w-full h-full object-contain bg-black transition-all duration-1000"
                  />
                  <div className="absolute top-4 right-4 bg-emerald-600 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase shadow-md flex items-center gap-2 pointer-events-none">
                    <CheckCircle2 className="w-3 h-3" /> FFmpeg Output Ready
                  </div>
                </>
              ) : isGenerating ? (
                <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-10 space-y-4">
                  <div className="relative w-32 h-32">
                    <div className="absolute inset-0 rounded-full border-4 border-pink-500/20" />
                    <div className="absolute inset-0 rounded-full border-4 border-t-pink-500 animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center animate-pulse">
                      <Wand2 className="w-10 h-10 text-pink-400" />
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-xl mb-1 text-white">
                      AI Cartoon Generation
                    </div>
                    <div className="text-sm text-[var(--muted)]">
                      {Math.floor(progress)}% — {aiStage || (
                       progress < 5 ? "Preparing clip..." :
                       progress < 15 ? "Extracting frames..." :
                       progress < 85 ? "AI Stylizing frames..." :
                       progress < 95 ? "Building video..." :
                       progress < 100 ? "Finalizing..." :
                       "Ready to download"
                      )}
                    </div>
                    {progress > 0 && progress < 100 && (
                      <div className="text-xs text-emerald-400 mt-2 font-medium bg-emerald-400/10 inline-block px-3 py-1 rounded-full border border-emerald-500/20">
                        {progress < 15 ? 'Setting up AI pipeline...' : `Estimated: ${Math.max(1, Math.floor((100 - progress) * 0.3))} min remaining`}
                      </div>
                    )}
                  </div>
                  <div className="w-64 h-2 bg-[var(--surface-2)] rounded-full overflow-hidden mt-4">
                    <div className="h-full bg-gradient-to-r from-pink-600 to-rose-400 transition-all duration-300" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              ) : (
                <>
                  <video src={videoData.streamUrl || videoData.url} className="absolute inset-0 w-full h-full object-contain bg-black opacity-40 pointer-events-none" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10 pointer-events-none">
                     <Film className="w-12 h-12 text-[var(--muted)] drop-shadow-lg" />
                     <p className="text-white font-medium bg-black/60 px-4 py-2 rounded-lg border border-[var(--border)] backdrop-blur-sm">Original video loaded. Select style and stylize.</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* AI Analysis Panel */}
          <div className="w-full max-w-4xl mx-auto glass-strong rounded-xl p-5 border border-[var(--border)] shadow-sm">
            <h3 className="font-bold text-sm flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-blue-400" /> AI Detection Context
            </h3>
            {isDetecting ? (
              <div className="flex items-center gap-3 text-sm text-[var(--muted)]">
                <Loader2 className="w-4 h-4 animate-spin" /> Analyzing audio and emotional tone...
              </div>
            ) : detectedData ? (
              <div className="flex flex-wrap items-center gap-3">
                <div className="px-3 py-1.5 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-xs font-bold flex items-center gap-2">
                  <span className="text-[var(--muted)]">Detected Voice:</span>
                  <span className="text-blue-400">{detectedData.voice}</span>
                </div>
                <div className="px-3 py-1.5 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-xs font-bold flex items-center gap-2">
                  <span className="text-[var(--muted)]">Emotional Tone:</span>
                  <span className="text-pink-400">{detectedData.emotion}</span>
                </div>
                <div className="px-3 py-1.5 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-xs font-bold flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-yellow-400" />
                  <span>{detectedData.confidence}% Match Confidence</span>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* RIGHT: Sidebar Controls */}
        <aside className="w-full lg:w-[360px] bg-[#0a0a0c] border-l border-[var(--border)] flex flex-col overflow-y-auto">
          <div className="p-5 space-y-8">
            
            {/* Timeline Segment */}
            <div className="space-y-3">
              <h3 className="font-bold text-sm flex items-center gap-2 text-white">
                <Film className="w-4 h-4 text-emerald-400" /> Timeline Segment
              </h3>
              <div className="flex gap-3">
                <div className="flex-1 bg-[var(--surface)] border border-[var(--border)] rounded-xl p-2.5">
                  <div className="text-[10px] font-bold text-[var(--muted)] uppercase mb-1">Start Time</div>
                  <input type="text" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full bg-transparent outline-none font-mono text-sm text-white" />
                </div>
                <div className="flex-1 bg-[var(--surface)] border border-[var(--border)] rounded-xl p-2.5">
                  <div className="text-[10px] font-bold text-[var(--muted)] uppercase mb-1">End Time</div>
                  <input type="text" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full bg-transparent outline-none font-mono text-sm text-white" />
                </div>
              </div>
            </div>

            {/* Visual Style Selection */}
            <div className="space-y-3">
              <h3 className="font-bold text-sm flex items-center gap-2 text-white">
                <Palette className="w-4 h-4 text-pink-400" /> Visual Style
              </h3>
              <div className="flex flex-wrap gap-2">
                {VISUAL_STYLES.map(style => (
                  <button
                    key={style}
                    onClick={() => setSelectedStyle(style)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                      selectedStyle === style 
                        ? 'bg-pink-500/20 text-pink-400 border border-pink-500/50 shadow-[0_0_10px_rgba(236,72,153,0.2)]' 
                        : 'bg-[var(--surface)] text-[var(--muted)] border border-[var(--border)] hover:border-pink-500/30'
                    }`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>

            {/* Editor Features */}
            <div className="space-y-3">
              <h3 className="font-bold text-sm flex items-center gap-2 text-white">
                <Layers className="w-4 h-4 text-purple-400" /> Editor Features
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => toggleEditorOption('captions')} className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all ${editorToggles.captions ? 'border-purple-500/50 bg-purple-500/10 text-purple-300' : 'border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:border-purple-500/30'}`}>
                  <Type className="w-4 h-4" /> <span className="text-xs font-bold">Captions</span>
                </button>
                <button onClick={() => toggleEditorOption('subtitles')} className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all ${editorToggles.subtitles ? 'border-purple-500/50 bg-purple-500/10 text-purple-300' : 'border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:border-purple-500/30'}`}>
                  <Type className="w-4 h-4" /> <span className="text-xs font-bold">Subtitles</span>
                </button>
                <button onClick={() => toggleEditorOption('overlays')} className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all ${editorToggles.overlays ? 'border-purple-500/50 bg-purple-500/10 text-purple-300' : 'border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:border-purple-500/30'}`}>
                  <ImageIcon className="w-4 h-4" /> <span className="text-xs font-bold">Overlays</span>
                </button>
                <button onClick={() => toggleEditorOption('music')} className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all ${editorToggles.music ? 'border-purple-500/50 bg-purple-500/10 text-purple-300' : 'border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:border-purple-500/30'}`}>
                  <Music className="w-4 h-4" /> <span className="text-xs font-bold">BGM</span>
                </button>
                <button onClick={() => toggleEditorOption('transitions')} className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all ${editorToggles.transitions ? 'border-purple-500/50 bg-purple-500/10 text-purple-300' : 'border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:border-purple-500/30'}`}>
                  <Film className="w-4 h-4" /> <span className="text-xs font-bold">Transitions</span>
                </button>
                <button onClick={() => toggleEditorOption('effects')} className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all ${editorToggles.effects ? 'border-purple-500/50 bg-purple-500/10 text-purple-300' : 'border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:border-purple-500/30'}`}>
                  <Sparkles className="w-4 h-4" /> <span className="text-xs font-bold">FX Effects</span>
                </button>
              </div>
            </div>

            {/* Export Format */}
            <div className="space-y-3">
              <h3 className="font-bold text-sm flex items-center gap-2 text-white">
                <Monitor className="w-4 h-4 text-[var(--primary)]" /> Export Format
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {FORMAT_OPTIONS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setExportFormat(f.id)}
                    className={`relative rounded-xl p-3 border transition-all duration-200 text-center ${
                      exportFormat === f.id
                        ? "border-[var(--primary)] bg-[var(--primary)]/10"
                        : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-hover)]"
                    }`}
                  >
                    <f.icon className={`w-4 h-4 mb-2 mx-auto ${exportFormat === f.id ? "text-[var(--primary)]" : "text-[var(--muted)]"}`} />
                    <div className="text-[10px] font-bold text-white">{f.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Generate/Export Button */}
            <div className="space-y-3 pt-4 border-t border-[var(--border)]">
              {resultReady ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-center gap-2 text-emerald-400 font-bold text-sm mb-2 bg-emerald-500/10 py-2 rounded-lg border border-emerald-500/20">
                    <CheckCircle2 className="w-4 h-4" /> Render completed successfully
                  </div>
                  <button
                    onClick={handleDownload}
                    className="w-full bg-gradient-to-r from-emerald-500 to-teal-400 hover:opacity-90 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 text-sm text-white transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                  >
                    <Download className="w-4 h-4" /> Download MP4
                  </button>
                  <button
                    onClick={handleExportAnother}
                    className="w-full bg-[var(--surface-2)] border border-[var(--border)] hover:bg-[var(--surface)] py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 text-sm text-white transition-all"
                  >
                    <Wand2 className="w-4 h-4" /> Export Another
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || isDetecting}
                  className="w-full bg-gradient-to-r from-pink-600 to-rose-500 hover:opacity-90 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 text-sm text-white transition-all shadow-[0_0_15px_rgba(236,72,153,0.3)] disabled:opacity-50"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Rendering Video...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4" /> Stylize Original Video
                    </>
                  )}
                </button>
              )}
              
              <div className="pt-2">
                <p className="text-[9px] text-center text-[var(--muted)]/70 px-2 leading-relaxed">
                  <Lock className="w-3 h-3 inline mr-1 mb-0.5" />
                  Temp Storage Policy: Previews and renders are <strong className="text-white/60 font-medium">auto-deleted</strong> after export or session timeout.
                </p>
              </div>
            </div>
            
          </div>
        </aside>
      </main>
    </div>
  );
}

"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Clapperboard, Film, Monitor, Smartphone, Square, Music,
  Loader2, Zap, Play, Pause, Download, Type, Sparkles, Wand2,
  Layers, CheckCircle2, Upload, Mic, Volume2, Heart, Laugh,
  AlertTriangle, Flame, Eye, Palette, Clock, ChevronDown, X, Settings
} from "lucide-react";

const BACKEND_API = process.env.NEXT_PUBLIC_API_URL || '';

const VISUAL_STYLES = [
  { id: "Anime",              label: "Anime",              emoji: "🎌", color: "from-rose-500 to-pink-600" },
  { id: "Cartoon",            label: "Cartoon",            emoji: "🎨", color: "from-amber-500 to-orange-600" },
  { id: "Pixar Style",        label: "Pixar Style",        emoji: "✨", color: "from-sky-400 to-blue-600" },
  { id: "Bollywood Anime",    label: "Bollywood Anime",    emoji: "🎬", color: "from-yellow-400 to-red-500" },
  { id: "Motion Comic",       label: "Motion Comic",       emoji: "💥", color: "from-red-500 to-rose-700" },
  { id: "Emotional Drama",    label: "Emotional Drama",    emoji: "🎭", color: "from-violet-500 to-purple-700" },
  { id: "Romantic Aesthetic",  label: "Romantic Aesthetic",  emoji: "💕", color: "from-pink-400 to-rose-500" },
  { id: "Dark Thriller",      label: "Dark Thriller",      emoji: "🌑", color: "from-slate-600 to-zinc-800" },
  { id: "Neon Cyberpunk",     label: "Neon Cyberpunk",     emoji: "⚡", color: "from-cyan-400 to-fuchsia-600" },
  { id: "Fantasy World",      label: "Fantasy World",      emoji: "🧙", color: "from-emerald-400 to-teal-600" },
  { id: "Vintage Animation",  label: "Vintage Animation",  emoji: "📽️", color: "from-amber-600 to-yellow-800" },
];

const FORMAT_OPTIONS = [
  { id: "landscape", label: "Landscape", sub: "16:9", icon: Monitor },
  { id: "portrait",  label: "Portrait",  sub: "9:16", icon: Smartphone },
  { id: "square",    label: "Square",    sub: "1:1",  icon: Square },
];

const EMOTION_ICONS: Record<string, any> = {
  romantic: Heart,
  comedy: Laugh,
  suspense: AlertTriangle,
  motivational: Flame,
  emotional: Eye,
  neutral: Volume2,
};

export default function AISceneGenerator() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [videoData, setVideoData] = useState<any>(null);
  const [generatorMode, setGeneratorMode] = useState<"media" | "prompt">("media");
  const [promptText, setPromptText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  // Core state
  const [selectedStyle, setSelectedStyle] = useState("Pixar Style");
  const [exportFormat, setExportFormat] = useState("portrait");
  const [startTime, setStartTime] = useState("00:00");
  const [endTime, setEndTime] = useState("00:10");
  const [aiStage, setAiStage] = useState("");

  // Upload & file state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [sourceType, setSourceType] = useState<"video" | "audio" | "url">("video");

  // Editor toggles
  const [editorToggles, setEditorToggles] = useState({
    captions: true,
    subtitles: true,
    overlays: false,
    transitions: true,
    music: false,
    effects: true,
  });

  // AI Detection
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectedData, setDetectedData] = useState<{
    voiceType?: string;
    emotion?: string;
    tone?: string;
    confidence?: number;
  } | null>(null);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [resultReady, setResultReady] = useState(false);
  const [finalVideoUrl, setFinalVideoUrl] = useState("");
  const [finalDownloadUrl, setFinalDownloadUrl] = useState("");
  const [isPreviewLoading, setIsPreviewLoading] = useState(true);
  const [isPreviewError, setIsPreviewError] = useState(false);
  const [isResultLoading, setIsResultLoading] = useState(true);
  const [isResultError, setIsResultError] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = sessionStorage.getItem("videoData");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setVideoData(parsed);
        // Auto-detect AI info
        simulateAIDetection();
      } catch {}
    }
  }, []);

  const simulateAIDetection = () => {
    setIsDetecting(true);
    setTimeout(() => {
      const emotions = ["romantic", "comedy", "suspense", "motivational", "emotional"];
      const voices = ["Male", "Female", "Mixed"];
      const tones = ["Romantic", "Comedy", "Suspense", "Motivational", "Emotional Drama", "Neutral"];
      setDetectedData({
        voiceType: voices[Math.floor(Math.random() * voices.length)],
        emotion: emotions[Math.floor(Math.random() * emotions.length)],
        tone: tones[Math.floor(Math.random() * tones.length)],
        confidence: Math.floor(70 + Math.random() * 28),
      });
      setIsDetecting(false);
    }, 2500);
  };

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setUploadProgress(0);
    setUploadedFile(file);

    const isAudio = file.type.startsWith("audio/");
    setSourceType(isAudio ? "audio" : "video");

    const formData = new FormData();
    formData.append("video", file);

    try {
      const res = await fetch("/api/upload-video", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (data.url) {
        const vd = {
          title: file.name,
          url: data.url,
          streamUrl: data.streamUrl,
          duration: data.duration || 0,
          isLocalUpload: true,
        };
        setVideoData(vd);
        sessionStorage.setItem("videoData", JSON.stringify(vd));
        simulateAIDetection();
      }
    } catch (err: any) {
      alert("Upload failed: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }, []);

  const parseTime = (t: string): number => {
    const parts = t.split(":").map(Number);
    return (parts[0] || 0) * 60 + (parts[1] || 0);
  };

  const handleGenerate = async () => {
    if (!videoData) return;
    setIsGenerating(true);
    setProgress(0);
    setAiStage("Preparing...");
    setResultReady(false);

    try {
      const res = await fetch("/api/generate-cartoon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          videoData.isPrompt
            ? { prompt: promptText || videoData.prompt, style: selectedStyle }
            : {
                sourceUrl: videoData.url,
                streamUrl: videoData.streamUrl,
                style: selectedStyle,
                startTime: parseTime(startTime),
                endTime: parseTime(endTime),
              }
        ),
      });

      const data = await res.json();
      if (!data.jobId) throw new Error("No job ID returned");

      const poll = setInterval(async () => {
        try {
          const jobRes = await fetch(`/api/cartoon-jobs/${data.jobId}`);
          if (!jobRes.ok) return;
          const jobData = await jobRes.json();

          if (jobData.progress) setProgress(jobData.progress);
          if (jobData.stage) setAiStage(jobData.stage);

          if (jobData.status === "COMPLETED") {
            clearInterval(poll);
            setProgress(100);
            setIsGenerating(false);
            setResultReady(true);
            const backendUrl = BACKEND_API.replace("/api", "");
            
            // Handle both string result and JSON object result formats
            let resultData = jobData.result;
            if (typeof resultData === 'string') {
              try { resultData = JSON.parse(resultData); } catch(e) {}
            }

            const rawFileUrl = resultData?.fileUrl || resultData || "";
            const rawDownloadUrl = resultData?.downloadUrl || "";
            
            const previewUrl = rawFileUrl.startsWith("http") 
              ? rawFileUrl 
              : `${backendUrl}${rawFileUrl}`;
              
            const downloadUrl = rawDownloadUrl 
              ? (rawDownloadUrl.startsWith("http") ? rawDownloadUrl : `${backendUrl}${rawDownloadUrl}`)
              : `${backendUrl}/api/download/${previewUrl.split('/').pop()}`;

            setFinalVideoUrl(previewUrl);
            setFinalDownloadUrl(downloadUrl);

            const link = document.createElement("a");
            link.href = downloadUrl;
            link.download = `clipforge-scene-${selectedStyle.toLowerCase().replace(/ /g, "-")}.mp4`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          } else if (jobData.status === "FAILED") {
            clearInterval(poll);
            setIsGenerating(false);
            alert("Generation failed: " + jobData.error);
          }
        } catch {}
      }, 2000);
    } catch (err) {
      console.error(err);
      setIsGenerating(false);
      alert("Failed to start scene generation");
    }
  };



  return (
    <div className="min-h-screen flex flex-col text-white relative">
      {/* ── Mesh BG ─────────────────────────────────────────────── */}
      <div className="mesh-bg">
        <div className="mesh-orb" style={{ width: 500, height: 500, left: "-10%", top: "-20%", background: "radial-gradient(circle, rgba(139,92,246,0.12), transparent 70%)" }} />
        <div className="mesh-orb" style={{ width: 600, height: 600, right: "-15%", bottom: "-10%", background: "radial-gradient(circle, rgba(236,72,153,0.08), transparent 70%)", animationDelay: "-8s" }} />
        <div className="mesh-orb" style={{ width: 400, height: 400, left: "40%", top: "30%", background: "radial-gradient(circle, rgba(6,182,212,0.06), transparent 70%)", animationDelay: "-14s" }} />
      </div>

      {/* ── Topbar ──────────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 glass-strong px-4 md:px-8 py-3.5 flex items-center justify-between">
        <button onClick={() => router.push("/")} className="flex items-center gap-2 text-[var(--muted)] hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium hidden sm:inline">Back</span>
        </button>
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-fuchsia-500 to-violet-500 blur-lg opacity-30 rounded-full" />
            <Clapperboard className="w-5 h-5 text-fuchsia-400 relative z-10" />
          </div>
          <span className="font-bold text-sm tracking-tight">
            AI Scene <span className="bg-gradient-to-r from-fuchsia-400 to-violet-400 bg-clip-text text-transparent">Generator</span>
          </span>
        </div>
        <div className="w-20" />
      </header>

      {/* ── Main Content ───────────────────────────────────────── */}
      <main className="flex-1 pt-20 pb-10 px-3 md:px-6 relative z-10">
        <div className="max-w-7xl mx-auto">

          {/* Page Title */}
          <div className="text-center mb-8 mt-4">
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2">
              AI Cartoon <span className="bg-gradient-to-r from-fuchsia-400 via-pink-400 to-violet-400 bg-clip-text text-transparent">Scene Generator</span>
            </h1>
            <p className="text-[var(--muted)] text-sm md:text-base max-w-lg mx-auto">
              Turn dialogues, emotions and audio into cinematic animated AI scenes.
            </p>
          </div>

          {/* ── 2-Column Layout ────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-5">

            {/* ── LEFT: Preview / Upload ───────────────────────── */}
            <div className="space-y-5">

              {/* Upload / Preview Card */}
              {/* Mode Toggle */}
              <div className="flex bg-[var(--surface-2)] p-1 rounded-xl border border-[var(--border)]">
                <button 
                  onClick={() => {
                    setGeneratorMode("prompt");
                    if (videoData && !videoData.isPrompt) setVideoData(null);
                  }}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${generatorMode === "prompt" ? "bg-fuchsia-500/20 text-fuchsia-400" : "text-[var(--muted)] hover:text-white"}`}
                >
                  <Type className="w-4 h-4 inline-block mr-2" />
                  Prompt Mode
                </button>
                <button 
                  onClick={() => {
                    setGeneratorMode("media");
                    if (videoData && videoData.isPrompt) setVideoData(null);
                  }}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${generatorMode === "media" ? "bg-violet-500/20 text-violet-400" : "text-[var(--muted)] hover:text-white"}`}
                >
                  <Film className="w-4 h-4 inline-block mr-2" />
                  Media Mode
                </button>
              </div>

              <div className="glass-strong rounded-2xl border border-[var(--border)] overflow-hidden">
                <div className="aspect-video relative bg-black/60">
                  {isGenerating ? (
                    /* ── Generation Overlay ─────────────── */
                    <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-10 space-y-5">
                      <div className="relative w-28 h-28">
                        <div className="absolute inset-0 rounded-full border-2 border-fuchsia-500/20" />
                        <div className="absolute inset-2 rounded-full border-2 border-violet-500/30 animate-spin" style={{ animationDuration: "3s" }} />
                        <div className="absolute inset-4 rounded-full border-2 border-pink-500/40 animate-spin" style={{ animationDuration: "2s", animationDirection: "reverse" }} />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Clapperboard className="w-8 h-8 text-fuchsia-400 animate-pulse" />
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-lg mb-1 text-white">
                          Generating Animated Scenes
                        </div>
                        <div className="text-sm text-[var(--muted)]">
                          {Math.floor(progress)}% — {aiStage || "Initializing AI..."}
                        </div>
                      </div>
                      <div className="w-64 h-2 bg-[var(--surface-2)] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-fuchsia-600 via-pink-500 to-violet-500 transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  ) : generatorMode === "prompt" ? (
                    /* ── Prompt Mode ───────────── */
                    <div className="absolute inset-0 flex flex-col p-5 bg-gradient-to-br from-[var(--surface)] to-[var(--background)]">
                      <textarea 
                        value={promptText}
                        onChange={(e) => {
                          setPromptText(e.target.value);
                          if (e.target.value) {
                            setVideoData({ title: "Text Prompt", isPrompt: true, prompt: e.target.value });
                          } else {
                            setVideoData(null);
                          }
                        }}
                        placeholder="Example: Create a romantic emotional comedy cartoon where a poor boy tries to impress a rich girl with funny and emotional moments..."
                        className="flex-1 w-full bg-black/40 border border-[var(--border)] rounded-xl p-4 text-sm text-white placeholder-[var(--muted)] outline-none focus:border-fuchsia-500 transition-colors resize-none mb-3"
                      />
                      <div className="flex flex-wrap gap-2">
                        {["romantic comedy", "emotional breakup", "Bollywood romance", "father son story"].map((chip) => (
                          <button 
                            key={chip}
                            onClick={() => {
                              setPromptText(chip);
                              setVideoData({ title: "Text Prompt", isPrompt: true, prompt: chip });
                              simulateAIDetection();
                            }}
                            className="text-[10px] px-3 py-1.5 rounded-full bg-[var(--surface-2)] text-[var(--muted)] border border-[var(--border)] hover:border-fuchsia-500 hover:text-white transition-all font-medium"
                          >
                            {chip}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : videoData ? (
                    /* ── Video/Audio Preview ───────────── */
                    <>
                      {sourceType === "audio" ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[var(--surface)] to-black/80 gap-4">
                          <div className="w-20 h-20 rounded-full bg-fuchsia-500/10 border border-fuchsia-500/30 flex items-center justify-center">
                            <Mic className="w-10 h-10 text-fuchsia-400" />
                          </div>
                          <div className="text-sm text-[var(--muted)] font-medium">{videoData.title}</div>
                        </div>
                      ) : (
                        <>
                          {isPreviewLoading && !isPreviewError && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black">
                              <Loader2 className="w-8 h-8 text-fuchsia-400 animate-spin" />
                            </div>
                          )}
                          {isPreviewError && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-[var(--muted)]">
                              <AlertTriangle className="w-10 h-10 text-rose-500 mb-2" />
                              <span className="text-sm font-medium">Failed to load preview</span>
                            </div>
                          )}
                          <video
                            src={videoData.streamUrl || videoData.url}
                            className={`absolute inset-0 w-full h-full object-contain bg-black ${isPreviewLoading || isPreviewError ? 'hidden' : ''}`}
                            controls
                            onLoadStart={() => { setIsPreviewLoading(true); setIsPreviewError(false); }}
                            onLoadedData={() => setIsPreviewLoading(false)}
                            onError={() => { setIsPreviewError(true); setIsPreviewLoading(false); }}
                          />
                        </>
                      )}
                    </>
                  ) : (
                    /* ── Upload Zone ────────────────────── */
                    <div
                      className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer group transition-all"
                      onDrop={handleDrop}
                      onDragOver={(e) => e.preventDefault()}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <div className="w-20 h-20 rounded-2xl bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:border-fuchsia-500/50 transition-all">
                        <Upload className="w-9 h-9 text-fuchsia-400" />
                      </div>
                      <div className="text-lg font-bold mb-1">Upload Audio or Video</div>
                      <div className="text-sm text-[var(--muted)] mb-3">
                        Drag & drop or click to browse
                      </div>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*,audio/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                />
              </div>

              {/* ── AI Detection Results ───────────────────────── */}
              {(isDetecting || detectedData) && (
                <div className="glass-strong rounded-2xl border border-[var(--border)] p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="w-4 h-4 text-fuchsia-400" />
                    <span className="font-bold text-sm">AI Detection</span>
                    {isDetecting && <Loader2 className="w-3.5 h-3.5 text-fuchsia-400 animate-spin ml-auto" />}
                  </div>
                  {isDetecting ? (
                    <div className="grid grid-cols-3 gap-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-16 rounded-xl bg-[var(--surface-2)] shimmer" />
                      ))}
                    </div>
                  ) : detectedData && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-[var(--surface-2)] rounded-xl p-3 border border-[var(--border)]">
                        <div className="text-[10px] text-[var(--muted)] uppercase tracking-wider mb-1">Voice</div>
                        <div className="flex items-center gap-1.5">
                          <Mic className="w-3.5 h-3.5 text-fuchsia-400" />
                          <span className="text-sm font-bold">{detectedData.voiceType}</span>
                        </div>
                      </div>
                      <div className="bg-[var(--surface-2)] rounded-xl p-3 border border-[var(--border)]">
                        <div className="text-[10px] text-[var(--muted)] uppercase tracking-wider mb-1">Emotion</div>
                        <div className="flex items-center gap-1.5">
                          {(() => { const Icon = EMOTION_ICONS[detectedData.emotion || "neutral"] || Eye; return <Icon className="w-3.5 h-3.5 text-pink-400" />; })()}
                          <span className="text-sm font-bold capitalize">{detectedData.emotion}</span>
                        </div>
                      </div>
                      <div className="bg-[var(--surface-2)] rounded-xl p-3 border border-[var(--border)]">
                        <div className="text-[10px] text-[var(--muted)] uppercase tracking-wider mb-1">Tone</div>
                        <div className="flex items-center gap-1.5">
                          <Film className="w-3.5 h-3.5 text-violet-400" />
                          <span className="text-sm font-bold">{detectedData.tone}</span>
                        </div>
                      </div>
                      <div className="bg-[var(--surface-2)] rounded-xl p-3 border border-[var(--border)]">
                        <div className="text-[10px] text-[var(--muted)] uppercase tracking-wider mb-1">Confidence</div>
                        <div className="flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-green-400" />
                          <span className="text-sm font-bold">{detectedData.confidence}%</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Timeline Selection ─────────────────────────── */}
              {videoData && (
                <div className="glass-strong rounded-2xl border border-[var(--border)] p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Clock className="w-4 h-4 text-violet-400" />
                    <span className="font-bold text-sm">Timeline Selection</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20 ml-auto font-medium">
                      Max 40s
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <label className="text-[10px] text-[var(--muted)] uppercase tracking-wider block mb-1.5">Start Time</label>
                      <input
                        type="text"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        placeholder="00:00"
                        className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-center font-mono focus:border-fuchsia-500 outline-none transition-colors"
                      />
                    </div>
                    <div className="text-[var(--muted)] text-lg font-bold mt-5">→</div>
                    <div className="flex-1">
                      <label className="text-[10px] text-[var(--muted)] uppercase tracking-wider block mb-1.5">End Time</label>
                      <input
                        type="text"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        placeholder="00:10"
                        className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-center font-mono focus:border-fuchsia-500 outline-none transition-colors"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ── Editor Features ────────────────────────────── */}
              {videoData && (
                <div className="glass-strong rounded-2xl border border-[var(--border)] p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Settings className="w-4 h-4 text-pink-400" />
                    <span className="font-bold text-sm">Editor Features</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {Object.entries(editorToggles).map(([key, enabled]) => (
                      <button
                        key={key}
                        onClick={() => setEditorToggles((prev) => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium border transition-all
                          ${enabled
                            ? "bg-fuchsia-500/10 border-fuchsia-500/30 text-fuchsia-300"
                            : "bg-[var(--surface-2)] border-[var(--border)] text-[var(--muted)] hover:border-[var(--border-hover)]"
                          }`}
                      >
                        {enabled ? <CheckCircle2 className="w-3.5 h-3.5" /> : <div className="w-3.5 h-3.5 rounded-full border border-current" />}
                        <span className="capitalize">{key}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── RIGHT: Style & Controls ──────────────────────── */}
            <div className="space-y-5">

              {/* Visual Style Selector */}
              <div className="glass-strong rounded-2xl border border-[var(--border)] p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Palette className="w-4 h-4 text-fuchsia-400" />
                  <span className="font-bold text-sm">Visual Style</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {VISUAL_STYLES.map((style) => (
                    <button
                      key={style.id}
                      onClick={() => setSelectedStyle(style.id)}
                      className={`relative flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium border transition-all overflow-hidden
                        ${selectedStyle === style.id
                          ? "border-fuchsia-500/50 text-white"
                          : "border-[var(--border)] text-[var(--muted)] hover:text-white hover:border-[var(--border-hover)]"
                        }`}
                    >
                      {selectedStyle === style.id && (
                        <div className={`absolute inset-0 bg-gradient-to-r ${style.color} opacity-15`} />
                      )}
                      <span className="relative z-10">{style.emoji}</span>
                      <span className="relative z-10 truncate">{style.label}</span>
                      {selectedStyle === style.id && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-fuchsia-400 ml-auto shrink-0 relative z-10" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Export Format */}
              <div className="glass-strong rounded-2xl border border-[var(--border)] p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Monitor className="w-4 h-4 text-violet-400" />
                  <span className="font-bold text-sm">Export Format</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {FORMAT_OPTIONS.map((fmt) => (
                    <button
                      key={fmt.id}
                      onClick={() => setExportFormat(fmt.id)}
                      className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl text-xs border transition-all
                        ${exportFormat === fmt.id
                          ? "bg-violet-500/10 border-violet-500/30 text-white"
                          : "border-[var(--border)] text-[var(--muted)] hover:text-white hover:border-[var(--border-hover)]"
                        }`}
                    >
                      <fmt.icon className="w-4 h-4" />
                      <span className="font-medium">{fmt.label}</span>
                      <span className="text-[10px] opacity-60">{fmt.sub}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Scene Preview Hints ─────────────────────────── */}
              {detectedData && (
                <div className="glass-strong rounded-2xl border border-[var(--border)] p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Film className="w-4 h-4 text-pink-400" />
                    <span className="font-bold text-sm">AI Will Generate</span>
                  </div>
                  <div className="space-y-2">
                    {detectedData.emotion === "romantic" && (
                      <div className="text-xs text-[var(--muted)] bg-[var(--surface-2)] rounded-lg p-3 border border-[var(--border)] leading-relaxed">
                        💕 Romantic {selectedStyle} scene with soft lighting, warm tones, and emotional character expressions.
                      </div>
                    )}
                    {detectedData.emotion === "comedy" && (
                      <div className="text-xs text-[var(--muted)] bg-[var(--surface-2)] rounded-lg p-3 border border-[var(--border)] leading-relaxed">
                        😂 Fun cartoon reaction scene with vibrant colors, exaggerated expressions and dynamic poses.
                      </div>
                    )}
                    {detectedData.emotion === "suspense" && (
                      <div className="text-xs text-[var(--muted)] bg-[var(--surface-2)] rounded-lg p-3 border border-[var(--border)] leading-relaxed">
                        🎭 Dark dramatic scene with cinematic shadows, tension-filled compositions and moody atmosphere.
                      </div>
                    )}
                    {detectedData.emotion === "motivational" && (
                      <div className="text-xs text-[var(--muted)] bg-[var(--surface-2)] rounded-lg p-3 border border-[var(--border)] leading-relaxed">
                        🔥 Epic motivational visuals with dramatic lighting, powerful poses and inspirational atmosphere.
                      </div>
                    )}
                    {detectedData.emotion === "emotional" && (
                      <div className="text-xs text-[var(--muted)] bg-[var(--surface-2)] rounded-lg p-3 border border-[var(--border)] leading-relaxed">
                        🎬 Emotional cinematic anime scene with expressive characters, atmospheric lighting and deep mood.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Generate Button ─────────────────────────────── */}
              <button
                onClick={handleGenerate}
                disabled={!videoData || isGenerating}
                className={`w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-3 transition-all
                  ${!videoData || isGenerating
                    ? "bg-[var(--surface-2)] text-[var(--muted)] cursor-not-allowed border border-[var(--border)]"
                    : "bg-gradient-to-r from-fuchsia-600 via-pink-600 to-violet-600 text-white shadow-[0_0_30px_rgba(236,72,153,0.3)] hover:shadow-[0_0_40px_rgba(236,72,153,0.5)] hover:scale-[1.01]"
                  }`}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Generating Scenes...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-5 h-5" />
                    <span>Generate AI Animated Scenes</span>
                  </>
                )}
              </button>

              {/* Result Download */}
              {resultReady && finalVideoUrl && (
                <div className="glass-strong rounded-2xl border border-emerald-500/30 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <span className="font-bold text-sm text-emerald-300">Scene Ready!</span>
                  </div>
                  <div className="relative w-full aspect-video rounded-xl mb-3 bg-black overflow-hidden">
                    {isResultLoading && !isResultError && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
                      </div>
                    )}
                    {isResultError && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-[var(--muted)]">
                        <AlertTriangle className="w-10 h-10 text-rose-500 mb-2" />
                        <span className="text-sm font-medium text-center px-4">
                          Preview unavailable.<br/>You can still try downloading the file.
                        </span>
                      </div>
                    )}
                    <video
                      src={finalVideoUrl}
                      controls
                      className={`w-full h-full object-contain ${isResultLoading || isResultError ? 'hidden' : ''}`}
                      onLoadStart={() => { setIsResultLoading(true); setIsResultError(false); }}
                      onLoadedData={() => setIsResultLoading(false)}
                      onError={() => { setIsResultError(true); setIsResultLoading(false); }}
                    />
                  </div>
                  <a
                    href={finalDownloadUrl || finalVideoUrl}
                    download
                    className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-500 text-white hover:opacity-90 transition-opacity"
                  >
                    <Download className="w-4 h-4" />
                    Download Scene
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

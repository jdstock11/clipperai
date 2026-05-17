"use client";

import { useState, useEffect } from "react";
import {
  Search, Scissors, Zap, Film, Wand2, Music, Download,
  MonitorPlay, Headphones, Sparkles, Layers, ArrowRight
} from "lucide-react";
import { useRouter } from "next/navigation";

const features = [
  { icon: Film, title: "HD Video Export", desc: "Export clips in stunning 1080p quality with pristine audio." },
  { icon: Zap, title: "Lightning Fast", desc: "AI-optimized pipeline processes videos in seconds, not minutes." },
  { icon: MonitorPlay, title: "Full Video Support", desc: "Load entire videos — no duration limits, no preview caps." },
  { icon: Headphones, title: "Audio Preserved", desc: "Crystal-clear AAC audio at 192kbps in every export." },
  { icon: Layers, title: "Social Formats", desc: "Landscape, portrait, square — optimized for every platform." },
  { icon: Sparkles, title: "Smart Processing", desc: "Intelligent codec selection and faststart MP4 optimization." },
];

export default function Home() {
  const [url, setUrl] = useState("");
  const [cutUrl, setCutUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [errorToast, setErrorToast] = useState("");
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const router = useRouter();

  useEffect(() => { setMounted(true); }, []);

  const handleFetchVideo = async (targetUrl: string, destination: string) => {
    if (!targetUrl) return;
    setIsLoading(true);
    setErrorToast("");

    const controller = new AbortController();
    setAbortController(controller);

    try {
      const res = await fetch("/api/fetch-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: targetUrl }),
        signal: controller.signal
      });
      
      const data = await res.json();

      if (data.title) {
        sessionStorage.setItem("videoData", JSON.stringify(data));
        router.push(destination);
      } else if (data.error) {
        setErrorToast("Failed: " + data.error);
      } else {
        setErrorToast("Failed to fetch video. Ensure the URL is valid and accessible.");
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        setErrorToast("Fetch cancelled by user.");
      } else {
        console.error("Error:", error);
        setErrorToast("An unexpected error occurred: " + error.message);
      }
    } finally {
      setIsLoading(false);
      setAbortController(null);
    }
  };

  const handleCancel = () => {
    if (abortController) {
      abortController.abort();
    }
  };

  const handleUploadVideo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    const formData = new FormData();
    formData.append('video', file);

    try {
      const res = await fetch('/api/upload-video', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      
      if (data.url) {
        sessionStorage.setItem("videoData", JSON.stringify({
          title: file.name,
          url: data.url, 
          streamUrl: data.streamUrl,
          duration: data.duration || 0,
          isLocalUpload: true
        }));
        router.push("/cut-studio");
      } else {
        alert("Upload failed: " + data.error);
      }
    } catch (err: any) {
      alert("Error uploading file: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen flex flex-col relative text-white">
      {/* ── Navbar ──────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-strong px-6 md:px-12 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer">
          <div className="relative">
            <div className="absolute inset-0 bg-[var(--primary)] blur-lg opacity-40 rounded-full" />
            <Scissors className="text-[var(--primary)] w-7 h-7 relative z-10" />
          </div>
          <span className="text-lg font-bold tracking-tight">
            ClipForge <span className="text-gradient">AI</span>
          </span>
        </div>

        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-[var(--muted)]">
          <a href="#features" className="hover:text-white transition-colors duration-200">Features</a>
          <a href="#" className="hover:text-white transition-colors duration-200">Pricing</a>
          <a href="#" className="hover:text-white transition-colors duration-200">API</a>
        </div>

        <div className="flex items-center gap-3">
          <button className="hidden sm:block text-sm font-medium text-[var(--muted)] hover:text-white transition-colors px-4 py-2">
            Log in
          </button>
          <button className="btn-glow px-5 py-2.5 rounded-full text-sm flex items-center gap-2">
            <span>Get Started</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </nav>

      {/* ── Hero Section ───────────────────────────────────────── */}
      <section className="flex-1 flex flex-col items-center justify-center pt-36 pb-24 px-6 text-center relative">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-[var(--border)] mb-10"
             style={{ animationDelay: '0.1s' }}>
          <Zap className="w-4 h-4 text-[var(--primary)]" />
          <span className="text-sm font-medium text-[var(--muted)]">AI-Powered Video Clipping</span>
        </div>

        {/* Headline */}
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight mb-8 leading-[1.05] max-w-5xl">
          Create Viral Clips{" "}
          <br className="hidden sm:block" />
          <span className="text-gradient">in Seconds</span>
        </h1>

        {/* Subheadline */}
        <p className="text-lg md:text-xl text-[var(--muted)] max-w-2xl mx-auto mb-14 leading-relaxed font-light">
          Download, trim, resize, and export HD clips for Instagram Reels,
          YouTube Shorts, TikTok, Facebook and X.
        </p>

        {/* Selection Cards */}
        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6 mb-20 relative z-10">
          
          {/* Card 1: AI Viral Clips */}
          <div className="glass-strong rounded-2xl p-6 border border-[var(--border)] hover:border-[var(--primary)] transition-all flex flex-col items-center text-center group">
            <div className="w-14 h-14 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-[0_0_20px_var(--primary-dim)]">
              <Wand2 className="w-7 h-7" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Generate Viral Clips</h2>
            <p className="text-[var(--muted)] text-sm mb-6 flex-1">
              AI-powered engine automatically finds viral moments, resizes, and adds captions.
            </p>
            <form onSubmit={(e) => {
              e.preventDefault();
              handleFetchVideo(url, "/viral-clips");
            }} className="w-full relative">
              <div className="relative flex items-center bg-black/40 border border-[var(--border)] rounded-xl p-1 gap-1 focus-within:border-[var(--primary)] transition-colors">
                <Search className="absolute left-3 w-4 h-4 text-[var(--muted)]" />
                <input
                  type="url"
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Paste YouTube or Reel URL..."
                  className="w-full bg-transparent outline-none pl-10 pr-3 py-3 text-sm text-white placeholder-[var(--muted)]"
                  disabled={isLoading}
                />
                {isLoading ? (
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="bg-red-500/20 text-red-400 hover:bg-red-500/40 px-4 py-3 rounded-lg text-sm font-bold flex items-center justify-center min-w-[100px] transition-colors"
                  >
                    Cancel
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="btn-glow px-4 py-3 rounded-lg text-sm font-bold flex items-center justify-center min-w-[100px]"
                  >
                    Start
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Card 2: Cut & Remove Studio */}
          <div className="glass-strong rounded-2xl p-6 border border-[var(--border)] hover:border-[var(--accent)] transition-all flex flex-col items-center text-center group relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-[var(--accent)] text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl tracking-widest uppercase shadow-md">New</div>
            <div className="w-14 h-14 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-[0_0_20px_var(--accent-dim)]">
              <Scissors className="w-7 h-7" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Cut & Remove Studio</h2>
            <p className="text-[var(--muted)] text-sm mb-6 flex-1">
              Professional standalone timeline editor to slice out unwanted sections and trim precisely.
            </p>
            <form onSubmit={(e) => {
              e.preventDefault();
              handleFetchVideo(cutUrl, "/cut-studio");
            }} className="w-full relative">
              <div className="relative flex items-center bg-black/40 border border-[var(--border)] rounded-xl p-1 gap-1 focus-within:border-[var(--accent)] transition-colors">
                <input
                  type="url"
                  required
                  value={cutUrl}
                  onChange={(e) => setCutUrl(e.target.value)}
                  placeholder="Paste URL or upload..."
                  className="w-full bg-transparent outline-none pl-4 pr-3 py-3 text-sm text-white placeholder-[var(--muted)]"
                  disabled={isLoading}
                />
                {isLoading ? (
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="bg-red-500/20 text-red-400 hover:bg-red-500/40 px-4 py-3 rounded-lg text-sm font-bold flex items-center justify-center min-w-[100px] transition-colors"
                  >
                    Cancel
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="bg-gradient-to-r from-[var(--accent)] to-purple-500 hover:opacity-90 px-4 py-3 rounded-lg text-sm font-bold flex items-center justify-center min-w-[100px] text-white transition-opacity"
                  >
                    Open
                  </button>
                )}
              </div>
            </form>
            <div className="w-full mt-3">
              <button 
                onClick={() => document.getElementById('videoUpload')?.click()}
                disabled={isUploading}
                className="w-full py-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-xs text-[var(--muted)] hover:text-white hover:border-[var(--accent)] transition-all flex items-center justify-center gap-2"
              >
                {isUploading ? (
                  <><span className="animate-spin w-3 h-3 border border-[var(--muted)] border-t-transparent rounded-full" /> Uploading...</>
                ) : (
                  <>Or Upload Personal Video</>
                )}
              </button>
              <input 
                type="file" 
                id="videoUpload" 
                accept="video/*" 
                className="hidden" 
                onChange={handleUploadVideo} 
              />
            </div>
          </div>

        </div>

        {/* Platform badges */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-10">
          {["YouTube", "Instagram", "TikTok", "Shorts", "Facebook", "X"].map((p) => (
            <span key={p} className="px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wide glass text-[var(--muted)] border border-[var(--border)]">
              {p}
            </span>
          ))}
        </div>

        {/* Dashboard preview illustration */}
        <div className="w-full max-w-4xl aspect-[21/9] rounded-2xl glass border border-[var(--border)] overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--surface)] to-[var(--background)]" />
          <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.3) 1px, transparent 0)', backgroundSize: '32px 32px' }} />

          {/* Fake editor header */}
          <div className="absolute top-0 left-0 right-0 p-4 border-b border-[var(--border)] flex items-center gap-3">
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500/60" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
              <div className="w-3 h-3 rounded-full bg-green-500/60" />
            </div>
            <div className="ml-3 text-xs font-medium text-[var(--muted)] flex items-center gap-2">
              <Scissors className="w-3 h-3" /> ClipForge Editor
            </div>
          </div>

          {/* Center icon */}
          <div className="absolute inset-0 pt-14 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4 opacity-40">
              <Film className="w-14 h-14 text-[var(--primary)]" />
              <span className="text-sm font-bold tracking-[0.2em] text-[var(--muted)] uppercase">Cinematic Workspace</span>
            </div>
          </div>

          {/* Fake timeline at bottom */}
          <div className="absolute bottom-0 left-0 right-0 p-5">
            <div className="w-full h-12 bg-black/40 backdrop-blur-sm rounded-xl border border-[var(--border)] flex items-center px-4 gap-3 overflow-hidden">
              <div className="w-10 h-8 bg-[var(--primary)]/10 rounded border-l-2 border-[var(--primary)]" />
              <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full w-[35%] bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] rounded-full" />
              </div>
              <div className="w-10 h-8 bg-[var(--accent)]/10 rounded border-r-2 border-[var(--accent)]" />
            </div>
          </div>

          {/* Floating tags */}
          <div className="absolute top-1/4 left-[8%] animate-float glass px-3.5 py-2 rounded-lg flex items-center gap-2 border border-[var(--primary)]/20">
            <Zap className="w-3.5 h-3.5 text-[var(--primary)]" />
            <span className="text-[11px] font-bold">HD Ready</span>
          </div>
          <div className="absolute top-1/3 right-[8%] animate-float glass px-3.5 py-2 rounded-lg flex items-center gap-2 border border-[var(--accent)]/20" style={{ animationDelay: '-2s' }}>
            <Music className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span className="text-[11px] font-bold">Audio Sync</span>
          </div>
        </div>
      </section>

      {/* ── Features Section ───────────────────────────────────── */}
      <section id="features" className="py-28 px-6 relative">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-extrabold mb-5 tracking-tight">
              Pro-Level Editing, <span className="text-gradient">Zero Effort</span>
            </h2>
            <p className="text-[var(--muted)] max-w-xl mx-auto text-lg font-light">
              Everything you need to turn long-form content into engaging short-form videos.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <div
                key={f.title}
                className="group glass rounded-2xl p-7 border border-[var(--border)] relative overflow-hidden hover:border-[var(--border-hover)] transition-all duration-300"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary-dim)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative z-10">
                  <div className="w-11 h-11 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center mb-5 text-[var(--primary)] group-hover:scale-110 transition-transform duration-300">
                    <f.icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">{f.title}</h3>
                  <p className="text-[var(--muted)] text-sm leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="border-t border-[var(--border)] py-8 mt-auto relative z-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 opacity-60">
            <Scissors className="w-4 h-4" />
            <span className="font-bold text-sm tracking-tight">ClipForge AI</span>
          </div>
          <p className="text-[var(--muted)] text-sm">© 2026 ClipForge. All rights reserved.</p>
        </div>
      </footer>
      {/* ── Toast Error ───────────────────────────────────────── */}
      {errorToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-bottom-5">
          <div className="glass-strong border border-red-500/30 bg-red-500/10 text-red-200 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 max-w-lg w-full">
            <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4 text-red-400" />
            </div>
            <div className="flex-1 text-sm font-medium leading-relaxed">
              {errorToast}
            </div>
            <button 
              onClick={() => setErrorToast("")}
              className="text-red-400 hover:text-white transition-colors"
            >
              <ArrowRight className="w-4 h-4 rotate-45" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Sparkles, Film,
  Loader2, Zap, Play, CheckCircle2, Heart,
  Flame, Laugh, Smile, ArrowRight
} from "lucide-react";

const BACKEND_API = process.env.NEXT_PUBLIC_API_URL || '';

function formatTime(s: number): string {
  if (!s || isNaN(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export default function AIAnalyzer() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [videoData, setVideoData] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [loadingStage, setLoadingStage] = useState(0);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const STAGES = [
    "Downloading video streams...",
    "Extracting audio track for NLP...",
    "AI is analyzing scenes and emotions...",
    "Generating smart viral suggestions...",
    "Finalizing timestamps..."
  ];

  useEffect(() => {
    setMounted(true);
    const data = sessionStorage.getItem("videoData");
    if (data) {
      const parsed = JSON.parse(data);
      setVideoData(parsed);
      startAnalysis(parsed);
    } else {
      router.push("/");
    }
  }, [router]);

  useEffect(() => {
    if (!isAnalyzing) return;
    const interval = setInterval(() => {
      setLoadingStage((prev) => (prev < STAGES.length - 1 ? prev + 1 : prev));
    }, 2500);
    return () => clearInterval(interval);
  }, [isAnalyzing]);

  const startAnalysis = async (data: any) => {
    try {
      const res = await fetch(`${BACKEND_API}/analyze-video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: data.url, duration: data.duration })
      });
      const result = await res.json();
      
      if (result.error) throw new Error(result.error);
      
      // Artificial delay to let the user read the cool loading states
      setTimeout(() => {
        setAnalysisResult(result);
        setIsAnalyzing(false);
      }, Math.max(1000, 10000 - STAGES.length * 2000));
      
    } catch (err: any) {
      setError(err.message);
      setIsAnalyzing(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'comedy': return <Laugh className="w-5 h-5 text-yellow-400" />;
      case 'emotional': return <Heart className="w-5 h-5 text-rose-400" />;
      case 'action': return <Flame className="w-5 h-5 text-orange-400" />;
      case 'viral': return <Zap className="w-5 h-5 text-blue-400" />;
      default: return <Smile className="w-5 h-5 text-purple-400" />;
    }
  };

  const handleCreateClip = (clip: any) => {
    if (!videoData) return;
    
    // Update videoData in sessionStorage to pass timestamps to viral-clips editor
    const updatedData = {
      ...videoData,
      startTime: clip.startTime,
      endTime: clip.endTime,
      exportFormat: 'portrait' // Assume vertical format for viral clips
    };
    
    sessionStorage.setItem("videoData", JSON.stringify(updatedData));
    router.push("/viral-clips");
  };



  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)] text-white font-sans">
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
            <div className="absolute inset-0 bg-blue-500 blur-md opacity-30 rounded-full" />
            <Sparkles size={16} className="text-blue-400 relative z-10" />
          </div>
          <span className="font-bold text-sm">AI Scene <span className="text-gradient">Analyzer</span></span>
        </div>
      </header>

      {/* ── Main Content ────────────────────────────────────── */}
      <main className="flex-1 flex flex-col items-center p-6 md:p-12 overflow-y-auto">
        
        {isAnalyzing ? (
          <div className="flex-1 flex flex-col items-center justify-center max-w-md w-full">
            <div className="relative mb-10">
              <div className="w-32 h-32 rounded-full border border-blue-500/20" />
              <div className="absolute inset-0 w-32 h-32 rounded-full border-2 border-t-blue-500 animate-spin" />
              <div className="absolute inset-0 m-auto w-24 h-24 rounded-full bg-blue-500/10 flex items-center justify-center animate-pulse">
                <Sparkles className="w-10 h-10 text-blue-400" />
              </div>
            </div>
            
            <h2 className="text-2xl font-bold mb-4">AI Analysis in Progress</h2>
            
            <div className="w-full space-y-4">
              {STAGES.map((stage, index) => (
                <div 
                  key={stage} 
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-all duration-500 ${
                    index < loadingStage 
                      ? 'bg-[var(--surface-2)] border-green-500/30 text-white' 
                      : index === loadingStage 
                        ? 'bg-blue-500/10 border-blue-500/50 text-blue-400'
                        : 'bg-transparent border-[var(--border)] text-[var(--muted)] opacity-50'
                  }`}
                >
                  {index < loadingStage ? (
                    <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
                  ) : index === loadingStage ? (
                    <Loader2 className="w-5 h-5 animate-spin shrink-0" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-[var(--muted)] shrink-0" />
                  )}
                  <span className="text-sm font-medium">{stage}</span>
                </div>
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="glass-strong p-8 rounded-2xl border border-red-500/30 text-center max-w-md">
              <Zap className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">Analysis Failed</h2>
              <p className="text-[var(--muted)] text-sm mb-6">{error}</p>
              <button 
                onClick={() => router.push("/")}
                className="btn-glow bg-red-500/20 text-red-400 px-6 py-2 rounded-xl text-sm font-bold"
              >
                Go Back
              </button>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl w-full space-y-8 animate-in fade-in slide-in-from-bottom-10 duration-700">
            {/* Video Summary Section */}
            <div className="glass-strong rounded-3xl p-8 border border-blue-500/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <Sparkles className="w-48 h-48" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <Film className="w-6 h-6 text-blue-400" />
                  <h2 className="text-2xl font-bold">Analysis Complete</h2>
                </div>
                <p className="text-[var(--muted)] leading-relaxed text-lg max-w-2xl">
                  {analysisResult?.summary}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold">Smart Suggested Clips</h3>
              <span className="text-sm font-medium px-3 py-1 bg-[var(--surface-2)] rounded-full text-[var(--muted)]">
                {analysisResult?.clips?.length || 0} Clips Found
              </span>
            </div>

            {/* Clips Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {analysisResult?.clips?.map((clip: any, i: number) => (
                <div 
                  key={clip.id} 
                  className="glass rounded-2xl p-6 border border-[var(--border)] hover:border-blue-500/50 transition-all flex flex-col group relative"
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  <div className="absolute top-6 right-6 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--surface-2)] text-xs font-bold border border-[var(--border)]">
                    <Zap className="w-3.5 h-3.5 text-yellow-400" />
                    {clip.confidence}% Match
                  </div>

                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
                      {getCategoryIcon(clip.category)}
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-[var(--muted)] font-bold mb-0.5">
                        {clip.category}
                      </div>
                      <h4 className="text-lg font-bold">{clip.title}</h4>
                    </div>
                  </div>

                  <p className="text-sm text-[var(--muted)] leading-relaxed mb-6 flex-1">
                    "{clip.reason}"
                  </p>

                  <div className="flex items-center justify-between pt-4 border-t border-[var(--border)] mt-auto">
                    <div className="flex items-center gap-4 text-sm font-mono text-[var(--muted)]">
                      <div className="flex items-center gap-1.5">
                        <Play className="w-3.5 h-3.5" />
                        {formatTime(clip.startTime)} → {formatTime(clip.endTime)}
                      </div>
                      <div className="px-2 py-0.5 rounded bg-[var(--surface-2)] font-bold text-white text-xs">
                        {Math.round(clip.duration)}s
                      </div>
                    </div>
                    <button 
                      onClick={() => handleCreateClip(clip)}
                      className="btn-glow px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2"
                    >
                      Create Clip
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}


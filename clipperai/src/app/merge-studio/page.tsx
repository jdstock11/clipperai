"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useMergeStore, MergeClip } from "@/store/useMergeStore";
import { useDropzone } from "react-dropzone";
import {
  ArrowLeft, Film, Monitor, Smartphone, Square, 
  Loader2, Zap, Download, Play, Pause, X, GripVertical, Plus, CheckCircle2, Layers, Type
} from "lucide-react";
import TextOverlayCanvas from "@/components/text-overlay/TextOverlayCanvas";
import TextOverlayEditor from "@/components/text-overlay/TextOverlayEditor";
import { useTextOverlayStore } from "@/store/useTextOverlayStore";

const BACKEND_API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

const FORMAT_OPTIONS = [
  { id: "landscape", label: "Landscape", sub: "16:9", icon: Monitor },
  { id: "portrait", label: "Portrait", sub: "9:16", icon: Smartphone },
  { id: "square", label: "Square", sub: "1:1", icon: Square },
];

export default function MergeStudio() {
  const router = useRouter();
  
  const { 
    clips, activeClipId, playing, exportFormat,
    addClip, removeClip, reorderClips, setActiveClip, setPlaying, setExportFormat, clearClips
  } = useMergeStore();

  const [mounted, setMounted] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportResult, setExportResult] = useState<string | null>(null);
  const [exportProgress, setExportProgress] = useState(0);
  const [uploadingPreviews, setUploadingPreviews] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  // Text overlay
  const { layers: textLayers, clearLayers: clearTextLayers } = useTextOverlayStore();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeIndex = activeClipId ? clips.findIndex(c => c.id === activeClipId) : -1;
  const activeClip = activeIndex >= 0 ? clips[activeIndex] : null;

  useEffect(() => {
    if (clips.length > 0 && !activeClipId) {
      setActiveClip(clips[0].id);
    } else if (clips.length === 0 && activeClipId) {
      setActiveClip(null);
    }
  }, [clips, activeClipId, setActiveClip]);

  useEffect(() => {
    if (videoRef.current) {
      if (playing) videoRef.current.play().catch(() => setPlaying(false));
      else videoRef.current.pause();
    }
  }, [playing, setPlaying, activeClipId]); // re-run when activeClipId changes to autoplay next if needed

  const handleVideoEnded = () => {
    if (activeIndex >= 0 && activeIndex < clips.length - 1) {
      // Play next clip
      setActiveClip(clips[activeIndex + 1].id);
      setPlaying(true);
    } else {
      // Reached the end
      setPlaying(false);
      setActiveClip(clips[0]?.id || null);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'video/mp4': ['.mp4'],
      'video/quicktime': ['.mov'],
      'video/webm': ['.webm'],
      'video/x-matroska': ['.mkv']
    },
    onDrop: async (acceptedFiles) => {
      setUploadingPreviews(true);
      for (const file of acceptedFiles) {
        const id = `clip_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const objectUrl = URL.createObjectURL(file);
        
        // To get duration, we can load it briefly
        const videoElement = document.createElement('video');
        videoElement.src = objectUrl;
        await new Promise((resolve) => {
          videoElement.onloadedmetadata = () => {
            resolve(true);
          };
        });

        addClip({
          id,
          file,
          url: objectUrl,
          duration: videoElement.duration || 0,
        });
      }
      setUploadingPreviews(false);
    }
  });

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
    if (clips.length === 0) return;
    setIsExporting(true);
    setExportResult(null);
    setExportProgress(0);

    try {
      // 1. Upload all local files to the server
      const uploadedUrls = [];
      let i = 1;
      for (const clip of clips) {
        setLoadingMessage(`Uploading clip ${i} of ${clips.length}...`);
        if (clip.file) {
          const formData = new FormData();
          formData.append('video', clip.file);
          
          const uploadRes = await fetch(`${BACKEND_API.replace('/api', '')}/api/upload-video`, {
            method: 'POST',
            body: formData,
          });
          const uploadData = await uploadRes.json();
          if (uploadData.url) {
            uploadedUrls.push(uploadData.url);
          } else {
            throw new Error(`Failed to upload ${clip.file.name}`);
          }
        } else if (clip.streamUrl) {
          uploadedUrls.push(clip.streamUrl);
        }
        i++;
      }

      setLoadingMessage("Initiating Merge...");

      // 2. Call merge API
      const res = await fetch(`${BACKEND_API}/merge-video`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          urls: uploadedUrls,
          format: exportFormat,
          textLayers: textLayers.length > 0 ? textLayers : undefined,
        }),
      });

      const data = await res.json();
      if (data.jobId) {
        setLoadingMessage("");
        pollJobStatus(data.jobId);
      } else {
        throw new Error(data.error || 'Merge failed to start');
      }
    } catch (err: any) {
      alert("Merge error: " + err.message);
      setIsExporting(false);
    }
  };

  const [loadingMessage, setLoadingMessage] = useState("");

  const totalDuration = clips.reduce((acc, c) => acc + c.duration, 0);

  if (!mounted) return null;

  return (
    <div className="min-h-screen flex flex-col bg-[#050505] text-white">
      {/* HEADER */}
      <header className="px-5 py-3.5 flex items-center gap-4 z-20 border-b border-[var(--border)] bg-[#0a0a0c]">
        <button
          className="text-[var(--muted)] hover:text-white flex items-center gap-2 transition-colors text-sm font-medium"
          onClick={() => {
            clearClips();
            router.push("/");
          }}
        >
          <ArrowLeft size={16} /> Back
        </button>
        <div className="font-bold text-sm">ClipForge <span className="text-gradient">AI</span> / Merge Studio</div>
      </header>

      {/* MAIN */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* LEFT: Player + Timeline */}
        <div className="flex-1 flex flex-col min-w-0 p-5 space-y-4 overflow-y-auto">
          
          {/* Video Player */}
          <div className="flex-1 flex items-center justify-center min-h-[40vh]">
            <div className="w-full max-w-4xl aspect-video rounded-xl overflow-hidden relative border border-[var(--border)] bg-black shadow-[0_0_50px_rgba(0,0,0,0.8)] flex items-center justify-center">
              {clips.length === 0 ? (
                <div 
                  {...getRootProps()} 
                  className={`w-full h-full flex flex-col items-center justify-center border-2 border-dashed transition-colors cursor-pointer ${isDragActive ? 'border-emerald-500 bg-emerald-500/10' : 'border-[var(--border)] bg-[var(--surface)] hover:border-emerald-500/50'}`}
                >
                  <input {...getInputProps()} />
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
                    <Layers className="w-8 h-8" />
                  </div>
                  <p className="text-lg font-bold">Drop videos to merge</p>
                  <p className="text-sm text-[var(--muted)] mt-2">MP4, MOV, WEBM, MKV supported</p>
                </div>
              ) : activeClip ? (
                <>
                  <video
                    ref={videoRef}
                    src={activeClip.url}
                    className="w-full h-full object-contain"
                    onEnded={handleVideoEnded}
                    onTimeUpdate={() => { if (videoRef.current) setCurrentTime(videoRef.current.currentTime); }}
                    autoPlay={playing}
                    onClick={() => setPlaying(!playing)}
                  />
                  {/* Text Overlay Canvas */}
                  <TextOverlayCanvas currentTime={currentTime} duration={activeClip.duration} clipId={activeClip.id} />
                  <div className="absolute top-4 left-4 bg-black/60 px-3 py-1 rounded text-xs font-bold font-mono border border-white/10 backdrop-blur">
                    Clip {activeIndex + 1} / {clips.length}
                  </div>
                  {/* Custom Player Controls overlay */}
                  <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/80 to-transparent flex items-center gap-4 opacity-0 hover:opacity-100 transition-opacity">
                    <button onClick={() => setPlaying(!playing)} className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-[0_0_15px_rgba(16,185,129,0.5)]">
                      {playing ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
                    </button>
                    <span className="font-mono text-sm text-white drop-shadow-md">
                      {activeClip.file?.name}
                    </span>
                  </div>
                </>
              ) : null}
            </div>
          </div>

          {/* Timeline */}
          {clips.length > 0 && (
            <div className="bg-[#0a0a0c] border border-[var(--border)] rounded-xl p-4 flex gap-4 overflow-x-auto min-h-[120px] items-center">
              {clips.map((clip, idx) => (
                <div 
                  key={clip.id}
                  draggable
                  onDragStart={() => setDraggedIdx(idx)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (draggedIdx !== null && draggedIdx !== idx) {
                      reorderClips(draggedIdx, idx);
                    }
                    setDraggedIdx(null);
                  }}
                  className={`relative flex-shrink-0 w-48 h-24 rounded-lg overflow-hidden border-2 cursor-grab active:cursor-grabbing transition-all ${activeClipId === clip.id ? 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'border-[var(--border)] hover:border-[var(--muted)]'}`}
                  onClick={() => setActiveClip(clip.id)}
                >
                  <video 
                    src={clip.url} 
                    className="w-full h-full object-cover opacity-50"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                  
                  <div className="absolute top-1 left-1 text-white/50 cursor-grab px-1">
                    <GripVertical className="w-4 h-4" />
                  </div>
                  
                  <div className="absolute top-1 right-1">
                    <button 
                      onClick={(e) => { e.stopPropagation(); removeClip(clip.id); }}
                      className="bg-red-500/80 hover:bg-red-500 text-white rounded-full p-1 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  
                  <div className="absolute bottom-2 left-2 right-2 flex justify-between text-xs font-mono drop-shadow-md">
                    <span className="truncate pr-2">{idx + 1}. {clip.file?.name}</span>
                    <span>{Math.round(clip.duration)}s</span>
                  </div>
                </div>
              ))}
              
              <div 
                {...getRootProps()} 
                className={`flex-shrink-0 w-24 h-24 rounded-lg border-2 border-dashed flex items-center justify-center cursor-pointer transition-colors ${isDragActive ? 'border-emerald-500 bg-emerald-500/10' : 'border-[var(--border)] hover:border-emerald-500 hover:text-emerald-500 text-[var(--muted)]'}`}
              >
                <input {...getInputProps()} />
                <Plus className="w-8 h-8" />
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Sidebar */}
        <aside className="w-full lg:w-[320px] bg-[#0a0a0c] border-l border-[var(--border)] flex flex-col overflow-y-auto">
          <div className="p-5 space-y-6">

            {/* Text Overlay Editor */}
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
              <TextOverlayEditor
                duration={activeClip?.duration || totalDuration}
                clipId={activeClip?.id}
                showClipToggle={clips.length > 0}
              />
            </div>
            
            <div className="space-y-3">
              <h3 className="font-bold text-sm flex items-center gap-2 text-white">
                <Layers className="w-4 h-4 text-emerald-500" /> Export Settings
              </h3>

              <div className="grid grid-cols-2 gap-2">
                {FORMAT_OPTIONS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setExportFormat(f.id)}
                    className={`relative rounded-xl p-3 border transition-all duration-200 text-left ${
                      exportFormat === f.id
                        ? "border-emerald-500 bg-emerald-500/10"
                        : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-hover)]"
                    }`}
                  >
                    <f.icon className={`w-4 h-4 mb-2 ${exportFormat === f.id ? "text-emerald-500" : "text-[var(--muted)]"}`} />
                    <div className="text-xs font-bold text-white">{f.label}</div>
                    <div className="text-[10px] text-[var(--muted)]">{f.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Export Summary */}
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 space-y-3 shadow-inner">
              <div className="flex justify-between items-center text-sm">
                <span className="text-[var(--muted)]">Total Clips</span>
                <span className="font-mono text-white">{clips.length}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-[var(--muted)]">Est. Length</span>
                <span className="font-mono font-bold text-emerald-500">{Math.round(totalDuration)}s</span>
              </div>
            </div>

            {/* Export Button */}
            <div className="space-y-3">
              <button
                onClick={handleExport}
                disabled={isExporting || clips.length < 2 || uploadingPreviews}
                className={`w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 text-sm transition-all ${clips.length < 2 ? 'bg-[var(--surface)] text-[var(--muted)] cursor-not-allowed border border-[var(--border)]' : 'bg-gradient-to-r from-emerald-600 to-teal-500 hover:opacity-90 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]'}`}
              >
                {uploadingPreviews ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : isExporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{loadingMessage || `Merging... ${exportProgress}%`}</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Merge {clips.length > 0 ? clips.length : ''} Clips</span>
                  </>
                )}
              </button>

              {isExporting && exportProgress > 0 && (
                <div className="w-full h-1.5 bg-[var(--surface)] rounded-full overflow-hidden border border-[var(--border)]">
                  <div 
                    className="h-full bg-emerald-500 transition-all duration-300"
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
                  <CheckCircle2 className="w-4 h-4" /> Save Merged Video
                </a>
              )}
            </div>
            
            {clips.length < 2 && clips.length > 0 && (
              <p className="text-xs text-yellow-500/80 text-center font-medium">Add at least one more clip to merge.</p>
            )}
          </div>
        </aside>
      </main>
    </div>
  );
}

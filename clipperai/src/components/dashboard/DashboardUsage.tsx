"use client";

import { Check, Shield, Clock, Film, Scissors, Layers, Sparkles } from "lucide-react";

export default function DashboardUsage() {
  // Mock data for MVP
  const user = {
    plan: "FREE",
    renewalDate: "-",
    usage: {
      viralClips: { used: 0, limit: 2 },
      cutExports: { used: 1, limit: 2 },
      mergeExports: { used: 0, limit: 2 },
      totalExports: { used: 1, limit: 2 }
    }
  };

  const getPercentage = (used: number, limit: number) => {
    if (limit === Infinity) return 0;
    return Math.min(100, (used / limit) * 100);
  };

  const isFree = user.plan === "FREE";

  return (
    <div className="glass-strong border border-[var(--border)] rounded-3xl p-8 max-w-4xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-10">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2 mb-2">
            <Shield className={isFree ? "text-yellow-500" : "text-purple-500"} />
            Current Plan: <span className="text-gradient">{isFree ? "Free Tier" : "Creator Pro"}</span>
          </h2>
          <p className="text-[var(--muted)] text-sm flex items-center gap-2">
            <Clock className="w-4 h-4" /> Renewal Date: {user.renewalDate}
          </p>
        </div>
        {isFree && (
          <button className="bg-gradient-to-r from-purple-600 to-pink-500 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity flex items-center gap-2 shadow-[0_0_15px_rgba(168,85,247,0.3)]">
            <Sparkles className="w-4 h-4" /> Upgrade to Pro
          </button>
        )}
      </div>

      {/* Usage Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Viral Clips */}
        <div className="bg-black/40 border border-white/5 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-sm font-bold">
              <Film className="w-4 h-4 text-[var(--primary)]" /> Viral Clips
            </div>
            <div className="text-xs font-mono text-[var(--muted)]">
              {user.usage.viralClips.used} / {isFree ? user.usage.viralClips.limit : '∞'}
            </div>
          </div>
          <div className="w-full h-1.5 bg-[var(--surface-2)] rounded-full overflow-hidden">
            <div 
              className="h-full bg-[var(--primary)] rounded-full transition-all duration-500"
              style={{ width: `${getPercentage(user.usage.viralClips.used, isFree ? user.usage.viralClips.limit : Infinity)}%` }}
            />
          </div>
        </div>

        {/* Cut Studio */}
        <div className="bg-black/40 border border-white/5 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-sm font-bold">
              <Scissors className="w-4 h-4 text-[var(--accent)]" /> Cut Studio
            </div>
            <div className="text-xs font-mono text-[var(--muted)]">
              {user.usage.cutExports.used} / {isFree ? user.usage.cutExports.limit : '∞'}
            </div>
          </div>
          <div className="w-full h-1.5 bg-[var(--surface-2)] rounded-full overflow-hidden">
            <div 
              className="h-full bg-[var(--accent)] rounded-full transition-all duration-500"
              style={{ width: `${getPercentage(user.usage.cutExports.used, isFree ? user.usage.cutExports.limit : Infinity)}%` }}
            />
          </div>
        </div>

        {/* Merge Studio */}
        <div className="bg-black/40 border border-white/5 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-sm font-bold">
              <Layers className="w-4 h-4 text-emerald-500" /> Merge Studio
            </div>
            <div className="text-xs font-mono text-[var(--muted)]">
              {user.usage.mergeExports.used} / {isFree ? user.usage.mergeExports.limit : '∞'}
            </div>
          </div>
          <div className="w-full h-1.5 bg-[var(--surface-2)] rounded-full overflow-hidden">
            <div 
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${getPercentage(user.usage.mergeExports.used, isFree ? user.usage.mergeExports.limit : Infinity)}%` }}
            />
          </div>
        </div>

      </div>

      {isFree && (
        <div className="mt-8 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-start gap-3">
          <div className="mt-0.5"><Check className="w-5 h-5 text-yellow-500" /></div>
          <div>
            <h4 className="font-bold text-sm text-yellow-500 mb-1">Free Tier Limitations</h4>
            <p className="text-xs text-[var(--muted)] leading-relaxed">
              You are currently on the free plan which includes a total of 2 exports across all tools combined. 
              Exports are limited to 480p quality and include a ClipForge watermark.
              Total used: {user.usage.totalExports.used} / 2
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

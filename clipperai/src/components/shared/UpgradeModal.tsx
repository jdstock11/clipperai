"use client";

import { X, Sparkles, Check, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  message?: string;
}

export default function UpgradeModal({ isOpen, onClose, message }: UpgradeModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative w-full max-w-lg glass-strong border border-purple-500/30 rounded-3xl p-8 overflow-hidden shadow-[0_0_50px_rgba(168,85,247,0.15)] animate-in fade-in zoom-in-95 duration-300">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-600 to-pink-500" />
        
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 text-[var(--muted)] hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8 text-purple-400" />
          </div>
          <h2 className="text-2xl font-extrabold mb-2">Unlock Unlimited Power</h2>
          <p className="text-[var(--muted)] text-sm">
            {message || "You've reached the limit of your free plan. Upgrade to remove watermarks and export in Full HD."}
          </p>
        </div>

        <div className="bg-black/40 border border-white/5 rounded-2xl p-5 mb-8">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] mb-4">Creator Pro Benefits</h3>
          <ul className="space-y-3">
            {[
              "Unlimited exports & processing",
              "1080p Full HD without watermarks",
              "Faster AI rendering & priority queue",
              "All Studio tools unlocked"
            ].map((feature, i) => (
              <li key={i} className="flex items-center gap-3 text-sm">
                <div className="w-4 h-4 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <Check className="w-2.5 h-2.5 text-emerald-400" />
                </div>
                <span className="text-white/90 font-medium">{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 py-3.5 rounded-xl border border-white/10 text-sm font-bold hover:bg-white/5 transition-colors"
          >
            Maybe Later
          </button>
          <button 
            onClick={() => {
              onClose();
              router.push('/pricing');
            }}
            className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 text-sm font-bold text-white hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(168,85,247,0.3)]"
          >
            View Plans <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

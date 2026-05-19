"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ArrowRight, Zap, Scissors, Layers, Sparkles, Shield, Clock } from "lucide-react";

export default function PricingPage() {
  const router = useRouter();
  const [isYearly, setIsYearly] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const plans = [
    {
      id: "viral",
      title: "Generate Viral Clips",
      monthlyPrice: 499,
      yearlyPrice: 5000,
      icon: Zap,
      color: "var(--primary)",
      description: "AI-powered engine for social media.",
      features: [
        isYearly ? "130 AI clip generations / year" : "10 AI clip generations / month",
        isYearly ? "Priority processing" : "Standard processing",
        "HD 720p export",
        "AI captions",
        "YouTube & Reel support"
      ]
    },
    {
      id: "cut",
      title: "Cut & Remove Studio",
      monthlyPrice: 499,
      yearlyPrice: 5000,
      icon: Scissors,
      color: "var(--accent)",
      description: "Professional timeline editor for trimming.",
      features: [
        isYearly ? "130 exports / year" : "10 exports / month",
        isYearly ? "Priority queue" : "Standard queue",
        isYearly ? "Faster exports" : "HD quality",
        "Trim & cut tools",
        "Remove unwanted sections",
        "Social export formats"
      ]
    },
    {
      id: "merge",
      title: "Merge & Combine Studio",
      monthlyPrice: 499,
      yearlyPrice: 5000,
      icon: Layers,
      color: "emerald-500",
      description: "Combine multiple clips into one.",
      features: [
        isYearly ? "75 merged exports / year" : "5 merged exports / month",
        isYearly ? "Priority processing" : "Standard processing",
        isYearly ? "Faster rendering" : "HD export",
        "Unlimited clips per project",
        "Audio preserved"
      ]
    },
    {
      id: "creator-pro",
      title: "Creator Pro",
      monthlyPrice: 1499,
      yearlyPrice: 15000,
      icon: Sparkles,
      color: "purple-500",
      description: "All tools unlocked for professionals.",
      popular: true,
      features: [
        "ALL tools unlocked",
        "Unlimited exports",
        "1080p Full HD",
        "Faster AI rendering & Priority servers",
        "Bulk processing",
        "Watermark removal tools",
        "Upcoming AI features & Beta access",
        "Multi-device access"
      ]
    }
  ];

  const handleUpgrade = (planId: string) => {
    setLoadingPlan(planId);
    // Placeholder for real checkout integration
    setTimeout(() => {
      alert(`Payment integration placeholder for plan: ${planId} (${isYearly ? 'Yearly' : 'Monthly'})`);
      setLoadingPlan(null);
    }, 1500);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#050505] text-white overflow-hidden relative">
      {/* Background Mesh */}
      <div className="absolute inset-0 z-0 opacity-40">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-[var(--primary)] blur-[150px] rounded-full opacity-20" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-[var(--accent)] blur-[150px] rounded-full opacity-10" />
        <div className="absolute top-[30%] right-[20%] w-[400px] h-[400px] bg-emerald-500 blur-[150px] rounded-full opacity-10" />
      </div>

      {/* Navbar */}
      <nav className="relative z-20 glass-strong px-6 md:px-12 py-4 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push('/')}>
          <div className="relative">
            <div className="absolute inset-0 bg-[var(--primary)] blur-lg opacity-40 rounded-full" />
            <Scissors className="text-[var(--primary)] w-7 h-7 relative z-10" />
          </div>
          <span className="text-lg font-bold tracking-tight">
            ClipForge <span className="text-gradient">AI</span>
          </span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-[var(--muted)]">
          <button onClick={() => router.push('/#features')} className="hover:text-white transition-colors duration-200">Features</button>
          <button className="text-white">Pricing</button>
        </div>
        <button className="btn-glow px-5 py-2.5 rounded-full text-sm flex items-center gap-2">
          <span>Log in</span>
        </button>
      </nav>

      {/* Main Content */}
      <main className="flex-1 relative z-10 py-20 px-6">
        <div className="max-w-7xl mx-auto">
          
          <div className="text-center mb-16 space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-[var(--border)] text-sm font-medium text-[var(--muted)] animate-float">
              <Shield className="w-4 h-4 text-emerald-400" /> Start free, upgrade when you need more.
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">
              Simple pricing for <span className="text-gradient">creators</span>
            </h1>
            <p className="text-[var(--muted)] text-lg max-w-2xl mx-auto">
              Choose the perfect plan for your video editing workflow. Save up to 20% with annual billing.
            </p>

            {/* Toggle */}
            <div className="flex items-center justify-center mt-10">
              <div className="bg-black/50 border border-white/10 p-1 rounded-full flex items-center relative">
                <button 
                  onClick={() => setIsYearly(false)}
                  className={`relative z-10 px-6 py-2.5 text-sm font-bold rounded-full transition-colors ${!isYearly ? 'text-white' : 'text-[var(--muted)] hover:text-white'}`}
                >
                  Monthly
                </button>
                <button 
                  onClick={() => setIsYearly(true)}
                  className={`relative z-10 px-6 py-2.5 text-sm font-bold rounded-full transition-colors flex items-center gap-2 ${isYearly ? 'text-white' : 'text-[var(--muted)] hover:text-white'}`}
                >
                  Yearly <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">Save 16%</span>
                </button>
                {/* Active Pill Indicator */}
                <div 
                  className="absolute top-1 bottom-1 w-[120px] bg-[var(--surface-2)] border border-white/10 rounded-full transition-transform duration-300 ease-out z-0"
                  style={{ transform: isYearly ? 'translateX(100px)' : 'translateX(0)', width: isYearly ? '160px' : '100px' }}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan) => (
              <div 
                key={plan.id}
                className={`glass-strong rounded-3xl p-6 border transition-all duration-300 relative flex flex-col ${
                  plan.popular 
                    ? 'border-purple-500/50 shadow-[0_0_30px_rgba(168,85,247,0.15)] -translate-y-2' 
                    : 'border-[var(--border)] hover:border-white/20'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-600 to-pink-500 text-white text-[10px] font-bold px-4 py-1.5 rounded-full uppercase tracking-widest shadow-lg">
                    Most Popular
                  </div>
                )}

                <div className="mb-6 mt-2">
                  <div className={`w-12 h-12 rounded-xl mb-4 flex items-center justify-center bg-black/50 border border-white/5`}>
                    <plan.icon className={`w-6 h-6 text-${plan.color.includes('var') ? `[${plan.color}]` : plan.color}`} />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{plan.title}</h3>
                  <p className="text-[var(--muted)] text-sm h-10">{plan.description}</p>
                </div>

                <div className="mb-8">
                  <div className="flex items-end gap-1">
                    <span className="text-4xl font-extrabold tracking-tight">
                      ₹{isYearly ? plan.yearlyPrice : plan.monthlyPrice}
                    </span>
                    <span className="text-[var(--muted)] mb-1">/{isYearly ? 'yr' : 'mo'}</span>
                  </div>
                </div>

                <ul className="space-y-4 mb-8 flex-1">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm">
                      <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3 h-3 text-emerald-400" />
                      </div>
                      <span className="text-white/80">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button 
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={loadingPlan === plan.id}
                  className={`w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                    plan.popular 
                      ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white hover:opacity-90 shadow-[0_0_15px_rgba(168,85,247,0.4)]' 
                      : 'glass border border-[var(--border)] hover:bg-white/5'
                  }`}
                >
                  {loadingPlan === plan.id ? (
                    <span className="animate-pulse">Processing...</span>
                  ) : (
                    <>
                      {plan.popular ? 'Get Creator Pro' : 'Upgrade Now'}
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>

          {/* Free Tier Info */}
          <div className="mt-16 max-w-3xl mx-auto glass border border-white/5 rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-6 justify-between text-center sm:text-left">
            <div>
              <h4 className="font-bold text-lg mb-1 flex items-center justify-center sm:justify-start gap-2">
                <Clock className="w-5 h-5 text-yellow-500" /> Free Plan Active
              </h4>
              <p className="text-[var(--muted)] text-sm">
                You currently have 2 free exports total (480p, watermarked). Upgrade anytime.
              </p>
            </div>
            <button className="px-5 py-2.5 rounded-xl border border-white/10 text-sm font-bold hover:bg-white/5 transition-colors whitespace-nowrap">
              Start Free
            </button>
          </div>

        </div>
      </main>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Settings, Layers, Type, Sliders, Image as ImageIcon } from 'lucide-react';
import { motion } from 'framer-motion';

export default function MergeStudioControl() {
  const [activeTab, setActiveTab] = useState('settings');

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Merge Studio Controls</h1>
        <p className="text-zinc-400 mt-1">Configure rendering presets, watermarks, and text overlays.</p>
      </div>

      <div className="flex gap-4 border-b border-zinc-800 pb-px">
        <button 
          onClick={() => setActiveTab('settings')}
          className={`pb-4 text-sm font-medium transition-colors relative ${activeTab === 'settings' ? 'text-cyan-400' : 'text-zinc-400 hover:text-white'}`}
        >
          <Settings className="inline-block h-4 w-4 mr-2" />
          General Settings
          {activeTab === 'settings' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]" />}
        </button>
        <button 
          onClick={() => setActiveTab('text')}
          className={`pb-4 text-sm font-medium transition-colors relative ${activeTab === 'text' ? 'text-purple-400' : 'text-zinc-400 hover:text-white'}`}
        >
          <Type className="inline-block h-4 w-4 mr-2" />
          Text & Captions Editor
          {activeTab === 'text' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-400 shadow-[0_0_10px_rgba(192,132,252,0.8)]" />}
        </button>
      </div>

      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {activeTab === 'settings' && (
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Rendering Presets</CardTitle>
                <CardDescription>Default quality and formats for merged videos.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-300">Default Resolution</label>
                  <select className="flex h-10 w-full rounded-md border border-zinc-800 bg-zinc-950/50 px-3 py-2 text-sm text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500">
                    <option value="1080p">1080p (1920x1080)</option>
                    <option value="720p">720p (1280x720)</option>
                    <option value="4k">4K (3840x2160)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-300">Default Framerate</label>
                  <select className="flex h-10 w-full rounded-md border border-zinc-800 bg-zinc-950/50 px-3 py-2 text-sm text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500">
                    <option value="30">30 FPS</option>
                    <option value="60">60 FPS</option>
                  </select>
                </div>
                <Button className="w-full">Save Presets</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Watermark Control</CardTitle>
                <CardDescription>Manage default watermark applied to free tier users.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed border-zinc-800 rounded-lg p-6 flex flex-col items-center justify-center text-zinc-500 hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-colors cursor-pointer">
                  <ImageIcon className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">Click to upload watermark PNG</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-300">Opacity (%)</label>
                  <Input type="number" defaultValue="50" min="0" max="100" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-300">Position</label>
                  <select className="flex h-10 w-full rounded-md border border-zinc-800 bg-zinc-950/50 px-3 py-2 text-sm text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500">
                    <option value="bottom-right">Bottom Right</option>
                    <option value="bottom-left">Bottom Left</option>
                    <option value="top-right">Top Right</option>
                    <option value="top-left">Top Left</option>
                  </select>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'text' && (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Live Preview Canvas */}
            <Card className="lg:col-span-2 overflow-hidden border-zinc-800 bg-zinc-950/80">
              <CardHeader className="border-b border-zinc-800 bg-zinc-900/50">
                <CardTitle className="flex items-center text-lg">
                  <PlaySquare className="mr-2 h-5 w-5 text-purple-400" />
                  Live Preview Editor UI
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 relative flex items-center justify-center min-h-[500px] bg-[url('https://transparenttextures.com/patterns/cubes.png')] bg-zinc-900">
                {/* Simulated Canvas */}
                <div className="relative w-[16rem] h-[28rem] bg-black shadow-2xl rounded-md overflow-hidden border border-zinc-800">
                  <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-900" />
                  
                  {/* Draggable Text Overlay Simulation */}
                  <motion.div 
                    drag 
                    dragConstraints={{ top: 0, left: 0, right: 180, bottom: 380 }}
                    className="absolute top-20 left-10 cursor-move"
                  >
                    <div 
                      className="text-3xl font-bold font-[Inter] uppercase"
                      style={{
                        color: '#ffffff',
                        textShadow: '2px 2px 0px #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000',
                        backgroundColor: 'rgba(255, 0, 0, 0.8)',
                        padding: '4px 12px',
                        transform: 'rotate(-5deg)',
                      }}
                    >
                      VIRAL CLIP
                    </div>
                  </motion.div>
                </div>
              </CardContent>
            </Card>

            {/* Text Properties Panel */}
            <Card className="border-zinc-800 bg-zinc-900/40">
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Sliders className="mr-2 h-4 w-4" /> Properties
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-zinc-400">Content</label>
                  <Input defaultValue="VIRAL CLIP" />
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-medium text-zinc-400">Font Family</label>
                  <select className="flex h-9 w-full rounded-md border border-zinc-800 bg-zinc-950/50 px-3 text-sm text-zinc-100">
                    <option>Inter</option>
                    <option>Montserrat</option>
                    <option>Bebas Neue</option>
                    <option>The Bold Font</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-zinc-400">Color</label>
                    <div className="flex h-9 w-full rounded-md border border-zinc-800 bg-zinc-950/50 p-1">
                      <input type="color" defaultValue="#ffffff" className="w-full h-full cursor-pointer bg-transparent border-none" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-zinc-400">Background</label>
                    <div className="flex h-9 w-full rounded-md border border-zinc-800 bg-zinc-950/50 p-1">
                      <input type="color" defaultValue="#ff0000" className="w-full h-full cursor-pointer bg-transparent border-none" />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-zinc-400">Stroke Color</label>
                  <div className="flex h-9 w-full rounded-md border border-zinc-800 bg-zinc-950/50 p-1">
                    <input type="color" defaultValue="#000000" className="w-full h-full cursor-pointer bg-transparent border-none" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-zinc-400">Text Animation</label>
                  <select className="flex h-9 w-full rounded-md border border-zinc-800 bg-zinc-950/50 px-3 text-sm text-zinc-100">
                    <option>None</option>
                    <option>Pop In</option>
                    <option>Slide Up</option>
                    <option>Typewriter</option>
                    <option>Karaoke Word-by-Word</option>
                  </select>
                </div>

                <div className="space-y-2 pt-4">
                  <Button className="w-full bg-purple-600 hover:bg-purple-700">Save Preset</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// Dummy icon for PlaySquare as it was missing from lucide import
const PlaySquare = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="m9 8 6 4-6 4Z"/></svg>
);

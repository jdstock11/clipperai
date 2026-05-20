'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Brain, Key, Zap, MessagesSquare, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AISettings() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
          <Brain className="h-8 w-8 text-cyan-400" />
          AI Engine Settings
        </h1>
        <p className="text-zinc-400 mt-1">Configure models, API keys, and generation rules for the AI pipeline.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5 text-purple-400" /> API Providers
              </CardTitle>
              <CardDescription>Manage credentials for LLM and Vision APIs.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">OpenAI API Key</label>
                <Input type="password" defaultValue="sk-................................" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Anthropic Claude API Key</label>
                <Input type="password" placeholder="sk-ant-api03-..." />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Google Gemini API Key</label>
                <Input type="password" placeholder="AIzaSy..." />
              </div>
              <Button className="w-full mt-2">Save Keys</Button>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-cyan-400" /> Model Selection
              </CardTitle>
              <CardDescription>Configure which AI models power specific platform features.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Viral Clip Detection Model</label>
                <select className="flex h-10 w-full rounded-md border border-zinc-800 bg-zinc-950/50 px-3 py-2 text-sm text-zinc-100 focus-visible:ring-cyan-500">
                  <option>GPT-4o</option>
                  <option>Claude 3.5 Sonnet</option>
                  <option>Gemini 1.5 Pro</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Auto-Captioning Engine</label>
                <select className="flex h-10 w-full rounded-md border border-zinc-800 bg-zinc-950/50 px-3 py-2 text-sm text-zinc-100 focus-visible:ring-cyan-500">
                  <option>OpenAI Whisper-1</option>
                  <option>Deepgram Nova-2</option>
                </select>
              </div>
              <Button className="w-full mt-2">Update Routing</Button>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.2 }} className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessagesSquare className="h-5 w-5 text-blue-400" /> Prompt Templates
              </CardTitle>
              <CardDescription>System prompts used for clip generation and metadata extraction.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Clip Identification System Prompt</label>
                <textarea 
                  className="flex min-h-[120px] w-full rounded-md border border-zinc-800 bg-zinc-950/50 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
                  defaultValue="You are an expert video editor and viral content strategist. Your task is to analyze the provided video transcript and identify the most engaging, highly-retentive segments that are 30-60 seconds long. Score each clip on a virality scale of 1-100."
                />
              </div>
              <Button>Save Prompts</Button>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.3 }} className="md:col-span-2">
          <Card className="border-red-500/20 bg-red-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-400">
                <ShieldAlert className="h-5 w-5" /> AI Moderation
              </CardTitle>
              <CardDescription className="text-red-400/80">Configure content safety guidelines.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 bg-zinc-950/50 border border-zinc-800 rounded-lg">
                <div>
                  <h4 className="font-medium text-zinc-200">Strict NSFW Filtering</h4>
                  <p className="text-sm text-zinc-500">Automatically reject generation for adult/violent content.</p>
                </div>
                <div className="h-6 w-11 rounded-full bg-cyan-500 flex items-center p-1 justify-end cursor-pointer">
                  <div className="h-4 w-4 rounded-full bg-white shadow-sm" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bell, Send, Mail, Users } from 'lucide-react';
import { motion } from 'framer-motion';

export default function NotificationsManagement() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Notification Center</h1>
          <p className="text-zinc-400 mt-1">Broadcast messages to users and manage automated alerts.</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <Card className="h-full border-zinc-800 bg-zinc-950/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-cyan-400" /> Push Notifications
              </CardTitle>
              <CardDescription>Send an in-app notification to all users.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Title</label>
                <Input placeholder="e.g. New Feature Released!" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Message</label>
                <textarea 
                  className="flex min-h-[100px] w-full rounded-md border border-zinc-800 bg-zinc-950/50 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
                  placeholder="Describe the update..."
                />
              </div>
              <Button className="w-full bg-cyan-600 hover:bg-cyan-700 text-white shadow-[0_0_15px_rgba(34,211,238,0.3)]">
                <Send className="mr-2 h-4 w-4" /> Broadcast Notification
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
          <Card className="h-full border-zinc-800 bg-zinc-950/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-purple-400" /> Email Broadcast
              </CardTitle>
              <CardDescription>Send mass emails using Nodemailer SMTP.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Target Audience</label>
                <select className="flex h-10 w-full rounded-md border border-zinc-800 bg-zinc-950/50 px-3 py-2 text-sm text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500">
                  <option>All Users</option>
                  <option>Active Subscribers</option>
                  <option>Free Tier Only</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Subject</label>
                <Input placeholder="Subject line" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">HTML Template Content</label>
                <textarea 
                  className="flex min-h-[100px] w-full rounded-md border border-zinc-800 bg-zinc-950/50 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 font-mono text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
                  placeholder="<h1>Hello {{user_name}}</h1>..."
                />
              </div>
              <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white shadow-[0_0_15px_rgba(168,85,247,0.3)]">
                <Mail className="mr-2 h-4 w-4" /> Send Email Campaign
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.2 }} className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-zinc-400" /> Automated System Alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
                <div>
                  <h4 className="font-medium text-white">Welcome Email</h4>
                  <p className="text-sm text-zinc-500">Sent immediately after a user verifies their email address.</p>
                </div>
                <div className="h-6 w-11 rounded-full bg-cyan-500 flex items-center p-1 justify-end cursor-pointer">
                  <div className="h-4 w-4 rounded-full bg-white shadow-sm" />
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
                <div>
                  <h4 className="font-medium text-white">Processing Complete Alert</h4>
                  <p className="text-sm text-zinc-500">Send an email when a large video finishes rendering in the background.</p>
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

'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, ShieldAlert, MonitorSmartphone, Activity, Power } from 'lucide-react';
import { motion } from 'framer-motion';

const MOCK_LOGS = [
  { id: '1', user: 'aksharjignesh@gmail.com', action: 'Login', ip: '192.168.1.45', device: 'Chrome on Windows', status: 'SUCCESS', time: '10 mins ago' },
  { id: '2', user: 'demo@example.com', action: 'Failed Login', ip: '103.45.67.89', device: 'Unknown device', status: 'FAILED', time: '2 hours ago' },
  { id: '3', user: 'aksharjignesh@gmail.com', action: 'Update API Key', ip: '192.168.1.45', device: 'Chrome on Windows', status: 'SUCCESS', time: '1 day ago' },
];

export default function SecurityManagement() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <Shield className="h-8 w-8 text-red-500" /> Security Panel
          </h1>
          <p className="text-zinc-400 mt-1">Audit logs, active sessions, and security policies.</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="md:col-span-1">
          <Card className="h-full border-red-500/20 bg-red-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-400">
                <ShieldAlert className="h-5 w-5" /> Threat Detection
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Suspicious Login Attempts</span>
                  <span className="text-red-400 font-medium">12 in 24h</span>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-zinc-950/50 rounded-lg border border-red-500/20">
                <div className="text-sm">
                  <h4 className="font-medium text-white">Auto-Ban IPs</h4>
                  <p className="text-zinc-500 text-xs">Ban IPs after 5 failed logins</p>
                </div>
                <div className="h-5 w-9 rounded-full bg-red-500 flex items-center p-1 justify-end cursor-pointer">
                  <div className="h-3 w-3 rounded-full bg-white shadow-sm" />
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-zinc-950/50 rounded-lg border border-red-500/20">
                <div className="text-sm">
                  <h4 className="font-medium text-white">Require 2FA</h4>
                  <p className="text-zinc-500 text-xs">For all admin accounts</p>
                </div>
                <div className="h-5 w-9 rounded-full bg-red-500 flex items-center p-1 justify-end cursor-pointer">
                  <div className="h-3 w-3 rounded-full bg-white shadow-sm" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }} className="md:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MonitorSmartphone className="h-5 w-5 text-cyan-400" /> Active Admin Sessions
              </CardTitle>
              <CardDescription>Devices currently logged in with administrative access.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-cyan-500/10 rounded-full text-cyan-400">
                      <MonitorSmartphone className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-medium text-white">Windows 11 • Chrome</h4>
                      <p className="text-sm text-zinc-500">IP: 192.168.1.45 • Current Session</p>
                    </div>
                  </div>
                  <Badge variant="success">Active Now</Badge>
                </div>
                <div className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-zinc-800 rounded-full text-zinc-400">
                      <MonitorSmartphone className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-medium text-white">MacBook Pro • Safari</h4>
                      <p className="text-sm text-zinc-500">IP: 45.33.22.11 • Last seen: 2 days ago</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-500 hover:bg-red-500/10">
                    <Power className="mr-2 h-4 w-4" /> Revoke
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.2 }} className="md:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-purple-400" /> Audit & Access Logs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Device</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_LOGS.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium text-white">{log.user}</TableCell>
                      <TableCell>{log.action}</TableCell>
                      <TableCell className="font-mono text-xs text-zinc-400">{log.ip}</TableCell>
                      <TableCell className="text-zinc-400">{log.device}</TableCell>
                      <TableCell>
                        <Badge variant={log.status === 'SUCCESS' ? 'success' : 'destructive'}>
                          {log.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-zinc-500">{log.time}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

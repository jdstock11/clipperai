'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Key, Copy, Trash2, Plus, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';

const MOCK_KEYS = [
  { id: '1', name: 'Production App', key: 'cf_live_8f92j3n8d...', usage: 12450, status: 'ACTIVE', lastUsed: '2 mins ago' },
  { id: '2', name: 'Staging Server', key: 'cf_test_9j2n4m1k...', usage: 340, status: 'ACTIVE', lastUsed: '1 hour ago' },
  { id: '3', name: 'Old Extension', key: 'cf_live_7h3k9m2p...', usage: 0, status: 'REVOKED', lastUsed: '3 months ago' },
];

export default function ApiKeysManagement() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">API Management</h1>
          <p className="text-zinc-400 mt-1">Generate and manage developer API keys and usage.</p>
        </div>
        <Button className="bg-cyan-600 hover:bg-cyan-700 text-white shadow-[0_0_15px_rgba(34,211,238,0.3)]">
          <Plus className="mr-2 h-4 w-4" /> Generate New Key
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="md:col-span-1">
          <Card className="h-full bg-gradient-to-br from-zinc-900 to-zinc-950">
            <CardHeader>
              <CardTitle>Global Usage Limit</CardTitle>
              <CardDescription>Rate limits and quota management</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Total API Calls (30d)</span>
                  <span className="text-cyan-400 font-medium">12,790 / 100,000</span>
                </div>
                <div className="h-2 w-full rounded-full bg-zinc-800">
                  <div className="h-full rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]" style={{ width: '12.79%' }}></div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Default Rate Limit (req/min)</label>
                <Input type="number" defaultValue="60" className="bg-zinc-900" />
              </div>
              <Button variant="outline" className="w-full">Update Limits</Button>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }} className="md:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5 text-purple-400" /> Active API Keys
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Secret Key</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Used</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_KEYS.map((k) => (
                    <TableRow key={k.id}>
                      <TableCell className="font-medium text-white">{k.name}</TableCell>
                      <TableCell className="font-mono text-xs text-zinc-400 flex items-center gap-2">
                        {k.key}
                        <button className="text-zinc-500 hover:text-white transition-colors"><Copy className="h-3 w-3" /></button>
                      </TableCell>
                      <TableCell>{k.usage.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={k.status === 'ACTIVE' ? 'success' : 'destructive'}>
                          {k.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-zinc-400">{k.lastUsed}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-red-500">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
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

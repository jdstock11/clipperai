'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, CreditCard, RefreshCw } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';

// Mock chart data for MVP
const revenueData = [
  { name: 'Jan', revenue: 4000 },
  { name: 'Feb', revenue: 3000 },
  { name: 'Mar', revenue: 5000 },
  { name: 'Apr', revenue: 2780 },
  { name: 'May', revenue: 6890 },
  { name: 'Jun', revenue: 8390 },
];

export default function PaymentsManagement() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
        const res = await fetch(`${API_URL}/admin/payments`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
        });
        if (res.ok) {
          const data = await res.json();
          setPayments(data.payments);
        }
      } catch (error) {
        console.error('Failed to fetch payments', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Payments & Subscriptions</h1>
          <p className="text-zinc-400 mt-1">Manage platform revenue, transactions, and user plans.</p>
        </div>
        <Button variant="outline" className="border-zinc-700">
          <Download className="mr-2 h-4 w-4" /> Export CSV
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="md:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Monthly Revenue</CardTitle>
              <CardDescription>Earnings over the last 6 months.</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="name" stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', strokeWidth: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Plan Distribution</CardTitle>
              <CardDescription>Current active subscriptions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-zinc-300">Free Tier</span>
                  <span className="text-sm text-zinc-500">65%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-zinc-800">
                  <div className="h-full rounded-full bg-zinc-500" style={{ width: '65%' }}></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-zinc-300 flex items-center gap-2"><CreditCard className="h-4 w-4 text-cyan-400" /> Pro Plan</span>
                  <span className="text-sm text-cyan-400 font-bold">25%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-zinc-800">
                  <div className="h-full rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]" style={{ width: '25%' }}></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-zinc-300 flex items-center gap-2"><CreditCard className="h-4 w-4 text-purple-400" /> Agency Plan</span>
                  <span className="text-sm text-purple-400 font-bold">10%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-zinc-800">
                  <div className="h-full rounded-full bg-purple-400 shadow-[0_0_10px_rgba(192,132,252,0.5)]" style={{ width: '10%' }}></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}>
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>Latest successful and pending payments.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center p-8">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-cyan-500"></div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Transaction ID</TableHead>
                    <TableHead>User Email</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-mono text-xs text-zinc-400">{payment.transactionId}</TableCell>
                      <TableCell className="text-white">{payment.user?.email || 'Unknown'}</TableCell>
                      <TableCell className="font-medium text-green-400">${payment.amount}</TableCell>
                      <TableCell>{payment.provider}</TableCell>
                      <TableCell>
                        <Badge variant={payment.status === 'COMPLETED' ? 'success' : 'outline'}>
                          {payment.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(payment.createdAt).toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white">
                          <RefreshCw className="mr-2 h-4 w-4" /> Refund
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {payments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-zinc-500">
                        No transactions found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

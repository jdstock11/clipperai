'use client';

import { usePathname } from 'next/navigation';
import { Search, Bell, User, Settings as SettingsIcon } from 'lucide-react';
import { Input } from '../ui/input';

export function Topbar() {
  const pathname = usePathname();
  if (pathname === '/admin/login') return null;

  return (
    <header className="fixed top-0 right-0 z-30 flex h-16 w-[calc(100%-16rem)] items-center justify-between border-b border-zinc-800 bg-[#0a0a0a]/80 px-6 backdrop-blur-md">
      <div className="flex w-full max-w-md items-center relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <Input 
          type="text" 
          placeholder="Search..." 
          className="pl-9 bg-zinc-900/50 border-zinc-800 focus-visible:ring-cyan-500/50 h-9"
        />
      </div>

      <div className="flex items-center space-x-4">
        <div className="flex items-center gap-2 mr-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          <span className="text-xs font-medium text-zinc-400">System Online</span>
        </div>

        <button className="relative rounded-full p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-cyan-500 shadow-[0_0_5px_rgba(34,211,238,1)]"></span>
        </button>

        <button className="rounded-full p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors">
          <SettingsIcon className="h-5 w-5" />
        </button>

        <div className="h-8 w-px bg-zinc-800 mx-2"></div>

        <button className="flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/50 p-1 pr-3 hover:bg-zinc-800 transition-colors">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 text-xs font-bold text-white shadow-[0_0_10px_rgba(168,85,247,0.4)]">
            A
          </div>
          <span className="text-sm font-medium text-zinc-300">Admin</span>
        </button>
      </div>
    </header>
  );
}

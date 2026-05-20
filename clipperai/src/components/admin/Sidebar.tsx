'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Video, Layers, Settings, CreditCard, Key, HardDrive, Bell, Shield, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

const navItems = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/clips', label: 'Viral Clips', icon: Video },
  { href: '/admin/merge-studio', label: 'Merge Studio', icon: Layers },
  { href: '/admin/ai-settings', label: 'AI Settings', icon: Settings },
  { href: '/admin/payments', label: 'Payments', icon: CreditCard },
  { href: '/admin/api-keys', label: 'API Keys', icon: Key },
  { href: '/admin/storage', label: 'Storage', icon: HardDrive },
  { href: '/admin/notifications', label: 'Notifications', icon: Bell },
  { href: '/admin/security', label: 'Security', icon: Shield },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === '/admin/login') return null;

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    router.push('/admin/login');
  };

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-zinc-800 bg-[#0a0a0a]/95 backdrop-blur-md">
      <div className="flex h-16 items-center px-6 border-b border-zinc-800">
        <span className="bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-xl font-bold text-transparent drop-shadow-[0_0_10px_rgba(34,211,238,0.4)]">
          ClipForge AI
        </span>
      </div>
      
      <nav className="flex-1 space-y-1 overflow-y-auto p-4 custom-scrollbar">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                isActive 
                  ? "bg-zinc-800/50 text-cyan-400 shadow-[inset_2px_0_0_0_rgba(34,211,238,1)]" 
                  : "text-zinc-400 hover:bg-zinc-800/30 hover:text-white"
              )}
            >
              <Icon className={cn("mr-3 h-5 w-5 transition-colors", isActive ? "text-cyan-400" : "text-zinc-500 group-hover:text-zinc-300")} />
              {item.label}
              {isActive && (
                <div className="absolute left-0 h-8 w-1 rounded-r-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-zinc-800 p-4">
        <button 
          onClick={handleLogout}
          className="flex w-full items-center rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
        >
          <LogOut className="mr-3 h-5 w-5" />
          Logout
        </button>
      </div>
    </aside>
  );
}

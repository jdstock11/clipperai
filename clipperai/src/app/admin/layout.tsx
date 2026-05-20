'use client';

import { Sidebar } from '@/components/admin/Sidebar';
import { Topbar } from '@/components/admin/Topbar';
import AuthGuard from '@/components/admin/AuthGuard';
import { usePathname } from 'next/navigation';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/admin/login';

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 selection:bg-cyan-500/30">
      <AuthGuard>
        <Sidebar />
        <Topbar />
        <main className={`${isLoginPage ? '' : 'pl-64 pt-16'} min-h-screen transition-all`}>
          <div className={isLoginPage ? '' : 'p-6'}>
            {children}
          </div>
        </main>
      </AuthGuard>
    </div>
  );
}

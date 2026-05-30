'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // If we're already on the login page, no need to guard
    if (pathname === '/admin/login') {
      setIsAuthenticated(true);
      return;
    }

    const token = localStorage.getItem('adminToken');
    if (!token) {
      router.push('/admin/login');
    } else {
      setIsAuthenticated(true);
    }
  }, [pathname, router]);

  return (
    <>
      {!isAuthenticated && (
        <div className="fixed inset-0 z-50 flex h-screen w-full items-center justify-center bg-[#050505]">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-cyan-500"></div>
        </div>
      )}
      <div style={{ display: isAuthenticated ? 'block' : 'none' }}>
        {children}
      </div>
    </>
  );
}

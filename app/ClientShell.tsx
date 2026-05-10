'use client';

import { usePathname } from 'next/navigation';
import Sidebar from '../apps/admin/components/Sidebar';

export default function ClientShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthRoute = pathname === '/login';

  if (isAuthRoute) {
    return <main className="auth-main">{children}</main>;
  }

  return (
    <div className="shell">
      <Sidebar />
      <main>{children}</main>
    </div>
  );
}
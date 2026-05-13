'use client';

import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';
import Sidebar from '../components/Sidebar';

export default function ClientShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isAuthRoute = pathname === '/login';

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  if (isAuthRoute) {
    return <main className="auth-main">{children}</main>;
  }

  return (
    <div className="shell">
      <Sidebar />
      <main>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <button className="btn" onClick={logout}>Log out</button>
        </div>
        {children}
      </main>
    </div>
  );
}

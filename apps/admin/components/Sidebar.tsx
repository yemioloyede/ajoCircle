'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const links = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/payments', label: 'Payments' },
  { href: '/users', label: 'Users' },
  { href: '/groups', label: 'Groups' },
  { href: '/wallets', label: 'Wallets' },
  { href: '/kyc', label: 'KYC Queue' },
  { href: '/transactions', label: 'Transactions' },
  { href: '/payouts', label: 'Payouts' },
  { href: '/audit', label: 'Audit Logs' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  return (
    <aside>
      <h2 style={{ margin: '0 0 4px' }}>AjoCircle</h2>
      <p style={{ margin: '0 0 24px', fontSize: 12, color: '#52655c' }}>Fintech Admin</p>
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {links.map(({ href, label }) => (
          <Link key={href} href={href} style={{
            padding: '10px 12px',
            borderRadius: 10,
            fontWeight: pathname === href ? 700 : 400,
            background: pathname === href ? 'rgba(255,255,255,0.15)' : 'transparent',
            color: '#fff',
            textDecoration: 'none',
          }}>
            {label}
          </Link>
        ))}
      </nav>
      <button onClick={logout} style={{
        marginTop: 'auto',
        background: 'rgba(255,255,255,0.12)',
        color: '#fff',
        border: 'none',
        borderRadius: 10,
        padding: '10px 12px',
        cursor: 'pointer',
        width: '100%',
        textAlign: 'left',
        fontFamily: 'inherit',
        fontSize: 14,
      }}>
        Log out
      </button>
    </aside>
  );
}


import './styles.css';
import ClientShell from './ClientShell';

export const metadata = { title: 'AjoCircle Admin' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <ClientShell>{children}</ClientShell>
      </body>
    </html>
  );
}
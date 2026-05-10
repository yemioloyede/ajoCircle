import './styles.css';
import ClientShell from './ClientShell';
export const metadata={title:'AjoCircle Admin v2'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html><body><ClientShell>{children}</ClientShell></body></html>}

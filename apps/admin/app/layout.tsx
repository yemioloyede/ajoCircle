import './styles.css'; import Sidebar from '../components/Sidebar';
export const metadata={title:'AjoCircle Admin'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html><body><div className="shell"><Sidebar/><main>{children}</main></div></body></html>}

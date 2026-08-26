// Gilded Ledger design reminder: the admin spine is narrow, ink-dark, and typographically ordered rather than card-heavy.
import { BarChart3, ClipboardList, FileText, LogOut, Settings2 } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import BrandMark from './BrandMark';

const navigation = [
  { href: '/admin', label: 'Overview', icon: BarChart3 },
  { href: '/admin/reports', label: 'Reports', icon: ClipboardList },
  { href: '/admin/questions', label: 'Form studio', icon: Settings2 },
];

export default function AdminSidebar() {
  const [location] = useLocation();

  return (
    <aside className="admin-sidebar">
      <BrandMark inverse />
      <div className="admin-sidebar__rule" />
      <nav className="admin-nav" aria-label="Administration navigation">
        {navigation.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={`admin-nav__item ${location === href ? 'is-active' : ''}`}>
            <Icon size={17} strokeWidth={1.8} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
      <div className="admin-sidebar__footer">
        <p>Alternative Bank<br />Regional Sales</p>
        <Link href="/admin/login" className="admin-nav__item admin-nav__item--quiet">
          <LogOut size={17} strokeWidth={1.8} />
          <span>Sign out</span>
        </Link>
      </div>
    </aside>
  );
}

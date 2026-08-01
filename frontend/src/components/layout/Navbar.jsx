import { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Shield, LayoutDashboard, ScanSearch, MessageCircleHeart, FileText, LifeBuoy, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { QuickExit } from './QuickExit';

const LINKS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/analyze', label: 'Analyze', icon: ScanSearch },
  { to: '/companion', label: 'Companion', icon: MessageCircleHeart },
  { to: '/report', label: 'Report', icon: FileText },
  { to: '/resources', label: 'Help', icon: LifeBuoy },
];

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 glass">
      <nav className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Link to="/" className="flex shrink-0 items-center gap-2 font-semibold tracking-tight">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Shield className="size-4.5" />
          </span>
          <span className="hidden sm:inline">SheShield<span className="text-primary"> AI</span></span>
        </Link>

        <div className="hidden flex-1 items-center gap-1 md:flex">
          {LINKS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => cn(
                'inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive ? 'bg-primary/12 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
            >
              <Icon className="size-4" />
              {label}
            </NavLink>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <QuickExit />
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex size-9 items-center justify-center rounded-md hover:bg-accent md:hidden"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </nav>

      {open ? (
        <div className="border-t border-border/60 px-4 pb-3 pt-2 md:hidden">
          {LINKS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setOpen(false)}
              className={({ isActive }) => cn(
                'flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                isActive ? 'bg-primary/12 text-primary' : 'text-muted-foreground hover:bg-accent',
              )}
            >
              <Icon className="size-4" />
              {label}
            </NavLink>
          ))}
        </div>
      ) : null}
    </header>
  );
}

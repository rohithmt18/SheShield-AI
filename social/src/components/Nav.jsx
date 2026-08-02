import { NavLink } from 'react-router-dom';
import { Home, MessageCircle, ShieldCheck, PlusSquare, Loader2 } from 'lucide-react';
import { usePendingCount, useAllVerdicts } from '@/lib/useModeration';
import { cn } from '@/lib/utils';

const LINKS = [
  { to: '/', label: 'Feed', icon: Home, end: true },
  { to: '/create', label: 'Create', icon: PlusSquare },
  { to: '/messages', label: 'Messages', icon: MessageCircle },
  { to: '/safety', label: 'Safety', icon: ShieldCheck },
];

export function Nav() {
  const pending = usePendingCount();
  const verdicts = useAllVerdicts();
  const flagged = verdicts.filter((v) => v.risk && v.risk !== 'safe').length;

  return (
    <header className="sticky top-0 z-40 border-b border-border glass">
      <nav className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
        <span className="bg-gradient-to-r from-fuchsia-500 via-rose-500 to-amber-400 bg-clip-text text-lg font-bold tracking-tight text-transparent">
          Vibe
        </span>

        <span
          title="Every post, comment, and message here is screened by SheShield AI"
          className="hidden items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground sm:inline-flex"
        >
          <ShieldCheck className="size-3 text-primary" />
          protected by SheShield AI
        </span>

        {pending > 0 ? (
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <Loader2 className="size-3 animate-spin" />
            screening {pending}
          </span>
        ) : null}

        <div className="ml-auto flex items-center gap-1">
          {LINKS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => cn(
                'relative inline-flex items-center gap-1.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="size-5" />
              <span className="hidden sm:inline">{label}</span>
              {to === '/safety' && flagged > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-risk-high text-[9px] font-bold text-white">
                  {flagged > 9 ? '9+' : flagged}
                </span>
              ) : null}
            </NavLink>
          ))}
        </div>
      </nav>
    </header>
  );
}

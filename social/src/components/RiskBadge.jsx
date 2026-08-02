import { ShieldCheck, ShieldAlert, ShieldX, AlertTriangle, Loader2, HelpCircle } from 'lucide-react';
import { RISK } from '@/lib/riskModel';
import { cn } from '@/lib/utils';

const ICONS = {
  safe: ShieldCheck,
  suspicious: AlertTriangle,
  high: ShieldAlert,
  critical: ShieldX,
};

/**
 * The four-state badge.
 *
 * "Screening…" and "Not screened" are separate states on purpose. A failed
 * analysis must never render as Safe — an absent verdict is unknown, not clean,
 * and collapsing the two would be the single most misleading thing this
 * component could do.
 */
export function RiskBadge({ verdict, status, className, showScore = true }) {
  if (status === 'queued' || status === 'running') {
    return (
      <span className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-border bg-muted',
        'px-2 py-0.5 text-[11px] font-medium text-muted-foreground', className,
      )}
      >
        <Loader2 className="size-3 animate-spin" />
        Screening…
      </span>
    );
  }

  if (!verdict || verdict.failed) {
    return (
      <span
        title={verdict?.error ?? 'This content has not been screened yet.'}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border border-border bg-muted',
          'px-2 py-0.5 text-[11px] font-medium text-muted-foreground', className,
        )}
      >
        <HelpCircle className="size-3" />
        Not screened
      </span>
    );
  }

  const risk = RISK[verdict.risk] ?? RISK.safe;
  const Icon = ICONS[risk.id];

  return (
    <span
      title={risk.blurb}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold',
        risk.bg, risk.border, risk.tone, className,
      )}
    >
      <Icon className="size-3" />
      {risk.label}
      {showScore ? <span className="opacity-70 tabular-nums">{verdict.score}</span> : null}
    </span>
  );
}

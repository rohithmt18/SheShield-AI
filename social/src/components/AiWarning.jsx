import { FileText, RotateCw, ShieldAlert } from 'lucide-react';
import { RISK } from '@/lib/riskModel';
import { FullReportDialog } from './FullReportDialog';
import { cn } from '@/lib/utils';

/**
 * The warning strip shown directly beneath harmful content.
 *
 * Sits below rather than replacing the content: the user needs to be able to
 * see what was said, both to judge it herself and because it is evidence. The
 * decision to blur is made by the caller, not here.
 */
export function AiWarning({ verdict, onRescreen, className }) {
  if (!verdict) return null;

  if (verdict.failed) {
    return (
      <div className={cn('mt-2 flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-2 text-xs text-muted-foreground', className)}>
        <ShieldAlert className="size-3.5 shrink-0" />
        <span className="min-w-0 flex-1">
          SheShield could not screen this — treat it with your own judgment.
        </span>
        {onRescreen ? (
          <button type="button" onClick={onRescreen} className="inline-flex items-center gap-1 font-medium hover:text-foreground">
            <RotateCw className="size-3" />
            Retry
          </button>
        ) : null}
      </div>
    );
  }

  const risk = RISK[verdict.risk] ?? RISK.safe;
  if (risk.id === 'safe') return null;

  return (
    <div className={cn('mt-2 rounded-lg border p-3', risk.bg, risk.border, className)}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn('size-2 rounded-full', risk.dot)} />
        <span className={cn('text-xs font-semibold', risk.tone)}>
          {risk.label} · {verdict.score}/100
        </span>
        {verdict.categories?.slice(0, 3).map((c) => (
          <span key={c} className="rounded-full border border-border/70 px-2 py-0.5 text-[10px] capitalize">
            {c.replace(/_/g, ' ')}
          </span>
        ))}
      </div>

      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
        {verdict.rationale || risk.blurb}
      </p>

      {verdict.recommendedActions?.length ? (
        <ul className="mt-2 space-y-1">
          {verdict.recommendedActions.slice(0, 2).map((a) => (
            <li key={a} className="flex gap-1.5 text-xs text-muted-foreground">
              <span className={risk.tone}>•</span>{a}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <FullReportDialog
          verdict={verdict}
          trigger={(
            <button
              type="button"
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[11px] font-semibold',
                'transition-colors hover:bg-background/60', risk.border, risk.tone,
              )}
            >
              <FileText className="size-3.5" />
              View Full AI Report
            </button>
          )}
        />
        {verdict.degraded ? (
          <span className="text-[10px] text-muted-foreground">Offline engine — may miss subtler cases</span>
        ) : null}
      </div>
    </div>
  );
}

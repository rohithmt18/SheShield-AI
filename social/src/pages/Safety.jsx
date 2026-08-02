import { useEffect, useState } from 'react';
import {
  ShieldCheck, AlertTriangle, ShieldAlert, ShieldX, FileText, Trash2,
  RefreshCw, Database, Loader2, ExternalLink,
} from 'lucide-react';
import { useAllVerdicts } from '@/lib/useModeration';
import { clearVerdicts } from '@/lib/moderation';
import { shield } from '@/lib/shieldClient';
import { FullReportDialog } from '@/components/FullReportDialog';
import { RiskBadge } from '@/components/RiskBadge';
import { RISK } from '@/lib/riskModel';
import { cn, formatDateTime } from '@/lib/utils';

const KIND_LABEL = {
  caption: 'Caption', comment: 'Comment', message: 'Message', thread: 'Conversation', reply: 'Reply',
};

/**
 * Where the SheShield app itself lives.
 *
 * The two apps deploy as separate projects on separate domains, so this cannot
 * be a relative path. It defaults to the dev server, which is what `npm run
 * dev:all` serves; set VITE_SHESHIELD_URL on the deployed social client.
 *
 * With nothing set in a production build the link is dropped rather than
 * pointing at localhost — a missing link is better than one that goes nowhere,
 * particularly when it is the route to the actual support tools.
 */
const SHESHIELD_URL = import.meta.env.VITE_SHESHIELD_URL
  || (import.meta.env.PROD ? '' : 'http://localhost:5273');

export default function Safety() {
  const verdicts = useAllVerdicts();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('flagged');

  useEffect(() => {
    let cancelled = false;
    shield.session()
      .then((s) => { if (!cancelled) setSession(s); })
      .catch(() => { if (!cancelled) setSession(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [verdicts.length]);

  const screened = verdicts.filter((v) => !v.failed);
  const flagged = screened.filter((v) => v.risk && v.risk !== 'safe');
  const counts = {
    safe: screened.filter((v) => v.risk === 'safe').length,
    suspicious: screened.filter((v) => v.risk === 'suspicious').length,
    high: screened.filter((v) => v.risk === 'high').length,
    critical: screened.filter((v) => v.risk === 'critical').length,
  };

  const shown = filter === 'flagged' ? flagged : verdicts;

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <header>
        <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight">
          <ShieldCheck className="size-6 text-primary" />
          Safety Dashboard
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Everything screened by SheShield AI in this session, across every connected platform.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Safe" value={counts.safe} icon={ShieldCheck} risk={RISK.safe} />
        <Stat label="Suspicious" value={counts.suspicious} icon={AlertTriangle} risk={RISK.suspicious} />
        <Stat label="High Risk" value={counts.high} icon={ShieldAlert} risk={RISK.high} />
        <Stat label="Critical" value={counts.critical} icon={ShieldX} risk={RISK.critical} />
      </div>

      {/* Where the data actually lives, stated plainly rather than implied. */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        <Database className="size-3.5" />
        {loading ? (
          <span className="inline-flex items-center gap-1.5"><Loader2 className="size-3 animate-spin" />Checking SheShield…</span>
        ) : session ? (
          <span>
            <strong className="text-foreground">{session.analyses?.length ?? 0}</strong> analyses stored on the
            SheShield backend. It keeps the most recent 20 per session; the list below is this
            browser’s own record and may go further back.
          </span>
        ) : (
          <span>No SheShield session yet — analyses are stored once screening runs.</span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {['flagged', 'all'].map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition-colors',
              filter === f ? 'border-primary bg-primary/12 text-primary' : 'border-border hover:bg-muted',
            )}
          >
            {f} {f === 'flagged' ? `(${flagged.length})` : `(${verdicts.length})`}
          </button>
        ))}
        {verdicts.length ? (
          <button
            type="button"
            onClick={() => { if (confirm('Clear this browser’s screening history? The analyses stored on the SheShield backend are not affected.')) clearVerdicts(); }}
            className="ml-auto inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <Trash2 className="size-3.5" />
            Clear local history
          </button>
        ) : null}
      </div>

      {!shown.length ? (
        <div className="rounded-lg border border-dashed border-border py-14 text-center">
          <ShieldCheck className="mx-auto mb-3 size-8 text-muted-foreground" />
          <p className="text-sm font-medium">
            {filter === 'flagged' ? 'Nothing flagged yet' : 'Nothing screened yet'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Scroll the feed or open a conversation — content is screened as it appears.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {shown.map((verdict) => {
            const risk = verdict.risk ? RISK[verdict.risk] : null;
            return (
              <li
                key={verdict.contentId}
                className={cn('rounded-lg border p-3.5', risk && risk.id !== 'safe' ? cn(risk.bg, risk.border) : 'border-border bg-card')}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <RiskBadge verdict={verdict} />
                  <span className="text-xs font-medium">{KIND_LABEL[verdict.kind] ?? verdict.kind}</span>
                  <span className="text-xs text-muted-foreground">
                    by <span className="font-medium">{verdict.author}</span> · {verdict.platform}
                  </span>
                  <span className="ml-auto text-[11px] text-muted-foreground">
                    {formatDateTime(new Date(verdict.at).toISOString())}
                  </span>
                </div>

                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">“{verdict.excerpt}”</p>

                {verdict.categories?.length ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {verdict.categories.map((c) => (
                      <span key={c} className="rounded-full border border-border/70 px-2 py-0.5 text-[10px] capitalize">
                        {c.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                ) : null}

                {verdict.analysisId && risk && risk.id !== 'safe' ? (
                  <FullReportDialog
                    verdict={verdict}
                    trigger={(
                      <button
                        type="button"
                        className={cn('mt-2.5 inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[11px] font-semibold',
                          risk.border, risk.tone)}
                      >
                        <FileText className="size-3.5" />
                        View Full AI Report
                      </button>
                    )}
                  />
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-4 text-xs text-muted-foreground">
        <RefreshCw className="size-4" />
        <span className="flex-1">
          Need the companion, evidence checklist, or helpline directory? Those live in the SheShield app itself.
        </span>
        {SHESHIELD_URL ? (
          <a
            href={SHESHIELD_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline"
          >
            Open SheShield
            <ExternalLink className="size-3.5" />
          </a>
        ) : null}
      </div>
    </div>
  );
}

function Stat({ label, value, icon: Icon, risk }) {
  return (
    <div className={cn('rounded-lg border p-3', risk.bg, risk.border)}>
      <Icon className={cn('mb-1.5 size-4', risk.tone)} />
      <div className={cn('text-xl font-bold tabular-nums', risk.tone)}>{value}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}

import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {
  X, FileText, Download, Loader2, Scale, ListChecks, Quote, Phone, AlertCircle,
} from 'lucide-react';
import { shield } from '@/lib/shieldClient';
import { platformById } from '@/platforms';
import { RISK } from '@/lib/riskModel';
import { cn, formatDateTime } from '@/lib/utils';

/**
 * "View Full AI Report" — builds a real SheShield incident report for the
 * analysis behind a verdict, and offers the same PDF the SheShield app does.
 *
 * The report is generated on demand rather than upfront: it is an expensive
 * call against a rate-limited endpoint, and most flagged comments never need
 * one. Reports are only meaningful for content someone intends to act on.
 */
export function FullReportDialog({ verdict, trigger }) {
  const [open, setOpen] = useState(false);
  const [report, setReport] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const risk = RISK[verdict?.risk] ?? RISK.safe;

  async function generate() {
    if (busy || report) return;
    setBusy(true);
    setError(null);
    try {
      const { report: built } = await shield.buildReport({
        analysisId: verdict.analysisId,
        details: {
          // The registry holds each network's display name, so a report says
          // "Instagram" rather than "instagram" without this file learning the
          // name of every platform that might be connected later.
          platform: platformById(verdict.platform).label,
          offenderHandle: verdict.author ? `@${verdict.author}` : '',
        },
      });
      setReport(built);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => { setOpen(next); if (next) generate(); }}
    >
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 max-h-[88vh] w-[calc(100%-2rem)] max-w-2xl
                     -translate-x-1/2 -translate-y-1/2 overflow-y-auto scrollbar-thin
                     rounded-lg border border-border bg-card p-6 shadow-2xl"
        >
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="flex items-center gap-2 text-lg font-semibold">
                <FileText className="size-5 text-primary" />
                SheShield AI Report
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                Generated from the analysis of this content by SheShield AI.
              </Dialog.Description>
            </div>
            <Dialog.Close className="rounded-md p-1 opacity-70 hover:opacity-100">
              <X className="size-4" />
              <span className="sr-only">Close</span>
            </Dialog.Close>
          </div>

          {/* Verdict summary is available immediately from the cached analysis. */}
          <div className={cn('mb-5 rounded-lg border p-4', risk.bg, risk.border)}>
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn('text-2xl font-bold tabular-nums', risk.tone)}>{verdict.score}</span>
              <span className={cn('text-sm font-semibold', risk.tone)}>{risk.label}</span>
              <span className="ml-auto text-xs text-muted-foreground">
                {verdict.engine === 'heuristic' ? 'Offline engine' : `${verdict.engine} analysis`}
              </span>
            </div>
            {verdict.categories?.length ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {verdict.categories.map((c) => (
                  <span key={c} className="rounded-full border border-border px-2 py-0.5 text-[11px]">
                    {c.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            ) : null}
            {verdict.rationale ? (
              <p className="mt-2 text-sm italic text-muted-foreground">{verdict.rationale}</p>
            ) : null}
          </div>

          {busy ? (
            <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Drafting the incident report…
            </div>
          ) : null}

          {error ? (
            <div className="flex items-start gap-2 rounded-md border border-risk-high/40 bg-risk-high/10 p-3 text-sm text-risk-high">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <div>
                {error}
                <button type="button" onClick={generate} className="ml-2 underline">Try again</button>
              </div>
            </div>
          ) : null}

          {report ? (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="rounded border border-border px-2 py-0.5 font-mono">{report.reference}</span>
                <span>{formatDateTime(report.createdAt)}</span>
                <a
                  href={shield.reportPdfUrl()}
                  download
                  className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5
                             text-xs font-semibold text-primary-foreground hover:opacity-90"
                >
                  <Download className="size-3.5" />
                  Download PDF
                </a>
              </div>

              <Section title={report.title}>
                <p className="text-sm leading-relaxed">{report.summary}</p>
              </Section>

              {report.evidence?.length ? (
                <Section title="Evidence" icon={Quote}>
                  {report.evidence.map((e, i) => (
                    <div key={i} className="mb-2 rounded-lg border border-border bg-background/50 p-3">
                      <div className="text-xs font-semibold text-primary">{e.reference}</div>
                      <blockquote className="mt-1 border-l-2 border-border pl-3 text-sm italic">
                        “{e.excerpt}”
                      </blockquote>
                      <p className="mt-1.5 text-xs text-muted-foreground">{e.significance}</p>
                    </div>
                  ))}
                </Section>
              ) : null}

              {report.legalContext?.length ? (
                <Section title="Potentially relevant provisions" icon={Scale}>
                  <ul className="space-y-1.5">
                    {report.legalContext.map((l, i) => (
                      <li key={i} className={cn('flex gap-2 text-sm', i === report.legalContext.length - 1 && 'italic text-muted-foreground')}>
                        <span className="text-primary">§</span>{l}
                      </li>
                    ))}
                  </ul>
                </Section>
              ) : null}

              {report.nextSteps?.length ? (
                <Section title="Next steps" icon={ListChecks}>
                  <ol className="space-y-2">
                    {report.nextSteps.map((s, i) => (
                      <li key={i} className="flex gap-3 text-sm">
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-bold text-primary">
                          {i + 1}
                        </span>
                        {s}
                      </li>
                    ))}
                  </ol>
                </Section>
              ) : null}

              {report.resources?.emergency?.length ? (
                <Section title="Call now" icon={Phone}>
                  <div className="flex flex-wrap gap-2">
                    {report.resources.emergency.map((r) => (
                      <a
                        key={r.id}
                        href={`tel:${r.contact}`}
                        className="rounded-lg border border-border px-3 py-2 text-sm hover:border-primary/50"
                      >
                        <span className="font-bold">{r.contact}</span>
                        <span className="ml-2 text-xs text-muted-foreground">{r.name}</span>
                      </a>
                    ))}
                  </div>
                </Section>
              ) : null}

              <p className="rounded-lg border border-border bg-muted/50 p-3 text-xs leading-relaxed text-muted-foreground">
                Automated assessment, not a legal determination, and not reviewed by a human. Check
                every field before filing and correct anything marked [not provided].
              </p>
            </div>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Section({ title, icon: Icon, children }) {
  return (
    <section>
      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
        {Icon ? <Icon className="size-4 text-primary" /> : null}
        {title}
      </h3>
      {children}
    </section>
  );
}

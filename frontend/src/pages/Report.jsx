import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FileText, Download, Loader2, AlertCircle, ScanSearch, Scale, ListChecks, Quote,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { ResourceList } from '@/components/ResourceList';
import { api } from '@/lib/api';
import { useApp } from '@/lib/AppContext';
import { formatDate } from '@/lib/utils';

const FIELDS = [
  { key: 'platform', label: 'Platform', placeholder: 'WhatsApp, Instagram, X…' },
  { key: 'offenderHandle', label: 'Their account or number', placeholder: '@username or +91…' },
  { key: 'relationship', label: 'How you know them', placeholder: 'Stranger, colleague, ex-partner…' },
  { key: 'firstIncident', label: 'When it started', placeholder: 'e.g. 3 March 2026' },
  { key: 'latestIncident', label: 'Most recent incident', placeholder: 'e.g. 28 July 2026' },
  { key: 'reportedBefore', label: 'Reported before?', placeholder: 'Yes to Instagram / No' },
];

export default function Report() {
  const { session, latestAnalysis, regions, refresh } = useApp();
  const [details, setDetails] = useState({});
  const [report, setReport] = useState(session?.report ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const set = (key) => (event) => setDetails((prev) => ({ ...prev, [key]: event.target.value }));

  async function generate(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const { report: built } = await api.buildReport({ analysisId: latestAnalysis?.id, details });
      setReport(built);
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!latestAnalysis && !report) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-4 py-14 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-primary/12 text-primary">
              <FileText className="size-7" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Analyse a conversation first</h2>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                The report is built from a completed analysis — the flagged excerpts, timestamps,
                and classifications become its evidence section.
              </p>
            </div>
            <Button asChild size="lg"><Link to="/analyze"><ScanSearch />Check a conversation</Link></Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="flex items-center gap-2.5 text-3xl font-bold tracking-tight">
          <FileText className="size-7 text-primary" />
          Incident report
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          A structured document you can attach to a complaint at cybercrime.gov.in, hand to a cyber
          cell, or send to a platform’s trust &amp; safety team. Fill in what you know — anything you
          leave blank is marked <span className="font-mono text-xs">[not provided]</span> rather than guessed.
        </p>
      </header>

      <form onSubmit={generate}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Context</CardTitle>
            <CardDescription>All optional. Every field improves the report, none are required.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {FIELDS.map((field) => (
                <div key={field.key} className="space-y-1.5">
                  <Label htmlFor={field.key}>{field.label}</Label>
                  <Input
                    id={field.key}
                    value={details[field.key] ?? ''}
                    onChange={set(field.key)}
                    placeholder={field.placeholder}
                    maxLength={300}
                  />
                </div>
              ))}

              <div className="space-y-1.5">
                <Label htmlFor="report-region">Your state</Label>
                <Select
                  value={details.region ?? ''}
                  onValueChange={(value) => setDetails((prev) => ({ ...prev, region: value }))}
                >
                  <SelectTrigger id="report-region"><SelectValue placeholder="Routes to your cyber cell" /></SelectTrigger>
                  <SelectContent>
                    {regions.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="extraContext">Anything else the authorities should know</Label>
              <Textarea
                id="extraContext"
                value={details.extraContext ?? ''}
                onChange={set('extraContext')}
                placeholder="Other accounts they have used, whether they know where you live, whether anyone else has been contacted…"
                maxLength={2000}
              />
            </div>

            {error ? (
              <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                {error}
              </div>
            ) : null}

            <Button type="submit" size="lg" disabled={busy}>
              {busy ? <><Loader2 className="animate-spin" />Drafting…</> : <><FileText />{report ? 'Regenerate report' : 'Generate report'}</>}
            </Button>
          </CardContent>
        </Card>
      </form>

      {report ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="space-y-6"
        >
          <Card className="border-primary/30">
            <CardHeader className="flex-row flex-wrap items-start justify-between gap-4 space-y-0">
              <div>
                <CardTitle>{report.title}</CardTitle>
                <CardDescription className="mt-1.5 flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="font-mono">{report.reference}</Badge>
                  <span>{formatDate(report.createdAt)}</span>
                  <Badge variant={report.level}>{report.level} · {report.severity}/100</Badge>
                  <Badge variant="secondary">{report.engine === 'gemini' ? 'AI-drafted' : 'Rule-based draft'}</Badge>
                </CardDescription>
              </div>
              <Button asChild>
                <a href={api.reportPdfUrl()} download><Download />Download PDF</a>
              </Button>
            </CardHeader>

            <CardContent className="space-y-6">
              <Section title="Summary"><p className="text-sm leading-relaxed">{report.summary}</p></Section>

              <Section title="Nature of the incident">
                <p className="text-sm leading-relaxed">{report.incidentNature}</p>
              </Section>

              {report.timeline?.length ? (
                <Section title="Timeline">
                  <ol className="space-y-2.5 border-l-2 border-border pl-4">
                    {report.timeline.map((item, i) => (
                      <li key={i} className="relative text-sm">
                        <span className="absolute -left-[21px] top-1.5 size-2 rounded-full bg-primary" />
                        <span className="font-medium">{item.when}</span>
                        <span className="text-muted-foreground"> — {item.what}</span>
                      </li>
                    ))}
                  </ol>
                </Section>
              ) : null}

              {report.evidence?.length ? (
                <Section title={`Evidence (${report.evidence.length})`} icon={Quote}>
                  <div className="space-y-3">
                    {report.evidence.map((item, i) => (
                      <div key={i} className="rounded-lg border border-border bg-background/50 p-3.5">
                        <div className="text-xs font-semibold text-primary">{item.reference}</div>
                        <blockquote className="mt-1.5 border-l-2 border-border pl-3 text-sm italic">
                          “{item.excerpt}”
                        </blockquote>
                        <p className="mt-2 text-xs text-muted-foreground">{item.significance}</p>
                      </div>
                    ))}
                  </div>
                </Section>
              ) : null}

              {report.legalContext?.length ? (
                <Section title="Potentially relevant provisions" icon={Scale}>
                  <ul className="space-y-1.5">
                    {report.legalContext.map((item, i) => (
                      <li key={i} className="flex gap-2 text-sm leading-relaxed">
                        <span className="text-primary">§</span>
                        <span className={i === report.legalContext.length - 1 ? 'italic text-muted-foreground' : ''}>
                          {item}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Section>
              ) : null}

              {report.requestedAction?.length ? (
                <Section title="Action requested" icon={ListChecks}>
                  <ul className="space-y-1.5">
                    {report.requestedAction.map((item, i) => (
                      <li key={i} className="flex gap-2 text-sm leading-relaxed">
                        <span className="text-primary">•</span>{item}
                      </li>
                    ))}
                  </ul>
                </Section>
              ) : null}

              {report.nextSteps?.length ? (
                <Section title="Your next steps">
                  <ol className="space-y-2">
                    {report.nextSteps.map((item, i) => (
                      <li key={i} className="flex gap-3 text-sm leading-relaxed">
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-bold text-primary">
                          {i + 1}
                        </span>
                        {item}
                      </li>
                    ))}
                  </ol>
                </Section>
              ) : null}
            </CardContent>
          </Card>

          <p className="rounded-lg border border-border bg-muted/50 p-4 text-xs leading-relaxed text-muted-foreground">
            Read every line before you file this. Severity scores and classifications are automated
            assessments, not legal determinations, and nothing here has been checked by a human.
            Correct anything marked <span className="font-mono">[not provided]</span>, and speak to a
            lawyer or a legal aid organisation about advice specific to your situation.
          </p>

          {report.resources ? (
            <Card>
              <CardHeader><CardTitle className="text-base">Where to file this</CardTitle></CardHeader>
              <CardContent><ResourceList resources={report.resources} /></CardContent>
            </Card>
          ) : null}
        </motion.div>
      ) : null}
    </div>
  );
}

function Section({ title, icon: Icon, children }) {
  return (
    <section>
      <h3 className="mb-2.5 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {Icon ? <Icon className="size-4" /> : null}
        {title}
      </h3>
      {children}
    </section>
  );
}

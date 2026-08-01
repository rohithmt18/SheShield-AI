import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, ScanSearch, MessageCircleHeart, FileText, ShieldCheck,
  Trash2, TrendingUp, Clock, AlertTriangle, Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter, DialogTrigger, DialogClose,
} from '@/components/ui/dialog';
import { SeverityGauge } from '@/components/SeverityGauge';
import { NumberTicker } from '@/components/magic/number-ticker';
import { useApp } from '@/lib/AppContext';
import { api, clearSessionId } from '@/lib/api';
import { cn, levelStyle, relativeTime } from '@/lib/utils';

const QUICK_ACTIONS = [
  { to: '/analyze', icon: ScanSearch, title: 'Check a conversation', body: 'Paste messages and get them scored.' },
  { to: '/companion', icon: MessageCircleHeart, title: 'Talk to the companion', body: 'Anonymous, judgment-free support.' },
  { to: '/report', icon: FileText, title: 'Generate a report', body: 'Turn evidence into a filable PDF.' },
  { to: '/resources', icon: ShieldCheck, title: 'Find help', body: 'Helplines, portals, and NGOs.' },
];

export default function Dashboard() {
  const { session, status, categories, latestAnalysis } = useApp();
  const [deleting, setDeleting] = useState(false);

  const analyses = session?.analyses ?? [];
  const flaggedTotal = analyses.reduce(
    (sum, a) => sum + a.messages.filter((m) => m.flagged).length, 0,
  );
  const worst = analyses.reduce(
    (max, a) => (a.overallSeverity > (max?.overallSeverity ?? -1) ? a : max), null,
  );

  const categoryCounts = {};
  for (const a of analyses) {
    for (const c of a.categories) {
      if (c !== 'none') categoryCounts[c] = (categoryCounts[c] ?? 0) + 1;
    }
  }
  const topCategories = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxCount = topCategories[0]?.[1] ?? 1;

  async function deleteEverything() {
    setDeleting(true);
    try {
      await api.deleteSession();
    } finally {
      clearSessionId();
      window.location.href = '/';
    }
  }

  if (status === 'loading') {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 sm:grid-cols-3"><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /></div>
        <Skeleton className="h-72" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2.5 text-3xl font-bold tracking-tight">
            <LayoutDashboard className="size-7 text-primary" />
            Dashboard
          </h1>
          <p className="mt-2 text-muted-foreground">
            Everything checked in this session. It is deleted automatically, and closing this tab
            ends it on this device.
          </p>
        </div>

        {session ? (
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-destructive/40 text-destructive hover:bg-destructive/10">
                <Trash2 />
                Delete everything
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete this session?</DialogTitle>
                <DialogDescription>
                  Every analysis, chat message, and report held for you is erased from the server
                  immediately. This cannot be undone, and any report you have not downloaded will be gone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild><Button variant="ghost">Keep it</Button></DialogClose>
                <Button variant="destructive" onClick={deleteEverything} disabled={deleting}>
                  {deleting ? <Loader2 className="animate-spin" /> : <Trash2 />}
                  Delete everything
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        ) : null}
      </header>

      {!analyses.length ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center gap-4 py-14 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-primary/12 text-primary">
              <ScanSearch className="size-7" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Nothing checked yet</h2>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                When you analyse a conversation, the results appear here — severity over time,
                which categories keep coming up, and the report you generated.
              </p>
            </div>
            <Button asChild size="lg"><Link to="/analyze"><ScanSearch />Check a conversation</Link></Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: 'Conversations checked', value: analyses.length, icon: ScanSearch },
              { label: 'Messages flagged', value: flaggedTotal, icon: AlertTriangle },
              { label: 'Highest severity', value: worst?.overallSeverity ?? 0, icon: TrendingUp, suffix: '/100' },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: i * 0.08 }}
              >
                <Card>
                  <CardContent className="flex items-center gap-4 p-5">
                    <div className="flex size-11 items-center justify-center rounded-lg bg-primary/12 text-primary">
                      <stat.icon className="size-5" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">
                        <NumberTicker value={stat.value} suffix={stat.suffix ?? ''} />
                      </div>
                      <div className="text-xs text-muted-foreground">{stat.label}</div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Most recent assessment</CardTitle>
                <CardDescription>{relativeTime(latestAnalysis?.createdAt)}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-6 sm:flex-row">
                <SeverityGauge
                  score={latestAnalysis.overallSeverity}
                  level={latestAnalysis.level}
                  size={140}
                />
                <div className="flex-1 space-y-3 text-center sm:text-left">
                  <div className="flex flex-wrap justify-center gap-1.5 sm:justify-start">
                    {latestAnalysis.categories.filter((c) => c !== 'none').map((c) => (
                      <Badge key={c} variant={latestAnalysis.level}>{categories[c]?.label ?? c}</Badge>
                    ))}
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">{latestAnalysis.summary}</p>
                  <Button asChild size="sm" variant="outline">
                    <Link to="/report"><FileText />Generate a report from this</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Categories seen</CardTitle>
                <CardDescription>Across this session</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3.5">
                {topCategories.length ? topCategories.map(([key, count]) => (
                  <div key={key}>
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <span className="font-medium">{categories[key]?.label ?? key}</span>
                      <span className="text-muted-foreground">{count}</span>
                    </div>
                    <Progress value={(count / maxCount) * 100} />
                  </div>
                )) : (
                  <p className="text-sm text-muted-foreground">Nothing flagged so far.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">History</CardTitle>
              <CardDescription>Every conversation checked in this session</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {[...analyses].reverse().map((a) => {
                const style = levelStyle(a.level);
                return (
                  <div
                    key={a.id}
                    className={cn('flex flex-wrap items-center gap-3 rounded-lg border p-3.5', style.border, style.bg)}
                  >
                    <div className={cn('text-xl font-bold tabular-nums', style.text)}>{a.overallSeverity}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={a.level}>{a.level}</Badge>
                        {a.sourceLabel ? <span className="text-xs font-medium">{a.sourceLabel}</span> : null}
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="size-3" />
                          {relativeTime(a.createdAt)}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{a.summary}</p>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {a.messages.filter((m) => m.flagged).length}/{a.messageCount} flagged
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </>
      )}

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Quick actions
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {QUICK_ACTIONS.map(({ to, icon: Icon, title, body }) => (
            <Link
              key={to}
              to={to}
              className="group rounded-lg border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
            >
              <div className="mb-3 flex size-9 items-center justify-center rounded-lg bg-primary/12 text-primary">
                <Icon className="size-4.5" />
              </div>
              <div className="text-sm font-semibold">{title}</div>
              <p className="mt-0.5 text-xs text-muted-foreground">{body}</p>
            </Link>
          ))}
        </div>
      </div>

      {session?.report ? (
        <Card>
          <CardContent className="flex flex-wrap items-center gap-4 p-5">
            <FileText className="size-8 text-primary" />
            <div className="flex-1">
              <div className="text-sm font-semibold">{session.report.title}</div>
              <div className="text-xs text-muted-foreground">
                Reference {session.report.reference} · {relativeTime(session.report.createdAt)}
              </div>
            </div>
            <Button asChild variant="outline">
              <a href={api.reportPdfUrl()} download>Download PDF</a>
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

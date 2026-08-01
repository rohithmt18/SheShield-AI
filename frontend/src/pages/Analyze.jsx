import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ScanSearch, Upload, Loader2, AlertCircle, TrendingUp, FileText,
  MessageCircleHeart, Lightbulb, WifiOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { SeverityGauge } from '@/components/SeverityGauge';
import { MessageList } from '@/components/MessageList';
import { ResourceList } from '@/components/ResourceList';
import { api } from '@/lib/api';
import { useApp } from '@/lib/AppContext';
import { cn, levelStyle } from '@/lib/utils';

const SAMPLE = `Ravi: why arent you replying
Ravi: i saw you online
Ravi: answer me
Ravi: i know where you live
Ravi: send me a pic or ill show everyone the ones i already have`;

export default function Analyze() {
  const { categories, regions, refresh } = useApp();
  const [text, setText] = useState('');
  const [sourceLabel, setSourceLabel] = useState('');
  const [region, setRegion] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const fileRef = useRef(null);
  const resultRef = useRef(null);

  async function submit(event) {
    event?.preventDefault();
    if (!text.trim() || busy) return;

    setBusy(true);
    setError(null);
    try {
      const { analysis: result } = await api.analyze({ text, sourceLabel, region });
      setAnalysis(result);
      await refresh();
      requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function onFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 2_000_000) {
      setError('That file is larger than 2 MB. Paste the relevant part instead.');
      return;
    }
    setText((await file.text()).slice(0, 40_000));
    setSourceLabel((prev) => prev || file.name.replace(/\.(txt|csv|log)$/i, ''));
    event.target.value = '';
  }

  const style = analysis ? levelStyle(analysis.level) : null;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="flex items-center gap-2.5 text-3xl font-bold tracking-tight">
          <ScanSearch className="size-7 text-primary" />
          Check a conversation
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Paste the messages exactly as they were sent, or upload a chat export. Nothing here is
          linked to your name, and you can delete it all at any time.
        </p>
      </header>

      <form onSubmit={submit}>
        <Card>
          <CardHeader>
            <CardTitle>What were you sent?</CardTitle>
            <CardDescription>
              WhatsApp exports, Instagram DMs, comments — any format. Sender names and timestamps
              are detected automatically when they are present.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={'Paste the conversation here…\n\nRavi: why arent you replying\nRavi: i know where you live'}
              className="min-h-56 font-mono text-[13px]"
              maxLength={40_000}
            />

            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>{text.length.toLocaleString()} / 40,000 characters</span>
              <span aria-hidden>·</span>
              <button type="button" onClick={() => setText(SAMPLE)} className="font-medium text-primary hover:underline">
                Use a sample conversation
              </button>
              {text ? (
                <>
                  <span aria-hidden>·</span>
                  <button type="button" onClick={() => { setText(''); setAnalysis(null); }} className="hover:text-foreground">
                    Clear
                  </button>
                </>
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="source">Where did this happen?</Label>
                <Input
                  id="source"
                  value={sourceLabel}
                  onChange={(e) => setSourceLabel(e.target.value)}
                  placeholder="WhatsApp, Instagram…"
                  maxLength={80}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="region">Your state <span className="text-muted-foreground">(optional)</span></Label>
                <Select value={region} onValueChange={setRegion}>
                  <SelectTrigger id="region"><SelectValue placeholder="For local cyber cell" /></SelectTrigger>
                  <SelectContent>
                    {regions.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="file">Or upload an export</Label>
                <input
                  ref={fileRef}
                  id="file"
                  type="file"
                  accept=".txt,.csv,.log,text/plain"
                  onChange={onFile}
                  className="hidden"
                />
                <Button type="button" variant="outline" className="w-full" onClick={() => fileRef.current?.click()}>
                  <Upload />
                  Choose file
                </Button>
              </div>
            </div>

            {error ? (
              <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                {error}
              </div>
            ) : null}

            <Button type="submit" size="lg" disabled={!text.trim() || busy} className="w-full sm:w-auto">
              {busy ? <><Loader2 className="animate-spin" />Analysing…</> : <><ScanSearch />Analyse this conversation</>}
            </Button>
          </CardContent>
        </Card>
      </form>

      <AnimatePresence>
        {analysis ? (
          <motion.div
            ref={resultRef}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="space-y-6"
          >
            <Card className={cn('overflow-hidden border-2', style.border)}>
              <CardContent className="flex flex-col items-center gap-8 p-6 sm:flex-row sm:p-8">
                <SeverityGauge score={analysis.overallSeverity} level={analysis.level} />

                <div className="flex-1 space-y-4 text-center sm:text-left">
                  <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                    {analysis.categories.filter((c) => c !== 'none').map((c) => (
                      <Badge key={c} variant={analysis.level}>{categories[c]?.label ?? c}</Badge>
                    ))}
                    {analysis.escalating ? (
                      <Badge variant="destructive"><TrendingUp className="size-3" />Escalating</Badge>
                    ) : null}
                  </div>

                  <p className="text-pretty leading-relaxed">{analysis.summary}</p>

                  <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground sm:justify-start">
                    <Badge variant="secondary">
                      {analysis.engine === 'gemini' ? 'Gemini analysis' : 'Offline engine'}
                    </Badge>
                    <span>{analysis.messageCount} messages checked</span>
                  </div>

                  {analysis.degraded ? (
                    <p className="flex items-start gap-2 rounded-md bg-muted p-2.5 text-xs text-muted-foreground">
                      <WifiOff className="mt-0.5 size-3.5 shrink-0" />
                      AI analysis was unavailable, so this used the offline pattern engine. It is more
                      literal and can miss subtler cases — treat a low score with your own judgment.
                    </p>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            {analysis.recommendedActions?.length ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Lightbulb className="size-4 text-primary" />
                    What to do next
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className="space-y-2.5">
                    {analysis.recommendedActions.map((action, i) => (
                      <li key={action} className="flex gap-3 text-sm leading-relaxed">
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-bold text-primary">
                          {i + 1}
                        </span>
                        {action}
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            ) : null}

            {analysis.patterns?.length ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Patterns identified</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  {analysis.patterns.map((p) => (
                    <div key={p.name} className="rounded-lg border border-border bg-background/50 p-3.5">
                      <div className="text-sm font-semibold">{p.name}</div>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{p.evidence}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : null}

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Message breakdown</CardTitle>
                <CardDescription>
                  Flagged messages are blurred until you choose to read them.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MessageList messages={analysis.messages} categoryLabels={categories} />
              </CardContent>
            </Card>

            {analysis.resources ? (
              <Card>
                <CardHeader><CardTitle className="text-base">Help that fits this situation</CardTitle></CardHeader>
                <CardContent><ResourceList resources={analysis.resources} /></CardContent>
              </Card>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="flex-1">
                <Link to="/report"><FileText />Generate an incident report</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="flex-1">
                <Link to="/companion"><MessageCircleHeart />Talk this through</Link>
              </Button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ScanSearch, Upload, Loader2, AlertCircle, TrendingUp, FileText,
  MessageCircleHeart, Lightbulb, WifiOff, Type, Image as ImageIcon,
  X, ScanText, Info, PencilLine,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { SeverityGauge } from '@/components/SeverityGauge';
import { MessageList } from '@/components/MessageList';
import { ResourceList } from '@/components/ResourceList';
import { api } from '@/lib/api';
import { useApp } from '@/lib/AppContext';
import { cn, levelStyle, engineLabel, isAiEngine } from '@/lib/utils';

const SAMPLE = `Ravi: why arent you replying
Ravi: i saw you online
Ravi: answer me
Ravi: i know where you live
Ravi: send me a pic or ill show everyone the ones i already have`;

/** Kept in step with the backend's own limits so rejection is instant, not a round trip. */
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

const prettyBytes = (n) => (n < 1_000_000 ? `${Math.round(n / 1000)} KB` : `${(n / 1_000_000).toFixed(1)} MB`);

/**
 * True when a file read as text is really binary.
 *
 * `File.text()` never fails — it decodes anything as UTF-8 and substitutes
 * U+FFFD for whatever it could not make sense of. A PDF or an image therefore
 * arrives as tens of thousands of replacement characters, which then get
 * analysed as if they were messages and come back "0 · SAFE". Control
 * characters and replacement chars are vanishingly rare in a real chat export,
 * so a few percent of them is decisive.
 */
function looksBinary(sample) {
  if (!sample) return false;
  let noise = 0;
  for (let i = 0; i < sample.length; i += 1) {
    const code = sample.charCodeAt(i);
    // C0 control characters, excluding tab, newline and carriage return,
    // plus U+FFFD, the decoder's "I could not read this byte" stand-in.
    const isControl = code < 32 && code !== 9 && code !== 10 && code !== 13;
    if (isControl || code === 0xfffd) noise += 1;
  }
  return noise / sample.length > 0.02;
}

export default function Analyze() {
  const { categories, regions, refresh } = useApp();
  const [mode, setMode] = useState('text');
  const [text, setText] = useState('');
  const [sourceLabel, setSourceLabel] = useState('');
  const [region, setRegion] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [progress, setProgress] = useState(0);
  /** 'uploading' while bytes are in flight, 'processing' once the server has them. */
  const [stage, setStage] = useState(null);
  const [extractedText, setExtractedText] = useState(null);

  const fileRef = useRef(null);
  const imageRef = useRef(null);
  const resultRef = useRef(null);

  // Object URLs are a manual allocation; without this each new selection leaks
  // the last one for the lifetime of the page.
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const showResult = (result) => {
    setAnalysis(result);
    requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  async function submit(event) {
    event?.preventDefault();
    if (busy) return;
    if (mode === 'text' ? !text.trim() : !image) return;

    setBusy(true);
    setError(null);
    setExtractedText(null);

    try {
      if (mode === 'text') {
        const { analysis: result } = await api.analyze({ text, sourceLabel, region });
        showResult(result);
      } else {
        setStage('uploading');
        setProgress(0);
        const { analysis: result, extractedText: read } = await api.analyzeImage(
          { file: image, sourceLabel, region },
          {
            onProgress: (percent) => {
              setProgress(percent);
              // The bytes are gone; everything after this is OCR and the model,
              // neither of which reports progress. Say so rather than parking a
              // bar at 100% and looking stuck.
              if (percent >= 100) setStage('processing');
            },
          },
        );
        setExtractedText(read ?? '');
        showResult(result);
      }
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
      setStage(null);
      setProgress(0);
    }
  }

  async function onFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    // Choosing an image here says plainly what she wants, even though this is
    // the export picker — so take her to the screenshot flow rather than
    // refusing. The old behaviour read the image's bytes as text and pasted
    // 40,000 characters of mojibake into the box, which then came back "SAFE".
    if (IMAGE_TYPES.includes(file.type) || /\.(jpe?g|png|webp)$/i.test(file.name)) {
      setMode('image');
      chooseImage(file);
      return;
    }

    if (file.size > 2_000_000) {
      setError('That file is larger than 2 MB. Paste the relevant part instead.');
      return;
    }

    const content = (await file.text()).slice(0, 40_000);
    if (looksBinary(content)) {
      setError(
        'That file is not readable as text — it looks like a PDF, document, or other binary file. '
        + 'Upload a .txt chat export, or use the screenshot tab if it is an image.',
      );
      return;
    }

    setError(null);
    setText(content);
    setSourceLabel((prev) => prev || file.name.replace(/\.(txt|csv|log)$/i, ''));
  }

  function chooseImage(file) {
    if (!file) return;

    // Checked here as well as on the server: a 9 MB upload that fails on
    // arrival wastes her data and her time, and on a phone that is not free.
    // The extension is a fallback because some systems hand over a File with an
    // empty `type`; the server still checks the actual bytes either way.
    const named = /\.(jpe?g|png|webp)$/i.test(file.name);
    if (!IMAGE_TYPES.includes(file.type) && !(named && !file.type)) {
      setError(`${file.type ? file.type.replace(/^image\//, '').toUpperCase() : 'That file type'} is not supported. Choose a JPG, PNG or WebP image.`);
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError(`That image is ${prettyBytes(file.size)}, over the 8 MB limit. Crop it to the part that matters.`);
      return;
    }

    setError(null);
    setImage(file);
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return URL.createObjectURL(file);
    });
  }

  function clearImage() {
    setImage(null);
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return null;
    });
    setExtractedText(null);
    if (imageRef.current) imageRef.current.value = '';
  }

  /** Moves OCR output into the textarea so she can fix a misread and re-run. */
  function editAsText() {
    setText(extractedText);
    setMode('text');
    setAnalysis(null);
    setExtractedText(null);
  }

  const style = analysis ? levelStyle(analysis.level) : null;
  const canSubmit = mode === 'text' ? Boolean(text.trim()) : Boolean(image);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="flex items-center gap-2.5 text-3xl font-bold tracking-tight">
          <ScanSearch className="size-7 text-primary" />
          Check a conversation
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Paste the messages exactly as they were sent, upload a chat export, or send a screenshot.
          Nothing here is linked to your name, and you can delete it all at any time.
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
            <Tabs value={mode} onValueChange={(next) => { setMode(next); setError(null); }}>
              <TabsList>
                <TabsTrigger value="text"><Type />Paste text</TabsTrigger>
                <TabsTrigger value="image"><ImageIcon />Upload a screenshot</TabsTrigger>
              </TabsList>

              <TabsContent value="text" className="space-y-4">
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
              </TabsContent>

              <TabsContent value="image" className="space-y-3">
                <input
                  ref={imageRef}
                  id="image"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => { chooseImage(e.target.files?.[0]); e.target.value = ''; }}
                  className="hidden"
                />

                {preview ? (
                  <div className="overflow-hidden rounded-lg border border-border">
                    <div className="flex items-center gap-3 border-b border-border bg-muted/40 px-3 py-2">
                      <ImageIcon className="size-4 shrink-0 text-primary" />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{image.name}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{prettyBytes(image.size)}</span>
                      <button
                        type="button"
                        onClick={clearImage}
                        disabled={busy}
                        aria-label="Remove image"
                        className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                    {/* Checkerboard so a screenshot with transparency stays legible. */}
                    <div className="flex max-h-80 justify-center overflow-auto bg-[repeating-conic-gradient(var(--muted)_0%_25%,transparent_0%_50%)] bg-[length:16px_16px] p-3">
                      <img src={preview} alt="Screenshot to analyse" className="max-h-72 rounded object-contain" />
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => imageRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => { e.preventDefault(); chooseImage(e.dataTransfer.files?.[0]); }}
                    className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed
                               border-border py-14 transition-colors hover:border-primary/60 hover:bg-muted/40"
                  >
                    <Upload className="size-7 text-muted-foreground" />
                    <span className="text-sm font-medium">Choose a screenshot, or drag one here</span>
                    <span className="text-xs text-muted-foreground">JPG, PNG or WebP · up to 8 MB</span>
                  </button>
                )}

                <p className="flex items-start gap-2 rounded-md bg-muted/60 p-2.5 text-xs leading-relaxed text-muted-foreground">
                  <Info className="mt-0.5 size-3.5 shrink-0" />
                  <span>
                    The text is read out of the image and then checked exactly like a pasted
                    conversation. A screenshot does not record who sent which message, so every line
                    is attributed to one sender — read the breakdown with that in mind. You will see
                    what was recognised, and can correct it.
                  </span>
                </p>
              </TabsContent>
            </Tabs>

            <div className={cn('grid gap-4', mode === 'text' ? 'sm:grid-cols-3' : 'sm:grid-cols-2')}>
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

              {mode === 'text' ? (
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
              ) : null}
            </div>

            {error ? (
              <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                {error}
              </div>
            ) : null}

            {stage ? (
              <div className="space-y-2" aria-live="polite">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 font-medium">
                    {stage === 'uploading' ? (
                      <><Upload className="size-3.5" />Uploading the image…</>
                    ) : (
                      <><ScanText className="size-3.5 animate-pulse" />Reading the text and analysing it…</>
                    )}
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    {stage === 'uploading' ? `${progress}%` : 'This can take a few seconds'}
                  </span>
                </div>
                {/* Indeterminate once the bytes have landed: OCR and the model
                    report nothing, and a bar frozen at 100% reads as a hang. */}
                <Progress value={stage === 'uploading' ? progress : 100} className={cn(stage === 'processing' && 'animate-pulse')} />
              </div>
            ) : null}

            <Button type="submit" size="lg" disabled={!canSubmit || busy} className="w-full sm:w-auto">
              {busy ? (
                <><Loader2 className="animate-spin" />Analysing…</>
              ) : (
                <><ScanSearch />{mode === 'image' ? 'Analyse this screenshot' : 'Analyse this conversation'}</>
              )}
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
                      {isAiEngine(analysis.engine) ? `${engineLabel(analysis.engine)} analysis` : 'Offline engine'}
                    </Badge>
                    {analysis.source?.kind === 'image' ? (
                      <Badge variant="secondary">
                        <ImageIcon className="size-3" />
                        Read from a screenshot
                      </Badge>
                    ) : null}
                    <span>{analysis.messageCount} messages checked</span>
                  </div>

                  {analysis.degraded ? (
                    <p className="flex items-start gap-2 rounded-md bg-muted p-2.5 text-xs text-muted-foreground">
                      <WifiOff className="mt-0.5 size-3.5 shrink-0" />
                      <span>
                        {/* The reason comes from the server: the AI may have been
                            unreachable, or may have covered only part of a long
                            conversation. Saying which is more useful than a generic note. */}
                        {isAiEngine(analysis.engine)
                          ? analysis.degraded
                          : (analysis.degraded ?? 'AI analysis was unavailable, so this used the offline pattern engine.')}
                        {' '}The offline engine is more literal and can miss subtler cases — treat a low score with your own judgment.
                      </span>
                    </p>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            {extractedText ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ScanText className="size-4 text-primary" />
                    What was read from the image
                  </CardTitle>
                  <CardDescription>
                    {/* OCR misreads things — a lost colon, a dropped word. If this
                        is going into a police complaint she should be able to see
                        and fix it, not take the machine's word for it. */}
                    Check this against the screenshot. If anything was misread, correct it and run
                    the analysis again.
                    {typeof analysis.source?.confidence === 'number' ? (
                      <> Recognition confidence was <strong>{analysis.source.confidence}%</strong>.</>
                    ) : null}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-md bg-muted/60 p-3 font-mono text-[13px] leading-relaxed">
                    {extractedText}
                  </pre>
                  <Button type="button" variant="outline" size="sm" onClick={editAsText}>
                    <PencilLine />
                    Correct this text and re-analyse
                  </Button>
                </CardContent>
              </Card>
            ) : null}

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

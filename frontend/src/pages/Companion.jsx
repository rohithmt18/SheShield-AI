import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircleHeart, Send, Loader2, Trash2, Phone, ShieldAlert, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { useApp } from '@/lib/AppContext';
import { cn } from '@/lib/utils';

const OPENERS = [
  'Someone won’t stop messaging me',
  'He’s threatening to share my photos',
  'How do I save evidence?',
  'I don’t know if this counts as harassment',
];

const GREETING = {
  role: 'assistant',
  content: 'Hi. Whatever is going on, you can say it here exactly as it is — there is no wrong way to '
    + 'start, and nothing you write is attached to your name.\n\nWhat’s been happening?',
  at: null,
  greeting: true,
};

export default function Companion() {
  const { aiEnabled } = useApp();
  const [messages, setMessages] = useState([GREETING]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [crisis, setCrisis] = useState(null);
  const [error, setError] = useState(null);
  const endRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const { messages: history } = await api.chatHistory();
        if (history?.length) setMessages(history);
      } catch { /* no session yet — the greeting stands */ }
    })();
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, busy]);

  async function send(content) {
    const message = (content ?? draft).trim();
    if (!message || busy) return;

    setDraft('');
    setError(null);
    setBusy(true);
    setMessages((prev) => [
      ...prev.filter((m) => !m.greeting),
      { role: 'user', content: message, at: new Date().toISOString() },
    ]);

    try {
      const result = await api.chat(message);
      setMessages((prev) => [...prev, { role: 'assistant', content: result.reply, at: new Date().toISOString() }]);
      setCrisis(result.crisis ? result.emergency : null);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  async function clear() {
    await api.clearChat().catch(() => {});
    setMessages([GREETING]);
    setCrisis(null);
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-11rem)] max-w-3xl flex-col">
      <header className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight">
            <MessageCircleHeart className="size-6 text-primary" />
            Companion
          </h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Lock className="size-3.5" />
            Anonymous · {aiEnabled ? 'AI-supported' : 'offline mode'} · not a human counsellor
          </p>
        </div>
        {messages.length > 1 ? (
          <Button variant="ghost" size="sm" onClick={clear}>
            <Trash2 />
            Clear
          </Button>
        ) : null}
      </header>

      <AnimatePresence>
        {crisis ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 overflow-hidden"
          >
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4">
              <div className="flex items-center gap-2 font-semibold text-destructive">
                <ShieldAlert className="size-4.5" />
                Please reach a person right now
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {crisis.map((c) => (
                  <a
                    key={c.id}
                    href={`tel:${c.contact}`}
                    className="inline-flex items-center gap-1.5 rounded-md bg-destructive px-3 py-2 text-sm font-semibold text-destructive-foreground"
                  >
                    <Phone className="size-3.5" />
                    {c.name} · {c.contact}
                  </a>
                ))}
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <CardContent className="scrollbar-thin flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
          {messages.map((message, i) => (
            <motion.div
              key={`${message.at ?? 'greeting'}-${i}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={cn('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}
            >
              <div
                className={cn(
                  'max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                  message.role === 'user'
                    ? 'rounded-br-sm bg-primary text-primary-foreground'
                    : 'rounded-bl-sm bg-muted',
                )}
              >
                {message.content}
              </div>
            </motion.div>
          ))}

          {busy ? (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm bg-muted px-4 py-3">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="size-1.5 rounded-full bg-muted-foreground"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.18 }}
                  />
                ))}
              </div>
            </div>
          ) : null}

          <div ref={endRef} />
        </CardContent>

        {messages.length <= 1 && !busy ? (
          <div className="flex flex-wrap gap-2 border-t border-border px-4 py-3">
            {OPENERS.map((opener) => (
              <button
                key={opener}
                type="button"
                onClick={() => send(opener)}
                className="rounded-full border border-border px-3 py-1.5 text-xs transition-colors hover:border-primary/50 hover:bg-accent"
              >
                {opener}
              </button>
            ))}
          </div>
        ) : null}

        <div className="border-t border-border p-3">
          {error ? <p className="mb-2 px-1 text-xs text-destructive">{error}</p> : null}
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => { e.preventDefault(); send(); }}
          >
            <Textarea
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
              }}
              placeholder="Type whatever you want to say… (Enter to send, Shift+Enter for a new line)"
              className="max-h-40 min-h-11 flex-1 resize-none py-2.5"
              rows={1}
              maxLength={6000}
            />
            <Button type="submit" size="icon" disabled={!draft.trim() || busy} aria-label="Send message">
              {busy ? <Loader2 className="animate-spin" /> : <Send />}
            </Button>
          </form>
        </div>
      </Card>

      <p className="mt-3 text-center text-xs text-muted-foreground">
        <Badge variant="secondary" className="mr-1.5">Note</Badge>
        This is an AI, not a counsellor or a lawyer. For an emergency call 112, or 14416 for mental health support.
      </p>
    </div>
  );
}

import { useState, useSyncExternalStore, useCallback, useEffect, useRef } from 'react';
import { Send, ShieldAlert, FileText } from 'lucide-react';
import { instagram } from '@/platforms/instagram';
import { Avatar } from '@/components/Avatar';
import { ScreenedText } from '@/components/ScreenedText';
import { FullReportDialog } from '@/components/FullReportDialog';
import { useVerdict, useScreen } from '@/lib/useModeration';
import { RISK } from '@/lib/riskModel';
import { cn, relativeTime } from '@/lib/utils';

export default function Messages() {
  const threads = useSyncExternalStore(
    useCallback((fn) => instagram.subscribe(fn), []),
    () => instagram.listThreads(),
  );
  const [activeId, setActiveId] = useState(threads[0]?.id ?? null);
  const active = threads.find((t) => t.id === activeId) ?? threads[0];

  return (
    <div className="mx-auto grid max-w-5xl gap-4 px-4 py-6 md:grid-cols-[260px_1fr]">
      <aside className="space-y-1">
        <h1 className="mb-2 px-1 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Messages
        </h1>
        {threads.map((thread) => (
          <ThreadRow
            key={thread.id}
            thread={thread}
            active={thread.id === active?.id}
            onSelect={() => setActiveId(thread.id)}
          />
        ))}
      </aside>

      {active ? <Conversation thread={active} /> : null}
    </div>
  );
}

/** Row shows the risk of the whole conversation, not just the last line. */
function ThreadRow({ thread, active, onSelect }) {
  const threadItem = threadAnalysisItem(thread);
  const { verdict } = useVerdict(threadItem.id);
  const screen = useScreen();

  useEffect(() => { screen(threadItem); }, [threadItem, screen]);

  const risk = verdict?.risk ? RISK[verdict.risk] : null;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-lg border p-2.5 text-left transition-colors',
        active ? 'border-primary/40 bg-primary/8' : 'border-transparent hover:bg-muted',
      )}
    >
      <Avatar handle={thread.author} gradient={thread.avatar} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-sm font-semibold">{thread.author}</span>
          {risk && risk.id !== 'safe' ? <span className={cn('size-2 rounded-full', risk.dot)} /> : null}
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          {thread.messages.at(-1)?.text ?? ''}
        </span>
      </span>
    </button>
  );
}

function Conversation({ thread }) {
  const [draft, setDraft] = useState('');
  const endRef = useRef(null);
  const threadItem = threadAnalysisItem(thread);
  const { verdict } = useVerdict(threadItem.id);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [thread.messages.length]);

  const risk = verdict?.risk ? RISK[verdict.risk] : null;

  function submit(event) {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    instagram.sendMessage(thread.id, { text });
    setDraft('');
  }

  return (
    <section className="flex min-h-[70vh] flex-col rounded-lg border border-border bg-card">
      <header className="flex items-center gap-3 border-b border-border p-3">
        <Avatar handle={thread.author} gradient={thread.avatar} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{thread.author}</div>
          <div className="text-[11px] text-muted-foreground">Instagram</div>
        </div>
        {risk && risk.id !== 'safe' ? (
          <FullReportDialog
            verdict={verdict}
            trigger={(
              <button
                type="button"
                className={cn('inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[11px] font-semibold',
                  risk.border, risk.tone)}
              >
                <FileText className="size-3.5" />
                Full AI Report
              </button>
            )}
          />
        ) : null}
      </header>

      {/* Conversation-level warning: a thread can be dangerous through
          escalation even when no single line looks extreme alone. */}
      {risk && risk.id !== 'safe' ? (
        <div className={cn('flex items-start gap-2 border-b p-3 text-xs', risk.bg, risk.border, risk.tone)}>
          <ShieldAlert className="mt-0.5 size-4 shrink-0" />
          <div>
            <strong>{risk.label} conversation · {verdict.score}/100.</strong>{' '}
            {verdict.summary || risk.blurb}
          </div>
        </div>
      ) : null}

      <div className="scrollbar-thin flex-1 space-y-3 overflow-y-auto p-4">
        {thread.messages.map((message) => (
          <div key={message.id} className={cn('flex', message.mine ? 'justify-end' : 'justify-start')}>
            <div className={cn('max-w-[80%] rounded-2xl px-3 py-2',
              message.mine ? 'rounded-br-sm bg-primary text-primary-foreground' : 'rounded-bl-sm bg-muted')}
            >
              {message.mine ? (
                <p className="whitespace-pre-wrap break-words text-sm">{message.text}</p>
              ) : (
                <ScreenedText
                  item={{
                    id: message.id,
                    text: message.text,
                    author: message.author,
                    kind: 'message',
                    platform: 'instagram',
                  }}
                  compact
                />
              )}
              <div className={cn('mt-0.5 text-[10px]', message.mine ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                {relativeTime(message.createdAt)}
              </div>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <form onSubmit={submit} className="flex items-center gap-2 border-t border-border p-3">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Message…"
          maxLength={2000}
          className="min-w-0 flex-1 rounded-full border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          className="rounded-full bg-primary p-2 text-primary-foreground disabled:opacity-40"
          aria-label="Send"
        >
          <Send className="size-4" />
        </button>
      </form>
    </section>
  );
}

/**
 * A thread is screened as one conversation so SheShield can see escalation
 * across messages — the signal that matters most in stalking and sextortion,
 * and the one a per-message check cannot see. Messages you sent are excluded;
 * the analysis is of what was sent *to* you. The id changes as the thread
 * grows, so a new verdict is produced when it does.
 */
function threadAnalysisItem(thread) {
  const incoming = thread.messages.filter((m) => !m.mine);
  return {
    id: `${thread.id}#${incoming.length}`,
    kind: 'thread',
    platform: thread.platform,
    author: thread.author,
    text: incoming.map((m) => m.text).join('\n'),
    thread: incoming.map((m) => ({ author: m.author, text: m.text, createdAt: m.createdAt })),
  };
}

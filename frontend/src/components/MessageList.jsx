import { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn, levelStyle } from '@/lib/utils';

/**
 * Per-message breakdown.
 *
 * Flagged text starts blurred. Re-reading abuse is re-living it, and the user
 * should choose when that happens rather than have it thrust at her the moment
 * results load.
 */
export function MessageList({ messages = [], categoryLabels = {} }) {
  const [revealed, setRevealed] = useState(() => new Set());
  const [showSafe, setShowSafe] = useState(false);

  const flaggedCount = messages.filter((m) => m.flagged).length;
  const visible = showSafe ? messages : messages.filter((m) => m.flagged);

  const toggle = (index) => setRevealed((prev) => {
    const next = new Set(prev);
    if (next.has(index)) next.delete(index); else next.add(index);
    return next;
  });

  if (!messages.length) return null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{flaggedCount}</span> of {messages.length} messages flagged
        </p>
        <div className="flex gap-2">
          {flaggedCount > 0 ? (
            <Button
              variant="ghost" size="sm"
              onClick={() => setRevealed(revealed.size ? new Set() : new Set(messages.filter((m) => m.flagged).map((m) => m.index)))}
            >
              {revealed.size ? <EyeOff /> : <Eye />}
              {revealed.size ? 'Hide all' : 'Reveal all'}
            </Button>
          ) : null}
          {flaggedCount < messages.length ? (
            <Button variant="ghost" size="sm" onClick={() => setShowSafe((v) => !v)}>
              {showSafe ? 'Flagged only' : 'Show all messages'}
            </Button>
          ) : null}
        </div>
      </div>

      <ul className="space-y-2">
        {visible.map((message, i) => {
          const style = levelStyle(message.level);
          const isRevealed = revealed.has(message.index) || !message.flagged;

          return (
            <motion.li
              key={message.index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, delay: Math.min(i * 0.03, 0.4) }}
              className={cn(
                'rounded-lg border p-3.5 transition-colors',
                message.flagged ? cn(style.border, style.bg) : 'border-border bg-card',
              )}
            >
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold">{message.sender}</span>
                {message.timestamp ? (
                  <span className="text-xs text-muted-foreground">{message.timestamp}</span>
                ) : null}
                {message.flagged ? (
                  <Badge variant={message.level} className="ml-auto">
                    <AlertTriangle className="size-3" />
                    {message.severity}/100
                  </Badge>
                ) : null}
              </div>

              <button
                type="button"
                onClick={() => message.flagged && toggle(message.index)}
                disabled={!message.flagged}
                className={cn(
                  'w-full whitespace-pre-wrap break-words text-left text-sm leading-relaxed transition-all',
                  message.flagged && !isRevealed && 'select-none blur-[5px] hover:blur-[3px] cursor-pointer',
                  !message.flagged && 'cursor-default',
                )}
                title={message.flagged ? 'Click to show or hide this message' : undefined}
              >
                {message.text}
              </button>

              {message.flagged ? (
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  {message.categories.map((c) => (
                    <Badge key={c} variant="outline" className="text-[11px]">
                      {categoryLabels[c]?.label ?? c}
                    </Badge>
                  ))}
                  {message.rationale ? (
                    <span className="text-xs italic text-muted-foreground">{message.rationale}</span>
                  ) : null}
                </div>
              ) : null}
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}

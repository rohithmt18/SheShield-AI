import { useEffect, useState } from 'react';
import { ShieldCheck, ShieldOff, Loader2 } from 'lucide-react';
import { shield } from '@/lib/shieldClient';
import { cn } from '@/lib/utils';

/**
 * Banner reporting which SheShield engine is actually screening this feed.
 *
 * Deliberately three-state. If the backend has not answered yet, it says so
 * rather than defaulting to "offline" — claiming the AI is off when it is
 * merely waking would undermine trust in every green badge below it.
 */
export function ShieldNotice() {
  const [state, setState] = useState({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    const backoff = [0, 2000, 4000, 8000, 15000, 25000];

    (async () => {
      for (let i = 0; i < backoff.length; i += 1) {
        if (cancelled) return;
        if (backoff[i]) await new Promise((r) => setTimeout(r, backoff[i]));
        if (cancelled) return;
        try {
          const [meta] = await Promise.all([shield.meta(), shield.startSession()]);
          if (!cancelled) setState({ status: 'ready', ...meta });
          return;
        } catch (err) {
          if (i === backoff.length - 1 && !cancelled) setState({ status: 'error', error: err.message });
        }
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const map = {
    loading: {
      icon: Loader2,
      text: 'Connecting to SheShield AI…',
      cls: 'border-border text-muted-foreground',
      spin: true,
    },
    error: {
      icon: ShieldOff,
      text: 'SheShield AI is unreachable — content is not being screened.',
      cls: 'border-risk-high/40 bg-risk-high/10 text-risk-high',
    },
    ready: state.aiEnabled
      ? {
        icon: ShieldCheck,
        text: `Every post, comment, and message is screened by SheShield AI (${state.aiEngine}).`,
        cls: 'border-risk-safe/35 bg-risk-safe/10 text-risk-safe',
      }
      : {
        icon: ShieldCheck,
        text: 'Screening with SheShield’s offline engine — more literal, can miss subtler cases.',
        cls: 'border-risk-suspicious/35 bg-risk-suspicious/10 text-risk-suspicious',
      },
  };

  const view = map[state.status];
  const Icon = view.icon;

  return (
    <div className={cn('flex items-center gap-2 rounded-lg border px-3 py-2 text-xs', view.cls)}>
      <Icon className={cn('size-3.5 shrink-0', view.spin && 'animate-spin')} />
      {view.text}
    </div>
  );
}

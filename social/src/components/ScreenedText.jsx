import { useEffect, useState } from 'react';
import { Eye } from 'lucide-react';
import { useVerdict, useScreen, useRescreen } from '@/lib/useModeration';
import { shouldHide } from '@/lib/riskModel';
import { RiskBadge } from './RiskBadge';
import { AiWarning } from './AiWarning';
import { cn } from '@/lib/utils';

/**
 * Any user-authored text, screened and annotated.
 *
 * One component for captions, comments, replies, and messages, so the safety
 * treatment cannot drift between them — a threat in a caption is displayed
 * exactly like a threat in a DM.
 *
 * High and critical content is collapsed behind a click. Not censorship: the
 * text is one tap away and never removed, because it is evidence. It is there
 * so a woman scrolling her own feed is not ambushed by the worst message
 * someone sent her.
 */
export function ScreenedText({ item, className, textClassName, showBadge = true, compact = false }) {
  const { verdict, status } = useVerdict(item.id);
  const screen = useScreen();
  const rescreen = useRescreen();
  const [revealed, setRevealed] = useState(false);

  useEffect(() => { screen(item); }, [item, screen]);

  const hidden = shouldHide(verdict?.risk ? { id: verdict.risk } : null) && !revealed;
  const scanning = status === 'queued' || status === 'running';

  return (
    <div className={cn('relative', className)}>
      <div className={cn('relative overflow-hidden rounded-md', scanning && 'scanning')}>
        <p
          className={cn(
            'whitespace-pre-wrap break-words text-sm leading-relaxed transition-all',
            hidden && 'select-none blur-[6px]',
            textClassName,
          )}
        >
          {item.text}
        </p>

        {hidden ? (
          <button
            type="button"
            onClick={() => setRevealed(true)}
            className="absolute inset-0 flex items-center justify-center gap-1.5 rounded-md
                       bg-background/40 text-[11px] font-semibold backdrop-blur-[2px]"
          >
            <Eye className="size-3.5" />
            Hidden by SheShield — tap to view
          </button>
        ) : null}
      </div>

      {showBadge ? (
        <div className="mt-1.5 flex items-center gap-2">
          <RiskBadge verdict={verdict} status={status} showScore={!compact} />
        </div>
      ) : null}

      <AiWarning verdict={verdict} onRescreen={() => rescreen(item)} />
    </div>
  );
}

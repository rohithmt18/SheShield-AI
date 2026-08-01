import { useEffect, useCallback } from 'react';
import { LogOut } from 'lucide-react';
import { clearSessionId } from '@/lib/api';

/**
 * Escape hatch for someone whose screen might be looked at.
 *
 * Pressing Escape three times, or clicking the button, wipes the local session
 * handle and replaces the current history entry with a neutral page — so the
 * back button does not return here.
 *
 * This clears the browser side only. The server copy expires on its own, and
 * "Delete everything" on the dashboard removes it immediately.
 */
export function QuickExit() {
  const escape = useCallback(() => {
    clearSessionId();
    try { sessionStorage.clear(); } catch { /* private mode */ }
    window.location.replace('https://www.google.com/search?q=weather+today');
  }, []);

  useEffect(() => {
    let taps = 0;
    let timer;
    const onKey = (event) => {
      if (event.key !== 'Escape') return;
      taps += 1;
      clearTimeout(timer);
      if (taps >= 3) escape();
      timer = setTimeout(() => { taps = 0; }, 1200);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      clearTimeout(timer);
    };
  }, [escape]);

  return (
    <button
      type="button"
      onClick={escape}
      title="Leave this site immediately (or press Escape three times)"
      className="inline-flex items-center gap-1.5 rounded-md border border-destructive/40 bg-destructive/10
                 px-2.5 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/20"
    >
      <LogOut className="size-3.5" />
      Quick exit
    </button>
  );
}

import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { api } from './api';

const AppContext = createContext(null);

/**
 * Holds reference data (categories, helplines, regions) and the current
 * session. Fetched once on mount so pages render without a waterfall.
 */
export function AppProvider({ children }) {
  const [meta, setMeta] = useState(null);
  const [session, setSession] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const full = await api.getSession();
      setSession(full);
      return full;
    } catch {
      // A 404 means the session expired or was deleted — start clean.
      setSession(null);
      return null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

    (async () => {
      // A free-tier host sleeps when idle and can take the better part of a
      // minute to wake. One failed attempt used to leave the app permanently
      // convinced the AI was unavailable, so keep trying across that window.
      const backoff = [0, 2000, 4000, 8000, 15000, 25000];

      for (let attempt = 0; attempt < backoff.length; attempt += 1) {
        if (cancelled) return;
        if (backoff[attempt]) await sleep(backoff[attempt]);
        if (cancelled) return;

        try {
          const [metaData] = await Promise.all([api.meta(), api.startSession()]);
          if (cancelled) return;
          setMeta(metaData);
          await refresh();
          setError(null);
          setStatus('ready');
          return;
        } catch (err) {
          if (cancelled) return;
          setError(err.message);
          // Keep status at 'loading' while retries remain, so the UI says
          // "connecting" rather than claiming the AI is switched off.
          if (attempt === backoff.length - 1) setStatus('error');
        }
      }
    })();

    return () => { cancelled = true; };
  }, [refresh]);

  const value = useMemo(() => ({
    meta,
    session,
    status,
    error,
    refresh,
    setSession,
    categories: meta?.categories ?? {},
    regions: meta?.regions ?? [],
    aiEnabled: meta?.aiEnabled ?? false,
    aiEngine: meta?.aiEngine ?? 'heuristic',
    latestAnalysis: session?.analyses?.at(-1) ?? null,
  }), [meta, session, status, error, refresh]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>.');
  return ctx;
}

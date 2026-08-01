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
    (async () => {
      try {
        const [metaData] = await Promise.all([api.meta(), api.startSession()]);
        if (cancelled) return;
        setMeta(metaData);
        await refresh();
        setStatus('ready');
      } catch (err) {
        if (cancelled) return;
        setError(err.message);
        setStatus('error');
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

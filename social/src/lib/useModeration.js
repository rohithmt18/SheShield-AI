import { useSyncExternalStore, useCallback } from 'react';
import { subscribe, getVerdict, getStatus, allVerdicts, pendingCount, screen, rescreen } from './moderation';

/**
 * React bindings for the screening pipeline.
 *
 * useSyncExternalStore rather than local state, because the queue lives outside
 * React: content is screened once at creation, and any number of mounted
 * components may be showing the same verdict.
 */

export function useVerdict(contentId) {
  const verdict = useSyncExternalStore(
    subscribe,
    () => getVerdict(contentId),
    () => null,
  );
  const status = useSyncExternalStore(
    subscribe,
    () => getStatus(contentId),
    () => 'idle',
  );
  return { verdict, status };
}

export function useAllVerdicts() {
  return useSyncExternalStore(subscribe, allVerdicts, () => []);
}

export function usePendingCount() {
  return useSyncExternalStore(subscribe, pendingCount, () => 0);
}

/** Queues an item for screening; safe to call repeatedly (it dedupes). */
export function useScreen() {
  return useCallback((item) => screen(item), []);
}

export function useRescreen() {
  return useCallback((item) => rescreen(item), []);
}

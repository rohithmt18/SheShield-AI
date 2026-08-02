import { shield, ShieldError } from './shieldClient';
import { riskFromLevel } from './riskModel';

/**
 * Screening pipeline: one queue, one request at a time, results cached.
 *
 * SheShield rate-limits the analysis endpoint to 20 requests per minute, which
 * a feed will exceed the moment someone scrolls. Firing a request per rendered
 * comment would spend the whole allowance on content that was already screened
 * when it was written. So:
 *
 *   - every piece of content is screened exactly once, at creation
 *   - verdicts are cached by content id and survive a reload
 *   - the queue runs serially and backs off when the limiter says to
 *
 * Nothing here is Instagram-specific. It takes a `{ id, author, text }` item
 * and returns a verdict, which is what makes adding X or YouTube a matter of
 * writing an adapter rather than touching this file.
 */

const CACHE_KEY = 'vibe.verdicts';
const listeners = new Set();

/** contentId -> verdict */
const cache = new Map();
/** contentId -> 'queued' | 'running' */
const inFlight = new Map();

const queue = [];
let draining = false;
/** Epoch ms before which we must not call the API again. */
let cooldownUntil = 0;

(function hydrate() {
  try {
    const stored = JSON.parse(localStorage.getItem(CACHE_KEY) ?? '{}');
    for (const [id, verdict] of Object.entries(stored)) cache.set(id, verdict);
  } catch { /* corrupt or unavailable — start empty */ }
})();

function persist() {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(cache)));
  } catch { /* quota or private mode — cache stays in memory only */ }
}

function emit() {
  for (const fn of listeners) fn();
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export const getVerdict = (contentId) => cache.get(contentId) ?? null;
export const getStatus = (contentId) => (cache.has(contentId) ? 'done' : inFlight.get(contentId) ?? 'idle');

/** Everything screened so far, newest first — the Safety Dashboard's source. */
export function allVerdicts() {
  return [...cache.values()].sort((a, b) => (b.at ?? 0) - (a.at ?? 0));
}

export function pendingCount() {
  return queue.length + (draining ? 1 : 0);
}

/** Shapes a SheShield analysis into what the feed needs to render. */
function toVerdict(item, analysis) {
  const message = analysis.messages?.[0];
  // For a single-message submission the per-message score is the precise one;
  // the conversation-level score is the fallback for threads.
  const score = message?.severity ?? analysis.overallSeverity ?? 0;
  const level = message?.level ?? analysis.level ?? 'none';

  return {
    contentId: item.id,
    analysisId: analysis.id,
    platform: item.platform,
    kind: item.kind,
    author: item.author,
    excerpt: item.text.slice(0, 240),
    at: Date.now(),
    score,
    level,
    risk: riskFromLevel(level).id,
    engine: analysis.engine,
    degraded: analysis.degraded ?? null,
    categories: (message?.categories?.length ? message.categories : analysis.categories ?? [])
      .filter((c) => c && c !== 'none'),
    rationale: message?.rationale || '',
    summary: analysis.summary ?? '',
    recommendedActions: analysis.recommendedActions ?? [],
    resources: analysis.resources ?? null,
  };
}

async function runOne(item) {
  const analysis = item.thread
    ? (await shield.analyzeThread({ messages: item.thread, platform: item.platform })).analysis
    : (await shield.analyze({ author: item.author, text: item.text, platform: item.platform })).analysis;

  const verdict = toVerdict(item, analysis);
  cache.set(item.id, verdict);
  persist();
  return verdict;
}

async function drain() {
  if (draining) return;
  draining = true;

  while (queue.length) {
    const wait = cooldownUntil - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));

    const item = queue.shift();
    if (cache.has(item.id)) { inFlight.delete(item.id); continue; }

    inFlight.set(item.id, 'running');
    emit();

    try {
      await runOne(item);
      inFlight.delete(item.id);
    } catch (err) {
      if (err instanceof ShieldError && err.status === 429) {
        // Put it back and wait out the window rather than burning retries.
        cooldownUntil = Date.now() + (err.retryAfter ?? 30) * 1000;
        queue.unshift(item);
        inFlight.set(item.id, 'queued');
      } else {
        // A screening failure must not look like a clean result. Record it as
        // unknown so the UI can say "not screened" instead of implying safe.
        cache.set(item.id, {
          contentId: item.id,
          platform: item.platform,
          kind: item.kind,
          author: item.author,
          excerpt: item.text.slice(0, 240),
          at: Date.now(),
          failed: true,
          error: err.message,
          risk: null,
          categories: [],
        });
        persist();
        inFlight.delete(item.id);
      }
    }
    emit();
  }

  draining = false;
  emit();
}

/**
 * Queue a piece of content for screening.
 * @param {{id:string, author:string, text:string, kind:string, platform:string, thread?:object[]}} item
 */
export function screen(item) {
  if (!item?.text?.trim()) return;
  if (cache.has(item.id) || inFlight.has(item.id)) return;

  inFlight.set(item.id, 'queued');
  queue.push(item);
  emit();
  drain();
}

/** Re-screen something that previously failed. */
export function rescreen(item) {
  cache.delete(item.id);
  inFlight.delete(item.id);
  persist();
  screen(item);
}

export function clearVerdicts() {
  cache.clear();
  inFlight.clear();
  queue.length = 0;
  persist();
  emit();
}

import { randomUUID } from 'node:crypto';
import { levelFor, CATEGORY_KEYS } from './taxonomy.js';

/**
 * Document shapes for SheShield AI.
 *
 * Sessions are deliberately anonymous: no user id, no email, no IP, no
 * device fingerprint. The session id is the only handle, lives in the
 * browser's sessionStorage, and expires.
 */

const rand = () => randomUUID().replace(/-/g, '').slice(0, 12);

export const newSessionId = () => `ss_${rand()}`;
export const newAnalysisId = () => `an_${rand()}`;

/** Human-readable reference code for incident tracking. */
export function newReferenceCode(date = new Date()) {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let tail = '';
  for (let i = 0; i < 6; i += 1) tail += chars[Math.floor(Math.random() * chars.length)];
  return `SS-${date.getFullYear()}-${tail}`;
}

export function createSession(id = newSessionId()) {
  const now = new Date().toISOString();
  return {
    id,
    createdAt: now,
    updatedAt: now,
    analyses: [],
    chat: [],
    triage: null,
    report: null,
  };
}

const str = (v, max = 4000) => (typeof v === 'string' ? v.slice(0, max) : '');
const int = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(Number(v) || 0)));
const arr = (v) => (Array.isArray(v) ? v : []);
const cats = (v) => arr(v).filter((c) => CATEGORY_KEYS.includes(c));

/**
 * Coerces AI or heuristic output into the stored shape. Anything the
 * classifier got wrong — out-of-range score, unknown category, missing
 * entry — is corrected here rather than reaching the UI.
 */
export function normaliseAnalysis(raw, { messages, sourceLabel, engine }) {
  const perMessage = new Map(arr(raw.messages).map((m) => [Number(m.index), m]));

  const scored = messages.map((msg, index) => {
    const hit = perMessage.get(index) ?? {};
    const severity = int(hit.severity, 0, 100);
    const flagged = Boolean(hit.flagged) && severity >= 20;
    return {
      index,
      sender: str(msg.sender, 80) || 'unknown',
      text: str(msg.text, 2000),
      timestamp: str(msg.timestamp, 80) || null,
      flagged,
      severity: flagged ? severity : Math.min(severity, 19),
      level: levelFor(flagged ? severity : 0),
      categories: flagged ? cats(hit.categories) : [],
      rationale: flagged ? str(hit.rationale, 400) : '',
    };
  });

  const overallSeverity = int(raw.overallSeverity, 0, 100);
  const primary = CATEGORY_KEYS.includes(raw.primaryCategory) ? raw.primaryCategory : 'none';

  return {
    id: newAnalysisId(),
    createdAt: new Date().toISOString(),
    engine: ['gemini', 'groq'].includes(engine) ? engine : 'heuristic',
    sourceLabel: str(sourceLabel, 80) || null,
    messageCount: scored.length,
    overallSeverity,
    level: levelFor(overallSeverity),
    primaryCategory: primary,
    categories: cats(raw.categories).length ? cats(raw.categories) : [primary],
    summary: str(raw.summary, 1500),
    escalating: Boolean(raw.escalating),
    patterns: arr(raw.patterns)
      .slice(0, 8)
      .map((p) => ({ name: str(p?.name, 120), evidence: str(p?.evidence, 400) }))
      .filter((p) => p.name),
    recommendedActions: arr(raw.recommendedActions).slice(0, 6).map((a) => str(a, 300)).filter(Boolean),
    messages: scored,
  };
}

/** Compact form passed to the report generator — flagged excerpts only. */
export function analysisDigest(analysis) {
  return {
    createdAt: analysis.createdAt,
    sourceLabel: analysis.sourceLabel,
    messageCount: analysis.messageCount,
    overallSeverity: analysis.overallSeverity,
    level: analysis.level,
    categories: analysis.categories,
    escalating: analysis.escalating,
    summary: analysis.summary,
    patterns: analysis.patterns,
    flaggedExcerpts: analysis.messages
      .filter((m) => m.flagged)
      .slice(0, 25)
      .map((m) => ({ sender: m.sender, severity: m.severity, text: m.text.slice(0, 300) })),
  };
}

export function normaliseChatTurn(role, content) {
  return {
    role: role === 'assistant' ? 'assistant' : 'user',
    content: str(content, 6000),
    at: new Date().toISOString(),
  };
}

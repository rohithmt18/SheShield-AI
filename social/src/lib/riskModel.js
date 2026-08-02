/**
 * Translates SheShield's severity model into the four badges this app shows.
 *
 * SheShield grades on five levels (none · low · medium · high · critical); the
 * feed shows four (Safe · Suspicious · High Risk · Critical). The collapse
 * happens here and nowhere else, so the backend keeps its own vocabulary and
 * a future platform client can choose a different presentation without
 * anything upstream changing.
 *
 * Deliberately one-directional: low and medium both surface as "Suspicious",
 * but the numeric score is always shown alongside, so nuance is visible
 * without inventing a badge nobody asked for.
 */

export const RISK = {
  safe: {
    id: 'safe',
    label: 'Safe',
    blurb: 'Nothing here matched a known harm pattern.',
    tone: 'text-risk-safe',
    bg: 'bg-risk-safe/12',
    border: 'border-risk-safe/35',
    dot: 'bg-risk-safe',
  },
  suspicious: {
    id: 'suspicious',
    label: 'Suspicious',
    blurb: 'Something here is worth a second look.',
    tone: 'text-risk-suspicious',
    bg: 'bg-risk-suspicious/12',
    border: 'border-risk-suspicious/35',
    dot: 'bg-risk-suspicious',
  },
  high: {
    id: 'high',
    label: 'High Risk',
    blurb: 'Targeted or sustained harm. Preserve this before you block.',
    tone: 'text-risk-high',
    bg: 'bg-risk-high/12',
    border: 'border-risk-high/40',
    dot: 'bg-risk-high',
  },
  critical: {
    id: 'critical',
    label: 'Critical',
    blurb: 'Treat as urgent. Do not engage, and keep everything.',
    tone: 'text-risk-critical',
    bg: 'bg-risk-critical/15',
    border: 'border-risk-critical/45',
    dot: 'bg-risk-critical',
  },
};

/** SheShield level -> badge id. */
const FROM_LEVEL = {
  none: 'safe',
  low: 'suspicious',
  medium: 'suspicious',
  high: 'high',
  critical: 'critical',
};

export function riskFromLevel(level) {
  return RISK[FROM_LEVEL[level] ?? 'safe'];
}

/** Fallback for the rare case a score arrives without a level. */
export function riskFromScore(score = 0) {
  if (score >= 85) return RISK.critical;
  if (score >= 65) return RISK.high;
  if (score >= 20) return RISK.suspicious;
  return RISK.safe;
}

/** Anything above "Safe" gets a visible warning attached to the content. */
export const needsWarning = (risk) => risk && risk.id !== 'safe';

/** Content this severe is collapsed behind a click rather than shown outright. */
export const shouldHide = (risk) => risk?.id === 'high' || risk?.id === 'critical';

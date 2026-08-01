/**
 * Shared incident taxonomy for SheShield AI.
 * The Gemini schema, the offline heuristic engine, and the resource router
 * all key off these exact strings.
 */
export const CATEGORIES = {
  harassment: {
    label: 'Harassment & abuse',
    blurb: 'Repeated insults, demeaning language, pile-ons, or sustained unwanted contact.',
  },
  sexual_harassment: {
    label: 'Sexual harassment',
    blurb: 'Unwanted sexual comments, requests, or explicit content sent without consent.',
  },
  threat_of_violence: {
    label: 'Threats',
    blurb: 'Direct or veiled threats of physical, sexual, or reputational harm.',
  },
  stalking: {
    label: 'Cyberstalking',
    blurb: 'Monitoring, tracking, showing up, or contacting repeatedly after being asked to stop.',
  },
  grooming: {
    label: 'Grooming',
    blurb: 'Trust-building, isolation, and boundary-testing aimed at exploitation.',
  },
  doxxing: {
    label: 'Doxxing',
    blurb: 'Publishing or threatening to publish private details — address, workplace, phone, family.',
  },
  sextortion: {
    label: 'Sextortion / blackmail',
    blurb: 'Demanding money, images, or compliance under threat of exposure.',
  },
  non_consensual_imagery: {
    label: 'Non-consensual imagery',
    blurb: 'Intimate images shared, threatened, or synthesised (deepfakes) without consent.',
  },
  impersonation: {
    label: 'Impersonation',
    blurb: 'Fake profiles or accounts using your name, photos, or identity.',
  },
  hate_speech: {
    label: 'Hate speech',
    blurb: 'Attacks based on gender, caste, religion, disability, or other identity.',
  },
  financial_scam: {
    label: 'Financial exploitation',
    blurb: 'Romance scams, investment bait, or manipulation toward money transfer.',
  },
  none: {
    label: 'No abuse detected',
    blurb: 'Nothing in this content matched a known harm pattern.',
  },
};

export const CATEGORY_KEYS = Object.keys(CATEGORIES);

export const LEVELS = ['none', 'low', 'medium', 'high', 'critical'];

/** Maps a 0-100 severity score to a named level. */
export function levelFor(score) {
  if (score >= 85) return 'critical';
  if (score >= 65) return 'high';
  if (score >= 40) return 'medium';
  if (score >= 20) return 'low';
  return 'none';
}

export const LEVEL_META = {
  none: { label: 'Safe', advice: 'Nothing here needs action right now.' },
  low: { label: 'Low', advice: 'Worth documenting in case it continues.' },
  medium: { label: 'Medium', advice: 'Save evidence now and consider blocking or reporting.' },
  high: { label: 'High', advice: 'Preserve evidence and report — do not engage further.' },
  critical: {
    label: 'Critical',
    advice: 'Treat as urgent. Contact 1930 or 112 and preserve everything.',
  },
};

export function categoryLabel(key) {
  return CATEGORIES[key]?.label ?? key;
}

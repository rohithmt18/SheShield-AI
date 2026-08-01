import { analysisDigest, newReferenceCode, categoryLabel, LEVEL_META } from '@sheshieldai/database';
import { generateReportWithGemini, geminiAvailable } from '../providers/gemini.js';
import { resourcesFor } from './resources.js';

/**
 * Builds the incident report a complainant can attach to a cybercrime
 * complaint. Gemini writes the prose when available; the offline builder
 * produces the same structure from the analysis alone, so a report is always
 * downloadable.
 *
 * Nothing here invents facts. Details the complainant did not supply come out
 * as "[not provided]" rather than being guessed.
 */

const NOT_GIVEN = '[not provided]';
const val = (v) => {
  const s = typeof v === 'string' ? v.trim() : '';
  return s ? s.slice(0, 300) : NOT_GIVEN;
};

export function sanitiseDetails(raw = {}) {
  return {
    platform: val(raw.platform),
    offenderHandle: val(raw.offenderHandle),
    relationship: val(raw.relationship),
    firstIncident: val(raw.firstIncident),
    latestIncident: val(raw.latestIncident),
    reportedBefore: val(raw.reportedBefore),
    region: typeof raw.region === 'string' ? raw.region.trim().slice(0, 40) : '',
    extraContext: typeof raw.extraContext === 'string' ? raw.extraContext.trim().slice(0, 2000) : '',
  };
}

/** Deterministic report — no model, no network. */
function offlineReport(analysis, details) {
  const digest = analysisDigest(analysis);
  const flagged = analysis.messages.filter((m) => m.flagged);
  const levelLabel = LEVEL_META[analysis.level]?.label ?? analysis.level;
  const categories = analysis.categories
    .filter((c) => c !== 'none')
    .map((c) => categoryLabel(c));

  return {
    title: `Incident Report — ${categories[0] ?? 'Online harassment'}`,

    summary: `The complainant received ${analysis.messageCount} message(s) via ${details.platform} `
      + `from ${details.offenderHandle}. Automated analysis flagged ${flagged.length} message(s) as `
      + `harmful, with an overall severity of ${analysis.overallSeverity}/100 (${levelLabel}). `
      + `The conduct is characterised as: ${categories.join(', ') || 'unclassified'}.`
      + (analysis.escalating ? ' The severity of the messages increases over the course of the exchange.' : ''),

    incidentNature: categories.length
      ? categories.join(', ')
      : 'No category could be determined from the material supplied.',

    timeline: [
      { when: details.firstIncident, what: 'First incident reported by the complainant.' },
      { when: details.latestIncident, what: 'Most recent incident reported by the complainant.' },
      {
        when: new Date(analysis.createdAt).toISOString().slice(0, 10),
        what: `Material submitted for automated analysis (engine: ${analysis.engine}).`,
      },
    ],

    evidence: flagged.slice(0, 25).map((m) => ({
      reference: `Message [${m.index}]${m.timestamp ? ` — ${m.timestamp}` : ''}`,
      excerpt: m.text.slice(0, 300),
      significance: `${m.rationale || 'Flagged by automated analysis.'} `
        + `Severity ${m.severity}/100. Category: ${m.categories.map(categoryLabel).join(', ') || 'unclassified'}.`,
    })),

    legalContext: buildLegalContext(analysis.categories),

    requestedAction: [
      `Registration of a complaint and investigation into the conduct described above.`,
      `Preservation of account data and message logs associated with ${details.offenderHandle} on ${details.platform}.`,
      'Directions to the platform for removal of the offending content and suspension of the account.',
      ...(analysis.categories.includes('non_consensual_imagery') || analysis.categories.includes('sextortion')
        ? ['Urgent directions for the takedown of any intimate imagery, and prevention of further circulation.']
        : []),
    ],

    nextSteps: [
      'Retain original, unedited screenshots and any device backups of the material.',
      'File the complaint at cybercrime.gov.in, or in person at the nearest cyber crime cell.',
      'Carry photo identification and a printed copy of this report when filing in person.',
      'Note the acknowledgement or complaint number issued, and retain it for follow-up.',
    ],

    _digest: digest,
  };
}

/** Provisions commonly cited for each category. Informational, not advice. */
function buildLegalContext(categories) {
  const map = {
    threat_of_violence: 'Criminal intimidation — BNS s.351 (previously IPC s.503/506).',
    stalking: 'Stalking, including monitoring a woman’s use of the internet — BNS s.78 (previously IPC s.354D).',
    sexual_harassment: 'Sexual harassment, including unwelcome sexual advances or demands — BNS s.75 (previously IPC s.354A).',
    non_consensual_imagery: 'Violation of privacy by capturing or publishing images of a private area — IT Act s.66E; publishing obscene or sexually explicit material — IT Act s.67/67A.',
    sextortion: 'Extortion — BNS s.308 (previously IPC s.383/384); IT Act s.66E and s.67A where imagery is involved.',
    doxxing: 'Identity theft and misuse of personal data — IT Act s.66C; criminal intimidation — BNS s.351.',
    impersonation: 'Cheating by personation using a computer resource — IT Act s.66D.',
    hate_speech: 'Promoting enmity between groups — BNS s.196 (previously IPC s.153A); statements conducing to public mischief — BNS s.353.',
    grooming: 'Where the complainant is a minor, offences under the POCSO Act, 2012, including s.11/12 (sexual harassment) and s.13 (use of a child for pornographic purposes).',
    financial_scam: 'Cheating — BNS s.318 (previously IPC s.420); fraud using a computer resource — IT Act s.66D.',
    harassment: 'Insulting the modesty of a woman — BNS s.79 (previously IPC s.509); offences relating to obscene material — IT Act s.67.',
  };

  const cited = categories.filter((c) => map[c]).map((c) => map[c]);
  return [
    ...(cited.length ? cited : [map.harassment]),
    'This list is informational only and is not legal advice. A lawyer or a legal aid organisation should be consulted for advice specific to these facts.',
  ];
}

/**
 * @param {object} analysis a stored, normalised analysis
 * @param {object} rawDetails complainant-supplied context
 */
export async function buildReport(analysis, rawDetails = {}) {
  const details = sanitiseDetails(rawDetails);
  let body;
  let engine = 'offline';
  let degraded = null;

  if (geminiAvailable()) {
    try {
      body = await generateReportWithGemini(analysisDigest(analysis), details);
      engine = 'gemini';
    } catch (err) {
      degraded = err.message;
      console.warn(`[report] Gemini failed, using offline builder — ${err.message}`);
    }
  } else {
    degraded = 'No Gemini API key configured.';
  }

  body ??= offlineReport(analysis, details);
  delete body._digest;

  return {
    reference: newReferenceCode(),
    createdAt: new Date().toISOString(),
    engine,
    ...(degraded ? { degraded } : {}),
    analysisId: analysis.id,
    severity: analysis.overallSeverity,
    level: analysis.level,
    categories: analysis.categories,
    details,
    ...body,
    resources: resourcesFor(analysis.categories, analysis.level, details.region),
  };
}

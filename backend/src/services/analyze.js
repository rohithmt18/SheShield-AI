import { normaliseAnalysis } from '@sheshieldai/database';
import { aiAvailable, aiEngine, analyseWithAI } from '../providers/index.js';
import { analyseHeuristically } from '../providers/heuristic.js';
import { resourcesFor } from './resources.js';

/**
 * Any message the model did not return an entry for is scored offline instead.
 *
 * Models truncate. Asked to score 80 messages, one can close its JSON after 32
 * and still return something perfectly well-formed. Left alone, the remaining
 * 48 would normalise to severity 0 and be shown as safe — and the newest
 * messages, which sit at the end of a conversation and are usually the worst,
 * are exactly the ones lost. Silently telling a woman that a threat is safe is
 * the most dangerous thing this app could do, so gaps get filled rather than
 * trusted.
 *
 * @returns {number} how many messages the model failed to score
 */
export function fillUnscoredMessages(raw, messages) {
  const scored = new Set(
    (Array.isArray(raw.messages) ? raw.messages : [])
      .map((m) => Number(m?.index))
      .filter((i) => Number.isInteger(i) && i >= 0 && i < messages.length),
  );

  const missing = messages.map((_, i) => i).filter((i) => !scored.has(i));
  if (!missing.length) return 0;

  const offline = analyseHeuristically(messages);
  const filled = missing.map((i) => offline.messages[i]);

  raw.messages = [...(Array.isArray(raw.messages) ? raw.messages : []), ...filled];

  // The model's overall score only reflects what it actually read, so it can
  // sit below a threat it never reached.
  const worst = filled.reduce((max, m) => Math.max(max, m.severity), 0);
  raw.overallSeverity = Math.max(Number(raw.overallSeverity) || 0, worst);

  const categories = new Set([
    ...(Array.isArray(raw.categories) ? raw.categories : []),
    ...filled.flatMap((m) => m.categories ?? []),
  ]);
  categories.delete('none');
  if (categories.size) raw.categories = [...categories];

  return missing.length;
}

/**
 * Runs an analysis, preferring the configured AI provider and degrading to the
 * offline engine.
 *
 * A degraded result is still a result — the user is told which engine ran, but
 * never blocked. `normaliseAnalysis` sanitises whichever raw output arrives.
 */
export async function analyseMessages(messages, { sourceLabel, region, source = null } = {}) {
  let raw;
  let engine = 'heuristic';
  let degraded = null;

  if (aiAvailable()) {
    try {
      raw = await analyseWithAI(messages, { sourceLabel });
      engine = aiEngine();
    } catch (err) {
      degraded = err.message;
      console.warn(`[analyze] ${aiEngine()} failed, using offline engine — ${err.message}`);
    }
  } else {
    degraded = 'No AI provider configured.';
  }

  raw ??= analyseHeuristically(messages);

  if (engine !== 'heuristic') {
    const unscored = fillUnscoredMessages(raw, messages);
    if (unscored === messages.length) {
      // The model replied, but scored nothing — well-formed JSON with an empty
      // or unusable messages array. Every score on screen came from the offline
      // engine, so labelling the result "Groq analysis" would credit an
      // assessment that never happened.
      engine = 'heuristic';
      degraded = 'The AI returned no usable assessment, so every message was scored by the offline engine.';
      console.warn(`[analyze] ${aiEngine()} scored 0 of ${messages.length} messages; treating as offline.`);
    } else if (unscored) {
      degraded = `The AI assessed ${messages.length - unscored} of ${messages.length} messages; `
        + 'the rest were scored by the offline engine.';
      console.warn(`[analyze] ${engine} returned ${unscored} unscored message(s); filled offline.`);
    }
  }

  const analysis = normaliseAnalysis(raw, { messages, sourceLabel, engine });
  analysis.resources = resourcesFor(analysis.categories, analysis.level, region);
  if (degraded) analysis.degraded = degraded;
  // How the text was obtained, when it wasn't typed. Attached after
  // normalisation like `resources` and `degraded`, because it is server-derived
  // provenance rather than model output needing to be distrusted. Deliberately
  // excludes the filename: device filenames identify people, and this app holds
  // nothing that does.
  if (source) analysis.source = source;

  return analysis;
}

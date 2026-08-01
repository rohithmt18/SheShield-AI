import { normaliseAnalysis } from '@sheshieldai/database';
import { analyseWithGemini, geminiAvailable } from '../providers/gemini.js';
import { analyseHeuristically } from '../providers/heuristic.js';
import { resourcesFor } from './resources.js';

/**
 * Runs an analysis, preferring Gemini and degrading to the offline engine.
 *
 * A degraded result is still a result — the user is told which engine ran, but
 * never blocked. `normaliseAnalysis` sanitises whichever raw output arrives.
 */
export async function analyseMessages(messages, { sourceLabel, region } = {}) {
  let raw;
  let engine = 'heuristic';
  let degraded = null;

  if (geminiAvailable()) {
    try {
      raw = await analyseWithGemini(messages, { sourceLabel });
      engine = 'gemini';
    } catch (err) {
      degraded = err.message;
      console.warn(`[analyze] Gemini failed, using offline engine — ${err.message}`);
    }
  } else {
    degraded = 'No Gemini API key configured.';
  }

  raw ??= analyseHeuristically(messages);

  const analysis = normaliseAnalysis(raw, { messages, sourceLabel, engine });
  analysis.resources = resourcesFor(analysis.categories, analysis.level, region);
  if (degraded) analysis.degraded = degraded;

  return analysis;
}

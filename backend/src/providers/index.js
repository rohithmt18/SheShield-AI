import { config } from '../config.js';
import * as groq from './groq.js';
import { analyseWithGemini, chatWithGemini, generateReportWithGemini, geminiAvailable } from './gemini.js';

/**
 * Single entry point for AI work, so services never import a vendor directly.
 *
 * Adding a provider means adding one entry here; the analysis, chat, and
 * report services stay untouched, and so does the offline fallback that runs
 * when no provider is configured or the configured one fails.
 */

const PROVIDERS = {
  groq: {
    label: 'Groq',
    available: groq.available,
    analyse: groq.analyse,
    chat: groq.chat,
    report: groq.report,
    model: () => config.groq.model,
  },
  gemini: {
    label: 'Gemini',
    available: geminiAvailable,
    analyse: analyseWithGemini,
    chat: chatWithGemini,
    report: generateReportWithGemini,
    model: () => config.gemini.model,
  },
};

/** The configured provider, or null when running offline. */
export function activeProvider() {
  const provider = PROVIDERS[config.aiProvider];
  return provider?.available() ? provider : null;
}

export const aiAvailable = () => activeProvider() !== null;

/** Engine identifier stored on analyses — 'groq', 'gemini', or 'heuristic'. */
export const aiEngine = () => (aiAvailable() ? config.aiProvider : 'heuristic');

/** Human-readable description for /health and startup logging. */
export function aiDescription() {
  const provider = activeProvider();
  return provider ? `${provider.label.toLowerCase()} (${provider.model()})` : 'offline engine (no API key)';
}

export const analyseWithAI = (messages, options) => activeProvider().analyse(messages, options);
export const chatWithAI = (history, message, context) => activeProvider().chat(history, message, context);
export const reportWithAI = (digest, details) => activeProvider().report(digest, details);

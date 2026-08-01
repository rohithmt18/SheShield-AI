import { GoogleGenAI, Type } from '@google/genai';
import { config } from '../config.js';
import { CATEGORY_KEYS } from '@sheshieldai/database/taxonomy';
import { NoCredentialsError, RefusalError } from './errors.js';
import { ANALYSIS_SYSTEM, CHAT_SYSTEM, REPORT_SYSTEM, buildTranscript } from './prompts.js';

/**
 * Gemini-backed analysis, companion chat, and report drafting.
 *
 * Every call here can fail (no key, quota, safety block). Callers are expected
 * to catch and fall back to the heuristic engine — a woman in the middle of
 * being harassed should never see an error page because a quota ran out.
 */

let client;
function ai() {
  if (!config.gemini.apiKey) throw new NoCredentialsError();
  client ??= new GoogleGenAI({ apiKey: config.gemini.apiKey });
  return client;
}

export const geminiAvailable = () => Boolean(config.gemini.apiKey);

/**
 * The content being analysed *is* harassment — that is the entire point. With
 * default thresholds Gemini refuses to process a victim's own evidence, so the
 * harm filters are disabled for these calls and the model is instructed to
 * treat the input strictly as evidence under review.
 */
const SAFETY = [
  'HARM_CATEGORY_HARASSMENT',
  'HARM_CATEGORY_HATE_SPEECH',
  'HARM_CATEGORY_SEXUALLY_EXPLICIT',
  'HARM_CATEGORY_DANGEROUS_CONTENT',
].map((category) => ({ category, threshold: 'BLOCK_NONE' }));

const analysisSchema = {
  type: Type.OBJECT,
  properties: {
    overallSeverity: { type: Type.INTEGER, description: '0-100 for the conversation as a whole' },
    primaryCategory: { type: Type.STRING, enum: CATEGORY_KEYS },
    categories: { type: Type.ARRAY, items: { type: Type.STRING, enum: CATEGORY_KEYS } },
    escalating: { type: Type.BOOLEAN, description: 'true if severity trends upward over time' },
    summary: { type: Type.STRING },
    patterns: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          evidence: { type: Type.STRING },
        },
        required: ['name', 'evidence'],
      },
    },
    recommendedActions: { type: Type.ARRAY, items: { type: Type.STRING } },
    messages: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          index: { type: Type.INTEGER, description: 'zero-based index of the message' },
          flagged: { type: Type.BOOLEAN },
          severity: { type: Type.INTEGER },
          categories: { type: Type.ARRAY, items: { type: Type.STRING, enum: CATEGORY_KEYS } },
          rationale: { type: Type.STRING, description: 'one short sentence' },
        },
        required: ['index', 'flagged', 'severity', 'categories', 'rationale'],
      },
    },
  },
  required: ['overallSeverity', 'primaryCategory', 'categories', 'escalating', 'summary',
    'patterns', 'recommendedActions', 'messages'],
};

/**
 * Gemini 3.x reasons before answering, and those thinking tokens are charged
 * against maxOutputTokens. Left at the default the model can spend the entire
 * budget thinking and return a truncated fragment, so keep it low for the
 * conversational path where depth buys little and latency costs a lot.
 *
 * thinkingLevel is Gemini 3+ only — thinkingBudget (2.5) is rejected with a
 * 400 — so it is omitted for anything older.
 */
function thinkingFor(model, level = 'low') {
  return /gemini-(?:[3-9]|\d{2,})/.test(model) ? { thinkingConfig: { thinkingLevel: level } } : {};
}

/** Unwraps a response, converting safety blocks into RefusalError. */
function textOf(response) {
  const blocked = response?.promptFeedback?.blockReason;
  if (blocked) throw new RefusalError(`Gemini blocked the request (${blocked}).`);

  const finish = response?.candidates?.[0]?.finishReason;
  if (finish && !['STOP', 'MAX_TOKENS'].includes(finish)) {
    throw new RefusalError(`Gemini stopped early (${finish}).`);
  }

  const text = response?.text;
  if (!text) throw new RefusalError('Gemini returned an empty response.');

  // A MAX_TOKENS stop that produced almost nothing means thinking consumed the
  // budget. Half a sentence of advice is worse than none — fail so the caller
  // falls back to the offline responder instead of showing a fragment.
  if (finish === 'MAX_TOKENS' && text.trim().length < 80) {
    throw new RefusalError('Gemini hit its token limit before producing a usable answer.');
  }
  return text;
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    // Structured output occasionally arrives fenced despite the mime type.
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]); } catch { /* fall through */ }
    }
    throw new RefusalError('Gemini returned malformed JSON.');
  }
}

/**
 * @param {{sender?: string, text: string, timestamp?: string}[]} messages
 * @returns raw analysis in the shape `normaliseAnalysis` consumes
 */
export async function analyseWithGemini(messages, { sourceLabel } = {}) {
  const transcript = buildTranscript(messages);

  const response = await ai().models.generateContent({
    model: config.gemini.model,
    contents: `Source: ${sourceLabel || 'unspecified'}\nMessage count: ${messages.length}\n\n`
      + `Conversation to assess:\n${transcript}\n\n`
      + 'Return one entry in "messages" for every index above, including the harmless ones.',
    config: {
      systemInstruction: ANALYSIS_SYSTEM,
      responseMimeType: 'application/json',
      responseSchema: analysisSchema,
      safetySettings: SAFETY,
      temperature: 0.2,
    },
  });

  return parseJson(textOf(response));
}

/**
 * @param {{role: 'user'|'assistant', content: string}[]} history
 * @param {string} message
 * @param {object|null} analysisContext compact digest of the user's last analysis
 */
export async function chatWithGemini(history, message, analysisContext = null) {
  const contents = history.map((turn) => ({
    role: turn.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: turn.content }],
  }));
  contents.push({ role: 'user', parts: [{ text: message }] });

  const context = analysisContext
    ? `\n\nContext from her most recent analysis (do not recite it back verbatim, just use it):\n`
      + `${JSON.stringify(analysisContext)}`
    : '';

  const response = await ai().models.generateContent({
    model: config.gemini.model,
    contents,
    config: {
      systemInstruction: CHAT_SYSTEM + context,
      safetySettings: SAFETY,
      temperature: 0.7,
      // Must cover thinking tokens as well as the reply itself.
      maxOutputTokens: 2048,
      ...thinkingFor(config.gemini.model),
    },
  });

  return textOf(response).trim();
}

const reportSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    summary: { type: Type.STRING, description: 'One paragraph, factual.' },
    incidentNature: { type: Type.STRING },
    timeline: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          when: { type: Type.STRING },
          what: { type: Type.STRING },
        },
        required: ['when', 'what'],
      },
    },
    evidence: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          reference: { type: Type.STRING, description: 'e.g. "Message [4]"' },
          excerpt: { type: Type.STRING },
          significance: { type: Type.STRING },
        },
        required: ['reference', 'excerpt', 'significance'],
      },
    },
    legalContext: { type: Type.ARRAY, items: { type: Type.STRING } },
    requestedAction: { type: Type.ARRAY, items: { type: Type.STRING } },
    nextSteps: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: ['title', 'summary', 'incidentNature', 'timeline', 'evidence', 'legalContext',
    'requestedAction', 'nextSteps'],
};

/**
 * @param {object} digest output of `analysisDigest`
 * @param {object} details complainant-supplied context (platform, handle, dates…)
 */
export async function generateReportWithGemini(digest, details = {}) {
  const response = await ai().models.generateContent({
    model: config.gemini.model,
    contents: `Analysis findings:\n${JSON.stringify(digest, null, 2)}\n\n`
      + `Details supplied by the complainant:\n${JSON.stringify(details, null, 2)}\n\n`
      + 'Draft the incident report. Use "[not provided]" for anything absent.',
    config: {
      systemInstruction: REPORT_SYSTEM,
      responseMimeType: 'application/json',
      responseSchema: reportSchema,
      safetySettings: SAFETY,
      temperature: 0.3,
    },
  });

  return parseJson(textOf(response));
}

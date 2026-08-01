import { config } from '../config.js';
import { NoCredentialsError, RefusalError } from './errors.js';
import {
  ANALYSIS_SYSTEM, CHAT_SYSTEM, REPORT_SYSTEM,
  ANALYSIS_JSON_SHAPE, REPORT_JSON_SHAPE, buildTranscript,
} from './prompts.js';

/**
 * Groq provider — OpenAI-compatible chat completions.
 *
 * No SDK: the surface used here is one POST, and Node 20+ has fetch. That
 * keeps the dependency list honest and makes the wire format inspectable when
 * something goes wrong at 2am.
 *
 * Groq's JSON mode guarantees syntactically valid JSON, not a correct *shape* —
 * unlike Gemini's responseSchema. The shape is requested in the prompt and then
 * enforced downstream by normaliseAnalysis, which was built to distrust its
 * input regardless of which model produced it.
 */

const ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

export const available = () => Boolean(config.groq.apiKey);

async function complete({ system, user, json = false, maxTokens = 4096, temperature = 0.3 }) {
  if (!available()) throw new NoCredentialsError('No Groq API key configured.');

  let response;
  try {
    response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${config.groq.apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: config.groq.model,
        messages: [
          { role: 'system', content: system },
          ...(Array.isArray(user) ? user : [{ role: 'user', content: user }]),
        ],
        temperature,
        max_tokens: maxTokens,
        ...(json ? { response_format: { type: 'json_object' } } : {}),
      }),
    });
  } catch (err) {
    throw new RefusalError(`Could not reach Groq (${err.message}).`);
  }

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const message = body?.error?.message ?? `HTTP ${response.status}`;
    throw new RefusalError(`Groq rejected the request: ${message}`);
  }

  const choice = body?.choices?.[0];
  const text = choice?.message?.content;
  if (!text || !text.trim()) throw new RefusalError('Groq returned an empty response.');

  // A reply cut off mid-sentence is worse than none — let the caller fall back.
  if (choice.finish_reason === 'length' && text.trim().length < 80) {
    throw new RefusalError('Groq hit its token limit before producing a usable answer.');
  }
  return text;
}

/** JSON mode still occasionally wraps output in prose or a code fence. */
function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenced) {
      try { return JSON.parse(fenced[1]); } catch { /* fall through */ }
    }
    const braced = text.match(/\{[\s\S]*\}/);
    if (braced) {
      try { return JSON.parse(braced[0]); } catch { /* fall through */ }
    }
    throw new RefusalError('Groq returned malformed JSON.');
  }
}

/**
 * @param {{sender?: string, text: string, timestamp?: string}[]} messages
 * @returns raw analysis in the shape `normaliseAnalysis` consumes
 */
export async function analyse(messages, { sourceLabel } = {}) {
  const text = await complete({
    system: `${ANALYSIS_SYSTEM}\n\n${ANALYSIS_JSON_SHAPE}`,
    user: `Source: ${sourceLabel || 'unspecified'}\nMessage count: ${messages.length}\n\n`
      + `Conversation to assess:\n${buildTranscript(messages)}\n\n`
      + 'Return the JSON assessment now.',
    json: true,
    temperature: 0.2,
    // Groq charges the *requested* budget against the tokens-per-minute quota,
    // so this scales with the message count rather than asking a flat 8k every
    // time and starving the next call on the free tier (12k TPM).
    //
    // The ceiling is deliberately generous. Running out of quota fails loudly
    // with a 429 and drops to the offline engine, which scores every message.
    // Running out of *output* tokens fails silently: the model closes the JSON
    // early and the messages it never reached look unflagged. Between the two,
    // the noisy failure is by far the safer one.
    maxTokens: Math.min(8192, 900 + messages.length * 110),
  });
  return parseJson(text);
}

/**
 * @param {{role: 'user'|'assistant', content: string}[]} history
 * @param {string} message
 * @param {object|null} analysisContext compact digest of her last analysis
 */
export async function chat(history, message, analysisContext = null) {
  const context = analysisContext
    ? '\n\nContext from her most recent analysis (do not recite it back verbatim, just use it):\n'
    + JSON.stringify(analysisContext)
    : '';

  const text = await complete({
    system: CHAT_SYSTEM + context,
    user: [
      ...history.map((turn) => ({
        role: turn.role === 'assistant' ? 'assistant' : 'user',
        content: turn.content,
      })),
      { role: 'user', content: message },
    ],
    temperature: 0.7,
    maxTokens: 1024,
  });
  return text.trim();
}

/**
 * @param {object} digest output of `analysisDigest`
 * @param {object} details complainant-supplied context
 */
export async function report(digest, details = {}) {
  const text = await complete({
    system: `${REPORT_SYSTEM}\n\n${REPORT_JSON_SHAPE}`,
    user: `Analysis findings:\n${JSON.stringify(digest, null, 2)}\n\n`
      + `Details supplied by the complainant:\n${JSON.stringify(details, null, 2)}\n\n`
      + 'Draft the incident report as JSON now.',
    json: true,
    temperature: 0.3,
    // The digest caps flagged excerpts at 25, so the report has a bounded size.
    maxTokens: 3072,
  });
  return parseJson(text);
}

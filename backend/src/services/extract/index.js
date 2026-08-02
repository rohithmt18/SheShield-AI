import * as ocr from './ocr.js';
import * as vision from './vision.js';

/**
 * Turns an image into text for the existing analysis pipeline.
 *
 * The pipeline is text-in: parse → score → store. Rather than teach it about
 * images, this reduces an image to the thing it already understands, so a
 * screenshot and a paste travel the identical path and produce the identical
 * stored shape. Nothing downstream of here knows an image was involved, beyond
 * one `source` field kept for provenance.
 *
 * Strategy order is deliberate: a configured vision model wins because it reads
 * chat screenshots far better than OCR does, and OCR is the floor that always
 * works — no key, no network, no quota. Adding a third extractor means adding
 * it to this list.
 */

const STRATEGIES = [vision, ocr];

/** The extractor that would run right now. */
export function activeExtractor() {
  return STRATEGIES.find((s) => s.available()) ?? ocr;
}

export const extractorLabel = () => activeExtractor().label;

export class NoTextFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NoTextFoundError';
    this.status = 422;
  }
}

/**
 * @param {Buffer} buffer validated image bytes
 * @param {string} mimeType type sniffed from the bytes themselves
 * @returns {Promise<{text: string, confidence: number|null, method: string, engine: string}>}
 */
export async function extractText(buffer, mimeType) {
  const extractor = activeExtractor();

  let result;
  try {
    result = await extractor.extract(buffer, mimeType);
  } catch (err) {
    // A vision model that is down must not take image analysis down with it —
    // OCR needs nothing external and can still read the screenshot.
    if (extractor !== ocr) {
      console.warn(`[extract] ${extractor.label} failed (${err.message}); falling back to OCR.`);
      result = await ocr.extract(buffer, mimeType);
    } else {
      throw err;
    }
  }

  if (!result.text.trim()) {
    throw new NoTextFoundError(
      'No readable text was found in that image. If it is a screenshot of a chat, '
      + 'try a sharper or less cropped version — or paste the messages as text instead.',
    );
  }

  return result;
}

/** Releases extractor resources on shutdown. */
export async function closeExtractors() {
  await Promise.allSettled(STRATEGIES.map((s) => s.close?.()));
}

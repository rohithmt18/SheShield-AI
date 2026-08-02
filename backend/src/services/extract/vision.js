import { config } from '../../config.js';
import { RefusalError } from '../../providers/errors.js';

/**
 * Text extraction using a vision-capable model, when one is configured.
 *
 * The upgrade path referred to in extract/index.js. It deliberately does the
 * same job as OCR — turn an image into a transcript — rather than analysing the
 * image directly, so the scoring pipeline, the taxonomy, the prompts, and the
 * stored shape are all identical whichever extractor ran. Swapping engines
 * cannot change how a threat is scored.
 *
 * Analysing the image itself (reading a face, a location, a screenshot's UI
 * chrome) would slot in at this same seam, but it is a different feature with
 * different failure modes and is not what the current taxonomy describes.
 *
 * Enable with VISION_MODEL, e.g. meta-llama/llama-4-scout-17b-16e-instruct.
 */

const ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

const TRANSCRIBE_PROMPT = `Transcribe every piece of text visible in this image, exactly as written.

This is usually a screenshot of a chat, a comment thread, or a social media post.

Rules:
- Reproduce the wording verbatim, including misspellings, slang, and emoji. Do not
  correct, soften, paraphrase, translate, or summarise anything.
- When a sender's name is visible, prefix their message with "Name: ".
- When a timestamp is visible, keep it on the same line as the message it belongs to.
- Put each message on its own line, in the order they appear top to bottom.
- Ignore interface furniture: battery and signal icons, "Type a message", nav bars.
- If the image contains no readable text, reply with exactly: NO_TEXT_FOUND

Output the transcript only. No commentary, no headings, no code fences.`;

export const available = () => config.vision.enabled;

export const label = 'Vision model';

/**
 * @param {Buffer} buffer image bytes, already validated
 * @param {string} mimeType sniffed content type, not the client's claim
 */
export async function extract(buffer, mimeType) {
  if (!available()) throw new RefusalError('No vision model configured.');

  let response;
  try {
    response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${config.groq.apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: config.vision.model,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: TRANSCRIBE_PROMPT },
            {
              type: 'image_url',
              image_url: { url: `data:${mimeType};base64,${buffer.toString('base64')}` },
            },
          ],
        }],
        // Transcription, not composition: any creativity here is a fabricated
        // message in someone's evidence.
        temperature: 0,
        max_tokens: 2048,
      }),
    });
  } catch (err) {
    throw new RefusalError(`Could not reach the vision model (${err.message}).`);
  }

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new RefusalError(`Vision model rejected the request: ${body?.error?.message ?? `HTTP ${response.status}`}`);
  }

  const text = body?.choices?.[0]?.message?.content?.trim() ?? '';
  return {
    text: text === 'NO_TEXT_FOUND' ? '' : text,
    // Vision models report no per-word confidence; absent rather than invented.
    confidence: null,
    method: 'vision',
    engine: config.vision.model,
  };
}

export async function close() { /* stateless */ }

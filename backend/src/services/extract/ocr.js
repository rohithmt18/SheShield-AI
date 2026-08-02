import { createWorker } from 'tesseract.js';
import { config } from '../../config.js';

/**
 * Optical character recognition, via tesseract.js.
 *
 * Chosen because it is pure WASM: no native build step, no system package, so
 * it behaves the same on a laptop and on a Render free instance. It is slower
 * and blunter than a vision model, which is exactly why extract/index.js can
 * hand the job to one instead.
 *
 * A worker costs a second or two to spin up and holds its language pack in
 * memory, so one is kept alive and shared. Recognition itself is single
 * threaded, so calls are queued rather than run concurrently — two screenshots
 * arriving together would otherwise fight over the same worker.
 */

const IDLE_SHUTDOWN_MS = 5 * 60_000;

let workerPromise = null;
let idleTimer = null;
/** Serialises recognition; the worker handles exactly one image at a time. */
let queue = Promise.resolve();

async function getWorker() {
  if (!workerPromise) {
    workerPromise = createWorker(config.image.ocrLanguages, 1, {
      // Caches the trained data (~10 MB per language) so only the first
      // request after a cold start pays to download it.
      cachePath: config.image.ocrCacheDir,
      // tesseract.js logs a progress object on every tick; the server has
      // nothing useful to do with them and they drown the request log.
      logger: () => {},
    }).catch((err) => {
      // Let the next request retry rather than caching a failed init forever.
      workerPromise = null;
      throw err;
    });
  }
  return workerPromise;
}

function touchIdleTimer() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(async () => {
    const pending = workerPromise;
    workerPromise = null;
    try { (await pending)?.terminate(); } catch { /* already gone */ }
  }, IDLE_SHUTDOWN_MS);
  // A pending shutdown must never hold the process open.
  idleTimer.unref?.();
}

async function recognise(buffer) {
  const worker = await getWorker();
  const { data } = await worker.recognize(buffer);
  touchIdleTimer();

  return {
    text: (data?.text ?? '').trim(),
    // 0–100, tesseract's mean per-word confidence. Surfaced so the UI can warn
    // that a poor scan may have been misread rather than quietly scoring noise.
    confidence: typeof data?.confidence === 'number' ? Math.round(data.confidence) : null,
  };
}

export const available = () => true;

export const label = 'OCR (Tesseract)';

/**
 * @param {Buffer} buffer image bytes, already validated
 * @returns {Promise<{text: string, confidence: number|null, method: string, engine: string}>}
 */
export async function extract(buffer) {
  const run = queue.then(() => recognise(buffer), () => recognise(buffer));
  // Keep the chain alive even when one call rejects.
  queue = run.then(() => {}, () => {});

  const { text, confidence } = await run;
  return { text, confidence, method: 'ocr', engine: 'tesseract' };
}

/** Releases the worker; called on shutdown so the process can exit cleanly. */
export async function close() {
  clearTimeout(idleTimer);
  const pending = workerPromise;
  workerPromise = null;
  try { (await pending)?.terminate(); } catch { /* never started */ }
}

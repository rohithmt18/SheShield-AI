import { Router } from 'express';
import { config } from '../config.js';
import { toMessages, parseScreenshot } from '../services/parse.js';
import { analyseMessages } from '../services/analyze.js';
import { extractText, extractorLabel, NoTextFoundError } from '../services/extract/index.js';
import { uploadImage, sniffImageType, ACCEPTED_LABEL } from '../middleware/upload.js';

/** Threat detection endpoints. */
export function analyzeRoutes(db) {
  const router = Router();

  /** Appends an analysis to a session, keeping the stored history bounded. */
  async function record(session, analysis) {
    session.analyses.push(analysis);
    // Keep the session small; the dashboard only ever shows recent history.
    if (session.analyses.length > 20) session.analyses = session.analyses.slice(-20);
    await db.save(session);
  }

  /**
   * Accepts either raw pasted text or pre-structured messages, scores it, and
   * appends the result to the session.
   */
  router.post('/analyze', async (req, res, next) => {
    try {
      const messages = toMessages(req.body, config.limits);
      if (!messages.length) {
        return res.status(400).json({ error: 'Nothing to analyse — paste a conversation or upload a chat export.' });
      }

      const session = await db.resolve(req.body?.sessionId);
      const analysis = await analyseMessages(messages, {
        sourceLabel: typeof req.body?.sourceLabel === 'string' ? req.body.sourceLabel : null,
        region: typeof req.body?.region === 'string' ? req.body.region : '',
      });

      await record(session, analysis);

      res.json({ sessionId: session.id, analysis });
    } catch (err) { next(err); }
  });

  /**
   * The same analysis, from a screenshot.
   *
   * The image is reduced to text first (see services/extract), then travels the
   * identical path as a paste: parse → score → store. So the response shape,
   * the stored document, and everything the UI renders are the same whichever
   * way the evidence arrived — the only addition is `analysis.source`,
   * recording how the text was read, and `extractedText`, so she can see what
   * was actually recognised and correct it if OCR misread something.
   */
  router.post('/analyze/image', uploadImage('image'), async (req, res, next) => {
    try {
      if (!req.file?.buffer?.length) {
        return res.status(400).json({ error: `Choose a ${ACCEPTED_LABEL} image to analyse.` });
      }

      // The browser's declared mimetype got the file this far; the bytes decide
      // whether it is really an image.
      const mimeType = sniffImageType(req.file.buffer);
      if (!mimeType) {
        return res.status(415).json({
          error: `That file is not a readable ${ACCEPTED_LABEL} image. `
            + 'It may be corrupted, or renamed from another format.',
        });
      }

      const extraction = await extractText(req.file.buffer, mimeType);
      const messages = parseScreenshot(extraction.text, { maxMessages: config.limits.maxMessages });
      if (!messages.length) {
        throw new NoTextFoundError('Text was found in that image, but none of it looked like messages.');
      }

      const session = await db.resolve(req.body?.sessionId);
      const analysis = await analyseMessages(messages, {
        sourceLabel: typeof req.body?.sourceLabel === 'string' ? req.body.sourceLabel : null,
        region: typeof req.body?.region === 'string' ? req.body.region : '',
        source: {
          kind: 'image',
          method: extraction.method,
          engine: extraction.engine,
          confidence: extraction.confidence,
          label: extractorLabel(),
        },
      });

      await record(session, analysis);

      res.json({
        sessionId: session.id,
        analysis,
        extractedText: extraction.text.slice(0, config.limits.maxChars),
      });
    } catch (err) {
      // Extraction failures are the user's to act on ("try a sharper image"),
      // so they keep their message instead of becoming a generic 500.
      if (err.status && err.status < 500) {
        return res.status(err.status).json({ error: err.message });
      }
      next(err);
    }
  });

  /** Preview the parser without scoring — lets the UI show what it detected. */
  router.post('/analyze/preview', (req, res) => {
    const messages = toMessages(req.body, config.limits);
    res.json({ count: messages.length, messages: messages.slice(0, 50) });
  });

  router.get('/analysis/:sessionId/:analysisId', async (req, res, next) => {
    try {
      const session = await db.get(req.params.sessionId);
      const analysis = session?.analyses.find((a) => a.id === req.params.analysisId);
      if (!analysis) return res.status(404).json({ error: 'Analysis not found.' });
      res.json(analysis);
    } catch (err) { next(err); }
  });

  return router;
}

import { Router } from 'express';
import { config } from '../config.js';
import { toMessages } from '../services/parse.js';
import { analyseMessages } from '../services/analyze.js';

/** Threat detection endpoints. */
export function analyzeRoutes(db) {
  const router = Router();

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

      session.analyses.push(analysis);
      // Keep the session small; the dashboard only ever shows recent history.
      if (session.analyses.length > 20) session.analyses = session.analyses.slice(-20);
      await db.save(session);

      res.json({ sessionId: session.id, analysis });
    } catch (err) { next(err); }
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

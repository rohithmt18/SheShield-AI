import { Router } from 'express';
import { CATEGORIES, LEVEL_META, LEVELS } from '@sheshieldai/database';
import { geminiAvailable } from '../providers/gemini.js';
import { EMERGENCY, EVIDENCE_STEPS, REGION_OPTIONS } from '../services/resources.js';

/**
 * Session bootstrap and static reference data.
 *
 * Sessions are anonymous by construction: the id is minted server-side, held
 * in the browser's sessionStorage, and carries no identity. There is no login
 * because there is nothing to log in to.
 */
export function sessionRoutes(db) {
  const router = Router();

  /** Creates or resumes a session. The client sends whatever id it holds. */
  router.post('/session', async (req, res, next) => {
    try {
      const session = await db.resolve(typeof req.body?.sessionId === 'string' ? req.body.sessionId : null);
      res.json({
        sessionId: session.id,
        createdAt: session.createdAt,
        analyses: session.analyses.length,
        hasReport: Boolean(session.report),
        retentionDays: db.retentionDays,
      });
    } catch (err) { next(err); }
  });

  /** Everything the client needs to render without a round trip per lookup. */
  router.get('/meta', (_req, res) => {
    res.json({
      categories: CATEGORIES,
      levels: LEVELS,
      levelMeta: LEVEL_META,
      regions: REGION_OPTIONS,
      emergency: EMERGENCY,
      evidenceSteps: EVIDENCE_STEPS,
      aiEnabled: geminiAvailable(),
    });
  });

  /** Full session state — used to rehydrate the dashboard on reload. */
  router.get('/session/:id', async (req, res, next) => {
    try {
      const session = await db.get(req.params.id);
      if (!session) return res.status(404).json({ error: 'Session not found or expired.' });
      res.json(session);
    } catch (err) { next(err); }
  });

  /** The panic button: destroys everything held for this session. */
  router.delete('/session/:id', async (req, res, next) => {
    try {
      await db.remove(req.params.id);
      res.json({ deleted: true });
    } catch (err) { next(err); }
  });

  /** Aggregate counts only — no content, nothing attributable to a session. */
  router.get('/stats', async (_req, res, next) => {
    try {
      res.json(await db.stats());
    } catch (err) { next(err); }
  });

  return router;
}

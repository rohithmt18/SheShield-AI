import { Router } from 'express';
import { buildReport } from '../services/report.js';
import { renderReportPdf } from '../services/pdf.js';
import { resourcesFor, REGION_OPTIONS } from '../services/resources.js';

/** Incident report generation, retrieval, and PDF export. */
export function reportRoutes(db) {
  const router = Router();

  /** Builds a report from a stored analysis (defaults to the latest one). */
  router.post('/report', async (req, res, next) => {
    try {
      const session = await db.get(req.body?.sessionId);
      if (!session) return res.status(404).json({ error: 'Session not found or expired.' });

      const analysis = req.body?.analysisId
        ? session.analyses.find((a) => a.id === req.body.analysisId)
        : session.analyses.at(-1);
      if (!analysis) {
        return res.status(400).json({ error: 'Run an analysis before generating a report.' });
      }

      const report = await buildReport(analysis, req.body?.details ?? {});
      session.report = report;
      await db.save(session);

      res.json({ sessionId: session.id, report });
    } catch (err) { next(err); }
  });

  router.get('/report/:sessionId', async (req, res, next) => {
    try {
      const session = await db.get(req.params.sessionId);
      if (!session?.report) return res.status(404).json({ error: 'No report generated yet.' });
      res.json(session.report);
    } catch (err) { next(err); }
  });

  /** Streams the report as a PDF attachment. */
  router.get('/report/:sessionId/pdf', async (req, res, next) => {
    try {
      const session = await db.get(req.params.sessionId);
      if (!session?.report) return res.status(404).json({ error: 'No report generated yet.' });

      const report = session.report;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="SheShield-${report.reference}.pdf"`);
      // Nothing about an incident report should sit in a shared cache.
      res.setHeader('Cache-Control', 'no-store');

      const pdf = renderReportPdf(report);
      pdf.on('error', next);
      pdf.pipe(res);
    } catch (err) { next(err); }
  });

  /** Resource lookup without an analysis — for the standalone Resources page. */
  router.get('/resources', (req, res) => {
    const categories = String(req.query.categories ?? '').split(',').map((s) => s.trim()).filter(Boolean);
    const level = String(req.query.level ?? 'medium');
    const region = String(req.query.region ?? '');
    res.json({ ...resourcesFor(categories, level, region), regions: REGION_OPTIONS });
  });

  return router;
}

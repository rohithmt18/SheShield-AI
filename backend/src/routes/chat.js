import { Router } from 'express';
import { normaliseChatTurn } from '@sheshieldai/database';
import { config } from '../config.js';
import { respond } from '../services/chat.js';

/** Anonymous companion chat. */
export function chatRoutes(db) {
  const router = Router();

  router.post('/chat', async (req, res, next) => {
    try {
      const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
      if (!message) return res.status(400).json({ error: 'Message is empty.' });

      const session = await db.resolve(req.body?.sessionId);
      const history = session.chat.slice(-config.limits.maxChatTurns);

      const result = await respond(
        history.map(({ role, content }) => ({ role, content })),
        message,
        session.analyses.at(-1) ?? null,
      );

      session.chat.push(normaliseChatTurn('user', message));
      session.chat.push(normaliseChatTurn('assistant', result.reply));
      // Trim from the front so the transcript stays bounded on long sessions.
      if (session.chat.length > config.limits.maxChatTurns * 2) {
        session.chat = session.chat.slice(-config.limits.maxChatTurns * 2);
      }
      await db.save(session);

      res.json({ sessionId: session.id, ...result });
    } catch (err) { next(err); }
  });

  router.get('/chat/:sessionId', async (req, res, next) => {
    try {
      const session = await db.get(req.params.sessionId);
      if (!session) return res.status(404).json({ error: 'Session not found or expired.' });
      res.json({ messages: session.chat });
    } catch (err) { next(err); }
  });

  router.delete('/chat/:sessionId', async (req, res, next) => {
    try {
      const session = await db.get(req.params.sessionId);
      if (!session) return res.status(404).json({ error: 'Session not found or expired.' });
      session.chat = [];
      await db.save(session);
      res.json({ cleared: true });
    } catch (err) { next(err); }
  });

  return router;
}

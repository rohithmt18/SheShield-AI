import { createHash } from 'node:crypto';

/**
 * Fixed-window rate limiter, in process memory.
 *
 * Client addresses are hashed before use as a key — a rate limiter has no
 * business holding the IP of someone reporting their own harassment, and this
 * way a memory dump or heap snapshot doesn't either.
 *
 * Single-instance only. Behind more than one replica, move this to Redis.
 */
export function rateLimit({ windowMs = 60_000, max = 30, message } = {}) {
  const hits = new Map();

  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) {
      if (entry.resetAt <= now) hits.delete(key);
    }
  }, windowMs);
  sweep.unref?.();

  return function limiter(req, res, next) {
    const key = createHash('sha256')
      .update(req.ip ?? req.socket.remoteAddress ?? 'unknown')
      .digest('hex')
      .slice(0, 16);

    const now = Date.now();
    let entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }
    entry.count += 1;

    res.setHeader('RateLimit-Limit', max);
    res.setHeader('RateLimit-Remaining', Math.max(0, max - entry.count));
    res.setHeader('RateLimit-Reset', Math.ceil((entry.resetAt - now) / 1000));

    if (entry.count > max) {
      res.setHeader('Retry-After', Math.ceil((entry.resetAt - now) / 1000));
      return res.status(429).json({
        error: message ?? 'Too many requests — please wait a moment and try again.',
      });
    }
    next();
  };
}

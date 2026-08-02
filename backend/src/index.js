import { pathToFileURL } from 'node:url';
import express from 'express';
import cors from 'cors';
import { connect } from '@sheshieldai/database';
import { config } from './config.js';
import { rateLimit } from './middleware/rateLimit.js';
import { sessionRoutes } from './routes/session.js';
import { analyzeRoutes } from './routes/analyze.js';
import { chatRoutes } from './routes/chat.js';
import { reportRoutes } from './routes/report.js';
import { aiAvailable, aiEngine, aiDescription } from './providers/index.js';
import { extractorLabel, closeExtractors } from './services/extract/index.js';

/** True for http://localhost:PORT, 127.0.0.1, or [::1] — any port. */
function isLoopback(origin) {
  try {
    const { hostname, protocol } = new URL(origin);
    return (protocol === 'http:' || protocol === 'https:')
      && (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]' || hostname === '::1');
  } catch {
    return false;
  }
}

export async function createServer() {
  const db = await connect(config.storage);
  const app = express();

  app.disable('x-powered-by');
  // Needed for correct req.ip when deployed behind a proxy (Render, Railway…).
  app.set('trust proxy', 1);

  app.use(cors({
    origin(origin, callback) {
      // Same-origin, curl, and server-to-server requests send no Origin.
      if (!origin || config.corsOrigins.includes(origin)) return callback(null, true);
      // In development any loopback port is fine: Vite silently moves to 5274+
      // when its port is taken, and localhost/127.0.0.1 are distinct origins,
      // so a fixed allowlist turns into mystery 403s. Production stays strict.
      if (!config.isProduction && isLoopback(origin)) return callback(null, true);
      callback(new Error(`Origin ${origin} is not allowed.`));
    },
    credentials: false,
  }));

  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => {
    res.json({
      ok: true,
      storage: db.backend,
      ai: aiAvailable() ? aiEngine() : 'offline',
      imageText: extractorLabel(),
      // The allowlist is not a secret, and a wrong value here is otherwise
      // invisible from outside: an origin-less request succeeds while every
      // browser gets a 403, so it looks like the API is down rather than
      // misconfigured. Reporting it makes that diagnosable in one request.
      corsOrigins: config.corsOrigins,
    });
  });

  // AI-backed routes are the expensive ones; reference data is cheap.
  const heavy = rateLimit({ windowMs: 60_000, max: 20 });
  const light = rateLimit({ windowMs: 60_000, max: 120 });

  app.use('/api', light, sessionRoutes(db));
  app.use('/api', heavy, analyzeRoutes(db));
  app.use('/api', heavy, chatRoutes(db));
  app.use('/api', heavy, reportRoutes(db));

  app.use('/api', (_req, res) => res.status(404).json({ error: 'Unknown endpoint.' }));

  // eslint-disable-next-line no-unused-vars -- Express identifies error handlers by arity.
  app.use((err, _req, res, _next) => {
    const status = /not allowed/.test(err.message) ? 403 : 500;
    // Log the message, never the request body — it holds the user's evidence.
    console.error(`[error] ${err.name}: ${err.message}`);
    res.status(status).json({
      error: status === 403
        ? 'Origin not allowed.'
        : 'Something went wrong on our end. Your session is safe — please try again.',
    });
  });

  return { app, db };
}

// Only listen when executed directly, so tests can import createServer.
// pathToFileURL keeps this correct on Windows, where drive letters would
// otherwise produce file://c:/… instead of file:///c:/….
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { app, db } = await createServer();

  // In production the default allowlist is a localhost URL, which no deployed
  // browser will ever send. Requests still succeed from curl and server to
  // server, because those send no Origin at all — so this fails only for real
  // users, and looks like an unreachable API rather than a config mistake.
  if (config.isProduction && !process.env.CORS_ORIGIN) {
    console.warn(
      '\n[cors] WARNING: CORS_ORIGIN is not set, so only '
      + `${config.corsOrigins.join(', ')} is allowed.\n`
      + '[cors] Browsers on your deployed frontend will get 403 "Origin not allowed."\n'
      + '[cors] Set CORS_ORIGIN to the frontend URL, e.g. https://your-app.vercel.app\n',
    );
  }

  const server = app.listen(config.port, () => {
    console.log(`\n  SheShield AI API`);
    console.log(`  ├─ http://localhost:${config.port}`);
    console.log(`  ├─ storage : ${db.backend}`);
    console.log(`  ├─ ai      : ${aiDescription()}`);
    console.log(`  └─ cors    : ${config.corsOrigins.join(', ')}\n`);
  });

  // Without this, a port clash exits on an unhandled EADDRINUSE stack trace,
  // which buries the one fact that matters. Covers `npm start` too, where the
  // dev preflight in scripts/check-ports.mjs never runs.
  server.on('error', (err) => {
    if (err.code !== 'EADDRINUSE') throw err;
    console.error(
      `\n[port] Port ${config.port} is already in use, so the API did not start.\n`
      + '[port] Usually another copy of this server is still running.\n'
      + `[port] Find it with:  ${process.platform === 'win32'
        ? `netstat -ano -p tcp | findstr :${config.port}`
        : `lsof -nP -iTCP:${config.port} -sTCP:LISTEN`}\n`,
    );
    process.exit(1);
  });

  const shutdown = async (signal) => {
    console.log(`\n[${signal}] shutting down…`);
    server.close();
    // The OCR worker is a live subprocess; without this it keeps the event loop
    // alive and the server appears to hang on Ctrl-C.
    await Promise.allSettled([db.close(), closeExtractors()]);
    process.exit(0);
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

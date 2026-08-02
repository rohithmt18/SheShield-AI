#!/usr/bin/env node
/**
 * Preflight check for the dev servers' fixed ports.
 *
 * The ports in this project are not arbitrary: the backend's CORS allowlist and
 * both Vite proxies are written in terms of 5050 / 5273 / 5274. Vite's default
 * behaviour when a port is taken is to quietly move to the next free one, which
 * produces a working page on an origin nothing else knows about — so the app
 * loads and then every API call fails, which reads like a broken backend rather
 * than a stale process from the last session.
 *
 * So the ports are pinned (`strictPort` in both Vite configs) and this runs
 * first to say plainly which process is in the way.
 *
 * Usage: node scripts/check-ports.mjs 5050 5273 5274
 */

import { execFileSync } from 'node:child_process';
import { createServer } from 'node:net';

const LABELS = {
  5050: 'SheShield API (backend)',
  5273: 'SheShield frontend',
  5274: 'Social client',
};

const isWindows = process.platform === 'win32';

/** Runs a command and returns stdout, or '' if it is missing or fails. */
function run(file, args) {
  try {
    return execFileSync(file, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return '';
  }
}

/**
 * The addresses a dev server here might bind. Vite listens on localhost, the
 * API listens on every interface, and on Windows those do not collide: a
 * wildcard bind to 0.0.0.0 succeeds happily while another process holds
 * 127.0.0.1 on the same port. Checking only the wildcard therefore reports a
 * port free that Vite then fails to take — so every address is tried.
 */
const BIND_ADDRESSES = ['0.0.0.0', '127.0.0.1', '::1'];

function canBind(port, host) {
  return new Promise((resolve) => {
    const server = createServer();
    // Only a genuine clash counts. A host that does not exist on this machine
    // (no IPv6, say) fails with EADDRNOTAVAIL, which is not a busy port.
    server.once('error', (err) => resolve(err.code !== 'EADDRINUSE'));
    server.once('listening', () => server.close(() => resolve(true)));
    server.listen(port, host);
  });
}

/** Resolves whether a TCP port can actually be bound, which is the question that matters. */
async function isPortFree(port) {
  for (const host of BIND_ADDRESSES) {
    if (!(await canBind(port, host))) return false;
  }
  return true;
}

/** @returns {{pid: string, name: string}[]} processes listening on `port`. */
function listenersOn(port) {
  const seen = new Map();

  if (isWindows) {
    // No `-p tcp`: that filter is IPv4-only, and Vite listens on [::1], so the
    // very process most likely to be in the way would go unreported.
    for (const line of run('netstat', ['-ano']).split(/\r?\n/)) {
      const m = line.match(/^\s*TCP\s+\S+:(\d+)\s+\S+\s+LISTENING\s+(\d+)\s*$/i);
      if (m && Number(m[1]) === port) seen.set(m[2], null);
    }
    for (const pid of seen.keys()) {
      const row = run('tasklist', ['/FI', `PID eq ${pid}`, '/FO', 'CSV', '/NH']);
      seen.set(pid, row.match(/^"([^"]+)"/)?.[1] ?? 'unknown process');
    }
  } else {
    for (const pid of run('lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN', '-t']).split(/\s+/)) {
      if (pid) seen.set(pid, run('ps', ['-p', pid, '-o', 'comm=']).trim() || 'unknown process');
    }
  }

  return [...seen].map(([pid, name]) => ({ pid, name: name ?? 'unknown process' }));
}

const killCommand = (pid) => (isWindows ? `taskkill /PID ${pid} /F` : `kill -9 ${pid}`);

const ports = process.argv.slice(2).map(Number).filter(Number.isInteger);
if (!ports.length) {
  console.error('check-ports: no ports given. Example: node scripts/check-ports.mjs 5050 5273 5274');
  process.exit(2);
}

const busy = [];
for (const port of ports) {
  if (!(await isPortFree(port))) busy.push(port);
}

if (!busy.length) process.exit(0);

const red = (s) => `\x1b[31m${s}\x1b[0m`;
const bold = (s) => `\x1b[1m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;

console.error(`\n${red('✖')} ${bold(`${busy.length} of this project's ports ${busy.length === 1 ? 'is' : 'are'} already in use.`)}\n`);

for (const port of busy) {
  const holders = listenersOn(port);
  console.error(`  ${bold(String(port))}  ${LABELS[port] ?? 'dev server'}`);

  if (!holders.length) {
    // Bind failed but no listener was found: usually another user's process, or
    // a Windows reserved port range. Say so rather than inventing a cause.
    console.error(dim('    in use by a process this shell cannot see (another user, or a reserved range)'));
  } else {
    for (const { pid, name } of holders) {
      console.error(`    PID ${pid}  ${name}`);
      console.error(dim(`    stop it with:  ${killCommand(pid)}`));
    }
  }
  console.error('');
}

console.error(
  '  Nothing was started. These ports are fixed on purpose — the backend\'s CORS\n'
  + '  allowlist and both Vite proxies are written in terms of them, so letting a\n'
  + '  dev server slide onto the next free port would load a page whose API calls\n'
  + '  all fail.\n\n'
  + `  ${dim('Most likely a dev server from an earlier session is still running.')}\n`,
);

process.exit(1);

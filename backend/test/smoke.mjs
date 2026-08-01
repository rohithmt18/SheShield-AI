import assert from 'node:assert/strict';
import test from 'node:test';

// Force the offline path so the suite never needs a key or a network.
process.env.GEMINI_API_KEY = '';
process.env.GOOGLE_API_KEY = '';
process.env.MONGODB_URI = '';
process.env.DATA_FILE = '';

const { createServer } = await import('../src/index.js');
const { parseTranscript } = await import('../src/services/parse.js');
const { analyseHeuristically } = await import('../src/providers/heuristic.js');
const { resourcesFor } = await import('../src/services/resources.js');
const { renderReportPdf } = await import('../src/services/pdf.js');
const { buildReport } = await import('../src/services/report.js');

const { app, db } = await createServer();
const server = app.listen(0);
const port = server.address().port;
const api = (path, init) => fetch(`http://127.0.0.1:${port}${path}`, init);
const post = (path, body) => api(path, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
});

test.after(async () => {
  server.close();
  await db.close();
});

test('parses a WhatsApp Android export', () => {
  const messages = parseTranscript(
    '12/03/2024, 10:15 pm - Ravi: hey\n'
    + '12/03/2024, 10:16 pm - Ravi: answer me\n'
    + 'Messages and calls are end-to-end encrypted.',
  );
  assert.equal(messages.length, 2);
  assert.equal(messages[0].sender, 'Ravi');
  assert.equal(messages[1].text, 'answer me');
});

test('parses a WhatsApp iOS export', () => {
  const messages = parseTranscript('[12/03/2024, 10:15:33 PM] Ravi: where are you');
  assert.equal(messages.length, 1);
  assert.equal(messages[0].sender, 'Ravi');
  assert.equal(messages[0].timestamp, '12/03/2024, 10:15:33 PM');
});

test('treats an unattributed line as a message rather than dropping it', () => {
  const messages = parseTranscript('i know where you live');
  assert.equal(messages.length, 1);
  assert.match(messages[0].text, /know where you live/);
});

test('does not mistake prose containing a colon for a sender line', () => {
  const messages = parseTranscript('he told me something strange: that he was watching me');
  assert.equal(messages.length, 1);
  assert.equal(messages[0].sender, 'Them');
});

test('heuristic engine flags a credible threat as critical', () => {
  const raw = analyseHeuristically([{ sender: 'X', text: 'i will kill you' }]);
  assert.ok(raw.overallSeverity >= 85, `expected critical, got ${raw.overallSeverity}`);
  assert.equal(raw.primaryCategory, 'threat_of_violence');
  assert.equal(raw.messages[0].flagged, true);
});

test('heuristic engine detects sextortion', () => {
  const raw = analyseHeuristically([
    { sender: 'X', text: 'send me more pics or i will post your photos to your family' },
  ]);
  assert.ok(raw.overallSeverity >= 85);
  assert.ok(raw.categories.includes('sextortion'));
});

test('heuristic engine leaves ordinary conversation alone', () => {
  const raw = analyseHeuristically([
    { sender: 'A', text: 'are we still on for lunch tomorrow' },
    { sender: 'B', text: 'yes! see you at 1' },
  ]);
  assert.equal(raw.overallSeverity, 0);
  assert.equal(raw.primaryCategory, 'none');
  assert.equal(raw.messages.every((m) => !m.flagged), true);
});

test('heuristic engine notices escalation', () => {
  const raw = analyseHeuristically([
    { sender: 'X', text: 'hey' },
    { sender: 'X', text: 'why are you ignoring me' },
    { sender: 'X', text: 'you are pathetic' },
    { sender: 'X', text: 'i know where you live' },
  ]);
  assert.equal(raw.escalating, true);
});

test('resources route by category and region', () => {
  const out = resourcesFor(['non_consensual_imagery'], 'critical', 'karnataka');
  assert.equal(out.urgent, true);
  assert.ok(out.directory.some((r) => r.id === 'stopncii'));
  assert.equal(out.region.name, 'Karnataka');
  assert.ok(out.directory.some((r) => r.name.includes('CEN Police Station')));
});

test('POST /api/analyze scores and persists', async () => {
  const res = await post('/api/analyze', {
    text: 'Ravi: i know where you live\nRavi: answer me or else',
    sourceLabel: 'WhatsApp',
    region: 'delhi',
  });
  assert.equal(res.status, 200);

  const { sessionId, analysis } = await res.json();
  assert.ok(sessionId.startsWith('ss_'));
  assert.equal(analysis.engine, 'heuristic');
  assert.ok(analysis.overallSeverity >= 65);
  assert.equal(analysis.messages.length, 2);
  assert.ok(analysis.resources.directory.length > 0);

  const stored = await api(`/api/session/${sessionId}`).then((r) => r.json());
  assert.equal(stored.analyses.length, 1);
});

test('POST /api/analyze rejects empty input', async () => {
  const res = await post('/api/analyze', { text: '   ' });
  assert.equal(res.status, 400);
});

test('chat replies and stores both turns', async () => {
  const { sessionId } = await post('/api/session', {}).then((r) => r.json());
  const res = await post('/api/chat', { sessionId, message: 'how do i save evidence' });
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.equal(body.engine, 'offline');
  assert.match(body.reply, /screenshot/i);

  const history = await api(`/api/chat/${sessionId}`).then((r) => r.json());
  assert.equal(history.messages.length, 2);
});

test('chat escalates a crisis disclosure ahead of the model', async () => {
  const { sessionId } = await post('/api/session', {}).then((r) => r.json());
  const body = await post('/api/chat', { sessionId, message: 'i want to die' }).then((r) => r.json());

  assert.equal(body.crisis, true);
  assert.equal(body.engine, 'safety');
  assert.match(body.reply, /14416|112/);
});

test('report builds, keeps missing details honest, and renders a PDF', async () => {
  const { sessionId } = await post('/api/analyze', {
    text: 'Ravi: send me pics or i will leak your photos',
    region: 'maharashtra',
  }).then((r) => r.json());

  const { report } = await post('/api/report', {
    sessionId,
    details: { platform: 'Instagram', offenderHandle: '@ravi_99' },
  }).then((r) => r.json());

  assert.match(report.reference, /^SS-\d{4}-[A-Z0-9]{6}$/);
  assert.equal(report.details.platform, 'Instagram');
  // Nothing was supplied for these, so they must not be invented.
  assert.equal(report.details.firstIncident, '[not provided]');
  assert.ok(report.evidence.length > 0);
  assert.ok(report.legalContext.at(-1).includes('not legal advice'));

  const res = await api(`/api/report/${sessionId}/pdf`);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('content-type'), 'application/pdf');

  const bytes = Buffer.from(await res.arrayBuffer());
  assert.ok(bytes.length > 1000, `PDF too small: ${bytes.length} bytes`);
  assert.equal(bytes.subarray(0, 5).toString(), '%PDF-');
});

test('PDF renders without a font error when text holds a rupee sign or emoji', async () => {
  const analysis = {
    id: 'an_test', createdAt: new Date().toISOString(), engine: 'heuristic',
    overallSeverity: 90, level: 'critical', categories: ['sextortion'],
    escalating: false, summary: 'test', patterns: [], messageCount: 1,
    messages: [{
      index: 0, sender: 'X', text: 'pay ₹5000 or else 😡', timestamp: null,
      flagged: true, severity: 90, level: 'critical', categories: ['sextortion'], rationale: 'demand',
    }],
  };
  const report = await buildReport(analysis, { platform: 'WhatsApp' });

  const chunks = [];
  const doc = renderReportPdf(report);
  await new Promise((resolve, reject) => {
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', resolve);
    doc.on('error', reject);
  });
  assert.ok(Buffer.concat(chunks).length > 1000);
});

test('deleting a session removes everything held for it', async () => {
  const { sessionId } = await post('/api/analyze', { text: 'you are pathetic' }).then((r) => r.json());
  assert.equal((await api(`/api/session/${sessionId}`)).status, 200);

  await api(`/api/session/${sessionId}`, { method: 'DELETE' });
  assert.equal((await api(`/api/session/${sessionId}`)).status, 404);
});

test('/health and /api/meta report capability', async () => {
  const health = await api('/health').then((r) => r.json());
  assert.equal(health.ok, true);
  assert.equal(health.ai, 'offline');

  const meta = await api('/api/meta').then((r) => r.json());
  assert.equal(meta.aiEnabled, false);
  assert.ok(meta.regions.length > 0);
  assert.ok(meta.categories.harassment.label);
});

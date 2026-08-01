import PDFDocument from 'pdfkit';
import { categoryLabel, LEVEL_META } from '@sheshieldai/database';

/**
 * Renders a report object to a PDF suitable for attaching to a cybercrime
 * complaint.
 *
 * PDFKit's built-in fonts are WinAnsi-encoded, so anything outside that range
 * (the rupee sign, emoji, arrows) would silently corrupt the output. Every
 * string is passed through `safe()` on the way in.
 */

/** Characters above U+00FF that WinAnsi does support. */
const WINANSI_EXTRAS = new Set([
  '€', '‚', 'ƒ', '„', '…', '†', '‡', 'ˆ',
  '‰', 'Š', '‹', 'Œ', 'Ž', '‘', '’', '“',
  '”', '•', '–', '—', '˜', '™', 'š', '›',
  'œ', 'ž', 'Ÿ',
]);

const REPLACEMENTS = {
  '₹': 'Rs.',   // ₹
  '→': '->',
  '←': '<-',
  ' ': ' ',
};

function safe(value) {
  const text = value == null ? '' : String(value);
  let out = '';
  for (const ch of text) {
    if (REPLACEMENTS[ch] !== undefined) { out += REPLACEMENTS[ch]; continue; }
    const code = ch.codePointAt(0);
    if (code <= 0xff || WINANSI_EXTRAS.has(ch)) out += ch;
    // Anything else (emoji, other scripts) is dropped rather than mojibake'd.
  }
  return out;
}

const INK = '#1f2937';
const MUTED = '#6b7280';
const ACCENT = '#9d174d';
const RULE = '#e5e7eb';

const LEVEL_COLOUR = {
  none: '#059669',
  low: '#0891b2',
  medium: '#d97706',
  high: '#dc2626',
  critical: '#7f1d1d',
};

/**
 * @param {object} report output of `buildReport`
 * @returns {PDFDocument} a readable stream — pipe it to the response
 */
export function renderReportPdf(report) {
  const doc = new PDFDocument({
    margin: 56,
    // Required so the footer pass can revisit pages to stamp "Page x of y".
    bufferPages: true,
    info: {
      Title: safe(report.title || 'Incident Report'),
      Author: 'SheShield AI',
      Subject: `Incident report ${report.reference}`,
      Keywords: 'cyber harassment, incident report',
    },
  });

  header(doc, report);
  metaBlock(doc, report);

  section(doc, 'Summary');
  paragraph(doc, report.summary);

  section(doc, 'Nature of the incident');
  paragraph(doc, report.incidentNature);
  if (report.categories?.length) {
    paragraph(doc, `Classified as: ${report.categories.filter((c) => c !== 'none').map(categoryLabel).join(', ') || 'unclassified'}.`, MUTED);
  }

  if (report.timeline?.length) {
    section(doc, 'Timeline');
    for (const item of report.timeline) {
      bullet(doc, `${item.when} — ${item.what}`);
    }
  }

  if (report.evidence?.length) {
    section(doc, 'Evidence');
    report.evidence.forEach((item, i) => {
      keepTogether(doc, 90);
      doc.fillColor(INK).font('Helvetica-Bold').fontSize(10).text(safe(item.reference));
      doc.moveDown(0.25);
      quote(doc, item.excerpt);
      doc.fillColor(MUTED).font('Helvetica-Oblique').fontSize(9)
        .text(safe(item.significance), { align: 'left' });
      doc.fillColor(INK).font('Helvetica').fontSize(10);
      if (i < report.evidence.length - 1) doc.moveDown(0.75);
    });
  }

  if (report.legalContext?.length) {
    section(doc, 'Potentially relevant provisions');
    for (const item of report.legalContext) bullet(doc, item);
  }

  if (report.requestedAction?.length) {
    section(doc, 'Action requested');
    for (const item of report.requestedAction) bullet(doc, item);
  }

  if (report.nextSteps?.length) {
    section(doc, 'Next steps for the complainant');
    for (const item of report.nextSteps) bullet(doc, item);
  }

  helplines(doc, report);
  footer(doc, report);

  doc.end();
  return doc;
}

function header(doc, report) {
  doc.fillColor(ACCENT).font('Helvetica-Bold').fontSize(20).text('SheShield AI');
  doc.fillColor(MUTED).font('Helvetica').fontSize(9)
    .text('Incident report prepared for submission to a platform or cybercrime authority');
  doc.moveDown(0.8);

  doc.fillColor(INK).font('Helvetica-Bold').fontSize(15)
    .text(safe(report.title || 'Incident Report'));
  doc.moveDown(0.5);
  rule(doc);
}

function metaBlock(doc, report) {
  const level = report.level ?? 'none';
  const rows = [
    ['Reference', report.reference],
    ['Generated', new Date(report.createdAt).toUTCString()],
    ['Assessed severity', `${report.severity}/100 — ${LEVEL_META[level]?.label ?? level}`],
    ['Platform', report.details?.platform],
    ['Account complained of', report.details?.offenderHandle],
    ['Relationship to complainant', report.details?.relationship],
    ['Previously reported', report.details?.reportedBefore],
  ];

  doc.moveDown(0.6);
  for (const [label, value] of rows) {
    if (value == null || value === '') continue;
    const y = doc.y;
    doc.fillColor(MUTED).font('Helvetica').fontSize(9).text(safe(label), doc.page.margins.left, y, { width: 150 });
    const colour = label === 'Assessed severity' ? (LEVEL_COLOUR[level] ?? INK) : INK;
    doc.fillColor(colour).font('Helvetica-Bold').fontSize(9)
      .text(safe(value), doc.page.margins.left + 155, y, { width: doc.page.width - doc.page.margins.left - doc.page.margins.right - 155 });
    doc.moveDown(0.35);
  }
  doc.moveDown(0.4);
  rule(doc);
}

function section(doc, title) {
  keepTogether(doc, 80);
  doc.moveDown(0.9);
  doc.fillColor(ACCENT).font('Helvetica-Bold').fontSize(11.5).text(safe(title.toUpperCase()), { characterSpacing: 0.6 });
  doc.moveDown(0.4);
  doc.fillColor(INK).font('Helvetica').fontSize(10);
}

function paragraph(doc, text, colour = INK) {
  if (!text) return;
  doc.fillColor(colour).font('Helvetica').fontSize(10)
    .text(safe(text), { align: 'left', lineGap: 2 });
  doc.moveDown(0.4);
}

function bullet(doc, text) {
  if (!text) return;
  keepTogether(doc, 40);
  const left = doc.page.margins.left;
  const width = doc.page.width - left - doc.page.margins.right;
  const y = doc.y;
  doc.fillColor(ACCENT).font('Helvetica-Bold').fontSize(10).text('•', left, y, { width: 12 });
  doc.fillColor(INK).font('Helvetica').fontSize(10)
    .text(safe(text), left + 14, y, { width: width - 14, lineGap: 1.5 });
  doc.moveDown(0.35);
}

/** Indented, ruled block for a verbatim excerpt. */
function quote(doc, text) {
  const left = doc.page.margins.left;
  const width = doc.page.width - left - doc.page.margins.right;
  const startY = doc.y;

  doc.fillColor(INK).font('Helvetica').fontSize(10)
    .text(safe(`"${text}"`), left + 14, startY, { width: width - 18, lineGap: 2 });

  const endY = doc.y;
  doc.save()
    .moveTo(left + 4, startY).lineTo(left + 4, endY)
    .lineWidth(2).strokeColor(RULE).stroke()
    .restore();
  doc.moveDown(0.35);
}

function helplines(doc, report) {
  const emergency = report.resources?.emergency ?? [];
  if (!emergency.length) return;

  section(doc, 'Helplines');
  for (const item of emergency) {
    bullet(doc, `${item.name} — ${item.contact} (${item.hours})`);
  }
  const local = report.resources?.region;
  if (local) bullet(doc, `${local.unit} — ${local.contact}`);
  bullet(doc, 'National Cyber Crime Reporting Portal — cybercrime.gov.in');
}

function footer(doc, report) {
  doc.moveDown(1);
  rule(doc);
  doc.moveDown(0.5);
  doc.fillColor(MUTED).font('Helvetica-Oblique').fontSize(8)
    .text(safe(
      `Prepared by SheShield AI (${report.engine === 'gemini' ? 'AI-assisted' : 'rule-based'} draft, reference ${report.reference}). `
      + 'Severity scores and classifications are automated assessments, not legal determinations, and the content of this '
      + 'report has not been verified by a human reviewer. Nothing in this document constitutes legal advice. '
      + 'The complainant should review every field before submission and correct anything marked [not provided].',
    ), { align: 'left', lineGap: 1.5 });

  // Page numbers, added once the total is known.
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i += 1) {
    doc.switchToPage(i);
    doc.fillColor(MUTED).font('Helvetica').fontSize(8)
      .text(
        `${report.reference}    Page ${i - range.start + 1} of ${range.count}`,
        doc.page.margins.left,
        doc.page.height - 38,
        { width: doc.page.width - doc.page.margins.left - doc.page.margins.right, align: 'center' },
      );
  }
}

function rule(doc) {
  const left = doc.page.margins.left;
  doc.save()
    .moveTo(left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y)
    .lineWidth(1).strokeColor(RULE).stroke()
    .restore();
}

/** Starts a new page if less than `needed` points remain, to avoid orphans. */
function keepTogether(doc, needed) {
  const remaining = doc.page.height - doc.page.margins.bottom - doc.y;
  if (remaining < needed) doc.addPage();
}

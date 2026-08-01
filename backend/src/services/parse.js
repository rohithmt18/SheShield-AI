/**
 * Turns pasted text into structured messages.
 *
 * People paste whatever their phone gave them — a WhatsApp export, a few lines
 * copied out of Instagram, or one long DM. Anything we cannot attribute to a
 * sender still becomes a message rather than being dropped, because a single
 * unattributed threat is exactly the case that matters most.
 */

/** `[12/03/2024, 10:15:33 PM] Sender: text` — WhatsApp iOS export. */
const WA_BRACKET = /^\[(.+?)\]\s*([^:]{1,80}?):\s*([\s\S]*)$/;
/** `12/03/2024, 10:15 pm - Sender: text` — WhatsApp Android export. */
const WA_DASH = /^(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4},?\s+\d{1,2}:\d{2}(?::\d{2})?\s*(?:[apAP]\.?[mM]\.?)?)\s+-\s+([^:]{1,80}?):\s*([\s\S]*)$/;
/** `10:15 PM Sender: text` or `Sender: text` — loose copy-paste. */
const TIME_PREFIX = /^(\d{1,2}:\d{2}(?::\d{2})?\s*(?:[apAP]\.?[mM]\.?)?)\s+([^:]{1,80}?):\s*([\s\S]*)$/;
const SENDER_ONLY = /^([^:\n]{1,60}?):\s*([\s\S]*)$/;

/** WhatsApp system lines carry no evidentiary value and skew the counts. */
const SYSTEM_LINE = /^(messages and calls are end-to-end encrypted|you (?:deleted|blocked)|this message was deleted|missed (?:voice|video) call|<media omitted>|image omitted|video omitted|sticker omitted|joined using this group|created group)/i;

const clean = (s) => s.replace(/\u200E|\u200F/g, '').trim();

/**
 * Distinguishes "Ravi:" from "he told me something strange:".
 *
 * Character class alone isn't enough \u2014 a whole clause of ordinary words passes
 * it. Real senders are names, handles, or phone numbers: short, and at most a
 * few words.
 */
function looksLikeSender(candidate) {
  if (candidate.length > 40) return false;
  if (!/^[\w @.'\u2019+_-]+$/.test(candidate)) return false;
  return candidate.split(/\s+/).filter(Boolean).length <= 3;
}

/**
 * @param {string} raw pasted conversation text
 * @param {{defaultSender?: string, maxMessages?: number}} [opts]
 * @returns {{sender: string, text: string, timestamp: string|null}[]}
 */
export function parseTranscript(raw, { defaultSender = 'Them', maxMessages = 150 } = {}) {
  const lines = String(raw ?? '').replace(/\r\n?/g, '\n').split('\n');
  const messages = [];

  for (const line of lines) {
    const text = clean(line);
    if (!text) continue;

    const match = WA_BRACKET.exec(text) ?? WA_DASH.exec(text) ?? TIME_PREFIX.exec(text);
    if (match) {
      const [, timestamp, sender, body] = match;
      push(messages, { sender: clean(sender), text: clean(body), timestamp: clean(timestamp) });
      continue;
    }

    const senderMatch = SENDER_ONLY.exec(text);
    // A colon inside prose ("he said: leave") isn't a sender line.
    if (senderMatch && senderMatch[2] && looksLikeSender(clean(senderMatch[1]))) {
      push(messages, { sender: clean(senderMatch[1]), text: clean(senderMatch[2]), timestamp: null });
      continue;
    }

    // Continuation of the previous message, or a standalone line.
    const previous = messages.at(-1);
    if (previous && !SYSTEM_LINE.test(text) && previous.text.length + text.length < 2000) {
      previous.text += `\n${text}`;
    } else {
      push(messages, { sender: defaultSender, text, timestamp: null });
    }
  }

  return messages.slice(0, maxMessages);
}

function push(messages, message) {
  if (!message.text || SYSTEM_LINE.test(message.text)) return;
  messages.push(message);
}

/** Accepts either pre-structured messages from the client or raw pasted text. */
export function toMessages(body, limits) {
  if (Array.isArray(body?.messages) && body.messages.length) {
    return body.messages
      .filter((m) => typeof m?.text === 'string' && m.text.trim())
      .slice(0, limits.maxMessages)
      .map((m) => ({
        sender: typeof m.sender === 'string' && m.sender.trim() ? m.sender.trim().slice(0, 80) : 'Them',
        text: m.text.trim().slice(0, 2000),
        timestamp: typeof m.timestamp === 'string' ? m.timestamp.slice(0, 80) : null,
      }));
  }

  const raw = typeof body?.text === 'string' ? body.text.slice(0, limits.maxChars) : '';
  return parseTranscript(raw, { maxMessages: limits.maxMessages });
}

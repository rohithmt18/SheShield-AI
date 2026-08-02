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

/**
 * A timestamp sitting alone on its own line, as OCR returns them.
 *
 * Screenshots put the time inside the bubble, so it comes back on the line
 * after the message rather than before it, and OCR frequently loses the colon
 * ("1016 pm"). Both spellings are matched, but a bare run of digits is not — a
 * message that reads "2024" is a message, not a clock.
 */
const STANDALONE_TIME = /^[([]?(?:\d{1,2}[:.]\d{2}(?::\d{2})?\s*(?:[ap]\.?\s?m\.?)?|\d{3,4}\s*[ap]\.?\s?m\.?)[)\]]?$/i;

/** Interface furniture OCR picks up from the chrome around a conversation. */
const UI_CHROME = /^(online|typing\.{0,3}|last seen.*|type a message|message|send|search|back|today|yesterday|delivered|read|seen)$/i;

/**
 * Turns OCR output from a chat screenshot into messages.
 *
 * `parseTranscript` is built for exports and pastes, where each line begins
 * with its sender and its timestamp. A screenshot gives neither: the sender is
 * expressed as which side of the screen a bubble sits on — information OCR
 * discards entirely — and the timestamp trails the message instead of leading
 * it. Run through the paste parser, the result is timestamps promoted to
 * senders and six bubbles collapsed into three messages.
 *
 * So screenshots get their own reading of the same text. The paste parser is
 * left exactly as it was, because text input still works and the cost of
 * "improving" a parser that people's evidence already flows through is not
 * worth paying.
 *
 * One honest limitation: with the bubble geometry gone, there is no way to tell
 * her own replies from theirs, so every line is attributed to the same unknown
 * sender. The per-message scoring handles this in practice — her "please stop
 * messaging me" does not read as a threat — but the UI says so rather than
 * implying the attribution is real.
 *
 * @param {string} raw OCR text
 * @param {{maxMessages?: number}} [opts]
 */
export function parseScreenshot(raw, { maxMessages = 150 } = {}) {
  let lines = String(raw ?? '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map(clean)
    .filter((line) => line && !UI_CHROME.test(line));

  const messages = [];
  let sender = 'Them';

  // The contact's name sits alone at the top of the screen. Only the very first
  // line qualifies, so a one-word message further down is not mistaken for it.
  if (lines.length && looksLikeSender(lines[0]) && !STANDALONE_TIME.test(lines[0])) {
    [sender] = lines;
    lines = lines.slice(1);
  }

  /**
   * A chat bubble ends with its timestamp, so a timestamp line marks a
   * boundary and the lines above it are one message however many times the
   * text wrapped. Screenshots without visible times — a comment thread, a
   * cropped grab — get one message per line instead, since there is nothing
   * left to group on and merging would fuse separate threats into one.
   */
  const bubbleMode = lines.filter((line) => STANDALONE_TIME.test(line)).length >= 2;

  let buffer = [];
  const flush = (timestamp = null) => {
    if (!buffer.length) return;
    push(messages, { sender, text: buffer.join(' '), timestamp });
    buffer = [];
  };

  for (const line of lines) {
    if (STANDALONE_TIME.test(line)) {
      const timestamp = line.replace(/^[([]|[)\]]$/g, '');
      if (bubbleMode) {
        flush(timestamp);
      } else {
        const previous = messages.at(-1);
        if (previous && !previous.timestamp) previous.timestamp = timestamp;
      }
      continue;
    }

    // Occasionally the sender really is in the text — a forwarded quote, or a
    // group chat that labels each bubble.
    const match = WA_BRACKET.exec(line) ?? WA_DASH.exec(line) ?? TIME_PREFIX.exec(line);
    if (match) {
      const [, timestamp, who, body] = match;
      flush();
      push(messages, { sender: clean(who), text: clean(body), timestamp: clean(timestamp) });
      continue;
    }

    const senderMatch = SENDER_ONLY.exec(line);
    if (senderMatch && senderMatch[2] && looksLikeSender(clean(senderMatch[1]))) {
      flush();
      push(messages, { sender: clean(senderMatch[1]), text: clean(senderMatch[2]), timestamp: null });
      continue;
    }

    if (bubbleMode) buffer.push(line);
    else push(messages, { sender, text: line, timestamp: null });
  }

  flush();
  return messages.slice(0, maxMessages);
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

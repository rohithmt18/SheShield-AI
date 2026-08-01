import { analysisDigest } from '@sheshieldai/database';
import { chatWithGemini, geminiAvailable } from '../providers/gemini.js';
import { EMERGENCY, EVIDENCE_STEPS } from './resources.js';

/**
 * Companion chat. Falls back to a scripted responder when Gemini is
 * unavailable — less fluent, but it still believes her and still surfaces the
 * right helpline, which is most of the value.
 */

/** Phrases that mean the conversation stops being about logistics. */
const CRISIS = /\b(kill myself|end my life|suicide|suicidal|self harm|self-harm|cut myself|want to die|don'?t want to (?:live|be here)|he'?s (?:outside|here|coming)|following me right now|in danger right now)\b/i;

export function detectCrisis(text) {
  return CRISIS.test(String(text ?? ''));
}

const CRISIS_REPLY = `I'm really glad you told me, and I don't want you to sit with this alone.

If you are in immediate danger, or thinking about hurting yourself, please reach out to a person right now:
• **112** — emergency services
• **Tele-MANAS 14416** — 24/7 mental health support
• **AASRA 9820466726** — someone to talk to, any hour

If you can, tell one person nearby what is happening. None of what has been done to you is your fault, and it is not something you have to carry by yourself. I'm still here.`;

/** Keyword-routed replies for the offline path. */
const SCRIPTS = [
  {
    match: /\b(screenshot|evidence|proof|save|document|record)\b/i,
    reply: () => `Saving evidence before you do anything else is the right instinct — it keeps every option open later.

${EVIDENCE_STEPS.map((s) => `• ${s}`).join('\n')}

Once it's saved, you can block freely. You are not obliged to keep reading anything to "have proof".`,
  },
  {
    match: /\b(report|complain|police|fir|legal|law|lawyer|court)\b/i,
    reply: () => `You can report without giving up your anonymity, and you can stop at any stage.

• **cybercrime.gov.in** — the "Report Women/Child Related Crime" track accepts anonymous complaints
• **1930** — the cyber crime helpline, fastest if money is involved
• **NCW, 7827170170** — files and follows up complaints on your behalf
• Any police station must register a **zero FIR**, even if the incident happened elsewhere

Reporting is a door, not a commitment. Opening it doesn't mean you have to walk through today.`,
  },
  {
    match: /\b(block|ignore|stop (?:talking|replying)|respond|reply back|confront)\b/i,
    reply: () => `You don't owe them a reply, an explanation, or a goodbye message.

Blocking usually reduces contact — but save your screenshots and their profile link first, because blocking can hide both. If they come back through a new account, that pattern is itself worth documenting: repeated contact after being blocked is treated seriously.`,
  },
  {
    match: /\b(nude|intimate|photo|image|video|leak|deepfake|morph)\b/i,
    reply: () => `What's being threatened here is a crime, and the shame belongs entirely to the person doing it — not to you.

Two things that genuinely work:
• **StopNCII.org** — creates a fingerprint of the image on your own device (the image itself never leaves it) and partner platforms block matching uploads
• **Meri Trust, 1800 202 1200** — case workers who pursue takedowns for you, free and confidential

Please don't pay and don't send more. Complying is the one thing that reliably makes it continue.`,
  },
  {
    match: /\b(scared|afraid|terrified|anxious|panic|can'?t sleep|shaking|alone|ashamed|embarrassed|my fault)\b/i,
    reply: () => `That fear makes complete sense. Your body is reacting to something that is genuinely threatening — that's not weakness, and it's not an overreaction.

Nothing you wore, wrote, posted, or replied to makes this your fault. Would it help to talk through what's happening, or would you rather work out a practical next step first? Either is fine.`,
  },
];

const DEFAULT_REPLY = `I'm here, and I'm listening.

Tell me what's been happening in whatever order it comes out — you don't have to explain it neatly. If you'd rather start somewhere concrete, I can help you save evidence, work out reporting options, or just think it through with you.

If anything feels urgent right now: **112** for emergencies, **181** for the women's helpline.`;

function offlineReply(message) {
  for (const script of SCRIPTS) {
    if (script.match.test(message)) return script.reply();
  }
  return DEFAULT_REPLY;
}

/**
 * @param {{role: 'user'|'assistant', content: string}[]} history prior turns
 * @param {string} message the new user message
 * @param {object|null} lastAnalysis the session's most recent analysis, if any
 */
export async function respond(history, message, lastAnalysis = null) {
  if (detectCrisis(message)) {
    return { reply: CRISIS_REPLY, engine: 'safety', crisis: true, emergency: EMERGENCY };
  }

  if (geminiAvailable()) {
    try {
      const context = lastAnalysis ? analysisDigest(lastAnalysis) : null;
      const reply = await chatWithGemini(history, message, context);
      return { reply, engine: 'gemini', crisis: false };
    } catch (err) {
      console.warn(`[chat] Gemini failed, using scripted responder — ${err.message}`);
      return { reply: offlineReply(message), engine: 'offline', crisis: false, degraded: err.message };
    }
  }

  return {
    reply: offlineReply(message),
    engine: 'offline',
    crisis: false,
    degraded: 'No Gemini API key configured.',
  };
}

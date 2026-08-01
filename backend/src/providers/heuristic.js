/**
 * Offline classifier — no network, no API key.
 *
 * This is the fallback when Gemini is unconfigured or unreachable, and it is
 * also what runs in tests. It is deliberately conservative: it would rather
 * miss a subtle case than tell a woman her situation is fine when it is not,
 * so anything matching a threat/sextortion pattern is escalated hard.
 *
 * Output matches the shape `normaliseAnalysis` expects, so the rest of the
 * pipeline cannot tell which engine produced a result.
 */

/**
 * Weighted signals per category. `weight` is the severity contribution when a
 * pattern hits; the highest single hit dominates rather than summing, because
 * one credible threat matters more than ten mild insults.
 */
const SIGNALS = [
  // --- threats -----------------------------------------------------------
  { cat: 'threat_of_violence', weight: 95, re: /\b(i(?:'m| am| will|'ll)? ?(?:going to |gonna |will )?(?:kill|murder|stab|shoot|strangle|end)) (?:you|u|her)\b/i },
  { cat: 'threat_of_violence', weight: 90, re: /\b(rape|assault|beat|hurt|burn|acid) (?:you|u|her)\b/i },
  { cat: 'threat_of_violence', weight: 85, re: /\b(you(?:'re| are)? (?:dead|finished)|watch your back|you'?ll regret|i know where you (?:live|work|study))\b/i },
  { cat: 'threat_of_violence', weight: 70, re: /\b(teach you a lesson|make you (?:pay|suffer)|come (?:after|for) you|ruin your life)\b/i },

  // --- sextortion / blackmail -------------------------------------------
  { cat: 'sextortion', weight: 95, re: /\b(send (?:me )?(?:more |another )?(?:nudes?|pics?|photos?|videos?)|pay (?:me|up)).{0,60}\b(or|otherwise|else|unless)\b/i },
  { cat: 'sextortion', weight: 95, re: /\b(or|otherwise|else|unless).{0,60}\b(i(?:'ll| will) (?:send|post|leak|share|upload|show))\b.{0,40}\b(pics?|photos?|videos?|screenshots?|nudes?|everyone|family|friends|father|mother|boss)\b/i },
  { cat: 'sextortion', weight: 90, re: /\b(i have (?:your |ur )?(?:screenshots?|recordings?|videos?|photos?)|i recorded (?:you|u|it))\b/i },
  { cat: 'sextortion', weight: 85, re: /\b(unless you (?:pay|send|do)|transfer .{0,20}(?:rs|inr|₹|\$)|bitcoin|usdt|gift card)\b.{0,60}\b(delete|keep quiet|not (?:post|share))\b/i },

  // --- non-consensual imagery -------------------------------------------
  { cat: 'non_consensual_imagery', weight: 90, re: /\b(leak|post|upload|share|circulate) (?:your |ur |her )?(?:nudes?|intimate|private|naked|nsfw)\b/i },
  { cat: 'non_consensual_imagery', weight: 85, re: /\b(deepfake|morphed|edited your (?:face|photo)|photoshopped your)\b/i },
  { cat: 'non_consensual_imagery', weight: 80, re: /\b(everyone will see (?:your|ur)|your (?:family|college|office) will see)\b.{0,40}\b(pics?|photos?|videos?|body)\b/i },

  // --- doxxing -----------------------------------------------------------
  { cat: 'doxxing', weight: 85, re: /\b(post|share|expose|leak|publish) (?:your |ur |her )?(?:address|number|phone|location|workplace|college|aadhaar|pan)\b/i },
  { cat: 'doxxing', weight: 75, re: /\b(i (?:have|got|found) your (?:address|number|phone|home|office|aadhaar)|your address is)\b/i },
  { cat: 'doxxing', weight: 70, re: /\b(everyone will know (?:where|who) you)\b/i },

  // --- stalking ----------------------------------------------------------
  { cat: 'stalking', weight: 80, re: /\b(i(?:'m| am)? (?:watching|following|outside|near) (?:you|u|your (?:house|home|office|college)))\b/i },
  { cat: 'stalking', weight: 75, re: /\b(i saw you (?:at|with|near)|i was (?:outside|behind you)|i followed you)\b/i },
  { cat: 'stalking', weight: 65, re: /\b(new number|another account|blocked me).{0,40}\b(still|again|can'?t escape|found you)\b/i },
  { cat: 'stalking', weight: 60, re: /\b(why (?:did|do) you block me|stop blocking me|i'?ll keep (?:calling|texting|messaging))\b/i },

  // --- sexual harassment -------------------------------------------------
  { cat: 'sexual_harassment', weight: 78, re: /\b(send (?:me )?(?:your |ur )?(?:nudes?|naked|topless|boobs?|tits?|pussy|body pics?))\b/i },
  { cat: 'sexual_harassment', weight: 72, re: /\b(want to (?:fuck|sleep with|touch) (?:you|u)|show me (?:your|ur) (?:body|chest|legs))\b/i },
  { cat: 'sexual_harassment', weight: 62, re: /\b(sexy|hot|horny|kiss you|in bed with you|what are you wearing)\b/i },
  { cat: 'sexual_harassment', weight: 58, re: /\b(dirty|naughty) (?:pics?|photos?|videos?|talk)\b/i },

  // --- grooming ----------------------------------------------------------
  { cat: 'grooming', weight: 70, re: /\b(don'?t tell (?:anyone|your (?:parents|mom|dad|friends))|(?:this|it)(?:'s| is) our secret|keep this between us)\b/i },
  { cat: 'grooming', weight: 65, re: /\b(you'?re (?:so )?mature for your age|i'?m the only one who (?:understands|cares)|your (?:parents|friends) don'?t (?:understand|deserve) you)\b/i },
  { cat: 'grooming', weight: 60, re: /\b(how old are you|are you alone|is anyone (?:home|around)|delete (?:these|our) (?:messages|chats?))\b/i },

  // --- impersonation -----------------------------------------------------
  { cat: 'impersonation', weight: 70, re: /\b(fake (?:profile|account|id)|pretending to be (?:you|me)|using your (?:photos?|name|pictures?))\b/i },
  { cat: 'impersonation', weight: 60, re: /\b(made an account (?:as|with) your|catfish)\b/i },

  // --- hate speech -------------------------------------------------------
  { cat: 'hate_speech', weight: 75, re: /\b(women (?:like you |)(?:should|deserve|belong)|go back to the kitchen|women can'?t)\b/i },
  { cat: 'hate_speech', weight: 72, re: /\b(low caste|your caste|dalit|chamar|terrorist|your religion|katua|mullah)\b/i },
  { cat: 'hate_speech', weight: 65, re: /\b(cripple|retard|disabled bitch)\b/i },

  // --- financial exploitation -------------------------------------------
  { cat: 'financial_scam', weight: 72, re: /\b(invest|double your money|guaranteed returns?|crypto opportunity|trading (?:tips?|group))\b.{0,60}\b(now|today|quick|urgent|limited)\b/i },
  { cat: 'financial_scam', weight: 68, re: /\b(send me (?:money|rs|inr|₹|\d+)|need (?:money|cash) urgently|lend me|gift card|upi|paytm|western union)\b/i },
  { cat: 'financial_scam', weight: 60, re: /\b(customs|parcel|package) (?:is )?(?:stuck|held).{0,50}\b(fee|charge|pay)\b/i },

  // --- harassment & abuse ------------------------------------------------
  { cat: 'harassment', weight: 68, re: /\b(bitch|whore|slut|randi|kutti|cunt)\b/i },
  { cat: 'harassment', weight: 60, re: /\b(you(?:'re| are) (?:a )?(?:worthless|pathetic|disgusting|ugly|stupid|useless|garbage|trash))\b/i },
  { cat: 'harassment', weight: 55, re: /\b(kill yourself|kys|nobody (?:likes|wants) you|do everyone a favou?r)\b/i },
  { cat: 'harassment', weight: 45, re: /\b(shut up|shut the fuck up|stfu|you deserve(?:d)? (?:it|this))\b/i },
  { cat: 'harassment', weight: 40, re: /\b(answer me|reply (?:now|damn it)|why (?:are you |)ignoring me|don'?t ignore me)\b/i },
];

/** Softeners — consenting/among-friends banter shouldn't trip the low bands. */
const FRIENDLY = /\b(lol|lmao|haha|😂|🤣|just kidding|jk|love you|miss you|congrats|thank you|thanks)\b/i;

const RATIONALE = {
  harassment: 'Demeaning or abusive language directed at the recipient.',
  sexual_harassment: 'Unwanted sexual content or requests.',
  threat_of_violence: 'Contains a threat of harm.',
  stalking: 'Indicates monitoring, following, or contact after being blocked.',
  grooming: 'Secrecy and isolation tactics consistent with grooming.',
  doxxing: 'Threatens to expose or claims to hold private information.',
  sextortion: 'Demands something under threat of exposure.',
  non_consensual_imagery: 'Concerns intimate imagery shared or threatened without consent.',
  impersonation: 'Refers to a fake account or identity misuse.',
  hate_speech: 'Attacks the recipient on the basis of identity.',
  financial_scam: 'Pressure toward money transfer or an investment hook.',
};

/** Scores one message against every signal. */
function scoreMessage(text) {
  const hits = [];
  for (const sig of SIGNALS) {
    if (sig.re.test(text)) hits.push(sig);
  }
  if (!hits.length) return { severity: 0, categories: [], rationale: '' };

  const top = hits.reduce((a, b) => (b.weight > a.weight ? b : a));
  // Extra categories add a little on top of the dominant signal — a message
  // that is both a threat and doxxing is worse than either alone.
  const categories = [...new Set(hits.map((h) => h.cat))];
  let severity = top.weight + Math.min(10, (categories.length - 1) * 5);

  if (FRIENDLY.test(text) && severity < 60) severity = Math.round(severity * 0.5);

  return {
    severity: Math.max(0, Math.min(100, severity)),
    categories: [top.cat, ...categories.filter((c) => c !== top.cat)],
    rationale: RATIONALE[top.cat] ?? '',
  };
}

/** True when the back half of the conversation is materially worse. */
function detectEscalation(scores) {
  if (scores.length < 4) return false;
  const mid = Math.floor(scores.length / 2);
  const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  const first = avg(scores.slice(0, mid));
  const second = avg(scores.slice(mid));
  return second > first + 12 && second >= 30;
}

/** Named behavioural patterns, derived from the scored set rather than text. */
function detectPatterns(scored) {
  const patterns = [];
  const flagged = scored.filter((m) => m.flagged);
  if (!flagged.length) return patterns;

  const bySender = new Map();
  for (const m of flagged) bySender.set(m.sender, (bySender.get(m.sender) ?? 0) + 1);
  const [worstSender, count] = [...bySender.entries()].sort((a, b) => b[1] - a[1])[0];

  if (count >= 3) {
    patterns.push({
      name: 'Repeated contact from one sender',
      evidence: `${count} concerning messages from "${worstSender}" in this conversation.`,
    });
  }

  const cats = new Set(flagged.flatMap((m) => m.categories));
  if (cats.has('sextortion') || cats.has('non_consensual_imagery')) {
    patterns.push({
      name: 'Image-based coercion',
      evidence: 'Messages reference intimate images being held, demanded, or threatened for release.',
    });
  }
  if (cats.has('stalking') && cats.has('threat_of_violence')) {
    patterns.push({
      name: 'Surveillance paired with threats',
      evidence: 'The sender claims to know your location and also threatens harm — treated as high risk.',
    });
  }
  if (cats.has('grooming')) {
    patterns.push({
      name: 'Secrecy and isolation',
      evidence: 'Requests to keep the conversation hidden from family or friends.',
    });
  }
  const consecutive = scored.some((m, i) =>
    m.flagged && scored[i + 1]?.flagged && scored[i + 2]?.flagged && m.sender === scored[i + 1]?.sender);
  if (consecutive) {
    patterns.push({
      name: 'Sustained barrage',
      evidence: 'Three or more concerning messages sent back to back without a reply.',
    });
  }
  return patterns.slice(0, 8);
}

const ACTIONS = {
  critical: [
    'Do not reply or comply with any demand — complying almost always escalates it.',
    'Screenshot everything now, including profile names, handles, and timestamps.',
    'Call 1930 (cyber financial crime) or 112 (emergency) — and 181 for the women’s helpline.',
    'File a complaint at cybercrime.gov.in; the "Report Women/Child Related Crime" track allows anonymity.',
    'Tell one person you trust today so you are not handling this alone.',
  ],
  high: [
    'Stop engaging — every reply gives the sender information and encouragement.',
    'Save evidence before blocking: screenshots plus the account URL or phone number.',
    'Report the account in-platform and file at cybercrime.gov.in.',
    'Consider tightening privacy settings and reviewing who can see your posts.',
  ],
  medium: [
    'Save screenshots now, while the messages still exist.',
    'Block or mute the sender — you owe no explanation.',
    'Report the account to the platform.',
    'Keep a short log of dates and what happened, in case this continues.',
  ],
  low: [
    'Keep a copy of these messages in case the behaviour repeats.',
    'Consider muting or restricting the sender.',
    'Revisit your privacy settings for who can message you.',
  ],
  none: [
    'Nothing here needs action. Trust your instincts — you can re-check anything, anytime.',
  ],
};

/**
 * Analyses a parsed conversation offline.
 * @param {{sender?: string, text: string, timestamp?: string}[]} messages
 * @returns raw analysis in the shape `normaliseAnalysis` consumes
 */
export function analyseHeuristically(messages) {
  const scored = messages.map((msg, index) => {
    const { severity, categories, rationale } = scoreMessage(msg.text ?? '');
    const flagged = severity >= 20;
    return {
      index,
      sender: msg.sender ?? 'unknown',
      flagged,
      severity,
      categories: flagged ? categories : [],
      rationale: flagged ? rationale : '',
    };
  });

  const severities = scored.map((m) => m.severity);
  const flagged = scored.filter((m) => m.flagged);
  const peak = severities.length ? Math.max(...severities) : 0;
  const flaggedRatio = scored.length ? flagged.length / scored.length : 0;

  // The worst message sets the floor; sustained abuse across many messages
  // pushes it higher still.
  let overall = peak;
  if (flagged.length >= 3) overall = Math.min(100, overall + 5);
  if (flaggedRatio > 0.5 && flagged.length >= 3) overall = Math.min(100, overall + 5);

  const escalating = detectEscalation(severities);
  if (escalating) overall = Math.min(100, overall + 5);

  const counts = new Map();
  for (const m of flagged) {
    for (const c of m.categories) counts.set(c, (counts.get(c) ?? 0) + 1);
  }
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c);
  const primaryCategory = flagged.length
    ? flagged.reduce((a, b) => (b.severity > a.severity ? b : a)).categories[0] ?? 'none'
    : 'none';

  const level = overall >= 85 ? 'critical'
    : overall >= 65 ? 'high'
    : overall >= 40 ? 'medium'
    : overall >= 20 ? 'low' : 'none';

  return {
    overallSeverity: overall,
    primaryCategory,
    categories: ranked.length ? ranked : ['none'],
    escalating,
    summary: buildSummary({ scored, flagged, level, primaryCategory, escalating }),
    patterns: detectPatterns(scored.map((m, i) => ({ ...m, text: messages[i]?.text ?? '' }))),
    recommendedActions: ACTIONS[level],
    messages: scored,
  };
}

function buildSummary({ scored, flagged, level, primaryCategory, escalating }) {
  if (!flagged.length) {
    return `Checked ${scored.length} message${scored.length === 1 ? '' : 's'} and found nothing matching a known harm pattern. `
      + 'This is an automated check, not a verdict — if something still feels wrong, that instinct is worth listening to.';
  }

  const labels = {
    harassment: 'harassment and abuse',
    sexual_harassment: 'sexual harassment',
    threat_of_violence: 'threats of violence',
    stalking: 'cyberstalking',
    grooming: 'grooming behaviour',
    doxxing: 'doxxing',
    sextortion: 'sextortion',
    non_consensual_imagery: 'non-consensual imagery',
    impersonation: 'impersonation',
    hate_speech: 'hate speech',
    financial_scam: 'financial exploitation',
  };

  const parts = [
    `${flagged.length} of ${scored.length} message${scored.length === 1 ? '' : 's'} showed signs of `
      + `${labels[primaryCategory] ?? 'abuse'}, assessed as ${level} risk.`,
  ];
  if (escalating) parts.push('The tone gets worse over the course of the conversation, which is a known warning sign.');
  if (level === 'critical' || level === 'high') {
    parts.push('None of this is your fault, and you do not have to respond to it. Preserving evidence now gives you options later.');
  } else {
    parts.push('You are not overreacting by documenting this.');
  }
  parts.push('Offline analysis — pattern matching only, without an AI model.');
  return parts.join(' ');
}

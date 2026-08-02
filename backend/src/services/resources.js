/**
 * Help directory, routed by incident category and severity.
 *
 * India-first, because the taxonomy and legal context are India-first. Numbers
 * here are national and toll-free unless noted. Everything is static — no
 * lookup, no network — so the help panel still renders when the AI is down.
 *
 * `phone` and `url` are separate fields rather than one display string. They
 * become separate actions in the UI, and a woman who wants to call should not
 * have to pick a number out of "7827170170 · ncw.nic.in" and dial it by hand.
 * `contact` is still derived for the PDF and for anything that wants one line.
 *
 * On the data itself: every domain below was resolved before being written
 * here, and three that shipped earlier did not exist. A phone number that
 * rings nobody is worse than no number at all, so state units carry 1930 —
 * the national cyber helpline, which routes to the caller's own state — and
 * link to the official state site for the local station's direct line, rather
 * than carrying numbers this repo cannot keep current.
 */

/** Attaches a single-line `contact` so existing consumers keep working. */
const withContact = (entry) => ({
  ...entry,
  contact: [entry.phone, entry.url?.replace(/^https?:\/\//, '')].filter(Boolean).join(' · '),
});

export const EMERGENCY = [
  {
    id: 'emergency-112',
    name: 'Emergency Response Support System',
    phone: '112',
    kind: 'helpline',
    hours: '24/7',
    blurb: 'Single national emergency number for police, fire, and ambulance.',
  },
  {
    id: 'women-181',
    name: 'Women’s Helpline',
    phone: '181',
    kind: 'helpline',
    hours: '24/7',
    blurb: 'Crisis support, counselling, and referral for women in distress.',
  },
  {
    id: 'cyber-1930',
    name: 'National Cyber Crime Helpline',
    phone: '1930',
    kind: 'helpline',
    hours: '24/7',
    blurb: 'Report cyber financial fraud and online crime. Fastest route to freezing a fraudulent transfer.',
  },
].map(withContact);

const DIRECTORY = [
  {
    id: 'cybercrime-portal',
    name: 'National Cyber Crime Reporting Portal',
    url: 'https://cybercrime.gov.in',
    kind: 'portal',
    hours: 'Always open',
    blurb: 'Official complaint portal. The "Report Women/Child Related Crime" track allows anonymous reporting.',
    categories: ['*'],
  },
  {
    id: 'ncw',
    name: 'National Commission for Women',
    phone: '7827170170',
    url: 'https://ncw.nic.in',
    kind: 'authority',
    hours: 'Mon–Fri, 9am–5:30pm',
    blurb: 'Files and follows up complaints of harassment and abuse against women.',
    categories: ['*'],
  },
  {
    id: 'rati-meri-trust',
    name: 'Rati Foundation — Meri Trust',
    phone: '1800 202 1200',
    // No url: the domain guessed from the organisation's name does not resolve,
    // and an unverified link in a directory like this is worse than none.
    kind: 'ngo',
    hours: 'Mon–Sat, 10am–6pm',
    blurb: 'Case workers who help get non-consensual images taken down, free and confidential.',
    categories: ['non_consensual_imagery', 'sextortion', 'grooming', 'sexual_harassment'],
  },
  {
    id: 'stopncii',
    name: 'StopNCII.org',
    url: 'https://stopncii.org',
    kind: 'takedown',
    hours: 'Always open',
    blurb: 'Creates a fingerprint of your intimate image on your own device — the image never leaves it — and partner platforms block matching uploads.',
    categories: ['non_consensual_imagery', 'sextortion'],
  },
  {
    id: 'cyber-peace',
    name: 'CyberPeace Foundation',
    phone: '+91 82350 58865',
    url: 'https://www.cyberpeace.org',
    kind: 'ngo',
    hours: 'Mon–Fri, 10am–6pm',
    blurb: 'Cybercrime helpline and digital-safety guidance.',
    categories: ['*'],
  },
  {
    id: 'aks',
    name: 'Aks Foundation',
    phone: '8793088814',
    kind: 'ngo',
    hours: '24/7',
    blurb: 'Support for survivors of sexual and domestic violence, including counselling and legal aid.',
    categories: ['sexual_harassment', 'threat_of_violence', 'stalking', 'sextortion'],
  },
  {
    id: 'sneha-india',
    name: 'SNEHA India',
    phone: '044 2464 0050',
    url: 'https://snehaindia.org',
    kind: 'mental-health',
    hours: '24/7',
    blurb: 'Emotional support and suicide-prevention counselling, based in Chennai and open to callers anywhere.',
    categories: ['*'],
  },
  {
    id: 'tele-manas',
    name: 'Tele-MANAS',
    phone: '14416',
    kind: 'mental-health',
    hours: '24/7',
    blurb: 'Government mental-health support line, available in multiple languages.',
    categories: ['*'],
  },
  {
    id: 'aasra',
    name: 'AASRA',
    phone: '9820466726',
    kind: 'mental-health',
    hours: '24/7',
    blurb: 'Crisis counselling for anyone feeling overwhelmed or suicidal.',
    categories: ['*'],
  },
  {
    id: 'childline',
    name: 'Childline India',
    phone: '1098',
    kind: 'helpline',
    hours: '24/7',
    blurb: 'For anyone under 18, or an adult concerned about a child.',
    categories: ['grooming'],
  },
  {
    id: 'cyber-cell',
    name: 'Local Cyber Crime Cell',
    phone: '1930',
    url: 'https://cybercrime.gov.in',
    kind: 'authority',
    hours: 'Office hours',
    blurb: 'Every district has one, and 1930 routes you to your state\'s unit. An FIR can be filed at any police station regardless of where the crime happened (zero FIR).',
    categories: ['threat_of_violence', 'stalking', 'doxxing', 'sextortion', 'impersonation', 'non_consensual_imagery'],
  },
].map(withContact);

/**
 * State-level cyber units, and the local organisations that work in each state.
 *
 * The national portal covers everyone, but an FIR is filed locally, so the
 * nearest unit is the one that actually moves. Each entry carries the official
 * state site — every one of these resolved when written, and three that shipped
 * before this did not exist at all (`mahacyber.in`, `tgcsb.telangana.gov.in`,
 * `cid.gujarat.gov.in`).
 *
 * `phone` is 1930 throughout, deliberately. It is the national cyber helpline
 * and it routes the caller to their own state's unit, so it is both correct and
 * stable. Direct station numbers change without notice, and one that rings
 * nobody at 2am is worse than the number that always works — the official site
 * is linked for anyone who wants the local desk.
 *
 * `ngos` are organisations physically working in that state. They are additions
 * to the national list, not replacements: a woman in Kerala can still call
 * anything in the main directory.
 */
const REGIONS = {
  delhi: {
    name: 'Delhi',
    unit: 'Delhi Police Cyber Cell',
    phone: '1930',
    url: 'https://delhipolice.gov.in',
    ngos: [
      {
        id: 'jagori',
        name: 'Jagori',
        phone: '011 2669 2700',
        url: 'https://jagori.org',
        kind: 'ngo',
        hours: 'Mon–Fri, 9:30am–5:30pm',
        blurb: 'Delhi women’s resource centre — counselling, legal referral, and safety support.',
      },
    ],
  },
  maharashtra: {
    name: 'Maharashtra',
    unit: 'Maharashtra Cyber',
    phone: '1930',
    url: 'https://mhcyber.gov.in',
    ngos: [
      {
        id: 'aks-mh',
        name: 'Aks Foundation',
        phone: '8793088814',
        kind: 'ngo',
        hours: '24/7',
        blurb: 'Mumbai-based 24/7 helpline for survivors of sexual and domestic violence, with counselling and legal aid.',
      },
    ],
  },
  karnataka: {
    name: 'Karnataka',
    unit: 'CEN Police Station (Bengaluru City)',
    phone: '1930',
    url: 'https://ksp.karnataka.gov.in',
    ngos: [
      {
        id: 'vimochana',
        name: 'Vimochana',
        phone: '080 2549 2781',
        url: 'https://www.vimochana.co.in',
        kind: 'ngo',
        hours: 'Mon–Sat, 10am–6pm',
        blurb: 'Bengaluru women’s rights organisation. Its Angala centre gives crisis, legal, and shelter support.',
      },
    ],
  },
  telangana: {
    name: 'Telangana',
    unit: 'Telangana Cyber Security Bureau',
    phone: '1930',
    url: 'https://tspolice.gov.in',
    ngos: [],
  },
  'tamil-nadu': {
    name: 'Tamil Nadu',
    unit: 'TN Cyber Crime Wing',
    phone: '1930',
    url: 'https://eservices.tnpolice.gov.in',
    ngos: [
      {
        id: 'sneha-tn',
        name: 'SNEHA India',
        phone: '044 2464 0050',
        url: 'https://snehaindia.org',
        kind: 'mental-health',
        hours: '24/7',
        blurb: 'Chennai-based 24/7 emotional support and suicide-prevention counselling.',
      },
    ],
  },
  'west-bengal': {
    name: 'West Bengal',
    unit: 'WB Cyber Crime Police Station',
    phone: '1930',
    url: 'https://wbpolice.gov.in',
    ngos: [
      {
        id: 'swayam',
        name: 'Swayam',
        phone: '033 2486 3367',
        url: 'https://www.swayam.info',
        kind: 'ngo',
        hours: 'Mon–Fri, 10am–6pm',
        blurb: 'Kolkata organisation ending violence against women — counselling, legal advice, and police follow-up.',
      },
    ],
  },
  gujarat: {
    name: 'Gujarat',
    unit: 'CID Crime Cyber Cell',
    phone: '1930',
    url: 'https://cybernodal.gujarat.gov.in',
    ngos: [],
  },
  'uttar-pradesh': {
    name: 'Uttar Pradesh',
    unit: 'UP Cyber Crime Police Station',
    phone: '1930',
    url: 'https://uppolice.gov.in',
    ngos: [],
  },
  rajasthan: {
    name: 'Rajasthan',
    unit: 'Rajasthan Police Cyber Cell',
    phone: '1930',
    url: 'https://police.rajasthan.gov.in',
    ngos: [],
  },
  kerala: {
    name: 'Kerala',
    unit: 'Kerala Police Cyberdome',
    phone: '1930',
    url: 'https://cyberdome.kerala.gov.in',
    ngos: [],
  },
};

export const REGION_OPTIONS = Object.entries(REGIONS)
  .map(([id, r]) => ({ id, name: r.name }))
  .sort((a, b) => a.name.localeCompare(b.name));

/** Practical steps that apply regardless of which platform is involved. */
export const EVIDENCE_STEPS = [
  'Screenshot the full conversation — include the profile name, handle, and visible timestamps.',
  'Photograph the screen with another device too; it captures what a screenshot sometimes crops.',
  'Copy the profile URL or phone number before you block, because blocking can hide it.',
  'Save everything to one folder, and back it up somewhere the sender cannot reach.',
  'Do not edit or crop the originals — keep an untouched copy even if you share a redacted one.',
];

/**
 * @param {string[]} categories detected categories, most relevant first
 * @param {string} level none | low | medium | high | critical
 * @param {string} [region] state id from REGION_OPTIONS
 */
export function resourcesFor(categories = [], level = 'none', region = '') {
  const keys = categories.filter((c) => c && c !== 'none');

  const scored = DIRECTORY.map((entry) => {
    const universal = entry.categories.includes('*');
    const matched = entry.categories.filter((c) => keys.includes(c));
    return { entry, score: matched.length * 10 + (universal ? 1 : 0) };
  })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((r) => r.entry);

  const urgent = level === 'critical' || level === 'high';
  const local = REGIONS[region];

  const directory = scored.slice(0, 8);
  if (local) {
    // The local unit outranks the generic "find your district cell" entry.
    const generic = directory.findIndex((e) => e.id === 'cyber-cell');
    const entry = withContact({
      id: `cyber-cell-${region}`,
      name: local.unit,
      phone: local.phone,
      url: local.url,
      kind: 'authority',
      hours: 'Office hours',
      blurb: `Cyber crime unit for ${local.name}. 1930 routes you to it, and an FIR can be filed `
        + 'at any police station regardless of where the crime happened (zero FIR).',
    });
    if (generic >= 0) directory.splice(generic, 1, entry);
    else directory.unshift(entry);

    // Local organisations go directly under the local unit, ahead of national
    // ones: someone who can be seen in person is a different kind of help.
    //
    // An organisation already in the national list is moved rather than
    // repeated — Aks is national *and* Maharashtra's local option, and it
    // should appear once, marked local, with the state-specific description.
    const promoted = (local.ngos ?? []).map(withContact).map((ngo) => {
      const duplicate = directory.findIndex((e) => e.name === ngo.name);
      if (duplicate >= 0) directory.splice(duplicate, 1);
      return { ...ngo, local: true };
    });
    directory.splice(directory.indexOf(entry) + 1, 0, ...promoted);
  }

  return {
    urgent,
    region: local
      ? { id: region, name: local.name, unit: local.unit, phone: local.phone, url: local.url, contact: [local.phone, local.url?.replace(/^https?:\/\//, '')].filter(Boolean).join(' · ') }
      : null,
    emergency: urgent ? EMERGENCY : EMERGENCY.filter((e) => e.id !== 'emergency-112'),
    directory,
    evidenceSteps: EVIDENCE_STEPS,
  };
}

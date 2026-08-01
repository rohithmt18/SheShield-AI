/**
 * Help directory, routed by incident category and severity.
 *
 * India-first, because the taxonomy and legal context are India-first. Numbers
 * here are national and toll-free unless noted. Everything is static — no
 * lookup, no network — so the help panel still renders when the AI is down.
 */

export const EMERGENCY = [
  {
    id: 'emergency-112',
    name: 'Emergency Response Support System',
    contact: '112',
    kind: 'helpline',
    hours: '24/7',
    blurb: 'Single national emergency number for police, fire, and ambulance.',
  },
  {
    id: 'women-181',
    name: 'Women’s Helpline',
    contact: '181',
    kind: 'helpline',
    hours: '24/7',
    blurb: 'Crisis support, counselling, and referral for women in distress.',
  },
  {
    id: 'cyber-1930',
    name: 'National Cyber Crime Helpline',
    contact: '1930',
    kind: 'helpline',
    hours: '24/7',
    blurb: 'Report cyber financial fraud and online crime. Fastest route to freezing a fraudulent transfer.',
  },
];

const DIRECTORY = [
  {
    id: 'cybercrime-portal',
    name: 'National Cyber Crime Reporting Portal',
    contact: 'cybercrime.gov.in',
    kind: 'portal',
    hours: 'Always open',
    blurb: 'Official complaint portal. The "Report Women/Child Related Crime" track allows anonymous reporting.',
    categories: ['*'],
  },
  {
    id: 'ncw',
    name: 'National Commission for Women',
    contact: '7827170170 · ncw.nic.in',
    kind: 'authority',
    hours: 'Mon–Fri, 9am–5:30pm',
    blurb: 'Files and follows up complaints of harassment and abuse against women.',
    categories: ['*'],
  },
  {
    id: 'rati-meri-trust',
    name: 'Rati Foundation — Meri Trust',
    contact: '1800 202 1200',
    kind: 'ngo',
    hours: 'Mon–Sat, 10am–6pm',
    blurb: 'Case workers who help get non-consensual images taken down, free and confidential.',
    categories: ['non_consensual_imagery', 'sextortion', 'grooming', 'sexual_harassment'],
  },
  {
    id: 'stopncii',
    name: 'StopNCII.org',
    contact: 'stopncii.org',
    kind: 'takedown',
    hours: 'Always open',
    blurb: 'Creates a fingerprint of your intimate image on your own device — the image never leaves it — and partner platforms block matching uploads.',
    categories: ['non_consensual_imagery', 'sextortion'],
  },
  {
    id: 'cyber-peace',
    name: 'CyberPeace Foundation',
    contact: 'cyberpeace.org · +91 82350 58865',
    kind: 'ngo',
    hours: 'Mon–Fri, 10am–6pm',
    blurb: 'Cybercrime helpline and digital-safety guidance.',
    categories: ['*'],
  },
  {
    id: 'aks',
    name: 'Aks Foundation',
    contact: '8793088814',
    kind: 'ngo',
    hours: '24/7',
    blurb: 'Support for survivors of sexual and domestic violence, including counselling and legal aid.',
    categories: ['sexual_harassment', 'threat_of_violence', 'stalking', 'sextortion'],
  },
  {
    id: 'sneha',
    name: 'SNEHA',
    contact: '+91 44 2464 0050',
    kind: 'ngo',
    hours: '24/7',
    blurb: 'Emotional support and suicide-prevention counselling.',
    categories: ['*'],
  },
  {
    id: 'tele-manas',
    name: 'Tele-MANAS',
    contact: '14416',
    kind: 'mental-health',
    hours: '24/7',
    blurb: 'Government mental-health support line, available in multiple languages.',
    categories: ['*'],
  },
  {
    id: 'aasra',
    name: 'AASRA',
    contact: '9820466726',
    kind: 'mental-health',
    hours: '24/7',
    blurb: 'Crisis counselling for anyone feeling overwhelmed or suicidal.',
    categories: ['*'],
  },
  {
    id: 'childline',
    name: 'Childline India',
    contact: '1098',
    kind: 'helpline',
    hours: '24/7',
    blurb: 'For anyone under 18, or an adult concerned about a child.',
    categories: ['grooming'],
  },
  {
    id: 'cyber-cell',
    name: 'Local Cyber Crime Cell',
    contact: 'Your district police website',
    kind: 'authority',
    hours: 'Office hours',
    blurb: 'Every district has one. An FIR can be filed at any police station regardless of where the crime happened (zero FIR).',
    categories: ['threat_of_violence', 'stalking', 'doxxing', 'sextortion', 'impersonation', 'non_consensual_imagery'],
  },
];

/**
 * State-level cyber cells. The national portal covers everyone, but an FIR is
 * filed locally, so the nearest unit is the one that actually moves.
 */
const REGIONS = {
  delhi: { name: 'Delhi', unit: 'Delhi Police Cyber Cell', contact: '011-2749 0151 · delhipolice.gov.in' },
  maharashtra: { name: 'Maharashtra', unit: 'Maharashtra Cyber', contact: '022-2202 6636 · mahacyber.in' },
  karnataka: { name: 'Karnataka', unit: 'CEN Police Station (Bengaluru City)', contact: '080-2294 3050 · ksp.karnataka.gov.in' },
  telangana: { name: 'Telangana', unit: 'Telangana Cyber Security Bureau', contact: '040-2785 2274 · tgcsb.telangana.gov.in' },
  'tamil-nadu': { name: 'Tamil Nadu', unit: 'TN Cyber Crime Wing', contact: '044-2856 5750 · eservices.tnpolice.gov.in' },
  'west-bengal': { name: 'West Bengal', unit: 'WB Cyber Crime Police Station', contact: '033-2214 3230 · wbpolice.gov.in' },
  gujarat: { name: 'Gujarat', unit: 'CID Crime Cyber Cell', contact: '079-2325 4344 · cid.gujarat.gov.in' },
  'uttar-pradesh': { name: 'Uttar Pradesh', unit: 'UP Cyber Crime Police Station', contact: '0522-2390 000 · uppolice.gov.in' },
  rajasthan: { name: 'Rajasthan', unit: 'Rajasthan Police Cyber Cell', contact: '0141-2744 000 · police.rajasthan.gov.in' },
  kerala: { name: 'Kerala', unit: 'Kerala Police Cyberdome', contact: '0471-2722 500 · cyberdome.kerala.gov.in' },
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
    const entry = {
      id: `cyber-cell-${region}`,
      name: local.unit,
      contact: local.contact,
      kind: 'authority',
      hours: 'Office hours',
      blurb: `Cyber crime unit for ${local.name}. An FIR can be filed at any police station regardless of where the crime happened (zero FIR).`,
    };
    if (generic >= 0) directory.splice(generic, 1, entry);
    else directory.unshift(entry);
  }

  return {
    urgent,
    region: local ? { id: region, ...local } : null,
    emergency: urgent ? EMERGENCY : EMERGENCY.filter((e) => e.id !== 'emergency-112'),
    directory,
    evidenceSteps: EVIDENCE_STEPS,
  };
}

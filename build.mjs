// Builds the visa rules for every passport:
//   rules/<passport>.json  full file (format tm-visa-rules v1) — what the app downloads
//   index.json             passports + generation date
//   all.json               compact snapshot of every passport — bundled into the app
//
// Sources: passport-index-data (MIT, https://github.com/imorte/passport-index-data)
// for the requirement and number of days, then overrides.json (hand-checked, with
// official sources) for how the days count. A bare "N days" becomes N in 180 days and
// is marked approximate — the safer reading until someone checks it.
//
//   node build.mjs            (downloads the latest passport-index CSV)
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const CSV_URL = 'https://raw.githubusercontent.com/imorte/passport-index-data/main/passport-index-tidy-iso2.csv';
const CSV = '.cache/passport-index-tidy-iso2.csv';
mkdirSync('.cache', { recursive: true });
mkdirSync('rules', { recursive: true });
if (!existsSync(CSV) || process.argv.includes('--fresh')) execFileSync('curl', ['-sSL', '-o', CSV, CSV_URL], { stdio: 'inherit' });

// Keep in sync with the app's src/countries/schengen.ts.
const SCHENGEN = ['AT','BE','BG','HR','CZ','DK','EE','FI','FR','DE','GR','HU','IS','IT','LV','LI','LT','LU','MT','NL','NO','PL','PT','RO','SK','SI','ES','SE','CH','MC','SM','VA'];
const FREE_MOVEMENT = ['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE','IS','LI','NO','CH'];
// The app treats Kosovo as part of Serbia.
const SKIP = new Set(['XK']);

const today = new Date().toISOString().slice(0, 10);
const overrides = JSON.parse(readFileSync('overrides.json', 'utf8'));

function ruleFrom(value) {
  const v = value.trim().toLowerCase();
  if (/^\d+$/.test(v)) {
    const n = Number(v);
    return n <= 90
      ? { req: 'free', limits: [{ kind: 'rolling', days: n, window: 180 }], approx: true }
      : { req: 'free', limits: [{ kind: 'stay', days: n }], approx: true };
  }
  return (
    {
      'visa free': { req: 'free', limits: [] },
      'visa on arrival': { req: 'arrival', limits: [] },
      'e-visa': { req: 'evisa', limits: [] },
      eta: { req: 'eta', limits: [] },
      'visa required': { req: 'required', limits: [] },
      'no admission': { req: 'banned', limits: [] },
    }[v] ?? null
  );
}

const byPassport = new Map();
for (const line of readFileSync(CSV, 'utf8').split(/\r?\n/).slice(1)) {
  const [p, d, value] = line.split(',');
  if (!p || !d || value === '-1' || SKIP.has(p) || SKIP.has(d)) continue;
  const rule = ruleFrom(value);
  if (!rule) continue;
  if (!byPassport.has(p)) byPassport.set(p, {});
  byPassport.get(p)[d] = rule;
}

function schengenRule(passport, rules) {
  if (FREE_MOVEMENT.includes(passport)) return { req: 'free', limits: [] };
  const sample = rules.DE ?? rules.FR ?? rules.IT;
  if (!sample) return null;
  return sample.req === 'free'
    ? { req: 'free', limits: [{ kind: 'rolling', days: 90, window: 180 }], note: 'Schengen area: 90 days in any 180.', src: 'https://home-affairs.ec.europa.eu/policies/schengen-borders-and-visa/border-crossing_en', checked: today }
    : { ...sample, limits: [] };
}

// ---- compact encoding (keep in sync with the app's src/domain/visaRules.ts)
const REQ_CODE = { free: 'F', arrival: 'A', evisa: 'E', eta: 'T', required: 'R', banned: 'B' };
function encode(rules) {
  const out = {};
  for (const [k, r] of Object.entries(rules)) {
    const parts = [REQ_CODE[r.req]];
    for (const l of r.limits) parts.push(l.kind === 'rolling' ? `r${l.days}/${l.window}` : l.kind === 'year' ? `y${l.days}` : `s${l.days}`);
    if (r.approx) parts.push('~');
    if (r.passportDays !== undefined) parts.push(`p${r.passportDays}`);
    if (r.checked) parts.push(`c${r.checked}`);
    if (r.src) parts.push(`@${r.src}`);
    if (r.note) parts.push(`#${r.note.replace(/\|/g, '/')}`);
    out[k] = parts.join('|');
  }
  return out;
}

const all = { generated: today, source: 'passport-index-data + overrides', passports: {} };
const index = { generated: today, passports: [] };
for (const [passport, raw] of [...byPassport].sort()) {
  const rules = {};
  for (const [d, r] of Object.entries(raw)) if (!SCHENGEN.includes(d)) rules[d] = r; // Schengen members count as one zone
  const sch = schengenRule(passport, raw);
  if (sch) rules.SCHENGEN = sch;
  for (const [d, r] of Object.entries(overrides[passport] ?? {})) rules[d] = r;
  const file = { format: 'tm-visa-rules', version: 1, passport, generated: today, source: 'passport-index-data (MIT) + checked overrides', rules };
  writeFileSync(`rules/${passport.toLowerCase()}.json`, JSON.stringify(file, null, 1));
  all.passports[passport] = encode(rules);
  index.passports.push(passport);
}
writeFileSync('index.json', JSON.stringify(index, null, 1));
writeFileSync('all.json', JSON.stringify(all));
console.log(`${index.passports.length} passports · rules/rs.json ${(readFileSync('rules/rs.json').length / 1024).toFixed(0)} KB · all.json ${(readFileSync('all.json').length / 1024).toFixed(0)} KB`);

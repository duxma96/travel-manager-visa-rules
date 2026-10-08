// Builds visa-types.json (format tm-visa-types v1) from visa-types/<CC>.json — one
// file per destination, every visa type it issues, the same for every passport.
// Validates each entry the way the app does and fails loudly on the first problem.
//
//   node build-types.mjs
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';

const CATEGORIES = ['tourist', 'business', 'transit', 'student', 'work', 'family', 'residence', 'immigrant', 'other'];
const ENTRIES = ['single', 'multiple', 'varies'];
const KEY = /^([A-Z]{2}|SCHENGEN)$/;
const ID = /^[A-Za-z0-9._-]{1,24}$/;
const https = (v) => typeof v === 'string' && /^https:\/\/\S+$/.test(v) && v.length <= 500;
const date = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

function checkLimit(l) {
  const int = (v, a, b) => Number.isInteger(v) && v >= a && v <= b;
  if (!l || !int(l.days, 1, 3650)) return false;
  if (l.kind === 'rolling') return int(l.window, 1, 3650) && l.window >= l.days;
  if (l.kind === 'year') return l.days <= 366;
  return l.kind === 'stay';
}

const countries = {};
let types = 0;
for (const f of readdirSync('visa-types').filter((f) => f.endsWith('.json')).sort()) {
  const { country, types: list } = JSON.parse(readFileSync(`visa-types/${f}`, 'utf8'));
  const fail = (i, field) => {
    throw new Error(`${f}: type ${i + 1} (${list[i]?.id ?? '?'}): bad "${field}"`);
  };
  if (!KEY.test(country) || `${country}.json` !== f) throw new Error(`${f}: "country" must be ${f.replace('.json', '')}`);
  const ids = new Set();
  list.forEach((t, i) => {
    if (!ID.test(t.id ?? '') || ids.has(t.id)) fail(i, 'id');
    ids.add(t.id);
    if (!t.name?.trim()) fail(i, 'name');
    if (!CATEGORIES.includes(t.category)) fail(i, 'category');
    if (!t.purpose?.trim()) fail(i, 'purpose');
    if (!Array.isArray(t.limits) || !t.limits.every(checkLimit)) fail(i, 'limits');
    if (!https(t.src)) fail(i, 'src');
    if (t.apply !== undefined && !https(t.apply)) fail(i, 'apply');
    if (t.entries !== undefined && !ENTRIES.includes(t.entries)) fail(i, 'entries');
    if (!date(t.checked)) fail(i, 'checked');
  });
  countries[country] = list;
  types += list.length;
}

const generated = new Date().toISOString().slice(0, 10);
writeFileSync('visa-types.json', JSON.stringify({ format: 'tm-visa-types', version: 1, generated, source: 'Official immigration and consular sites; reviewed in pull requests', countries }));
console.log(`visa-types.json: ${Object.keys(countries).length} destinations, ${types} visa types`);

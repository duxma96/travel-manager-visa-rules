// Checks every src/apply link in visa-types/*.json. Some official sites block scripts
// (Cloudflare/Akamai: travel.state.gov, canada.ca…) — those are listed as "blocked,
// check by hand" rather than failing, so a reviewer opens them in a browser.
//
//   node check-links.mjs [CC ...]
import { readdirSync, readFileSync } from 'node:fs';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36';
const only = new Set(process.argv.slice(2));
const urls = new Map();
for (const f of readdirSync('visa-types').filter((f) => f.endsWith('.json'))) {
  const { country, types } = JSON.parse(readFileSync(`visa-types/${f}`, 'utf8'));
  if (only.size && !only.has(country)) continue;
  for (const t of types) for (const u of [t.src, t.apply].filter(Boolean)) urls.set(u, [...(urls.get(u) ?? []), `${country}/${t.id}`]);
}

const bad = [];
const blocked = [];
await Promise.all(
  [...urls.keys()].map(async (u) => {
    try {
      const r = await fetch(u, { headers: { 'User-Agent': UA }, redirect: 'follow', signal: AbortSignal.timeout(30000) });
      if (r.status === 404 || r.status === 410) bad.push(`${r.status} ${u}  (${urls.get(u).join(', ')})`);
      else if (r.status >= 400) blocked.push(`${r.status} ${u}`);
    } catch (e) {
      blocked.push(`ERR ${u} (${e.cause?.code ?? e.name})`);
    }
  }),
);
console.log(`${urls.size} links checked`);
if (blocked.length) console.log(`blocked, check by hand:\n  ${blocked.sort().join('\n  ')}`);
if (bad.length) {
  console.log(`BROKEN:\n  ${bad.sort().join('\n  ')}`);
  process.exit(1);
}

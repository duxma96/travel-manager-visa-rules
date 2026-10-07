# Travel Manager visa rules

Visa rules for every passport, used by the Travel Manager 90-180 app (offline Android app).
No personal data — only general entry rules.

- `rules/<passport>.json` — full rules for one passport (format `tm-visa-rules` v1); what the app downloads.
- `all.json` — compact snapshot of every passport, bundled into each app release.
- `overrides.json` — hand-checked rules (how days are counted), each with an official source and check date.
- `build.mjs` — regenerates everything: `node build.mjs --fresh`.

**Sources:** [passport-index-data](https://github.com/imorte/passport-index-data) (MIT) for whether a visa is
needed and for how many days; official pages (e.g. the Serbian MFA's per-country pages) for how the days count.
A bare "N days" is read as N days in any 180 and marked approximate until checked.

**Updates:** twice a year (1 February, 1 July) a scheduled job refreshes the data and opens a pull request.
Nothing reaches the apps until it is reviewed and merged.

Not legal advice: always confirm with the embassy before you travel.

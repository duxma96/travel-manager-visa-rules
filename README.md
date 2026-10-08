# Travel Manager visa rules

Visa rules for every passport and the visa types of every country, used by the Travel Manager 90-180 app
(offline Android app). No personal data — only general entry rules.

**Rules per passport**

- `rules/<passport>.json` — full rules for one passport (format `tm-visa-rules` v1); what the app downloads.
- `all.json` — compact snapshot of every passport, bundled into each app release.
- `overrides.json` — hand-checked rules (how days are counted), per passport, each with an official source and check date.
- `passports.json` — the passports researched in depth. To ask for yours, open an
  [Add a passport](../../issues/new?template=add-passport.md) issue.
- `build.mjs` — regenerates everything: `node build.mjs --fresh`.

**Visa types per country** (the same for every passport)

- `visa-types/<CC>.json` — every visa type a destination issues: name, purpose, how long you may stay at once,
  validity (information), entries, official links, check date. One readable file per destination.
- `visa-types.json` — all of them in one file (format `tm-visa-types` v1); what the app downloads and bundles.
- `build-types.mjs` — validates every file and builds `visa-types.json`; `check-links.mjs [CC…]` checks every link
  (sites that block scripts are listed for a manual look).

Researched so far: SCHENGEN, US, GB, CA, AU, NZ, JP, IE, CY (short stay only), TR, AE.
Still to do, in this order: KR, CN, IN, SA, QA, RU, UA, IL, EG, MA, TH, VN, ID, MY, SG, MX, BR, AR, ZA,
CY residence permits — then every other country.

**Sources:** [passport-index-data](https://github.com/imorte/passport-index-data) (MIT) for whether a visa is
needed and for how many days; official pages (each country's foreign ministry, immigration or embassy sites) for
how the days count and for the visa types. A bare "N days" is read as N days in any 180 and marked approximate
until checked.

**Updates:** twice a year (1 February, 1 July) a scheduled job (prompt in `ROUTINE.md`) refreshes the data,
researches every passport in `passports.json` and more of the catalogue, and opens a pull request.
Nothing reaches the apps until it is reviewed and merged.

Not legal advice: always confirm with the embassy before you travel.

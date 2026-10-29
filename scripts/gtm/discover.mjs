// CR-109 discover agent: stage public business listings into gtm.leads.
//
//   node scripts/gtm/discover.mjs --province "Đà Nẵng" --segment center \
//     [--adapter maps|fixture] [--fixture-file path] [--campaign "name"]
//
// Adapters:
//   maps    - Playwright Google Maps search scrape (name/category/
//             address/phone/website from the public results panel;
//             no login). Consent wall or layout break => non-zero exit.
//   fixture - deterministic JSON array [{name,address,city,phone,
//             website,category}] for tests and seeded runs (AC-109.1).
//
// Every staged row carries provenance (source + source_url) +
// lawful_basis='public_business_contact' (REQ-4.0). Dedupe on
// dedupe_key - reruns upsert, never duplicate (REQ-1.2/AC-109.1).

import { readFileSync } from 'node:fs';
import {
  arg, dedupeKey, gtmPost, gtmUpsert, hasFlag, normText, recordRun,
} from './lib.mjs';

const t0 = Date.now();
const province = arg('--province', 'Đà Nẵng');
const segment = arg('--segment', 'center');
const adapter = arg('--adapter', hasFlag('--fixture-file') ? 'fixture' : 'maps');
const campaignName = arg('--campaign', `${province} ${segment} ${new Date().toISOString().slice(0, 10)}`);

const QUERIES = {
  center: ['trung tâm tiếng Anh', 'trung tâm anh ngữ', 'lớp học tiếng Anh trẻ em'],
  school: ['trường tư thục tiểu học', 'trường quốc tế tiểu học', 'trường song ngữ tiểu học'],
};

async function fixtureListings() {
  const file = arg('--fixture-file');
  if (!file) throw new Error('fixture adapter needs --fixture-file');
  return JSON.parse(readFileSync(file, 'utf8'));
}

// Google Maps results-panel scrape: each result card carries
// name/category/address; phone+website arrive in the detail pane but
// the card aria-label + address text are enough for staging - enrich
// fetches websites later. Consent wall / zero cards => throw.
async function mapsListings(query) {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({
      locale: 'vi-VN',
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    });
    await page.goto(
      `https://www.google.com/maps/search/${encodeURIComponent(`${query} ${province}`)}?hl=vi`,
      { waitUntil: 'domcontentloaded', timeout: 45000 },
    );
    if (await page.locator('form[action*="consent"]').count()) {
      throw new Error('google consent wall - maps adapter blocked');
    }
    const feed = page.locator('div[role="feed"]');
    await feed.waitFor({ state: 'visible', timeout: 20000 });
    // Scroll the feed to force lazy pages until stable or ~40 cards.
    let seen = 0;
    for (let i = 0; i < 14; i++) {
      await feed.evaluate((el) => el.scrollBy(0, el.scrollHeight));
      await page.waitForTimeout(900);
      const n = await feed.locator('> div > a').count();
      if (n === seen || n >= 120) break;
      seen = n;
    }
    return await feed.locator('> div:has(a[href*="/maps/place/"])').evaluateAll((cards) =>
      cards.map((c) => {
        const a = c.querySelector('a[href*="/maps/place/"]');
        const name = a?.getAttribute('aria-label') ?? '';
        const url = a?.href ?? '';
        const bits = [...c.querySelectorAll('div > div > span, div > div > div > span')]
          .map((s) => s.textContent?.trim() ?? '')
          .filter(Boolean);
        const phone = bits.find((b) => /^(0|\+84)[\d .]{8,}/.test(b)) ?? '';
        const category = bits.find((b) => b.length < 40 && !/^(0|\+84|http)/.test(b) && !b.includes('·')) ?? '';
        const address = bits.find((b) => b.length >= 20 && !b.startsWith('http')) ?? '';
        return { name, source_url: url, phone, category, address, website: '' };
      }).filter((r) => r.name),
    );
  } finally {
    await browser.close();
  }
}

const PERSONAL_EMAIL = /@(gmail|yahoo|hotmail|outlook|icloud)\./i;
function stageRow(raw, campaignId) {
  const name = (raw.name ?? '').trim();
  if (!name || name.length < 3) return null;
  const email = (raw.email ?? '').trim().toLowerCase();
  return {
    campaign_id: campaignId,
    name,
    segment: 'unknown',
    address: raw.address ?? null,
    city: raw.city ?? province,
    phone: raw.phone ?? null,
    website: raw.website ?? null,
    contact_email: email && !PERSONAL_EMAIL.test(email) ? email : null,
    source: adapter === 'fixture' ? 'fixture' : `maps:${raw.category ?? 'search'}`,
    source_url: raw.source_url ?? null,
    signals: raw.category ? { category: raw.category } : null,
    lawful_basis: 'public_business_contact',
    status: 'staged',
    dedupe_key: dedupeKey({ name, city: raw.city ?? province, phone: raw.phone }),
  };
}

const t1 = t0;
try {
  let raws = [];
  for (const q of QUERIES[segment] ?? [segment]) {
    const part = adapter === 'fixture' ? await fixtureListings() : await mapsListings(q);
    raws.push(...part);
    if (adapter === 'fixture') break; // fixture file is the whole source
  }
  const [campaign] = await gtmPost('campaigns', [{
    name: campaignName, segment: segment === 'school' ? 'school' : segment === 'center' ? 'center' : 'mixed', province,
  }]);
  const rows = raws.map((r) => stageRow(r, campaign.id)).filter(Boolean);
  const uniq = [...new Map(rows.map((r) => [r.dedupe_key, r])).values()];
  const staged = uniq.length ? await gtmUpsert('leads', uniq, 'dedupe_key') : [];
  if (staged.length === 0 && adapter !== 'fixture') {
    await recordRun('discover', { province, segment, seen: raws.length, staged: 0 }, {
      ms: Date.now() - t1, campaignId: campaign.id,
      errors: [{ stage: 'adapter', msg: 'zero staged - source empty or layout change' }],
    });
    console.error('discover: zero staged - adapter returned nothing usable');
    process.exit(1);
  }
  await recordRun('discover', {
    province, segment, source_results_seen: raws.length, staged: staged.length,
    deduped_in_run: rows.length - uniq.length, pages_exhausted: adapter === 'fixture',
  }, { ms: Date.now() - t1, campaignId: campaign.id });
  console.log(`discover: seen=${raws.length} staged=${staged.length} campaign=${campaignName}`);
} catch (e) {
  await recordRun('discover', { province, segment, fatal: e.message }, { ms: Date.now() - t1, errors: [{ stage: 'fatal', msg: e.message }] });
  console.error(`discover failed: ${e.message}`);
  process.exit(1);
}

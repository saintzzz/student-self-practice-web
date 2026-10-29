// CR-109 enrich agent: prefilter -> LLM segment/fit -> website email.
//
//   node scripts/gtm/enrich.mjs [--limit 50] [--campaign-id <uuid>]
//
// REQ-2.1 deterministic prefilter before any token spend; REQ-2.2 one
// LLM call per survivor returning {segment,fit,reason,signals};
// REQ-2.3 deterministic website email extraction (no LLM);
// REQ-2.4 fit>=GTM_FIT_MIN AND contact_email -> 'enriched' else 'cold'.

import { basename } from 'node:path';
import {
  arg, chatJson, gtmAll, gtmPatch, isBusinessEmail, llmAvailable,
  normText, recordRun, uuidOrThrow,
} from './lib.mjs';

const t0 = Date.now();
const limit = Number(arg('--limit', 50));
const campaignId = arg('--campaign-id', null);
const FIT_MIN = Number(process.env.GTM_FIT_MIN ?? 6);

import { prefilter } from './lib.mjs';

const ENRICH_SCHEMA = (o) =>
  o && ['center', 'school', 'unknown'].includes(o.segment) &&
  Number.isInteger(o.fit) && o.fit >= 0 && o.fit <= 10 &&
  typeof o.reason === 'string' && o.reason.length > 0;

function enrichPrompt(lead) {
  return `Ban la chuyen gia danh gia khach hang tiem nang B2B cho nen tang luyen tieng Anh tieu hoc (lop 1-5) cua VieSchool.

Danh gia to chuc sau:
- Ten: ${lead.name}
- Dia chi: ${lead.address ?? ''}, ${lead.city ?? ''}
- Nguon/category: ${lead.source ?? ''}
- Website: ${lead.website ?? ''}
- Dien thoai: ${lead.phone ?? ''}

JSON tra ve:
{
  "segment": "center" | "school" | "unknown",   // center = trung tam anh ngu, school = truong tu thuc/quoc te
  "fit": 0-10,    // kha nang mua nen tang bai tap tieng Anh tieu hoc: 9-10 = trung tam tieng Anh co khoi tieu hoc; 6-8 = truong tu thuc/quoc te hoac trung tam hon hop; <=5 = it lien quan
  "reason": "1 cau tieng Viet",
  "signals": { "primary_program": true|false, "chain_size": "single|small|large", "english_focus": true|false }
}`;
}

function ruleEnrich(lead) {
  const t = normText(`${lead.name} ${lead.source ?? ''}`);
  const schoolish = /(truong|school|quoc te|international|song ngu|bilingual|tu thuc)/.test(t);
  const centerish = /(anh ngu|tieng anh|english|ielts|cambridge|academy)/.test(t);
  const segment = centerish ? 'center' : schoolish ? 'school' : 'unknown';
  const fit = segment === 'center' ? 7 : segment === 'school' ? 6 : 3;
  return {
    segment, fit,
    reason: 'rule-fallback: ' + (segment === 'unknown' ? 'khong ro segment' : `name signal ${segment}`),
    signals: { primary_program: segment !== 'unknown', chain_size: 'single', english_focus: centerish },
  };
}

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const CONTACT_PATHS = ['/lien-he', '/lien-he/', '/contact', '/contact-us', '/about', '/gioi-thieu'];

async function extractEmail(website) {
  if (!website) return null;
  let base;
  try {
    base = new URL(/^https?:\/\//.test(website) ? website : `https://${website}`);
  } catch {
    return null;
  }
  const orgDomain = base.hostname.replace(/^www\./, '');
  const pages = [base.origin, ...CONTACT_PATHS.map((p) => base.origin + p)];
  for (const url of pages) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; VieSchoolBot/1.0)' },
        signal: AbortSignal.timeout(8000),
        redirect: 'follow',
      });
      if (!res.ok) continue;
      const html = await res.text();
      const mailtos = [...html.matchAll(/mailto:([^"'<>?]+)/gi)].map((m) => m[1]);
      const emails = [...new Set([...mailtos, ...(html.match(EMAIL_RE) ?? [])])]
        .map((e) => e.toLowerCase().replace(/\.$/, ''))
        .filter((e) => !/\.(png|jpg|jpeg|gif|webp|svg|js|css)$/.test(e))
        .filter((e) => isBusinessEmail(e, orgDomain));
      if (emails.length) {
        const org = emails.find((e) => e.split('@')[1] === orgDomain);
        return org ?? emails[0];
      }
    } catch {
      // fetch failed - try next page
    }
  }
  return null;
}

async function main() {
  const filters = `status=eq.staged${campaignId ? `&campaign_id=eq.${uuidOrThrow(campaignId, 'campaign-id')}` : ''}`;
  const leads = await gtmAll('leads', '*', filters, 'id');
  const batch = leads.slice(0, limit);
  let dropped = 0, enriched = 0, cold = 0, llmCalls = 0;
  const errors = [];
  for (const lead of batch) {
    try {
      const drop = prefilter(lead);
      if (drop) {
        await gtmPatch('leads', `id=eq.${lead.id}`, { status: 'dropped', drop_reason: drop });
        dropped++;
        continue;
      }
      const email = (lead.contact_email ?? (await extractEmail(lead.website)))?.toLowerCase() ?? null;
      let result = null;
      if (llmAvailable()) {
        const got = await chatJson(enrichPrompt(lead), ENRICH_SCHEMA);
        if (got) { result = got.obj; llmCalls++; }
      }
      if (!result) result = ruleEnrich(lead);
      const status = result.fit >= FIT_MIN && email ? 'enriched' : 'cold';
      await gtmPatch('leads', `id=eq.${lead.id}`, {
        segment: result.segment, fit: result.fit, fit_reason: result.reason,
        signals: result.signals, contact_email: email, status,
      });
      if (status === 'enriched') enriched++; else cold++;
    } catch (e) {
      errors.push({ lead: lead.id, msg: e.message });
    }
  }
  await recordRun('enrich', {
    scanned: batch.length, dropped, enriched, cold, fit_min: FIT_MIN,
  }, { llmCalls, ms: Date.now() - t0, errors: errors.length ? errors : null, campaignId });
  console.log(`enrich: scanned=${batch.length} dropped=${dropped} enriched=${enriched} cold=${cold} llm=${llmCalls}`);
}

// Run only as a direct script - tests import the pure helpers.
const invokedDirectly = process.argv[1] && import.meta.url.endsWith(basename(process.argv[1]));
if (invokedDirectly) {
  main().catch(async (e) => {
    await recordRun('enrich', { fatal: e.message }, { ms: Date.now() - t0, errors: [{ msg: e.message }] });
    console.error(`enrich failed: ${e.message}`);
    process.exit(1);
  });
}
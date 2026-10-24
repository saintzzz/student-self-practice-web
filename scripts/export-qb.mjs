#!/usr/bin/env node
/**
 * Export practice.qb_questions rows for the audit gate (scripts/audit-qb.mjs).
 * Pages through PostgREST with the service_role key (never printed).
 *
 *   node scripts/export-qb.mjs [--out docs/qa/qb-export.json] [--cloze-only]
 *
 * Default scope matches the audit gate: published `mcq` rows with no context
 * fields (passage/transcript/statement empty) - i.e. every row the selector
 * can adjudicate. Add --all to export the whole table instead.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
import { paged } from './lib/paged.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const OUT = opt('--out', join(ROOT, 'docs', 'qa', 'qb-export.json'));
const ALL = args.includes('--all');

const SUPA_URL = 'https://cxjpgfhqchjoernfmcra.supabase.co';
const KEY = JSON.parse(
  readFileSync(join(homedir(), 'AppData', 'Roaming', 'devin', 'secrets', 'supabase_new_keys.json'), 'utf8')
).keys.service_role;

const COLS = 'id,grade,subject,question_type,prompt_text,transcript,choices,answer,passage,statement,review_status,publication_policy';
const PAGE = 1000;

let url = `${SUPA_URL}/rest/v1/qb_questions?select=${COLS}`;
if (!ALL) {
  url += `&question_type=eq.mcq&review_status=not.in.(rejected,draft)`;
  url += `&or=(passage.is.null,passage.eq.)&or=(transcript.is.null,transcript.eq.)&or=(statement.is.null,statement.eq.)`;
}

const headers = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Accept-Profile': 'practice' };
const rows = [];
for await (const batch of paged(url, { headers, page: PAGE }))
  rows.push(...batch);

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(rows));
console.log(`exported ${rows.length} rows -> ${OUT}`);

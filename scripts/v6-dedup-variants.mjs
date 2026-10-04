#!/usr/bin/env node
// Pass 2: for every identical-question group (grade+subject+prompt+
// answer), force ALL members to share ONE variant_group_id so
// fetch_questions never serves duplicates in one exam.
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const SUPA_URL = 'https://cxjpgfhqchjoernfmcra.supabase.co';
const KEY = JSON.parse(
  readFileSync(join(homedir(), '.config/devin/secrets/supabase_new_keys.json'), 'utf8'),
).keys.service_role;
const HEADERS = {
  apikey: KEY, Authorization: `Bearer ${KEY}`,
  'Accept-Profile': 'practice', 'Content-Profile': 'practice',
  'Content-Type': 'application/json',
};
const label = (c) => (typeof c === 'object' && c ? String(c.assetId ?? c.text ?? c.label ?? '') : String(c));

const rows = [];
for (let off = 0; ; off += 1000) {
  const res = await fetch(
    `${SUPA_URL}/rest/v1/qb_questions?select=id,grade,subject,prompt_text,choices,answer,variant_group_id,publication_policy&offset=${off}&limit=1000`,
    { headers: HEADERS });
  if (!res.ok) throw new Error(await res.text());
  const page = await res.json();
  rows.push(...page);
  if (page.length < 1000) break;
}

const groups = new Map();
for (const q of rows) {
  if (!q.publication_policy?.practiceEligible) continue;
  const ans = String(q.answer?.text ?? q.answer?.index ?? '');
  const choices = Array.isArray(q.choices) ? q.choices.map(label).sort().join('||') : '';
  const k = [q.grade, q.subject, (q.prompt_text ?? '').trim().toLowerCase(), choices, ans].join('|');
  if (!groups.has(k)) groups.set(k, []);
  groups.get(k).push(q);
}

let updated = 0, failed = 0, merged = 0;
for (const g of groups.values()) {
  if (g.length < 2) continue;
  const existing = g.map((q) => q.variant_group_id).filter(Boolean);
  const target = existing[0] ?? `dupgrp-${g[0].id}`;
  const need = g.filter((q) => q.variant_group_id !== target);
  if (!need.length) continue;
  merged++;
  for (const q of need) {
    const res = await fetch(`${SUPA_URL}/rest/v1/qb_questions?id=eq.${encodeURIComponent(q.id)}`, {
      method: 'PATCH', headers: { ...HEADERS, Prefer: 'return=minimal' },
      body: JSON.stringify({ variant_group_id: target }),
    });
    if (res.ok) updated++;
    else { failed++; console.error(`${q.id}: ${res.status}`); }
  }
}
console.log(`merged groups=${merged} rows updated=${updated} failed=${failed}`);

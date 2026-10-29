// CR-109 draft agent: Vietnamese outreach drafts for enriched leads.
//
//   node scripts/gtm/draft.mjs [--limit 30] [--campaign-id <uuid>]
//   node scripts/gtm/draft.mjs --followups        (sent >=4d, unreplied)
//
// REQ-3.1 personalized opening from lead name/city/signals, locked
// value paragraph, REQ-3.5 mandated footer, REQ-3.3 pending_review,
// REQ-3.4 template fallback without LLM. unique(lead_id,kind) guards
// one-initial + one-followup (REQ-4.4).

import { basename } from 'node:path';
import {
  arg, buildFooter, chatJson, gtmAll, gtmPost, hasFlag, llmAvailable,
  normText, recordRun, uuidOrThrow,
} from './lib.mjs';

const t0 = Date.now();
const limit = Number(arg('--limit', 30));
const campaignId = arg('--campaign-id', null);
const followups = hasFlag('--followups');
const FOLLOWUP_DAYS = 4;

const VALUE_CENTER =
  'VieSchool là nền tảng luyện tiếng Anh cho học sinh tiểu học (lớp 1-5), bám sát chương trình Global Success - ngân hàng gần 30.000 câu hỏi có đáp án và giải thích, giao bài theo lớp, báo cáo tiến độ cho từng học viên.';
const VALUE_SCHOOL =
  'VieSchool là nền tảng luyện tiếng Anh cho học sinh tiểu học (lớp 1-5), bám sát chương trình Global Success - ngân hàng gần 30.000 câu hỏi có đáp án và giải thích, giáo viên giao bài theo lớp và theo dõi tiến độ từng học sinh.';
const VALUE_CENTER_EN =
  'VieSchool is an English practice platform for primary students (grades 1-5), aligned with the Global Success curriculum - a question bank of nearly 30,000 questions with answers and explanations, class-based assignments, and per-student progress reports.';
const VALUE_SCHOOL_EN =
  'VieSchool is an English practice platform for primary students (grades 1-5), aligned with the Global Success curriculum - a question bank of nearly 30,000 questions with answers and explanations, teacher assignments by class, and per-student progress tracking.';

// Maps listings stuff SEO keywords into names ("X - IELTS, TOEIC...").
// Salutations/subjects use the head segment; full name stays in lead data.
function shortName(lead) {
  const strip = (s) => s.replace(/\s*\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
  let head = strip((lead.name ?? '').split(' - ')[0]);
  if (head.length < 3) head = strip(lead.name ?? '');
  // Cap for subject/salutation - Maps names with branch lists ran to 160+.
  if (head.length > 50) head = head.slice(0, 50).replace(/\s+\S*$/, '').trimEnd();
  return head;
}

function salutation(lead) {
  return lead.segment === 'school' ? 'Kính gửi Ban Giám hiệu' : 'Kính gửi anh/chị';
}

function fallbackOpening(lead) {
  const where = lead.city ? ` tại ${lead.city}` : '';
  return lead.segment === 'school'
    ? `Em biết đến ${shortName(lead)}${where} qua trang thông tin công khai của trường.`
    : `Em biết đến ${shortName(lead)}${where} qua danh sách trung tâm trên Google Maps.`;
}

const DRAFT_SCHEMA = (o) =>
  o && typeof o.subject === 'string' && o.subject.length >= 5 &&
  typeof o.opening === 'string' && o.opening.length >= 20 && o.opening.length <= 400;

function draftPrompt(lead) {
  return `Viet 1 doan mo dau email B2B ngan gon, lich su, tieng Viet cho nen tang luyen tieng Anh tieu hoc VieSchool.

To chuc nhan: ${lead.name} (${lead.segment === 'school' ? 'truong hoc' : 'trung tam'}) - ${lead.city ?? 'Viet Nam'}${lead.website ? `, website ${lead.website}` : ''}${lead.signals ? `, dau hieu: ${JSON.stringify(lead.signals)}` : ''}.

JSON tra ve: {"subject": "tieu de <=60 ky tu, khong clickbait", "opening": "1-2 cau mo dau ca nhan hoa - nhac den ten to chuc/thanh pho/dau hieu cu the, KHONG bia dat thong tin khong co", }
Chi tra JSON.`;
}

async function makeDraft(lead, kind) {
  const footer = buildFooter();
  const value = lead.segment === 'school' ? VALUE_SCHOOL : VALUE_CENTER;
  let subject, opening, llm = false;
  if (kind === 'followup') {
    subject = `Re: VieSchool x ${shortName(lead)} - luyện tiếng Anh cho học viên`;
    opening = 'Em gửi lại email này phòng trường hợp tuần trước anh/chị bận.';
  } else if (llmAvailable()) {
    const got = await chatJson(draftPrompt(lead), DRAFT_SCHEMA);
    if (got) {
      ({ subject, opening } = got.obj);
      llm = true;
    }
  }
  if (!opening) {
    subject = subject ?? `VieSchool x ${shortName(lead)} - hệ thống bài tập tiếng Anh tiểu học`;
    opening = fallbackOpening(lead);
  }
  const cta = kind === 'followup'
    ? 'Nếu chương trình phù hợp, anh/chị chỉ cần trả lời email này - em sẽ sắp một cuộc trao đổi ngắn 15 phút.'
    : 'Nếu anh/chị muốn xem thử, em xin sắp một cuộc trao đổi 15 phút hoặc gửi tài khoản dùng thử cho giáo viên của mình - chỉ cần trả lời email này.';
  const where = lead.city ? ` in ${lead.city}` : '';
  const openingEn = lead.segment === 'school'
    ? `I found ${shortName(lead)}${where} through the school's public website.`
    : `I found ${shortName(lead)}${where} through public business listings on Google Maps.`;
  const ctaEn = kind === 'followup'
    ? 'If the program fits, just reply to this email and I will arrange a short 15-minute call.'
    : 'If you would like to see it, I can arrange a 15-minute call or send a trial teacher account - just reply to this email.';
  const body = [
    `${salutation(lead)} ${shortName(lead)},`,
    '',
    opening,
    '',
    value,
    '',
    cta,
    '',
    'Trân trọng,',
    footer,
    '',
    '--------------------',
    'English version',
    '--------------------',
    '',
    `Dear ${shortName(lead)},`,
    '',
    kind === 'followup'
      ? 'I am sending this again in case you were busy last week.'
      : openingEn,
    '',
    lead.segment === 'school' ? VALUE_SCHOOL_EN : VALUE_CENTER_EN,
    '',
    ctaEn,
    '',
    'Best regards,',
    '--',
    'VieSchool - primary English practice platform',
    `${process.env.GTM_SENDER_NAME ?? 'VieSchool Team'} | ${process.env.GTM_SENDER_ROLE_EN ?? 'Partnerships'}`,
    `${process.env.GTM_SENDER_ADDRESS ?? 'vieschool.com'} | ${process.env.GTM_REPLY_EMAIL ?? 'hello@vieschool.com'}`,
    'If you prefer not to hear from us again, reply "STOP" - we will stop immediately.',
  ].join('\n');
  return { subject, body, llm };
}

async function main() {
  let leads;
  if (followups) {
    const cutoff = new Date(Date.now() - FOLLOWUP_DAYS * 864e5).toISOString();
    const sent = await gtmAll(
      'messages',
      'id,lead_id,sent_at,leads!inner(*)',
      `kind=eq.initial&status=eq.sent&sent_at=lt.${cutoff}&leads.status=eq.sent`,
    );
    const haveFu = new Set(
      (await gtmAll('messages', 'id,lead_id', 'kind=eq.followup')).map((m) => m.lead_id),
    );
    leads = sent.map((m) => m.leads).filter((l) => l && !haveFu.has(l.id)).slice(0, limit);
  } else {
    const filters = `status=eq.enriched&contact_email=not.is.null${campaignId ? `&campaign_id=eq.${uuidOrThrow(campaignId, 'campaign-id')}` : ''}`;
    const existing = new Set(
      (await gtmAll('messages', 'id,lead_id', 'kind=eq.initial')).map((m) => m.lead_id),
    );
    leads = (await gtmAll('leads', '*', filters, 'fit.desc.nullslast')).filter((l) => !existing.has(l.id)).slice(0, limit);
  }
  const kind = followups ? 'followup' : 'initial';
  let made = 0, llmCalls = 0;
  const errors = [];
  for (const lead of leads) {
    try {
      const d = await makeDraft(lead, kind);
      await gtmPost('messages', [{
        lead_id: lead.id, kind, subject: d.subject, body: d.body, status: 'pending_review',
      }]);
      if (d.llm) llmCalls++;
      made++;
      if (!followups) {
        // lead.status stays 'enriched' until a human queues a message;
        // 'queued'/'sent' transition happens via approve/send paths.
      }
    } catch (e) {
      if (/duplicate|unique/i.test(e.message)) continue; // race-safe: unique(lead_id,kind)
      errors.push({ lead: lead.id, msg: e.message });
    }
  }
  await recordRun('draft', { kind, candidates: leads.length, made }, {
    llmCalls, ms: Date.now() - t0,
    errors: errors.length ? errors : null,
    campaignId,
  });
  console.log(`draft(${kind}): candidates=${leads.length} made=${made} llm=${llmCalls}`);
}

// Run only as a direct script - tests import the pure helpers.
const invokedDirectly = process.argv[1] && import.meta.url.endsWith(basename(process.argv[1]));
if (invokedDirectly) {
  main().catch(async (e) => {
    await recordRun('draft', { fatal: e.message }, { ms: Date.now() - t0, errors: [{ msg: e.message }] });
    console.error(`draft failed: ${e.message}`);
    process.exit(1);
  });
}
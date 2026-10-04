// CR-51 F10: fix "best fits theme/Unit" word items.
// - flag items where the marked answer is wrong or 2+ choices fit the theme
// - rewrite tautological explanations ("X phu hop voi chu de Y") into teaching explanations
// usage: node scripts/v6-theme-fit-fix.mjs [--dry]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const keys = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.config/devin/secrets/supabase_new_keys.json'), 'utf8'));
const BASE = keys.url, KEY = keys.keys.service_role;
const HDR = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', 'Content-Profile': 'practice', 'Accept-Profile': 'practice' };
const DRY = process.argv.includes('--dry');

// Items where the answer is wrong-topic or multiple choices satisfy the theme -> unfixable
const FLAG = new Set([
  'g5-gs-u10-vocab-006-6323cd2213', // school trip: beach/trip/holiday/visit all fit
  'g5-gs-u14-vocab-006-55daaf529e', // healthy: exercise/water/teeth/sleep all fit
  'g5-gs-u14-vocab-000-ac76db72f5', // healthy: water/exercise/sleep/fruit all fit
  'g3-gs-u02-vocab-006-f5ab26af44', // names: 'name' in choices but answer marked 'hello'
  'g3-gs-u07-vocab-000-953f042a50', // instructions: open/listen/look/sit all fit
  'g3-gs-u06-vocab-006-de157fd97d', // school: library/pupil/playground/school all fit
  'g3-gs-u06-vocab-000-e690500fa0', // school: school/classroom/teacher/playground all fit
  'g3-gs-u10-vocab-006-857cf723d8', // break time: all 4 are activities
  'g3-gs-u13-vocab-000-15555a7d69', // house: garden/living room/bedroom/house all fit
  'g4-gs-u05-vocab-000-bf1d2ac1d7', // can-do: draw/ride/dance/swim all fit
  'g4-gs-u10-vocab-000-d63d233249', // summer holidays: beach/hotel/mountains/holiday all fit
  'g5-gs-u09-vocab-000-72519d1f98', // outdoor: skip + play football both outdoor
  'g5-gs-u11-vocab-000-ed1149a94a', // family time: mother/brother/father/sister all fit
  'g5-gs-u16-vocab-000-48fbb9861e', // weather: windy/cold/sunny/cloudy all fit
  'g3-gs-u02-topup-104-9be9495993', // names: answer 'goodbye' does not fit theme
  'g3-gs-u02-topup-105-7aafeba0be', // names: answer 'morning' does not fit theme
  'g5-gs-u08-topup-100-f1d4ec2c13', // classroom: answer 'bathroom' not in classroom
  'g5-gs-u08-topup-101-4e6fd8d284', // classroom: answer 'garden' not in classroom
  'g5-gs-u08-topup-102-b7edbf2d48', // classroom: answer 'house' not in classroom
  'g5-gs-u01-vocab-000-ca7d539541', // all about me: hello + name both fit
  'g5-gs-u01-vocab-006-97a81d1981', // all about me: hello/hi/goodbye all greetings
  'g3-gs-u01-vocab-000-6f4c648211', // hello: hi/hello/goodbye all greetings
  'g3-gs-u01-vocab-006-685690b812', // hello: goodbye/hello both greetings
]);

// gloss + fit-reason per answer word (used for kept items with tautological expl)
const GLOSS = {
  'Music': ['nhạc', 'một môn học trong thời khóa biểu'],
  'PE': ['thể dục', 'một môn học trong thời khóa biểu'],
  'English': ['tiếng Anh', 'một môn học trong tuần'],
  'Maths': ['toán', 'một môn học trong tuần'],
  'Science': ['khoa học', 'một môn học trong tuần'],
  'Art': ['mỹ thuật', 'một môn học trong thời khóa biểu'],
  'timetable': ['thời khóa biểu', 'chính là từ khóa của chủ đề'],
  'afternoon': ['buổi chiều', 'xuất hiện trong lời chào "Good afternoon"'],
  'morning': ['buổi sáng', 'xuất hiện trong lời chào "Good morning"'],
  'name': ['tên', 'là từ khóa chính - bài học dạy cách hỏi và nói tên'],
  'hello': ['xin chào', 'là lời chào học trong bài'],
  'hi': ['chào', 'là lời chào khi ta giới thiệu tên mình'],
  'friend': ['bạn bè', 'chính là từ khóa của chủ đề'],
  'helpful': ['hay giúp đỡ', 'là tính cách dùng để tả bạn bè'],
  'house': ['ngôi nhà', 'chính là từ khóa của chủ đề'],
  'bathroom': ['phòng tắm', 'là một phòng trong trường học'],
  'garden': ['vườn', 'là một phần của ngôi nhà'],
  'kitchen': ['nhà bếp', 'là một phòng trong nhà'],
  'bedroom': ['phòng ngủ', 'là một phòng trong nhà'],
  'living room': ['phòng khách', 'là một phòng trong nhà'],
  'ride a bike': ['đạp xe', 'là một hoạt động'],
  'play football': ['đá bóng', 'là một hoạt động'],
  'read books': ['đọc sách', 'là một hoạt động'],
  'play chess': ['chơi cờ', 'là một hoạt động'],
  'skip': ['nhảy dây', 'là một hoạt động'],
  'fly a kite': ['thả diều', 'là hoạt động ngoài trời'],
  'water': ['nước', 'cần uống đủ nước để khỏe mạnh'],
  'teeth': ['răng', 'cần đánh răng để giữ sức khỏe'],
  'fruit': ['trái cây', 'là thức ăn tốt cho sức khỏe'],
  'sleep': ['ngủ', 'ngủ đủ giấc giúp cơ thể khỏe mạnh'],
  'hot': ['nóng', 'là từ tả thời tiết'],
  'cold': ['lạnh', 'là từ tả thời tiết'],
  'sunny': ['nắng', 'là từ tả thời tiết'],
  'rainy': ['mưa', 'là từ tả thời tiết'],
  'board': ['bảng', 'là đồ vật trong lớp học'],
  'canteen': ['nhà ăn', 'là cơ sở vật chất của trường học'],
  'cook together': ['nấu ăn cùng nhau', 'là hoạt động cuối tuần của gia đình'],
  'library': ['thư viện', 'là một phòng/nơi của trường học'],
  'beach': ['bãi biển', 'là nơi hay đến trong chuyến đi/kỳ nghỉ'],
  'visit': ['thăm', 'là việc hay làm trong chuyến đi'],
  'hotel': ['khách sạn', 'là nơi nghỉ lại trong kỳ nghỉ'],
  'mountains': ['núi', 'là nơi hay đến trong kỳ nghỉ hè'],
  'holiday': ['kỳ nghỉ', 'chính là từ khóa của chủ đề'],
  'pupil': ['học sinh', 'là người học ở trường'],
  'teacher': ['giáo viên', 'là người ở trường học'],
  'Saturday': ['thứ Bảy', 'là một ngày trong tuần'],
  'Monday': ['thứ Hai', 'là một ngày trong tuần'],
  'bird': ['con chim', 'là một con vật có thể nuôi làm thú cưng'],
};

const TAUT = /phù hợp với chủ đề/i;

async function fetchAll(table, select) {
  let all = [], off = 0;
  while (true) {
    const r = await fetch(`${BASE}/rest/v1/${table}?select=${select}&limit=1000&offset=${off}`, { headers: HDR });
    const b = await r.json();
    if (!Array.isArray(b) || !b.length) break;
    all.push(...b); if (b.length < 1000) break; off += 1000;
  }
  return all;
}

const elig = (q) => { const p = q.publication_policy || {}; return q.review_status !== 'flagged' && (p.practiceEligible || p.examEligible || p.mockEligible); };
const PAT = /most closely related to the theme|best fits|belongs to (the )?(theme|unit)|theme ['"`]/i;

const qs = await fetchAll('qb_questions', 'id,prompt_text,choices,answer,explanation_vi,review_status,publication_policy,question_type');
const items = qs.filter((q) => elig(q) && PAT.test(q.prompt_text || '') && !/sentence best fits/i.test(q.prompt_text || ''));
console.log('word-theme items:', items.length);

const themeOf = (p) => { const m = p.match(/[“"“](.+?)[”"”]|Unit \d+: (.+?)\.?$/); return (m?.[1] || m?.[2] || '').trim(); };

let flagged = 0, rewritten = 0, skipped = 0, miss = [];
for (const q of items) {
  if (FLAG.has(q.id)) {
    if (!DRY) {
      const r = await fetch(`${BASE}/rest/v1/qb_questions?id=eq.${q.id}`, {
        method: 'PATCH', headers: HDR,
        body: JSON.stringify({ review_status: 'flagged', publication_policy: { ...(q.publication_policy || {}), practiceEligible: false, examEligible: false, mockEligible: false } }),
      });
      if (!r.ok) { console.log('FLAG-FAIL', q.id, (await r.text()).slice(0, 120)); continue; }
    }
    flagged++; continue;
  }
  const ans = q.answer?.text || '';
  if (!TAUT.test(q.explanation_vi || '') || /không|các từ|các câu|các lựa chọn/i.test(q.explanation_vi || '')) { skipped++; continue; } // already teaches
  const g = GLOSS[ans];
  if (!g) { miss.push(q.id + '|' + ans); skipped++; continue; }
  const theme = themeOf(q.prompt_text || '');
  const expl = `'${ans}' (${g[0]}) ${g[1]} - đúng chủ đề '${theme}'. Các lựa chọn còn lại không thuộc chủ đề này.`;
  if (!DRY) {
    const r = await fetch(`${BASE}/rest/v1/qb_questions?id=eq.${q.id}`, {
      method: 'PATCH', headers: HDR, body: JSON.stringify({ explanation_vi: expl }),
    });
    if (!r.ok) { console.log('EXPL-FAIL', q.id, (await r.text()).slice(0, 120)); continue; }
  }
  rewritten++;
}
console.log({ flagged, rewritten, skipped });
if (miss.length) console.log('missing gloss:', miss);

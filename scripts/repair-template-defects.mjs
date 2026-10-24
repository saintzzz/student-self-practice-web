// Deterministic repair for the science template defect classes found by
// the academic spot-check (docs/qa/spot-check-*.json):
//   1. "X sees an animal with A at P" - wrong/broken habitat places and
//      distractors that also have the attribute (ambiguous answers).
//   2. "X finds a AN at P. It has A. What group is it?" - habitat
//      mismatches, 'a'-before-vowel article errors, invalid
//      attr->group reasoning in explanations.
//   3. "finds a baby X. It came from ___" - nonsense answer grammar
//      ("It came from babies from eggs"); repointed to the offspring
//      vocabulary the template intended to teach.
//   4. Article repair: 'a' -> 'an' before vowel-sound words bank-wide.
//   5. Targeted one-off fixes (see TARGETED_FIXES).
//   6. "is a ___" with article-bearing choices -> drop the prompt article
//      ("A frog is a ___" + "an amphibian" => "A frog is ___").
//   7. "Which covering does X have?" keyed on appendage/body answers
//      -> "Which feature does X have?"; also de-ambiguate distractors
//      that are other coverings the animal truly has.
//   8. "Where does X live?" - replace distractors that are also valid
//      habitats for the animal (e.g. whale + "cold polar regions").
//
// Usage:
//   node scripts/repair-template-defects.mjs --dry-run   # proposals -> JSONL
//   node scripts/repair-template-defects.mjs --apply docs/qa/template-repair-<ts>.jsonl
//
// Same proposal/apply contract as scripts/polish-explanations.mjs:
// proposals record before+after; apply is conditional on `before` and
// fails loudly on drift/conflict.

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import {
  ANIMAL_VN, ATTR_HAS, ANIMAL_PLACE, ANIMAL_GROUP, GROUP_VN,
  OFFSPRING, offspringDistractors, safeDistractors, fixArticles,
  NON_COVERING, COVERING_ATTRS, attrsOf, VALID_HABITATS, wrongHabitats,
  fixProperCase, fixPrepositions,
} from './lib/animal-knowledge.mjs';

const KEYS = JSON.parse(readFileSync(join(homedir(), '.config', 'devin', 'secrets', 'supabase_new_keys.json'), 'utf8'));
const URL = KEYS.url, SVC = KEYS.keys.service_role;
const H = { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Accept-Profile': 'practice' };

const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
const APPLY = args.includes('--apply') ? args[args.indexOf('--apply') + 1] : null;
const FROM = args.includes('--from') ? Number(args[args.indexOf('--from') + 1]) : 0;
const WORKERS = args.includes('--workers') ? Number(args[args.indexOf('--workers') + 1]) : 1;
if (!DRY && !APPLY) { console.error('usage: --dry-run | --apply <file.jsonl>'); process.exit(1); }

function h32(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
function contentHash(prompt, choices, answer, passage) {
  return createHash('sha1').update(JSON.stringify([prompt, choices, answer, passage ?? null])).digest('hex').slice(0, 16);
}
function pick3(pool, seed) {
  const out = [];
  for (let k = 0; out.length < 3 && k < pool.length * 3; k++) {
    const c = pool[(seed + k * 7) % pool.length];
    if (!out.includes(c)) out.push(c);
  }
  return out;
}

async function* fetchMatching(pred) {
  let from = 0;
  const cols = 'id,question_type,grade,prompt_text,passage,statement,tokens,choices,answer,explanation_vi,review_status';
  for (;;) {
    let rows = null;
    for (let attempt = 0; attempt < 6; attempt++) {
      const r = await fetch(`${URL}/rest/v1/qb_questions?select=${cols}&order=id&offset=${from}&limit=250&review_status=neq.rejected`, { headers: H });
      const j = await r.json();
      if (Array.isArray(j)) { rows = j; break; }
      await new Promise((s) => setTimeout(s, 1500 * (attempt + 1)));
    }
    if (!rows) throw new Error(`fetch failed at offset ${from}`);
    for (const q of rows) if (pred(q)) yield q;
    if (rows.length < 250) return;
    from += 250;
  }
}

// ---- targeted one-off fixes ------------------------------------------
const TARGETED_FIXES = {
  'g1-cr67-w2i-0781-1fcf5a': (q) => ({ prompt_text: q.prompt_text.replace('"ghana"', '"Ghana"') }),
  'g1-english-bulk-4db39c59e88c': (q) => ({
    prompt_text: 'Choose the word: ___bye.',
    explanation_vi: q.explanation_vi.replace("'Good bye.'", "'Goodbye.'"),
  }),
  'g1-sci-v4-body-and-senses-6943811705': (q) => ({
    choices: q.choices.map((c) => c.replace('Hands is', 'Hands are').replace('Ears is', 'Ears are').replace('Nose is', 'Nose is')),
  }),
  'g2-math-tpl-765a63d2837b': (q) => ({ prompt_text: q.prompt_text.replace('in a shelf', 'on a shelf') }),
  'g2-math-v5-1255-3c067373d3': () => ({
    explanation_vi: 'Ta trừ lần lượt: hàng đơn vị 6 trừ 9 phải mượn 1 thành 16 trừ 9 bằng 7; hàng chục còn 2 trừ 2 bằng 0; hàng trăm 6 trừ 5 bằng 1. Kết quả là 107.',
  }),
  'g2-science-tpl-91cff4b51bbb': () => ({
    explanation_vi: 'grass (cỏ) là sinh vật sống vì nó lớn lên, sinh sản và tự tạo chất dinh dưỡng nhờ quang hợp.',
  }),
  'g3-english-bulk-7d50a51b9316': () => ({
    explanation_vi: 'Cấu trúc "be + V-ing" diễn tả hành động đang hoặc sắp xảy ra - "What are you planning to do?" nghĩa là "Bạn định làm gì?".',
  }),

  // ---- academic spot-check round 2 (seed fresh-600) targeted fixes ----
  'g3-english-gemini-7315c541b818': (q) => ({
    // "sitting ___ me, so I can see the back of her head" -> in front of
    answer: { text: 'in front of', index: 0 },
    explanation_vi: 'Nhìn thấy phía sau đầu Linda nghĩa là Linda ngồi PHÍA TRƯỚC (in front of) mình.',
  }),
  'g3-english-bulk-97826dc88950': (q) => ({
    // do/did both valid without a time marker -> pin present habit
    prompt_text: 'The students _____ their homework after school every day.',
    explanation_vi: "'Every day' báo thói quen hiện tại; chủ ngữ số nhiều 'the students' đi với 'do'.",
  }),
  'g3-english-gemini-de2b1d272e48': (q) => ({
    // cannot weigh a sport - compare the balls
    prompt_text: 'Which is ___: a basketball or a table tennis ball? - A basketball is.',
    explanation_vi: 'So sánh hai quả bóng dùng tính từ so sánh hơn - "heavier" (nặng hơn).',
  }),
  'g3-english-gemini-e0f0bc5f4929': (q) => ({
    // on/under/next all grammatical -> distractors that cannot fit
    choices: ['above', 'during', 'next', 'in'],
    explanation_vi: "Sách nằm BÊN TRONG cặp nên dùng 'in'. 'During' chỉ thời gian, 'next' cần 'next to', 'above' là phía trên.",
  }),
  'g3-gs-u20-v6-readtf-7aa7299e7182': (q) => ({
    explanation_vi: "Bài đọc viết 'The elephant is very big' - câu này đúng với bài đọc.",
  }),
  'g2-sci-v4b-weather-seasons-a8884e658d0b': (q) => ({
    // season unstated -> pin to hot weather so 'light clothes' is unique
    prompt_text: 'Alex is making a science poster about dressing for hot weather. Which answer should Alex put on the poster for this idea?',
  }),
  'g1-english-bulk-14cc8a76f8d5': (q) => ({
    prompt_text: 'This is number 4. How do you say it?',
  }),
  'g1-english-bulk-15d3c8cc17ae': (q) => ({
    // explanation itself counts four greetings - key matches the count
    answer: { text: 'four', index: 3 },
    explanation_vi: "Có bốn lời chào với 'Good': Good morning, Good afternoon, Good evening, Good night.",
  }),
  'g3-english-gemini-3a5bc8b0f798': (q) => ({
    explanation_vi: "Sắp xếp từ thành câu hỏi 'What sport do you play?' - nghĩa là 'Bạn chơi môn thể thao nào?'.",
  }),
  'g3-cr67-i2w-1652-619aaa': (q) => ({
    choices: q.choices.map((c) => (c === 'bangladesh' ? 'Bangladesh' : c)),
  }),
  'g2-sci-short-v5-0021-f328bd1471': (q) => ({
    answer: { accepted: ['a raincoat', 'an umbrella', 'a rain jacket', 'rain boots'] },
  }),
  'g3-cr67-w2i-0163-e5e759': (q) => ({
    prompt_text: q.prompt_text.replace('"belize"', '"Belize"'),
  }),
  'g1-english-bulk-daec6d974905': (q) => ({
    // 'bananas' is also a valid plural fill -> make it singular
    choices: q.choices.map((c) => (c === 'bananas' ? 'banana' : c)),
    explanation_vi: "'Two' cần danh từ số nhiều - chỉ 'apples' là số nhiều. 'apple', 'orange', 'banana' đều số ít.",
  }),
  'g1-english-bulk-9bb48e5104b5': (q) => ({
    // 'She is.' is a fragment - give the blank a complement
    prompt_text: 'She is my daughter. She ___ a girl.',
    explanation_vi: "'She is a girl' - chủ ngữ 'She' đi với 'is', câu hoàn chỉnh.",
  }),
  'g3-english-bulk-82d967cd3c32': (q) => ({
    // 'under' and 'between' both possible -> pin with 'in the middle'
    prompt_text: 'The picture is ____ the two windows, right in the middle.',
  }),
  'g1-english-bulk-3b1393ec37b3': (q) => ({
    // "Is it?" expects Yes/No, not adjectives
    prompt_text: 'That cake is not big. It is ___.',
    explanation_vi: "'Small' nghĩa là nhỏ - bánh không to thì nó nhỏ.",
  }),
  'g1-english-bulk-59184f556f6a': (q) => ({
    explanation_vi: "Gặp người mới mình nói 'Nice to meet you'. 'Good night' chúc ngủ ngon, 'Goodbye' chào tạm biệt, 'I am ten' nói về tuổi.",
  }),

  // ---- academic spot-check round 3 (seed round3) targeted fixes ----
  'g2-english-bulk-68d1efe40db2': () => ({
    // prompt says "to sit down" (self) but answer orders someone else
    prompt_text: 'What can you say to ask someone to sit down?',
    explanation_vi: "Muốn mời người khác ngồi xuống, mình nói 'Sit down, please.' (Ngồi xuống đi, làm ơn).",
  }),
  'g1-science-tpl-173238c4a7bc': (q) => ({
    // cat and cow can also swim - distractors that clearly cannot
    choices: ['a chicken', 'a shark', 'a worm', 'a bee'],
    explanation_vi: 'Cá mập (shark) là con vật sống dưới nước, bơi rất giỏi.',
  }),
  'g1-science-tpl-7797c422f67d': (q) => ({
    choices: q.choices.map((c) =>
      c === 'makes seeds' ? 'drink water like roots' :
      c === 'carries water to the leaves' ? 'carry food to the flowers' : c),
  }),
  'g2-english-bulk-809ebd3db674': (q) => ({
    // all vehicles can go fast - pin the clue to flying
    prompt_text: 'It can fly fast in the sky. What is it?',
    explanation_vi: "Đồ vật bay nhanh trên bầu trời là máy bay - 'a plane'.",
  }),
  'g2-english-bulk-64a560b4f12d': (q) => ({
    // living room can also hold books - pin with a study clue
    prompt_text: 'There are many books and a desk in the...',
    explanation_vi: "Phòng có nhiều sách và bàn học là 'study room' (phòng học).",
  }),
  'g2-english-bulk-288d5cde6e9f': (q) => ({
    // "What is she doing?" asks an action, choices are jobs
    prompt_text: 'She is teaching students. What is her job?',
    explanation_vi: "Người dạy học sinh là giáo viên - 'She is a teacher.'",
  }),
  'g2-english-bulk-7cc185772b31': (q) => ({
    // the prompt already contains 'an' - there is no blank to fill
    prompt_text: 'Choose the correct word: ___ orange hat.',
  }),
  'g2-english-bulk-6cf2ee3f47a8': (q) => ({
    // "many books" alone does not pin a job - add the workplace
    prompt_text: 'He works in a place with many books. What is his job?',
    explanation_vi: "Người làm việc ở nơi có nhiều sách là 'librarian' (thủ thư).",
  }),
  'g2-english-bulk-335bd06499e9': (q) => ({
    // no reference day -> give one explicitly
    prompt_text: 'Today is Monday. What day is tomorrow?',
    explanation_vi: "Hôm nay thứ Hai (Monday) thì ngày mai là thứ Ba - 'It is Tuesday.'",
  }),
  'g1-science-tpl-5c8356346e5a': (q) => ({
    // malformed prompt mixes true/false with action choices
    prompt_text: 'Washing hands keeps germs away. True or False?',
    question_type: 'true-false',
    choices: ['True', 'False'],
    answer: { text: 'True', index: 0 },
    explanation_vi: 'Rửa tay giúp xua đuổi vi trùng (germs) nên đây là việc tốt - câu này đúng.',
  }),
  'g1-science-tpl-34bf0de7bf50': (q) => ({
    // cloth/rubber/glass can all be thin - pin to the classic riddle
    prompt_text: 'Which material is thin and used for writing?',
    explanation_vi: 'Giấy (paper) mỏng và dùng để viết lên.',
  }),
  'g2-english-bulk-f97357b373a4': (q) => ({
    // 'ride a boat' is also valid - swap boat for a non-rideable noun
    choices: q.choices.map((c) => (c === 'boat' ? 'book' : c)),
    explanation_vi: "Mình 'ride a bike' (đạp xe đạp). Ô tô thì 'drive', máy bay thì 'fly', sách không phải phương tiện.",
  }),
  'g1-english-bulk-ec6806a09e13': (q) => ({
    // bare statement with color choices - add the color question
    prompt_text: 'That is an orange orange. What color is it?',
    explanation_vi: "Quả cam (orange) có màu cam - 'Orange'.",
  }),
  'g2-english-bulk-455460fc6e84': (q) => ({
    prompt_text: 'Choose the correct sentence about what they like.',
  }),
  'g1-english-bulk-04792354cdf0': (q) => ({
    // no leaf image - make the statement self-contained and generic
    prompt_text: 'Most leaves are ___.',
    explanation_vi: 'Hầu hết lá cây có màu xanh lá (green).',
  }),
  'g1-cr67-i2w-0348-2a9284': (q) => ({
    choices: q.choices.map((c) => (c === 'cambodia' ? 'Cambodia' : c)),
  }),
  'g2-sci-v4-community-safety-95fb91a29b': (q) => ({
    // distractors use bare infinitive as subject - they are still wrong
    // answers, but bad grammar in served content is a defect
    choices: q.choices.map((c) =>
      c === 'Run without looking is the correct scientific explanation.' ? 'Running without looking keeps you safe.' :
      c === 'Play in the road is the correct scientific explanation.' ? 'Playing in the road keeps you safe.' :
      c === 'Close your eyes is the correct scientific explanation.' ? 'Closing your eyes keeps you safe.' : c),
  }),
  'g1-english-bulk-ae6d2a87796e': (q) => ({
    // explanation wrongly claims "These girls are happy" is ungrammatical
    explanation_vi: "Đề hỏi câu đúng cho MỘT cô bé - 'This girl is happy.' ('this' + 'girl' số ít). 'These girls are happy' đúng ngữ pháp nhưng nói về NHIỀU bé gái.",
  }),
  'g1-math-tpl-0ca05b9bb258': (q) => ({
    // "4 equal sides" must be a square, not a rectangle
    prompt_text: 'A shape with 4 equal sides is a ___.',
    choices: ['hexagon', 'triangle', 'pentagon', 'square'],
    answer: { text: 'square', index: 3 },
    explanation_vi: 'Hình có 4 cạnh bằng nhau là hình vuông (square).',
  }),
  'g1-english-bulk-ce17a2c34b70': (q) => ({
    explanation_vi: "Chủ ngữ 'He' (anh ấy) là ngôi thứ ba số ít nên dùng 'is'. 'Am' chỉ đi với 'I'; 'are' cho số nhiều.",
  }),
  'g1-english-bulk-cb99335d4ad9': (q) => ({
    // 'They are fish' is grammatical (plural) - fix distractors
    choices: q.choices.map((c) => (c === 'fish' ? 'a fish' : c)),
    explanation_vi: "'They are sad' - 'sad' là tính từ chỉ cảm xúc. 'A bird', 'a fish', 'a dog' là danh từ số ít, không đi với 'they are'.",
  }),
  'g1-english-bulk-ca100b6f4d65': (q) => ({
    explanation_vi: "Sau 'How are you?' (Bạn khỏe không?), mình trả lời 'I am fine' (Tôi khỏe). Các câu còn lại không trả lời câu hỏi này.",
  }),
  'g1-sci-v4-weather-7335d3a271': (q) => ({
    explanation_vi: 'Câu này mô tả hiện tượng thời tiết thật: hơi nước ngưng tụ thành mây, mây nặng thì mưa rơi xuống - là khoa học Trái Đất và thời tiết.',
  }),
  'g3-english-bulk-6585e51ad1f1': (q) => ({
    // explanation implies only humans/mammals have lungs/nose
    explanation_vi: 'Cá thở bằng mang (gills) để lấy oxy trong nước.',
  }),
  'g2-science-tpl-5ad8d02cd674': (q) => ({
    // cnidarian = ngành Ruột khoang, not 'ngành xúc tu'
    explanation_vi: 'jellyfish (sứa) thuộc ngành Ruột khoang (Cnidaria). Đặc điểm: thân mềm dạng sứa (a soft jelly body).',
  }),
  'g3-english-bulk-f104480646ec': (q) => ({
    // 'played' also fits without a time marker - pin present habit
    prompt_text: 'They _______ football on Saturdays every week.',
    explanation_vi: "'On Saturdays every week' diễn tả thói quen hiện tại; chủ ngữ 'they' số nhiều nên động từ giữ nguyên 'play'.",
  }),
  'g2-eng-spell-v5-0097-a2941d9744': (q) => ({
    // 'had' is also a correctly spelled English word
    choices: q.choices.map((c) => (c === 'had' ? 'hande' : c)),
  }),
  'g2-mat-v4b-number-operations-6b08e1ec03ba': (q) => ({
    // 2104 exceeds the grade-2 number range (<=1000) - shrink operands
    prompt_text: 'Calculate: 204 + 16.',
    choices: [220, 230, 221, 219],
    answer: { text: 220, index: 0 },
    explanation_vi: 'Bé cộng hàng đơn vị: 4 cộng 6 bằng 10, viết 0 nhớ 1; hàng chục 0 cộng 1 thêm 1 bằng 2; hàng trăm hạ 2. Kết quả 220.',
  }),
  'g1-english-bulk-547e9be318a6': (q) => ({
    // 'aunt' for father's sister is 'cô' not 'dì'
    explanation_vi: "Chị em gái của bố là 'cô' - tiếng Anh chung là 'aunt'.",
  }),
  'g1-english-bulk-4ec7fdd0cd55': (q) => ({
    // bare statement, no task - turn it into a fill-blank
    prompt_text: 'He is ___ at the bird.',
    explanation_vi: "'Pointing at' là chỉ tay vào - cậu ấy đang chỉ vào con chim.",
  }),
  'g2-english-bulk-69dca3718604': (q) => ({
    // 'drawing flowers' is also plausible - use a verb that cannot take flowers
    choices: q.choices.map((c) => (c === 'drawing' ? 'eating' : c)),
    explanation_vi: "Trời nắng mẹ tưới hoa - 'watering flowers'. Nấu ăn, ngủ, ăn không đi với 'flowers'.",
  }),
  'g2-english-bulk-07a0a3f89061': (q) => ({
    // fridge location has no context - give a cooking clue
    prompt_text: 'Where is the fridge? It is in the room where we cook.',
    explanation_vi: "Phòng nấu ăn là 'kitchen' (nhà bếp) - tủ lạnh ở trong bếp.",
  }),
  // ---- round-4 spot-check fixes ----
  'g1-english-bulk-fc8a2fa33b1c': (q) => ({
    // "This is a blue." is malformed - ask for the blue thing directly
    prompt_text: 'Which one is blue?',
    explanation_vi: "Bầu trời (sky) có màu xanh dương - 'blue'.",
  }),
  'g3-english-bulk-e92f53ddd625': (q) => ({
    // 'loved' also fits without a time marker - swap for a non-finite distractor
    choices: q.choices.map((c) => (c === 'loved' ? 'to love' : c)),
    explanation_vi: "'My dog' là chủ ngữ số ít nên động từ thêm 's' - 'loves'. 'Love' thiếu 's'; 'loving' cần 'is' đi kèm; 'to love' là nguyên mẫu, sai sau chủ ngữ.",
  }),
  'g3-english-bulk-f29ad78f32b9': (q) => ({
    // monkeys are omnivores - the old explanation falsely denied that
    explanation_vi: "Trong các lựa chọn, 'bananas' (chuối) là thức ăn quen thuộc nhất của khỉ - khỉ rất thích ăn chuối.",
  }),
  'g1-english-bulk-c8753b8a8d4d': (q) => ({
    // 'legs' is also correct for walking - swap for a non-walking body part
    choices: q.choices.map((c) => (c === 'legs' ? 'ears' : c)),
    explanation_vi: "Mình dùng bàn chân (feet) để đi. 'Arms' là cánh tay, 'hands' là bàn tay, 'ears' là tai - không dùng để đi.",
  }),
  'g3-english-gemini-8509acbbecaa': (q) => ({
    // bats can also fly in a park - use a clearly indoor distractor
    choices: q.choices.map((c) => (c === 'park' ? 'desk' : c)),
    explanation_vi: "Dơi ngủ ban ngày và bay vào ban đêm trong hang động - 'cave'.",
  }),
  'g1-english-bulk-fff76ad0b60e': (q) => ({
    // bare statements with no task - convert to a true-false item
    prompt_text: "True or False: 'I am a pupil. This is my bag.' is correct English.",
    question_type: 'true-false',
    choices: ['True', 'False'],
    answer: { text: 'True', index: 0 },
    explanation_vi: "Hai câu 'I am a pupil. This is my bag.' đều đúng ngữ pháp tiếng Anh - câu này đúng.",
  }),
  'g3-english-bulk-f5031d56f0fe': (q) => ({
    // explanation gave wrong reasons for 'read'/'reading'
    explanation_vi: "'He' là ngôi ba số ít nên 'read' thêm 's' thành 'reads'. 'Read' thiếu 's'; 'reading' cần 'is' đi kèm; 'is read' sai cấu trúc.",
  }),
  'g1-english-bulk-d9600188e2ce': (q) => ({
    // 'quiet about the trip' is also a valid phrase - use a non-emotion word
    prompt_text: 'We are so ___ about the trip!',
    choices: q.choices.map((c) => (c === 'Quiet' ? 'Yellow' : c)),
    explanation_vi: "'Eager' (háo hức) là cảm xúc khi con mong chờ chuyến đi. 'Heavy', 'light', 'yellow' không diễn tả cảm xúc với 'about'.",
  }),
  'g1-sci-v4-weather-fa9f48bf0a': (q) => ({
    // explanation must state WHY the statement is scientifically reasonable
    explanation_vi: "Câu này mô tả hiện tượng thời tiết thật: ngày nắng có ánh sáng mặt trời rực rỡ - thuộc khoa học về Trái Đất và thời tiết nên hợp lí.",
  }),
  'g1-english-bulk-f652b882238f': (q) => ({
    // 'is' agrees with the singular subject, not because of 'What'
    explanation_vi: "Chủ ngữ 'your name' là danh từ số ít nên dùng 'is'. 'Am' chỉ đi với 'I'; 'are' cho số nhiều.",
  }),
  'g3-english-bulk-3d6337a6a9af': (q) => ({
    // 'nine fifteen' is also a correct way to say 9:15 - swap for a wrong time
    choices: q.choices.map((c) => (c === "It's nine fifteen." ? "It's quarter to ten." : c)),
    explanation_vi: "9:15 nói 'quarter past nine'. 'Quarter to nine' là 8:45; 'quarter to ten' là 9:45; 'nine and fifteen' sai cấu trúc.",
  }),
  'g3-english-bulk-f39667d1c530': (q) => ({
    // asked for current time but only gave departure time - ask the right thing
    prompt_text: 'The train leaves at nine o\'clock. What time does the train leave?',
    explanation_vi: "Chuyến tàu rời lúc 9 giờ - 'It's nine o'clock.'",
  }),
  'g1-english-bulk-c671358d1e95': (q) => ({
    // 'that' does not mean 'this' - reframe as far-near pointing
    prompt_text: 'Which word points to one thing far away?',
    choices: ['these', 'this', 'that', 'those'],
    answer: { text: 'that', index: 2 },
    explanation_vi: "'That' chỉ một vật ở xa. 'This' chỉ vật ở gần; 'these'/'those' chỉ nhiều vật.",
  }),
  'g1-math-tpl-539983bf829f': (q) => ({
    // '1 marbles' is ungrammatical - singular after 1
    prompt_text: q.prompt_text.replace('1 marbles', '1 marble'),
  }),
  'g3-english-bulk-c9ab0d0866d2': (q) => ({
    // 'next to'/'in front of' also fit - keep only prepositions that fail with 'X and Y'
    choices: ['on', 'in', 'between', 'under'],
    answer: { text: 'between', index: 2 },
    explanation_vi: "Nhà ở giữa trường học và công viên - dùng 'between ... and ...'.",
  }),
  'g1-science-tpl-07ae8c7283dd': (q) => ({
    // cows can swim too - swap for an animal that cannot
    choices: q.choices.map((c) => (c === 'a cow' ? 'a spider' : c)),
    explanation_vi: "Chim cánh cụt (penguin) bơi rất giỏi dưới nước. Đại bàng bay, gà và nhện sống trên cạn.",
  }),
  // ---- round-5 spot-check fixes ----
  'g1-english-bulk-1235fd73ba26': (q) => ({
    // bare statement with color choices - ask for the color
    prompt_text: 'This leaf is green. What color is it?',
  }),
  'g1-english-bulk-3055a5998c2c': (q) => ({
    // 'dark/empty/cold emotion' are all valid phrases - use non-emotions
    prompt_text: q.prompt_text.replace('...', '___'),
    choices: ['Hopeful', 'Table', 'Window', 'Fast'],
    explanation_vi: "'Hopeful' (đầy hy vọng) là một cảm xúc. 'Table', 'window', 'fast' không phải cảm xúc.",
  }),
  'g1-english-bulk-3bea5bfcf1e4': (q) => ({
    // 'how many arms' has no subject - ask about the reader
    prompt_text: 'How many arms do you have?',
  }),
  'g1-english-bulk-9760d2726873': (q) => ({
    // 'khoping' typo in the explanation
    explanation_vi: "Em bé khóc (cry) khi cần gì đó. 'Moo' là tiếng bò, 'bark' là tiếng chó, 'chirp' là tiếng chim.",
  }),
  'g1-english-bulk-987624519c92': (q) => ({
    // 'How many is' is wrong for arithmetic - 'What is' (worded
    // differently from the existing 'What is four plus four?' row)
    prompt_text: 'How much is four plus four?',
  }),
  'g1-english-bulk-b58252d5d4c0': (q) => ({
    // word-recognition item lost its instruction
    prompt_text: 'Choose the word in the sentence: "This is my daughter."',
    explanation_vi: "Trong câu có từ 'daughter' (con gái). 'Son', 'sister', 'mother' không có trong câu.",
  }),
  'g1-english-bulk-fe3749c32c7f': (q) => ({
    // parents' male child = brother (or me), not 'son'
    choices: ['brother', 'son', 'mother', 'uncle'],
    answer: { text: 'brother', index: 0 },
    explanation_vi: "Con trai của bố mẹ mình là anh/em trai - 'brother'.",
  }),
  'g1-english-bulk-fe51f6423071': (q) => ({
    // crying can also come from anger - use a non-crying feeling
    choices: q.choices.map((c) => (c === 'angry' ? 'cold' : c)),
    explanation_vi: "Khóc thường vì buồn - 'sad'. 'Hungry' là đói, 'happy' là vui, 'cold' là lạnh - không khiến mình khóc.",
  }),
  'g1-english-codex-86582b788f74': (q) => ({
    // statement missing the article before 'cat'
    statement: 'The cat is the odd one out because it has four legs.',
  }),
  'g2-eng-spell-v5-0049-93e2f555ea': (q) => ({
    // 'seen' is also a correctly spelled word - swap for a misspelling
    choices: q.choices.map((c) => (c === 'seen' ? 'seeen' : c)),
  }),
  'g2-english-bulk-5853a474ea05': (q) => ({
    // explanation falsely claims 'likes' always takes V-ing
    explanation_vi: "Trong các lựa chọn, 'buying' là V-ing đi sau 'likes'. 'Buy' và 'buys' là dạng thường, 'bought' là quá khứ - không đi sau 'likes' khi không có 'to'.",
  }),
  'g2-english-bulk-63ad1852a199': (q) => ({
    // verbatim-match item lost its instruction - make it real comprehension
    prompt_text: 'There is a gym near here. What is near here?',
    choices: ['A gym', 'A park', 'A school', 'A market'],
    answer: { text: 'A gym', index: 0 },
    explanation_vi: "Câu nói 'There is a gym near here' - gần đây có phòng gym, nên đáp án là 'A gym'.",
  }),
  'g2-english-bulk-7c9600c14872': (q) => ({
    // birds can eat pizza - the keyed denial is factually wrong
    answer: { text: 'Yes, it can.', index: 1 },
    explanation_vi: "Chim ăn tạp nên hoàn toàn có thể ăn pizza - 'Yes, it can.' Câu hỏi dùng 'Can' nên trả lời bằng 'can', không phải 'does'.",
  }),
  'g2-english-bulk-99d1fd5eb48e': (q) => ({
    // explanation misleading: 'a lot' needs 'of' before a noun
    explanation_vi: "'Many' dùng cho danh từ đếm được số nhiều 'books'. 'Much' cho danh từ không đếm được; 'a lot' phải đi với 'of' (a lot of books); 'one' là số ít.",
  }),
  'g2-english-bulk-cd495b8d7459': (q) => ({
    // verbatim-match item lost its instruction - make it real comprehension
    prompt_text: 'She likes to skip. What does she like to do?',
    choices: ['She likes to run.', 'She likes to skip.', 'She likes to walk.', 'She likes to jump.'],
    answer: { text: 'She likes to skip.', index: 1 },
    explanation_vi: "Câu nói 'She likes to skip' - cô ấy thích nhảy dây, nên đáp án là 'She likes to skip.'",
  }),
  'g1-english-bulk-fe028b632b7a': (q) => ({
    // verbatim-match item lost its instruction - make it real comprehension
    prompt_text: 'That is my teacher. Who is that?',
    choices: ['My teacher', 'My friend', 'My mother', 'My sister'],
    answer: { text: 'My teacher', index: 0 },
    explanation_vi: "Câu nói 'That is my teacher' - kia là cô giáo của mình, nên đáp án là 'My teacher'.",
  }),
  'g2-english-gemini-45e6a13d7d43': (q) => ({
    // 'ride a helicopter' is also defensible - use a verb that cannot fit
    choices: q.choices.map((c) => (c === 'ride' ? 'climb' : c)),
    explanation_vi: "Trực thăng là phương tiện bay - 'fly a helicopter'. 'Walk', 'climb', 'drive' không dùng cho trực thăng.",
  }),
  'g2-english-gemini-672a8b9bf2e4': (q) => ({
    // explanation falsely claims 'like' always takes V-ing
    explanation_vi: "'Eating' là dạng V-ing đi sau 'like'. 'Ate' là quá khứ; 'eats' chia ngôi ba số ít; 'eat' nguyên mẫu cần thêm 'to'.",
  }),
  'g3-english-bulk-f12f41db6bec': (q) => ({
    // garden chairs exist - use an indoor-only distractor
    choices: q.choices.map((c) => (c === 'chairs' ? 'televisions' : c)),
  }),
  'g3-english-gemini-91ff77971e48': (q) => ({
    // 'seeing cartoons' is also plausible - swap for a wrong verb
    choices: q.choices.map((c) => (c === 'seeing' ? 'playing' : c)),
  }),
  'g3-gs-u18-v6-readtf-61e42ce046d0': (q) => ({
    // explanation cited the wrong sentence from the passage
    explanation_vi: "Đoạn văn viết 'The children are running.' - trùng với nhận định nên câu này đúng (True).",
  }),
  // ---- round-6 spot-check fixes ----
  'g3-english-gemini-fdb7270914fa': (q) => ({
    // 'at the library' is also valid - swap for a non-locative
    choices: q.choices.map((c) => (c === 'at' ? 'of' : c)),
    explanation_vi: "'Near' chỉ vị trí ở gần - 'the computer room is near the library'. 'On', 'in', 'of' không hợp nghĩa ở đây.",
  }),
  'g3-english-bulk-e03f7de4f76f': (q) => ({
    // 'No, she isn't' is also a well-formed answer - keep only one correct form
    choices: q.choices.map((c) => (c === "No, she isn't." ? 'No, she doesn\'t.' : c)),
    explanation_vi: "Câu hỏi dùng 'Is' nên trả lời bằng 'is/isn't'. 'Yes, she is.' đúng; 'does' và 'don't' sai trợ động từ.",
  }),
  'g3-mat-v4-data-charts-36c54005ac': (q) => ({
    // A=B=D=9 gives three correct answers - make A unique
    prompt_text: 'A table shows A=9, B=7, C=8, D=6. Which category has the highest value?',
    explanation_vi: "Trong bảng, A bằng 9 là giá trị lớn nhất (B=7, C=8, D=6 đều nhỏ hơn).",
  }),
  'g3-english-bulk-c0c489c6f8e5': (q) => ({
    // 'resided' also fits without a time marker - use a non-finite form
    choices: q.choices.map((c) => (c === 'resided' ? 'to reside' : c)),
    explanation_vi: "'My grandparents' là chủ ngữ số nhiều nên động từ giữ nguyên 'reside'. 'Resides' cho số ít; 'residing' cần 'are'; 'to reside' là nguyên mẫu.",
  }),
  'g3-english-bulk-d031cbbc6f2c': (q) => ({
    // 'hit the ball with his foot' is also valid - use a verb that cannot fit
    choices: q.choices.map((c) => (c === 'hit' ? 'wear' : c)),
    explanation_vi: "Dùng chân thì hành động với quả bóng là 'kick' (đá). 'Throw' dùng tay, 'wear' là mặc, 'catch' là bắt.",
  }),
  'g3-english-bulk-d98cd9d3171d': (q) => ({
    // answer 'often' duplicated the prompt's 'often' - drop it and keep
    // only one frequency adverb
    prompt_text: 'He ______ goes shopping on Sundays.',
    choices: q.choices.map((c) => (c === 'always' ? 'yesterday' : c)),
    explanation_vi: "'On Sundays' diễn tả thói quen nên dùng trạng từ tần suất 'often'. 'Now', 'at the moment', 'yesterday' không hợp thì hiện tại đơn.",
  }),
  'g3-english-gemini-b4a44821989c': (q) => ({
    // how long/old/much all form valid questions - pin a price answer
    prompt_text: "How ___ is this T-shirt? - It's 50,000 dong.",
    explanation_vi: "Câu trả lời nêu giá tiền (50,000 dong) nên câu hỏi phải là 'How much'.",
  }),
  'g3-gs-u01-v6-readtf-12e2707c6d08': (q) => ({
    // explanation cited the second sentence instead of the matching one
    explanation_vi: "Đoạn văn viết 'I say hello to my friend.' - trùng với nhận định nên câu này đúng (True).",
  }),
  'g1-eng-v4b-reading-basic-93e590e3645e': (q) => ({
    // 'a red red' is malformed and 'the red' is not a noun phrase -
    // give the object a noun and ask about it
    prompt_text: 'Read: "Ben has a red pen. Ben likes it." What colour is the pen?',
    passage: 'Ben has a red pen. Ben likes it.',
    explanation_vi: "Đoạn văn viết 'Ben has a red pen' - chiếc bút màu đỏ, nên đáp án là 'red'.",
  }),
  'g3-english-bulk-ce914a79138b': (q) => ({
    // explanation wrongly denied that 'in the bag' shows position
    explanation_vi: "'It's next to the park.' chỉ vị trí hợp lý cho bưu điện. 'It's in the bag' tuy chỉ vị trí nhưng không hợp lý; 'big' và 'blue' tả đặc điểm.",
  }),
  'g4-english-bulk-9d44c470cff6': (q) => ({
    // 'Yes, I have some.' is also well-formed - keep one correct form
    choices: q.choices.map((c) => (c === 'Yes, I have some.' ? 'Yes, I do has some.' : c)),
    explanation_vi: "Phủ định dùng 'don't have any' - 'No, I don't have any.' đúng. 'Have some' trong câu khẳng định thì đúng ngữ pháp, nhưng các lựa chọn còn lại sai cấu trúc ('do has', 'don't have some', 'have any').",
  }),
  'g4-english-bulk-7866379f4ea6': (q) => ({
    // answer recounts a finished event - question needs past tense
    prompt_text: 'Did you have any breakfast this morning?',
  }),
  // ---- round-7 spot-check fixes ----
  'g1-english-bulk-794b263cdb06': (q) => ({
    // birds also swim and sleep - only flies is unique to them here
    choices: q.choices.map((c) => (c === 'it swims' ? 'it cooks' : c === 'it sleeps' ? 'it drives' : c)),
    explanation_vi: "'It flies' (nó bay) là hành động đặc trưng của chim. Chim không đọc sách, không nấu ăn và không lái xe.",
  }),
  'g1-english-bulk-c8f2b56c3c9d': (q) => ({
    // 'Hello' is a valid afternoon greeting too - use a farewell
    choices: q.choices.map((c) => (c === 'Hello.' ? 'Goodbye.' : c)),
    explanation_vi: "'Good afternoon' là lời chào buổi chiều. 'Good morning' là buổi sáng, 'Good night' là chúc ngủ ngon, 'Goodbye' là tạm biệt.",
  }),
  'g1-english-bulk-f6b96a101ef4': (q) => ({
    // 'a excited' is ungrammatical - 'excited' starts with a vowel
    prompt_text: 'This is an __ boy.',
    explanation_vi: "'Excited' bắt đầu bằng nguyên âm nên đi với 'an' - 'an excited boy'. Các từ khác (chair, table, green) không hợp với 'an' hoặc không hợp nghĩa.",
  }),
  'g1-english-bulk-e402ddf0e1d0': (q) => ({
    // 'blue' can mean sad - do not claim it never relates to feelings
    explanation_vi: "'Happy' nghĩa là vui. 'Tall' và 'round' tả hình dáng; 'blue' là màu sắc - từ chỉ cảm xúc vui vẻ ở đây là 'happy'.",
  }),
  'g1-english-bulk-88239249f1d2': (q) => ({
    // bare statement leaked the answer - make it a cloze; 'We hear'
    // variant because 'I hear with my ___.' already exists twice
    prompt_text: 'We hear with our ___.',
    explanation_vi: "Mình nghe bằng tai nên chỗ trống là 'ears'. 'Eyes' để nhìn, 'nose' để ngửi, 'mouth' để ăn nói.",
  }),
  'g1-english-bulk-06821fd29571': (q) => ({
    // bare statement - spell out what is being counted
    prompt_text: 'I have one brother and two sisters. How many brothers and sisters do I have?',
    explanation_vi: "1 anh/em trai + 2 chị/em gái = 3 anh chị em. Đáp án là 'Three'.",
  }),
  'g1-english-bulk-596da8f3a5d3': (q) => ({
    // water can be hot too - swap for a cold food
    choices: q.choices.map((c) => (c === 'Water' ? 'Salad' : c)),
    explanation_vi: "'Soup' (súp) thường ăn nóng. Kem, nước ép và salad đều ăn lạnh hoặc mát.",
  }),
  'g1-eng-v4b-spelling-3215b9fc2f19': (q) => ({
    // '_ilk' has two valid completions (silk, milk) - anchor the word
    prompt_text: 'Choose the missing letter: mi_k',
    choices: ['k', 's', 'm', 't'],
    answer: { text: 'k', index: 0 },
    explanation_vi: 'Từ đầy đủ là "milk" (sữa) - chỗ trống là chữ k.',
  }),
  // ---- round-8 spot-check fixes ----
  'g1-english-bulk-23bfaf223439': (q) => ({
    // 'We are play games' is ungrammatical - the verb needs -ing
    prompt_text: 'We ___ playing games.',
    explanation_vi: "Với chủ ngữ 'We' và động từ đang diễn ra 'playing', mình dùng 'are' - 'We are playing games.'",
  }),
  'g1-english-bulk-2b99f667b30b': (q) => ({
    // singular count noun needs a determiner
    prompt_text: 'A duck ___ swimming.',
    explanation_vi: "'A duck' là chủ ngữ số ít nên đi với 'is'. 'are' cho số nhiều, 'am' cho 'I', 'be' không đứng sau chủ ngữ.",
  }),
  'g1-english-bulk-fd6088389838': (q) => ({
    // bare statement leaked the answer - make it a cloze
    prompt_text: 'I have one ___.',
    explanation_vi: "'One foot' - một bàn chân. 'Feet' là số nhiều; 'leg' là chân, 'knee' là đầu gối.",
  }),
  'g1-english-bulk-976dd9d43e05': (q) => ({
    // 'chủ ngữ số ba' is wrong terminology
    explanation_vi: "Đáp án là 'runs' vì 'my brother' là chủ ngữ ngôi thứ ba số ít - động từ thêm 's' ở hiện tại đơn. 'Run', 'running', 'to run' không đúng.",
  }),
  'g3-english-bulk-344df063e135': (q) => ({
    // 'next to' also fits without a picture - use an implausible distractor
    choices: q.choices.map((c) => (c === 'next to' ? 'under' : c)),
    explanation_vi: "'Between' chỉ vị trí ở giữa hai vật - 'the lamp is between the two chairs'. 'On', 'in', 'under' không hợp nghĩa ở đây.",
  }),
  'g3-english-bulk-3a5e99635c2f': (q) => ({
    // 'went' is also grammatically valid - use a non-finite form
    choices: q.choices.map((c) => (c === 'went' ? 'to go' : c)),
    explanation_vi: "'She' là ngôi thứ ba số ít nên 'go' thành 'goes' ở hiện tại đơn. 'Go' cho số nhiều, 'going' cần 'is', 'to go' là nguyên mẫu.",
  }),
  'g3-english-bulk-34d18036887a': (q) => ({
    // 'lived' is also grammatically valid - use a non-finite form
    choices: q.choices.map((c) => (c === 'lived' ? 'to live' : c)),
    explanation_vi: "'My parents' là số nhiều nên 'live' giữ nguyên. 'Lives' cho số ít, 'living' cần 'are', 'to live' là nguyên mẫu.",
  }),
  'g3-english-bulk-2a300c6634eb': (q) => ({
    // January=winter assumes a northern climate - anchor the place
    prompt_text: 'We wear warm clothes in ______ in Canada.',
    explanation_vi: "Ở Canada, tháng Một (January) là mùa đông lạnh nên mặc quần áo ấm. April, July, August đều ấm hơn.",
  }),
  'g2-mat-v4b-fractions-basic-79ed45d30e04': (q) => ({
    // '1 piece(s) are' is ungrammatical
    prompt_text: 'A pizza is cut into 4 equal pieces. 1 piece is eaten. What fraction is one piece?',
  }),
  'g2-mat-v4b-fractions-basic-5f6148f8ca92': (q) => ({
    // '3 piece(s) are' - drop the template placeholder
    prompt_text: 'A pizza is cut into 4 equal pieces. 3 pieces are eaten. What fraction is one piece?',
  }),
  'g2-sci-v4-community-safety-8b32f25b5e': (q) => ({
    // explanation was tautological - cite why the statement is scientific
    explanation_vi: "Mũ bảo hiểm bảo vệ đầu khi đạp xe là kiến thức khoa học về an toàn và sức khỏe, nên nhận định này có cơ sở khoa học.",
  }),
  // ---- round-9 spot-check fixes ----
  'g3-mat-v4-data-charts-b9dde10e2a': (q) => ({
    // A and B tied at the maximum - lower B
    prompt_text: 'A table shows A=9, B=8, C=5, D=5. Which category has the highest value?',
    explanation_vi: 'A bằng 9 là giá trị lớn nhất; B=8, C=5, D=5 đều nhỏ hơn.',
  }),
  'g4-mat-v4-data-charts-84c648770f': (q) => ({
    prompt_text: 'A table shows A=9, B=8, C=5, D=4. Which category has the highest value?',
    explanation_vi: 'A bằng 9 là giá trị lớn nhất; B=8, C=5, D=4 đều nhỏ hơn.',
  }),
  'g4-mat-v4-data-charts-e3beae504e': (q) => ({
    prompt_text: 'A table shows A=5, B=9, C=8, D=7. Which category has the highest value?',
    explanation_vi: 'B bằng 9 là giá trị lớn nhất; A=5, C=8, D=7 đều nhỏ hơn.',
  }),
  'g3-mat-v4-data-charts-8c00c2b9a8': (q) => ({
    prompt_text: 'A table shows A=9, B=7, C=8, D=4. Which category has the highest value?',
    explanation_vi: 'A bằng 9 là giá trị lớn nhất; B=7, C=8, D=4 đều nhỏ hơn.',
  }),
  'g1-english-bulk-22171a71b5c0': (q) => ({
    // 'I am happy' is also a valid completion - pin the name frame
    prompt_text: 'Hello, my name is ___.',
    explanation_vi: "'My name is Anna' - giới thiệu tên. 'Book', 'red', 'happy' không phải tên riêng.",
  }),
  'g1-english-bulk-5142e5eacb2a': (q) => ({
    // pink/black/white are NOT rainbow colours - 'all of the above' was
    // wrong and C already listed valid colours. One correct set only.
    choices: ['red, blue, yellow', 'pink, black, white', 'silver, gold, brown', 'none of the above'],
    answer: { text: 'red, blue, yellow', index: 0 },
    explanation_vi: "Cầu vồng có đỏ, xanh dương, vàng. 'Pink/black/white' và 'silver/gold/brown' không phải màu cầu vồng.",
  }),
  'g1-english-bulk-802709bbd527': (q) => ({
    // 'I am a doll.' is grammatical - it just does not use 'are'
    explanation_vi: "'They are dolls.' dùng 'are' đúng với chủ ngữ số nhiều. 'I am a doll' đúng ngữ pháp nhưng dùng 'am'; 'You is' và 'She are' sai.",
  }),
  'g1-english-bulk-25d135c950cd': (q) => ({
    // mother's brother is 'cậu' (or bác), never 'chú'
    explanation_vi: "Anh/em trai của mẹ là cậu - 'uncle'. 'Chú' là em trai của bố; 'father', 'brother', 'grandfather' không đúng quan hệ này.",
  }),
  // ---- round-10 spot-check fixes ----
  'g1-science-tpl-75a52fea15a4': (q) => ({
    // glass and hard plastics are also hard - ask the property that
    // singles out metal
    prompt_text: 'Which material conducts heat well?',
    explanation_vi: 'Kim loại (metal) dẫn nhiệt tốt. Nhựa, thủy tinh và cao su dẫn nhiệt kém.',
  }),
  'g3-english-bulk-62a0e6afb1c4': (q) => ({
    // 'He never drank coffee' is also valid - use a non-finite form
    choices: q.choices.map((c) => (c === 'drank' ? 'to drink' : c)),
    explanation_vi: "'He never' + hiện tại đơn - chủ ngữ ngôi thứ ba số ít nên 'drink' thêm 's' thành 'drinks'. 'To drink' là nguyên mẫu, 'drinking' cần 'is', 'drink' cho số nhiều.",
  }),
  'g3-english-bulk-54c62211d953': (q) => ({
    // 'Noon' also falls between morning and evening - use a non-time word
    choices: q.choices.map((c) => (c === 'Noon.' ? 'Weekend.' : c)),
    explanation_vi: "Khoảng giữa buổi sáng và buổi tối là 'buổi chiều' - 'Afternoon'. 'Night', 'Midnight' là ban đêm; 'Weekend' là cuối tuần.",
  }),
  'g1-eng-v4b-spelling-020d8bd2c647': (q) => ({
    // '_all' accepts ball/fall/tall/wall - anchor the word shape;
    // 'ba_l'/'ca_l' already exist - use 'bell'
    prompt_text: 'Choose the missing letter: be_l',
    choices: ['l', 'm', 'p', 't'],
    answer: { text: 'l', index: 0 },
    explanation_vi: 'Từ đầy đủ là "bell" (cái chuông) - chỗ trống là chữ l.',
  }),
  'g1-eng-spell-v5-0045-b821dc9a1c': (q) => ({
    // 'yoyo' is also an accepted spelling - make the distractor clearly wrong
    choices: q.choices.map((c) => (c === 'yoyo' ? 'yoyyo' : c)),
    explanation_vi: 'Cách viết đúng là "yo-yo" - có gạch nối giữa hai âm tiết.',
  }),
};

// ---- patch builders ----------------------------------------------------
const SEES_RE = /^([A-Z][a-z]+) sees an? animal with (.+?) (?:at|in) (?:a|the) [a-z ]+\.?\s*Which animal could it be\??\.?$/;
const FINDS_RE = /^([A-Z][a-z]+) finds an? ([a-z]+) (?:at|in) (?:a|the) [a-z ]+\. It has (.+?)\. What group is it\?$/;
const BABY_RE = /^(?:At (?:a|the) [a-z ]+, )?[A-Z][a-z]+ finds a baby ([a-z]+)\. It came from ___\.?$/;
const REORDER_EMBED_RE = /order\s*:\s*(.+)$/i;

function patchReorder(q) {
  // v4 sentence-building rows embed the word bank in the prompt but store
  // tokens=null - the mapper drops them, so the row is silently unservable.
  // tokens = the words of the keyed answer (same convention as v6 rows).
  if (q.question_type !== 'reorder' || (Array.isArray(q.tokens) && q.tokens.length >= 2)) return null;
  const ans = q.answer?.text;
  if (!ans || !REORDER_EMBED_RE.test(q.prompt_text || '')) return { flag: 'reorder-no-derivable' };
  const tokens = ans.trim().split(/\s+/);
  if (tokens.length < 2) return { flag: 'reorder-answer-short' };
  return {
    patch: {
      prompt_text: 'Rearrange the words to make a correct sentence.',
      tokens,
    },
  };
}

function patchSees(q) {
  const m = (q.prompt_text || '').match(SEES_RE);
  if (!m || !ATTR_HAS[m[2]]) return null;
  const [, name, attr] = m;
  const ans = q.answer?.text;
  if (!ATTR_HAS[attr].includes(ans)) return { flag: 'sees-answer-mismatch' };
  const pool = safeDistractors(attr).filter((a) => a !== ans);
  const distractors = pick3(pool, h32(q.id));
  const idx = h32(q.id) % 4;
  const choices = [...distractors];
  choices.splice(idx, 0, ans);
  const place = ANIMAL_PLACE[ans] || 'at the park';
  return {
    patch: {
      prompt_text: `${name} sees an animal with ${attr} ${place}. Which animal could it be?`,
      choices,
      answer: { text: ans, index: idx },
      explanation_vi: `Con vật có ${attr} - ${ans} (${ANIMAL_VN[ans] || ans}) có ${attr}.`,
    },
  };
}

function patchFinds(q) {
  const m = (q.prompt_text || '').match(FINDS_RE);
  if (!m) return null;
  const [, name, animal, attr] = m;
  if (!ANIMAL_VN[animal] || !ATTR_HAS[attr]?.includes(animal)) return { flag: 'finds-attr-mismatch' };
  const group = (q.answer?.text || '').replace(/^an?\s+/, '');
  if (ANIMAL_GROUP[animal] && group && ANIMAL_GROUP[animal] !== group) return { flag: 'finds-group-mismatch', detail: `${animal}->${group}` };
  const place = ANIMAL_PLACE[animal] || 'at the park';
  const art = /^[aeiou]/.test(animal) ? 'an' : 'a';
  const choices = (q.choices || []).map((c) => fixArticles(c));
  const answer = { ...q.answer, text: fixArticles(q.answer?.text || '') };
  const gv = GROUP_VN[group] || group;
  return {
    patch: {
      prompt_text: `${name} finds ${art} ${animal} ${place}. It has ${attr}. What group is it?`,
      choices,
      answer,
      explanation_vi: `${animal} (${ANIMAL_VN[animal]}) thuộc nhóm ${group} (${gv}). Đặc điểm: có ${attr}.`,
    },
  };
}

function patchBaby(q) {
  const m = (q.prompt_text || '').match(BABY_RE);
  if (!m) return null;
  const animal = m[1];
  const off = OFFSPRING[animal];
  if (!off) return { flag: 'baby-unknown-animal' };
  const pool = offspringDistractors(off);
  const distractors = pick3(pool, h32(q.id));
  const idx = h32(q.id) % 4;
  const choices = [...distractors];
  choices.splice(idx, 0, off);
  return {
    patch: {
      prompt_text: `A baby ${animal} is called ___.`,
      choices,
      answer: { text: off, index: idx },
      explanation_vi: `Con non của ${animal} (${ANIMAL_VN[animal] || animal}) được gọi là "${off}".`,
    },
  };
}

function patchArticles(q) {
  const np = fixArticles(q.prompt_text);
  const nc = Array.isArray(q.choices) ? q.choices.map((c) => fixArticles(c)) : q.choices;
  const na = q.answer?.text ? { ...q.answer, text: fixArticles(q.answer.text) } : q.answer;
  const ne = fixArticles(q.explanation_vi);
  const patch = {};
  if (np !== q.prompt_text) patch.prompt_text = np;
  if (JSON.stringify(nc) !== JSON.stringify(q.choices)) patch.choices = nc;
  if (JSON.stringify(na) !== JSON.stringify(q.answer)) patch.answer = na;
  if (ne !== q.explanation_vi) patch.explanation_vi = ne;
  return Object.keys(patch).length ? { patch } : null;
}

// "A frog is a ___" + choices that already carry articles ("an amphibian")
// produce "a an amphibian" - drop the article from the prompt.
const ISA_BLANK_RE = /\b(a|an)\s+_{2,}/i;
function patchIsABlank(q) {
  const cs = Array.isArray(q.choices) ? q.choices : [];
  if (!cs.length || !cs.every((c) => /^an?\s/i.test(c))) return null;
  const np = (q.prompt_text || '').replace(/\b(a|an)\s+(_{2,})/gi, '$2');
  if (np === q.prompt_text) return null;
  return { patch: { prompt_text: np } };
}

// "Which covering does a X have?" keyed on an appendage/body answer ->
// "Which feature...". Under the wider "feature" reading ANY true
// attribute of X would also be a defensible distractor, so distractors
// colliding with X's real attributes are replaced from the safe pool.
const COVERING_RE = /^Which covering does (?:a|an) ([a-z]+) have\?$/;
function patchCovering(q) {
  const m = (q.prompt_text || '').match(COVERING_RE);
  if (!m) return null;
  const animal = m[1];
  const ans = (q.answer?.text || '').toLowerCase();
  const animalHas = new Set(attrsOf(animal));
  const patch = {};
  if (NON_COVERING.has(ans)) {
    patch.prompt_text = `Which feature does ${/\b[aeiou]/.test(animal[0]) ? 'an' : 'a'} ${animal} have?`;
  }
  // distractors that are ALSO true of this animal make the row ambiguous
  const badPool = Object.keys(ATTR_HAS).filter((a) => !animalHas.has(a) && a !== ans);
  const cs = (q.choices || []).map((c) => c.toLowerCase());
  const ansIdx = q.answer?.index ?? cs.indexOf(ans);
  if (ansIdx < 0 || !cs.length) return { flag: 'covering-no-answer-idx' };
  let changed = false;
  const used = new Set(cs);
  const nc = (q.choices || []).map((c, i) => {
    if (i === ansIdx) return c;
    const lc = c.toLowerCase();
    const collides = patch.prompt_text ? animalHas.has(lc) : (COVERING_ATTRS.has(lc) && animalHas.has(lc));
    if (!collides) return c;
    for (let k = 0; k < badPool.length; k++) {
      const cand = badPool[(h32(q.id) + i * 5 + k) % badPool.length];
      if (!used.has(cand)) { used.add(cand); changed = true; return cand; }
    }
    return c;
  });
  if (changed) patch.choices = nc;
  if (!Object.keys(patch).length) return null;
  if (patch.prompt_text) patch.explanation_vi =
    `${animal} (${ANIMAL_VN[animal] || animal}) có đặc điểm "${ans}".`;
  return { patch };
}

// "Where does a X live?" - a distractor that is a genuinely valid habitat
// for X makes the row ambiguous (whale + "cold polar regions").
const LIVES_RE = /^Where does (?:a|an) ([a-z]+) live\?$/;
function patchHabitat(q) {
  const m = (q.prompt_text || '').match(LIVES_RE);
  if (!m || !Array.isArray(q.choices)) return null;
  const animal = m[1];
  const valid = new Set(VALID_HABITATS[animal] || []);
  if (!valid.size) return null;
  const ans = (q.answer?.text || '').toLowerCase();
  const pool = wrongHabitats(animal).filter((h) => h !== ans);
  const used = new Set(q.choices.map((c) => c.toLowerCase()));
  const ansIdx = q.answer?.index ?? q.choices.findIndex((c) => c.toLowerCase() === ans);
  if (ansIdx < 0) return null;
  let changed = false;
  const nc = q.choices.map((c, i) => {
    if (i === ansIdx || !valid.has(c.toLowerCase())) return c;
    for (let k = 0; k < pool.length; k++) {
      const cand = pool[(h32(q.id) + i * 3 + k) % pool.length];
      if (!used.has(cand)) { used.add(cand); changed = true; return cand; }
    }
    return c;
  });
  if (!changed) return null;
  return { patch: { choices: nc } };
}

// "Which animal lives in <habitat>?" - any distractor whose own
// VALID_HABITATS set contains the target habitat is also defensible and
// must be swapped for an animal that does not live there.
const LIVES_IN_RE = /^Which animal lives in (.+?)\??$/;
function patchLivesIn(q) {
  const m = (q.prompt_text || '').match(LIVES_IN_RE);
  if (!m || !Array.isArray(q.choices)) return null;
  const habitat = m[1].replace(/\.$/, '').trim().toLowerCase().replace(/^the\s+/, '');
  const animalOf = (c) => String(c).toLowerCase().replace(/^(a|an)\s+/, '');
  const ansIdx = q.answer?.index ?? q.choices.findIndex((c) => animalOf(c) === (q.answer?.text || '').toLowerCase());
  if (ansIdx < 0) return null;
  const livesThere = (a) => (VALID_HABITATS[a] || []).some((h) => h === habitat || h === 'the ' + habitat);
  const pool = Object.keys(VALID_HABITATS).filter((a) => !livesThere(a));
  const used = new Set(q.choices.map((c) => animalOf(c)));
  let changed = false;
  const nc = q.choices.map((c, i) => {
    if (i === ansIdx || !livesThere(animalOf(c))) return c;
    for (let k = 0; k < pool.length; k++) {
      const cand = pool[(h32(q.id) + i * 3 + k) % pool.length];
      if (!used.has(cand)) { used.add(cand); changed = true; return 'a ' + cand; }
    }
    return c;
  });
  if (!changed) return null;
  // the keyed answer must actually live in the named habitat
  const ans = animalOf(q.choices[ansIdx]);
  if (!livesThere(ans)) return { flag: 'lives-in-wrong-answer', detail: `${ans} !~ ${habitat}` };
  return { patch: { choices: nc } };
}

// Country/proper names written lowercase in prompts, choices, answers,
// or explanations ("Which picture shows \"belize\"?") - capitalize them.
// Object choices (assetId tiles) are untouched.
function patchProperCase(q) {
  // spell-test rows carry deliberately misspelled distractors ("american
  // football") - normalizing them would destroy the exercise.
  if (/spell/i.test(q.question_type || '') || /spell/i.test(q.id || '')) return null;
  const np = fixProperCase(q.prompt_text);
  const nc = Array.isArray(q.choices)
    ? q.choices.map((c) => (typeof c === 'string' ? fixProperCase(c) : c))
    : q.choices;
  const na = q.answer?.text ? { ...q.answer, text: fixProperCase(q.answer.text) } : q.answer;
  // acronyms off for the Vietnamese field - 'đun', '/uk/' etc. are not PE/UN/UK
  const ne = fixProperCase(q.explanation_vi, { acronyms: false });
  const patch = {};
  if (np !== q.prompt_text) patch.prompt_text = np;
  if (JSON.stringify(nc) !== JSON.stringify(q.choices)) patch.choices = nc;
  if (JSON.stringify(na) !== JSON.stringify(q.answer)) patch.answer = na;
  if (ne !== q.explanation_vi) patch.explanation_vi = ne;
  return Object.keys(patch).length ? { patch } : null;
}

// Wrong taught collocations ("in a shelf", "in the farm") - fix in
// prompt, choices, answer and explanation.
function patchPrepositions(q) {
  const np = fixPrepositions(q.prompt_text);
  const ns = fixPrepositions(q.statement);
  const nc = Array.isArray(q.choices)
    ? q.choices.map((c) => (typeof c === 'string' ? fixPrepositions(c) : c))
    : q.choices;
  const na = typeof q.answer?.text === 'string' ? { ...q.answer, text: fixPrepositions(q.answer.text) } : q.answer;
  const ne = fixPrepositions(q.explanation_vi);
  const patch = {};
  if (np !== q.prompt_text) patch.prompt_text = np;
  if (ns !== q.statement) patch.statement = ns;
  if (JSON.stringify(nc) !== JSON.stringify(q.choices)) patch.choices = nc;
  if (JSON.stringify(na) !== JSON.stringify(q.answer)) patch.answer = na;
  if (ne !== q.explanation_vi) patch.explanation_vi = ne;
  return Object.keys(patch).length ? { patch } : null;
}

// 'What do you say to sit down?' literally asks what YOU say when YOU
// want to sit - the keyed answer is an imperative aimed at the listener.
// Rephrase so the addressee is explicit.
const SAYTO_RE = /^What do you say to (sit|stand|come|go|open|close|read|write|listen|look|raise|answer|stay|clean|line up|turn|give|show|be quiet|stop|get)\b(.*)\?$/i;
function patchSayTo(q) {
  const m = (q.prompt_text || '').match(SAYTO_RE);
  if (!m || !Array.isArray(q.choices)) return null;
  const comp = (m[1] + m[2]).trim();
  const ans = q.answer?.text;
  const patch = {
    prompt_text: `Which sentence asks someone to ${comp}?`,
    explanation_vi: `'${ans}' là câu ra hiệu lịch sự khi muốn bảo người khác "${comp}".`,
  };
  return { patch };
}

const TPL_PRED = (q) =>
  SEES_RE.test(q.prompt_text || '') || FINDS_RE.test(q.prompt_text || '') ||
  BABY_RE.test(q.prompt_text || '') || patchReorder(q) !== null || TARGETED_FIXES[q.id] ||
  ISA_BLANK_RE.test(q.prompt_text || '') || COVERING_RE.test(q.prompt_text || '') ||
  LIVES_RE.test(q.prompt_text || '') || LIVES_IN_RE.test(q.prompt_text || '') || patchProperCase(q) !== null ||
  patchPrepositions(q) !== null || patchOnePlural(q) !== null || patchSayTo(q) !== null ||
  /\b(a|A)\s+[aeiou][a-z]|\b(a|an|A|An)\s+(a|an)\s/i.test(q.prompt_text || '') ||
  (Array.isArray(q.choices) && q.choices.some((c) => /\b(a|A)\s+[aeiou][a-z]|\b(a|an)\s+(a|an)\s/i.test(c))) ||
  /\b(a|A)\s+[aeiou][a-z]/i.test(q.answer?.text || '');

// 'has 1 flowers' - singularize the noun after a count of one.
const SINGULAR_S = new Set(['class', 'glass', 'grass', 'bus', 'dress', 'mess', 'kiss', 'plus', 'this', 'his', 'is', 'has', 'was', 'its', 'yes', 'cross', 'miss', 'boss', 'loss', 'toss', 'pass', 'gas', 'us', 'tennis']);
const DEPLURAL_EX = { cookies: 'cookie', movies: 'movie', brownies: 'brownie', zombies: 'zombie', hoodies: 'hoodie', calories: 'calorie', panties: 'pantie' };
const dePlural = (w) =>
  SINGULAR_S.has(w.toLowerCase()) ? w
    : DEPLURAL_EX[w.toLowerCase()] ? DEPLURAL_EX[w.toLowerCase()]
    : /ies$/i.test(w) ? w.replace(/ies$/i, 'y')
    : /(ss|ch|sh|x|o)es$/i.test(w) ? w.replace(/es$/i, '')
    : w.replace(/s$/i, '');
const ONE_PLURAL_RE = /\b(1)\s+([a-z]+s)\b/gi;
const ONE_MORE_RE = /\b1 more ([a-z]+s)\b/gi;
const PIECES_RE = /\b(\d+) (\w+)\(s\)/g;
function fixOnePlural(text) {
  if (typeof text !== 'string') return text;
  return text
    .replace(ONE_PLURAL_RE, (m, one, w) => {
      const s = dePlural(w);
      return s === w ? m : `${one} ${s}`;
    })
    .replace(ONE_MORE_RE, (m, w) => `1 more ${dePlural(w)}`)
    // '3 piece(s)' -> '3 pieces' (n=1 'are'->'is' rows are handled by TARGETED_FIXES)
    .replace(PIECES_RE, (m, n, w) => (n === '1' ? m : `${n} ${w}s`));
}
function patchOnePlural(q) {
  const patch = {};
  const np = fixOnePlural(q.prompt_text);
  if (np !== q.prompt_text) patch.prompt_text = np;
  const ne = fixOnePlural(q.explanation_vi);
  if (ne !== q.explanation_vi) patch.explanation_vi = ne;
  return Object.keys(patch).length ? { patch } : null;
}

const stats = { sees: 0, finds: 0, baby: 0, reorder: 0, article: 0, targeted: 0, isablank: 0, covering: 0, habitat: 0, livesin: 0, propercase: 0, preposition: 0, oneplural: 0, sayto: 0, noop: 0, flags: [] };

async function main() {
  if (DRY) {
    const ts = Date.now();
    const file = `docs/qa/template-repair-${ts}.jsonl`;
    let n = 0;
    for await (const q of fetchMatching(TPL_PRED)) {
      let res = null, kind = null;
      if (TARGETED_FIXES[q.id]) { res = { patch: TARGETED_FIXES[q.id](q) }; kind = 'targeted'; }
      else if (SEES_RE.test(q.prompt_text || '')) { res = patchSees(q); kind = 'sees'; }
      else if (FINDS_RE.test(q.prompt_text || '')) { res = patchFinds(q); kind = 'finds'; }
      else if (BABY_RE.test(q.prompt_text || '')) { res = patchBaby(q); kind = 'baby'; }
      else if (COVERING_RE.test(q.prompt_text || '')) { res = patchCovering(q); kind = 'covering'; }
      else if (LIVES_RE.test(q.prompt_text || '')) { res = patchHabitat(q); kind = 'habitat'; }
      else if (LIVES_IN_RE.test(q.prompt_text || '') && patchLivesIn(q)) { res = patchLivesIn(q); kind = 'livesin'; }
      else if (q.question_type === 'reorder') { res = patchReorder(q); kind = 'reorder'; }
      else if (ISA_BLANK_RE.test(q.prompt_text || '') && patchIsABlank(q)) { res = patchIsABlank(q); kind = 'isablank'; }
      else if (patchProperCase(q)) { res = patchProperCase(q); kind = 'propercase'; }
      else if (patchPrepositions(q)) { res = patchPrepositions(q); kind = 'preposition'; }
      else if (patchOnePlural(q)) { res = patchOnePlural(q); kind = 'oneplural'; }
      else if (patchSayTo(q)) { res = patchSayTo(q); kind = 'sayto'; }
      else {
        // Skip rows that teach the a/an distinction itself - their
        // ungrammatical 'a <vowel>' distractors are deliberate.
        const cs = Array.isArray(q.choices) ? q.choices : [];
        const teachesAn = cs.some((c) => /\ban\s+[aeiou]/i.test(c)) && cs.some((c) => /\b(a|A)\s+[aeiou]/i.test(c));
        if (teachesAn) { stats.noop++; continue; }
        res = patchArticles(q); kind = 'article';
      }
      if (!res) { stats.noop++; continue; }
      if (res.flag) { stats.flags.push({ id: q.id, flag: res.flag, detail: res.detail }); continue; }
      const patch = { ...res.patch };
      // article + proper-case + preposition passes over every patched field too
      for (const k of ['prompt_text', 'explanation_vi', 'statement']) if (patch[k]) patch[k] = fixProperCase(fixPrepositions(fixArticles(patch[k])), { acronyms: k !== 'explanation_vi' });
      if (patch.choices) patch.choices = patch.choices.map((c) => typeof c === 'string' ? fixProperCase(fixArticles(c)) : c);
      if (patch.answer?.text) patch.answer = { ...patch.answer, text: fixProperCase(fixArticles(patch.answer.text)) };
      const merged = {
        prompt_text: patch.prompt_text ?? q.prompt_text,
        choices: patch.choices ?? q.choices,
        answer: patch.answer ?? q.answer,
      };
      patch.content_hash = contentHash(merged.prompt_text, merged.choices, merged.answer, q.passage);
      // no-op guard: every patch field already equals the live value
      const cur = { prompt_text: q.prompt_text, question_type: q.question_type, choices: q.choices, answer: q.answer, explanation_vi: q.explanation_vi, tokens: q.tokens, statement: q.statement, content_hash: null };
      const changed = Object.keys(patch).filter((k) => k !== 'content_hash' && JSON.stringify(patch[k]) !== JSON.stringify(cur[k]));
      if (!changed.length) { stats.noop++; continue; }
      const before = { prompt_text: q.prompt_text, question_type: q.question_type, choices: q.choices, answer: q.answer, explanation_vi: q.explanation_vi, tokens: q.tokens, statement: q.statement };
      appendFileSync(file, JSON.stringify({ id: q.id, kind, before, patch }) + '\n');
      stats[kind]++; n++;
    }
    console.log(JSON.stringify(stats, null, 1));
    console.log(`proposals: ${n} -> ${file}`);
    return;
  }
  // apply: conditional per-row update verified against `before`
  const lines = readFileSync(APPLY, 'utf8').trim().split('\n').slice(FROM).map(JSON.parse);
  let ok = 0, skip = 0, fail = 0, done = 0;
  const applyOne = async (p) => {
    const r = await fetch(`${URL}/rest/v1/qb_questions?id=eq.${p.id}&select=prompt_text,question_type,choices,answer,explanation_vi,tokens,statement`, { headers: H });
    const [cur] = await r.json();
    if (!cur) { console.error('MISSING', p.id); fail++; return; }
    const drift = ['prompt_text', 'explanation_vi', 'question_type', 'statement'].some((k) => p.before[k] !== undefined && cur[k] !== p.before[k])
      || ['choices', 'answer', 'tokens'].some((k) => p.before[k] !== undefined && JSON.stringify(cur[k]) !== JSON.stringify(p.before[k]));
    if (drift) {
      const already = ['prompt_text', 'explanation_vi', 'question_type', 'statement'].every((k) => p.patch[k] === undefined || cur[k] === p.patch[k])
        && ['choices', 'answer', 'tokens'].every((k) => p.patch[k] === undefined || JSON.stringify(cur[k]) === JSON.stringify(p.patch[k]));
      if (already) { skip++; return; }
      console.error('DRIFT', p.id); fail++; return;
    }
    const pr = await fetch(`${URL}/rest/v1/qb_questions?id=eq.${p.id}`, {
      method: 'PATCH', headers: { ...H, 'Content-Type': 'application/json', Prefer: 'return=representation', 'Content-Profile': 'practice' },
      body: JSON.stringify(p.patch),
    });
    const updated = await pr.json();
    if (!pr.ok || !Array.isArray(updated) || updated.length === 0) { console.error('PATCH-FAIL', p.id, pr.status); fail++; return; }
    ok++;
    if (++done % 500 === 0) console.log(`applied ${done}/${lines.length}`);
  };
  const q = [...lines];
  await Promise.all(Array.from({ length: WORKERS }, async () => { while (q.length) await applyOne(q.shift()); }));
  console.log(`apply done: ok=${ok} idempotent-skip=${skip} fail=${fail}`);
  if (fail) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });

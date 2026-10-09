#!/usr/bin/env node
/**
 * CR-67 - deterministic template generator for G5 gap fill.
 * Combinatorial frames x vocab tables -> unique validated items.
 * Run: node scripts/gen-template-g5.mjs [--dry]
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const DRY = process.argv.includes('--dry');
const keys = JSON.parse(readFileSync(join(homedir(), '.config/devin/secrets/supabase_new_keys.json'), 'utf8'));
const SUPA = keys.url, SVC = keys.keys.service_role;
const H = { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Accept-Profile': 'practice' };

const items = [];
const seen = new Set();
function push(it) {
  const key = (it.q ?? it.statement ?? it.text ?? '') + '|' + JSON.stringify(it.c ?? it.bool ?? '');
  if (seen.has(key)) return;
  seen.add(key);
  items.push(it);
}
const pickN = (arr, n, exclude) => {
  const pool = arr.filter((x) => x !== exclude);
  const out = [];
  const used = new Set();
  let guard = 0;
  while (out.length < n && guard++ < 500) {
    const c = pool[Math.floor(Math.random() * pool.length)];
    if (!used.has(c)) { used.add(c); out.push(c); }
  }
  return out;
};
const shuffle = (a) => [...a].sort(() => Math.random() - 0.5);
const mcq = (q, correct, wrongs, o) => {
  const c = shuffle([correct, ...wrongs]);
  push({ q, c, a: c.indexOf(correct), ...o });
};

// ---------- VOCAB ----------
const JOBS = [
  ['architect', 'designs buildings', 'kiến trúc sư'], ['engineer', 'builds machines and roads', 'kỹ sư'],
  ['scientist', 'does experiments in a lab', 'nhà khoa học'], ['journalist', 'writes news stories', 'nhà báo'],
  ['farmer', 'grows vegetables and rice', 'nông dân'], ['chef', 'cooks food in a restaurant', 'đầu bếp'],
  ['pilot', 'flies planes', 'phi công'], ['nurse', 'cares for patients in a hospital', 'y tá'],
  ['teacher', 'teaches students at school', 'giáo viên'], ['police officer', 'keeps people safe', 'cảnh sát'],
  ['artist', 'paints pictures', 'họa sĩ'], ['writer', 'writes books and stories', 'nhà văn'],
  ['dentist', 'fixes teeth', 'nha sĩ'], ['musician', 'plays music', 'nhạc sĩ'],
  ['singer', 'sings songs', 'ca sĩ'], ['doctor', 'helps sick people', 'bác sĩ'],
  ['vet', 'cares for sick animals', 'bác sĩ thú y'], ['builder', 'builds houses', 'thợ xây'],
  ['actor', 'acts in films', 'diễn viên'], ['astronaut', 'travels to space', 'phi hành gia'],
];
const ENV_WORDS = [
  ['recycle', 'tái chế'], ['pollution', 'ô nhiễm'], ['environment', 'môi trường'], ['plastic', 'nhựa'],
  ['waste', 'rác thải'], ['protect', 'bảo vệ'], ['reuse', 'tái sử dụng'], ['reduce', 'giảm bớt'],
  ['rubbish', 'rác'], ['wildlife', 'động vật hoang dã'], ['global warming', 'nóng lên toàn cầu'],
  ['climate', 'khí hậu'], ['forest', 'rừng'], ['ocean', 'đại dương'], ['energy', 'năng lượng'],
];
const HEALTH_WORDS = [
  ['headache', 'đau đầu'], ['toothache', 'đau răng'], ['stomachache', 'đau bụng'], ['fever', 'sốt'],
  ['cold', 'cảm lạnh'], ['sore throat', 'đau họng'], ['medicine', 'thuốc'], ['exercise', 'tập thể dục'],
  ['temperature', 'nhiệt độ cơ thể'], ['cough', 'ho'], ['flu', 'cúm'], ['dentist', 'nha sĩ'],
];
const SPORT_WORDS = [
  ['badminton', 'cầu lông'], ['volleyball', 'bóng chuyền'], ['swimming', 'bơi lội'], ['cycling', 'đạp xe'],
  ['karate', 'võ karate'], ['basketball', 'bóng rổ'], ['table tennis', 'bóng bàn'], ['skating', 'trượt patin'],
  ['climbing', 'leo núi'], ['camping', 'cắm trại'], ['fishing', 'câu cá'], ['jogging', 'chạy bộ nhẹ'],
  ['gymnastics', 'thể dục dụng cụ'], ['archery', 'bắn cung'], ['marathon', 'chạy marathon'],
];
const SEASON_WORDS = [
  ['spring', 'mùa xuân'], ['summer', 'mùa hè'], ['autumn', 'mùa thu'], ['winter', 'mùa đông'],
  ['sunny', 'nắng'], ['cloudy', 'nhiều mây'], ['windy', 'có gió'], ['stormy', 'có bão'],
  ['foggy', 'có sương mù'], ['humid', 'ẩm ướt'], ['warm', 'ấm áp'], ['cool', 'mát mẻ'],
];
const TECH_WORDS = [
  ['computer', 'máy tính'], ['smartphone', 'điện thoại thông minh'], ['tablet', 'máy tính bảng'],
  ['internet', 'mạng internet'], ['email', 'thư điện tử'], ['keyboard', 'bàn phím'], ['screen', 'màn hình'],
  ['laptop', 'máy tính xách tay'], ['robot', 'rô-bốt'], ['headphones', 'tai nghe'], ['printer', 'máy in'],
  ['download', 'tải xuống'], ['online', 'trực tuyến'], ['password', 'mật khẩu'],
];
const PLACES = [
  'Ha Long Bay', 'Son Doong Cave', 'Hoi An Ancient Town', 'Hue Citadel', 'Phu Quoc Island',
  'Da Lat', 'Sapa', 'Nha Trang', 'Mekong Delta', 'One Pillar Pagoda', 'Temple of Literature',
  'Ben Thanh Market', 'Golden Bridge', 'Trang An', 'Ba Na Hills', 'Con Dao Island',
];
const FEST_WORDS = [
  ['lucky money', 'tiền lì xì'], ['mooncake', 'bánh trung thu'], ['fireworks', 'pháo hoa'],
  ['lantern', 'đèn lồng'], ['peach blossom', 'hoa đào'], ['apricot blossom', 'hoa mai'],
  ['dragon dance', 'múa rồng'], ['banh chung', 'bánh chưng'], ['kumquat tree', 'cây quất'],
  ['red envelope', 'bao lì xì'], ['lion dance', 'múa lân'], ['wishing', 'chúc'],
];

// ---------- 1. job -> description (def->word and word->def) ----------
for (const [job, does, vn] of JOBS) {
  mcq(`A person who ${does} is a/an ___.`, job, pickN(JOBS.map((j) => j[0]), 3, job), {
    d: 2, ex: `Người ${does} là "${job}" (${vn}).`, lo: `Từ vựng nghề nghiệp: ${job}.`, top: 'jobs', skill: 'vocabulary-in-context',
  });
  mcq(`What does a/an ${job} do? - A ${job} ___.`, does, pickN(JOBS.map((j) => j[1]), 3, does), {
    d: 2, ex: `"${job}" (${vn}) là người ${does}.`, lo: `Hiểu công việc của ${job}.`, top: 'jobs', skill: 'vocabulary-in-context',
  });
  mcq(`"${job}" nghĩa là gì?`, vn, pickN(JOBS.map((j) => j[2]), 3, vn), {
    d: 1, ex: `"${job}" có nghĩa là "${vn}".`, lo: `Dịch nghĩa: ${job}.`, top: 'jobs', skill: 'vocabulary-recognition',
  });
}

// ---------- 2. word -> meaning for every topic ----------
const VOCAB_GROUPS = [
  ['environment', ENV_WORDS, 'environment'], ['health', HEALTH_WORDS, 'health'],
  ['sports', SPORT_WORDS, 'sports'], ['seasons', SEASON_WORDS, 'seasons'],
  ['technology', TECH_WORDS, 'technology'], ['festivals', FEST_WORDS, 'festivals'],
];
for (const [, words, top] of VOCAB_GROUPS) {
  const all = words.map((w) => w[1]);
  for (const [w, vn] of words) {
    mcq(`Từ "${w}" nghĩa là gì?`, vn, pickN(all, 3, vn), {
      d: 1, ex: `"${w}" có nghĩa là "${vn}".`, lo: `Dịch nghĩa: ${w}.`, top, skill: 'vocabulary-recognition',
    });
    mcq(`What is "${vn}" in English?`, w, pickN(words.map((x) => x[0]), 3, w), {
      d: 2, ex: `"${vn}" trong tiếng Anh là "${w}".`, lo: `Từ vựng ${top}: ${w}.`, top, skill: 'vocabulary-recognition',
    });
  }
}

// ---------- 3. will-future fill blanks ----------
const WILL_ACT = [
  ['visit Ha Long Bay', 'thăm Vịnh Hạ Long'], ['plant trees', 'trồng cây'], ['watch fireworks', 'xem pháo hoa'],
  ['go camping', 'đi cắm trại'], ['help my teacher', 'giúp cô giáo'], ['learn swimming', 'học bơi'],
  ['clean the beach', 'dọn sạch bãi biển'], ['read a storybook', 'đọc truyện'], ['play badminton', 'chơi cầu lông'],
  ['buy mooncakes', 'mua bánh trung thu'], ['visit my grandparents', 'thăm ông bà'], ['study hard', 'học chăm chỉ'],
  ['join the school team', 'vào đội của trường'], ['save water', 'tiết kiệm nước'], ['recycle bottles', 'tái chế chai'],
];
const SUBJ = ['I', 'We', 'They', 'He', 'She', 'Nam', 'Lan', 'My friends', 'The students', 'My family'];
for (const s of SUBJ) for (const [a, vn] of WILL_ACT) {
  mcq(`${s} ___ ${a} next week.`, 'will', ['would', 'did', 'am'], {
    d: 3, ex: `"Next week" báo tương lai nên dùng "will + động từ nguyên mẫu" - ${vn}.`, lo: 'Thì tương lai will.', top: 'future-plans', skill: 'grammar-use-of-english',
  });
}

// ---------- 4. be going to ----------
for (const s of SUBJ) for (const [a, vn] of WILL_ACT.slice(0, 8)) {
  const be = s === 'He' || s === 'She' || s === 'Nam' || s === 'Lan' ? 'is' : s === 'I' ? 'am' : 'are';
  mcq(`${s} ${be} going to ${a} tomorrow. - Chọn đáp án đúng:`,
    `${be} going to`, shuffle([be === 'is' ? 'is going to' : 'is going to', 'will going to', 'are go to', 'go to']).filter((v, i, arr) => arr.indexOf(v) === i).slice(0, 3).filter((x) => x !== `${be} going to`),
    { d: 3, ex: `Cấu trúc "be + going to + động từ" diễn tả dự định - ${s} ${be} going to ${a} (${vn}).`, lo: 'Cấu trúc be going to.', top: 'future-plans', skill: 'grammar-use-of-english' });
}

// ---------- 5. should health advice ----------
const SYMPTOMS = [
  ['a headache', 'a headache'], ['a toothache', 'a toothache'], ['a fever', 'a fever'],
  ['a sore throat', 'a sore throat'], ['a cold', 'a cold'], ['a stomachache', 'a stomachache'],
];
const CURES = ['see a dentist', 'rest and drink water', 'take some medicine', 'stay in bed', 'eat healthy food', 'do exercise'];
for (const s of SUBJ.slice(0, 8)) for (const [sym] of SYMPTOMS) {
  const has = s === 'He' || s === 'She' || s === 'Nam' || s === 'Lan' ? 'has' : 'have';
  mcq(`${s} ${has} ${sym}. What should ${['I'].includes(s) ? 'I' : ['He', 'She', 'Nam', 'Lan'].includes(s) ? (s === 'She' ? 'she' : 'he') : 'they'} do?`,
    `should rest and take medicine`, ['should eats candy', 'should to run fast', 'should play games all night'], {
    d: 3, ex: `Khi bị ${sym}, mình nên nghỉ ngơi và uống thuốc - dùng "should + động từ".`, lo: 'Lời khuyên sức khỏe với should.', top: 'health', skill: 'grammar-use-of-english',
  });
}

// ---------- 6. comparatives / superlatives ----------
const ADJ = [
  ['tall', 'taller', 'the tallest'], ['big', 'bigger', 'the biggest'], ['long', 'longer', 'the longest'],
  ['high', 'higher', 'the highest'], ['fast', 'faster', 'the fastest'], ['beautiful', 'more beautiful', 'the most beautiful'],
  ['famous', 'more famous', 'the most famous'], ['popular', 'more popular', 'the most popular'],
  ['interesting', 'more interesting', 'the most interesting'], ['difficult', 'more difficult', 'the most difficult'],
  ['good', 'better', 'the best'], ['bad', 'worse', 'the worst'],
];
for (const [base, comp, sup] of ADJ) for (const o of PLACES.slice(0, 12)) {
  mcq(`${o} is ___ place in the area.`, sup, [comp, base, `most ${base}`], {
    d: 4, ex: `So sánh nhất của "${base}" là "${sup}".`, lo: `So sánh nhất: ${base} -> ${sup}.`, top: 'comparatives', skill: 'grammar-use-of-english',
  });
}
for (const [base, comp] of ADJ) for (const o of PLACES.slice(0, 10)) {
  mcq(`${o} is ___ than our town.`, comp, [base, ADJ.find((a) => a[0] === base)[2], `more ${base}`].filter((v, i, arr) => arr.indexOf(v) === i && v !== comp).slice(0, 3), {
    d: 4, ex: `So sánh hơn của "${base}" là "${comp}" + than.`, lo: `So sánh hơn: ${base} -> ${comp}.`, top: 'comparatives', skill: 'grammar-use-of-english',
  });
}

// ---------- 7. environment / season / tech context frames ----------
const CONTEXT = [
  ['We should ___ plastic bottles to protect the ocean.', 'recycle', ENV_WORDS],
  ['Too much ___ is bad for the air and the water.', 'pollution', ENV_WORDS],
  ['We must ___ the forests for the animals.', 'protect', ENV_WORDS],
  ['Turn off lights when you leave a room to save ___.', 'energy', ENV_WORDS],
  ['Do not throw ___ on the beach or in the sea.', 'rubbish', ENV_WORDS],
  ['In ___, trees have new green leaves.', 'spring', SEASON_WORDS],
  ['In ___, it is very cold and sometimes it snows.', 'winter', SEASON_WORDS],
  ['The weather is ___ today - there is a lot of fog.', 'foggy', SEASON_WORDS],
  ['A ___ has a keyboard and a screen.', 'computer', TECH_WORDS],
  ['We use the ___ to find information quickly.', 'internet', TECH_WORDS],
  ['You wear ___ to listen to music without noise.', 'headphones', TECH_WORDS],
  ['Do not share your ___ with strangers online.', 'password', TECH_WORDS],
];
for (const [q, ans, grp] of CONTEXT) {
  mcq(q, ans, pickN(grp.map((w) => w[0]), 3, ans), {
    d: 3, ex: `"${ans}" phù hợp nhất với nghĩa của câu.`, lo: `Từ vựng trong ngữ cảnh: ${ans}.`, top: 'vocabulary', skill: 'vocabulary-in-context',
  });
}

// ---------- 8. grammar: there is/are, some/any, past simple ----------
const ROOMS = ['a garden', 'two bedrooms', 'a kitchen', 'three windows', 'a library', 'five books', 'a playground', 'many trees'];
for (const s of SUBJ.slice(0, 8)) for (const r of ROOMS) {
  const plural = /s$|many|two|three|five/.test(r);
  mcq(`Our school has ${r}. - There ___ ${r} in our school.`,
    plural ? 'are' : 'is', shuffle([plural ? 'is' : 'are', 'be', 'am']).filter((v, i, arr) => arr.indexOf(v) === i && v !== (plural ? 'are' : 'is')).slice(0, 3),
    { d: 2, ex: `"${r}" ${plural ? 'số nhiều nên dùng "are"' : 'số ít nên dùng "is"'}.`, lo: 'Cấu trúc there is/are.', top: 'grammar', skill: 'grammar-use-of-english' });
}
const PAST = [
  ['visited', 'visit'], ['played', 'play'], ['watched', 'watch'], ['helped', 'help'], ['cooked', 'cook'], ['cleaned', 'clean'],
];
for (const s of SUBJ) for (const [v, base] of PAST) {
  mcq(`Yesterday, ${s.toLowerCase().replace(/^my|^the/, 'my')} ___ our friends at the park.`, v, [base, 'visits', 'visiting'].slice(0, 3), {
    d: 3, ex: `"Yesterday" báo quá khứ nên động từ chia thì quá khứ: "${v}".`, lo: `Thì quá khứ đơn: ${base} -> ${v}.`, top: 'past-simple', skill: 'grammar-use-of-english',
  });
}

// ---------- 9. reorder ----------
const RO_SENT = [
  'We will visit Ha Long Bay next summer.', 'Children should protect the environment.', 'Son Doong Cave is the biggest cave in Vietnam.',
  'My father works as an engineer in the city.', 'We eat mooncakes at the Mid-Autumn Festival.', 'She wants to be a pilot when she grows up.',
  'They are going to plant trees in the park.', 'You should see a dentist about your toothache.', 'The weather in Da Lat is cool and fresh.',
  'Students must recycle paper and plastic bottles.', 'Tet is the most important festival in Vietnam.', 'He plays badminton with his friends after school.',
  'The Mekong River is longer than the Red River.', 'I will learn English because it is useful.', 'Our teacher asked us to save water at home.',
  'We watched beautiful fireworks on New Year Eve.', 'My sister wants to be a journalist.', 'They are going to clean the beach this weekend.',
  'Hue Citadel is more famous than our local temple.', 'Children should not play games all night.', 'A vet cares for sick animals.',
  'We use the internet to learn many things.', 'Phu Quoc Island has beautiful beaches.', 'Autumn is cooler than summer.',
  'The students are planting trees in the garden.', 'You should drink warm water when you have a sore throat.', 'My mother cooks delicious food for our family.',
  'Lan will visit her grandparents this summer.', 'We must save energy at home.', 'The Golden Bridge is a famous place in Da Nang.',
];
for (const s of RO_SENT) {
  const tokens = s.replace(/\./g, ' .').split(/\s+/).filter(Boolean);
  push({ ro: true, text: s, tokens, d: 4, ex: `Câu đúng: "${s}"`, lo: 'Sắp xếp câu đúng trật tự.', top: 'sentence-order', skill: 'writing' });
}

// ---------- 10. true/false passages ----------
const PASSAGES = [
  ['Son Doong Cave is in Quang Binh, Vietnam. It is the biggest cave in the world. Many tourists visit it every year.',
   ['Son Doong Cave is the biggest cave in the world.', true], ['Few tourists visit Son Doong Cave.', false]],
  ['At Tet, children wear new clothes and get lucky money in red envelopes. Families eat banh chung together.',
   ['Children get lucky money at Tet.', true], ['Families eat mooncakes at Tet.', false]],
  ['Plastic bags are bad for the ocean. We should reuse bags and bottles to keep the sea clean.',
   ['Plastic bags are good for the ocean.', false], ['We should reuse bags to keep the sea clean.', true]],
  ['Da Lat is a city in the mountains. The weather is cool all year. Many flowers grow there.',
   ['Da Lat is hot all year.', false], ['Many flowers grow in Da Lat.', true]],
  ['A pilot flies planes. A vet cares for animals. A chef cooks food in a restaurant.',
   ['A vet cooks food in a restaurant.', false], ['A pilot flies planes.', true]],
  ['Ha Long Bay has thousands of islands. The water is green and the mountains are beautiful.',
   ['Ha Long Bay has only one island.', false], ['Ha Long Bay has thousands of islands.', true]],
  ['At the Mid-Autumn Festival, children carry lanterns, eat mooncakes, and watch lion dances.',
   ['Children carry lanterns at Mid-Autumn.', true], ['Children get lucky money at Mid-Autumn.', false]],
  ['Our planet is getting warmer because of pollution. We should plant trees and save energy.',
   ['Pollution makes the planet cooler.', false], ['We should plant trees to help the planet.', true]],
  ['Technology helps students learn. A computer has a screen and a keyboard. Tablets are small computers.',
   ['Tablets are very big computers.', false], ['A computer has a keyboard.', true]],
  ['Exercise keeps our body strong. We should play sports and eat healthy food every day.',
   ['We should not exercise every day.', false], ['Sports and healthy food keep us strong.', true]],
];
for (const [p, s1, s2] of PASSAGES) {
  for (const [s, b] of [s1, s2]) {
    push({ tf: true, passage: p, statement: s, bool: b, d: 3, ex: b ? `Bài đọc nói đúng: "${s}"` : `Bài đọc không nói điều này: "${s}"`, lo: 'Đọc hiểu đoạn văn ngắn.', top: 'reading', skill: 'reading' });
  }
}

// ---------- 11. festival/place recognition ----------
for (const [w, vn] of FEST_WORDS) {
  mcq(`"${w}" nghĩa là gì?`, vn, pickN(FEST_WORDS.map((x) => x[1]), 3, vn), {
    d: 1, ex: `"${w}" có nghĩa là "${vn}".`, lo: `Từ vựng lễ hội: ${w}.`, top: 'festivals', skill: 'vocabulary-recognition',
  });
}
for (const p of PLACES) {
  mcq(`___ is a famous place in Vietnam.`, p, pickN(PLACES, 3, p), {
    d: 2, ex: `"${p}" là địa danh nổi tiếng ở Việt Nam.`, lo: `Địa danh Việt Nam: ${p}.`, top: 'places-vietnam', skill: 'vocabulary-in-context',
  });
}

// ---------- 12. subject-verb agreement (3rd person -s) ----------
const VERBS_S = [
  ['go', 'goes', 'đi'], ['play', 'plays', 'chơi'], ['study', 'studies', 'học'], ['watch', 'watches', 'xem'],
  ['like', 'likes', 'thích'], ['want', 'wants', 'muốn'], ['work', 'works', 'làm việc'], ['live', 'lives', 'sống'],
  ['help', 'helps', 'giúp'], ['read', 'reads', 'đọc'],
];
const SING = ['He', 'She', 'Nam', 'Lan', 'My father', 'My mother', 'The teacher'];
const PLUR = ['We', 'They', 'The students', 'My friends', 'I', 'You'];
for (const [base, s3, vn] of VERBS_S) {
  for (const s of SING) {
    mcq(`${s} ___ English very well.`, s3, [base, `is ${base}ing`, `to ${base}`].slice(0, 3), {
      d: 3, ex: `Chủ ngữ số ít ("${s}") thì động từ thêm -s/-es: "${s3}".`, lo: `Chia động từ số ít: ${base} -> ${s3}.`, top: 'present-simple', skill: 'grammar-use-of-english',
    });
  }
  for (const s of PLUR) {
    mcq(`${s} ___ English very well.`, base, [s3, `is ${base}ing`, `to ${base}`].slice(0, 3), {
      d: 3, ex: `Chủ ngữ số nhiều/I/You ("${s}") thì động từ giữ nguyên: "${base}".`, lo: `Chia động từ số nhiều: ${base}.`, top: 'present-simple', skill: 'grammar-use-of-english',
    });
  }
}

// ---------- 13. wh-questions ----------
const WH = [
  ['___ is your birthday? - It is in May.', 'When', 'hỏi thời gian'],
  ['___ do you live? - I live in Hanoi.', 'Where', 'hỏi nơi chốn'],
  ['___ is your favourite subject? - It is English.', 'What', 'hỏi về sự vật'],
  ['___ is that woman? - She is my teacher.', 'Who', 'hỏi về người'],
  ['___ old are you? - I am eleven.', 'How', 'hỏi tuổi (how old)'],
  ['___ much is this book? - It is fifty thousand dong.', 'How', 'hỏi giá (how much)'],
  ['___ many students are there? - There are thirty.', 'How', 'hỏi số lượng (how many)'],
  ['___ do you go to school? - By bike.', 'How', 'hỏi phương tiện'],
];
for (const [q, ans, vn] of WH) {
  const c = shuffle([ans, ...pickN(['What', 'Where', 'When', 'Who', 'How', 'Why'], 3, ans)]);
  push({ q, c, a: c.indexOf(ans), d: 2, ex: `"${ans}" ${vn}.`, lo: `Từ hỏi: ${ans}.`, top: 'wh-questions', skill: 'grammar-use-of-english' });
}

// ---------- 14. prepositions ----------
const PREP = [
  ['The book is ___ the table.', 'on', 'trên mặt bàn'], ['My birthday is ___ May.', 'in', 'tháng dùng in'],
  ['School starts ___ 7 o\'clock.', 'at', 'giờ dùng at'], ['The cat is ___ the box.', 'in', 'trong hộp'],
  ['I go to school ___ bike.', 'by', 'phương tiện dùng by'], ['We have English ___ Monday.', 'on', 'ngày dùng on'],
  ['The picture is ___ the wall.', 'on', 'trên tường'], ['She lives ___ Hanoi.', 'in', 'thành phố dùng in'],
];
for (const [q, ans, vn] of PREP) {
  const c = shuffle([ans, ...pickN(['on', 'in', 'at', 'by', 'for', 'to'], 3, ans)]);
  push({ q, c, a: c.indexOf(ans), d: 3, ex: `Giới từ "${ans}" vì ${vn}.`, lo: `Giới từ: ${ans}.`, top: 'prepositions', skill: 'grammar-use-of-english' });
}

// ---------- 15. adverbs of frequency ----------
const ADVS = ['always', 'usually', 'often', 'sometimes', 'never'];
for (const s of SUBJ.slice(0, 8)) for (const adv of ADVS) {
  const c = shuffle([adv, ...pickN(ADVS, 3, adv)]);
  push({
    q: `${s} ___ do/does homework after school. (trạng từ tần suất "${adv === 'always' ? 'luôn luôn' : adv === 'usually' ? 'thường xuyên' : adv === 'often' ? 'hay' : adv === 'sometimes' ? 'thỉnh thoảng' : 'không bao giờ'}")`,
    c, a: c.indexOf(adv), d: 3,
    ex: `Trạng từ tần suất "${adv}" đứng trước động từ chính.`, lo: `Trạng từ tần suất: ${adv}.`, top: 'adverbs', skill: 'grammar-use-of-english',
  });
}

// ---------- 16. a/an ----------
const AN_WORDS = [['apple', 'an'], ['engineer', 'an'], ['umbrella', 'an'], ['actor', 'an'], ['book', 'a'], ['pilot', 'a'], ['teacher', 'a'], ['mooncake', 'a']];
for (const [w, ans] of AN_WORDS) {
  for (const s of SUBJ.slice(0, 3)) {
    const c = shuffle([ans, ans === 'a' ? 'an' : 'a', 'the', 'some']);
    push({
      q: `${s} wants ___ ${w}.`, c, a: c.indexOf(ans), d: 2,
      ex: `"${w}" ${ans === 'an' ? 'bắt đầu bằng nguyên âm nên dùng "an"' : 'bắt đầu bằng phụ âm nên dùng "a"'}.`, lo: 'Mạo từ a/an.', top: 'articles', skill: 'grammar-use-of-english',
    });
  }
}

// ---------- 17. more TF passages ----------
const PASSAGES2 = [
  ['The Mekong Delta is in the south of Vietnam. Farmers grow a lot of rice and fruit there. Many rivers run through it.',
   ['The Mekong Delta is in the north of Vietnam.', false], ['Farmers grow rice in the Mekong Delta.', true]],
  ['The Golden Bridge is in Da Nang. Two giant stone hands hold the bridge. Many visitors take photos there.',
   ['The Golden Bridge is in Hanoi.', false], ['Two stone hands hold the bridge.', true]],
  ['Banh chung is a square rice cake. Families make it at Tet with sticky rice, pork and green beans.',
   ['Banh chung is round.', false], ['Families make banh chung at Tet.', true]],
  ['Recycling means using things again. We can recycle paper, plastic bottles and old cans to help the Earth.',
   ['We cannot recycle paper.', false], ['Recycling helps the Earth.', true]],
  ['Sapa is a town in the high mountains. It is cold and foggy. Tourists come to see the rice terraces.',
   ['Sapa is near the sea.', false], ['Tourists visit Sapa to see rice terraces.', true]],
  ['Hoi An is an old town in central Vietnam. At night, colorful lanterns light the streets along the river.',
   ['Hoi An has lanterns at night.', true], ['Hoi An is in the north of Vietnam.', false]],
];
for (const [p, s1, s2] of PASSAGES2) {
  for (const [s, b] of [s1, s2]) {
    push({ tf: true, passage: p, statement: s, bool: b, d: 3, ex: b ? `Bài đọc nói đúng: "${s}"` : `Bài đọc không nói điều này: "${s}"`, lo: 'Đọc hiểu đoạn văn ngắn.', top: 'reading', skill: 'reading' });
  }
}

// ---------- 18. more reorder ----------
const RO_SENT2 = [
  'Will you visit your grandparents this weekend?', 'She is going to be a famous singer.', 'We should not waste water at home.',
  'The students are cleaning the school yard now.', 'My uncle is a police officer in Hanoi.', 'How many books are there in your bag?',
  'Lan is taller than her younger sister.', 'We always do our homework after dinner.', 'He never eats sweets before bedtime.',
  'There are many beautiful flowers in spring.', 'I will buy a gift for my mother.', 'They played football in the park yesterday.',
  'The temple is older than the pagoda.', 'We must not throw rubbish into the river.', 'Can you show me the way to the market?',
];
for (const s of RO_SENT2) {
  const tokens = s.replace(/[.?]/g, (m) => ' ' + m).split(/\s+/).filter(Boolean);
  push({ ro: true, text: s, tokens, d: 4, ex: `Câu đúng: "${s}"`, lo: 'Sắp xếp câu đúng trật tự.', top: 'sentence-order', skill: 'writing' });
}

// ---------- 19. present continuous ----------
const ING_ACT = [
  ['fly', 'flying', 'a kite'], ['play', 'playing', 'football'], ['read', 'reading', 'a book'],
  ['write', 'writing', 'a letter'], ['draw', 'drawing', 'a picture'], ['swim', 'swimming', 'in the pool'],
  ['sing', 'singing', 'a song'], ['cook', 'cooking', 'dinner'], ['ride', 'riding', 'a bike'],
];
for (const s of SUBJ) for (const [v, ing, obj] of ING_ACT) {
  const be = s === 'He' || s === 'She' || s === 'Nam' || s === 'Lan' ? 'is' : s === 'I' ? 'am' : 'are';
  mcq(`Look! ${s} ___ ${obj} now.`, `${be} ${ing}`, [`${ing} ${be}`, `${v}s`, `${be} ${v}`], {
    d: 3, ex: `"Look! ... now" báo hành động đang diễn ra - dùng "${be} + V-ing" = "${be} ${ing}".`, lo: `Thì hiện tại tiếp diễn: ${v} -> ${ing}.`, top: 'present-continuous', skill: 'grammar-use-of-english',
  });
}

// ---------- 20. do/does questions ----------
for (const s of SUBJ) for (const [v, , obj] of ING_ACT.slice(0, 6)) {
  const does = s === 'He' || s === 'She' || s === 'Nam' || s === 'Lan';
  mcq(`___ ${s} ${v} ${obj} every day?`, does ? 'Does' : 'Do', [does ? 'Do' : 'Does', 'Is', 'Are'], {
    d: 3, ex: `Chủ ngữ "${s}" ${does ? 'số ít dùng "Does"' : 'số nhiều/I/You dùng "Do"'} để hỏi thói quen.`, lo: 'Câu hỏi Do/Does.', top: 'grammar', skill: 'grammar-use-of-english',
  });
}

// ---------- 21. have/has ----------
for (const s of SUBJ) for (const o of ['a bicycle', 'two sisters', 'a pet dog', 'many books', 'a new bag']) {
  const has = s === 'He' || s === 'She' || s === 'Nam' || s === 'Lan';
  mcq(`${s} ___ ${o}.`, has ? 'has' : 'have', [has ? 'have' : 'has', 'is', 'are'], {
    d: 2, ex: `Chủ ngữ "${s}" ${has ? 'số ít dùng "has"' : 'dùng "have"'}.`, lo: 'Động từ have/has.', top: 'grammar', skill: 'grammar-use-of-english',
  });
}

// ---------- 22. must/mustn't rules ----------
const RULES = [
  ['We ___ litter in the classroom.', 'must not', 'phải không được xả rác'],
  ['Students ___ listen to the teacher.', 'must', 'phải nghe lời cô'],
  ['We ___ run in the corridor.', 'must not', 'không được chạy trong hành lang'],
  ['We ___ wear a helmet on a motorbike.', 'must', 'phải đội mũ bảo hiểm'],
  ['You ___ be late for school.', 'must not', 'không được đi học muộn'],
  ['We ___ keep our school clean.', 'must', 'phải giữ trường sạch'],
];
for (const [q, ans, vn] of RULES) {
  mcq(q, ans, [ans === 'must' ? 'must not' : 'must', 'will', 'can'], {
    d: 3, ex: `Ý nghĩa: ${vn} nên dùng "${ans}".`, lo: 'Modal must/must not.', top: 'grammar', skill: 'grammar-use-of-english',
  });
}

// ---------- 23. more passages (culture + science) ----------
const PASSAGES3 = [
  ['The Temple of Literature is in Hanoi. It was the first university in Vietnam. Students visit it before exams to wish for good luck.',
   ['The Temple of Literature was a university.', true], ['Students visit it after exams.', false]],
  ['Phu Quoc is an island in the south. It has blue sea, white sand and many fish. People make fish sauce there.',
   ['Phu Quoc is famous for fish sauce.', true], ['Phu Quoc is in the mountains.', false]],
  ['Water is precious. We should turn off the tap when we brush our teeth. We should not waste water.',
   ['We should waste water.', false], ['We should turn off the tap when brushing teeth.', true]],
  ['Trang An is in Ninh Binh. It has beautiful rivers and caves. Visitors take small boats along the river.',
   ['Visitors take boats at Trang An.', true], ['Trang An has no caves.', false]],
  ['Vu Lan is a festival in August. Children give flowers to their mothers to show love.',
   ['Children give flowers to mothers at Vu Lan.', true], ['Vu Lan is in January.', false]],
  ['Robots can help people work. Some robots clean houses. Some robots help doctors in hospitals.',
   ['Robots cannot help people.', false], ['Some robots help doctors.', true]],
  ['The Mid-Autumn Festival is in the eighth lunar month. Children carry star lanterns and eat mooncakes.',
   ['Children carry lanterns at Mid-Autumn.', true], ['Mid-Autumn is in the first lunar month.', false]],
  ['Ba Na Hills is near Da Nang. It has a famous bridge with giant stone hands. The weather there is cool.',
   ['Ba Na Hills has a bridge with stone hands.', true], ['Ba Na Hills is very hot.', false]],
];
for (const [p, s1, s2] of PASSAGES3) {
  for (const [s, b] of [s1, s2]) {
    push({ tf: true, passage: p, statement: s, bool: b, d: 3, ex: b ? `Bài đọc nói đúng: "${s}"` : `Bài đọc không nói điều này: "${s}"`, lo: 'Đọc hiểu đoạn văn ngắn.', top: 'reading', skill: 'reading' });
  }
}

// ---------- 24. vocabulary-in-context frames for remaining groups ----------
const CONTEXT2 = [
  ['She wants to be an ___ because she loves space.', 'astronaut', JOBS],
  ['My uncle fixes teeth - he is a ___.', 'dentist', JOBS],
  ['The ___ writes articles for the newspaper.', 'journalist', JOBS],
  ['A ___ cares for sick animals.', 'vet', JOBS],
  ['He is an ___ - he designs beautiful buildings.', 'architect', JOBS],
  ['In ___, leaves fall from the trees.', 'autumn', SEASON_WORDS],
  ['___ is the season when students have no school.', 'summer', SEASON_WORDS],
  ['Today is very ___ - the wind is strong.', 'windy', SEASON_WORDS],
  ['We should ___ water to protect the planet.', 'save', [['save'], ['waste'], ['eat'], ['play']].map((x) => x[0])],
  ['Old bottles can be ___ into new things.', 'recycled', ENV_WORDS],
  ['She plays ___ every weekend with her racket.', 'badminton', SPORT_WORDS],
  ['___ is a long race of 42 kilometres.', 'marathon', SPORT_WORDS],
  ['I have a ___ - my tooth hurts.', 'toothache', HEALTH_WORDS],
  ['When you have a ___, you should drink warm water.', 'sore throat', HEALTH_WORDS],
  ['Please type your ___ to open the computer.', 'password', TECH_WORDS],
];
for (const [q, ans, grp] of CONTEXT2) {
  const pool = Array.isArray(grp[0]) ? grp.map((x) => (Array.isArray(x) ? x[0] : x)) : grp.map((x) => (Array.isArray(x) ? x[0] : x));
  mcq(q, ans, pickN(pool, 3, ans), {
    d: 2, ex: `"${ans}" phù hợp nhất với nghĩa của câu.`, lo: `Từ vựng trong ngữ cảnh: ${ans}.`, top: 'vocabulary', skill: 'vocabulary-in-context',
  });
}

// ---------- 25. "sounds like / near rhyme" listening-style ----------
const RHYME = [
  ['play', 'say'], ['see', 'tree'], ['cat', 'hat'], ['dog', 'log'], ['sun', 'fun'], ['rain', 'train'], ['night', 'light'], ['book', 'look'],
];
for (const [a, b] of RHYME) {
  mcq(`Which word rhymes with "${a}"?`, b, pickN(['car', 'food', 'desk', 'water', 'happy', 'pen', 'dog', 'sun'].filter((x) => x !== a && x !== b), 3, b), {
    d: 2, ex: `"${a}" và "${b}" có vần giống nhau (rhyme).`, lo: `Nhận diện vần: ${a}/${b}.`, top: 'phonics', skill: 'vocabulary-recognition',
  });
}

// ---------- 26. more reorder (questions + negatives) ----------
const RO_SENT3 = [
  'Where do you want to go this summer?', 'She does not like rainy days.', 'What should we do to save water?',
  'How often do you play badminton?', 'They must not run in the classroom.', 'Why do you want to be a doctor?',
  'There is a big playground behind our school.', 'My grandmother tells me stories at night.',
  'We are going to watch the lion dance tonight.', 'English is more interesting than I thought.',
  'Please turn off the lights before you leave.', 'The children are carrying colorful lanterns.',
];
for (const s of RO_SENT3) {
  const tokens = s.replace(/[.?]/g, (m) => ' ' + m).split(/\s+/).filter(Boolean);
  push({ ro: true, text: s, tokens, d: 4, ex: `Câu đúng: "${s}"`, lo: 'Sắp xếp câu đúng trật tự.', top: 'sentence-order', skill: 'writing' });
}

console.log(`template items: ${items.length}`);

// ---------- map to rows ----------
function toRow(it) {
  const questionType = it.tf ? 'true-false' : it.ro ? 'reorder' : 'mcq';
  const promptText = it.tf ? 'Read the passage. True or False?' : it.ro ? 'Rearrange the words to make a correct sentence.' : it.q;
  const idKey = (it.q ?? it.statement ?? it.text) + '|' + JSON.stringify(it.c ?? it.bool ?? '');
  const id = `g5-english-tpl-${createHash('sha1').update(`5|english|${idKey}`).digest('hex').slice(0, 12)}`;
  const choices = it.ro ? null : it.tf ? ['True', 'False'] : it.c;
  const answer = it.tf ? { boolean: it.bool } : it.ro ? { text: it.text } : { text: it.c[it.a], index: it.a };
  const contentHash = createHash('sha1').update(JSON.stringify([promptText, choices, answer, it.passage ?? null])).digest('hex').slice(0, 16);
  return {
    id, grade: 5, subject: 'english', domain: it.tf ? 'reading' : it.ro ? 'writing' : 'vocabulary',
    skill: it.skill ?? 'vocabulary-in-context', question_type: questionType, difficulty: Math.min(5, Math.max(1, it.d ?? 2)),
    topic_key: it.top ?? 'general', prompt_text: promptText.slice(0, 500), transcript: null,
    choices, answer,
    explanation_vi: String(it.ex).slice(0, 500), learning_objective: String(it.lo ?? '').slice(0, 200),
    curriculum_alignment: { grade: 5, coreTopic: it.top ?? 'general', moetSubject: 'English', alignmentLevel: 'topic-skill', curriculumRole: 'core', primaryFramework: 'MOET-2018' },
    tags: null, canonical: true, variant_group_id: null,
    rights_status: 'owned-original-generated',
    review_status: 'machine-editorial-reviewed-human-academic-signoff-required',
    publication_policy: { examEligible: false, mockEligible: true, practiceEligible: true, commercialReleaseEligible: true, requiresHumanApprovalForExam: true, requiresHumanApprovalForCommercialRelease: false },
    content_hash: contentHash,
    source: { kind: 'generated-v6', method: 'cr67-template', provenance: 'Deterministic template generation; original, not copied.' },
    schema_version: '6.0', passage: it.passage ?? null, statement: it.statement ?? null, tokens: it.ro ? it.tokens : null,
  };
}

const rows = items.map(toRow);
const uniq = new Set(rows.map((r) => r.id));
console.log(`unique ids: ${uniq.size} / ${rows.length}`);
if (uniq.size !== rows.length) process.exit(1);

if (!DRY) {
  for (let c = 0; c < rows.length; c += 300) {
    const res = await fetch(`${SUPA}/rest/v1/qb_questions`, {
      method: 'POST',
      headers: { ...H, 'Content-Profile': 'practice', 'Content-Type': 'application/json', Prefer: 'resolution=ignore-duplicates,return=minimal' },
      body: JSON.stringify(rows.slice(c, c + 300)),
    });
    if (!res.ok) console.error('push fail', res.status, (await res.text()).slice(0, 200));
  }
  console.log('pushed', rows.length);
}
mkdirSync(join(HERE, 'gen-bulk-out'), { recursive: true });
writeFileSync(join(HERE, 'gen-bulk-out', 'template-g5-preview.json'), JSON.stringify(rows.slice(0, 10), null, 1));

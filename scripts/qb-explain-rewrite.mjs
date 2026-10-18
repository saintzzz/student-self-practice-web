/**
 * qb-explain-rewrite.mjs — regenerate teaching-quality Vietnamese explanations
 * for flagged qb_questions rows (explanation-too-short / explanation-not-vietnamese /
 * explanation-mentions-other-answer).
 *
 * Deterministic template families cover the bulk of the bank (math arithmetic,
 * comparisons, number words, animal science, food groups, tools, body/plant
 * parts, safety, materials, spelling and wh-word items). Rows that match no
 * family fall through to an LLM batch (Gemini via ../so-chu-nhiem-so/.env.local).
 *
 * Dry-run writes docs/qa/flagged/explain-plan-*.json and prints samples.
 * --apply upserts explanation_vi via PostgREST merge-duplicates.
 *
 * Usage:
 *   node scripts/qb-explain-rewrite.mjs --set=short           # plan only
 *   node scripts/qb-explain-rewrite.mjs --set=short --apply
 *   node scripts/qb-explain-rewrite.mjs --set=nonvn --apply
 *   node scripts/qb-explain-rewrite.mjs --set=other --apply   # mentions-other-answer
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const HERE = new URL('.', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
const SUPA_URL = 'https://cxjpgfhqchjoernfmcra.supabase.co';
const APPLY = process.argv.includes('--apply');
const SET = (process.argv.find((a) => a.startsWith('--set=')) ?? '--set=short').split('=')[1];

function serviceKey() {
  if (process.env.SUPABASE_SERVICE_KEY) return process.env.SUPABASE_SERVICE_KEY;
  for (const p of [
    join(homedir(), 'AppData', 'Roaming', 'devin', 'secrets', 'supabase_new_keys.json'),
    join(homedir(), '.config', 'devin', 'secrets', 'supabase_new_keys.json'),
  ]) {
    try { return JSON.parse(readFileSync(p, 'utf8')).keys.service_role; } catch {}
  }
  throw new Error('no supabase service key');
}
const SKEY = serviceKey();
const H = {
  apikey: SKEY,
  Authorization: `Bearer ${SKEY}`,
  'Accept-Profile': 'practice',
  'Content-Profile': 'practice',
  'Content-Type': 'application/json',
};

/* ---------- gloss tables ---------- */

const ANIMAL_VI = {
  ant: 'kiến', bat: 'dơi', bear: 'gấu', bee: 'ong', beetle: 'bọ cánh cứng',
  butterfly: 'bướm', cat: 'mèo', chicken: 'gà', cow: 'bò', crab: 'cua',
  crocodile: 'cá sấu', dog: 'chó', dolphin: 'cá heo', duck: 'vịt', eagle: 'đại bàng',
  earthworm: 'giun đất', elephant: 'voi', fish: 'cá', frog: 'ếch', gecko: 'tắc kè',
  giraffe: 'hươu cao cổ', goat: 'dê', goldfish: 'cá vàng', horse: 'ngựa',
  human: 'con người', jellyfish: 'sứa', lizard: 'thằn lằn', monkey: 'khỉ',
  mosquito: 'muỗi', octopus: 'bạch tuộc', ostrich: 'đà điểu', owl: 'cú',
  parrot: 'vẹt', penguin: 'chim cánh cụt', pig: 'lợn', rabbit: 'thỏ',
  salmon: 'cá hồi', shark: 'cá mập', shrimp: 'tôm', snail: 'ốc sên',
  snake: 'rắn', sparrow: 'chim sẻ', spider: 'nhện', tiger: 'hổ', toad: 'cóc',
  turtle: 'rùa', whale: 'cá voi',
};
const ANIMAL_CLASS = {
  mammal: ['bat', 'bear', 'cat', 'cow', 'dog', 'dolphin', 'elephant', 'goat', 'horse', 'monkey', 'pig', 'rabbit', 'tiger', 'whale', 'human'],
  bird: ['chicken', 'duck', 'eagle', 'ostrich', 'owl', 'parrot', 'penguin', 'sparrow'],
  reptile: ['crocodile', 'gecko', 'lizard', 'snake', 'turtle'],
  amphibian: ['frog', 'toad'],
  fish: ['fish', 'goldfish', 'salmon', 'shark'],
  insect: ['ant', 'bee', 'beetle', 'butterfly', 'mosquito'],
  other: ['crab', 'earthworm', 'jellyfish', 'octopus', 'shrimp', 'snail', 'spider'],
};
const CLASS_OF = Object.fromEntries(
  Object.entries(ANIMAL_CLASS).flatMap(([k, arr]) => arr.map((a) => [a, k])),
);
const CLASS_VI = {
  mammal: 'động vật có vú (thú)', bird: 'chim', reptile: 'bò sát',
  amphibian: 'lưỡng cư', fish: 'cá', insect: 'côn trùng', other: 'động vật không xương sống',
};
const CLASS_REASON = {
  mammal: 'đẻ con và nuôi con bằng sữa mẹ',
  bird: 'có mỏ, lông vũ và đẻ trứng',
  fish: 'sống dưới nước, thở bằng mang và bơi bằng vây',
  reptile: 'có vảy, máu lạnh và thường đẻ trứng',
  amphibian: 'sống được cả dưới nước lẫn trên cạn',
  insect: 'có 6 chân và thân chia đốt',
  other: 'không có xương sống',
};
const BABY_VI = {
  'cubs': 'thú con như hổ con, gấu con', 'cub': 'thú con',
  'calves': 'bê', 'a calf': 'bê', 'calf': 'bê',
  'a foal': 'ngựa con', 'foal': 'ngựa con',
  'kids': 'dê con', 'kid': 'dê con',
  'kits': 'thỏ con', 'kit': 'thỏ con',
  'kittens': 'mèo con', 'kitten': 'mèo con',
  'puppies': 'chó con', 'puppy': 'chó con',
  'piglets': 'lợn con', 'piglet': 'lợn con',
  'pups': 'dơi con', 'pup': 'dơi con',
  'ducklings from eggs': 'vịt con', 'ducklings': 'vịt con',
  'chicks from eggs': 'chim con', 'chicks': 'chim con',
  'tadpoles from eggs': 'nòng nọc', 'tadpoles': 'nòng nọc',
  'caterpillars from eggs': 'sâu bướm', 'caterpillars': 'sâu bướm',
  'larvae from eggs': 'ấu trùng', 'larvae': 'ấu trùng',
  'babies from eggs': 'con non',
  'babies from cocoons': 'con non nở từ kén',
  'babies': 'con non',
};
const MOVE_VI = {
  ant: 'bò và leo trèo', bee: 'bay', butterfly: 'bay', crab: 'đi ngang',
  duck: 'vừa bơi vừa đi lộp cộp', eagle: 'bay', fish: 'bơi',
  frog: 'vừa nhảy vừa bơi', horse: 'chạy', monkey: 'trèo cây và đu cành',
  rabbit: 'nhảy lò cò', snail: 'bò chậm', snake: 'trườn', sparrow: 'bay',
  turtle: 'bò chậm và bơi', whale: 'bơi',
};
const COVER_VI = {
  fur: ['bộ lông', 'giữ ấm cơ thể'], feathers: ['lông vũ', 'giữ ấm và giúp bay'],
  wings: ['đôi cánh', 'để bay'], scales: ['lớp vảy', 'bảo vệ da'],
  shell: ['cái mai', 'bảo vệ cơ thể mềm'], skin: ['lớp da', 'bảo vệ cơ thể'],
};
const EAT_VI = {
  bear: 'ăn tạp - cá, mật ong và quả', chicken: 'thóc và sâu bọ',
  cow: 'cỏ', duck: 'tôm, cá nhỏ và thóc', eagle: 'thịt - săn chuột và cá',
  elephant: 'thực vật - cành cây, cỏ và trái', frog: 'côn trùng',
  giraffe: 'lá cây trên cao', goat: 'cỏ và lá', horse: 'cỏ',
  human: 'ăn tạp - cả thịt lẫn rau củ', monkey: 'ăn tạp - trái cây, lá và côn trùng',
  owl: 'chuột', pig: 'ăn tạp', rabbit: 'cỏ và cà rốt', shark: 'cá',
  spider: 'côn trùng mắc lưới', tiger: 'thịt - săn mồi',
};
const FOOD_VI = {
  apple: ['táo', 'vitamins', 'giàu vitamin và chất xơ, giúp tiêu hóa tốt'],
  beans: ['đậu', 'protein', 'giàu đạm (protein), giúp cơ thể lớn và khỏe'],
  beef: ['thịt bò', 'protein', 'giàu đạm và sắt, giúp cơ bắp và máu khỏe'],
  bread: ['bánh mì', 'grains/carbs', 'là nhóm tinh bột, cung cấp năng lượng'],
  butter: ['bơ', 'fats', 'là nhóm chất béo, chỉ nên ăn rất ít'],
  candy: ['kẹo', 'sugar', 'nhiều đường, ăn nhiều sâu răng và hại sức khỏe'],
  carrot: ['cà rốt', 'vitamins', 'giàu vitamin A, rất tốt cho mắt'],
  chicken: ['thịt gà', 'protein', 'giàu đạm, giúp cơ thể lớn và khỏe'],
  eggs: ['trứng', 'protein', 'giàu đạm và chất dinh dưỡng'],
  fish: ['cá', 'protein', 'giàu đạm và omega-3 tốt cho não'],
  milk: ['sữa', 'protein', 'giàu canxi và đạm, giúp xương chắc khỏe'],
  noodles: ['mì', 'grains/carbs', 'là nhóm tinh bột, cung cấp năng lượng'],
  oil: ['dầu ăn', 'fats', 'là nhóm chất béo, chỉ nên dùng rất ít'],
  orange: ['quả cam', 'vitamins', 'giàu vitamin C, tăng sức đề kháng'],
};
const GROUP_VI = {
  'protein': 'đạm (protein)', 'grains/carbs': 'tinh bột (grains/carbs)',
  'fats': 'chất béo (fats)', 'vitamins': 'vitamin và chất xơ',
  'sugar': 'đường (sugar)',
};
const NUMWORD = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8,
  nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14,
  fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70,
  eighty: 80, ninety: 90, hundred: 100,
};
const WORD_GLOSS = {
  because: 'bởi vì', beautiful: 'đẹp', doctor: 'bác sĩ', family: 'gia đình',
  friend: 'bạn bè', science: 'khoa học', school: 'trường học',
  teacher: 'giáo viên', student: 'học sinh', mother: 'mẹ', father: 'bố',
};
const FIXED_WHY = {
  'why is drinking clean boiled water important?':
    'Nước sạch đun sôi đã diệt khuẩn nên tránh được bệnh đau bụng đường ruột - "It avoids stomach sickness".',
  'why is wearing a helmet on a motorbike important?':
    'Mũ bảo hiểm che chắn và giảm chấn thương đầu khi tai nạn - "It protects your head".',
  'why is washing hands before eating important?':
    'Rửa tay trước khi ăn trôi đi vi khuẩn gây bệnh bám trên tay - "It removes germs".',
  'which tool measures rainfall?':
    'Vũ kế (rain gauge) là dụng cụ đo lượng mưa rơi.',
  'which tool helps us see far objects in the sky?':
    'Kính thiên văn (telescope) phóng to các vật rất xa trên bầu trời.',
  'which tool measures mass/weight?':
    'Cân (scale) là dụng cụ đo khối lượng - nặng nhẹ của vật.',
  'which tool helps us see very tiny things?':
    'Kính hiển vi (microscope) phóng to những vật cực nhỏ mắt thường không thấy.',
  'which tool measures length?':
    'Thước (ruler) là dụng cụ đo độ dài của vật.',
  'which part of a plant makes seeds?':
    'Hoa (flower) là bộ phận tạo ra hạt để cây sinh sản.',
  'which part of a plant take in water from the soil?':
    'Rễ (roots) hút nước và chất dinh dưỡng từ đất nuôi cây.',
  'which body part bite and chew food?':
    'Răng (teeth) cắn và nhai nhỏ thức ăn trước khi nuốt.',
  'which body part covers and protects the body?':
    'Da (skin) bao phủ và bảo vệ cơ thể khỏi vi khuẩn, va đập.',
  'which body part help us breathe air?':
    'Phổi (lungs) là cơ quan giúp ta hít thở không khí.',
  'which body part breaks down food?':
    'Dạ dày (stomach) nghiền và phân hủy thức ăn sau khi nuốt.',
  'which body part pumps blood around the body?':
    'Tim (heart) là cái bơm đẩy máu đi khắp cơ thể.',
  'which material is soft?':
    'Cao su (rubber) mềm, co giãn được và không thấm nước - khác với thủy tinh, kim loại vốn cứng.',
};

/* ---------- helpers ---------- */

const choiceLabel = (c) =>
  typeof c === 'string' ? c : c?.text ?? c?.label ?? c?.word ?? c?.name ?? '';
const correctLabel = (q) => {
  const a = q.answer ?? {};
  if (a.index !== undefined && Array.isArray(q.choices)) return choiceLabel(q.choices[a.index]);
  if (a.text) return String(a.text);
  if (a.boolean !== undefined) return String(a.boolean);
  return '';
};
const av = (a) => ANIMAL_VI[a] ?? a;
const young = (grade) => grade <= 2;

/* ---------- template families ---------- */

function gen(q) {
  const p = (q.prompt_text ?? '').trim();
  const ans = correctLabel(q);
  const g = q.grade;
  let m;

  // math: N + M = ___ / N - M = ___
  if ((m = p.match(/^(\d+)\s*\+\s*(\d+)\s*=\s*___+$/))) {
    const [, a, b] = m.map((v, i) => (i ? Number(v) : v));
    const s = a + b;
    if (ans !== String(s)) return null; // broken answer - skip, audit P0 already clean
    const big = Math.max(a, b), small = Math.min(a, b);
    if (small <= 10 && big <= 30) {
      const steps = Array.from({ length: small }, (_, i) => big + i + 1);
      return `${a} + ${b} = ${s}. Đếm tiếp từ ${big} thêm ${small} bước: ${steps.join(', ')} - được ${s}.`;
    }
    const ao = a % 10, bo = b % 10, carry = ao + bo >= 10 ? 1 : 0;
    const at = Math.floor(a / 10), bt = Math.floor(b / 10), st = Math.floor(s / 10);
    const tens = bt > 0
      ? `hàng chục: ${at} + ${bt}${carry ? ' + 1 nhớ' : ''} = ${st}`
      : carry ? `hàng chục: ${at} + 1 nhớ = ${st}` : `hàng chục giữ ${st}`;
    return `${a} + ${b} = ${s}. Cộng hàng đơn vị: ${ao} + ${bo} = ${ao + bo}${carry ? ' (viết ' + (ao + bo - 10) + ', nhớ 1)' : ''}; ${tens}. Vậy kết quả là ${s}.`;
  }
  if ((m = p.match(/^(\d+)\s*-\s*(\d+)\s*=\s*___+$/))) {
    const [, a, b] = m.map((v, i) => (i ? Number(v) : v));
    const s = a - b;
    if (ans !== String(s)) return null;
    if (b <= 10 && a <= 30) {
      const steps = Array.from({ length: b }, (_, i) => a - i - 1);
      return `${a} - ${b} = ${s}. Đếm lùi từ ${a} đi ${b} bước: ${steps.join(', ')} - còn ${s}.`;
    }
    const ao = a % 10, bo = b % 10, bt = Math.floor(b / 10);
    const tensAfter = (d) => (bt > 0 ? `hàng chục: ${d} - ${bt} = ${Math.floor(s / 10)}` : `hàng chục giữ ${Math.floor(s / 10)}`);
    if (ao >= bo) {
      return `${a} - ${b} = ${s}. Hàng đơn vị: ${ao} - ${bo} = ${ao - bo}; ${tensAfter(Math.floor(a / 10))}. Vậy kết quả là ${s}.`;
    }
    return `${a} - ${b} = ${s}. Hàng đơn vị ${ao} < ${bo} nên mượn 1 chục: ${ao + 10} - ${bo} = ${ao + 10 - bo}; ${tensAfter(Math.floor(a / 10) - 1).replace('hàng chục:', 'hàng chục còn:').replace('hàng chục giữ', 'hàng chục còn')}. Vậy kết quả là ${s}.`;
  }

  // comparison
  if ((m = p.match(/which number is (bigger|smaller|larger|greater|less):\s*(\d+)\s*or\s*(\d+)/i))) {
    const want = m[1].toLowerCase();
    const x = Number(m[2]), y = Number(m[3]);
    const big = want === 'bigger' || want === 'larger' || want === 'greater';
    const correct = big ? Math.max(x, y) : Math.min(x, y);
    if (ans !== String(correct)) return null;
    if (x >= 10 || y >= 10) {
      const digits = (n) => String(n).length;
      if (digits(x) !== digits(y)) {
        return `So sánh ${x} và ${y}: ${digits(x) > digits(y) ? x : y} có nhiều chữ số hơn nên ${big ? 'lớn' : 'nhỏ'} hơn - vậy ${correct} là số ${big ? 'lớn' : 'nhỏ'} hơn.`;
      }
      // same digit count: compare the leading digit that first differs
      const [sx, sy] = [String(x), String(y)];
      const i = sx.split('').findIndex((d, j) => d !== sy[j]);
      const place = ['đơn vị', 'chục', 'trăm', 'nghìn'][sx.length - 1 - i] ?? 'cao nhất';
      return `So sánh ${x} và ${y}: cùng ${sx.length} chữ số, khác nhau ở hàng ${place} (${sx[i]} với ${sy[i]}) - vậy ${correct} là số ${big ? 'lớn' : 'nhỏ'} hơn.`;
    }
    return `Trên tia số 0-10, số đứng sau lớn hơn số đứng trước. ${correct} đứng ${big ? 'sau' : 'trước'} nên ${correct} là số ${big ? 'lớn' : 'nhỏ'} hơn.`;
  }

  // number word
  if ((m = p.match(/which number is ["'“]?(\w+)["'”]?\s*\??$/i))) {
    const w = m[1].toLowerCase();
    const n = NUMWORD[w];
    if (n !== undefined && ans === String(n)) {
      return `"${w}" là số ${n} bằng tiếng Anh (${w} = ${n}). Đọc kỹ từng từ số: ${w} viết khác với các số còn lại.`;
    }
  }

  // successor
  if ((m = p.match(/what number comes after (\d+)\?/i))) {
    const n = Number(m[1]);
    if (ans === String(n + 1)) return `Số liền sau ${n} là ${n} + 1 = ${n + 1} (đếm thêm 1).`;
  }

  // animal babies - two surfaces
  const babyPrompt = p.match(/finds a baby (\w+)\. it came from ___/i) ?? p.match(/^(?:a|an) (\w+) has ___/i);
  if (babyPrompt) {
    const animal = babyPrompt[1].toLowerCase();
    const cls = CLASS_OF[animal];
    const babyVi = BABY_VI[ans.toLowerCase()];
    if (animal && babyVi) {
      const fromCocoon = /cocoons/.test(ans.toLowerCase());
      const fromEgg = /eggs/.test(ans.toLowerCase());
      // "a calf" = bê only for cattle; generic "con non" for whales/dolphins/elephants
      const gloss = /^a? ?cal(f|ves)$/.test(ans.toLowerCase()) && animal !== 'cow' ? 'con non' : babyVi;
      const clsTxt = CLASS_VI[cls] && av(animal) !== CLASS_VI[cls] ? ` là ${CLASS_VI[cls]}` : '';
      const how = fromCocoon
        ? `${av(animal)} (${animal})${clsTxt} - đẻ kén chứa trứng, con non nở ra từ kén ("${ans}")`
        : fromEgg
          ? `${av(animal)} (${animal})${clsTxt} - đẻ trứng, trứng nở ra ${gloss} ("${ans}")`
          : `${av(animal)} (${animal})${clsTxt} - sinh con, con non gọi là "${ans}" (${gloss})`;
      return `${how.charAt(0).toUpperCase() + how.slice(1)}.`;
    }
  }

  // animal classification
  if ((m = p.match(/which animal is a (bird|fish|mammal|insect|reptile|amphibian)\?/i))) {
    const cls = m[1].toLowerCase();
    const a = ans.toLowerCase();
    if (CLASS_OF[a] === cls || a === cls) {
      return `"${ans}" (${av(a)}) ${CLASS_REASON[cls]} nên thuộc nhóm ${CLASS_VI[cls]}. Các con vật còn lại thuộc nhóm khác nên không đúng.`;
    }
  }

  // movement
  if ((m = p.match(/how does an? (\w+) move\?/i))) {
    const animal = m[1].toLowerCase();
    if (MOVE_VI[animal]) {
      return `${av(animal)} (${animal}) di chuyển bằng cách ${MOVE_VI[animal]} - "${ans}".`;
    }
  }

  // covering
  if ((m = p.match(/which covering does an? (\w+) have\?/i))) {
    const animal = m[1].toLowerCase();
    const cov = COVER_VI[ans.toLowerCase()];
    if (animal && cov) {
      return `${av(animal)} (${animal}) có ${cov[0]} (${ans}) ${cov[1]}.`;
    }
  }

  // diet
  if ((m = p.match(/what does an? (\w+) mainly eat\?/i))) {
    const animal = m[1].toLowerCase();
    if (EAT_VI[animal]) {
      return `${av(animal)} (${animal}) chủ yếu ăn ${EAT_VI[animal]} - "${ans}".`;
    }
  }

  // food group
  if ((m = p.match(/^(\w+(?:\s+\w+)?) belongs to which food group\?/i))) {
    const food = m[1].toLowerCase();
    const f = FOOD_VI[food];
    if (f && ans.toLowerCase() === f[1]) {
      return `${f[0][0].toUpperCase() + f[0].slice(1)} (${food}) ${f[2]} - thuộc nhóm ${GROUP_VI[f[1]]}.`;
    }
    if (f) {
      return `${f[0][0].toUpperCase() + f[0].slice(1)} (${food}) ${f[2]} - đáp án đúng là "${ans}".`;
    }
  }

  // why is FOOD good (or limited)
  if ((m = p.match(/why is (\w+(?:\s+\w+)?) good \(or limited\) for us\?/i))) {
    const food = m[1].toLowerCase();
    const f = FOOD_VI[food];
    if (f) {
      return `${f[0][0].toUpperCase() + f[0].slice(1)} ${f[2]} - "${ans}".`;
    }
  }

  // fixed safety/tool/body/plant prompts
  const fx = FIXED_WHY[p.toLowerCase()];
  if (fx) return fx;

  // plant roots
  if (/what do the roots of a plant do\?/i.test(p)) {
    return `Rễ (roots) hút nước và chất dinh dưỡng từ đất để nuôi cây, đồng thời giữ cây đứng vững - "${ans}".`;
  }

  // forces
  if (/things fall down/.test(p) && ans.toLowerCase() === 'gravity') {
    return `Trọng lực (gravity) là lực hút của Trái Đất kéo mọi vật rơi xuống - thả một vật là nó rơi xuống đất.`;
  }
  if (/drawer/.test(p) && ans.toLowerCase() === 'pull') {
    return `Mở ngăn kéo cần lực kéo (pull) đưa vật ra xa tay mình - ngược với lực đẩy (push).`;
  }
  if (/attracts iron and steel/.test(p) && ans.toLowerCase() === 'magnet') {
    return `Nam châm (magnet) có lực từ hút được các vật làm bằng sắt và thép.`;
  }

  // food chain roles
  if ((m = p.match(/in a food chain, an? (\w+) is a ___/i))) {
    const animal = m[1].toLowerCase();
    const role = ans.toLowerCase();
    const ROLE_VI = {
      carnivore: 'động vật ăn thịt (carnivore) - săn và ăn động vật khác',
      herbivore: 'động vật ăn cỏ (herbivore) - chỉ ăn thực vật',
      omnivore: 'động vật ăn tạp (omnivore) - ăn cả thịt lẫn thực vật',
      decomposer: 'sinh vật phân giải (decomposer) - phân hủy xác động thực vật thành chất dinh dưỡng cho đất',
      producer: 'sinh vật sản xuất (producer) - tự tạo thức ăn nhờ quang hợp',
    };
    if (ROLE_VI[role]) {
      return `${av(animal)} (${animal}) trong chuỗi thức ăn là ${ROLE_VI[role]}.`;
    }
  }

  // circuit conductors
  if ((m = p.match(/in a circuit, an? (.+?) is a ___/i))) {
    const obj = m[1].toLowerCase();
    const role = ans.toLowerCase();
    if (role === 'conductor') {
      return `"${ans}" (dẫn điện) - ${obj} làm bằng kim loại nên cho dòng điện chạy qua, đèn trong mạch sáng được.`;
    }
    if (role === 'insulator') {
      return `"${ans}" (cách điện) - ${obj} không cho dòng điện chạy qua nên mạch bị ngắt, đèn không sáng.`;
    }
  }

  // seed dispersal
  if (/coconut spread its seeds/i.test(p)) {
    return `Quả dừa (coconut) nổi trên nước nên trôi theo dòng nước đến nơi mới - phát tán hạt bằng nước.`;
  }

  // "so" conjunction
  if (/tired, ___ i went to bed early/i.test(p) && ans.toLowerCase() === 'so') {
    return `"so" (nên/vì vậy) nối hai vế chỉ kết quả: mệt nên đi ngủ sớm.`;
  }

  // missing letters: w_rd
  if ((m = p.match(/fill in the missing letters?:\s*([a-z_]+)/i))) {
    const skeleton = m[1].toLowerCase();
    const full = skeleton.replace(/_/g, ans.toLowerCase());
    const gloss = WORD_GLOSS[full] ? ` nghĩa là "${WORD_GLOSS[full]}"` : '';
    const spelled = full.split('').join('-');
    return `Từ "${full}"${gloss}. Điền chữ "${ans}" vào chỗ trống để được ${spelled}.`;
  }

  // wh-word cloze with "Because" answer
  if (/because/i.test(p) && /^___/.test(p) && ans.toLowerCase() === 'why') {
    return `Câu trả lời "Because..." (vì...) cho biết lý do, nên câu hỏi dùng "Why" (tại sao).`;
  }
  if (/\b(aunt|uncle|woman|man|boy|girl|teacher|friend)\b/i.test(p) && /^___/.test(p) && ans.toLowerCase() === 'who') {
    return `Câu trả lời chỉ một người ("My aunt" - dì tôi), nên câu hỏi dùng "Who" (ai).`;
  }
  // conjunctions
  if (/went inside ___ it started to rain/i.test(p) && ans.toLowerCase() === 'because') {
    return `"because" (bởi vì) nối hai vế để chỉ lý do: chúng tôi vào trong VÌ trời mưa.`;
  }
  if (/clever ___ hard-working/i.test(p) && ans.toLowerCase() === 'and') {
    return `"and" (và) nối hai tính từ cùng bổ sung ý nghĩa: clever (thông minh) và hard-working (chăm chỉ).`;
  }

  return null; // residual - LLM batch
}

/* ---------- validation (mirrors audit rules) ---------- */

const VN_MARK = /[ăâđêôơưáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/i;
const QUOTED = /[“"']([^“”"']{1,60})[”"']/;
const TEMPLATE_RESIDUE = [
  /đáp án phù hợp với ngữ cảnh/i, /chọn câu (trả lời )?phù hợp/i,
  /thông tin phù hợp với kiến thức/i, /^có nhiều đáp án đúng/i, /đáp án đúng:?$/i,
];
const CONTRAST_OK = /không (phù hợp|đúng)|còn lại|các (từ|lựa chọn|đáp án|con vật) khác|là sai|nhiễu|bẫy|khác hẳn|nhầm|khác với/i;

function validate(q, expl) {
  if (!expl || expl.trim().length < 20) return 'too-short';
  if (!VN_MARK.test(expl)) return 'not-vietnamese';
  if (TEMPLATE_RESIDUE.some((re) => re.test(expl))) return 'template-residue';
  const mm = expl.match(QUOTED);
  if (mm && Array.isArray(q.choices) && !CONTRAST_OK.test(expl)) {
    const quoted = mm[1].trim().toLowerCase();
    const labels = q.choices.map((c) => choiceLabel(c).toLowerCase());
    if (labels.includes(quoted) && quoted !== correctLabel(q).toLowerCase()) return 'mentions-other-answer';
  }
  return null;
}

/* ---------- LLM fallback for residuals ---------- */

const env = {};
try {
  for (const line of readFileSync(join(HERE, '../../so-chu-nhiem-so/.env.local'), 'utf8').split('\n')) {
    const mm = line.match(/^([A-Z_]+)=(.*)$/);
    if (mm) env[mm[1]] = mm[2].trim();
  }
} catch {}
const OR_KEY = env.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
const OR_BASE = (env.OPENAI_BASE_URL || 'https://openrouter.ai/api/v1').trim();
const OR_MODEL = env.OPENAI_MODEL || 'openai/gpt-4o-mini';

const LLM_PROMPT = (items) =>
  `Bạn là giáo viên tiểu học Việt Nam. Viết lại lời giải thích (explanation_vi) cho từng câu hỏi trắc nghiệm sau.
Yêu cầu: tiếng Việt có dấu, 1-2 câu, dạy được lý do đúng (không chỉ lặp đáp án), phù hợp lớp của học sinh.
Quy tắc trích dẫn: chỉ đặt ĐÁP ÁN ĐÚNG trong ngoặc kép. Nếu muốn so sánh với phương án nhiễu thì viết không ngoặc kép, hoặc nói rõ "phương án nhiễu"/"là sai". TUYỆT ĐỐI không để cụm trong ngoặc kép đầu tiên là một phương án sai.
Trả về CHỈ JSON: {"items":[{"id":"...","explanation_vi":"..."}]}\n\n` + JSON.stringify(items);

async function llmBatch(items) {
  if (!OR_KEY) throw new Error('no OPENAI_API_KEY');
  const res = await fetch(`${OR_BASE}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OR_KEY}` },
    body: JSON.stringify({
      model: OR_MODEL, temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: LLM_PROMPT(items) }],
    }),
    signal: AbortSignal.timeout(180000),
  });
  if (!res.ok) throw new Error(`openrouter ${res.status}`);
  const text = (await res.json()).choices?.[0]?.message?.content ?? '{}';
  const mm = text.match(/\[[\s\S]*\]/);
  if (mm) return JSON.parse(mm[0]);
  const obj = JSON.parse(text);
  return obj.items ?? obj.verdicts ?? [];
}

/* ---------- main ---------- */

const srcFile = {
  short: 'docs/qa/flagged/explain-short.json',
  nonvn: 'docs/qa/flagged/explain-nonvn.json',
  other: 'docs/qa/flagged/explain-other.json',
}[SET];
if (!srcFile) { console.error('--set must be short|nonvn|other'); process.exit(1); }
const rows = JSON.parse(readFileSync(srcFile, 'utf8'));
console.log(`${rows.length} flagged rows in ${srcFile}`);

const plan = [], residual = [], bad = [];
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
for (const q of rows) {
  const raw = gen(q);
  if (raw === null) { residual.push(q); continue; }
  const expl = cap(raw);
  const err = validate(q, expl);
  if (err) { bad.push({ id: q.id, err, expl, prompt: q.prompt_text }); continue; }
  plan.push({ id: q.id, explanation_vi: expl });
}
console.log(`templated: ${plan.length} | residual->LLM: ${residual.length} | template-invalid: ${bad.length}`);
if (bad.length) {
  writeFileSync(`docs/qa/flagged/explain-invalid-${SET}.json`, JSON.stringify(bad, null, 1));
  for (const b of bad.slice(0, 10)) console.log('  BAD', b.err, b.id, b.expl?.slice(0, 80));
}

// LLM pass for residual (also rescue template-invalid rows)
const llmIn = [...residual, ...bad.map((b) => rows.find((r) => r.id === b.id)).filter(Boolean)];
const llmOut = [];
if (llmIn.length && OR_KEY) {
  const items = llmIn.map((q) => ({
    id: q.id, grade: q.grade, subject: q.subject, prompt: q.prompt_text,
    choices: (q.choices ?? []).map(choiceLabel), correct: correctLabel(q),
    old_explanation: q.explanation_vi,
  }));
  for (let i = 0; i < items.length; i += 40) {
    const chunk = items.slice(i, i + 40);
    try {
      const out = await llmBatch(chunk);
      for (const v of out) {
        const q = rows.find((r) => r.id === v.id);
        if (!q || typeof v.explanation_vi !== 'string') continue;
        const err = validate(q, v.explanation_vi);
        if (err) { console.log(`  LLM-invalid ${v.id}: ${err}`); continue; }
        llmOut.push({ id: v.id, explanation_vi: v.explanation_vi });
      }
      console.log(`  llm batch ${i / 40 + 1}: +${llmOut.length}`);
    } catch (e) { console.log(`  llm batch failed: ${e.message?.slice(0, 120)}`); }
    await new Promise((r) => setTimeout(r, 3000));
  }
} else if (llmIn.length) {
  console.log('  no OPENROUTER key - residual unhandled:', llmIn.length);
}

const all = [...plan, ...llmOut];
writeFileSync(`docs/qa/flagged/explain-plan-${SET}.json`, JSON.stringify(all));
console.log(`\nplan: ${all.length} updates -> docs/qa/flagged/explain-plan-${SET}.json`);
for (const p of all.slice(0, 8)) {
  const q = rows.find((r) => r.id === p.id);
  console.log(`  [${q?.subject} g${q?.grade}] "${q?.prompt_text?.slice(0, 55)}"\n    => ${p.explanation_vi}`);
}

if (APPLY) {
  let done = 0, failed = 0;
  const CONC = 20;
  for (let i = 0; i < all.length; i += CONC) {
    const chunk = all.slice(i, i + CONC);
    const results = await Promise.all(chunk.map(async (c) => {
      for (let t = 0; t < 3; t++) {
        try {
          const res = await fetch(`${SUPA_URL}/rest/v1/qb_questions?id=eq.${c.id}`, {
            method: 'PATCH', headers: H,
            body: JSON.stringify({ explanation_vi: c.explanation_vi }),
            signal: AbortSignal.timeout(30000),
          });
          if (res.ok) return true;
          if (res.status === 400 || res.status === 404) { console.log(`  ${c.id}: ${res.status}`); return false; }
        } catch {}
        await new Promise((r) => setTimeout(r, 1000 * (t + 1)));
      }
      return false;
    }));
    done += results.filter(Boolean).length;
    failed += results.filter((r) => !r).length;
    if (i % 2000 === 0 && i) console.log(`  progress ${i}/${all.length} (failed ${failed})`);
  }
  console.log(`applied: ${done}, failed: ${failed}`);
}

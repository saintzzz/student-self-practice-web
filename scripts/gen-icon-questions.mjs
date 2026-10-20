// Deterministic word-to-image-mcq generator.
// No LLM needed - composes questions from existing qb_assets concepts.
// Each question: "Which picture shows: {concept}?" + 4 image choices
// (1 target + 3 same-category distractors), answer.index = target slot.
// Usage: node scripts/gen-icon-questions.mjs [--grades 1,2] [--per-concept 2] [--dry]
import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const DRY = process.argv.includes('--dry');
const GRADES = (arg('--grades', '1,2,3,4,5')).split(',').map(Number);
const PER_CONCEPT = Number(arg('--per-concept', '1'));

const KEYS = JSON.parse(readFileSync(join(homedir(), '.config', 'devin', 'secrets', 'supabase_new_keys.json'), 'utf8'));
const URL = KEYS.url, SVC = KEYS.keys.service_role;
const H = { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Accept-Profile': 'practice', 'Content-Profile': 'practice' };
const HW = { ...H, 'Content-Type': 'application/json', Prefer: 'count=exact,resolution=ignore-duplicates' };

// semantic buckets - distractors from the same bucket make the choice
// non-trivial (animal vs animal) but still exactly one right answer.
const BUCKETS = [
  ['animal', 'ant bee bird butterfly cat cow dog duck elephant fish frog goat horse lion monkey mouse pig rabbit sheep snake tiger bear chicken deer fox panda penguin shark whale turtle spider snail worm puppy kitten chick duckling foal piglet calf lamb bunny poodle rat rooster seal sloth otter camel giraffe zebra hippo rhino kangaroo koala squirrel bat owl eagle parrot peacock flamingo swan goose turkey donkey mule crab lobster shrimp octopus squid jellyfish starfish dolphin seahorse'],
  ['food', 'apple banana orange grape mango lemon watermelon strawberry pineapple peach pear cherry plum coconut papaya kiwi durian lychee rice noodle bread cake cookie candy chocolate milk juice water tea coffee egg cheese butter meat fish-sauce soup salad pizza burger sandwich pho banh-mi dumpling porridge yogurt honey sugar salt pepper ice-cream pudding jelly jam cereal pancake waffle sausage falafel'],
  ['school', 'pen pencil eraser ruler book notebook bag backpack desk chair board chalk marker crayon scissors glue stapler sharpener calculator globe map compass protractor folder locker bell uniform homework test exam dictionary library'],
  ['body', 'eye ear nose mouth hand foot leg arm head hair face tooth tongue finger toe knee elbow shoulder neck stomach heart brain skin bone'],
  ['color', 'red blue green yellow orange purple pink black white brown gray grey gold silver rainbow color'],
  ['number', 'one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty thirty forty fifty sixty seventy eighty ninety hundred zero number count'],
  ['family', 'mother father mom dad sister brother grandmother grandfather grandma grandpa aunt uncle cousin baby child parent son daughter family twin'],
  ['feeling', 'happy sad angry scared surprised tired bored excited worried proud shy calm amazed annoyed confused brave'],
  ['nature', 'sun moon star cloud rain snow wind storm rainbow sky tree flower grass leaf forest mountain river lake sea ocean beach desert island rock stone sand volcano sunrise sunset lightning thunder rainbow garden park hill valley cave waterfall pond'],
  ['country', 'vietnam japan china korea thailand laos cambodia singapore malaysia indonesia philippines myanmar brunei india mongolia iran iraq saudi turkey russia france germany italy spain portugal uk england scotland wales ireland usa america canada mexico brazil argentina chile peru egypt morocco nigeria kenya rwanda serbia croatia cyprus malta fiji tuvalu samoa tonga vanuatu palau nauru kiribati micronesia mongolia nepal bhutan bangladesh pakistan afghanistan uzbekistan kazakhstan jersey montserrat belize guyana bahamas maldives hungary finland sweden norway denmark poland austria switzerland belgium netherlands greece'],
  ['transport', 'car bus train plane airplane ship boat bicycle bike motorbike motorcycle truck taxi van helicopter rocket subway tram scooter ambulance firetruck police-car'],
  ['clothes', 'shirt pants dress skirt shoes socks hat cap coat jacket sweater scarf gloves boots sandals jeans shorts t-shirt uniform pajamas raincoat tie belt'],
  ['job', 'teacher doctor nurse farmer cook chef driver pilot police officer firefighter soldier artist singer dancer writer engineer scientist dentist vet mechanic builder fisherman astronaut'],
  ['sport', 'soccer football basketball volleyball tennis badminton swimming running jumping skating cycling boxing karate judo yoga gymnastics baseball golf surfing skiing'],
  ['home', 'house door window roof wall floor kitchen bedroom bathroom living-room table bed sofa chair lamp tv radio fridge oven stove sink mirror clock fan broom mop bucket towel soap toothbrush toothpaste pillow blanket curtain garden garage balcony stairs'],
  ['weather', 'sunny rainy cloudy windy snowy stormy hot cold warm cool foggy humid dry weather season spring summer autumn fall winter'],
  ['action', 'run walk jump swim fly climb dance sing read write draw paint eat drink sleep cook wash clean play kick throw catch push pull open close sit stand cry laugh smile talk listen look see watch help give take buy sell make build'],
  ['time', 'morning afternoon evening night day week month year today tomorrow yesterday birthday holiday festival clock calendar minute hour'],
  ['instrument', 'piano guitar drum violin flute trumpet bell whistle microphone speaker headphone'],
  ['shape', 'circle square triangle rectangle oval star diamond heart pentagon hexagon shape line curve'],
];
const bucketOf = (c) => { const w = c.toLowerCase().replace(/[ -]/g, ' '); for (const [b, ws] of BUCKETS) if (ws.split(' ').some((x) => w === x || w.endsWith(' ' + x) || w.startsWith(x + ' '))) return b; return 'misc'; };

async function fetchAll(table, cols, filter) {
  const out = []; let off = 0;
  for (;;) {
    const res = await fetch(`${URL}/rest/v1/${table}?select=${cols}${filter ? '&' + filter : ''}&offset=${off}&limit=1000`, { headers: H });
    if (!res.ok) throw new Error(table + ' ' + res.status);
    const rows = await res.json(); out.push(...rows);
    if (rows.length < 1000) return out; off += 1000;
  }
}

const assets = await fetchAll('qb_assets', 'id,file_path,alt_text,metadata', "kind=eq.generated-concept");
const pool = assets
  .map((a) => ({ id: a.id, concept: a.metadata?.concept, grades: a.metadata?.grades ?? [], vi: a.metadata?.meaningVi ?? '' }))
  .filter((a) => a.concept && a.grades.length);
console.log(`assets with concept+grade: ${pool.length}`);

const byGradeBucket = {};
for (const a of pool) for (const g of a.grades) {
  const k = `${g}|${bucketOf(a.concept)}`;
  (byGradeBucket[k] ??= []).push(a);
}
const byGrade = {};
for (const a of pool) for (const g of a.grades) (byGrade[g] ??= []).push(a);

// existing word-to-image prompts - skip concept+grade combos already served
const existing = await fetchAll('qb_questions', 'id,prompt_text', "question_type=eq.word-to-image-mcq&canonical=eq.true&review_status=neq.rejected");
const seenKey = new Set(existing.map((q) => q.prompt_text.replace(/^Which picture shows:?\s*/i, '').replace(/[?.!\s]+$/g, '').toLowerCase()));
console.log(`existing word-to-image: ${existing.length}`);

const rows = [], links = [];
for (const g of GRADES) {
  const mine = (byGrade[g] ?? []);
  for (const target of mine) {
    const ck = `${g}|${target.concept.toLowerCase()}`;
    if (seenKey.has(target.concept.toLowerCase())) continue; // already has a word->image q
    const bucket = bucketOf(target.concept);
    let distract = (byGradeBucket[`${g}|${bucket}`] ?? []).filter((a) => a.id !== target.id);
    if (distract.length < 3) distract = mine.filter((a) => a.id !== target.id); // widen to grade pool
    if (distract.length < 3) continue;
    for (let v = 0; v < PER_CONCEPT; v++) {
      const seed = `${g}|${target.id}|${v}`;
      const h = createHash('sha1').update(seed).digest('hex');
      // pick 3 distractors deterministically from hash
      const idxs = [...distract.keys()];
      for (let i = idxs.length - 1; i > 0; i--) { const j = parseInt(h.slice((i * 2) % 32, (i * 2) % 32 + 2), 16) % (i + 1); [idxs[i], idxs[j]] = [idxs[j], idxs[i]]; }
      const picked = idxs.slice(0, 3).map((i) => distract[i]);
      const opts = [target, ...picked];
      const shift = parseInt(h.slice(36, 38), 16) % 4;
      const choices = opts.map((_, i) => ({ assetId: opts[(i + shift) % 4].id }));
      const answerIndex = (0 - shift + 4) % 4;
      const id = `g${g}-english-bulk-icon-${h.slice(0, 12)}`;
      const conceptVi = (target.vi.split(/\s+tiếng Anh\s+là/i)[0] || '').replace(/[.\s]+$/, '').slice(0, 60);
      rows.push({
        id, grade: g, subject: 'english', domain: 'vocabulary', skill: 'vocabulary-recognition',
        question_type: 'word-to-image-mcq', difficulty: 1, topic_key: bucket,
        prompt_text: `Which picture shows: ${target.concept}?`, transcript: null,
        choices, answer: { index: answerIndex },
        explanation_vi: `Đáp án đúng là hình "${target.concept}"${conceptVi ? ` - ${conceptVi}` : ''}. Ba hình còn lại là ${picked.map((p) => p.concept).join(', ')}.`,
        learning_objective: `Recognize the English word "${target.concept}" and match it to its picture.`,
        curriculum_alignment: { grade: g, coreTopic: bucket, moetSubject: 'English', alignmentLevel: 'topic-skill', curriculumRole: 'core', primaryFramework: 'MOET-2018' },
        tags: null, canonical: true, variant_group_id: null, rights_status: 'owned-original-generated',
        review_status: 'machine-editorial-reviewed-human-academic-signoff-required',
        publication_policy: { examEligible: false, mockEligible: true, practiceEligible: true, commercialReleaseEligible: true, requiresHumanApprovalForExam: true, requiresHumanApprovalForCommercialRelease: true },
        content_hash: h.slice(0, 16),
        source: { kind: 'generated-v6', method: 'icon-choice-composer', provenance: 'Deterministic composition from owned concept assets; no LLM.' },
        schema_version: '6.0', passage: null, statement: null, tokens: null,
      });
      opts.forEach((o, i) => links.push({ question_id: id, asset_id: o.id, sort_order: i }));
      seenKey.add(target.concept.toLowerCase());
      break; // one per concept is enough for coverage
    }
  }
}

console.log(`new icon questions: ${rows.length} (+${links.length} asset links)`);
if (DRY) { console.log(rows.slice(0, 3)); process.exit(0); }

let ok = 0;
for (let i = 0; i < rows.length; i += 200) {
  const res = await fetch(`${URL}/rest/v1/qb_questions`, { method: 'POST', headers: HW, body: JSON.stringify(rows.slice(i, i + 200)) });
  if (!res.ok) { console.log('insert err', res.status, (await res.text()).slice(0, 200)); break; }
  ok += rows.slice(i, i + 200).length;
}
console.log('questions inserted:', ok);
for (let i = 0; i < links.length; i += 500) {
  const res = await fetch(`${URL}/rest/v1/qb_question_assets`, { method: 'POST', headers: HW, body: JSON.stringify(links.slice(i, i + 500)) });
  if (!res.ok) { console.log('link err', res.status, (await res.text()).slice(0, 200)); break; }
}
console.log('links inserted:', links.length);

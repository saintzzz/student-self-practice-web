#!/usr/bin/env node
// Emits job prompts for the ChatGPT-web runner. Prints JSON array to stdout.
//   node scripts/cg-jobs.mjs --subject math --grade 3 --from 0 --count 40
const ARGS = process.argv.slice(2);
const arg = (n, d) => { const i = ARGS.indexOf(n); return i >= 0 ? ARGS[i + 1] : d; };
const SUBJECT = arg('--subject', 'math');
const GRADE = Number(arg('--grade', 3));
const FROM = Number(arg('--from', 0));
const COUNT = Number(arg('--count', 20));
const BATCH = 30;

const MATH_TOPICS = {
  1: ['numbers 0-10 counting', 'numbers 11-20', 'numbers to 100', 'addition within 10', 'subtraction within 10', 'addition within 20', 'compare numbers more less equal', 'shapes circle square triangle rectangle', 'length taller shorter', 'time days of week', 'money simple dong', 'positions above below left right'],
  2: ['numbers to 1000', 'addition without carrying', 'subtraction without borrowing', 'addition with carrying', 'subtraction with borrowing', 'times tables of 2', 'times tables of 5', 'times tables of 3 and 4', 'division basics sharing', 'time oclock half past', 'money 1000 dong notes', 'measurement cm m kg liter', 'shapes quadrilateral', 'word problems two step'],
  3: ['numbers to 100000', 'times tables 6 and 7', 'times tables 8 and 9', 'division tables 6-9', 'multiply 2digit by 1digit', 'divide 2digit by 1digit', 'division with remainder', 'fractions one half one third', 'perimeter of shapes', 'area squares rectangles', 'time minutes hours', 'money word problems', 'rounding numbers', 'data tables and charts'],
  4: ['numbers to millions', 'multiply by 2digit numbers', 'divide by 2digit numbers', 'average mean problems', 'fractions add subtract', 'fractions equivalent simplify', 'mixed numbers', 'angles acute obtuse right', 'parallel perpendicular lines', 'area rectangle square', 'units conversion km kg', 'expressions and order', 'word problems multi-step', 'statistics bar charts'],
  5: ['decimal numbers', 'decimal add subtract', 'decimal multiply divide', 'percentages', 'ratio and proportion', 'speed distance time', 'area triangle trapezoid', 'area circle circumference', 'volume cube cuboid', 'fractions multiply divide', 'mixed operations', 'percentage problems', 'statistics pie charts', 'geometry composite shapes'],
};

const SCI_TOPICS = {
  1: ['body parts and senses', 'animals and their babies', 'pets and farm animals', 'plants grow from seeds', 'weather sunny rainy', 'day and night sky', 'healthy habits hygiene', 'food and drinks healthy', 'toys and materials', 'safe behaviors at home', 'seasons hot cold', 'water we drink'],
  2: ['living and nonliving things', 'plant parts roots leaves flowers', 'animals habitats', 'animals cover fur feathers scales', 'water forms liquid ice vapor', 'air around us', 'weather and seasons', 'health teeth and washing', 'light sources sun lamp', 'moving things push pull', 'materials wood metal plastic', 'day night moon sun'],
  3: ['skeleton and muscles', 'digestion and food groups', 'plants life cycle', 'plant needs light water air', 'rocks and soil', 'light and shadows', 'forces push pull magnet', 'floating and sinking', 'water cycle rain', 'heat and temperature', 'animals classification', 'environment clean green'],
  4: ['food chains and webs', 'animal habitats adaptation', 'states of matter solid liquid gas', 'water cycle evaporation', 'electricity circuits', 'conductors insulators', 'sound vibrations', 'earth rotation day night', 'natural disasters storms flood', 'human body systems', 'plants reproduction pollination', 'environmental protection'],
  5: ['circulatory respiratory systems', 'nervous system senses brain', 'life cycles insect amphibian', 'materials properties changes', 'reversible irreversible changes', 'forces gravity friction', 'simple machines lever pulley', 'earth sun moon phases eclipse', 'energy sources renewable', 'climate and environment', 'microorganisms germs disease', 'conservation resources'],
};

const TOPICS = SUBJECT === 'math' ? MATH_TOPICS : SCI_TOPICS;
const LEVELS = {
  math: {
    1: 'numbers to 100, +/- within 20, simple shapes, compare/length.',
    2: 'numbers to 1000, +/- with carrying, tables 2-5, time and money.',
    3: 'numbers to 100k, tables 6-9, 2-digit x/÷, perimeter, fractions intro.',
    4: 'numbers to millions, multi-digit x/÷, fraction ops, area, averages.',
    5: 'decimals/percentages, ratio, speed-distance-time, area/volume.',
  },
  science: {
    1: 'very concrete observations, everyday objects, one fact per item.',
    2: 'simple classification, basic processes, everyday phenomena.',
    3: 'cause-effect, simple systems (body, water cycle), simple experiments.',
    4: 'systems thinking, circuits, matter states, food chains.',
    5: 'multi-step processes, energy, forces, health systems, environment issues.',
  },
};

function jobText(topic, idx) {
  const tf = idx % 5 === 3 ? '4 of the 30 items should be true-false: {"tf":true,"passage":"<2-3 short sentences>","statement":"<statement>","bool":<true/false>,"ex":"...","lo":"...","d":<1-5>}' : '';
  return `You are writing ${SUBJECT} practice questions IN ENGLISH for Vietnamese grade ${GRADE} students (age ${GRADE + 5}-${GRADE + 6}), aligned to the MOET primary curriculum. Topic: "${topic}".

Language: short clear English sentences, age-appropriate vocabulary.
${SUBJECT === 'math' ? 'Math level: ' : 'Science level: '}${LEVELS[SUBJECT][GRADE]}

Return ONLY a JSON array of ${BATCH} DIFFERENT items about "${topic}". Each item:
{"q": "<question>", "c": ["<4 distinct options>"], "a": <0-3 correct index>, "ex": "<Vietnamese explanation for kids, friendly, use hyphen not em-dash>", "lo": "<Vietnamese learning objective>", "d": <difficulty 1-5 spread across batch>}
${tf}
Rules:
- Choices must be 4 DISTINCT strings; exactly one clearly correct. ${SUBJECT === 'math' ? 'Compute every answer yourself and double check arithmetic.' : 'Facts must be scientifically accurate for primary level.'}
- Explanations in Vietnamese: why correct + why a common wrong choice is wrong.
- No two items ask the same thing. Vary the numbers/wording across items.
- No markdown fences, no commentary - raw JSON array only.`;
}

const jobs = [];
const topics = TOPICS[GRADE];
for (let i = FROM; i < FROM + COUNT; i++) {
  jobs.push({ id: `${SUBJECT}-g${GRADE}-b${i}`, text: jobText(topics[i % topics.length], i) });
}
console.log(JSON.stringify(jobs));

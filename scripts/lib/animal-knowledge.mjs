// Animal knowledge map for deterministic repair + audit of the
// science template families ("X sees an animal with A", "X finds a AN
// at P. It has A. What group is it?", "a baby X came from ___").
// Hand-curated for the 45-animal vocabulary universe used by the bank.

export const ANIMAL_VN = {
  ant: 'kiến', bat: 'dơi', bear: 'gấu', bee: 'ong', beetle: 'bọ cánh cứng',
  butterfly: 'bướm', cat: 'mèo', chicken: 'gà', cow: 'bò', crab: 'cua',
  crocodile: 'cá sấu', dog: 'chó', dolphin: 'cá heo', duck: 'vịt',
  eagle: 'đại bàng', earthworm: 'giun đất', elephant: 'voi', fish: 'cá',
  frog: 'ếch', gecko: 'tắc kè', goat: 'dê', goldfish: 'cá vàng',
  horse: 'ngựa', jellyfish: 'sứa', lizard: 'thằn lằn', monkey: 'khỉ',
  mosquito: 'muỗi', octopus: 'bạch tuộc', ostrich: 'đà điểu', owl: 'cú',
  parrot: 'vẹt', penguin: 'chim cánh cụt', pig: 'lợn', rabbit: 'thỏ',
  salmon: 'cá hồi', shark: 'cá mập', shrimp: 'tôm', snail: 'ốc sên',
  snake: 'rắn', sparrow: 'chim sẻ', spider: 'nhện', tiger: 'hổ',
  toad: 'cóc', turtle: 'rùa', whale: 'cá voi',
};

export const ANIMALS = Object.keys(ANIMAL_VN).sort();

// Animals that genuinely have the attribute (biologically correct for
// primary-science level). Used to validate the keyed answer AND to
// exclude from distractors.
export const ATTR_HAS = {
  'fur': ['bat', 'bear', 'cat', 'cow', 'dog', 'goat', 'horse', 'monkey', 'pig', 'rabbit', 'tiger'],
  'scales': ['crocodile', 'fish', 'gecko', 'goldfish', 'lizard', 'salmon', 'shark', 'snake', 'turtle'],
  'feathers': ['chicken', 'duck', 'eagle', 'ostrich', 'owl', 'parrot', 'penguin', 'sparrow'],
  'wings': ['bat', 'bee', 'beetle', 'butterfly', 'chicken', 'duck', 'eagle', 'mosquito', 'ostrich', 'owl', 'parrot', 'penguin', 'sparrow'],
  'smooth skin': ['dolphin', 'frog', 'toad', 'whale'],
  'thick skin': ['elephant'],
  'a shell': ['crab', 'shrimp', 'snail', 'turtle'],
  'a hard shell': ['crab', 'shrimp', 'snail', 'turtle'],
  'a hard shell and claws': ['crab', 'turtle'],
  'a soft body and a shell': ['snail'],
  'a soft jelly body': ['jellyfish'],
  'a soft moist body': ['earthworm'],
  'bristly skin': ['pig'],
  'bumpy skin': ['toad'],
  'eight arms and no bones': ['octopus'],
  'eight legs': ['spider'],
  'hard wing cases': ['beetle'],
  'six legs': ['ant', 'bee', 'beetle', 'butterfly', 'mosquito'],
  'wet skin': ['frog', 'toad'],
};

// Borderline animals a reasonable reviewer could argue ALSO have the
// attribute - excluded from distractor pools to keep answers unique.
export const ATTR_BORDERLINE = {
  'fur': ['dolphin', 'whale'],
  'scales': ['chicken', 'duck', 'eagle', 'ostrich', 'owl', 'parrot', 'penguin', 'sparrow', 'butterfly', 'mosquito'],
  'feathers': [],
  'wings': ['ant'],
  'smooth skin': ['fish', 'goldfish', 'salmon', 'shark', 'gecko', 'lizard', 'snake', 'octopus', 'jellyfish', 'earthworm'],
  'thick skin': ['bear', 'crocodile', 'pig', 'whale', 'shark'],
  'a shell': ['beetle', 'crocodile'],
  'a hard shell': ['beetle'],
  'a hard shell and claws': ['shrimp'],
  'a soft body and a shell': ['crab', 'shrimp', 'turtle'],
  'a soft jelly body': ['octopus'],
  'a soft moist body': ['jellyfish', 'snail', 'frog', 'toad'],
  'bristly skin': [],
  'bumpy skin': ['crocodile', 'gecko', 'lizard'],
  'eight arms and no bones': ['spider', 'jellyfish'],
  'eight legs': ['crab', 'shrimp', 'octopus'],
  'hard wing cases': [],
  'six legs': ['spider', 'crab', 'shrimp', 'octopus'],
  'wet skin': ['fish', 'goldfish', 'salmon', 'shark', 'whale', 'dolphin', 'octopus', 'jellyfish', 'shrimp', 'crab', 'turtle', 'earthworm', 'snail', 'crocodile'],
};

// Distractor pool: animals clearly LACKING the attribute.
export function safeDistractors(attr) {
  const bad = new Set([...(ATTR_HAS[attr] || []), ...(ATTR_BORDERLINE[attr] || [])]);
  return ANIMALS.filter((a) => !bad.has(a));
}

// Habitat place phrase per animal (keeps the template's narrative scene
// while removing mismatches like "whale at a garden").
const SEA = 'at the beach';
const FARM = 'at a farm';
const GARDEN = 'in a garden';
const ZOO = 'at the zoo';
const FOREST = 'in the forest';
const POND = 'in a pond';
export const ANIMAL_PLACE = {
  crab: SEA, turtle: SEA, whale: SEA, dolphin: SEA, shark: SEA, fish: SEA,
  salmon: SEA, octopus: SEA, jellyfish: SEA, shrimp: SEA,
  goldfish: POND,
  cow: FARM, pig: FARM, goat: FARM, horse: FARM, chicken: FARM,
  duck: FARM, dog: FARM, cat: FARM, rabbit: FARM,
  elephant: ZOO, tiger: ZOO, monkey: ZOO, bear: ZOO, crocodile: ZOO,
  ostrich: ZOO, penguin: ZOO, parrot: ZOO,
  ant: GARDEN, bee: GARDEN, beetle: GARDEN, butterfly: GARDEN,
  mosquito: GARDEN, snail: GARDEN, earthworm: GARDEN, spider: GARDEN,
  gecko: GARDEN, lizard: GARDEN, frog: GARDEN, toad: GARDEN,
  snake: FOREST, eagle: FOREST, owl: FOREST, bat: FOREST,
  sparrow: 'at the park',
};

// Offspring vocabulary for the "A baby X is called ___" repair.
export const OFFSPRING = {
  // mammals
  elephant: 'a calf', whale: 'a calf', dolphin: 'a calf', cow: 'a calf',
  horse: 'a foal', cat: 'a kitten', rabbit: 'a kit', bat: 'a pup',
  bear: 'a cub', tiger: 'a cub', goat: 'a kid', pig: 'a piglet',
  dog: 'a puppy', monkey: 'an infant',
  // birds
  owl: 'a chick', ostrich: 'a chick', chicken: 'a chick',
  sparrow: 'a chick', parrot: 'a chick', eagle: 'a chick',
  penguin: 'a chick', duck: 'a duckling',
  // insects
  mosquito: 'a larva', bee: 'a larva', ant: 'a larva', beetle: 'a larva',
  butterfly: 'a caterpillar',
  // amphibians / fish / reptiles / others
  frog: 'a tadpole', toad: 'a tadpole',
  fish: 'a fry', salmon: 'a fry', goldfish: 'a fry', shark: 'a pup',
  gecko: 'a hatchling', lizard: 'a hatchling', snake: 'a hatchling',
  turtle: 'a hatchling', crocodile: 'a hatchling', crab: 'a hatchling',
  shrimp: 'a hatchling', snail: 'a hatchling', octopus: 'a hatchling',
  jellyfish: 'a larva', earthworm: 'a hatchling', spider: 'a spiderling',
};

const MAMMAL_BABY = ['a calf', 'a foal', 'a kitten', 'a kit', 'a cub', 'a kid', 'a piglet', 'a puppy', 'an infant', 'a pup'];
const NONMAMMAL_BABY = ['a chick', 'a duckling', 'a larva', 'a caterpillar', 'a tadpole', 'a fry', 'a hatchling', 'a spiderling'];

// Distractors for an offspring answer: same-domain-confusable names are
// excluded (e.g. 'a pup' must not appear when the answer is 'a puppy').
export function offspringDistractors(answerText) {
  const pool = MAMMAL_BABY.includes(answerText) ? NONMAMMAL_BABY : MAMMAL_BABY;
  const excl = new Set([answerText]);
  if (answerText === 'a puppy') excl.add('a pup');
  if (answerText === 'a pup') excl.add('a puppy');
  return pool.filter((w) => !excl.has(w));
}

// Animal classification groups for the "What group is it?" template.
export const GROUP_VN = {
  mammal: 'động vật có vú (thú)', bird: 'chim', fish: 'cá',
  reptile: 'bò sát', amphibian: 'lưỡng cư', insect: 'côn trùng',
  arachnid: 'lớp nhện', crustacean: 'giáp xác', cnidarian: 'ngành xúc tu',
  mollusc: 'động vật thân mềm', worm: 'giun',
};

export const ANIMAL_GROUP = {
  bat: 'mammal', bear: 'mammal', cat: 'mammal', cow: 'mammal',
  dog: 'mammal', dolphin: 'mammal', goat: 'mammal', horse: 'mammal',
  monkey: 'mammal', pig: 'mammal', rabbit: 'mammal', tiger: 'mammal',
  whale: 'mammal', elephant: 'mammal',
  chicken: 'bird', duck: 'bird', eagle: 'bird', ostrich: 'bird',
  owl: 'bird', parrot: 'bird', penguin: 'bird', sparrow: 'bird',
  fish: 'fish', goldfish: 'fish', salmon: 'fish', shark: 'fish',
  crocodile: 'reptile', gecko: 'reptile', lizard: 'reptile',
  snake: 'reptile', turtle: 'reptile',
  frog: 'amphibian', toad: 'amphibian',
  ant: 'insect', bee: 'insect', beetle: 'insect', butterfly: 'insect',
  mosquito: 'insect',
  spider: 'arachnid',
  crab: 'crustacean', shrimp: 'crustacean',
  jellyfish: 'cnidarian',
  snail: 'mollusc', octopus: 'mollusc',
  earthworm: 'worm',
};

// Answers in the "Which covering does X have?" family that are body
// APPENDAGES or whole-body descriptions, not coverings - the prompt word
// must become "feature" for the keyed answer to be defensible.
export const NON_COVERING = new Set([
  'wings', 'six legs', 'eight legs', 'eight arms and no bones',
  'hard wing cases', 'a soft moist body', 'a soft jelly body',
  'a soft body and a shell',
]);

// Attribute phrases that ARE body coverings - under a "covering" prompt a
// distractor that is another covering the animal truly has is ambiguous.
export const COVERING_ATTRS = new Set([
  'fur', 'scales', 'feathers', 'smooth skin', 'thick skin', 'wet skin',
  'bristly skin', 'bumpy skin', 'a shell', 'a hard shell',
  'a hard shell and claws', 'hard wing cases',
]);

// Every attribute an animal genuinely has (coverings + appendages + body
// descriptions) - used to validate "Which feature" distractors.
export function attrsOf(animal) {
  return Object.keys(ATTR_HAS).filter((a) => ATTR_HAS[a].includes(animal));
}

// Habitats a reasonable teacher would accept as TRUE for each animal.
// Used to keep "Where does X live?" distractors unambiguous: any
// distractor inside the set must be replaced.
export const VALID_HABITATS = {
  ant: ['nests in the ground', 'soil', 'fields and burrows', 'grasslands and forests'],
  bat: ['caves and trees', 'trees', 'trees at night', 'forests'],
  bear: ['forests', 'caves and trees', 'trees', 'grasslands and forests'],
  bee: ['hives', 'nests in the ground', 'trees', 'forests'],
  camel: ['deserts'],
  cow: ['farms', 'farms and hills', 'fields and burrows', 'grasslands and forests'],
  crab: ['the seashore', 'the ocean', 'rocks and walls', 'water'],
  dolphin: ['the ocean', 'water'],
  duck: ['ponds', 'near water', 'water', 'farms', 'fish tanks and ponds'],
  eagle: ['the sky/nests on cliffs', 'trees', 'forests'],
  earthworm: ['soil', 'damp places', 'nests in the ground', 'fields and burrows'],
  fish: ['water', 'fish tanks and ponds', 'ponds', 'the ocean', 'near water'],
  frog: ['near water', 'ponds', 'damp places', 'water'],
  goat: ['farms and hills', 'farms'],
  goldfish: ['fish tanks and ponds', 'ponds', 'water'],
  lizard: ['rocks and walls', 'deserts', 'forests', 'grasslands and forests'],
  monkey: ['trees', 'forests', 'trees near houses', 'grasslands and forests'],
  octopus: ['the ocean', 'water'],
  owl: ['trees at night', 'trees', 'forests'],
  penguin: ['cold polar regions'],
  rabbit: ['fields and burrows', 'forests', 'grasslands and forests'],
  shark: ['the ocean', 'cold polar regions', 'water'],
  snail: ['damp places', 'soil', 'ponds', 'forests', 'fields and burrows'],
  snake: ['grasslands and forests', 'forests', 'rocks and walls', 'deserts'],
  sparrow: ['trees near houses', 'trees', 'forests'],
  tiger: ['forests', 'grasslands and forests'],
  whale: ['the ocean', 'cold polar regions', 'water'],
};

// Habitat phrases that are FALSE for the given animal - safe distractors
// for "Where does X live?" repairs.
export function wrongHabitats(animal) {
  const valid = new Set(VALID_HABITATS[animal] || []);
  const all = new Set();
  for (const v of Object.values(VALID_HABITATS)) for (const h of v) all.add(h);
  return [...all].filter((h) => !valid.has(h)).sort();
}

// Vietnamese label for a habitat phrase, for regenerated explanations.
export const HABITAT_VN = {
  'nests in the ground': 'tổ dưới đất', 'soil': 'đất',
  'fields and burrows': 'đồng ruộng và hang', 'grasslands and forests': 'thảo nguyên và rừng',
  'caves and trees': 'hang động và cây cối', 'trees': 'cây',
  'trees at night': 'cây vào ban đêm', 'trees near houses': 'cây gần nhà',
  'forests': 'rừng', 'hives': 'tổ ong', 'deserts': 'sa mạc',
  'farms': 'nông trại', 'farms and hills': 'nông trại và đồi',
  'the seashore': 'bờ biển', 'the ocean': 'đại dương', 'ponds': 'ao',
  'near water': 'gần nước', 'water': 'nước', 'fish tanks and ponds': 'bể cá và ao',
  'cold polar regions': 'vùng cực lạnh', 'the sky/nests on cliffs': 'bầu trời/tổ trên vách đá',
  'rocks and walls': 'đá và tường', 'damp places': 'nơi ẩm ướt',
};

// English words that take "an" (vowel sound). Attested in the bank's
// science/vocab templates.
export const AN_WORDS = [
  'insect', 'amphibian', 'arachnid', 'eagle', 'elephant', 'owl',
  'octopus', 'ostrich', 'ant', 'earthworm', 'apple', 'apples', 'egg',
  'eggs', 'engineer', 'astronaut', 'artist', 'architect', 'actor',
  'infant', 'eel', 'emu', 'idea', 'island', 'ice', 'ink', 'iron',
  'orange', 'hour', 'honest', 'answer', 'animal', 'arm', 'ankle',
];

const AN_RE = new RegExp(`\\b(a|A)\\s+(${AN_WORDS.join('|')})\\b`, 'g');
export function fixArticles(text) {
  if (typeof text !== 'string' || !text) return text;
  return text
    .replace(AN_RE, (_m, a, w) => (a === 'A' ? 'An ' : 'an ') + w)
    .replace(/\b(a|an|A|An)\s+(a|an)\s+/g, '$1 ');
}

// Taught preposition collocations that appeared wrong in the bank.
export function fixPrepositions(text) {
  if (typeof text !== 'string' || !text) return text;
  return text
    .replace(/\bin (a|the) shelf\b/gi, (m) => (m[0] === 'I' ? 'On ' : 'on ') + m.slice(3))
    .replace(/\bin (a|the) farm\b/gi, (m) => (m[0] === 'I' ? 'On ' : 'on ') + m.slice(3))
    .replace(/\blives in farms\b/gi, (m) => (m[0] === 'L' ? 'Lives' : 'lives') + ' on farms');
}

// Proper nouns attested in the bank written lowercase. Excludes words with
// a common-noun reading (turkey the bird, china the porcelain, guinea pig)
// where lowercasing may be correct; names that are people (Georgia,
// Jordan, Chad) are still proper nouns so capitalizing them is right too.
export const PROPER_NOUNS = [
  'afghanistan', 'albania', 'america', 'angola', 'argentina', 'armenia', 'australia',
  'austria', 'bahamas', 'bahrain', 'bangladesh', 'belarus', 'belgium',
  'belize', 'benin', 'bhutan', 'bolivia', 'bosnia', 'botswana', 'brazil',
  'brunei', 'bulgaria', 'burundi', 'cambodia', 'cameroon', 'canada',
  'chad', 'chile', 'colombia', 'comoros', 'congo', 'croatia', 'cuba',
  'cyprus', 'czechia', 'denmark', 'djibouti', 'dominica', 'ecuador',
  'egypt', 'eritrea', 'estonia', 'ethiopia', 'fiji', 'finland', 'france',
  'gabon', 'gambia', 'georgia', 'germany', 'ghana', 'greece', 'grenada',
  'guatemala', 'guernsey', 'guyana', 'haiti', 'honduras', 'hungary',
  'iceland', 'india', 'indonesia', 'iran', 'iraq', 'ireland', 'israel',
  'italy', 'jamaica', 'japan', 'jordan', 'kazakhstan', 'kenya',
  'kiribati', 'kuwait', 'kyrgyzstan', 'laos', 'latvia', 'lebanon',
  'lesotho', 'liberia', 'libya', 'liechtenstein', 'lithuania',
  'luxembourg', 'madagascar', 'malawi', 'malaysia', 'maldives', 'mali',
  'malta', 'mauritania', 'mauritius', 'mexico', 'micronesia', 'moldova',
  'monaco', 'mongolia', 'montenegro', 'morocco', 'mozambique', 'myanmar',
  'namibia', 'nauru', 'nepal', 'netherlands', 'nicaragua', 'nigeria',
  'niue', 'norway', 'oman', 'pakistan', 'palau', 'panama', 'paraguay', 'peru',
  'philippines', 'poland', 'portugal', 'qatar', 'romania', 'russia',
  'rwanda', 'samoa', 'senegal', 'serbia', 'seychelles', 'singapore',
  'slovakia', 'slovenia', 'somalia', 'spain', 'sudan', 'suriname',
  'sweden', 'switzerland', 'syria', 'taiwan', 'tajikistan', 'tanzania',
  'thailand', 'timor', 'togo', 'tonga', 'tunisia', 'turkmenistan',
  'tuvalu', 'uganda', 'ukraine', 'uruguay', 'uzbekistan', 'vanuatu',
  'vatican', 'venezuela', 'vietnam', 'yemen', 'zambia', 'zimbabwe',
  'eswatini',
  // languages and demonyms are always proper
  'english', 'vietnamese', 'french', 'spanish', 'german', 'chinese',
  'japanese', 'korean', 'italian', 'russian', 'thai', 'portuguese',
  'arabic', 'hindi',
  // continents and remaining proper places attested in the bank
  'africa', 'asia', 'europe', 'antarctica', 'britain',
  'england', 'scotland', 'wales', 'korea', 'turkiye',
  // territories/regions attested in the bank
  'guadeloupe', 'martinique', 'reunion', 'guam', 'aruba', 'curacao',
  'bermuda', 'greenland', 'kosovo', 'palestine', 'guinea',
];
// Acronyms that must be uppercased in full, not just initial-capped.
const PROPER_ACRONYMS = new Set(['uae', 'usa', 'uk', 'un', 'nato', 'eu', 'pe']);
// Multi-word proper names must be handled before single words so that
// e.g. "vatican city" -> "Vatican City" not "Vatican city".
const PROPER_PHRASES = [
  'vatican city', 'british indian ocean territory', 'south africa',
  'new zealand', 'sri lanka', 'costa rica', 'san marino', 'saudi arabia',
  'south korea', 'north korea', 'united states', 'united kingdom',
  'el salvador', 'sierra leone', 'ivory coast', 'dominican republic',
  'hong kong', 'puerto rico', 'cape verde', 'burkina faso', 'east timor',
  'equatorial guinea', 'papua new guinea', 'trinidad and tobago',
  'antigua and barbuda', 'bosnia and herzegovina', 'czech republic',
  'south sudan', 'central african republic', 'united arab emirates',
  'solomon islands', 'marshall islands', 'saint lucia', 'timor leste',
  'guinea bissau',
];
const PHRASE_RE = new RegExp(`\\b(${PROPER_PHRASES.join('|')})\\b`, 'g');
const PROPER_RE = new RegExp(`\\b(${PROPER_NOUNS.join('|')})\\b`, 'g');
// Acronyms are matched with explicit non-letter boundaries so Vietnamese
// words like 'đun' (đ + un) or phoneme strings like '/uk/' cannot be
// corrupted - ASCII \b treats 'đ' as a non-word character.
const ACRONYM_RE = new RegExp(
  `(?<![A-Za-zÀ-ỹ])(${[...PROPER_ACRONYMS].join('|')})(?![A-Za-zÀ-ỹ])`, 'g');
export function fixProperCase(text, { acronyms = true } = {}) {
  if (typeof text !== 'string' || !text) return text;
  const out = text
    .replace(PHRASE_RE, (w) => w.split(' ').map((p) => (p === 'and' || p === 'of' || p === 'the' ? p : p[0].toUpperCase() + p.slice(1))).join(' '))
    .replace(PROPER_RE, (w) => w[0].toUpperCase() + w.slice(1));
  return acronyms ? out.replace(ACRONYM_RE, (w) => w.toUpperCase()) : out;
}

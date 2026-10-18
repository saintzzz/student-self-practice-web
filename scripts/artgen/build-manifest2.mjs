#!/usr/bin/env node
/**
 * Mass-regen manifest builder - emits manifest2.mjs covering EVERY
 * rendered-symbol raster still in the bank, so the whole image set
 * becomes ChatGPT bespoke art (not just the worst 55).
 *
 * Filename grammar:
 *   concepts/{concept-{name}-{hash}.webp}        -> subject = {name}
 *   counting/{g}/count-{g}-{name}-{n}-{hash}.webp -> "n cute {name}s"
 *   v3/science/{g}/v3-sci-{g}-{name}-{hash}.webp -> scene = {name}
 *
 * The generated id equals the source stem, and resize2 writes back to
 * the EXACT same path - bank asset rows stay valid with zero migration.
 */
import { readdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const IMG = join(HERE, '..', '..', 'public', 'images');

const STYLE = `Flat vector children's illustration sticker, bold rounded shapes, soft inner highlight and gentle drop shadow (soft-3D toy look), bright friendly candy colors, centered single composition on a pure white background, no text, no letters, no watermark. Kawaii-cute style for a Vietnamese kids English-learning app, ages 6-11.`;

/* Names where the bare English word misleads the image model. Value =
 * disambiguating phrase appended to the subject. Derived from the emoji
 * source semantics of each concept. */
const SUBJECT_HINT = {
  'watch': 'wristwatch on a wrist',
  'bat': 'brown bat animal flying',
  'cricket': 'cricket insect',
  'seal': 'seal sea animal',
  'crane': 'crane bird',
  'bark': 'tree bark texture piece',
  'fan': 'electric fan',
  'pan': 'frying pan',
  'orange': 'orange fruit',
  'date': 'calendar date page',
  'spring': 'metal coil spring',
  'match': 'lit matchstick',
  'letter': 'paper letter envelope',
  'park': 'playground park scene',
  'train': 'toy train locomotive',
  'nut': 'brown nut with shell',
  'palm': 'palm tree',
  'can': 'soda can',
  'fly': 'housefly insect',
  'right': 'green check mark arrow pointing right',
  'second': 'clock showing seconds',
  'ice': 'ice cube',
  'jam': 'jar of strawberry jam',
  'bowl': 'bowl of food',
  'ship': 'sailing ship boat',
  'duck': 'yellow duck',
  'fall': 'autumn falling leaves',
  'rose': 'red rose flower',
  'ruler': 'wooden ruler',
  'saw': 'hand saw tool',
  'drill': 'power drill tool',
  'plane': 'airplane',
  'wave': 'ocean wave',
  'cloud': 'fluffy white cloud',
  'rain': 'rain cloud with drops',
  'wind': 'swirling wind lines',
  'snow': 'snowflake',
  'storm': 'storm cloud with lightning',
  'bow': 'bow and arrow',
  'tie': 'necktie',
  'ring': 'golden ring with gem',
  'bell': 'golden bell',
  'map': 'treasure map',
  'flag': 'waving flag',
  'pin': 'red push pin',
  'key': 'golden key',
  'lock': 'padlock',
  'hook': 'fishing hook',
  'card': 'playing card',
  'coin': 'gold coin',
  'bill': 'paper money bill',
  'note': 'music note',
  'light': 'glowing light bulb',
  'mouse': 'grey mouse animal',
  'hamster': 'cute hamster',
  'chick': 'yellow baby chick',
  'calf': 'baby cow calf',
  'bull': 'brown bull',
  'ram': 'curly-horned ram sheep',
  'ant': 'red ant insect',
  'bug': 'ladybug beetle',
  'worm': 'green earthworm',
  'moth': 'brown moth',
  'lizard': 'green lizard',
  'frog': 'green frog',
  'toad': 'brown toad',
  'eel': 'long eel fish',
  'ray': 'stingray',
  'squid': 'purple squid',
  'shrimp': 'pink shrimp',
  'crab': 'red crab',
  'lobster': 'red lobster',
  'snail': 'garden snail with shell',
  'bathtub': 'bubble bathtub',
  'bed': 'bed with pillow and blanket',
  'bath': 'bubble bath',
  'shower': 'shower head with water drops',
  'razor': 'safety razor',
  'soap': 'bar of soap with bubbles',
  'sponge': 'yellow sponge with bubbles',
  'broom': 'straw broom',
  'basket': 'wicker basket',
  'box': 'cardboard box',
  'bag': 'shopping bag',
  'cup': 'drinking cup',
  'mug': 'coffee mug',
  'glass': 'glass of water',
  'plate': 'dinner plate',
  'fork': 'fork utensil',
  'knife': 'table knife',
  'spoon': 'spoon utensil',
  'chopsticks': 'pair of chopsticks',
  'pot': 'cooking pot',
  'kettle': 'whistling kettle',
  'stove': 'gas stove burner',
  'oven': 'kitchen oven',
  'fridge': 'refrigerator',
  'sink': 'kitchen sink with faucet',
  'toilet': 'white toilet',
  'sofa': 'comfy sofa couch',
  'chair': 'wooden chair',
  'table': 'wooden table',
  'desk': 'school desk',
  'lamp': 'desk lamp',
  'clock': 'wall clock',
  'tv': 'television',
  'computer': 'desktop computer',
  'phone': 'smartphone',
  'camera': 'photo camera',
  'radio': 'radio',
  'guitar': 'acoustic guitar',
  'piano': 'grand piano',
  'drum': 'toy drum with sticks',
  'trumpet': 'brass trumpet',
  'violin': 'violin with bow',
  'flute': 'silver flute',
  'book': 'open storybook',
  'notebook': 'spiral notebook',
  'pencil': 'yellow pencil',
  'pen': 'blue ballpoint pen',
  'crayon': 'red crayon',
  'brush': 'paint brush',
  'ruler2': 'ruler',
  'scissors': 'safety scissors',
  'glue': 'glue stick',
  'backpack': 'school backpack',
  'cap': 'baseball cap',
  'hat': 'sun hat',
  'shirt': 't-shirt',
  'dress': 'pretty dress',
  'skirt': 'pleated skirt',
  'pants': 'blue pants',
  'shorts': 'khaki shorts',
  'socks': 'striped socks',
  'shoes': 'sneakers pair',
  'boots': 'rain boots',
  'sandals': 'summer sandals',
  'gloves': 'winter gloves',
  'scarf': 'knitted scarf',
  'jacket': 'warm jacket',
  'coat': 'winter coat',
  'sweater': 'knitted sweater',
  'pajamas': 'pajama set',
  'uniform': 'school uniform',
  'apron': 'kitchen apron',
  'ball': 'colorful ball',
  'doll': 'rag doll',
  'kite': 'diamond kite with tail',
  'yo-yo': 'red yo-yo',
  'yoyo': 'red yo-yo',
  'puzzle': 'jigsaw puzzle piece',
  'blocks': 'alphabet toy blocks',
  'swing': 'playground swing',
  'slide': 'playground slide',
  'seesaw': 'playground seesaw',
  'carousel': 'merry-go-round carousel',
  'tent': 'camping tent',
  'castle': 'fairy-tale castle',
  'house': 'little house',
  'school': 'school building',
  'hospital': 'hospital building',
  'shop': 'little shop storefront',
  'store': 'little store',
  'bank': 'bank building',
  'farm': 'farm with barn',
  'garden': 'flower garden',
  'zoo': 'zoo entrance gate',
  'beach': 'sandy beach with umbrella',
  'mountain': 'green mountain',
  'river': 'flowing river',
  'lake': 'calm lake',
  'sea': 'blue sea',
  'ocean': 'ocean waves',
  'forest': 'green forest',
  'jungle': 'tropical jungle',
  'desert': 'sandy desert with cactus',
  'island': 'tropical island',
  'volcano': 'volcano',
  'bridge': 'stone bridge',
  'road': 'curved road',
  'street': 'city street',
  'city': 'city skyline',
  'village': 'small village',
  'church': 'little church',
  'temple': 'pagoda temple',
  'mosque': 'mosque',
  'rocket': 'space rocket',
  'ufo': 'flying saucer UFO',
  'alien': 'friendly green alien',
  'robot': 'friendly robot',
  'ghost': 'friendly white ghost',
  'monster': 'friendly purple monster',
  'dragon': 'friendly green dragon',
  'unicorn': 'white unicorn with rainbow mane',
  'mermaid': 'friendly mermaid',
  'fairy': 'flower fairy with wings',
  'wizard': 'friendly wizard with hat',
  'witch': 'friendly witch on broom',
  'pirate': 'friendly pirate with hat',
  'knight': 'brave knight with sword',
  'princess': 'kind princess in gown',
  'prince': 'kind prince',
  'king': 'kind king with crown',
  'queen': 'kind queen with crown',
  'superhero': 'kid superhero with cape',
};

const entries = [];
const push = (id, dir, prompt, out, size = 512, q = 85) =>
  entries.push({ id, dir, prompt, out, size, q });

/* ---- concepts ---- */
const REGEN = new Set(JSON.parse(
  readdirSync === null ? '[]' : '[]',
));
const regenerated = new Set(
  JSON.parse(
    (await import('node:fs')).readFileSync(
      join(HERE, '..', '..', 'public', 'attribution.json'), 'utf8'),
  )
    .collections.find((c) => c.id === 'chatgpt-regenerated-concepts')
    .paths.map((p) => p.split('/').pop().replace(/\.webp$/, '')),
);

for (const f of readdirSync(join(IMG, 'concepts'))) {
  if (!f.endsWith('.webp')) continue;
  const stem = f.replace(/\.webp$/, '');
  if (regenerated.has(stem)) continue;
  const name = stem.replace(/^concept-/, '').replace(/-[0-9a-f]{6}$/, '');
  const hint = SUBJECT_HINT[name];
  const subject = hint ?? `a cute ${name.replace(/-/g, ' ')}`;
  push(stem, 'concepts', `${STYLE} ${hint ? `A cute ${hint}` : subject[0].toUpperCase() + subject.slice(1)}, full view.`, `concepts/${f}`);
}

/* ---- counting (N objects) ---- */
const NUM_WORD = { 1: 'one', 2: 'two', 3: 'three', 4: 'four', 5: 'five' };
for (const g of readdirSync(join(IMG, 'counting'))) {
  const gd = join(IMG, 'counting', g);
  for (const f of readdirSync(gd)) {
    if (!f.endsWith('.webp')) continue;
    const stem = f.replace(/\.webp$/, '');
    const m = stem.match(/^count-(g\d)-(.+)-(\d)-[0-9a-f]{6}$/);
    if (!m) { console.log('UNPARSED', f); continue; }
    const [, , name, n] = m;
    const subject = (SUBJECT_HINT[name] ?? `${name.replace(/-/g, ' ')}`);
    const plural = NUM_WORD[n] ?? n;
    push(stem, 'counting', `${STYLE} Exactly ${plural} cute ${subject}s arranged in a neat group for a counting exercise, clearly separated, easy to count, same style repeated.`, `counting/${g}/${f}`);
  }
}

/* ---- v3 science scenes ---- */
for (const g of readdirSync(join(IMG, 'v3', 'science'))) {
  const gd = join(IMG, 'v3', 'science', g);
  for (const f of readdirSync(gd)) {
    if (!f.endsWith('.webp')) continue;
    const stem = f.replace(/\.webp$/, '');
    const name = stem.replace(/^v3-sci-g\d-/, '').replace(/-[0-9a-f]{6}$/, '');
    push(stem, 'v3', `${STYLE} A children's science illustration showing "${name.replace(/-/g, ' ')}" for a Vietnamese primary school lesson, clear and friendly.`, `v3/science/${g}/${f}`);
  }
}

const out = `// AUTO-GENERATED by build-manifest2.mjs - mass regen batch (rendered-symbol -> bespoke).\nexport const ASSETS = ${JSON.stringify(entries, null, 2)};\n`;
writeFileSync(join(HERE, 'manifest2.mjs'), out);
console.log(`manifest2: ${entries.length} assets (${entries.filter(e=>e.dir==='concepts').length} concepts, ${entries.filter(e=>e.dir==='counting').length} counting, ${entries.filter(e=>e.dir==='v3').length} v3)`);

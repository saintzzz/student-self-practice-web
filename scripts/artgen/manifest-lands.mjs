// Land scene banners + hub tile emblems - replaces flat SVG LandScene
// strips / emoji watermarks with bespoke ChatGPT art (CR land-art pass).
// Scene style MUST match the existing generated mascot/sticker art:
// soft-3D storybook illustration, warm dusk light so it blends with the
// app's navy night shell. Wide panoramic composition inside square
// canvas (object-cover crops the strip).
const SCENE = 'Children storybook background illustration, soft-3D painterly style with rounded toy-like shapes and gentle volumetric lighting, warm golden dusk light near the horizon fading into deep indigo-blue evening sky above with a few early stars, no text, no letters, no watermark, no characters, no people, wide panoramic landscape composition with clear open sky at the top and detailed ground at the bottom, for a Vietnamese kids English-learning app.';

const SCENES = [
  { id: 'land-sky', dir: 'lands', size: 1024, q: 88, out: 'lands/land-sky.webp',
    prompt: `${SCENE} Scene: a soft green flower meadow with big fluffy white clouds floating low, a warm golden glow on the horizon.` },
  { id: 'land-playground', dir: 'lands', size: 1024, q: 88, out: 'lands/land-playground.webp',
    prompt: `${SCENE} Scene: a cheerful playground on a green lawn - a wooden swing set, a small blue slide, a red ball on the grass, daisy flowers.` },
  { id: 'land-town', dir: 'lands', size: 1024, q: 88, out: 'lands/land-town.webp',
    prompt: `${SCENE} Scene: a cute Vietnamese village street - small colorful houses with tiled roofs along a curving road, round green trees, warm windows glowing.` },
  { id: 'land-jungle', dir: 'lands', size: 1024, q: 88, out: 'lands/land-jungle.webp',
    prompt: `${SCENE} Scene: a lush jungle clearing - big tropical leaves and hanging vines, a toucan on a branch, bright jungle flowers, soft mist.` },
  { id: 'land-city', dir: 'lands', size: 1024, q: 88, out: 'lands/land-city.webp',
    prompt: `${SCENE} Scene: a friendly city skyline at dusk - rounded navy towers with warm amber windows, a small red bus on the road, street lamps glowing.` },
  { id: 'land-space', dir: 'lands', size: 1024, q: 88, out: 'lands/land-space.webp',
    prompt: `${SCENE} Scene: a moon surface adventure - gray craters, a small white rocket ship with red fins standing on the ground, colorful planets and stars in the deep sky.` },
  { id: 'land-brand', dir: 'lands', size: 1024, q: 88, out: 'lands/land-brand.webp',
    prompt: `${SCENE} Scene: a magical night journey - layered navy hills under a starry sky, a winding golden dotted trail with tiny glowing lanterns and pennant flags leading toward a distant golden horizon.` },
];

const EMBLEMS = [
  { id: 'emblem-learn', dir: 'emblems', size: 512, q: 85, out: 'emblems/emblem-learn.webp',
    prompt: `Flat vector children's illustration sticker, bold rounded shapes, soft inner highlight and gentle drop shadow (soft-3D toy look), bright friendly candy colors, centered single composition on a pure white background, no text, no letters, no watermark. Kawaii-cute style for a Vietnamese kids English-learning app, ages 6-11. An open storybook with letter blocks and a pencil.` },
  { id: 'emblem-math', dir: 'emblems', size: 512, q: 85, out: 'emblems/emblem-math.webp',
    prompt: `Flat vector children's illustration sticker, bold rounded shapes, soft inner highlight and gentle drop shadow (soft-3D toy look), bright friendly candy colors, centered single composition on a pure white background, no text, no letters, no watermark. Kawaii-cute style for a Vietnamese kids English-learning app, ages 6-11. Cute colorful toy number blocks stacked in a small pile.` },
  { id: 'emblem-science', dir: 'emblems', size: 512, q: 85, out: 'emblems/emblem-science.webp',
    prompt: `Flat vector children's illustration sticker, bold rounded shapes, soft inner highlight and gentle drop shadow (soft-3D toy look), bright friendly candy colors, centered single composition on a pure white background, no text, no letters, no watermark. Kawaii-cute style for a Vietnamese kids English-learning app, ages 6-11. A cute laboratory flask with bubbling green potion and tiny stars.` },
  { id: 'emblem-review', dir: 'emblems', size: 512, q: 85, out: 'emblems/emblem-review.webp',
    prompt: `Flat vector children's illustration sticker, bold rounded shapes, soft inner highlight and gentle drop shadow (soft-3D toy look), bright friendly candy colors, centered single composition on a pure white background, no text, no letters, no watermark. Kawaii-cute style for a Vietnamese kids English-learning app, ages 6-11. A cute pink brain lifting a tiny dumbbell, training hard.` },
  { id: 'emblem-arena', dir: 'emblems', size: 512, q: 85, out: 'emblems/emblem-arena.webp',
    prompt: `Flat vector children's illustration sticker, bold rounded shapes, soft inner highlight and gentle drop shadow (soft-3D toy look), bright friendly candy colors, centered single composition on a pure white background, no text, no letters, no watermark. Kawaii-cute style for a Vietnamese kids English-learning app, ages 6-11. Two crossed wooden toy swords with a small golden trophy behind.` },
  { id: 'emblem-games', dir: 'emblems', size: 512, q: 85, out: 'emblems/emblem-games.webp',
    prompt: `Flat vector children's illustration sticker, bold rounded shapes, soft inner highlight and gentle drop shadow (soft-3D toy look), bright friendly candy colors, centered single composition on a pure white background, no text, no letters, no watermark. Kawaii-cute style for a Vietnamese kids English-learning app, ages 6-11. A cute handheld game console with a joystick and colorful buttons.` },
  { id: 'emblem-reward', dir: 'emblems', size: 512, q: 85, out: 'emblems/emblem-reward.webp',
    prompt: `Flat vector children's illustration sticker, bold rounded shapes, soft inner highlight and gentle drop shadow (soft-3D toy look), bright friendly candy colors, centered single composition on a pure white background, no text, no letters, no watermark. Kawaii-cute style for a Vietnamese kids English-learning app, ages 6-11. A cute treasure chest overflowing with gold stars and a tiny key.` },
];
export const ASSETS = [...SCENES, ...EMBLEMS];

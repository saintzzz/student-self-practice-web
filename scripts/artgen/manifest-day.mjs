// CR-116: DAY-tone land scenes. Same soft-3D storybook render + wide
// panoramic-in-square composition as manifest-lands.mjs, but bright
// midday light (sunny blue sky) instead of golden dusk. `land-map-day`
// is the journey-map hero; `land-*-day` feed postcard headers at tone=day.
const SCENE_DAY = 'Children storybook background illustration, soft-3D painterly style with rounded toy-like shapes and gentle volumetric lighting, bright cheerful midday light, clear sunny blue sky with fluffy white clouds above, vivid saturated colors, no text, no letters, no watermark, no characters, no people, wide panoramic landscape composition with clear open sky at the top and detailed ground at the bottom, for a Vietnamese kids English-learning app.';

export const ASSETS = [
  { id: 'land-map-day', dir: 'lands', size: 1024, q: 88, out: 'lands/land-map-day.webp',
    prompt: `${SCENE_DAY} Scene: a magical adventure world map from a high viewpoint - rolling bright green meadows, a winding golden dotted path zigzagging from the foreground toward the horizon, passing a tiny playground with a swing and slide, a small colorful village with tiled roofs, a lush green jungle corner, a distant friendly city skyline, and a small white rocket on a far hill. Colorful pennant flags on little posts along the path.` },
  { id: 'land-playground-day', dir: 'lands', size: 1024, q: 88, out: 'lands/land-playground-day.webp',
    prompt: `${SCENE_DAY} Scene: a cheerful playground on a green lawn - a wooden swing set, a small blue slide, a red ball on the grass, daisy flowers, bright warm sunshine.` },
  { id: 'land-town-day', dir: 'lands', size: 1024, q: 88, out: 'lands/land-town-day.webp',
    prompt: `${SCENE_DAY} Scene: a cute Vietnamese village street in daylight - small colorful houses with tiled roofs along a curving road, round green trees, potted flowers.` },
  { id: 'land-jungle-day', dir: 'lands', size: 1024, q: 88, out: 'lands/land-jungle-day.webp',
    prompt: `${SCENE_DAY} Scene: a lush jungle clearing in daylight - big tropical leaves and hanging vines, a colorful toucan on a branch, bright jungle flowers, sun rays through the canopy.` },
  { id: 'land-city-day', dir: 'lands', size: 1024, q: 88, out: 'lands/land-city-day.webp',
    prompt: `${SCENE_DAY} Scene: a friendly city skyline in daylight - rounded colorful towers with bright windows, a small red bus on the road, green trees along the street.` },
  { id: 'land-space-day', dir: 'lands', size: 1024, q: 88, out: 'lands/land-space-day.webp',
    prompt: `${SCENE_DAY} Scene: a cheerful space adventure filling the ENTIRE frame - a cute white rocket ship with red fins standing on a friendly light-grey moon surface with soft craters in the foreground, and a deep blue sky filled with big colorful planets, a ringed Saturn, and sparkling stars above. No green grass, no trees, no flowers, no village, no houses, no roads - the whole scene is moon surface and space sky.` },
];

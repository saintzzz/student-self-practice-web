// CR-116 fix: land-space-day v1 rendered a world-map composite (village +
// meadow) instead of a space scene - regen with explicit exclusions.
const SCENE_DAY = 'Children storybook background illustration, soft-3D painterly style with rounded toy-like shapes and gentle volumetric lighting, bright cheerful midday light, vivid saturated colors, no text, no letters, no watermark, no characters, no people, wide panoramic landscape composition, for a Vietnamese kids English-learning app.';
export const ASSETS = [
  { id: 'land-space-day', dir: 'lands', size: 1024, q: 88, out: 'lands/land-space-day.webp',
    prompt: `${SCENE_DAY} Scene: a cheerful space adventure filling the ENTIRE frame - a cute white rocket ship with red fins standing on a friendly light-grey moon surface with soft craters in the foreground, and a deep blue sky filled with big colorful planets, a ringed Saturn, and sparkling stars above. No green grass, no trees, no flowers, no village, no houses, no roads - the whole scene is moon surface and space sky.` },
];

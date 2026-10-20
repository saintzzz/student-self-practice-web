// FIX manifest round 2 - 7 manifest-fixes entries that were NOT regenerated
// in the 38-asset wave (wip/handoff-2026-10-20-artgen). Same contract as
// manifest-fixes.mjs: prompts name the intended meaning explicitly AND
// forbid the wrong subject. Run: node scripts/artgen/run.mjs --manifest=manifest-fixes-r2.mjs
const STYLE = 'Flat vector children\'s illustration sticker, bold rounded shapes, soft inner highlight and gentle drop shadow (soft-3D toy look), bright friendly candy colors, centered single composition on a pure white background, no text, no letters, no watermark. Kawaii-cute style for a Vietnamese kids English-learning app, ages 6-11.';
const C = 'concepts';
const e = (id, what, not) => ({ id, dir: C, out: `concepts/${id}.webp`, prompt: `${STYLE} ${what} IMPORTANT: the English word means exactly this - no other subject. ${not ? `Do NOT depict: ${not}.` : ''}` });

export const ASSETS = [
  e('concept-gabon-505693', 'The country Gabon: map outline with the Gabon flag (green yellow blue stripes).', 'only an antelope'),
  e('concept-romania-4c5f6a', 'The country Romania: map outline with the Romania flag (blue yellow red vertical stripes).', 'only a girl in folk dress'),
  e('concept-russia-66146c', 'The country Russia: map outline with the Russia flag (white blue red stripes).', 'only a girl in folk dress'),
  e('concept-rwanda-3acbe0', 'The country Rwanda: map outline with the Rwanda flag (blue yellow green with a sun).', 'only a gorilla'),
  e('concept-senegal-82ea0d', 'The country Senegal: map outline with the Senegal flag (green yellow red with a star).', 'only a parrot'),
  e('concept-serbia-f646d0', 'The country Serbia: map outline with the Serbia flag (red blue white with crest).', 'only a girl holding a flag'),
  e('concept-s-o-tom-and-pr-ncipe-5286a2', 'The country Sao Tome and Principe: two-island map with its flag (green yellow with black stars).', 'generic kids in a garden'),
];

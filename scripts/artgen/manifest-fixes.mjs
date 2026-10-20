// FIX manifest - regenerate concepts whose first bespoke pass drew the
// WRONG subject (homophone/polyseme confusion, collages, puns that
// broke the Vietnamese meaning). Prompts name the intended meaning
// explicitly AND forbid the wrong subject. Overwrites the restored
// emoji-render webps (same filenames keep bank rows valid).
const STYLE = 'Flat vector children\'s illustration sticker, bold rounded shapes, soft inner highlight and gentle drop shadow (soft-3D toy look), bright friendly candy colors, centered single composition on a pure white background, no text, no letters, no watermark. Kawaii-cute style for a Vietnamese kids English-learning app, ages 6-11.';
const C = 'concepts';
const e = (id, what, not) => ({ id, dir: C, out: `concepts/${id}.webp`, prompt: `${STYLE} ${what} IMPORTANT: the English word means exactly this - no other subject. ${not ? `Do NOT depict: ${not}.` : ''}` });

export const ASSETS = [
  // -- confirmed wrong-subject (restored to emoji render; need bespoke) --
  e('concept-sale-14bb98', 'A big red circular discount badge with a bold % percent starburst, price tag dangling, shopping sale signage.', 'animals, sea creatures, seals'),
  e('concept-seal-7f0a12', 'A cute grey seal (the sea animal) balancing a red ball on its nose, whiskers and flippers.', 'sale signs, bags, people, musical instruments'),
  e('concept-hot-f8a394', 'A steaming red chilli pepper and a sweating sun with a thermometer showing high temperature - the feeling of hot.', 'people, school children'),
  e('concept-cool-73c396', 'A confident sunglasses-wearing star character giving thumbs up - the meaning is "cool" (awesome).', 'dogs, plain children'),
  e('concept-disco-ball-e107e4', 'A shiny mirror disco ball covered in square mirrors hanging from a string, colored light sparkles.', 'desert, cactus, sun'),
  e('concept-draw-e707cf', 'A child hand holding a big crayon drawing a rainbow picture on paper - the action of drawing.', 'theater, stage, masks'),
  e('concept-fiji-6828e3', 'The island country Fiji: tropical island map outline with the Fiji flag and a palm tree, ocean around.', 'a person blowing'),
  e('concept-flat-ad000a', 'A cute apartment building block seen from outside with windows and a door - a flat (apartment) home.', 'a girl with books'),
  e('concept-herb-1fc486', 'Fresh green herb leaves - basil and mint sprigs in a small bundle.', 'a helmet, sports gear'),
  e('concept-horse-f31748', 'A cute brown horse with a flowing mane standing, full body.', 'a fishing hook, metal objects'),
  e('concept-horse-racing-e7f019', 'A jockey riding a galloping race horse on a track with a tiny checkered flag - the sport horse racing.', 'a fishing hook'),
  e('concept-hungary-42fd55', 'The country Hungary: map outline wearing the red-white-green Hungarian flag colors with a cute face.', 'animals hugging, pets'),
  e('concept-ice-67dfb3', 'Sparkling translucent ice cubes in a glass, frost sparkles - frozen water ice.', 'a girl hugging a dog'),
  e('concept-invisible-ca2616', 'A faded semi-transparent ghost-like smiling character with dotted outline - the idea of invisible/see-through.', 'a normal solid girl, backpack'),
  e('concept-jamaica-d440f9', 'The country Jamaica: island map outline with the Jamaican flag (green yellow black) and a tiny palm.', 'a hibiscus flower creature'),
  e('concept-jersey-ba0975', 'The island of Jersey: island map with the Jersey flag (red saltire cross) and a small cow.', 'a sports shirt'),
  e('concept-knot-ab03c3', 'A rope tied in a cute knot, ends sticking out - a tied knot.', 'a kiwi fruit'),
  e('concept-pe-fcb022', 'PE physical education class: a kid in sportswear doing jumping jacks with a whistle and a ball.', 'a peacock, birds'),
  e('concept-pin-18e0a8', 'A big red pushpin thumbtack standing upright with a soft shadow.', 'a pig, animals'),
  e('concept-pudding-2d3110', 'A wobbly caramel flan pudding on a small plate with syrup - the dessert pudding.', 'a prohibition sign'),
  e('concept-puerto-rico-57e08e', 'The territory Puerto Rico: island map with the Puerto Rico flag (red and white stripes, blue triangle, star).', 'a prohibition sign'),
  e('concept-shell-79cc60', 'A spiral seashell with ridges on a tiny patch of sand - a sea shell.', 'a sheep, wool animals'),
  e('concept-shield-73d392', 'A knight shield with a star emblem, metal rim - a protective shield.', 'a sheep, wool animals'),
  e('concept-scream-4d1a20', 'A surprised kid face with wide open mouth screaming, hands on cheeks - screaming.', 'Scotland, bagpipes, cows, castles'),
  e('concept-relieved-61947e', 'A relieved smiling face wiping sweat off its brow with a small towel - feeling relieved.', 'a crab, sea animals'),
  e('concept-disk-9fd315', 'A classic blue floppy disk with metal shutter - a computer disk.', 'a coin, money'),
  e('concept-cyprus-0b6e5f', 'The country Cyprus: island map outline with the Cyprus flag (white with orange map and olive branches).', 'a cypress tree'),
  // -- punny countries that confuse quizzes: force map+flag treatment --
  e('concept-panama-b489ad', 'The country Panama: map outline with the Panama flag and a small canal ship.', 'only a hat'),
  e('concept-djibouti-826a1f', 'The country Djibouti: map outline with the Djibouti flag and a tiny horn-of-Africa shape.', 'only an antelope'),
  e('concept-gabon-505693', 'The country Gabon: map outline with the Gabon flag (green yellow blue stripes).', 'only an antelope'),
  e('concept-guadeloupe-2451e8', 'The islands of Guadeloupe: butterfly-shaped island map with the Caribbean sea.', 'only a melon fruit'),
  e('concept-equatorial-guinea-01fbdc', 'The country Equatorial Guinea: map outline with its flag (green white red with blue triangle).', 'only a guinea pig'),
  e('concept-guinea-bissau-2562b4', 'The country Guinea-Bissau: map outline with its flag (red yellow green with black star).', 'only a guinea pig'),
  e('concept-guyana-0fe955', 'The country Guyana: map outline with its flag (green with red and gold arrows).', 'only a guinea pig'),
  // -- weak semantics worth a stricter pass --
  e('concept-orange-f02b15', 'The colour orange: a big orange paint splash blob and an orange crayon making an orange streak.', 'a fruit character'),
  e('concept-peace-sign-fa6877', 'A hand showing the two-finger V peace sign, fingers apart in a V.', 'crossed fingers'),
  e('concept-drama-055725', 'Theater drama: two classic comedy and tragedy masks with a small stage curtain.', 'a dragon costume'),
  e('concept-swimming-92d0c8', 'A kid swimming freestyle in blue water with arm forward and splash - the sport swimming.', 'a single standing swimmer'),
  e('concept-mid-autumn-festival-9566c7', 'Vietnamese Mid-Autumn Festival (Tet Trung thu): a bright full moon, red star-shaped paper lantern, round mooncakes on a plate, lion-dance vibe, festive night.', 'a microphone'),
  // -- countries shown as generic scenes; force flag+map like siblings --
  e('concept-romania-4c5f6a', 'The country Romania: map outline with the Romania flag (blue yellow red vertical stripes).', 'only a girl in folk dress'),
  e('concept-russia-66146c', 'The country Russia: map outline with the Russia flag (white blue red stripes).', 'only a girl in folk dress'),
  e('concept-rwanda-3acbe0', 'The country Rwanda: map outline with the Rwanda flag (blue yellow green with a sun).', 'only a gorilla'),
  e('concept-senegal-82ea0d', 'The country Senegal: map outline with the Senegal flag (green yellow red with a star).', 'only a parrot'),
  e('concept-serbia-f646d0', 'The country Serbia: map outline with the Serbia flag (red blue white with crest).', 'only a girl holding a flag'),
  e('concept-s-o-tom-and-pr-ncipe-5286a2', 'The country Sao Tome and Principe: two-island map with its flag (green yellow with black stars).', 'generic kids in a garden'),
];

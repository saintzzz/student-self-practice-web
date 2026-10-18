/**
 * Art-gen asset manifest - one entry per generated image.
 * `out` is the filename stem inside artgen-out/ (raw PNG before resize).
 */
const STYLE = 'Flat vector children\'s illustration sticker, bold rounded shapes, soft inner highlight and gentle drop shadow (soft-3D toy look), bright friendly candy colors, centered single composition on a pure white background, no text, no letters, no watermark. Kawaii-cute style for a Vietnamese kids English-learning app, ages 6-11.';

const TET_STYLE = 'Flat vector children\'s illustration sticker, bold rounded shapes, soft inner highlight, bright festive colors, centered single composition on a pure white background, no text, no watermark. Authentic VIETNAMESE Tet Lunar New Year style (NOT Japanese, NOT Chinese generic).';

export const ASSETS = [
  // ---- Game card art (public/images/games/{id}.webp, 320x320) ----
  { id: 'memory-match', dir: 'games', prompt: `${STYLE} A cute face-down playing card pair with a star on the back, one card flipped showing a smiling sun, small sparkles around.` },
  { id: 'balloon-pop', dir: 'games', prompt: `${STYLE} Three glossy round balloons (red, yellow, blue) with white shine highlights floating among tiny clouds, strings dangling.` },
  { id: 'racing-cars', dir: 'games', prompt: `${STYLE} A happy pink cartoon pig driving a small red race car with a checkered flag behind, motion speed lines.` },
  { id: 'fishing-catch', dir: 'games', prompt: `${STYLE} A cute orange fish looking up at a fishing hook with a worm, blue water bubbles around.` },
  { id: 'letter-catch', dir: 'games', prompt: `${STYLE} Transparent soap bubbles floating, a few bubbles containing shiny golden star shapes, rainbow reflections.` },
  { id: 'tic-tac-toe', dir: 'games', prompt: `${STYLE} A rounded tic-tac-toe board with a big red X piece and a big blue O piece as cute characters with eyes.` },
  { id: 'whack-a-mole', dir: 'games', prompt: `${STYLE} A cute brown hamster popping out of a round dirt hole, a soft wooden toy mallet beside it.` },
  { id: 'feed-the-pig', dir: 'games', prompt: `${STYLE} A happy chubby pink pig sitting next to a bowl full of apples and carrots, tongue out.` },
  { id: 'picture-reveal', dir: 'games', prompt: `${STYLE} A picture frame covered by colorful puzzle pieces, one piece lifting to reveal a rainbow inside.` },
  { id: 'treasure-chest', dir: 'games', prompt: `${STYLE} A golden treasure chest with a big keyhole, gold coins spilling out, a shiny padlock.` },
  { id: 'gold-quest', dir: 'games', prompt: `${STYLE} A mine cart full of colorful gems, a small pickaxe and a lantern, cave sparkle.` },
  { id: 'quiz-show', dir: 'games', prompt: `${STYLE} A golden trophy on a winner podium with a microphone and falling confetti stars.` },
  { id: 'maze-chase', dir: 'games', prompt: `${STYLE} A top-down cute hedge maze, a small pink pig inside, a friendly white ghost floating at the corner.` },
  { id: 'word-worm', dir: 'games', prompt: `${STYLE} A cute green bookworm worm munching a red apple, letter blocks with star symbols beside it.` },
  { id: 'castle-guard', dir: 'games', prompt: `${STYLE} A small stone castle tower with a flag, a cute purple monster approaching, a spark of magic lightning.` },

  // ---- Mascot art (public/images/mascot/*.webp + favicon) ----
  // Be Heo = the app's pig mascot. Portrait = full character; face =
  // head-only close-up used for the browser favicon at 16-48px, so the
  // brief demands an ultra-simple readable silhouette.
  { id: 'be-heo-portrait', dir: 'mascot', prompt: `${STYLE} A happy chubby pink piglet student mascot character, standing and waving one hoof, wearing a small blue backpack, big friendly eyes, round body, full body shot.` },
  { id: 'be-heo-face', dir: 'mascot', prompt: `${STYLE} HEAD ONLY close-up portrait of a cute pink piglet face: round head, two floppy ears, big smiling eyes, snout, tiny blush cheeks. Extremely simple bold silhouette, fills most of the frame, centered.` },

  // ---- Concept regen batch: people/family/emotions/body ----
  // The existing set is rasterized Twemoji (yellow emoji faces) - these
  // overwrite the same concept-*.webp filenames so bank rows stay valid.
  // Vietnamese kids should see Vietnamese-looking people, not emoji skin.
  // Professions
  { id: 'teacher', dir: 'concepts', prompt: `${STYLE} A friendly young Vietnamese female teacher with black hair in a bun, holding a pointer stick beside a small board with ABC letters, full body.` },
  { id: 'student', dir: 'concepts', prompt: `${STYLE} A happy Vietnamese school kid with a red backpack and a book, waving, full body.` },
  { id: 'doctor', dir: 'concepts', prompt: `${STYLE} A friendly Vietnamese doctor in a white coat with a stethoscope, full body.` },
  { id: 'nurse', dir: 'concepts', prompt: `${STYLE} A friendly Vietnamese nurse in a light blue uniform holding a clipboard, full body.` },
  { id: 'policeman', dir: 'concepts', prompt: `${STYLE} A friendly Vietnamese policeman in a dark blue uniform and cap saluting, full body.` },
  { id: 'policewoman', dir: 'concepts', prompt: `${STYLE} A friendly Vietnamese policewoman in a dark blue uniform and cap, smiling, full body.` },
  { id: 'farmer', dir: 'concepts', prompt: `${STYLE} A cheerful Vietnamese farmer wearing a conical non-la hat, holding a rice stalk bundle, full body.` },
  { id: 'chef', dir: 'concepts', prompt: `${STYLE} A happy chef with a tall white hat and apron holding a frying pan, full body.` },
  { id: 'cook', dir: 'concepts', prompt: `${STYLE} A cheerful cook stirring a big pot with a ladle, apron on, steam rising, full body.` },
  { id: 'factory-worker', dir: 'concepts', prompt: `${STYLE} A cheerful factory worker in an orange safety helmet and overalls holding a wrench, full body.` },
  { id: 'office-worker', dir: 'concepts', prompt: `${STYLE} A friendly office worker in a shirt and tie holding a briefcase and laptop, full body.` },
  { id: 'firefighter', dir: 'concepts', prompt: `${STYLE} A brave firefighter in a yellow helmet and red suit holding a water hose, full body.` },
  { id: 'pilot', dir: 'concepts', prompt: `${STYLE} A smart airline pilot in a navy uniform with gold stripes and cap, full body.` },
  { id: 'soldier', dir: 'concepts', prompt: `${STYLE} A friendly soldier in green uniform and cap standing at attention, full body.` },
  { id: 'artist', dir: 'concepts', prompt: `${STYLE} A cheerful artist with a colorful beret holding a paint palette and brush, full body.` },
  { id: 'singer', dir: 'concepts', prompt: `${STYLE} A joyful singer holding a microphone, musical notes around, full body.` },
  { id: 'dancer', dir: 'concepts', prompt: `${STYLE} A graceful dancer spinning with a flowing ribbon, sparkles around, full body.` },
  { id: 'basketball-player', dir: 'concepts', prompt: `${STYLE} An energetic basketball player bouncing an orange ball, jersey on, full body.` },
  { id: 'cowboy', dir: 'concepts', prompt: `${STYLE} A friendly cowboy with a brown hat, red neckerchief and lasso, full body.` },
  { id: 'merman', dir: 'concepts', prompt: `${STYLE} A cute friendly merman with a green fish tail holding a small trident, underwater bubbles.` },
  // Family
  { id: 'baby', dir: 'concepts', prompt: `${STYLE} A chubby happy baby sitting and giggling, tiny curl of hair.` },
  { id: 'aunt', dir: 'concepts', prompt: `${STYLE} A kind Vietnamese aunt smiling warmly, long hair, holding a small gift.` },
  { id: 'uncle', dir: 'concepts', prompt: `${STYLE} A cheerful Vietnamese uncle with glasses giving a thumbs up.` },
  { id: 'grandma', dir: 'concepts', prompt: `${STYLE} A sweet Vietnamese grandmother with grey hair bun and a warm smile, ao dai collar.` },
  { id: 'grandpa', dir: 'concepts', prompt: `${STYLE} A gentle Vietnamese grandfather with grey hair and kind eyes, slightly bent cane.` },
  { id: 'brother', dir: 'concepts', prompt: `${STYLE} A playful boy older brother with spiky hair flexing a tiny arm muscle.` },
  { id: 'sister', dir: 'concepts', prompt: `${STYLE} A sweet girl big sister with pigtails holding a storybook.` },
  { id: 'cousin', dir: 'concepts', prompt: `${STYLE} A cheerful kid waving hello, cap backwards.` },
  { id: 'friend', dir: 'concepts', prompt: `${STYLE} Two happy kids high-fiving, big smiles.` },
  { id: 'person', dir: 'concepts', prompt: `${STYLE} A generic cheerful person standing and smiling, arms relaxed.` },
  { id: 'wheelchair', dir: 'concepts', prompt: `${STYLE} A smiling kid in a colorful wheelchair rolling happily.` },
  { id: 'snowman', dir: 'concepts', prompt: `${STYLE} A cute snowman with a carrot nose, red scarf and twig arms.` },
  { id: 'children-crossing-sign', dir: 'concepts', prompt: `${STYLE} A yellow triangular road sign showing two kids crossing, bold border.` },
  // Emotions - a kid's expressive face, NOT an emoji
  { id: 'amazed', dir: 'concepts', prompt: `${STYLE} A cute kid face looking amazed, wide sparkling eyes and open mouth wonder.` },
  { id: 'angry', dir: 'concepts', prompt: `${STYLE} A cute kid face looking angry, puffed cheeks and furrowed brows, steam puff.` },
  { id: 'annoyed', dir: 'concepts', prompt: `${STYLE} A cute kid face looking annoyed, one raised eyebrow and frown.` },
  { id: 'cry', dir: 'concepts', prompt: `${STYLE} A cute kid face crying with big teardrops, wobbly mouth.` },
  { id: 'happy', dir: 'concepts', prompt: `${STYLE} A cute kid face beaming a huge joyful smile, rosy cheeks.` },
  { id: 'headache', dir: 'concepts', prompt: `${STYLE} A cute kid holding their head with a dizzy spiral and pain lines.` },
  { id: 'laugh', dir: 'concepts', prompt: `${STYLE} A cute kid laughing hard with closed happy eyes and open mouth.` },
  { id: 'proud', dir: 'concepts', prompt: `${STYLE} A cute kid face looking proud and smug, chin up, tiny smirk.` },
  { id: 'sad', dir: 'concepts', prompt: `${STYLE} A cute kid face looking sad, droopy eyes and small frown.` },
  { id: 'scared', dir: 'concepts', prompt: `${STYLE} A cute kid face looking scared, trembling with raised hands.` },
  { id: 'surprised', dir: 'concepts', prompt: `${STYLE} A cute kid face looking surprised, hands on cheeks, round O mouth.` },
  { id: 'tired', dir: 'concepts', prompt: `${STYLE} A cute sleepy kid yawning with droopy eyes, small Zzz bubble.` },
  // Body parts
  { id: 'ear', dir: 'concepts', prompt: `${STYLE} A single cute cartoon ear with a small sound wave curve.` },
  { id: 'eye', dir: 'concepts', prompt: `${STYLE} A single big friendly cartoon eye with a sparkle.` },
  { id: 'foot', dir: 'concepts', prompt: `${STYLE} A cute cartoon foot stepping forward, motion line.` },
  { id: 'footprints', dir: 'concepts', prompt: `${STYLE} Two cute cartoon footprints trailing diagonally.` },
  { id: 'finger-heart', dir: 'concepts', prompt: `${STYLE} A cute cartoon hand making a Korean finger-heart sign with a tiny floating heart.` },
  { id: 'hair', dir: 'concepts', prompt: `${STYLE} A swatch of glossy black cartoon hair flowing in a wave.` },
  { id: 'hand', dir: 'concepts', prompt: `${STYLE} A cute open cartoon hand waving hello.` },
  { id: 'handshake', dir: 'concepts', prompt: `${STYLE} Two cute cartoon hands shaking firmly with a friendly spark.` },
  { id: 'head', dir: 'concepts', prompt: `${STYLE} A cute cartoon kid head and shoulders, smiling.` },
  { id: 'hearing-aid', dir: 'concepts', prompt: `${STYLE} A cute cartoon ear wearing a small blue hearing aid.` },
  { id: 'mouth', dir: 'concepts', prompt: `${STYLE} A cute cartoon mouth smiling showing a happy curve.` },
  { id: 'nose', dir: 'concepts', prompt: `${STYLE} A cute cartoon nose in profile.` },

  // ---- Tet vocab art (public/images/vocab/{id}.webp, 256x256) ----
  { id: 'festival', dir: 'vocab', prompt: `${TET_STYLE} Vietnamese Tet festival scene icon: colorful five-color festival flags (co ngu sac, triangular flags in red yellow green purple) strung above a small temple gate silhouette with curved roof, red lanterns.` },
  { id: 'apricot-blossom', dir: 'vocab', prompt: `${TET_STYLE} Vietnamese hoa mai - a branch of YELLOW apricot blossoms with five round petals each, brown branch, the traditional Tet flower of southern Vietnam.` },
  { id: 'dragon-dance', dir: 'vocab', prompt: `${TET_STYLE} Vietnamese lion-dragon dance head (mua lan su rong) - a colorful paper-mache costume head in red green and gold with big eyes and open mouth.` },
];

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

  // ---- Tet vocab art (public/images/vocab/{id}.webp, 256x256) ----
  { id: 'festival', dir: 'vocab', prompt: `${TET_STYLE} Vietnamese Tet festival scene icon: colorful five-color festival flags (co ngu sac, triangular flags in red yellow green purple) strung above a small temple gate silhouette with curved roof, red lanterns.` },
  { id: 'apricot-blossom', dir: 'vocab', prompt: `${TET_STYLE} Vietnamese hoa mai - a branch of YELLOW apricot blossoms with five round petals each, brown branch, the traditional Tet flower of southern Vietnam.` },
  { id: 'dragon-dance', dir: 'vocab', prompt: `${TET_STYLE} Vietnamese lion-dragon dance head (mua lan su rong) - a colorful paper-mache costume head in red green and gold with big eyes and open mouth.` },
];

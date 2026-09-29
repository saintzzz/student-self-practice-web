# CR-10 Research — Visual Identity & Kid Engagement (2026-10-01)

Scope: competitive teardown + age-6-11 design rules for the English
self-practice app. Ordered before any design work (correcting CR-09's
research-free reskin).

## 1. What the leaders actually do

### Duolingo / Duolingo ABC
- Art direction: "bold, bouncy, bright". Minimalist playful -
  illustrations carry the FEWEST details needed to stay readable;
  failure of clarity = learner failure.
- Character = product. Duo is an emotive cheerleader with poses/moods;
  kids "know and love" characters inside stories.
- Reward moments are engineered: streak milestones become "power-ups"
  (Fire Duo/phoenix), chest pops with squash-and-stretch, "+gems"
  spring ticker, confetti particles, Continue button slides up.
- Rounded geometry + saturated palette on light surfaces; the 2018
  redesign moved FROM muted/flat TO vibrant/round.

### Khan Academy Kids / KidSpark design research (Vietnamese designer,
tested with real children)
- Saturated, high-contrast color: muted/sophisticated tones read as
  "flat" to kids - interactive elements must pop from non-interactive.
- Targets: 64-80dp primaries for young tiers (ours: 76px = compliant).
- Icon+label nav, 2-level max depth, no dead ends, mascot-in-corner
  home button; forgiving systems ("I can't break it").
- Parent layer separate from child layer entirely.

### Monkey Junior / VMonkey (VN market leader)
- Rewards: coins, stickers, virtual pets; 4000+ interactive activities;
  "sinh động" (vibrant) is their core marketing word.
- Comic/story world for retention; AI buddy as companion.

### KidLearn DESIGN.md (open design-system reference for ages 5-12)
- Fredoka/Baloo-class display + Nunito-class body (our Baloo 2 fits).
- Reward animations (stars/confetti/bounce) for correct answers AND
  milestones; max ~3 bright colors per view; 2nd-grade reading level;
  no anxiety mechanics.

## 2. Diagnosis of current app vs that bar

| Gap | Current state | Leader baseline |
|---|---|---|
| Theme/world | none - flat gradient + white cards | immersive scene/environment |
| Mascot | 🐷 emoji, static, decorative | emotive companion that reacts |
| Correct-answer moment | thin tinted banner | celebration burst + sound + bounce |
| Round/batch end | plain score text | chest pop / star rain / level-up |
| Progression | 5 identical cards, no sense of journey | map/path, stars per lesson, unlock feel |
| Persistent reward | none (points reset each batch) | coins/gems/stars that accumulate |
| Color | pastel, low-energy | saturated, contrast-coded |
| Feedback audio | word audio only | sfx for win/milestone |

## 3. Design rules extracted (binding for CR-10)

- R1: ONE world/theme, applied consistently - not scattered clip art.
- R2: Mascot becomes a companion: reacts to correct/wrong/round-end
  (moods already exist in code - wire them visually everywhere).
- R3: Every success moment gets a celebration layer: correct answer =
  burst; round end = stars; batch end = big chest/level moment.
  All transform/opacity, reduced-motion safe.
- R4: Saturated palette with semantic contrast - play surfaces tinted,
  chrome distinct, max 3 bright hues per view.
- R5: Persistence: star bank in localStorage (guest+student alike);
  count surfaces on grade select + summaries. No backend dependency.
- R6: Grade identity: each grade gets its own environment tint/motif
  so progression feels like a journey.
- R7: Assets stay self-hosted + attributed; scenes drawn with CSS/SVG
  or compact illustrated SVG, not heavy bitmaps.

## 4. Theme directions evaluated (see cr-backlog CR-10 for the ruling)

- **A - "Hành trình Anh ngữ" (adventure map):** each grade = a land
  (G1 playground, G2 town, G3 jungle/zoo, G4 city, G5 world trip);
  pig = travel buddy. Strongest journey feel; most art work.
- **B - "Ngày của Bé Heo" (school-day world):** one cozy school world;
  grades = classrooms; pig = classmate. Cheapest to execute; weakest
  differentiation across grades.
- **C - "Phi hành gia Heo" (space):** grades = planets; astronaut pig.
  Highest wow factor; weakest link to school-content topics.

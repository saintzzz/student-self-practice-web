import type { VocabWord } from '../../types';

/**
 * CR-24 (user report): image questions must be identifiable from the
 * picture alone. Words whose emoji shows a RELATED object or an abstract
 * symbol instead of the concept itself produce impossible questions -
 * e.g. 📹 (a camera) for "vlog", or 🏮 (a lantern, which is itself a
 * vocab word) for "Mid-Autumn Festival".
 *
 * FIGURATIVE_IMAGE_WORDS is a curated blocklist of word ids where the
 * emoji does NOT literally depict the word's meaning. These words still
 * appear in every text/audio question kind; they are only excluded from
 * image-prompted generators (image-choice, describe-and-choose-image,
 * listening-image-choice, counting-image, picture-pair-matching).
 */
const FIGURATIVE_IMAGE_WORDS: ReadonlySet<string> = new Set([
  // Media/tech abstractions - the emoji depicts a device, not the concept.
  'vlog', // 📹 camera ≠ vlog (user-reported)
  'photography', // 📷 camera ≠ photography
  'email', // 📧 envelope could be "letter"/"mail"
  'wifi', // 🛜 abstract symbol
  'signal', // 📶 bars could be "level"
  'video-game', // 🎮 controller - collides with 'joystick' 🕹️

  // Activities depicted by an object - the object has its own meaning.
  'shopping', // 🛍️ bags, not the act of shopping
  'sightseeing', // 🗼 tower, not sightseeing
  'picnic', // 🧺 basket - could be "basket"
  'camping', // 🏕️ tent - could be "tent"
  'cheer', // 📣 megaphone - collides with 'megaphone' 📢
  'homework', // 📝 memo - could be "note"/"write"
  'volunteer', // 🙋 raised hand - could be "person"/"hand"
  'sauna', // 🧖 person in steam - could be "person"
  'nail-polish', // 💅 painted nails - could be "nails"
  'good-luck', // 🤞 crossed fingers - could be "fingers"

  // Time/concepts depicted by a scene or symbol.
  'weekend', // 📆 calendar ≠ weekend
  'morning', // 🌅 sunrise - collides with 'sunrise' 🌄
  'afternoon', // 🌤️ sun+cloud - ambiguous weather
  'evening', // 🌆 cityscape - could be "city"
  'night', // 🌃 night city - could be "city"
  'dream', // 💭 thought bubble - could be "think"
  'infinity', // ♾️ symbol, not a thing a child can name from the picture

  // Festivals/events depicted by a decoration or symbol.
  'festival', // 🎏 koinobori streamer - could be "fish"/"flag"
  'new-year', // 🎊 confetti ball - could be "party"
  'mid-autumn', // 🏮 lantern - collides with 'lantern'
  'music', // 🎵 note symbol - could be "note"/"song"
  'bakery', // 🥐 croissant - could be "bread"/"croissant"
]);

/**
 * True when `word`'s emoji literally depicts the word's meaning and can
 * safely appear as an image prompt.
 */
export function isLiteralImageWord(word: VocabWord): boolean {
  return !FIGURATIVE_IMAGE_WORDS.has(word.id);
}

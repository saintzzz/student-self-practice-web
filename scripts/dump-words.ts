/** Dumps every vocab word (lowercase) as JSON for scripts/gen-ipa.py. */
import { ALL_WORDS } from '../src/data/vocabulary';

console.log(JSON.stringify([...new Set(ALL_WORDS.map((w) => w.word))]));

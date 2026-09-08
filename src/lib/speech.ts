/**
 * Kept alive outside speak()'s call frame - mobile Chrome and Safari have a
 * well-documented bug where a SpeechSynthesisUtterance with no surviving
 * reference gets garbage-collected mid-utterance and the speech silently
 * cuts off or never starts. A single module-level slot is enough since this
 * app only ever needs one utterance in flight at a time.
 */
let activeUtterance: SpeechSynthesisUtterance | null = null;

/**
 * Shared core for speech synthesis calls. Never throws even if the browser
 * has no speech synthesis support or zero installed voices - a failure to
 * speak must never block the student from typing an answer.
 */
function speak(text: string): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    return;
  }

  try {
    // Mobile Safari can get stuck mid-queue after backgrounding/locking, and
    // a leftover queued utterance from a previous tap can otherwise block or
    // delay this one - cancelling first keeps every tap of the play button
    // starting from a clean state.
    window.speechSynthesis.cancel();

    const utterance = new window.SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    activeUtterance = utterance;
    utterance.onend = () => {
      if (activeUtterance === utterance) activeUtterance = null;
    };
    utterance.onerror = () => {
      if (activeUtterance === utterance) activeUtterance = null;
    };
    window.speechSynthesis.speak(utterance);
  } catch {
    // Speech synthesis is a nice-to-have for this feature; swallow and
    // continue silently (see the function doc comment above).
  }
}

/**
 * Thin wrapper around the browser-native Web Speech API. Speaks a single
 * English word aloud so a 7-year-old can practice listening (see
 * mvp-decisions.md "v2 Correction" - Audio source).
 */
export function speakWord(word: string): void {
  speak(word);
}

/**
 * Speaks a full English sentence aloud (Round 2 - Listening Sentence
 * Fill-Blank, plan.md v5). Same underlying call as speakWord, just a
 * longer utterance - kept as a distinct named export so callers make their
 * intent explicit (a whole sentence vs. a bare word).
 */
export function speakSentence(sentence: string): void {
  speak(sentence);
}

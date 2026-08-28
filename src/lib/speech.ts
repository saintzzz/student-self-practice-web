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
    const utterance = new window.SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
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

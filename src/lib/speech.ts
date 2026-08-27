/**
 * Thin wrapper around the browser-native Web Speech API. Speaks an English
 * word aloud so a 7-year-old can practice listening (see mvp-decisions.md
 * "v2 Correction" - Audio source). Never throws even if the browser has no
 * speech synthesis support or zero installed voices.
 */
export function speakWord(word: string): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    return;
  }

  try {
    const utterance = new window.SpeechSynthesisUtterance(word);
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
  } catch {
    // Speech synthesis is a nice-to-have for this feature; a failure to
    // speak must never block the student from typing an answer.
  }
}

import type { Topic, VocabWord } from '../../types';

export const OCCUPATIONS_TOPIC: Topic = { id: 'g2-occupations', gradeId: 'grade-2', name: 'Nghề nghiệp' };

const t = OCCUPATIONS_TOPIC.id;

/** Occupations are identities, not physical objects, so none are countable (same reasoning as family). */
export const OCCUPATIONS_WORDS: VocabWord[] = [
  { id: 'doctor', topicId: t, word: 'doctor', emoji: '🧑‍⚕️', countable: false, explanation: 'Bác sĩ tiếng Anh là "doctor".' },
  { id: 'teacher', topicId: t, word: 'teacher', emoji: '🧑‍🏫', countable: false, explanation: 'Giáo viên tiếng Anh là "teacher".' },
  { id: 'farmer', topicId: t, word: 'farmer', emoji: '🧑‍🌾', countable: false, explanation: 'Nông dân tiếng Anh là "farmer".' },
  { id: 'policeman', topicId: t, word: 'policeman', emoji: '👮', countable: false, explanation: 'Cảnh sát tiếng Anh là "policeman".' },
  { id: 'firefighter', topicId: t, word: 'firefighter', emoji: '🧑‍🚒', countable: false, explanation: 'Lính cứu hỏa tiếng Anh là "firefighter".' },
  { id: 'pilot', topicId: t, word: 'pilot', emoji: '🧑‍✈️', countable: false, explanation: 'Phi công tiếng Anh là "pilot".' },
  { id: 'astronaut', topicId: t, word: 'astronaut', emoji: '🧑‍🚀', countable: false, explanation: 'Phi hành gia tiếng Anh là "astronaut".' },
  { id: 'artist', topicId: t, word: 'artist', emoji: '🧑‍🎨', countable: false, explanation: 'Họa sĩ tiếng Anh là "artist".' },
  { id: 'builder', topicId: t, word: 'builder', emoji: '👷', countable: false, explanation: 'Thợ xây tiếng Anh là "builder".' },
  { id: 'mechanic', topicId: t, word: 'mechanic', emoji: '🧑‍🔧', countable: false, explanation: 'Thợ máy tiếng Anh là "mechanic".' },
  { id: 'scientist', topicId: t, word: 'scientist', emoji: '🧑‍🔬', countable: false, explanation: 'Nhà khoa học tiếng Anh là "scientist".' },
  // v5 vocabulary additions (plan.md "v5 Research-Grounded Content"): "police
  // officer" (👮) was approved for addition, but "policeman" already exists
  // above using the exact same emoji (👮, single codepoint U+1F46E - not a ZWJ
  // sequence). Adding "police officer" as a second entry would give this topic
  // two words sharing one emoji, breaking the single-clear-emoji-per-word
  // invariant image-choice questions depend on (would fail the "no duplicate
  // emoji within a single topic" guard in index.test.ts). Skipped as a
  // same-emoji/meaning duplicate of "policeman" (same reasoning food.ts
  // already applied to skip "burger" vs. the existing "hamburger"). See
  // plans/reports/engineer-260828-student-self-practice-v5-vocab.md for the
  // full writeup, including the ZWJ-compound-emoji audit of this topic's
  // pre-existing words that the v5 critique flagged as an open question.
];

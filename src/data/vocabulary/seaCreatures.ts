import type { Topic, VocabWord } from '../../types';

export const SEA_CREATURES_TOPIC: Topic = { id: 'g2-sea-creatures', gradeId: 'grade-2', name: 'Sinh vật biển' };

const t = SEA_CREATURES_TOPIC.id;

export const SEA_CREATURES_WORDS: VocabWord[] = [
  { id: 'octopus', topicId: t, word: 'octopus', plural: 'octopuses', emoji: '🐙', countable: true, explanation: 'Con bạch tuộc tiếng Anh là "octopus".' },
  { id: 'crab', topicId: t, word: 'crab', plural: 'crabs', emoji: '🦀', countable: true, explanation: 'Con cua tiếng Anh là "crab".' },
  { id: 'shrimp', topicId: t, word: 'shrimp', plural: 'shrimp', emoji: '🦐', countable: true, explanation: 'Con tôm tiếng Anh là "shrimp".' },
  { id: 'squid', topicId: t, word: 'squid', plural: 'squid', emoji: '🦑', countable: true, explanation: 'Con mực tiếng Anh là "squid".' },
  { id: 'turtle', topicId: t, word: 'turtle', plural: 'turtles', emoji: '🐢', countable: true, explanation: 'Con rùa tiếng Anh là "turtle".' },
  { id: 'dolphin', topicId: t, word: 'dolphin', plural: 'dolphins', emoji: '🐬', countable: true, explanation: 'Con cá heo tiếng Anh là "dolphin".' },
  { id: 'whale', topicId: t, word: 'whale', plural: 'whales', emoji: '🐳', countable: true, explanation: 'Con cá voi tiếng Anh là "whale".' },
  { id: 'shark', topicId: t, word: 'shark', plural: 'sharks', emoji: '🦈', countable: true, explanation: 'Con cá mập tiếng Anh là "shark".' },
];

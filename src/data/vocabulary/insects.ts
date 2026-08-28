import type { Topic, VocabWord } from '../../types';

export const INSECTS_TOPIC: Topic = { id: 'g2-insects', gradeId: 'grade-2', name: 'Côn trùng' };

const t = INSECTS_TOPIC.id;

export const INSECTS_WORDS: VocabWord[] = [
  { id: 'bee', topicId: t, word: 'bee', plural: 'bees', emoji: '🐝', countable: true, explanation: 'Con ong tiếng Anh là "bee".' },
  { id: 'butterfly', topicId: t, word: 'butterfly', plural: 'butterflies', emoji: '🦋', countable: true, explanation: 'Con bướm tiếng Anh là "butterfly".' },
  { id: 'ant', topicId: t, word: 'ant', plural: 'ants', emoji: '🐜', countable: true, explanation: 'Con kiến tiếng Anh là "ant".' },
  { id: 'spider', topicId: t, word: 'spider', plural: 'spiders', emoji: '🕷️', countable: true, explanation: 'Con nhện tiếng Anh là "spider".' },
  { id: 'ladybug', topicId: t, word: 'ladybug', plural: 'ladybugs', emoji: '🐞', countable: true, explanation: 'Bọ rùa tiếng Anh là "ladybug".' },
  { id: 'mosquito', topicId: t, word: 'mosquito', plural: 'mosquitoes', emoji: '🦟', countable: true, explanation: 'Con muỗi tiếng Anh là "mosquito".' },
  { id: 'fly', topicId: t, word: 'fly', plural: 'flies', emoji: '🪰', countable: true, explanation: 'Con ruồi tiếng Anh là "fly".' },
  { id: 'caterpillar', topicId: t, word: 'caterpillar', plural: 'caterpillars', emoji: '🐛', countable: true, explanation: 'Con sâu bướm tiếng Anh là "caterpillar".' },
  { id: 'worm', topicId: t, word: 'worm', plural: 'worms', emoji: '🪱', countable: true, explanation: 'Con giun tiếng Anh là "worm".' },
  { id: 'snail', topicId: t, word: 'snail', plural: 'snails', emoji: '🐌', countable: true, explanation: 'Con ốc sên tiếng Anh là "snail".' },
  { id: 'grasshopper', topicId: t, word: 'grasshopper', plural: 'grasshoppers', emoji: '🦗', countable: true, explanation: 'Con châu chấu tiếng Anh là "grasshopper".' },
];

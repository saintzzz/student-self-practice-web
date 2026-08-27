import type { Topic, VocabWord } from '../../types';

export const FAMILY_TOPIC: Topic = { id: 'g2-family', gradeId: 'grade-2', name: 'Gia đình' };

const t = FAMILY_TOPIC.id;

export const FAMILY_WORDS: VocabWord[] = [
  { id: 'mom', topicId: t, word: 'mom', emoji: '👩', countable: false, explanation: 'Mẹ tiếng Anh là "mom".' },
  { id: 'dad', topicId: t, word: 'dad', emoji: '👨', countable: false, explanation: 'Bố tiếng Anh là "dad".' },
  { id: 'grandma', topicId: t, word: 'grandma', emoji: '👵', countable: false, explanation: 'Bà tiếng Anh là "grandma".' },
  { id: 'grandpa', topicId: t, word: 'grandpa', emoji: '👴', countable: false, explanation: 'Ông tiếng Anh là "grandpa".' },
  { id: 'sister', topicId: t, word: 'sister', emoji: '👧', countable: false, explanation: 'Chị/em gái tiếng Anh là "sister".' },
  { id: 'brother', topicId: t, word: 'brother', emoji: '👦', countable: false, explanation: 'Anh/em trai tiếng Anh là "brother".' },
  { id: 'baby', topicId: t, word: 'baby', emoji: '👶', countable: false, explanation: 'Em bé tiếng Anh là "baby".' },
];

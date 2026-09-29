import type { Topic, VocabWord } from '../../types';

export const KITCHEN_TOPIC: Topic = { id: 'g2-kitchen', gradeId: 'grade-2', name: 'Nhà bếp' };

const t = KITCHEN_TOPIC.id;

// SGK Tiếng Anh 2 Unit 7 (Kitchen) gap additions (docs/sdlc/prd.md section 7.1).
export const KITCHEN_WORDS: VocabWord[] = [
  { id: 'spoon', topicId: t, word: 'spoon', plural: 'spoons', emoji: '🥄', countable: true, explanation: 'Cái thìa tiếng Anh là "spoon".' },
  { id: 'teapot', topicId: t, word: 'teapot', plural: 'teapots', emoji: '🫖', countable: true, explanation: 'Ấm trà tiếng Anh là "teapot".' },
  { id: 'chopsticks', topicId: t, word: 'chopsticks', emoji: '🥢', countable: false, explanation: 'Đôi đũa tiếng Anh là "chopsticks".' },
  { id: 'jar', topicId: t, word: 'jar', plural: 'jars', emoji: '🫙', countable: true, explanation: 'Cái lọ thủy tinh tiếng Anh là "jar".' },
  { id: 'salt', topicId: t, word: 'salt', emoji: '🧂', countable: false, explanation: 'Muối tiếng Anh là "salt".' },
  { id: 'sponge', topicId: t, word: 'sponge', plural: 'sponges', emoji: '🧽', countable: true, explanation: 'Miếng bọt biển rửa bát tiếng Anh là "sponge".' },
  { id: 'butter', topicId: t, word: 'butter', emoji: '🧈', countable: false, explanation: 'Bơ làm từ sữa tiếng Anh là "butter".' },
  { id: 'ice', topicId: t, word: 'ice', emoji: '🧊', countable: false, explanation: 'Đá lạnh tiếng Anh là "ice".' },
  // People follow the occupations convention (countable: false); `chef` is a
  // word-id override -> occupation sentence class (PRD 5.1 Table B).
  { id: 'chef', topicId: t, word: 'chef', emoji: '🧑‍🍳', countable: false, explanation: 'Đầu bếp tiếng Anh là "chef".' },
];

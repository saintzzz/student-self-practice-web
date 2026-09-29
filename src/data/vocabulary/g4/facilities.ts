import type { Topic, VocabWord } from '../../../types';

export const G4_FACILITIES_TOPIC: Topic = { id: 'g4-facilities', gradeId: 'grade-4', name: 'Phòng học và cơ sở vật chất' };

const t = G4_FACILITIES_TOPIC.id;

/** Global Success G4 school-facilities unit.
    playground shares 🛝 with 'slide' - same real-world object, recorded
    as a sanctioned shared-emoji pair in bank.test.ts (AC-6.3, CR-07). */
export const G4_FACILITIES_WORDS: VocabWord[] = [
  { id: 'library', topicId: t, word: 'library', plural: 'libraries', emoji: '📚', countable: true, explanation: 'Thư viện tiếng Anh là "library".' },
  { id: 'lab', topicId: t, word: 'lab', plural: 'labs', emoji: '🧪', countable: true, explanation: 'Phòng thí nghiệm tiếng Anh là "lab".' },
  { id: 'stadium', topicId: t, word: 'stadium', plural: 'stadiums', emoji: '🏟️', countable: true, explanation: 'Sân vận động tiếng Anh là "stadium".' },
  { id: 'playground', topicId: t, word: 'playground', plural: 'playgrounds', emoji: '🛝', countable: true, explanation: 'Sân chơi tiếng Anh là "playground".' },
  { id: 'restroom', topicId: t, word: 'restroom', plural: 'restrooms', emoji: '🚻', countable: true, explanation: 'Nhà vệ sinh tiếng Anh là "restroom".' },
];

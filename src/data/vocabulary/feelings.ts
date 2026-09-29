import type { Topic, VocabWord } from '../../types';

export const FEELINGS_TOPIC: Topic = { id: 'g2-feelings', gradeId: 'grade-2', name: 'Cảm xúc' };

const t = FEELINGS_TOPIC.id;

export const FEELINGS_WORDS: VocabWord[] = [
  { id: 'happy', topicId: t, word: 'happy', emoji: '😀', countable: false, explanation: 'Vui vẻ tiếng Anh là "happy".' },
  { id: 'sad', topicId: t, word: 'sad', emoji: '😢', countable: false, explanation: 'Buồn tiếng Anh là "sad".' },
  { id: 'angry', topicId: t, word: 'angry', emoji: '😠', countable: false, explanation: 'Tức giận tiếng Anh là "angry".' },
  { id: 'scared', topicId: t, word: 'scared', emoji: '😨', countable: false, explanation: 'Sợ hãi tiếng Anh là "scared".' },
  { id: 'tired', topicId: t, word: 'tired', emoji: '😴', countable: false, explanation: 'Mệt mỏi tiếng Anh là "tired".' },
  { id: 'surprised', topicId: t, word: 'surprised', emoji: '😲', countable: false, explanation: 'Ngạc nhiên tiếng Anh là "surprised".' },
  // SGK Tiếng Anh 2 gap additions (docs/sdlc/prd.md section 7).
  { id: 'excited', topicId: t, word: 'excited', emoji: '🤩', countable: false, explanation: 'Háo hức tiếng Anh là "excited".' },
  { id: 'sick', topicId: t, word: 'sick', emoji: '🤒', countable: false, explanation: 'Bị ốm tiếng Anh là "sick".' },
  { id: 'cold', topicId: t, word: 'cold', emoji: '🥶', countable: false, explanation: 'Cảm thấy lạnh tiếng Anh là "cold".' },
  { id: 'hot', topicId: t, word: 'hot', emoji: '🥵', countable: false, explanation: 'Cảm thấy nóng tiếng Anh là "hot".' },
];

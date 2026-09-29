import type { Topic, VocabWord } from '../../../types';

export const G5_COUNTRIES_TOPIC: Topic = { id: 'g5-countries', gradeId: 'grade-5', name: 'Đất nước' };

const t = G5_COUNTRIES_TOPIC.id;

/** Global Success G5 "foreign friends" unit - country nouns rendered as flags.
    Uses the dedicated 'country' sentence class ("I am from Vietnam."). */
export const G5_COUNTRIES_WORDS: VocabWord[] = [
  { id: 'vietnam', topicId: t, word: 'Vietnam', emoji: '🇻🇳', countable: false, explanation: 'Việt Nam tiếng Anh là "Vietnam".' },
  { id: 'britain', topicId: t, word: 'Britain', emoji: '🇬🇧', countable: false, explanation: 'Nước Anh tiếng Anh là "Britain".' },
  { id: 'america', topicId: t, word: 'America', emoji: '🇺🇸', countable: false, explanation: 'Nước Mỹ tiếng Anh là "America".' },
  { id: 'japan', topicId: t, word: 'Japan', emoji: '🇯🇵', countable: false, explanation: 'Nước Nhật tiếng Anh là "Japan".' },
  { id: 'korea', topicId: t, word: 'Korea', emoji: '🇰🇷', countable: false, explanation: 'Nước Hàn Quốc tiếng Anh là "Korea".' },
  { id: 'china', topicId: t, word: 'China', emoji: '🇨🇳', countable: false, explanation: 'Nước Trung Quốc tiếng Anh là "China".' },
  { id: 'france', topicId: t, word: 'France', emoji: '🇫🇷', countable: false, explanation: 'Nước Pháp tiếng Anh là "France".' },
  { id: 'australia', topicId: t, word: 'Australia', emoji: '🇦🇺', countable: false, explanation: 'Nước Úc tiếng Anh là "Australia".' },
  { id: 'thailand', topicId: t, word: 'Thailand', emoji: '🇹🇭', countable: false, explanation: 'Nước Thái Lan tiếng Anh là "Thailand".' },
  { id: 'malaysia', topicId: t, word: 'Malaysia', emoji: '🇲🇾', countable: false, explanation: 'Nước Malaysia tiếng Anh là "Malaysia".' },
  { id: 'singapore', topicId: t, word: 'Singapore', emoji: '🇸🇬', countable: false, explanation: 'Nước Singapore tiếng Anh là "Singapore".' },
  { id: 'india', topicId: t, word: 'India', emoji: '🇮🇳', countable: false, explanation: 'Nước Ấn Độ tiếng Anh là "India".' },
];

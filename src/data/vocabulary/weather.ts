import type { Topic, VocabWord } from '../../types';

export const WEATHER_TOPIC: Topic = { id: 'g2-weather', gradeId: 'grade-2', name: 'Thời tiết' };

const t = WEATHER_TOPIC.id;

export const WEATHER_WORDS: VocabWord[] = [
  { id: 'sun', topicId: t, word: 'sun', emoji: '☀️', countable: false, explanation: 'Mặt trời tiếng Anh là "sun".' },
  { id: 'rain', topicId: t, word: 'rain', emoji: '🌧️', countable: false, explanation: 'Mưa tiếng Anh là "rain".' },
  { id: 'cloud', topicId: t, word: 'cloud', emoji: '☁️', countable: false, explanation: 'Mây tiếng Anh là "cloud".' },
  { id: 'snow', topicId: t, word: 'snow', emoji: '❄️', countable: false, explanation: 'Tuyết tiếng Anh là "snow".' },
  { id: 'wind', topicId: t, word: 'wind', emoji: '💨', countable: false, explanation: 'Gió tiếng Anh là "wind".' },
  { id: 'rainbow', topicId: t, word: 'rainbow', emoji: '🌈', countable: false, explanation: 'Cầu vồng tiếng Anh là "rainbow".' },
];

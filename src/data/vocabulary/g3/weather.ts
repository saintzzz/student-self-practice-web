import type { Topic, VocabWord } from '../../../types';
import { pick } from '../shared';
import { WEATHER_WORDS } from '../weather';

export const G3_WEATHER_TOPIC: Topic = { id: 'g3-weather', gradeId: 'grade-3', name: 'Thời tiết' };

const t = G3_WEATHER_TOPIC.id;

/** Global Success G3 weather words - shared sky set plus storm and fog. */
export const G3_WEATHER_WORDS: VocabWord[] = [
  ...pick(WEATHER_WORDS, 'sun', 'rain', 'cloud', 'snow', 'wind', 'rainbow'),
  { id: 'storm', topicId: t, word: 'storm', plural: 'storms', emoji: '⛈️', countable: true, explanation: 'Cơn bão tiếng Anh là "storm".' },
  { id: 'fog', topicId: t, word: 'fog', emoji: '🌫️', countable: false, explanation: 'Sương mù tiếng Anh là "fog".' },
];

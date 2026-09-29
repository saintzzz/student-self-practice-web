import type { Topic, VocabWord } from '../../../types';
import { pick } from '../shared';
import { G3_JOBS_WORDS } from '../g3/jobs';
import { G4_CITY_PLACES_WORDS } from '../g4/cityPlaces';

export const G5_HEALTH_TOPIC: Topic = { id: 'g5-health', gradeId: 'grade-5', name: 'Sức khỏe' };

const t = G5_HEALTH_TOPIC.id;

/** Global Success G5 health unit - common ailments and care words. */
export const G5_HEALTH_WORDS: VocabWord[] = [
  { id: 'fever', topicId: t, word: 'fever', plural: 'fevers', emoji: '😷', countable: true, explanation: 'Cơn sốt tiếng Anh là "fever".' },
  { id: 'headache', topicId: t, word: 'headache', plural: 'headaches', emoji: '🤕', countable: true, explanation: 'Cơn đau đầu tiếng Anh là "headache".' },
  { id: 'sneeze', topicId: t, word: 'sneeze', plural: 'sneezes', emoji: '🤧', countable: true, explanation: 'Cái hắt hơi tiếng Anh là "sneeze".' },
  { id: 'medicine', topicId: t, word: 'medicine', emoji: '💊', countable: false, explanation: 'Thuốc tiếng Anh là "medicine".' },
  { id: 'thermometer', topicId: t, word: 'thermometer', plural: 'thermometers', emoji: '🌡️', countable: true, explanation: 'Nhiệt kế tiếng Anh là "thermometer".' },
  { id: 'bandage', topicId: t, word: 'bandage', plural: 'bandages', emoji: '🩹', countable: true, explanation: 'Băng cá nhân tiếng Anh là "bandage".' },
  ...pick(G3_JOBS_WORDS, 'doctor', 'nurse'),
  ...pick(G4_CITY_PLACES_WORDS, 'hospital'),
];

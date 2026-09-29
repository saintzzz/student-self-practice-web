import type { Topic, VocabWord } from '../../../types';
import { pick } from '../shared';
import { FURNITURE_WORDS } from '../furniture';

export const G3_ROOMS_TOPIC: Topic = { id: 'g3-rooms', gradeId: 'grade-3', name: 'Các phòng' };

const t = G3_ROOMS_TOPIC.id;

/** Global Success G3 "rooms in the house" unit - shared furniture plus room nouns.
    'kitchen' itself stays out: no emoji unambiguously means the room
    (PRD 7.3 spirit - food glyphs read as dishes). */
export const G3_ROOMS_WORDS: VocabWord[] = [
  ...pick(FURNITURE_WORDS, 'bed', 'chair', 'door', 'window', 'sofa', 'television', 'lamp', 'clock'),
  { id: 'bathroom', topicId: t, word: 'bathroom', plural: 'bathrooms', emoji: '🚿', countable: true, explanation: 'Phòng tắm tiếng Anh là "bathroom".' },
  { id: 'bedroom', topicId: t, word: 'bedroom', plural: 'bedrooms', emoji: '🛌', countable: true, explanation: 'Phòng ngủ tiếng Anh là "bedroom".' },
  { id: 'garden', topicId: t, word: 'garden', plural: 'gardens', emoji: '🏡', countable: true, explanation: 'Khu vườn tiếng Anh là "garden".' },
];

import type { Topic, VocabWord } from '../../../types';
import { pick } from '../shared';
import { BODY_PARTS_WORDS } from '../bodyParts';

export const G3_BODY_PARTS_TOPIC: Topic = { id: 'g3-body-parts', gradeId: 'grade-3', name: 'Cơ thể' };

const t = G3_BODY_PARTS_TOPIC.id;

/** Global Success G3 body unit - shared basics plus arm, tooth, hair, head. */
export const G3_BODY_PARTS_WORDS: VocabWord[] = [
  ...pick(BODY_PARTS_WORDS, 'eye', 'ear', 'hand', 'foot', 'nose', 'mouth', 'leg'),
  { id: 'arm', topicId: t, word: 'arm', plural: 'arms', emoji: '💪', countable: true, explanation: 'Cánh tay tiếng Anh là "arm".' },
  { id: 'tooth', topicId: t, word: 'tooth', plural: 'teeth', emoji: '🦷', countable: true, explanation: 'Cái răng tiếng Anh là "tooth", số nhiều là "teeth".' },
  { id: 'hair', topicId: t, word: 'hair', emoji: '💇', countable: false, explanation: 'Mái tóc tiếng Anh là "hair".' },
  { id: 'head', topicId: t, word: 'head', plural: 'heads', emoji: '👤', countable: true, explanation: 'Cái đầu tiếng Anh là "head".' },
];

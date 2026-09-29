import type { Topic, VocabWord } from '../../../types';
import { pick } from '../shared';
import { G3_JOBS_WORDS } from '../g3/jobs';

export const G4_JOBS_TOPIC: Topic = { id: 'g4-jobs', gradeId: 'grade-4', name: 'Nghề nghiệp' };

const t = G4_JOBS_TOPIC.id;

/** Global Success G4 jobs unit - shared G3 jobs plus a wider world of work. */
export const G4_JOBS_WORDS: VocabWord[] = [
  ...pick(G3_JOBS_WORDS, 'nurse', 'soldier', 'singer'),
  { id: 'vet', topicId: t, word: 'vet', plural: 'vets', emoji: '🐾', countable: true, explanation: 'Bác sĩ thú y tiếng Anh là "vet".' },
  { id: 'office-worker', topicId: t, word: 'office worker', plural: 'office workers', emoji: '🧑‍💼', countable: true, explanation: 'Nhân viên văn phòng tiếng Anh là "office worker".' },
  { id: 'baker', topicId: t, word: 'baker', plural: 'bakers', emoji: '🥖', countable: true, explanation: 'Thợ làm bánh tiếng Anh là "baker".' },
  { id: 'florist', topicId: t, word: 'florist', plural: 'florists', emoji: '💐', countable: true, explanation: 'Người bán hoa tiếng Anh là "florist".' },
  { id: 'plumber', topicId: t, word: 'plumber', plural: 'plumbers', emoji: '🔧', countable: true, explanation: 'Thợ sửa ống nước tiếng Anh là "plumber".' },
  { id: 'electrician', topicId: t, word: 'electrician', plural: 'electricians', emoji: '💡', countable: true, explanation: 'Thợ điện tiếng Anh là "electrician".' },
  { id: 'judge', topicId: t, word: 'judge', plural: 'judges', emoji: '⚖️', countable: true, explanation: 'Thẩm phán tiếng Anh là "judge".' },
  { id: 'reporter', topicId: t, word: 'reporter', plural: 'reporters', emoji: '📰', countable: true, explanation: 'Phóng viên tiếng Anh là "reporter".' },
  { id: 'photographer', topicId: t, word: 'photographer', plural: 'photographers', emoji: '📸', countable: true, explanation: 'Nhiếp ảnh gia tiếng Anh là "photographer".' },
];

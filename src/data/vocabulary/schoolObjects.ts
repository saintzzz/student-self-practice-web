import type { Topic, VocabWord } from '../../types';

export const SCHOOL_OBJECTS_TOPIC: Topic = {
  id: 'g2-school-objects',
  gradeId: 'grade-2',
  name: 'Đồ vật trong lớp học',
};

const t = SCHOOL_OBJECTS_TOPIC.id;

export const SCHOOL_OBJECTS_WORDS: VocabWord[] = [
  { id: 'pencil', topicId: t, word: 'pencil', plural: 'pencils', emoji: '✏️', countable: true, explanation: 'Cái bút chì tiếng Anh là "pencil".' },
  { id: 'book', topicId: t, word: 'book', plural: 'books', emoji: '📖', countable: true, explanation: 'Quyển sách tiếng Anh là "book".' },
  { id: 'bag', topicId: t, word: 'bag', plural: 'bags', emoji: '🎒', countable: true, explanation: 'Cái cặp sách tiếng Anh là "bag".' },
  { id: 'ruler', topicId: t, word: 'ruler', plural: 'rulers', emoji: '📏', countable: true, explanation: 'Cái thước kẻ tiếng Anh là "ruler".' },
  // "scissors" is grammatically always-plural in English, so it is excluded
  // from the countable pool to avoid an awkward "1 scissors" prompt.
  { id: 'scissors', topicId: t, word: 'scissors', emoji: '✂️', countable: false, explanation: 'Cái kéo tiếng Anh là "scissors".' },
  { id: 'crayon', topicId: t, word: 'crayon', plural: 'crayons', emoji: '🖍️', countable: true, explanation: 'Bút sáp màu tiếng Anh là "crayon".' },
  { id: 'notebook', topicId: t, word: 'notebook', plural: 'notebooks', emoji: '📓', countable: true, explanation: 'Quyển vở tiếng Anh là "notebook".' },
  { id: 'pen', topicId: t, word: 'pen', plural: 'pens', emoji: '🖊️', countable: true, explanation: 'Cái bút mực tiếng Anh là "pen".' },
  { id: 'globe', topicId: t, word: 'globe', plural: 'globes', emoji: '🌍', countable: true, explanation: 'Quả địa cầu tiếng Anh là "globe".' },
  { id: 'paintbrush', topicId: t, word: 'paintbrush', plural: 'paintbrushes', emoji: '🖌️', countable: true, explanation: 'Cọ vẽ tiếng Anh là "paintbrush".' },
  { id: 'calendar', topicId: t, word: 'calendar', plural: 'calendars', emoji: '📅', countable: true, explanation: 'Lịch tiếng Anh là "calendar".' },
  { id: 'pushpin', topicId: t, word: 'pushpin', plural: 'pushpins', emoji: '📌', countable: true, explanation: 'Đinh ghim tiếng Anh là "pushpin".' },
  { id: 'paperclip', topicId: t, word: 'paperclip', plural: 'paperclips', emoji: '📎', countable: true, explanation: 'Kẹp giấy tiếng Anh là "paperclip".' },
  { id: 'folder', topicId: t, word: 'folder', plural: 'folders', emoji: '📁', countable: true, explanation: 'Cặp đựng tài liệu tiếng Anh là "folder".' },
  { id: 'abacus', topicId: t, word: 'abacus', plural: 'abacuses', emoji: '🧮', countable: true, explanation: 'Bàn tính tiếng Anh là "abacus".' },
  // v5 vocabulary addition (plan.md "v5 Research-Grounded Content"). "bag" and
  // "ruler" were also on the approved list but already exist above and were
  // skipped.
  { id: 'computer', topicId: t, word: 'computer', plural: 'computers', emoji: '💻', countable: true, explanation: 'Máy tính tiếng Anh là "computer".' },
];

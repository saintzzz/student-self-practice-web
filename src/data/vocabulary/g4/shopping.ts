import type { Topic, VocabWord } from '../../../types';

export const G4_SHOPPING_TOPIC: Topic = { id: 'g4-shopping', gradeId: 'grade-4', name: 'Mua sắm' };

const t = G4_SHOPPING_TOPIC.id;

/** Global Success G4 shopping-centre unit - money, receipts and shop types. */
export const G4_SHOPPING_WORDS: VocabWord[] = [
  { id: 'mall', topicId: t, word: 'mall', plural: 'malls', emoji: '🏬', countable: true, explanation: 'Trung tâm thương mại tiếng Anh là "mall".' },
  { id: 'money', topicId: t, word: 'money', emoji: '💵', countable: false, explanation: 'Tiền tiếng Anh là "money".' },
  { id: 'wallet', topicId: t, word: 'wallet', plural: 'wallets', emoji: '👛', countable: true, explanation: 'Cái ví tiếng Anh là "wallet".' },
  { id: 'price', topicId: t, word: 'price', plural: 'prices', emoji: '💲', countable: true, explanation: 'Giá cả tiếng Anh là "price".' },
  { id: 'receipt', topicId: t, word: 'receipt', plural: 'receipts', emoji: '🧾', countable: true, explanation: 'Hóa đơn tiếng Anh là "receipt".' },
  { id: 'cash', topicId: t, word: 'cash', emoji: '💰', countable: false, explanation: 'Tiền mặt tiếng Anh là "cash".' },
  { id: 'bakery', topicId: t, word: 'bakery', plural: 'bakeries', emoji: '🥐', countable: true, explanation: 'Tiệm bánh tiếng Anh là "bakery".' },
  { id: 'bookshop', topicId: t, word: 'bookshop', plural: 'bookshops', emoji: '📕', countable: true, explanation: 'Hiệu sách tiếng Anh là "bookshop".' },
  { id: 'sale', topicId: t, word: 'sale', plural: 'sales', emoji: '🈹', countable: true, explanation: 'Đợt giảm giá tiếng Anh là "sale".' },
];

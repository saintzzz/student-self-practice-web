import type { GrammarBankItem } from './grammarBank';

/**
 * CR-26 - authored banks for IOE question types observed in a real
 * Cấp Trường G4 exam review that the grammar bank did not cover. All
 * items reuse the GrammarBankItem shape so they render through the
 * existing grammar-mcq UI; each family keeps its own topicId for pool
 * stratification and id prefixing.
 */

/** "Điền cụm chữ còn thiếu" - IOE masks the middle of the word with
 * stars and offers chunk options ("G***bye" -> ood). */
export const SPELLING_G12: readonly GrammarBankItem[] = [
  { prompt: 'c_ _s', options: ['aa', 'at', 'ut', 'ot'], answer: 1, explanationVi: 'cats = những con mèo.' },
  { prompt: 'd_ _s', options: ['oo', 'og', 'oa', 'ou'], answer: 1, explanationVi: 'dogs = những con chó.' },
  { prompt: 'b_ _k', options: ['oa', 'oo', 'ou', 'oi'], answer: 1, explanationVi: 'book = sách.' },
  { prompt: 'p_ _cil', options: ['en', 'an', 'in', 'on'], answer: 0, explanationVi: 'pencil = bút chì.' },
  { prompt: 'sch_ _l', options: ['oa', 'oo', 'ou', 'oe'], answer: 1, explanationVi: 'school = trường học.' },
  { prompt: 'r_ _d', options: ['ea', 'ee', 'ae', 'ai'], answer: 0, explanationVi: 'read = đọc.' },
];

export const SPELLING_G3: readonly GrammarBankItem[] = [
  { prompt: 'st_ _ents', options: ['ud', 'du', 'ad', 'ed'], answer: 0, explanationVi: 'students = học sinh.' },
  { prompt: 'cl_ _sroom', options: ['ar', 'as', 'er', 'or'], answer: 1, explanationVi: 'classroom = lớp học.' },
  { prompt: 'w_ _ter', options: ['ea', 'in', 'ai', 'on'], answer: 1, explanationVi: 'winter = mùa đông.' },
  { prompt: 'sw_ _mming', options: ['im', 'in', 'em', 'om'], answer: 0, explanationVi: 'swimming = bơi lội.' },
  { prompt: 'birth_ _y', options: ['td', 'da', 'ad', 'ed'], answer: 1, explanationVi: 'birthday = sinh nhật.' },
  { prompt: 'favou_ _te', options: ['ri', 'ir', 're', 'er'], answer: 0, explanationVi: 'favourite = yêu thích.' },
];

export const SPELLING_G45: readonly GrammarBankItem[] = [
  { prompt: 'G_ _ _bye.', options: ['oos', 'ood', 'ouu', 'oww'], answer: 1, explanationVi: 'Goodbye = tạm biệt.' },
  { prompt: 'We have a lot of cand_ _ _s for the birthday cake.', options: ['dle', 'les', 'lse', 'lst'], answer: 1, explanationVi: 'candles = nến sinh nhật.' },
  { prompt: 'There are l_ _ _s of cakes on the table.', options: ['ost', 'ots', 'itt', 'ats'], answer: 1, explanationVi: 'lots of = nhiều.' },
  { prompt: 'We should rai_ _ our hands when we cross the streets.', options: ['se', 'ce', 'ze', 'ss'], answer: 0, explanationVi: 'raise = giơ lên.' },
  { prompt: 'Whales and sharks live in the wat_ _.', options: ['ar', 'er', 'ir', 'or'], answer: 1, explanationVi: 'water = nước.' },
  { prompt: 'I want to be a n_ _se.', options: ['ur', 'er', 'or', 'ar'], answer: 0, explanationVi: 'nurse = y tá.' },
  { prompt: 'breakf_ _t', options: ['as', 'es', 'is', 'us'], answer: 0, explanationVi: 'breakfast = bữa sáng.' },
  { prompt: 'Janu_ _y', options: ['ar', 'er', 'or', 'ur'], answer: 0, explanationVi: 'January = tháng một.' },
  { prompt: 'diction_ _y', options: ['ar', 'er', 'or', 'ur'], answer: 0, explanationVi: 'dictionary = từ điển.' },
  { prompt: 'subj_ _t', options: ['ac', 'ec', 'ic', 'uc'], answer: 1, explanationVi: 'subject = môn học.' },
];

/** "Từ có phần gạch chân phát âm giống/khác âm X trong từ Y" -
 * reference-sound MCQ mined from the real exam (I in NIGHT, S in
 * ADDRESS, O in TODAY, T in TRAIN, O in MONDAY). Options are phonetic
 * traps - only one shares the underlined sound. */
export const PRONUNCIATION_G3: readonly GrammarBankItem[] = [
  { prompt: 'Which word has the underlined part pronounced like the letter C in CAT?', options: ['city', 'cup', 'nice', 'face'], answer: 1, explanationVi: 'C trong "cup" đọc /k/ giống CAT; city/nice/face đọc /s/.' },
  { prompt: 'Which word has the underlined part pronounced like the letter A in CAT?', options: ['bag', 'name', 'car', 'cake'], answer: 0, explanationVi: 'A trong "bag" đọc /æ/ giống CAT.' },
  { prompt: 'Which word has the underlined part pronounced differently from the letter E in RED?', options: ['pen', 'leg', 'she', 'ten'], answer: 2, explanationVi: '"she" đọc /iː/, khác /e/ trong RED.' },
  { prompt: 'Which word has the underlined part pronounced like the letter I in FISH?', options: ['kite', 'milk', 'like', 'hi'], answer: 1, explanationVi: 'I trong "milk" đọc /ɪ/ giống FISH; kite/like/hi đọc /aɪ/.' },
  { prompt: 'Which word has the underlined part pronounced like the letter O in DOG?', options: ['hot', 'go', 'nose', 'home'], answer: 0, explanationVi: 'O trong "hot" đọc /ɒ/ giống DOG.' },
];

export const PRONUNCIATION_G45: readonly GrammarBankItem[] = [
  { prompt: 'Which word has the underlined part pronounced differently from the letter I in NIGHT?', options: ['kite', 'English', 'bike', 'five'], answer: 1, explanationVi: '"English" đọc /ɪ/, khác /aɪ/ trong NIGHT.' },
  { prompt: 'Which word has the underlined part pronounced like the letter S in ADDRESS?', options: ['days', 'weeks', 'plays', 'bags'], answer: 1, explanationVi: 'S trong "weeks" đọc /s/ giống ADDRESS; days/plays/bags đọc /z/.' },
  { prompt: 'Which word has the underlined part pronounced like the letter O in TODAY?', options: ['open', 'collect', 'go', 'home'], answer: 1, explanationVi: 'O trong "collect" đọc /ə/ giống TODAY; open/go/home đọc /oʊ/.' },
  { prompt: 'Which word has the underlined part pronounced differently from the letter T in TRAIN?', options: ['kitchen', 'dictation', 'table', 'ten'], answer: 0, explanationVi: '"kitchen" đọc /tʃ/, khác /t/ trong TRAIN.' },
  { prompt: 'Which word has the underlined part pronounced like the letter O in MONDAY?', options: ['Morning', 'Monkey', 'Mouth', 'Mango'], answer: 1, explanationVi: 'O trong "Monkey" đọc /ʌ/ giống MONDAY.' },
  { prompt: 'Which word has the underlined part pronounced differently from the letters OO in SCHOOL?', options: ['food', 'moon', 'book', 'zoo'], answer: 2, explanationVi: '"book" đọc /ʊ/, khác /uː/ trong SCHOOL.' },
  { prompt: 'Which word has the underlined part pronounced like the letters OO in BOOK?', options: ['food', 'good', 'moon', 'school'], answer: 1, explanationVi: '"good" đọc /ʊ/ giống BOOK.' },
  { prompt: 'Which word has the underlined part pronounced differently from the letters OW in SNOW?', options: ['slow', 'cow', 'yellow', 'window'], answer: 1, explanationVi: '"cow" đọc /aʊ/, khác /oʊ/ trong SNOW.' },
  { prompt: 'Which word has the underlined part pronounced like the letters TH in THREE?', options: ['this', 'think', 'mother', 'that'], answer: 1, explanationVi: 'TH trong "think" đọc /θ/ giống THREE; this/mother/that đọc /ð/.' },
  { prompt: 'Which word has the underlined part pronounced differently from the letters CH in CHAIR?', options: ['child', 'school', 'lunch', 'teacher'], answer: 1, explanationVi: 'CH trong "school" đọc /k/, khác /tʃ/ trong CHAIR.' },
  { prompt: 'Which word has the underlined part pronounced like the letter A in CAKE?', options: ['cat', 'name', 'bag', 'car'], answer: 1, explanationVi: 'A trong "name" đọc /eɪ/ giống CAKE.' },
  { prompt: 'Which word has the underlined part pronounced differently from the letters EA in EAT?', options: ['meat', 'sea', 'bread', 'tea'], answer: 2, explanationVi: '"bread" đọc /e/, khác /iː/ trong EAT.' },
];

/** "Chọn phần gạch chân cần sửa" - error correction, G4-5 only. */
export const ERROR_G45: readonly GrammarBankItem[] = [
  { prompt: 'Choose the part that needs correction: I going to school on Mondays.', options: ['I', 'going', 'to school', 'on Mondays'], answer: 1, explanationVi: 'Thiếu trợ động từ: "I am going" hoặc "I go".' },
  { prompt: 'Choose the part that needs correction: She don\'t like apples.', options: ['She', 'don\'t', 'like', 'apples'], answer: 1, explanationVi: 'Ngôi 3 số ít dùng "doesn\'t".' },
  { prompt: 'Choose the part that needs correction: He can sings very well.', options: ['He', 'can', 'sings', 'well'], answer: 2, explanationVi: 'Sau "can" là động từ nguyên mẫu: sing.' },
  { prompt: 'Choose the part that needs correction: There is three books on the desk.', options: ['There is', 'three', 'books', 'on the desk'], answer: 0, explanationVi: '"Three books" số nhiều nên dùng "There are".' },
  { prompt: 'Choose the part that needs correction: We was at home yesterday.', options: ['We', 'was', 'at home', 'yesterday'], answer: 1, explanationVi: '"We" số nhiều nên dùng "were".' },
  { prompt: 'Choose the part that needs correction: I have an dog.', options: ['I', 'have', 'an', 'dog'], answer: 2, explanationVi: '"Dog" bắt đầu bằng phụ âm nên dùng "a".' },
  { prompt: 'Choose the part that needs correction: They is playing football.', options: ['They', 'is', 'playing', 'football'], answer: 1, explanationVi: '"They" đi với "are".' },
  { prompt: 'Choose the part that needs correction: What do you does at break time?', options: ['What', 'do you', 'does', 'break time'], answer: 2, explanationVi: 'Sau "do you" là động từ nguyên mẫu: do.' },
];

/** "Câu nào đúng ngữ pháp?" - which-is-correct selection, G4-5. */
export const CORRECT_G45: readonly GrammarBankItem[] = [
  { prompt: 'Which of the following is CORRECT?', options: ['We cannot skateboarding.', 'Hung is singing at the party now.', 'She go to school by bus.', 'I watching TV now.'], answer: 1, explanationVi: 'Hiện tại tiếp diễn: is singing.' },
  { prompt: 'Which of the following is CORRECT?', options: ['I wants to be a painter.', 'I have Vietnamese and English on Fridays.', 'He don\'t like milk.', 'They is my friends.'], answer: 1, explanationVi: 'Môn học trong thời khóa biểu: have + môn học + on + thứ.' },
  { prompt: 'Which of the following is CORRECT?', options: ['She are my sister.', 'He is taller than me.', 'I is happy.', 'They am students.'], answer: 1, explanationVi: 'So sánh hơn: is taller than.' },
  { prompt: 'Which of the following is CORRECT?', options: ['What time do it start?', 'What time does it start?', 'What time is it starts?', 'What it start?'], answer: 1, explanationVi: 'Hỏi giờ sự kiện: does + ngôi 3 số ít.' },
  { prompt: 'Which of the following is CORRECT?', options: ['Let\'s going to the park.', 'Let\'s goes to the park.', 'Let\'s go to the park.', 'Let\'s to go the park.'], answer: 2, explanationVi: '"Let\'s" + động từ nguyên mẫu.' },
  { prompt: 'Which of the following is CORRECT?', options: ['Would you like some water?', 'Would you like many water?', 'Do you like any waters?', 'Would you likes water?'], answer: 0, explanationVi: '"Would you like" + some + danh từ không đếm được.' },
];

/** Calendar/general-knowledge MCQ in English (observed: months, Women's
 * Day). */
export const FACTS_G45: readonly GrammarBankItem[] = [
  { prompt: 'Which month has thirty-one days?', options: ['September', 'March', 'June', 'November'], answer: 1, explanationVi: 'Tháng 3 có 31 ngày; 9, 6, 11 có 30 ngày.' },
  { prompt: 'Which month has only twenty-eight days?', options: ['February', 'April', 'January', 'October'], answer: 0, explanationVi: 'Tháng 2 có 28 ngày (29 vào năm nhuận).' },
  { prompt: 'Children\'s Day in Vietnam is in ___.', options: ['May', 'June', 'July', 'August'], answer: 1, explanationVi: 'Quốc tế Thiếu nhi 1/6.' },
  { prompt: 'Which season comes after summer?', options: ['spring', 'autumn', 'winter', 'rainy'], answer: 1, explanationVi: 'Sau mùa hè là mùa thu (autumn/fall).' },
  { prompt: 'How many days are there in a week?', options: ['five', 'six', 'seven', 'eight'], answer: 2, explanationVi: 'Một tuần có 7 ngày.' },
];

export function ioeBanksForGrade(gradeId: string): {
  spelling: readonly GrammarBankItem[];
  pronunciation: readonly GrammarBankItem[];
  error: readonly GrammarBankItem[];
  correct: readonly GrammarBankItem[];
  facts: readonly GrammarBankItem[];
} {
  if (gradeId === 'grade-1' || gradeId === 'grade-2') {
    return { spelling: SPELLING_G12, pronunciation: [], error: [], correct: [], facts: [] };
  }
  if (gradeId === 'grade-3') {
    return { spelling: SPELLING_G3, pronunciation: PRONUNCIATION_G3, error: [], correct: [], facts: [] };
  }
  return {
    spelling: SPELLING_G45,
    pronunciation: PRONUNCIATION_G45,
    error: ERROR_G45,
    correct: CORRECT_G45,
    facts: FACTS_G45,
  };
}

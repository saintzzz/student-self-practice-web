/**
 * CR-24 - authored grammar MCQ bank for the Thi thử exam (IOE-style
 * "chọn đáp án đúng điền vào chỗ trống"). Items are hand-written per
 * grade band - this is curriculum content, not generated filler.
 * `prompt` uses "___" for the blank; exactly one option is correct.
 */
export interface GrammarBankItem {
  prompt: string;
  options: readonly [string, string, string, string];
  /** Index into options. */
  answer: 0 | 1 | 2 | 3;
  explanationVi: string;
}

/** Lớp 1-2: to be, have, plurals, simple prepositions. */
export const GRAMMAR_G12: readonly GrammarBankItem[] = [
  { prompt: 'I ___ a student.', options: ['am', 'is', 'are', 'be'], answer: 0, explanationVi: 'I đi với "am".' },
  { prompt: 'She ___ my friend.', options: ['am', 'is', 'are', 'be'], answer: 1, explanationVi: 'She đi với "is".' },
  { prompt: 'They ___ happy.', options: ['am', 'is', 'are', 'be'], answer: 2, explanationVi: 'They đi với "are".' },
  { prompt: 'This ___ my pencil.', options: ['is', 'are', 'am', 'be'], answer: 0, explanationVi: 'This is = đây là.' },
  { prompt: 'I have ___ apple.', options: ['a', 'an', 'two', 'some'], answer: 1, explanationVi: '"Apple" bắt đầu bằng nguyên âm nên dùng "an".' },
  { prompt: 'I have ___ dog.', options: ['a', 'an', 'some', 'two'], answer: 0, explanationVi: '"Dog" bắt đầu bằng phụ âm nên dùng "a".' },
  { prompt: 'These ___ my books.', options: ['is', 'am', 'are', 'be'], answer: 2, explanationVi: 'These (nhiều vật) đi với "are".' },
  { prompt: 'The cat is ___ the table.', options: ['on', 'in', 'at', 'to'], answer: 0, explanationVi: '"On the table" = trên bàn.' },
  { prompt: 'I go ___ school.', options: ['in', 'on', 'to', 'at'], answer: 2, explanationVi: '"Go to school" = đi đến trường.' },
  { prompt: 'How ___ are you? - I am seven.', options: ['old', 'many', 'much', 'tall'], answer: 0, explanationVi: '"How old are you?" = hỏi tuổi.' },
  { prompt: 'Two ___ are on the desk.', options: ['pen', 'pens', 'a pen', 'an pen'], answer: 1, explanationVi: 'Sau "two" dùng danh từ số nhiều "pens".' },
  { prompt: 'I ___ milk every morning.', options: ['drink', 'drinks', 'drinking', 'drank'], answer: 0, explanationVi: 'I đi với động từ nguyên mẫu "drink".' },
  { prompt: 'My mum ___ rice for dinner.', options: ['cook', 'cooks', 'cooking', 'is cook'], answer: 1, explanationVi: 'Ngôi 3 số ít (mum) thêm "s": cooks.' },
  { prompt: '___ is my teacher. - Mrs Lan.', options: ['Who', 'What', 'Where', 'When'], answer: 0, explanationVi: 'Hỏi người dùng "Who".' },
  { prompt: 'I can ___ a bike.', options: ['rides', 'riding', 'ride', 'rode'], answer: 2, explanationVi: 'Sau "can" là động từ nguyên mẫu.' },
  { prompt: 'Do you like cats? - Yes, I ___.', options: ['do', 'does', 'am', 'like'], answer: 0, explanationVi: 'Trả lời "Do you...?" bằng "I do".' },
  { prompt: 'There ___ three birds in the tree.', options: ['is', 'are', 'am', 'be'], answer: 1, explanationVi: '"Three birds" số nhiều nên dùng "are".' },
  { prompt: '___ your name? - My name is Nam.', options: ["What's", "Who's", "Where's", "How's"], answer: 0, explanationVi: '"What is your name?" = hỏi tên.' },
];

/** Lớp 3: thì hiện tại đơn/đơn, like + V-ing, giới từ thời gian, Wh-words. */
export const GRAMMAR_G3: readonly GrammarBankItem[] = [
  { prompt: 'He ___ football every Sunday.', options: ['play', 'plays', 'playing', 'played'], answer: 1, explanationVi: 'Ngôi 3 số ít: plays.' },
  { prompt: 'I like ___ books.', options: ['read', 'reads', 'reading', 'to reading'], answer: 2, explanationVi: '"Like" + V-ing: like reading.' },
  { prompt: '___ do you go to school? - By bike.', options: ['Who', 'How', 'What', 'Where'], answer: 1, explanationVi: 'Hỏi cách/phương tiện dùng "How".' },
  { prompt: 'My birthday is ___ May.', options: ['on', 'at', 'in', 'to'], answer: 2, explanationVi: 'Tháng dùng "in".' },
  { prompt: 'She gets up ___ six o\'clock.', options: ['in', 'on', 'at', 'to'], answer: 2, explanationVi: 'Giờ cụ thể dùng "at".' },
  { prompt: 'There ___ a park near my house.', options: ['is', 'are', 'am', 'be'], answer: 0, explanationVi: '"A park" số ít nên dùng "is".' },
  { prompt: '___ is that? - It\'s my school bag.', options: ['Who', 'What', 'Where', 'How'], answer: 1, explanationVi: 'Hỏi vật dùng "What".' },
  { prompt: 'They ___ swimming now.', options: ['is', 'am', 'are', 'be'], answer: 2, explanationVi: 'Thì hiện tại tiếp diễn: They are + V-ing.' },
  { prompt: 'I ___ watching TV at the moment.', options: ['is', 'am', 'are', 'be'], answer: 1, explanationVi: '"I am" + V-ing.' },
  { prompt: 'Can you swim? - No, I ___.', options: ["don't", "can't", "am not", "doesn't"], answer: 1, explanationVi: 'Trả lời "Can you...?" bằng "I can\'t".' },
  { prompt: 'My father ___ in a hospital.', options: ['work', 'works', 'working', 'is work'], answer: 1, explanationVi: 'Ngôi 3 số ít: works.' },
  { prompt: 'How many ___ do you have? - Two.', options: ['pen', 'pens', 'a pen', 'an pen'], answer: 1, explanationVi: '"How many" + danh từ số nhiều.' },
  { prompt: 'This is ___ eraser.', options: ['a', 'an', 'the', 'some'], answer: 1, explanationVi: '"Eraser" bắt đầu bằng nguyên âm nên dùng "an".' },
  { prompt: 'What ___ you do at break time?', options: ['are', 'is', 'do', 'does'], answer: 2, explanationVi: '"You" đi với trợ động từ "do".' },
  { prompt: 'She ___ to music every day.', options: ['listen', 'listens', 'listening', 'is listen'], answer: 1, explanationVi: 'Ngôi 3 số ít: listens.' },
  { prompt: 'The weather ___ hot in summer.', options: ['are', 'is', 'am', 'be'], answer: 1, explanationVi: '"Weather" số ít nên dùng "is".' },
];

/** Lớp 4-5: thì HTĐ ngôi 3, past simple, future "will/be going to", prepositions nâng cao. */
export const GRAMMAR_G45: readonly GrammarBankItem[] = [
  { prompt: 'Lien ___ lunch at 11:30.', options: ['have got', 'have', 'eat', 'has'], answer: 3, explanationVi: 'Ngôi 3 số ít: has lunch = ăn trưa.' },
  { prompt: 'Her uncle is a pilot. ___ is very busy.', options: ['It', 'They', 'She', 'He'], answer: 3, explanationVi: '"Uncle" là nam nên dùng "He".' },
  { prompt: 'Santa Claus wears ___ clothes.', options: ['red and white', 'blue', 'black', 'yellow and black'], answer: 0, explanationVi: 'Ông già Noel mặc đồ đỏ trắng.' },
  { prompt: 'Yesterday I ___ to the zoo.', options: ['go', 'goes', 'went', 'going'], answer: 2, explanationVi: '"Yesterday" báo quá khứ: went.' },
  { prompt: 'We ___ a picnic next weekend.', options: ['will have', 'have', 'had', 'having'], answer: 0, explanationVi: '"Next weekend" báo tương lai: will have.' },
  { prompt: 'It\'s time ___ breakfast.', options: ['to', 'for', 'at', 'in'], answer: 1, explanationVi: '"It\'s time for + danh từ" = đến giờ ...' },
  { prompt: 'She ___ television last night.', options: ['watch', 'watches', 'watched', 'watching'], answer: 2, explanationVi: '"Last night" báo quá khứ: watched.' },
  { prompt: '___ you at school yesterday? - Yes, I was.', options: ['Was', 'Were', 'Are', 'Did'], answer: 1, explanationVi: 'Quá khứ của "are" là "were".' },
  { prompt: 'He is ___ than his brother.', options: ['tall', 'taller', 'tallest', 'more tall'], answer: 1, explanationVi: 'So sánh hơn: taller.' },
  { prompt: 'This is ___ book in the shop.', options: ['good', 'better', 'the best', 'best'], answer: 2, explanationVi: 'So sánh nhất cần "the": the best.' },
  { prompt: 'My mother is a teacher. ___ works at a school.', options: ['He', 'It', 'She', 'They'], answer: 2, explanationVi: '"Mother" là nữ nên dùng "She".' },
  { prompt: 'I ___ born in 2015.', options: ['am', 'was', 'were', 'be'], answer: 1, explanationVi: '"I was born" = tôi sinh ra (quá khứ).' },
  { prompt: 'They ___ dinner at 7 p.m. yesterday.', options: ['have', 'has', 'had', 'having'], answer: 2, explanationVi: '"Yesterday" báo quá khứ: had.' },
  { prompt: 'There ___ some milk in the fridge.', options: ['is', 'are', 'am', 'be'], answer: 0, explanationVi: '"Milk" không đếm được nên dùng "is".' },
  { prompt: 'What ___ your mother do? - She is a doctor.', options: ['do', 'does', 'is', 'are'], answer: 1, explanationVi: 'Ngôi 3 số ít dùng trợ động từ "does".' },
  { prompt: 'I ___ to Ha Noi last summer.', options: ['travel', 'travels', 'travelled', 'travelling'], answer: 2, explanationVi: '"Last summer" báo quá khứ.' },
  { prompt: '___ are you going to do tonight?', options: ['When', 'Where', 'What', 'Who'], answer: 2, explanationVi: 'Hỏi việc gì dùng "What".' },
  { prompt: 'The boys ___ playing football in the yard now.', options: ['is', 'am', 'are', 'was'], answer: 2, explanationVi: 'Hiện tại tiếp diễn số nhiều: are + V-ing.' },
  // CR-26 - additions mined from a real IOE Cấp Trường G4 exam review.
  { prompt: 'What\'s the ___ today? - It\'s the first of December.', options: ['day', 'date', 'month', 'year'], answer: 1, explanationVi: 'Hỏi ngày trong tháng dùng "What\'s the date?".' },
  { prompt: 'We all like taking photos. We ___ like watching TV.', options: ['are not', 'is not', 'do not', 'does not'], answer: 2, explanationVi: 'Phủ định động từ thường dùng "do not".' },
  { prompt: 'My little sister likes playing ___ a yo-yo.', options: ['some', 'with', 'of', 'for'], answer: 1, explanationVi: '"Play with" + đồ vật = chơi với.' },
  { prompt: 'Please come ___ my birthday party.', options: ['at', 'in', 'to', 'on'], answer: 2, explanationVi: '"Come to" + sự kiện = đến dự.' },
  { prompt: 'Hi, Phuong. This is my friend. Her ___ is Linh.', options: ['school', 'name', 'class', 'house'], answer: 1, explanationVi: '"Her name is" = tên bạn ấy là.' },
  { prompt: 'Henry wants to be ___ English teacher.', options: ['a', 'an', 'the', 'some'], answer: 1, explanationVi: '"English" bắt đầu bằng nguyên âm nên dùng "an".' },
  { prompt: 'They ___ a new kite last weekend.', options: ['are making', 'make', 'made', 'makes'], answer: 2, explanationVi: '"Last weekend" báo quá khứ: made.' },
  { prompt: 'Andy and I often ___ football on Sunday.', options: ['playing', 'plays', 'play', 'played'], answer: 2, explanationVi: 'Chủ ngữ số nhiều (Andy and I) + "often" = hiện tại đơn: play.' },
  { prompt: 'Tom likes ___ in the sea in summer.', options: ['swiming', 'swimming', 'swims', 'swim'], answer: 1, explanationVi: '"Like" + V-ing; "swim" gấp đôi m: swimming.' },
  { prompt: 'July has breakfast at 7 ___.', options: ['clock', 'o\'clock', 'hour', 'time'], answer: 1, explanationVi: 'Giờ tròn đi với "o\'clock".' },
  { prompt: 'I have a lot of ___.', options: ['moneys', 'stamps', 'homeworks', 'sugars'], answer: 1, explanationVi: '"A lot of" + danh từ đếm được số nhiều hoặc không đếm được: stamps.' },
  { prompt: 'Is Vietnamese Women\'s Day in November? - ___', options: ['Yes, it\'s in March.', 'No, it isn\'t. It\'s in October.', 'Yes, it is.', 'No, it\'s in May.'], answer: 1, explanationVi: 'Ngày Phụ nữ Việt Nam là 20/10.' },
  { prompt: 'This is my aunt. She is ___.', options: ['Britain', 'Japan', 'Japanese', 'China'], answer: 2, explanationVi: 'Quốc tịch dùng tính từ: Japanese. Britain/Japan/China là tên nước.' },
  { prompt: 'We ___ TV last night.', options: ['watch', 'watched', 'watching', 'watches'], answer: 1, explanationVi: '"Last night" báo quá khứ: watched.' },
  { prompt: 'Nam ___ his homework every evening.', options: ['do', 'does', 'doing', 'is do'], answer: 1, explanationVi: 'Ngôi 3 số ít: does his homework.' },
  { prompt: 'I ___ to school by bus yesterday.', options: ['go', 'goes', 'went', 'going'], answer: 2, explanationVi: '"Yesterday" báo quá khứ: went.' },
  { prompt: 'There ___ some orange juice in the bottle.', options: ['is', 'are', 'am', 'be'], answer: 0, explanationVi: '"Juice" không đếm được nên dùng "is".' },
  { prompt: 'We are going ___ the museum this Saturday.', options: ['visit', 'visiting', 'to visit', 'visited'], answer: 2, explanationVi: '"Be going to" + động từ nguyên mẫu.' },
  { prompt: 'What time ___ the film start?', options: ['do', 'does', 'is', 'are'], answer: 1, explanationVi: '"The film" ngôi 3 số ít nên dùng "does".' },
  { prompt: 'My brother is ___ than me.', options: ['old', 'older', 'oldest', 'more old'], answer: 1, explanationVi: 'So sánh hơn: older.' },
  { prompt: 'She is the ___ student in my class.', options: ['tall', 'taller', 'tallest', 'most tall'], answer: 2, explanationVi: 'So sánh nhất: the tallest.' },
  { prompt: 'I was ___ home all day yesterday.', options: ['in', 'on', 'at', 'to'], answer: 2, explanationVi: '"At home" = ở nhà.' },
  { prompt: '___ is your favourite subject? - English.', options: ['Who', 'What', 'Where', 'When'], answer: 1, explanationVi: 'Hỏi môn học yêu thích dùng "What".' },
  { prompt: 'My birthday is ___ the fifth of June.', options: ['in', 'at', 'on', 'to'], answer: 2, explanationVi: 'Ngày cụ thể trong tháng dùng "on".' },
  { prompt: 'How ___ is your school bag? - Two hundred thousand dong.', options: ['many', 'much', 'old', 'long'], answer: 1, explanationVi: 'Hỏi giá tiền dùng "How much".' },
  { prompt: 'The children ___ in the park now.', options: ['is playing', 'are playing', 'plays', 'play'], answer: 1, explanationVi: '"Now" + số nhiều: are playing.' },
  { prompt: 'I ___ a letter to my pen friend last week.', options: ['write', 'writes', 'wrote', 'writing'], answer: 2, explanationVi: '"Last week" báo quá khứ: wrote.' },
  { prompt: 'Let\'s ___ to the library.', options: ['goes', 'going', 'go', 'went'], answer: 2, explanationVi: '"Let\'s" + động từ nguyên mẫu.' },
  { prompt: 'Would you like ___ milk? - Yes, please.', options: ['a', 'an', 'some', 'many'], answer: 2, explanationVi: '"Milk" không đếm được nên dùng "some".' },
  { prompt: 'He ___ TV every day.', options: ['watch', 'watches', 'watching', 'is watch'], answer: 1, explanationVi: 'Ngôi 3 số ít: watches.' },
];

export function grammarBankForGrade(gradeId: string): readonly GrammarBankItem[] {
  if (gradeId === 'grade-1' || gradeId === 'grade-2') return GRAMMAR_G12;
  if (gradeId === 'grade-3') return GRAMMAR_G3;
  return GRAMMAR_G45;
}

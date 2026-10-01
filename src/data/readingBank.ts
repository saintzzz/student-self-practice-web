/**
 * CR-24 - authored reading passages for the Thi thử "Đúng/Sai" type.
 * Each passage carries 2 statements so one passage yields 2 questions.
 * Statements are written so `answer` is decidable from the passage alone.
 */
export interface ReadingPassage {
  passage: string;
  statements: readonly { text: string; answer: boolean }[];
  explanationVi: string;
}

export const READING_G12: readonly ReadingPassage[] = [
  {
    passage: 'This is my cat. It is black. It likes fish.',
    statements: [
      { text: 'The cat is black.', answer: true },
      { text: 'The cat likes milk.', answer: false },
    ],
    explanationVi: 'Đoạn nói mèo đen và thích cá.',
  },
  {
    passage: 'My name is Mai. I am seven years old. I go to school by bike.',
    statements: [
      { text: 'Mai is seven years old.', answer: true },
      { text: 'Mai goes to school by bus.', answer: false },
    ],
    explanationVi: 'Mai 7 tuổi và đi xe đạp tới trường.',
  },
  {
    passage: 'I have a dog and two birds. The dog is big. The birds are small.',
    statements: [
      { text: 'I have two dogs.', answer: false },
      { text: 'The birds are small.', answer: true },
    ],
    explanationVi: 'Có 1 chó và 2 chim; chim nhỏ.',
  },
  {
    passage: 'Today is sunny. I play football with my friends in the park.',
    statements: [
      { text: 'It is rainy today.', answer: false },
      { text: 'I play football in the park.', answer: true },
    ],
    explanationVi: 'Trời nắng, chơi bóng ở công viên.',
  },
  {
    passage: 'My room is small. There is a bed, a desk and a chair in it.',
    statements: [
      { text: 'My room is big.', answer: false },
      { text: 'There is a chair in my room.', answer: true },
    ],
    explanationVi: 'Phòng nhỏ, có giường, bàn và ghế.',
  },
  {
    passage: 'I like apples and bananas. I do not like carrots.',
    statements: [
      { text: 'I like bananas.', answer: true },
      { text: 'I like carrots.', answer: false },
    ],
    explanationVi: 'Thích táo, chuối; không thích cà rốt.',
  },
];

export const READING_G3: readonly ReadingPassage[] = [
  {
    passage: 'Every morning, Minh gets up at six o\'clock. He brushes his teeth and has breakfast with his family. Then he walks to school because his house is near it.',
    statements: [
      { text: 'Minh gets up at six o\'clock.', answer: true },
      { text: 'Minh goes to school by bus.', answer: false },
    ],
    explanationVi: 'Minh dậy lúc 6 giờ và đi bộ đến trường.',
  },
  {
    passage: 'There are thirty students in my class: eighteen girls and twelve boys. Our classroom is big and bright.',
    statements: [
      { text: 'There are twelve girls in the class.', answer: false },
      { text: 'The classroom is big.', answer: true },
    ],
    explanationVi: '18 nữ + 12 nam; lớp học rộng và sáng.',
  },
  {
    passage: 'Lan likes reading. She has many books. On Saturdays, she goes to the library with her brother.',
    statements: [
      { text: 'Lan goes to the library on Sundays.', answer: false },
      { text: 'Lan has many books.', answer: true },
    ],
    explanationVi: 'Lan đi thư viện thứ Bảy.',
  },
  {
    passage: 'My school has a big playground and a small garden. We play football in the playground at break time.',
    statements: [
      { text: 'The garden is big.', answer: false },
      { text: 'We play football at break time.', answer: true },
    ],
    explanationVi: 'Sân chơi lớn, vườn nhỏ; chơi bóng giờ ra chơi.',
  },
  {
    passage: 'It is cold in winter. I wear a coat, a scarf and warm shoes. I like hot milk on cold days.',
    statements: [
      { text: 'I wear a T-shirt in winter.', answer: false },
      { text: 'I like hot milk on cold days.', answer: true },
    ],
    explanationVi: 'Mùa đông mặc áo khoác, khăn quàng, giày ấm.',
  },
  {
    passage: 'Nam\'s father is a doctor. He works in a hospital. Nam\'s mother is a teacher. She works in a primary school.',
    statements: [
      { text: 'Nam\'s father works in a school.', answer: false },
      { text: 'Nam\'s mother is a teacher.', answer: true },
    ],
    explanationVi: 'Bố là bác sĩ ở bệnh viện; mẹ là giáo viên.',
  },
];

export const READING_G45: readonly ReadingPassage[] = [
  {
    passage: 'My best friend is Peter. He likes reading books and playing chess. He doesn\'t like football, but he likes swimming in the summer.',
    statements: [
      { text: 'Peter likes playing chess.', answer: true },
      { text: 'Peter likes football.', answer: false },
    ],
    explanationVi: 'Peter thích đọc sách và chơi cờ, không thích bóng đá.',
  },
  {
    passage: 'Last summer, my family went to Da Nang. We stayed in a hotel near the beach. We swam in the sea and ate seafood. I took many photos.',
    statements: [
      { text: 'They stayed near the beach.', answer: true },
      { text: 'They went to Da Nang last winter.', answer: false },
    ],
    explanationVi: 'Đi Đà Nẵng mùa hè, ở khách sạn gần biển.',
  },
  {
    passage: 'The moon moves around the Earth. When the moon is round and bright, we call it a full moon. Children in Viet Nam watch the full moon at the Mid-Autumn Festival.',
    statements: [
      { text: 'A round, bright moon is called a full moon.', answer: true },
      { text: 'The Earth moves around the moon.', answer: false },
    ],
    explanationVi: 'Trăng tròn sáng gọi là trăng rằm; trăng quay quanh Trái Đất.',
  },
  {
    passage: 'Mai gets up early on weekdays. She has breakfast at half past six and goes to school at seven. Her classes finish at four in the afternoon. After school, she does her homework and helps her mum cook dinner.',
    statements: [
      { text: 'Mai has breakfast at 6:30.', answer: true },
      { text: 'Her classes finish at five o\'clock.', answer: false },
    ],
    explanationVi: 'Ăn sáng 6:30, tan học 4 giờ chiều.',
  },
  {
    passage: 'Tet is the biggest festival in Viet Nam. Before Tet, people clean and decorate their houses. Children get lucky money in red envelopes.',
    statements: [
      { text: 'Children get lucky money in blue envelopes.', answer: false },
      { text: 'People decorate their houses before Tet.', answer: true },
    ],
    explanationVi: 'Lì xì trong bao đỏ; dọn nhà trước Tết.',
  },
  {
    passage: 'There are four seasons in a year in the north of Viet Nam: spring, summer, autumn and winter. It is hot in summer and cold in winter. I like autumn best because the weather is cool.',
    statements: [
      { text: 'Autumn weather is cool.', answer: true },
      { text: 'It is cold in summer.', answer: false },
    ],
    explanationVi: 'Mùa thu mát; mùa hè nóng, mùa đông lạnh.',
  },
];

export function readingBankForGrade(gradeId: string): readonly ReadingPassage[] {
  if (gradeId === 'grade-1' || gradeId === 'grade-2') return READING_G12;
  if (gradeId === 'grade-3') return READING_G3;
  return READING_G45;
}

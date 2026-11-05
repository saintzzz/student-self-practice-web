/**
 * CR-126 - leveled story bank for the "Doc truyen" game. Client-side
 * content (lazy with the game chunk) - 3 stories per grade, each with
 * sentences for TTS karaoke, 3 comprehension MCQs, and one key sentence
 * flagged for the read-aloud mic round.
 */

export interface StoryQuiz {
  /** Vietnamese-facing English question. */
  question: string;
  options: readonly [string, string, string];
  /** Index into options. */
  correct: 0 | 1 | 2;
}

export interface Story {
  id: string;
  /** Grade bucket - 'grade-1'..'grade-5'. */
  gradeId: string;
  /** Existing topic_key when the story belongs to one. */
  topicId?: string;
  titleEn: string;
  titleVi: string;
  emoji: string;
  sentences: readonly string[];
  /** Index of the sentence used for the read-aloud mic round. */
  readAloudIdx: number;
  quiz: readonly [StoryQuiz, StoryQuiz, StoryQuiz];
}

export const STORIES: readonly Story[] = [
  // ---- Grade 1 -------------------------------------------------------
  {
    id: 'g1-my-cat',
    gradeId: 'grade-1',
    topicId: 'pets',
    titleEn: 'My Cat',
    titleVi: 'Con mèo của em',
    emoji: '🐱',
    sentences: [
      'I have a cat.',
      'My cat is black and white.',
      'She likes milk.',
      'She sleeps on my bed.',
      'I love my cat.',
    ],
    readAloudIdx: 4,
    quiz: [
      {
        question: 'What color is the cat?',
        options: ['Black and white', 'All black', 'Orange'],
        correct: 0,
      },
      {
        question: 'What does the cat like?',
        options: ['Fish', 'Milk', 'Rice'],
        correct: 1,
      },
      {
        question: 'Where does the cat sleep?',
        options: ['On the floor', 'In the garden', 'On my bed'],
        correct: 2,
      },
    ],
  },
  {
    id: 'g1-red-ball',
    gradeId: 'grade-1',
    topicId: 'toys',
    titleEn: 'The Red Ball',
    titleVi: 'Quả bóng đỏ',
    emoji: '⚽',
    sentences: [
      'I have a ball.',
      'The ball is red.',
      'It is big.',
      'I play with my dog.',
      'We are happy.',
    ],
    readAloudIdx: 4,
    quiz: [
      {
        question: 'What color is the ball?',
        options: ['Blue', 'Red', 'Green'],
        correct: 1,
      },
      {
        question: 'Is the ball big or small?',
        options: ['Big', 'Small', 'Long'],
        correct: 0,
      },
      {
        question: 'Who does the child play with?',
        options: ['A cat', 'A bird', 'A dog'],
        correct: 2,
      },
    ],
  },
  {
    id: 'g1-at-school',
    gradeId: 'grade-1',
    topicId: 'school-objects',
    titleEn: 'At School',
    titleVi: 'Ở trường',
    emoji: '🏫',
    sentences: [
      'This is my school.',
      'I have a blue bag.',
      'My pencil is yellow.',
      'My teacher is kind.',
      'I like my school.',
    ],
    readAloudIdx: 4,
    quiz: [
      {
        question: 'What color is the bag?',
        options: ['Blue', 'Red', 'Yellow'],
        correct: 0,
      },
      {
        question: 'What color is the pencil?',
        options: ['Green', 'Blue', 'Yellow'],
        correct: 2,
      },
      {
        question: 'How is the teacher?',
        options: ['Tall', 'Kind', 'Old'],
        correct: 1,
      },
    ],
  },
  // ---- Grade 2 -------------------------------------------------------
  {
    id: 'g2-lans-birthday',
    gradeId: 'grade-2',
    topicId: 'celebrations',
    titleEn: "Lan's Birthday",
    titleVi: 'Sinh nhật của Lan',
    emoji: '🎂',
    sentences: [
      'Today is Lan\'s birthday.',
      'She is seven years old.',
      'Her friends come to her house.',
      'They eat a big cake.',
      'Lan gets a new doll.',
      'Everyone sings happily.',
    ],
    readAloudIdx: 5,
    quiz: [
      {
        question: 'How old is Lan?',
        options: ['Six', 'Seven', 'Eight'],
        correct: 1,
      },
      {
        question: 'What do they eat?',
        options: ['A big cake', 'Ice cream', 'Candy'],
        correct: 0,
      },
      {
        question: 'What does Lan get?',
        options: ['A ball', 'A book', 'A new doll'],
        correct: 2,
      },
    ],
  },
  {
    id: 'g2-rainy-day',
    gradeId: 'grade-2',
    topicId: 'weather',
    titleEn: 'A Rainy Day',
    titleVi: 'Ngày mưa',
    emoji: '🌧️',
    sentences: [
      'It is raining today.',
      'Minh cannot go to the park.',
      'He stays at home with Mom.',
      'They read a funny book.',
      'Minh draws a rainbow.',
      'He is not sad anymore.',
    ],
    readAloudIdx: 5,
    quiz: [
      {
        question: 'What is the weather like?',
        options: ['Sunny', 'Rainy', 'Windy'],
        correct: 1,
      },
      {
        question: 'Who does Minh stay with?',
        options: ['Dad', 'Mom', 'Grandma'],
        correct: 1,
      },
      {
        question: 'What does Minh draw?',
        options: ['A house', 'The rain', 'A rainbow'],
        correct: 2,
      },
    ],
  },
  {
    id: 'g2-big-dog',
    gradeId: 'grade-2',
    topicId: 'pets',
    titleEn: 'The Big Dog',
    titleVi: 'Chú chó to',
    emoji: '🐕',
    sentences: [
      'Nam has a big dog.',
      'Its name is Vang.',
      'Vang runs very fast.',
      'He likes to eat rice and meat.',
      'Every afternoon, Nam walks Vang.',
      'Vang is Nam\'s best friend.',
    ],
    readAloudIdx: 5,
    quiz: [
      {
        question: 'What is the dog\'s name?',
        options: ['Miu', 'Vang', 'Den'],
        correct: 1,
      },
      {
        question: 'What does Vang like to eat?',
        options: ['Fish', 'Rice and meat', 'Fruit'],
        correct: 1,
      },
      {
        question: 'When does Nam walk Vang?',
        options: ['Every morning', 'Every afternoon', 'Every night'],
        correct: 1,
      },
    ],
  },
  // ---- Grade 3 -------------------------------------------------------
  {
    id: 'g3-zoo-trip',
    gradeId: 'grade-3',
    topicId: 'animals',
    titleEn: 'A Trip to the Zoo',
    titleVi: 'Đi sở thú',
    emoji: '🦁',
    sentences: [
      'Last Sunday, Mai went to the zoo with her dad.',
      'They saw many animals there.',
      'The monkeys were funny and noisy.',
      'The elephants were big and grey.',
      'Mai took photos of the tigers.',
      'It was a wonderful day.',
    ],
    readAloudIdx: 5,
    quiz: [
      {
        question: 'Who did Mai go to the zoo with?',
        options: ['Her mom', 'Her dad', 'Her friend'],
        correct: 1,
      },
      {
        question: 'How were the monkeys?',
        options: ['Funny and noisy', 'Big and grey', 'Slow and quiet'],
        correct: 0,
      },
      {
        question: 'What did Mai take photos of?',
        options: ['The monkeys', 'The elephants', 'The tigers'],
        correct: 2,
      },
    ],
  },
  {
    id: 'g3-lost-pencil',
    gradeId: 'grade-3',
    topicId: 'school-objects',
    titleEn: 'The Lost Pencil',
    titleVi: 'Cây bút chì bị mất',
    emoji: '✏️',
    sentences: [
      'Hoa lost her favorite pencil at school.',
      'It was a pink pencil with a star.',
      'She looked under her desk and in her bag.',
      'Then her friend Nam found it near the door.',
      'Hoa was very happy.',
      'She said thank you to Nam.',
    ],
    readAloudIdx: 5,
    quiz: [
      {
        question: 'What did Hoa lose?',
        options: ['Her bag', 'Her pencil', 'Her book'],
        correct: 1,
      },
      {
        question: 'Who found the pencil?',
        options: ['The teacher', 'Her friend Nam', 'Her mom'],
        correct: 1,
      },
      {
        question: 'Where was the pencil?',
        options: ['Near the door', 'In her bag', 'Under the desk'],
        correct: 0,
      },
    ],
  },
  {
    id: 'g3-family-picnic',
    gradeId: 'grade-3',
    topicId: 'family-members',
    titleEn: 'Our Family Picnic',
    titleVi: 'Buổi dã ngoại gia đình',
    emoji: '🧺',
    sentences: [
      'On Saturday, my family had a picnic in the park.',
      'Mom made sandwiches and orange juice.',
      'Dad flew a kite with my little brother.',
      'I played football with my sister.',
      'We sat under a big tree and ate lunch.',
      'Everyone laughed a lot.',
    ],
    readAloudIdx: 5,
    quiz: [
      {
        question: 'Where did the family have a picnic?',
        options: ['At the beach', 'In the park', 'In the garden'],
        correct: 1,
      },
      {
        question: 'What did Mom make?',
        options: ['Sandwiches and juice', 'Cakes', 'Rice'],
        correct: 0,
      },
      {
        question: 'What did Dad do with the brother?',
        options: ['Played football', 'Flew a kite', 'Read a book'],
        correct: 1,
      },
    ],
  },
  // ---- Grade 4 -------------------------------------------------------
  {
    id: 'g4-clever-rabbit',
    gradeId: 'grade-4',
    topicId: 'animals',
    titleEn: 'The Clever Rabbit',
    titleVi: 'Chú thỏ thông minh',
    emoji: '🐰',
    sentences: [
      'A rabbit lived in the forest.',
      'One day, a hungry lion wanted to eat him.',
      'The rabbit said, "There is a bigger lion near the river."',
      'The lion ran to the river and saw his own face in the water.',
      'He jumped in to fight it and swam away, tired.',
      'The clever rabbit ran home safely.',
    ],
    readAloudIdx: 5,
    quiz: [
      {
        question: 'What did the lion want to do?',
        options: ['Play with the rabbit', 'Eat the rabbit', 'Help the rabbit'],
        correct: 1,
      },
      {
        question: 'What did the lion see in the water?',
        options: ['The rabbit', 'A fish', 'His own face'],
        correct: 2,
      },
      {
        question: 'Why did the lion jump into the river?',
        options: ['To swim', 'To fight the "bigger lion"', 'To catch a fish'],
        correct: 1,
      },
    ],
  },
  {
    id: 'g4-school-garden',
    gradeId: 'grade-4',
    topicId: 'nature',
    titleEn: 'Our School Garden',
    titleVi: 'Vườn trường của em',
    emoji: '🌻',
    sentences: [
      'Our school has a small garden behind the library.',
      'Every Friday, our class works there for an hour.',
      'We plant flowers and water the vegetables.',
      'Some birds come to sing in the trees.',
      'Last month, we picked our first tomatoes.',
      'The garden is our favorite place at school.',
    ],
    readAloudIdx: 5,
    quiz: [
      {
        question: 'Where is the garden?',
        options: ['Behind the library', 'In front of the school', 'On the roof'],
        correct: 0,
      },
      {
        question: 'When does the class work in the garden?',
        options: ['Every Monday', 'Every Friday', 'Every day'],
        correct: 1,
      },
      {
        question: 'What did they pick last month?',
        options: ['Flowers', 'Apples', 'Tomatoes'],
        correct: 2,
      },
    ],
  },
  {
    id: 'g4-tet-holiday',
    gradeId: 'grade-4',
    topicId: 'celebrations',
    titleEn: 'Tet Holiday',
    titleVi: 'Tết Nguyên đán',
    emoji: '🧧',
    sentences: [
      'Tet is the biggest holiday in Vietnam.',
      'Before Tet, my family cleans the house.',
      'Mom cooks banh chung with Grandma.',
      'On New Year\'s Eve, we watch fireworks together.',
      'Children get lucky money in red envelopes.',
      'We visit our grandparents and wish them a happy new year.',
    ],
    readAloudIdx: 5,
    quiz: [
      {
        question: 'What does the family do before Tet?',
        options: ['Go shopping', 'Clean the house', 'Travel'],
        correct: 1,
      },
      {
        question: 'What do children get at Tet?',
        options: ['New toys', 'Lucky money', 'Candies'],
        correct: 1,
      },
      {
        question: 'What do they watch on New Year\'s Eve?',
        options: ['Fireworks', 'A film', 'A football match'],
        correct: 0,
      },
    ],
  },
  // ---- Grade 5 -------------------------------------------------------
  {
    id: 'g5-ant-and-dove',
    gradeId: 'grade-5',
    topicId: 'animals',
    titleEn: 'The Ant and the Dove',
    titleVi: 'Kiến và chim bồ câu',
    emoji: '🐜',
    sentences: [
      'One hot day, an ant fell into a river.',
      'A dove saw her and dropped a leaf into the water.',
      'The ant climbed onto the leaf and floated to the bank.',
      'Later, a hunter tried to catch the dove.',
      'The ant bit the hunter\'s foot, and the dove flew away.',
      'One good turn deserves another.',
    ],
    readAloudIdx: 5,
    quiz: [
      {
        question: 'Who helped the ant first?',
        options: ['A hunter', 'A dove', 'Another ant'],
        correct: 1,
      },
      {
        question: 'How did the dove help the ant?',
        options: ['She gave it food', 'She dropped a leaf', 'She pulled it out'],
        correct: 1,
      },
      {
        question: 'How did the ant help the dove?',
        options: ['She bit the hunter\'s foot', 'She made a loud noise', 'She flew to get help'],
        correct: 0,
      },
    ],
  },
  {
    id: 'g5-letter-from-hanoi',
    gradeId: 'grade-5',
    topicId: 'communication',
    titleEn: 'A Letter from Hanoi',
    titleVi: 'Lá thư từ Hà Nội',
    emoji: '✉️',
    sentences: [
      'Dear Minh, I am writing from Hanoi.',
      'The city is busy but very beautiful.',
      'Yesterday, I visited Hoan Kiem Lake with my uncle.',
      'The water was green and the turtles were big.',
      'I will come home next week with many photos.',
      'I hope you are doing well. Your friend, Duc.',
    ],
    readAloudIdx: 4,
    quiz: [
      {
        question: 'Who wrote the letter?',
        options: ['Minh', 'Duc', 'The uncle'],
        correct: 1,
      },
      {
        question: 'What did Duc visit yesterday?',
        options: ['The zoo', 'Hoan Kiem Lake', 'A museum'],
        correct: 1,
      },
      {
        question: 'When will Duc come home?',
        options: ['Tomorrow', 'Next month', 'Next week'],
        correct: 2,
      },
    ],
  },
  {
    id: 'g5-old-tree',
    gradeId: 'grade-5',
    topicId: 'nature',
    titleEn: 'The Old Tree',
    titleVi: 'Cây cổ thụ',
    emoji: '🌳',
    sentences: [
      'There is a very old tree in our village.',
      'My grandfather played under it when he was a boy.',
      'Its branches give shade to the whole schoolyard.',
      'Birds build their nests there every spring.',
      'Last year, the village decided to protect the tree.',
      'Now a small sign says, "This tree is our friend."',
    ],
    readAloudIdx: 5,
    quiz: [
      {
        question: 'Who played under the tree long ago?',
        options: ['The writer', 'The grandfather', 'The birds'],
        correct: 1,
      },
      {
        question: 'What do the branches give?',
        options: ['Shade', 'Fruit', 'Flowers'],
        correct: 0,
      },
      {
        question: 'What did the village decide to do?',
        options: ['Cut the tree', 'Protect the tree', 'Move the tree'],
        correct: 1,
      },
    ],
  },
];

export function storiesForGrade(gradeId: string): Story[] {
  return STORIES.filter((s) => s.gradeId === gradeId);
}

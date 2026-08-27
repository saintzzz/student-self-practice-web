import type { Grade, Topic, Question } from '../types';

export const GRADES: readonly Grade[] = [
  { id: 'grade-6', name: 'Grade 6' },
  { id: 'grade-7', name: 'Grade 7' },
];

export const TOPICS: readonly Topic[] = [
  { id: 'g6-present-simple', gradeId: 'grade-6', name: 'Present Simple Tense' },
  { id: 'g6-family-vocab', gradeId: 'grade-6', name: 'Vocabulary: Family and Friends' },
  { id: 'g7-past-simple', gradeId: 'grade-7', name: 'Past Simple Tense' },
  { id: 'g7-freetime-vocab', gradeId: 'grade-7', name: 'Vocabulary: Free Time Activities' },
];

export const QUESTIONS: readonly Question[] = [
  // Grade 6, Present Simple Tense
  {
    id: 'q-g6-ps-1',
    topicId: 'g6-present-simple',
    text: 'She ___ to school every day.',
    options: ['walk', 'walks', 'walking', 'walked'],
    correctIndex: 1,
    explanation: 'With third-person singular subjects like "she", the present simple verb takes an -s ending, so "walks" is correct.',
  },
  {
    id: 'q-g6-ps-2',
    topicId: 'g6-present-simple',
    text: 'They ___ football on weekends.',
    options: ['plays', 'play', 'playing', 'played'],
    correctIndex: 1,
    explanation: 'With plural subjects like "they", the present simple verb keeps its base form, so "play" is correct.',
  },
  {
    id: 'q-g6-ps-3',
    topicId: 'g6-present-simple',
    text: 'Choose the correct negative form: He ___ like vegetables.',
    options: ['not like', "doesn't like", "don't like", 'no like'],
    correctIndex: 1,
    explanation: 'Third-person singular negatives use "doesn\'t" plus the base verb, so "doesn\'t like" is correct.',
  },
  {
    id: 'q-g6-ps-4',
    topicId: 'g6-present-simple',
    text: 'Choose the correct question form: ___ you like tea?',
    options: ['Do', 'Does', 'Are', 'Is'],
    correctIndex: 0,
    explanation: 'Present simple yes/no questions with "you" start with "Do", so "Do" is correct.',
  },
  // Grade 6, Vocabulary: Family and Friends
  {
    id: 'q-g6-fam-1',
    topicId: 'g6-family-vocab',
    text: "Your mother's sister is your ___.",
    options: ['cousin', 'aunt', 'niece', 'grandmother'],
    correctIndex: 1,
    explanation: 'The sister of your mother is called your "aunt".',
  },
  {
    id: 'q-g6-fam-2',
    topicId: 'g6-family-vocab',
    text: "Your father's father is your ___.",
    options: ['uncle', 'grandfather', 'brother', 'nephew'],
    correctIndex: 1,
    explanation: "Your father's father is your \"grandfather\".",
  },
  {
    id: 'q-g6-fam-3',
    topicId: 'g6-family-vocab',
    text: 'A person you know and like, but who is not part of your family, is called a ___.',
    options: ['sibling', 'relative', 'friend', 'parent'],
    correctIndex: 2,
    explanation: 'A "friend" is someone you know and like who is not a family member.',
  },
  {
    id: 'q-g6-fam-4',
    topicId: 'g6-family-vocab',
    text: "Your brother's daughter is your ___.",
    options: ['niece', 'nephew', 'cousin', 'sister'],
    correctIndex: 0,
    explanation: "Your brother's daughter is your \"niece\".",
  },
  // Grade 7, Past Simple Tense
  {
    id: 'q-g7-pst-1',
    topicId: 'g7-past-simple',
    text: 'Yesterday, I ___ my homework before dinner.',
    options: ['finish', 'finishes', 'finished', 'finishing'],
    correctIndex: 2,
    explanation: 'The regular past simple form of "finish" adds -ed, giving "finished".',
  },
  {
    id: 'q-g7-pst-2',
    topicId: 'g7-past-simple',
    text: 'Choose the correct irregular past form: She ___ to Paris last summer.',
    options: ['goed', 'went', 'gone', 'go'],
    correctIndex: 1,
    explanation: 'The irregular past simple form of "go" is "went".',
  },
  {
    id: 'q-g7-pst-3',
    topicId: 'g7-past-simple',
    text: 'Choose the correct negative form: We ___ watch the movie last night.',
    options: ["doesn't", "don't", "didn't", 'not'],
    correctIndex: 2,
    explanation: 'Past simple negatives use "didn\'t" plus the base verb, so "didn\'t" is correct.',
  },
  {
    id: 'q-g7-pst-4',
    topicId: 'g7-past-simple',
    text: 'Choose the correct question form: ___ you visit your grandparents last week?',
    options: ['Do', 'Does', 'Did', 'Were'],
    correctIndex: 2,
    explanation: 'Past simple yes/no questions start with "Did" plus the base verb.',
  },
  // Grade 7, Vocabulary: Free Time Activities
  {
    id: 'q-g7-ft-1',
    topicId: 'g7-freetime-vocab',
    text: 'Reading books, playing games, and watching movies are examples of ___ activities.',
    options: ['school', 'leisure', 'work', 'chore'],
    correctIndex: 1,
    explanation: 'Activities done for enjoyment in free time are called "leisure" activities.',
  },
  {
    id: 'q-g7-ft-2',
    topicId: 'g7-freetime-vocab',
    text: 'A person who enjoys painting and drawing in their free time has ___ as a hobby.',
    options: ['sports', 'art', 'cooking', 'gardening'],
    correctIndex: 1,
    explanation: 'Painting and drawing are activities that belong to the hobby category "art".',
  },
  {
    id: 'q-g7-ft-3',
    topicId: 'g7-freetime-vocab',
    text: 'Playing badminton with friends after school is an example of a ___ activity.',
    options: ['physical', 'academic', 'household', 'solitary'],
    correctIndex: 0,
    explanation: 'Playing a sport like badminton is a "physical" activity.',
  },
  {
    id: 'q-g7-ft-4',
    topicId: 'g7-freetime-vocab',
    text: 'Collecting stamps or coins as a free-time interest is called a ___.',
    options: ['job', 'hobby', 'subject', 'duty'],
    correctIndex: 1,
    explanation: 'A free-time interest such as collecting stamps or coins is called a "hobby".',
  },
];

export function getTopicsByGrade(gradeId: string): Topic[] {
  return TOPICS.filter((topic) => topic.gradeId === gradeId);
}

export function getQuestionsByTopic(topicId: string): Question[] {
  return QUESTIONS.filter((question) => question.topicId === topicId);
}

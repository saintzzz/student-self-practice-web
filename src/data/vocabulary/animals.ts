import type { Topic, VocabWord } from '../../types';

export const ANIMALS_TOPIC: Topic = { id: 'g2-animals', gradeId: 'grade-2', name: 'Con vật' };

const t = ANIMALS_TOPIC.id;

export const ANIMALS_WORDS: VocabWord[] = [
  { id: 'cat', topicId: t, word: 'cat', plural: 'cats', emoji: '🐱', countable: true, explanation: 'Con mèo tiếng Anh là "cat".' },
  { id: 'dog', topicId: t, word: 'dog', plural: 'dogs', emoji: '🐶', countable: true, explanation: 'Con chó tiếng Anh là "dog".' },
  { id: 'fish', topicId: t, word: 'fish', plural: 'fish', emoji: '🐟', countable: true, explanation: 'Con cá tiếng Anh là "fish".' },
  { id: 'bird', topicId: t, word: 'bird', plural: 'birds', emoji: '🐦', countable: true, explanation: 'Con chim tiếng Anh là "bird".' },
  { id: 'rabbit', topicId: t, word: 'rabbit', plural: 'rabbits', emoji: '🐰', countable: true, explanation: 'Con thỏ tiếng Anh là "rabbit".' },
  { id: 'elephant', topicId: t, word: 'elephant', plural: 'elephants', emoji: '🐘', countable: true, explanation: 'Con voi tiếng Anh là "elephant".' },
  { id: 'lion', topicId: t, word: 'lion', plural: 'lions', emoji: '🦁', countable: true, explanation: 'Con sư tử tiếng Anh là "lion".' },
  { id: 'tiger', topicId: t, word: 'tiger', plural: 'tigers', emoji: '🐯', countable: true, explanation: 'Con hổ tiếng Anh là "tiger".' },
  { id: 'cow', topicId: t, word: 'cow', plural: 'cows', emoji: '🐄', countable: true, explanation: 'Con bò tiếng Anh là "cow".' },
  { id: 'pig', topicId: t, word: 'pig', plural: 'pigs', emoji: '🐷', countable: true, explanation: 'Con lợn tiếng Anh là "pig".' },
  { id: 'duck', topicId: t, word: 'duck', plural: 'ducks', emoji: '🦆', countable: true, explanation: 'Con vịt tiếng Anh là "duck".' },
  { id: 'monkey', topicId: t, word: 'monkey', plural: 'monkeys', emoji: '🐵', countable: true, explanation: 'Con khỉ tiếng Anh là "monkey".' },
  { id: 'horse', topicId: t, word: 'horse', plural: 'horses', emoji: '🐴', countable: true, explanation: 'Con ngựa tiếng Anh là "horse".' },
  { id: 'bear', topicId: t, word: 'bear', plural: 'bears', emoji: '🐻', countable: true, explanation: 'Con gấu tiếng Anh là "bear".' },
  { id: 'frog', topicId: t, word: 'frog', plural: 'frogs', emoji: '🐸', countable: true, explanation: 'Con ếch tiếng Anh là "frog".' },
  { id: 'chicken', topicId: t, word: 'chicken', plural: 'chickens', emoji: '🐔', countable: true, explanation: 'Con gà tiếng Anh là "chicken".' },
];

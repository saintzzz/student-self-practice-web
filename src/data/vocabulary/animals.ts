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
  { id: 'owl', topicId: t, word: 'owl', plural: 'owls', emoji: '🦉', countable: true, explanation: 'Con cú tiếng Anh là "owl".' },
  { id: 'snake', topicId: t, word: 'snake', plural: 'snakes', emoji: '🐍', countable: true, explanation: 'Con rắn tiếng Anh là "snake".' },
  { id: 'sheep', topicId: t, word: 'sheep', plural: 'sheep', emoji: '🐑', countable: true, explanation: 'Con cừu tiếng Anh là "sheep".' },
  { id: 'goat', topicId: t, word: 'goat', plural: 'goats', emoji: '🐐', countable: true, explanation: 'Con dê tiếng Anh là "goat".' },
  { id: 'camel', topicId: t, word: 'camel', plural: 'camels', emoji: '🐫', countable: true, explanation: 'Con lạc đà tiếng Anh là "camel".' },
  { id: 'kangaroo', topicId: t, word: 'kangaroo', plural: 'kangaroos', emoji: '🦘', countable: true, explanation: 'Con chuột túi tiếng Anh là "kangaroo".' },
  { id: 'penguin', topicId: t, word: 'penguin', plural: 'penguins', emoji: '🐧', countable: true, explanation: 'Chim cánh cụt tiếng Anh là "penguin".' },
  { id: 'squirrel', topicId: t, word: 'squirrel', plural: 'squirrels', emoji: '🐿️', countable: true, explanation: 'Con sóc tiếng Anh là "squirrel".' },
  { id: 'hedgehog', topicId: t, word: 'hedgehog', plural: 'hedgehogs', emoji: '🦔', countable: true, explanation: 'Con nhím tiếng Anh là "hedgehog".' },
  { id: 'koala', topicId: t, word: 'koala', plural: 'koalas', emoji: '🐨', countable: true, explanation: 'Gấu túi koala tiếng Anh là "koala".' },
  { id: 'panda', topicId: t, word: 'panda', plural: 'pandas', emoji: '🐼', countable: true, explanation: 'Gấu trúc tiếng Anh là "panda".' },
  { id: 'zebra', topicId: t, word: 'zebra', plural: 'zebras', emoji: '🦓', countable: true, explanation: 'Con ngựa vằn tiếng Anh là "zebra".' },
  { id: 'fox', topicId: t, word: 'fox', plural: 'foxes', emoji: '🦊', countable: true, explanation: 'Con cáo tiếng Anh là "fox".' },
  { id: 'wolf', topicId: t, word: 'wolf', plural: 'wolves', emoji: '🐺', countable: true, explanation: 'Con sói tiếng Anh là "wolf".' },
  { id: 'mouse', topicId: t, word: 'mouse', plural: 'mice', emoji: '🐭', countable: true, explanation: 'Con chuột tiếng Anh là "mouse".' },
  { id: 'deer', topicId: t, word: 'deer', plural: 'deer', emoji: '🦌', countable: true, explanation: 'Con hươu tiếng Anh là "deer".' },
  { id: 'peacock', topicId: t, word: 'peacock', plural: 'peacocks', emoji: '🦚', countable: true, explanation: 'Con công tiếng Anh là "peacock".' },
  { id: 'parrot', topicId: t, word: 'parrot', plural: 'parrots', emoji: '🦜', countable: true, explanation: 'Con vẹt tiếng Anh là "parrot".' },
  { id: 'swan', topicId: t, word: 'swan', plural: 'swans', emoji: '🦢', countable: true, explanation: 'Con thiên nga tiếng Anh là "swan".' },
  // v5 vocabulary additions (plan.md "v5 Research-Grounded Content" - Cambridge
  // Starters/textbook sourced). "frog", "goat", "monkey", "tiger", "snake",
  // "parrot", "duck", "pig", "cow" and "mouse" were also on the approved list
  // but already exist above and were skipped to avoid duplicates.
  { id: 'crocodile', topicId: t, word: 'crocodile', plural: 'crocodiles', emoji: '🐊', countable: true, explanation: 'Con cá sấu tiếng Anh là "crocodile".' },
  { id: 'giraffe', topicId: t, word: 'giraffe', plural: 'giraffes', emoji: '🦒', countable: true, explanation: 'Con hươu cao cổ tiếng Anh là "giraffe".' },
  { id: 'hippo', topicId: t, word: 'hippo', plural: 'hippos', emoji: '🦛', countable: true, explanation: 'Con hà mã tiếng Anh là "hippo".' },
  { id: 'lizard', topicId: t, word: 'lizard', plural: 'lizards', emoji: '🦎', countable: true, explanation: 'Con thằn lằn tiếng Anh là "lizard".' },
];

import type { Grade, Topic, VocabWord } from '../../types';
import { ANIMALS_TOPIC, ANIMALS_WORDS } from './animals';
import { COLORS_TOPIC, COLORS_WORDS } from './colors';
import { NUMBERS_TOPIC, NUMBERS_WORDS } from './numbers';
import { FRUITS_TOPIC, FRUITS_WORDS } from './fruits';
import { SCHOOL_OBJECTS_TOPIC, SCHOOL_OBJECTS_WORDS } from './schoolObjects';
import { FAMILY_TOPIC, FAMILY_WORDS } from './family';
import { BODY_PARTS_TOPIC, BODY_PARTS_WORDS } from './bodyParts';
import { WEATHER_TOPIC, WEATHER_WORDS } from './weather';
import { CLOTHES_TOPIC, CLOTHES_WORDS } from './clothes';
import { TOYS_TOPIC, TOYS_WORDS } from './toys';
import { TRANSPORTATION_TOPIC, TRANSPORTATION_WORDS } from './transportation';
import { SHAPES_TOPIC, SHAPES_WORDS } from './shapes';
import { FOOD_TOPIC, FOOD_WORDS } from './food';
import { FEELINGS_TOPIC, FEELINGS_WORDS } from './feelings';

/** Single grade for this MVP, per mvp-decisions.md (Grade 2 only). */
export const GRADES: readonly Grade[] = [{ id: 'grade-2', name: 'Lớp 2' }];

/**
 * 14 curated topics (AC11 requires >= 10). Each topic's words all have a
 * clear single-emoji representation; some plan.md candidate words were
 * dropped where no unambiguous single emoji exists (e.g. "rooms in a
 * house" has no clean per-room emoji).
 */
export const TOPICS: readonly Topic[] = [
  ANIMALS_TOPIC,
  COLORS_TOPIC,
  NUMBERS_TOPIC,
  FRUITS_TOPIC,
  SCHOOL_OBJECTS_TOPIC,
  FAMILY_TOPIC,
  BODY_PARTS_TOPIC,
  WEATHER_TOPIC,
  CLOTHES_TOPIC,
  TOYS_TOPIC,
  TRANSPORTATION_TOPIC,
  SHAPES_TOPIC,
  FOOD_TOPIC,
  FEELINGS_TOPIC,
];

const WORDS_BY_TOPIC: Record<string, VocabWord[]> = {
  [ANIMALS_TOPIC.id]: ANIMALS_WORDS,
  [COLORS_TOPIC.id]: COLORS_WORDS,
  [NUMBERS_TOPIC.id]: NUMBERS_WORDS,
  [FRUITS_TOPIC.id]: FRUITS_WORDS,
  [SCHOOL_OBJECTS_TOPIC.id]: SCHOOL_OBJECTS_WORDS,
  [FAMILY_TOPIC.id]: FAMILY_WORDS,
  [BODY_PARTS_TOPIC.id]: BODY_PARTS_WORDS,
  [WEATHER_TOPIC.id]: WEATHER_WORDS,
  [CLOTHES_TOPIC.id]: CLOTHES_WORDS,
  [TOYS_TOPIC.id]: TOYS_WORDS,
  [TRANSPORTATION_TOPIC.id]: TRANSPORTATION_WORDS,
  [SHAPES_TOPIC.id]: SHAPES_WORDS,
  [FOOD_TOPIC.id]: FOOD_WORDS,
  [FEELINGS_TOPIC.id]: FEELINGS_WORDS,
};

export const ALL_WORDS: readonly VocabWord[] = Object.values(WORDS_BY_TOPIC).flat();

export function getTopicsByGrade(gradeId: string): Topic[] {
  return TOPICS.filter((topic) => topic.gradeId === gradeId);
}

export function getWordsByTopic(topicId: string): VocabWord[] {
  return WORDS_BY_TOPIC[topicId] ?? [];
}

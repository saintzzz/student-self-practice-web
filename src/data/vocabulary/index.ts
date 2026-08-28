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
import { ACTIONS_TOPIC, ACTIONS_WORDS } from './actions';
import { NATURE_TOPIC, NATURE_WORDS } from './nature';
import { OCCUPATIONS_TOPIC, OCCUPATIONS_WORDS } from './occupations';
import { SPORTS_TOPIC, SPORTS_WORDS } from './sports';
import { INSTRUMENTS_TOPIC, INSTRUMENTS_WORDS } from './instruments';
import { INSECTS_TOPIC, INSECTS_WORDS } from './insects';
import { SEA_CREATURES_TOPIC, SEA_CREATURES_WORDS } from './seaCreatures';
import { VEGETABLES_TOPIC, VEGETABLES_WORDS } from './vegetables';
import { FURNITURE_TOPIC, FURNITURE_WORDS } from './furniture';
import { PLACES_TOPIC, PLACES_WORDS } from './places';

/** Single grade for this MVP, per mvp-decisions.md (Grade 2 only). */
export const GRADES: readonly Grade[] = [{ id: 'grade-2', name: 'Lớp 2' }];

/**
 * 24 curated topics (AC11 requires >= 10; expanded from 14 per the
 * vocabulary-bank-expansion follow-up request - see
 * plans/reports/engineer-260828-student-self-practice-vocab-expansion.md;
 * "Places" added per the v5 curriculum research workflow - see
 * plans/reports/engineer-260828-student-self-practice-v5-vocab.md).
 * Each topic's words all have a clear single-emoji representation; candidate
 * words without one (e.g. "jump", a per-room emoji, two-digit numbers,
 * additional family relations, additional shapes) were deliberately dropped
 * rather than padded in - see the per-topic file comments for specifics.
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
  ACTIONS_TOPIC,
  NATURE_TOPIC,
  OCCUPATIONS_TOPIC,
  SPORTS_TOPIC,
  INSTRUMENTS_TOPIC,
  INSECTS_TOPIC,
  SEA_CREATURES_TOPIC,
  VEGETABLES_TOPIC,
  FURNITURE_TOPIC,
  PLACES_TOPIC,
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
  [ACTIONS_TOPIC.id]: ACTIONS_WORDS,
  [NATURE_TOPIC.id]: NATURE_WORDS,
  [OCCUPATIONS_TOPIC.id]: OCCUPATIONS_WORDS,
  [SPORTS_TOPIC.id]: SPORTS_WORDS,
  [INSTRUMENTS_TOPIC.id]: INSTRUMENTS_WORDS,
  [INSECTS_TOPIC.id]: INSECTS_WORDS,
  [SEA_CREATURES_TOPIC.id]: SEA_CREATURES_WORDS,
  [VEGETABLES_TOPIC.id]: VEGETABLES_WORDS,
  [FURNITURE_TOPIC.id]: FURNITURE_WORDS,
  [PLACES_TOPIC.id]: PLACES_WORDS,
};

export const ALL_WORDS: readonly VocabWord[] = Object.values(WORDS_BY_TOPIC).flat();

export function getTopicsByGrade(gradeId: string): Topic[] {
  return TOPICS.filter((topic) => topic.gradeId === gradeId);
}

export function getWordsByTopic(topicId: string): VocabWord[] {
  return WORDS_BY_TOPIC[topicId] ?? [];
}

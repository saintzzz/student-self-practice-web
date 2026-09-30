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
import { PARTY_TOPIC, PARTY_WORDS } from './party';
import { SEASIDE_TOPIC, SEASIDE_WORDS } from './seaside';
import { KITCHEN_TOPIC, KITCHEN_WORDS } from './kitchen';
import { CAMPING_TOPIC, CAMPING_WORDS } from './camping';
import { G1_SCHOOL_THINGS_TOPIC, G1_SCHOOL_THINGS_WORDS } from './g1/schoolThings';
import { G1_NUMBERS_TOPIC, G1_NUMBERS_WORDS } from './g1/numbers';
import { G1_COLORS_TOPIC, G1_COLORS_WORDS } from './g1/colors';
import { G1_FAMILY_TOPIC, G1_FAMILY_WORDS } from './g1/family';
import { G1_PETS_TOPIC, G1_PETS_WORDS } from './g1/pets';
import { G1_TOYS_TOPIC, G1_TOYS_WORDS } from './g1/toys';
import { G1_BODY_TOPIC, G1_BODY_WORDS } from './g1/body';
import { G1_FOOD_TOPIC, G1_FOOD_WORDS } from './g1/food';
import { G3_SCHOOL_THINGS_TOPIC, G3_SCHOOL_THINGS_WORDS } from './g3/schoolThings';
import { G3_CLASSROOM_ACTIONS_TOPIC, G3_CLASSROOM_ACTIONS_WORDS } from './g3/classroomActions';
import { G3_BODY_PARTS_TOPIC, G3_BODY_PARTS_WORDS } from './g3/bodyParts';
import { G3_HOBBIES_TOPIC, G3_HOBBIES_WORDS } from './g3/hobbies';
import { G3_COLOURS_TOPIC, G3_COLOURS_WORDS } from './g3/colours';
import { G3_PETS_TOPIC, G3_PETS_WORDS } from './g3/pets';
import { G3_TOYS_TOPIC, G3_TOYS_WORDS } from './g3/toys';
import { G3_FAMILY_TOPIC, G3_FAMILY_WORDS } from './g3/family';
import { G3_JOBS_TOPIC, G3_JOBS_WORDS } from './g3/jobs';
import { G3_ROOMS_TOPIC, G3_ROOMS_WORDS } from './g3/rooms';
import { G3_DINING_TOPIC, G3_DINING_WORDS } from './g3/dining';
import { G3_ZOO_TOPIC, G3_ZOO_WORDS } from './g3/zoo';
import { G3_SPORTS_GAMES_TOPIC, G3_SPORTS_GAMES_WORDS } from './g3/sportsGames';
import { G3_WEATHER_TOPIC, G3_WEATHER_WORDS } from './g3/weather';
import { G3_CLOTHES_TOPIC, G3_CLOTHES_WORDS } from './g3/clothes';
import { G4_DAILY_ROUTINE_TOPIC, G4_DAILY_ROUTINE_WORDS } from './g4/dailyRoutine';
import { G4_SUBJECTS_TOPIC, G4_SUBJECTS_WORDS } from './g4/subjects';
import { G4_SEASONS_TOPIC, G4_SEASONS_WORDS } from './g4/seasons';
import { G4_CITY_PLACES_TOPIC, G4_CITY_PLACES_WORDS } from './g4/cityPlaces';
import { G4_SPORTS_DAY_TOPIC, G4_SPORTS_DAY_WORDS } from './g4/sportsDay';
import { G4_ABILITIES_TOPIC, G4_ABILITIES_WORDS } from './g4/abilities';
import { G4_BIRTHDAY_TOPIC, G4_BIRTHDAY_WORDS } from './g4/birthday';
import { G4_HOMES_TOPIC, G4_HOMES_WORDS } from './g4/homes';
import { G4_JOBS_TOPIC, G4_JOBS_WORDS } from './g4/jobs';
import { G4_WEEKEND_TOPIC, G4_WEEKEND_WORDS } from './g4/weekend';
import { G4_SUMMER_CAMP_TOPIC, G4_SUMMER_CAMP_WORDS } from './g4/summerCamp';
import { G4_WILD_ANIMALS_TOPIC, G4_WILD_ANIMALS_WORDS } from './g4/wildAnimals';
import { G4_SHOPPING_TOPIC, G4_SHOPPING_WORDS } from './g4/shopping';
import { G4_FACILITIES_TOPIC, G4_FACILITIES_WORDS } from './g4/facilities';
import { G4_LUNCH_FOODS_TOPIC, G4_LUNCH_FOODS_WORDS } from './g4/lunchFoods';
import { G5_COUNTRIES_TOPIC, G5_COUNTRIES_WORDS } from './g5/countries';
import { G5_FUTURE_JOBS_TOPIC, G5_FUTURE_JOBS_WORDS } from './g5/futureJobs';
import { G5_CLUB_ACTIVITIES_TOPIC, G5_CLUB_ACTIVITIES_WORDS } from './g5/clubActivities';
import { G5_TET_TOPIC, G5_TET_WORDS } from './g5/tet';
import { G5_HEALTH_TOPIC, G5_HEALTH_WORDS } from './g5/health';
import { G5_STORIES_TOPIC, G5_STORIES_WORDS } from './g5/stories';
import { G5_TRANSPORT_TOPIC, G5_TRANSPORT_WORDS } from './g5/transport';
import { G5_PLACES_TOPIC, G5_PLACES_WORDS } from './g5/places';
import { G5_FAMILY_TIME_TOPIC, G5_FAMILY_TIME_WORDS } from './g5/familyTime';
import { G5_SCHOOL_TRIPS_TOPIC, G5_SCHOOL_TRIPS_WORDS } from './g5/schoolTrips';
import { G5_CLASSROOM_TOPIC, G5_CLASSROOM_WORDS } from './g5/classroom';
import { G5_FREE_TIME_TOPIC, G5_FREE_TIME_WORDS } from './g5/freeTime';
import { G5_SPECIAL_DAYS_TOPIC, G5_SPECIAL_DAYS_WORDS } from './g5/specialDays';
import { G1_XP_ANIMALS_TOPIC, G1_XP_ANIMALS_WORDS, G1_XP_NATURE_TOPIC, G1_XP_NATURE_WORDS, G1_XP_THINGS_TOPIC, G1_XP_THINGS_WORDS } from './g1/xp';
import {
  G3_XP_ANIMALS_TOPIC, G3_XP_ANIMALS_WORDS, G3_XP_FEELINGS_TOPIC, G3_XP_FEELINGS_WORDS,
  G3_XP_FOOD_TOPIC, G3_XP_FOOD_WORDS, G3_XP_PEOPLE_TOPIC, G3_XP_PEOPLE_WORDS,
  G3_XP_PLACES_TOPIC, G3_XP_PLACES_WORDS, G3_XP_SPORTS_TOPIC, G3_XP_SPORTS_WORDS,
  G3_XP_TRANSPORT_TOPIC, G3_XP_TRANSPORT_WORDS,
} from './g3/xp';
import {
  G4_XP_FLAGS_EUROPE_TOPIC, G4_XP_FLAGS_EUROPE_WORDS, G4_XP_GESTURES_TOPIC, G4_XP_GESTURES_WORDS,
  G4_XP_HEALTH_TOPIC, G4_XP_HEALTH_WORDS, G4_XP_NATURE_TOPIC, G4_XP_NATURE_WORDS,
  G4_XP_OBJECTS_TOPIC, G4_XP_OBJECTS_WORDS, G4_XP_SIGNS_TOPIC, G4_XP_SIGNS_WORDS,
  G4_XP_TECH_TOPIC, G4_XP_TECH_WORDS, G4_XP_TIME_TOPIC, G4_XP_TIME_WORDS,
} from './g4/xp';
import {
  G5_XP_ADVANCED_TOPIC, G5_XP_ADVANCED_WORDS, G5_XP_FLAGS_AFRICA_TOPIC, G5_XP_FLAGS_AFRICA_WORDS,
  G5_XP_FLAGS_AMERICAS_TOPIC, G5_XP_FLAGS_AMERICAS_WORDS, G5_XP_FLAGS_ASIA_TOPIC, G5_XP_FLAGS_ASIA_WORDS,
  G5_XP_FLAGS_OCEANIA_TOPIC, G5_XP_FLAGS_OCEANIA_WORDS,
} from './g5/xp';

/** CR-07: full primary coverage - all five elementary grades. */
export const GRADES: readonly Grade[] = [
  { id: 'grade-1', name: 'Lớp 1' },
  { id: 'grade-2', name: 'Lớp 2' },
  { id: 'grade-3', name: 'Lớp 3' },
  { id: 'grade-4', name: 'Lớp 4' },
  { id: 'grade-5', name: 'Lớp 5' },
];

/**
 * 28 curated topics (AC11 requires >= 10; expanded from 14 per the
 * vocabulary-bank-expansion follow-up request - see
 * plans/reports/engineer-260828-student-self-practice-vocab-expansion.md;
 * "Places" added per the v5 curriculum research workflow - see
 * plans/reports/engineer-260828-student-self-practice-v5-vocab.md; +4 SGK
 * gap topics - party, seaside, kitchen, camping - per docs/sdlc/prd.md
 * section 7).
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
  PARTY_TOPIC,
  SEASIDE_TOPIC,
  KITCHEN_TOPIC,
  CAMPING_TOPIC,
  G1_SCHOOL_THINGS_TOPIC,
  G1_NUMBERS_TOPIC,
  G1_COLORS_TOPIC,
  G1_FAMILY_TOPIC,
  G1_PETS_TOPIC,
  G1_TOYS_TOPIC,
  G1_BODY_TOPIC,
  G1_FOOD_TOPIC,
  G3_SCHOOL_THINGS_TOPIC,
  G3_CLASSROOM_ACTIONS_TOPIC,
  G3_BODY_PARTS_TOPIC,
  G3_HOBBIES_TOPIC,
  G3_COLOURS_TOPIC,
  G3_PETS_TOPIC,
  G3_TOYS_TOPIC,
  G3_FAMILY_TOPIC,
  G3_JOBS_TOPIC,
  G3_ROOMS_TOPIC,
  G3_DINING_TOPIC,
  G3_ZOO_TOPIC,
  G3_SPORTS_GAMES_TOPIC,
  G3_WEATHER_TOPIC,
  G3_CLOTHES_TOPIC,
  G4_DAILY_ROUTINE_TOPIC,
  G4_SUBJECTS_TOPIC,
  G4_SEASONS_TOPIC,
  G4_CITY_PLACES_TOPIC,
  G4_SPORTS_DAY_TOPIC,
  G4_ABILITIES_TOPIC,
  G4_BIRTHDAY_TOPIC,
  G4_HOMES_TOPIC,
  G4_JOBS_TOPIC,
  G4_WEEKEND_TOPIC,
  G4_SUMMER_CAMP_TOPIC,
  G4_WILD_ANIMALS_TOPIC,
  G4_SHOPPING_TOPIC,
  G4_FACILITIES_TOPIC,
  G4_LUNCH_FOODS_TOPIC,
  G5_COUNTRIES_TOPIC,
  G5_FUTURE_JOBS_TOPIC,
  G5_CLUB_ACTIVITIES_TOPIC,
  G5_TET_TOPIC,
  G5_HEALTH_TOPIC,
  G5_STORIES_TOPIC,
  G5_TRANSPORT_TOPIC,
  G5_PLACES_TOPIC,
  G5_FAMILY_TIME_TOPIC,
  G5_SCHOOL_TRIPS_TOPIC,
  G5_CLASSROOM_TOPIC,
  G5_FREE_TIME_TOPIC,
  G5_SPECIAL_DAYS_TOPIC,
  // CR-15 expansion pack - emoji-unique words across g1/g3/g4/g5 (R-G2
  // keeps the grade-2 bank frozen). Flag topics carry country words whose
  // emoji is the country's flag.
  G1_XP_ANIMALS_TOPIC,
  G1_XP_NATURE_TOPIC,
  G1_XP_THINGS_TOPIC,
  G3_XP_ANIMALS_TOPIC,
  G3_XP_FOOD_TOPIC,
  G3_XP_FEELINGS_TOPIC,
  G3_XP_PEOPLE_TOPIC,
  G3_XP_SPORTS_TOPIC,
  G3_XP_PLACES_TOPIC,
  G3_XP_TRANSPORT_TOPIC,
  G4_XP_OBJECTS_TOPIC,
  G4_XP_TECH_TOPIC,
  G4_XP_HEALTH_TOPIC,
  G4_XP_GESTURES_TOPIC,
  G4_XP_SIGNS_TOPIC,
  G4_XP_TIME_TOPIC,
  G4_XP_NATURE_TOPIC,
  G4_XP_FLAGS_EUROPE_TOPIC,
  G5_XP_FLAGS_ASIA_TOPIC,
  G5_XP_FLAGS_AMERICAS_TOPIC,
  G5_XP_FLAGS_AFRICA_TOPIC,
  G5_XP_FLAGS_OCEANIA_TOPIC,
  G5_XP_ADVANCED_TOPIC,
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
  [PARTY_TOPIC.id]: PARTY_WORDS,
  [SEASIDE_TOPIC.id]: SEASIDE_WORDS,
  [KITCHEN_TOPIC.id]: KITCHEN_WORDS,
  [CAMPING_TOPIC.id]: CAMPING_WORDS,
  [G1_SCHOOL_THINGS_TOPIC.id]: G1_SCHOOL_THINGS_WORDS,
  [G1_NUMBERS_TOPIC.id]: G1_NUMBERS_WORDS,
  [G1_COLORS_TOPIC.id]: G1_COLORS_WORDS,
  [G1_FAMILY_TOPIC.id]: G1_FAMILY_WORDS,
  [G1_PETS_TOPIC.id]: G1_PETS_WORDS,
  [G1_TOYS_TOPIC.id]: G1_TOYS_WORDS,
  [G1_BODY_TOPIC.id]: G1_BODY_WORDS,
  [G1_FOOD_TOPIC.id]: G1_FOOD_WORDS,
  [G3_SCHOOL_THINGS_TOPIC.id]: G3_SCHOOL_THINGS_WORDS,
  [G3_CLASSROOM_ACTIONS_TOPIC.id]: G3_CLASSROOM_ACTIONS_WORDS,
  [G3_BODY_PARTS_TOPIC.id]: G3_BODY_PARTS_WORDS,
  [G3_HOBBIES_TOPIC.id]: G3_HOBBIES_WORDS,
  [G3_COLOURS_TOPIC.id]: G3_COLOURS_WORDS,
  [G3_PETS_TOPIC.id]: G3_PETS_WORDS,
  [G3_TOYS_TOPIC.id]: G3_TOYS_WORDS,
  [G3_FAMILY_TOPIC.id]: G3_FAMILY_WORDS,
  [G3_JOBS_TOPIC.id]: G3_JOBS_WORDS,
  [G3_ROOMS_TOPIC.id]: G3_ROOMS_WORDS,
  [G3_DINING_TOPIC.id]: G3_DINING_WORDS,
  [G3_ZOO_TOPIC.id]: G3_ZOO_WORDS,
  [G3_SPORTS_GAMES_TOPIC.id]: G3_SPORTS_GAMES_WORDS,
  [G3_WEATHER_TOPIC.id]: G3_WEATHER_WORDS,
  [G3_CLOTHES_TOPIC.id]: G3_CLOTHES_WORDS,
  [G4_DAILY_ROUTINE_TOPIC.id]: G4_DAILY_ROUTINE_WORDS,
  [G4_SUBJECTS_TOPIC.id]: G4_SUBJECTS_WORDS,
  [G4_SEASONS_TOPIC.id]: G4_SEASONS_WORDS,
  [G4_CITY_PLACES_TOPIC.id]: G4_CITY_PLACES_WORDS,
  [G4_SPORTS_DAY_TOPIC.id]: G4_SPORTS_DAY_WORDS,
  [G4_ABILITIES_TOPIC.id]: G4_ABILITIES_WORDS,
  [G4_BIRTHDAY_TOPIC.id]: G4_BIRTHDAY_WORDS,
  [G4_HOMES_TOPIC.id]: G4_HOMES_WORDS,
  [G4_JOBS_TOPIC.id]: G4_JOBS_WORDS,
  [G4_WEEKEND_TOPIC.id]: G4_WEEKEND_WORDS,
  [G4_SUMMER_CAMP_TOPIC.id]: G4_SUMMER_CAMP_WORDS,
  [G4_WILD_ANIMALS_TOPIC.id]: G4_WILD_ANIMALS_WORDS,
  [G4_SHOPPING_TOPIC.id]: G4_SHOPPING_WORDS,
  [G4_FACILITIES_TOPIC.id]: G4_FACILITIES_WORDS,
  [G4_LUNCH_FOODS_TOPIC.id]: G4_LUNCH_FOODS_WORDS,
  [G5_COUNTRIES_TOPIC.id]: G5_COUNTRIES_WORDS,
  [G5_FUTURE_JOBS_TOPIC.id]: G5_FUTURE_JOBS_WORDS,
  [G5_CLUB_ACTIVITIES_TOPIC.id]: G5_CLUB_ACTIVITIES_WORDS,
  [G5_TET_TOPIC.id]: G5_TET_WORDS,
  [G5_HEALTH_TOPIC.id]: G5_HEALTH_WORDS,
  [G5_STORIES_TOPIC.id]: G5_STORIES_WORDS,
  [G5_TRANSPORT_TOPIC.id]: G5_TRANSPORT_WORDS,
  [G5_PLACES_TOPIC.id]: G5_PLACES_WORDS,
  [G5_FAMILY_TIME_TOPIC.id]: G5_FAMILY_TIME_WORDS,
  [G5_SCHOOL_TRIPS_TOPIC.id]: G5_SCHOOL_TRIPS_WORDS,
  [G5_CLASSROOM_TOPIC.id]: G5_CLASSROOM_WORDS,
  [G5_FREE_TIME_TOPIC.id]: G5_FREE_TIME_WORDS,
  [G5_SPECIAL_DAYS_TOPIC.id]: G5_SPECIAL_DAYS_WORDS,
  [G1_XP_ANIMALS_TOPIC.id]: G1_XP_ANIMALS_WORDS,
  [G1_XP_NATURE_TOPIC.id]: G1_XP_NATURE_WORDS,
  [G1_XP_THINGS_TOPIC.id]: G1_XP_THINGS_WORDS,
  [G3_XP_ANIMALS_TOPIC.id]: G3_XP_ANIMALS_WORDS,
  [G3_XP_FOOD_TOPIC.id]: G3_XP_FOOD_WORDS,
  [G3_XP_FEELINGS_TOPIC.id]: G3_XP_FEELINGS_WORDS,
  [G3_XP_PEOPLE_TOPIC.id]: G3_XP_PEOPLE_WORDS,
  [G3_XP_SPORTS_TOPIC.id]: G3_XP_SPORTS_WORDS,
  [G3_XP_PLACES_TOPIC.id]: G3_XP_PLACES_WORDS,
  [G3_XP_TRANSPORT_TOPIC.id]: G3_XP_TRANSPORT_WORDS,
  [G4_XP_OBJECTS_TOPIC.id]: G4_XP_OBJECTS_WORDS,
  [G4_XP_TECH_TOPIC.id]: G4_XP_TECH_WORDS,
  [G4_XP_HEALTH_TOPIC.id]: G4_XP_HEALTH_WORDS,
  [G4_XP_GESTURES_TOPIC.id]: G4_XP_GESTURES_WORDS,
  [G4_XP_SIGNS_TOPIC.id]: G4_XP_SIGNS_WORDS,
  [G4_XP_TIME_TOPIC.id]: G4_XP_TIME_WORDS,
  [G4_XP_NATURE_TOPIC.id]: G4_XP_NATURE_WORDS,
  [G4_XP_FLAGS_EUROPE_TOPIC.id]: G4_XP_FLAGS_EUROPE_WORDS,
  [G5_XP_FLAGS_ASIA_TOPIC.id]: G5_XP_FLAGS_ASIA_WORDS,
  [G5_XP_FLAGS_AMERICAS_TOPIC.id]: G5_XP_FLAGS_AMERICAS_WORDS,
  [G5_XP_FLAGS_AFRICA_TOPIC.id]: G5_XP_FLAGS_AFRICA_WORDS,
  [G5_XP_FLAGS_OCEANIA_TOPIC.id]: G5_XP_FLAGS_OCEANIA_WORDS,
  [G5_XP_ADVANCED_TOPIC.id]: G5_XP_ADVANCED_WORDS,
};

/**
 * Whole-bank list, deduped by id: a word shared across grades (CR-07
 * shared.ts review vocabulary) is the SAME object listed in multiple
 * topic arrays, so a raw flat() would duplicate its id and break the
 * global unique-id invariant.
 */
export const ALL_WORDS: readonly VocabWord[] = [
  ...new Map(Object.values(WORDS_BY_TOPIC).flat().map((w) => [w.id, w])).values(),
];

export function getTopicsByGrade(gradeId: string): Topic[] {
  return TOPICS.filter((topic) => topic.gradeId === gradeId);
}

export function getWordsByTopic(topicId: string): VocabWord[] {
  return WORDS_BY_TOPIC[topicId] ?? [];
}

/**
 * The vocabulary pool a Batch draws from for the selected grade (CR-07
 * R-G2): union of that grade's topic words, deduped by id for the same
 * shared-word reason as ALL_WORDS.
 */
export function getWordsByGrade(gradeId: string): VocabWord[] {
  const words = getTopicsByGrade(gradeId).flatMap((topic) => getWordsByTopic(topic.id));
  return [...new Map(words.map((w) => [w.id, w])).values()];
}

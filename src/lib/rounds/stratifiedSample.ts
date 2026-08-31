import { seededShuffleIndices } from '../prng';

/**
 * Structural shape assumed by the zero-config overload of
 * {@link stratifiedSample} - any item with a `topicId` field (every
 * `Question` variant in `src/types/index.ts` already has one) can be
 * stratified-sampled without passing an explicit key extractor.
 */
export interface HasTopicId {
  topicId: string;
}

/**
 * Groups `items` by topic and round-robin-draws one item per topic per pass
 * (plan.md v6 "Topic-Balanced Sampling") until `count` items are collected.
 * Each topic's internal draw order, and the topic visiting order within
 * every pass, are shuffled deterministically off `seed` so results vary
 * across Batches while staying reproducible for a fixed seed.
 *
 * Fairness guarantee: no topic contributes a 2nd item until every eligible
 * topic (that still has items left) has contributed 1 in the current
 * selection - this falls out of the pass structure itself (pass N gives
 * every still-non-empty topic its (N+1)th item before pass N+1 starts).
 * A topic only ends up over-represented when the pool has fewer eligible
 * topics (or a topic runs out of items) than slots remaining - the only
 * cases where "more than a fair share from one topic" is unavoidable.
 *
 * Pure and deterministic: no I/O, no framework dependency, matches the
 * seeded-random conventions in `src/lib/prng.ts`.
 */
export function stratifiedSample<T extends HasTopicId>(items: readonly T[], count: number, seed: string): T[];
export function stratifiedSample<T>(
  items: readonly T[],
  count: number,
  seed: string,
  topicIdOf: (item: T) => string,
): T[];
export function stratifiedSample<T>(
  items: readonly T[],
  count: number,
  seed: string,
  topicIdOf?: (item: T) => string,
): T[] {
  if (count <= 0 || items.length === 0) {
    return [];
  }

  const getTopicId = topicIdOf ?? ((item: T) => (item as unknown as HasTopicId).topicId);

  const topicOrder: string[] = [];
  const itemsByTopic = new Map<string, T[]>();
  for (const item of items) {
    const topicId = getTopicId(item);
    const bucket = itemsByTopic.get(topicId);
    if (bucket) {
      bucket.push(item);
    } else {
      itemsByTopic.set(topicId, [item]);
      topicOrder.push(topicId);
    }
  }

  // Shuffle each topic's own items once (deterministic per seed) so *which*
  // item is drawn first/second/... from a topic varies across Batches.
  const queues = new Map<string, T[]>();
  for (const topicId of topicOrder) {
    const topicItems = itemsByTopic.get(topicId)!;
    const order = seededShuffleIndices(topicItems.length, `${seed}-topic-${topicId}`);
    queues.set(
      topicId,
      order.map((i) => topicItems[i]!),
    );
  }

  const result: T[] = [];
  let pass = 0;
  let madeProgressThisPass = true;

  while (result.length < count && madeProgressThisPass) {
    madeProgressThisPass = false;

    const passTopicOrder = seededShuffleIndices(topicOrder.length, `${seed}-pass-${pass}`).map(
      (i) => topicOrder[i]!,
    );

    for (const topicId of passTopicOrder) {
      if (result.length >= count) break;
      const queue = queues.get(topicId)!;
      const next = queue.shift();
      if (next !== undefined) {
        result.push(next);
        madeProgressThisPass = true;
      }
    }

    pass++;
  }

  return result;
}

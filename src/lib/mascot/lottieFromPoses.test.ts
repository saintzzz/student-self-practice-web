import { describe, expect, it } from 'vitest';
import { buildLottieJson, loopConfig } from './lottieFromPoses';
import { MASCOT_POSES, type MascotPoseName } from './poses';

/**
 * CR-82 (D-08, spec s9.5): generated-asset contract. Frame-0 parity is
 * the binding rule - every animated prop's FIRST keyframe must equal the
 * rest value the static SVG pose renders, so poster -> player never
 * jumps (generated poses are equal to the static pose by construction;
 * this test locks that invariant in CI).
 */

const POSES = Object.keys(MASCOT_POSES) as MascotPoseName[];

interface Keyed {
  a: number;
  k: { t: number; s: number[] }[];
}

function firstKeyValue(prop: { a: number; k: unknown }): number[] | null {
  if (prop.a !== 1 || !Array.isArray(prop.k)) return null;
  const first = (prop.k as Keyed['k'])[0];
  return first?.s ?? null;
}

const REST: Record<string, number[]> = {
  p: [0, 0], // offsets are added to the anchor - see below
  s: [100, 100],
  r: [0],
  o: [100],
};

describe('lottieFromPoses - generated asset contract (D-08, spec s9.5)', () => {
  it.each(POSES)('%s: 512x512 artboard, 30fps, ip 0, op = pose frames', (pose) => {
    const json = buildLottieJson(pose);
    expect(json.w).toBe(512);
    expect(json.h).toBe(512);
    expect(json.fr).toBe(30);
    expect(json.ip).toBe(0);
    expect(json.op).toBe(MASCOT_POSES[pose].motion.frames);
    expect(json.nm).toBe(`be-heo-${pose}`);
  });

  it.each(POSES)('%s: every pose group becomes exactly one named layer', (pose) => {
    const json = buildLottieJson(pose);
    const layers = json.layers as { nm: string; ty: number }[];
    const names = layers.filter((l) => l.ty === 4).map((l) => l.nm);
    expect(names.sort()).toEqual(MASCOT_POSES[pose].groups.map((g) => g.name).sort());
    // Plus the single root null layer.
    expect(layers.filter((l) => l.ty === 3)).toHaveLength(1);
  });

  it.each(POSES)('%s: frame 0 equals the static pose (first keyframe = rest)', (pose) => {
    const json = buildLottieJson(pose);
    const layers = json.layers as { ty: number; nm: string; ks: Record<string, { a: number; k: unknown }> }[];
    for (const layer of layers) {
      if (layer.ty !== 4) continue;
      for (const [prop, rest] of Object.entries(REST)) {
        const first = firstKeyValue(layer.ks[prop] ?? { a: 0, k: null });
        if (first === null) continue;
        if (prop === 'p') {
          /* Position keys store anchor + offset; rest offset is [0,0],
             so the first key must equal the layer anchor point. */
          const anchor = (layer.ks.a as { k: number[] }).k;
          expect(first, `${pose}/${layer.nm}.p frame 0 must equal the anchor`).toEqual(anchor);
        } else {
          expect(first, `${pose}/${layer.nm}.${prop} frame 0 must be rest`).toEqual(rest);
        }
      }
    }
  });

  it.each(POSES)('%s: loop policy matches spec s9.2', (pose) => {
    const { loop, loopCount } = loopConfig(pose);
    const expected = MASCOT_POSES[pose].motion.loop;
    if (expected === 'loop') {
      expect(loop).toBe(true);
      expect(loopCount).toBe(0);
    } else if (expected === 'twice') {
      expect(loop).toBe(true);
      expect(loopCount).toBe(1); // 2 plays then hold
    } else {
      expect(loop).toBe(false); // one-shot, holds last frame
    }
  });

  it.each(POSES)('%s: no text layers, no image assets, no expressions', (pose) => {
    const text = JSON.stringify(buildLottieJson(pose));
    expect(text).not.toMatch(/"ty":5/);
    expect(text).not.toMatch(/"x":\s*"/);
    expect((buildLottieJson(pose).assets as unknown[]).length).toBe(0);
  });
});

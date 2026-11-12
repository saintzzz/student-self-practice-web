import { describe, expect, it, vi } from 'vitest';
import {
  ADULT_SURFACES,
  PROMPT_SAFE_SCREENS,
  applyUpdate,
  installPromptPending,
  isRoundInFlight,
  onSwUpdate,
  promptInstall,
  swUpdatePending,
} from './pwa';
import '../../public/sw-rules.js';
import type { Screen } from '../App';

// CR-141 unit tests - navigator/window surfaces are stubbed per test;
// initPwa() itself is not exercised (registration is browser plumbing).

// Typed as Screen[] so a union change in App.tsx that adds a member
// without listing it here fails typecheck - no silent drift.
const ALL_SCREENS: Screen[] = [
  'login',
  'admin',
  'grade-select',
  'start-batch',
  'batch',
  'credits',
  'placement',
  'exam',
  'report',
  'flashcards',
  'game',
  'classshow',
];

const SwRules = (self as unknown as { SwRules: Record<string, Function> })
  .SwRules;
const O = 'http://localhost';

describe('pwa update flow', () => {
  it('reports no pending update initially', () => {
    expect(swUpdatePending()).toBe(false);
  });

  it('applyUpdate is a no-op without a waiting worker', () => {
    expect(() => applyUpdate()).not.toThrow();
  });

  it('applyUpdate never initiates while a submit flush is pending', () => {
    sessionStorage.setItem('assign-submit:x', '{}');
    expect(() => applyUpdate()).not.toThrow();
    expect(isRoundInFlight()).toBe(true);
    sessionStorage.clear();
  });

  it('onSwUpdate subscribes and unsubscribes safely', () => {
    const cb = vi.fn();
    const off = onSwUpdate(cb);
    off();
    expect(cb).not.toHaveBeenCalled();
  });
});

describe('pwa install prompt', () => {
  it('reports no pending prompt initially', () => {
    expect(installPromptPending()).toBe(false);
  });

  it('promptInstall returns unavailable without a captured event', async () => {
    await expect(promptInstall()).resolves.toBe('unavailable');
  });
});

describe('screen surface sets', () => {
  it('every safe screen is a real Screen union member', () => {
    for (const s of PROMPT_SAFE_SCREENS) {
      expect(ALL_SCREENS).toContain(s);
    }
  });

  it('kid activity screens are all deferred', () => {
    const kidScreens: Screen[] = [
      'exam',
      'batch',
      'game',
      'classshow',
      'start-batch',
      'placement',
      'flashcards',
    ];
    for (const s of kidScreens) {
      expect(PROMPT_SAFE_SCREENS.has(s)).toBe(false);
    }
  });

  it('adult surfaces are exactly admin + report and both are safe', () => {
    expect([...ADULT_SURFACES].sort()).toEqual(['admin', 'report']);
    for (const s of ADULT_SURFACES) {
      expect(PROMPT_SAFE_SCREENS.has(s)).toBe(true);
    }
  });
});

describe('isRoundInFlight', () => {
  it('is false with no assignment payload', () => {
    expect(isRoundInFlight()).toBe(false);
  });

  it('is true while an assign-submit payload exists', () => {
    sessionStorage.setItem('assign-submit:abc', '{}');
    expect(isRoundInFlight()).toBe(true);
    sessionStorage.removeItem('assign-submit:abc');
    expect(isRoundInFlight()).toBe(false);
  });

  it('ignores unrelated sessionStorage keys', () => {
    sessionStorage.setItem('demo-hint:x', '1');
    expect(isRoundInFlight()).toBe(false);
    sessionStorage.clear();
  });
});

describe('sw-rules (the exact predicates sw.js runs)', () => {
  it('media allowlist admits only public dirs', () => {
    const { isMediaAsset } = SwRules;
    for (const p of ['/images/a.png', '/sfx/pop.mp3', '/emoji/e.png', '/fonts/f.woff2']) {
      expect(isMediaAsset(new URL(O + p), O)).toBe(true);
    }
    for (const p of ['/app', '/index.html', '/manifest.webmanifest', '/api/x', '/admin']) {
      expect(isMediaAsset(new URL(O + p), O)).toBe(false);
    }
    expect(isMediaAsset(new URL('http://evil.com/images/a.png'), O)).toBe(false);
  });

  it('supabase admits public storage only, never signed/authenticated', () => {
    const { isMediaAsset } = SwRules;
    const sb = 'https://proj.supabase.co';
    expect(
      isMediaAsset(new URL(`${sb}/storage/v1/object/public/ea-audio/x.mp3`), O),
    ).toBe(true);
    for (const p of [
      '/storage/v1/object/authenticated/ea-audio/x.mp3',
      '/storage/v1/object/sign/ea-audio/x.mp3?token=JWT',
      '/storage/v1/object/public/../sign/x?token=JWT',
    ]) {
      expect(isMediaAsset(new URL(sb + p), O)).toBe(false);
    }
  });

  it('api/auth/realtime paths are never treated as media', () => {
    const { isMediaAsset, isApiPath } = SwRules;
    for (const p of ['/rest/v1/x', '/auth/v1/token', '/rpc/fn', '/realtime/v1/x', '/functions/v1/x']) {
      const u = new URL(O + p);
      expect(isApiPath(u)).toBe(true);
      expect(isMediaAsset(u, O)).toBe(false);
    }
  });

  it('navigation cache key strips query tokens', () => {
    const { shellCacheKey } = SwRules;
    expect(shellCacheKey(new URL(`${O}/app?verify_email=SECRET&x=1`))).toBe(`${O}/app`);
  });

  it('only exact /app navigations get the shell - marketing bypasses', () => {
    const { isAppNav } = SwRules;
    expect(isAppNav(new URL(O + '/app'))).toBe(true);
    for (const p of [
      '/',
      '/app/',
      '/app/deep/link',
      '/guides',
      '/guides/x',
      '/mua',
      '/thi-cup',
      '/apple',
    ]) {
      expect(isAppNav(new URL(O + p))).toBe(false);
    }
  });
});

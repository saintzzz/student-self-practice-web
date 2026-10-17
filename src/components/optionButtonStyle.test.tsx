import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { getOptionButtonClassName } from './optionButtonStyle';
import { material } from '../lib/ui/tokens';

/**
 * CR-82 M3 (DESIGN-SPEC-v5 s7.2): the option tile state matrix must ride
 * `material.tile*` tokens - idle = face+hover+press, judged correct =
 * tileCorrect, missed reveal = tileRevealCorrect, picked-wrong = sunk
 * slate tilePickedWrong, untouched-after-verdict = tileFace+tileDisabled.
 */
describe('getOptionButtonClassName material tile matrix', () => {
  it('idle tiles carry tileFace + tileHover + tilePress', () => {
    const cls = getOptionButtonClassName(0, null, 2);
    expect(cls).toContain(material.tileFace);
    expect(cls).toContain(material.tileHover);
    expect(cls).toContain(material.tilePress);
    expect(cls).toContain(material.tileFocus);
  });

  it('a picked-correct tile carries tileCorrect', () => {
    const cls = getOptionButtonClassName(2, 2, 2);
    expect(cls).toContain(material.tileCorrect);
    expect(cls).not.toContain(material.tileFace);
  });

  it('a missed correct tile is the only reveal surface (tileRevealCorrect)', () => {
    const cls = getOptionButtonClassName(2, 0, 2);
    expect(cls).toContain(material.tileRevealCorrect);
    expect(cls).not.toContain(material.tileCorrect);
  });

  it('a picked-wrong tile is sunk slate, never rose', () => {
    const cls = getOptionButtonClassName(0, 0, 2);
    expect(cls).toContain(material.tilePickedWrong);
    expect(cls).not.toContain('rose');
  });

  it('untouched options after a verdict carry tileFace + tileDisabled', () => {
    const cls = getOptionButtonClassName(3, 0, 2);
    expect(cls).toContain(material.tileFace);
    expect(cls).toContain(material.tileDisabled);
  });

  it('keeps rose out of every state (never answer-wrong)', () => {
    for (const [index, sel] of [
      [0, null],
      [2, 2],
      [2, 0],
      [0, 0],
      [3, 0],
    ] as const) {
      expect(getOptionButtonClassName(index, sel, 2)).not.toContain('rose-');
    }
  });

  it('honors the G1-2 96px image-option floor (density.tileMinH)', () => {
    expect(getOptionButtonClassName(0, null, 2, 96)).toContain('min-h-[96px]');
    expect(getOptionButtonClassName(0, null, 2, 76)).toContain('min-h-[76px]');
    expect(getOptionButtonClassName(0, null, 2)).toContain('min-h-[76px]');
  });
});

describe('option tile state matrix (render)', () => {
  it('renders the wrong-pick scenario: sunk slate pick + emerald reveal', () => {
    render(
      <div>
        {[0, 1, 2, 3].map((i) => (
          <button
            key={i}
            type="button"
            data-testid={`tile-${i}`}
            className={getOptionButtonClassName(i, 0, 2)}
          >
            option
          </button>
        ))}
      </div>,
    );
    /* picked tile 0 = sunk slate; correct tile 2 = flat emerald reveal;
       tiles 1/3 = disabled navy faces. */
    expect(screen.getByTestId('tile-0').className).toContain('bg-slate-200');
    expect(screen.getByTestId('tile-2').className).toContain('bg-emerald-100');
    expect(screen.getByTestId('tile-1').className).toContain('opacity-50');
    for (const id of ['tile-0', 'tile-1', 'tile-2', 'tile-3']) {
      const cls = screen.getByTestId(id).className;
      expect(cls).toContain('rounded-[1.25rem]');
      expect(cls).toContain('border-2');
    }
  });
});

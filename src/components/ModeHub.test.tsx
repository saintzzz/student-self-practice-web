import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ModeHub, { HubGroup, type HubTileDef } from './ModeHub';
import { IconBook, IconGift, IconSwords } from './icons';
import { ViewerProvider } from '../lib/viewer/ViewerContext';

const TILES: HubTileDef[] = [
  { id: 'learn', icon: IconBook, label: 'Luyện & thi', content: <div data-testid="learn-content" /> },
  { id: 'arena', icon: IconSwords, label: 'Đấu trường', content: <div data-testid="arena-content" /> },
  { id: 'reward', icon: IconGift, label: 'Phần thưởng', content: <div data-testid="reward-content" /> },
];

describe('ModeHub', () => {
  it('renders all tiles collapsed; section children are unmounted but region ids resolve', () => {
    render(<ModeHub tiles={TILES} voiceKeyPrefix="hub-test" />);

    for (const id of ['learn', 'arena', 'reward']) {
      const tile = screen.getByTestId(`hub-tile-${id}`);
      expect(tile).toHaveAttribute('aria-expanded', 'false');
      // The region div stays mounted carrying the aria-controls target.
      const regionId = tile.getAttribute('aria-controls');
      expect(regionId).toBe(`hub-panel-${id}`);
      expect(document.getElementById(regionId!)).toBeInTheDocument();
    }
    expect(screen.queryByTestId('learn-content')).not.toBeInTheDocument();
  });

  it('expands a tile inline on click and collapses on second click', async () => {
    const user = userEvent.setup();
    render(<ModeHub tiles={TILES} voiceKeyPrefix="hub-test" />);

    const tile = screen.getByTestId('hub-tile-learn');
    await user.click(tile);
    expect(tile).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('learn-content')).toBeInTheDocument();

    await user.click(tile);
    expect(tile).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByTestId('learn-content')).not.toBeInTheDocument();
  });

  it('accordion: opening a tile closes the previously open one', async () => {
    const user = userEvent.setup();
    render(<ModeHub tiles={TILES} voiceKeyPrefix="hub-test" />);

    await user.click(screen.getByTestId('hub-tile-learn'));
    await user.click(screen.getByTestId('hub-tile-arena'));

    expect(screen.getByTestId('hub-tile-learn')).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByTestId('hub-tile-arena')).toHaveAttribute('aria-expanded', 'true');
    expect(screen.queryByTestId('learn-content')).not.toBeInTheDocument();
    expect(screen.getByTestId('arena-content')).toBeInTheDocument();
  });

  it('subtile mode maps ids to hub-subtile-*/hub-section-*', async () => {
    const user = userEvent.setup();
    render(<HubGroup tiles={TILES} subtile voiceKeyPrefix="hub-sub" />);

    const tile = screen.getByTestId('hub-subtile-learn');
    expect(tile).toHaveAttribute('aria-controls', 'hub-section-learn');
    await user.click(tile);
    expect(screen.getByTestId('learn-content')).toBeInTheDocument();
  });

  it('multi-section tiles: every controlled id stays mounted while collapsed', async () => {
    const user = userEvent.setup();
    const tiles: HubTileDef[] = [
      {
        id: 'arena',
        icon: IconSwords,
        label: 'Đấu trường',
        sections: [
          { id: 'arena', content: <div data-testid="arena-content" /> },
          { id: 'rank', content: <div data-testid="rank-content" /> },
        ],
      },
    ];
    render(<HubGroup tiles={tiles} subtile voiceKeyPrefix="hub-sub" />);

    const tile = screen.getByTestId('hub-subtile-arena');
    expect(tile).toHaveAttribute('aria-controls', 'hub-section-arena hub-section-rank');
    // Collapsed: both wrapper ids resolve, children unmounted.
    expect(document.getElementById('hub-section-arena')).toBeInTheDocument();
    expect(document.getElementById('hub-section-rank')).toBeInTheDocument();
    expect(screen.queryByTestId('arena-content')).not.toBeInTheDocument();

    await user.click(tile);
    expect(screen.getByTestId('arena-content')).toBeInTheDocument();
    expect(screen.getByTestId('rank-content')).toBeInTheDocument();
  });

  it('density: G1-2 viewer gets 96px tiles, G3-5 gets 76px', () => {
    const g12 = render(
      <ViewerProvider gradeId="grade-1">
        <ModeHub tiles={TILES} voiceKeyPrefix="hub-test" />
      </ViewerProvider>,
    );
    expect(screen.getByTestId('hub-tile-learn').className).toContain('min-h-[96px]');
    g12.unmount();

    render(
      <ViewerProvider gradeId="grade-4">
        <ModeHub tiles={TILES} voiceKeyPrefix="hub-test" />
      </ViewerProvider>,
    );
    expect(screen.getByTestId('hub-tile-learn').className).toContain('min-h-[76px]');
  });
});

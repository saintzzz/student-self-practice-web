import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import DailyQuestCard from './DailyQuestCard';
import {
  recordBigModeComplete,
  recordCorrectAnswers,
  recordDrillComplete,
  resetForTests,
} from '../lib/engagement/store';

beforeEach(() => resetForTests());

describe('DailyQuestCard', () => {
  it('renders all 3 quests with 0 progress on a fresh day', () => {
    render(<DailyQuestCard />);
    expect(screen.getByTestId('daily-quest-card')).toBeInTheDocument();
    expect(screen.getByTestId('quest-drill')).toHaveTextContent('0/1');
    expect(screen.getByTestId('quest-correct')).toHaveTextContent('0/10');
    expect(screen.getByTestId('quest-big')).toHaveTextContent('0/1');
  });

  it('shows per-quest progress after activity', () => {
    recordDrillComplete();
    recordCorrectAnswers(6);
    render(<DailyQuestCard />);
    expect(screen.getByTestId('quest-drill')).toHaveTextContent('Hoàn thành 1 lượt Luyện đề');
    expect(screen.getByTestId('quest-correct')).toHaveTextContent('6/10');
  });

  it('offers the claim button only when all quests are done', () => {
    recordDrillComplete();
    render(<DailyQuestCard />);
    expect(screen.queryByTestId('claim-daily-bonus')).not.toBeInTheDocument();
  });

  it('claims the bonus once and shows the done message', () => {
    recordDrillComplete();
    recordCorrectAnswers(10);
    recordBigModeComplete();
    render(<DailyQuestCard />);
    fireEvent.click(screen.getByTestId('claim-daily-bonus'));
    expect(screen.getByTestId('quest-all-done')).toHaveTextContent('Hoàn thành nhiệm vụ ngày');
    expect(screen.queryByTestId('claim-daily-bonus')).not.toBeInTheDocument();
  });
});

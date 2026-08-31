import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PronunciationRecordingQuestion from './PronunciationRecordingQuestion';
import { PRONUNCIATION_QUESTION } from './questionCardFixtures';

interface TestWindow {
  SpeechRecognition?: unknown;
  webkitSpeechRecognition?: unknown;
}

function testWindow(): TestWindow {
  return window as unknown as TestWindow;
}

describe('PronunciationRecordingQuestion', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the target word, the disclosure copy, and the record button by default', () => {
    render(
      <PronunciationRecordingQuestion
        question={PRONUNCIATION_QUESTION}
        hasAnswered={false}
        transcript={null}
        score={null}
        isCorrect={null}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByText('cat')).toBeVisible();
    expect(screen.getByText(/gần đúng/)).toBeVisible();
    expect(screen.getByTestId('record-button')).toBeVisible();
    expect(screen.queryByTestId('recording-indicator')).not.toBeInTheDocument();
  });

  it('has no em-dash anywhere in its copy', () => {
    render(
      <PronunciationRecordingQuestion
        question={PRONUNCIATION_QUESTION}
        hasAnswered={false}
        transcript={null}
        score={null}
        isCorrect={null}
        onSubmit={vi.fn()}
      />,
    );

    expect(document.body.textContent).not.toContain('—');
  });

  it('renders speech-recognition-unsupported-message and does not crash when the browser has no SpeechRecognition support', async () => {
    const original = { ...testWindow() };
    testWindow().SpeechRecognition = undefined;
    testWindow().webkitSpeechRecognition = undefined;

    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(
      <PronunciationRecordingQuestion
        question={PRONUNCIATION_QUESTION}
        hasAnswered={false}
        transcript={null}
        score={null}
        isCorrect={null}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.getByTestId('speech-recognition-unsupported-message')).toBeVisible();
    expect(screen.queryByTestId('record-button')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('pronunciation-skip-button'));
    expect(onSubmit).toHaveBeenCalledWith('');

    testWindow().SpeechRecognition = original.SpeechRecognition;
    testWindow().webkitSpeechRecognition = original.webkitSpeechRecognition;
  });

  it('renders mic-permission-denied-message and does not crash when getUserMedia rejects, with a working skip', async () => {
    vi.spyOn(navigator.mediaDevices, 'getUserMedia').mockRejectedValue(new Error('Permission denied'));

    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(
      <PronunciationRecordingQuestion
        question={PRONUNCIATION_QUESTION}
        hasAnswered={false}
        transcript={null}
        score={null}
        isCorrect={null}
        onSubmit={onSubmit}
      />,
    );

    await user.click(screen.getByTestId('record-button'));

    await waitFor(() => expect(screen.getByTestId('mic-permission-denied-message')).toBeVisible());
    expect(screen.queryByTestId('record-button')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('pronunciation-skip-button'));
    expect(onSubmit).toHaveBeenCalledWith('');
  });

  it('renders the pronunciation-feedback panel instead of the record control once answered', () => {
    render(
      <PronunciationRecordingQuestion
        question={PRONUNCIATION_QUESTION}
        hasAnswered
        transcript="cat"
        score={100}
        isCorrect
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByTestId('pronunciation-feedback')).toBeVisible();
    expect(screen.queryByTestId('record-button')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mic-permission-denied-message')).not.toBeInTheDocument();
    expect(screen.queryByTestId('speech-recognition-unsupported-message')).not.toBeInTheDocument();
  });
});

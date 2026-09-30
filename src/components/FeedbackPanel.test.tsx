import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import FeedbackPanel from './FeedbackPanel';

describe('FeedbackPanel', () => {
  it('shows the correct-word testid for listening-fill-blank regardless of correctness (AC5)', () => {
    render(
      <FeedbackPanel
        kind="listening-fill-blank"
        isCorrect={false}
        correctWord="rabbit"
        explanation='Con thỏ tiếng Anh là "rabbit".'
      />,
    );

    const feedback = screen.getByTestId('answer-feedback');
    expect(feedback).toHaveTextContent('rabbit');
    expect(feedback).toHaveTextContent('Chưa đúng rồi');
  });

  it('shows correct word and explanation when the listening answer was correct', () => {
    render(
      <FeedbackPanel
        kind="listening-fill-blank"
        isCorrect={true}
        correctWord="rabbit"
        explanation='Con thỏ tiếng Anh là "rabbit".'
      />,
    );

    const feedback = screen.getByTestId('answer-feedback');
    expect(feedback).toHaveTextContent('rabbit');
    expect(feedback).toHaveTextContent('Chính xác');
  });

  it('does not set the answer-feedback testid for image-choice questions', () => {
    render(
      <FeedbackPanel kind="image-choice" isCorrect={true} correctWord="cat" explanation="Explanation." />,
    );

    expect(screen.queryByTestId('answer-feedback')).not.toBeInTheDocument();
    expect(screen.getByText('cat')).toBeVisible();
  });

  it('does not set the answer-feedback testid for counting-image questions (AC12/AC13 reuse the image-choice pattern)', () => {
    render(
      <FeedbackPanel kind="counting-image" isCorrect={true} correctWord="3 cats" explanation="Explanation." />,
    );

    expect(screen.queryByTestId('answer-feedback')).not.toBeInTheDocument();
  });

  it('sets the answer-feedback testid for listening-sentence-fill-blank questions (Round 2, AC18)', () => {
    render(
      <FeedbackPanel
        kind="listening-sentence-fill-blank"
        isCorrect={false}
        correctWord="cat"
        explanation='Con mèo tiếng Anh là "cat".'
      />,
    );

    const feedback = screen.getByTestId('answer-feedback');
    expect(feedback).toHaveTextContent('cat');
    expect(feedback).toHaveTextContent('Chưa đúng rồi');
  });

  it('sets the answer-feedback testid and reveals the correct word for extra-letter questions (AC14)', () => {
    render(
      <FeedbackPanel
        kind="extra-letter"
        isCorrect={false}
        correctWord="bird"
        explanation='Con chim tiếng Anh là "bird". Chữ cái thừa là "s".'
      />,
    );

    const feedback = screen.getByTestId('answer-feedback');
    expect(feedback).toHaveTextContent('bird');
    expect(feedback).toHaveTextContent('Chữ cái thừa là "s"');
  });

  it('shows the pig mascot in happy mood, inline size, for a correct answer (plan.md v10, AC38)', () => {
    render(
      <FeedbackPanel kind="image-choice" isCorrect={true} correctWord="cat" explanation="Explanation." />,
    );

    const mascot = screen.getByTestId('mascot');
    expect(mascot).toHaveAttribute('data-mascot-mood', 'happy');
  });

  it('shows the pig mascot in encouraging mood for an incorrect answer, keeping the gentle "cố lên nhé" copy as-is', () => {
    render(
      <FeedbackPanel
        kind="listening-fill-blank"
        isCorrect={false}
        correctWord="rabbit"
        explanation='Con thỏ tiếng Anh là "rabbit".'
      />,
    );

    expect(screen.getByTestId('mascot')).toHaveAttribute('data-mascot-mood', 'encouraging');
    expect(screen.getByTestId('answer-feedback')).toHaveTextContent('Chưa đúng rồi, cố lên nhé!');
  });

  describe('DOM contract (AC-10.6 / amendment A-13)', () => {
    it('keeps the baseline <p> markup byte-identical for an incorrect answer without a picture', () => {
      render(
        <FeedbackPanel
          kind="extra-letter"
          isCorrect={false}
          correctWord="bird"
          explanation='Con chim tiếng Anh là "bird".'
        />,
      );

      const feedback = screen.getByTestId('answer-feedback');
      // No accent (encouraging mood) and no picture means only phrasing
      // content exists - all three lines stay <p>, matching ebd58a5.
      const paragraphLines = feedback.querySelectorAll('p');
      expect(paragraphLines.length).toBe(3);
      // No <div> descendants at all: EmojiVisual's svg layer is span+img,
      // and the encouraging mascot carries no accent/Lottie layer.
      expect(feedback.querySelector('div')).toBeNull();
      const wordLine = screen.getByText(/Từ đúng là:/);
      expect(wordLine.tagName).toBe('P');
      // Byte-identical to the ebd58a5 baseline markup for this line.
      expect(wordLine).toHaveAttribute(
        'class',
        'mt-2 text-xl font-semibold text-white [@media(max-height:420px)]:mt-1 [@media(max-height:420px)]:text-base',
      );
    });

    it('uses <div> for the headline only when the happy accent may mount a Lottie layer', () => {
      render(
        <FeedbackPanel kind="extra-letter" isCorrect={true} correctWord="cat" explanation="Explanation." />,
      );

      const headline = screen.getByText('Chính xác! Giỏi quá!').parentElement!;
      expect(headline.tagName).toBe('DIV');
      // The correct-word line still has no non-phrasing content - it stays a <p>.
      expect(screen.getByText(/Từ đúng là:/).tagName).toBe('P');
    });

    it('renders the picture inside the "Từ đúng là:" line (AC-10.2), which becomes a <div>', () => {
      render(
        <FeedbackPanel
          kind="extra-letter"
          isCorrect={true}
          correctWord="cat"
          explanation="Explanation."
          picture={{ emoji: '🐱' }}
        />,
      );

      const wordLine = screen.getByText(/Từ đúng là:/);
      expect(wordLine.tagName).toBe('DIV');
      const visual = wordLine.querySelector('[data-emoji-visual]');
      expect(visual, 'expected the picture EmojiVisual inside the answer line').not.toBeNull();
      expect(visual).toHaveAttribute('data-emoji-visual', '🐱');
      // The word text remains inside the same line, not moved elsewhere.
      expect(wordLine).toHaveTextContent('Từ đúng là: cat');
      // AC-10.6: testid rule is unaffected by the picture.
      expect(screen.getByTestId('answer-feedback')).toBeInTheDocument();
    });
  });
});

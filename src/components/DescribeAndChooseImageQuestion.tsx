import type { DescribeAndChooseImageQuestion as DescribeAndChooseImageQuestionType } from '../types';
import { EmojiVisual } from './EmojiVisual';
import { speakSentence } from '../lib/speech';
import { useAudioPlayback } from '../hooks/useAudioPlayback';
import AudioPlaybackWarning from './AudioPlaybackWarning';
import { getOptionButtonClassName, getOptionLabelPrefix, getOptionStateAttrs } from './optionButtonStyle';
import ListenButtons from './ListenButtons';
import { InstructionSpeaker } from './InstructionSpeaker';
import { useViewer } from '../lib/viewer/ViewerContext';

const INSTRUCTION = 'Nghe hoặc đọc câu rồi chọn hình đúng nhé!';

interface DescribeAndChooseImageQuestionProps {
  question: DescribeAndChooseImageQuestionType;
  selectedIndex: number | null;
  onSelectOption: (index: number) => void;
  /** kids-UX s3.2: round-scoped autoplay key for the instruction speaker. */
  speakerKey?: string;
}

/**
 * Round 4 of the v5/v6 Batch/Round model (plan.md "Round 4 - Describe and
 * Choose Image"). The description sentence is spoken via TTS and shown on
 * screen; the 4 options always render as repeated-emoji images (same shell
 * as CountingImageQuestion's count-to-image direction), reusing
 * `option-{index}` and the shared correct/incorrect option styling.
 */
export default function DescribeAndChooseImageQuestion({
  question,
  selectedIndex,
  onSelectOption,
  speakerKey,
}: DescribeAndChooseImageQuestionProps) {
  const { band } = useViewer();
  const { hasPlayed, playbackFailed, play, playSlow } = useAudioPlayback((onStatus, speed) =>
    speakSentence(question.sentence, onStatus, speed),
    question.sentence,
  );
  const hasAnswered = selectedIndex !== null;

  return (
    <div>
      <div className="mb-2 flex items-center justify-center gap-2">
        <p className="text-xl font-semibold text-amber-200">{INSTRUCTION}</p>
        <InstructionSpeaker text={INSTRUCTION} lang="vi-VN" autoplay={band === 'G12'} autoplayKey={speakerKey} />
      </div>
      <p className="mb-3 text-3xl font-extrabold text-white">{question.sentence}</p>
      <ListenButtons hasPlayed={hasPlayed} play={play} playSlow={playSlow} />
      {playbackFailed && <AudioPlaybackWarning />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {question.options.map((option, index) => (
          <button
            key={`${option.word}-${option.count}`}
            type="button"
            data-testid={`option-${index}`}
            disabled={hasAnswered}
            onClick={() => onSelectOption(index)}
            className={getOptionButtonClassName(index, selectedIndex, question.correctIndex)}
            {...getOptionStateAttrs(index, selectedIndex, question.correctIndex)}
            // CR-02: announce the visible content (emoji repeated count
            // times) - every option announces equally, so nothing about
            // the correct answer is given away. kids-UX: after judging,
            // the label also says which tile was picked vs the answer.
            aria-label={getOptionLabelPrefix(index, selectedIndex, question.correctIndex) + option.emoji.repeat(option.count)}
          >
            <span className="text-base font-semibold">{getOptionLabelPrefix(index, selectedIndex, question.correctIndex)}</span>
            <span aria-hidden="true" className="text-4xl leading-relaxed">
              <EmojiVisual emoji={option.emoji} count={option.count} />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import type { PhonicsWordChoiceQuestion as PhonicsWordChoiceQuestionType } from '../types';
import { useDemoHint } from '../hooks/useDemoHint';
import DemoHint from './DemoHint';
import { DISPLAY_GLYPH } from '../lib/ui/tokens';
import { getWordVisual } from '../lib/emoji/wordVisual';
import { getSoundExample, getSoundUtterance } from '../lib/phonics/initialSounds';
import { allWords } from '../lib/content/contentBank';
import { EmojiVisual } from './EmojiVisual';
import { speakWord } from '../lib/speech';
import { useAudioPlayback } from '../hooks/useAudioPlayback';
import AudioPlaybackWarning from './AudioPlaybackWarning';
import { getOptionButtonClassName, getOptionLabelPrefix, getOptionStateAttrs } from './optionButtonStyle';
import PressableOptionButton from './PressableOptionButton';
import { AUDIO_BUTTON_CLASSNAME } from './actionButtonStyle';
import QuestionBanner from './QuestionBanner';
import { IconRefresh, IconSpeaker } from './icons';

const INSTRUCTION = 'Nghe âm rồi chọn đúng hình nhé!';

interface PhonicsWordChoiceQuestionProps {
  question: PhonicsWordChoiceQuestionType;
  selectedIndex: number | null;
  onSelectOption: (index: number) => void;
  /** kids-UX s3.2: round-scoped autoplay key for the instruction speaker. */
  speakerKey?: string;
  /** CR-82 (D-15): reports content-audio loading to the board's
      thinking-pose signal (child -> board). */
  onAudioLoadingChange?: (loading: boolean) => void;
}

/**
 * Phonics direction B (CR-03): the letter sound is shown big and spoken;
 * the student picks the picture whose word starts with that sound - the
 * phonics twin of ListeningImageChoiceQuestion (audio prompt, image answer,
 * same 4-option shell, same all-or-nothing photo group as AC-5.2/5.3).
 */
export default function PhonicsWordChoiceQuestion({
  question,
  selectedIndex,
  onSelectOption,
  speakerKey,
  onAudioLoadingChange,
}: PhonicsWordChoiceQuestionProps) {
  // speakWord on a bare key ("c") reads the letter name ("see"); the
  // utterance "c, as in cat" carries the actual sound via the example.
  // CR-76: the example excludes the answer word (audio must not name the
  // correct picture) and is shown as a visual scaffold so kids can decode
  // the "as in" convention ("như từ cat" + the cat picture).
  const example = getSoundExample(question.sound, question.word);
  const exampleVisual = useMemo(() => {
    const entry = example ? allWords().find((w) => w.word === example) : undefined;
    return entry ? getWordVisual(entry.id) : undefined;
  }, [example]);
  const utterance = getSoundUtterance(question.sound, question.word);
  const { hasPlayed, playbackFailed, isLoading, play, playSlow } = useAudioPlayback((onStatus, speed) => speakWord(utterance, onStatus, speed), utterance);

  useEffect(() => {
    onAudioLoadingChange?.(isLoading);
  }, [isLoading, onAudioLoadingChange]);
  const hasAnswered = selectedIndex !== null;
  const demo = useDemoHint('phonics-word-choice');
  const gridRef = useRef<HTMLDivElement>(null);

  const [photoGroupFailed, setPhotoGroupFailed] = useState(false);
  const optionImageUrls = useMemo(() => {
    if (photoGroupFailed) return null;
    const urls = question.optionWordIds.map((id) => getWordVisual(id)?.imageUrl);
    return urls.every((u): u is string => typeof u === 'string') ? urls : null;
  }, [question.optionWordIds, photoGroupFailed]);

  return (
    <div>
      <QuestionBanner text={INSTRUCTION} speakerKey={speakerKey} />
      <div className="mb-3 flex flex-wrap items-center justify-center gap-3">
        {/* CR-79 B3: the sound letter gets the display-glyph treatment -
            letterpress amber on navy, not plain white text. */}
        <span className={DISPLAY_GLYPH}>
          {question.sound}
        </span>
        {example && (
          <span
            data-testid="sound-example"
            className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-base font-semibold text-sky-100 ring-1 ring-sky-300/30"
          >
            như từ <span className="font-extrabold text-amber-200">“{example}”</span>
            {exampleVisual && (
              <EmojiVisual emoji={exampleVisual.emoji} imageUrl={exampleVisual.imageUrl} />
            )}
          </span>
        )}
        <button
          type="button"
          data-testid="play-audio-button"
          onClick={play}
          className={AUDIO_BUTTON_CLASSNAME}
        >
          {hasPlayed ? <><IconRefresh size={18} /> Nghe lại</> : <><IconSpeaker size={18} /> Nghe</>}
        </button>
        {hasPlayed && (
          <button
            type="button"
            data-testid="play-slow-button"
            onClick={playSlow}
            className="inline-flex min-h-[56px] items-center justify-center rounded-full bg-slate-700/80 px-5 py-2 text-lg font-bold text-sky-200 ring-1 ring-sky-400/40 transition hover:bg-slate-600/80 active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100 focus:outline-none focus:ring-4 focus:ring-sky-400"
          >
            🐢 Nghe chậm
          </button>
        )}
      </div>
      {playbackFailed && <AudioPlaybackWarning />}

      <div ref={gridRef} className="relative grid grid-cols-1 gap-4 sm:grid-cols-2">
        {question.options.map((emoji, index) => (
          <PressableOptionButton
            key={`option-${index}-${emoji}`}
            type="button"
            data-testid={`option-${index}`}
            disabled={hasAnswered}
            onClick={() => onSelectOption(index)}
            className={getOptionButtonClassName(index, selectedIndex, question.correctIndex)}
            {...getOptionStateAttrs(index, selectedIndex, question.correctIndex)}
            // CR-02: announce the picture content (the emoji char) - same
            // information a sighted user gets, the word is never leaked.
            // kids-UX: after judging, the label also says which tile was
            // picked vs the answer.
            aria-label={getOptionLabelPrefix(index, selectedIndex, question.correctIndex) + emoji}
          >
            <span className="text-base font-semibold">{getOptionLabelPrefix(index, selectedIndex, question.correctIndex)}</span>
            <span aria-hidden="true" className="text-6xl">
              <EmojiVisual
                key={photoGroupFailed ? 'static' : 'photo'}
                emoji={emoji}
                imageUrl={optionImageUrls?.[index]}
                loading="lazy"
                onImageError={() => setPhotoGroupFailed(true)}
                variant="block"
              />
            </span>
          </PressableOptionButton>
        ))}
        {demo.showDemo && !hasAnswered ? (
          <DemoHint containerRef={gridRef} onDone={demo.dismiss} />
        ) : null}
      </div>
    </div>
  );
}

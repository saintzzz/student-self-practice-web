/**
 * Shown next to the play-audio button when speech.ts reports playback as
 * unsupported/errored (plan.md hotfix, 2026-09-08 - reported by a student:
 * "vẫn không nghe được tiếng" / still no sound on their phone). Before this,
 * a failed speak() call was completely silent - the student and anyone
 * debugging their report had no way to tell "the app tried and failed" from
 * "everything is fine, just tap play". Amber (not rose) - this is a
 * technical/device notice, not answer-correctness feedback.
 */
export default function AudioPlaybackWarning() {
  return (
    <p data-testid="audio-playback-warning" className="mt-2 text-base font-semibold text-amber-700">
      Không phát được âm thanh trên thiết bị này. Em thử kiểm tra âm lượng hoặc bấm Nghe lại nhé.
    </p>
  );
}

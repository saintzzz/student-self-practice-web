# CR-126 - "Doc truyen" leveled reading (Raz-Kids/Little Fox pillar)

## Van de

EA chi co content word/sentence-level. Ca hai doi thu sat nhat
(Raz-Kids, Little Fox) deu chung minh **leveled story la retention
engine** - tre doc truyen theo level, nghe mau, lam quiz, doc lai.
Audit bank: 7.424 true-false items co `passage` nhung chi la doan 1-2
cau test, khong phai truyen. Gap lon nhat con lai cua harness plan
(docs/research/competitive-abeka-razkids-ixl-littlefox.md).

## Quyet dinh PO

v1 client-side content (pattern contentBank - lazy chunk, guest choi
duoc, khong can DB). 15 truyen author tay (3/grade x 5 grade), moi
truyen = 4 mode theo Little Fox:

1. **Nghe**: "Nghe ca truyen" TTS sequential + karaoke highlight tung
   cau; tap cau de nghe rieng.
2. **Doc**: text hien ro (mac dinh).
3. **Quiz**: 3 cau MCQ comprehension - nguon diem chinh.
4. **Doc to**: record 1 cau khoa qua usePronunciationRecording +
   scorePronunciationAttempt (reuse CR-120 pipeline).

GameId `story-time` trong Game Zone registry - reuse GameScreen shell,
stars qua recordGameResult (quiz 3x10 + mic 10 = maxPoints 40).

Level ladder = reading scaffold giam dan (Level Up semantics):
- Man 1: full audio - "Nghe ca truyen" + tap-tung-cau + "Nghe mau".
- Man 2: bo "Nghe ca truyen", giu tap-tung-cau.
- Man 3: pure reading - khong TTS (cau render `<p>`, khong Nghe mau).

DB stories table + teacher-assign stories = follow-up khi co nhu cau
(Little Fox cung bat dau bang thu vien tu do).

## Bug bat duoc trong verify (fixed cung CR)

1. **speech.ts khong bao gio emit `'ended'`** - ca mp3 path (chi 'started'
   qua onPlaying) lan TTS path (utterance.onend khong goi onStatus;
   sendStatus once-only). `'ended'` da declare trong type va
   speakInstruction en-US da consume (latent bug: instruction keo dai
   'playing' mai). Fix: emit 'ended' tren natural completion ca 2 path.
2. **StrictMode liveRef staleness** - cleanup flip liveRef=false nhung
   effect body khong restore -> dev double-mount giet moi deferred
   callback (quiz picked khong bao gio reset -> options disabled mai).
   Fix: liveRef.current=true trong effect body.
3. **Playback leak vao quiz** - mp3 dang phat khong bi dung khi chuyen
   phase. Fix: stopPlayback() -> stopAllAudio() tren "Doc xong" + unmount.
4. **Stale 'ended' race** - Safari end-on-cancel / cached-mp3 replay co
   the phat 'ended' tre -> playGenRef retire moi callback cu.

## Verify

- tsc + tests (story data shape, quiz integrity, vi-copy khong em-dash,
  'ended' emission test moi trong speech.test.ts - 25 speech tests khong
  regression).
- Browser dev guest flow: map -> Lop 3 -> Khu tro choi -> card "Doc
  truyen" -> Man 1 -> pick -> read (Nghe ca truyen karaoke + tap cau) ->
  quiz 3 cau -> mic phase (Nghe mau + live heard text + skip) -> end
  screen "10/40 diem - 1 cau dung" dung scoring.
- Man 3: play-all hidden, sentences la `<p>`, khong Nghe mau.
- Build: StoryTime lazy chunk 6.44KB gzip.

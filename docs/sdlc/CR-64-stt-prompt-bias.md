# CR-64 - Bo targetWord khoi prompt STT (bias ep transcript theo dap an)

## Van de

User bao: bai phat am cham sai - noi "beautiful" cho tu dich "excited"
nhung may bao dung.

Nguyen nhan: prompt STT trong edge function `practice-transcribe` gui
target word cho model ("The target word or sentence is X - transcribe
exactly what the child said"). Model bias theo hint va tra ve target
bat ke audio noi gi -> transcript = "excited" -> scorer cho 100 diem.
Whisper `prompt` param co cung van de.

Verify: audio noi "beautiful", target "excited" -> transcript "excited".

## Thay doi

- Gemini + OpenRouter prompt: bo dong target word; yeu cau transcribe
  dung tu thuc te nghe duoc, ke ca khi phat am sai/khac ky vong.
- OpenAI Whisper: thay prompt bias bang "A child speaking English.".
- `targetWord` van bat buoc trong request (hop dong API giu nguyen) nhung
  khong con dua vao prompt - tham so provider doi thanh `_targetWord`.

## Tac dong

- Trung thuc hon: noi sai -> transcript khac target -> scorer < 70 ->
  bao sai + hien transcript de PH/em thay may nghe duoc gi.
- Rui ro chap nhan duoc: em noi dung nhung nghe qua accent -> transcript
  lech -> scorer phonetic/text similarity (< 70 chi khi khac xa) da co
  fairness boost; muc do chinh xac theo kieu "closest word heard" khop
  voi disclosure "cham xap xi".

## Verify

- Audio "beautiful" + target "excited" -> transcript "Beautiful" (sai,
  cham sai).
- Audio "apple" + target "apple" -> "apple" (dung).
- Audio "apple" + target "excited" -> "apple" (khong con bias).
- Deploy edge fn version 5, verify_jwt=false.

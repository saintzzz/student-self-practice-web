# CR-52 - Thời gian làm bài cho ôn luyện

## Yêu cầu

> "bổ sung thời gian cho cả những bài ôn luyện. ngoài điểm ra, thời gian
> làm bài cũng sẽ được tính cho ôn luyện thay vì chỉ có thi mới có điểm."

## Hiện trạng (khảo sát)

- **Thi thử** (`ExamScreen` mode=`exam`): countdown timer + auto-submit,
  `timeUsedSec` hiển thị ở màn kết quả - NHƯNG không được lưu xuống
  `practice.results` (bảng không có cột thời gian → mất khi rời màn).
- **Luyện đề / Ôn lại câu sai / Arena** (`mode!=exam`): header chỉ hiện
  "Câu X/N", không có đồng hồ; `computeExamResult` clamp `timeUsedSec`
  theo `timeLimitSec` của đề thi → sai khi HS làm quá giờ, và review mode
  (`timeLimitSec: 0`) luôn ra 0.
- **Ôn luyện 4 vòng** (`BatchScreen`): có countdown 5:00/vòng nhưng không
  ghi lại tổng thời gian làm bài; `BatchResult` không có trường thời gian.

## Scope

1. `practice.results` + cột `time_used_sec int` (nullable - dữ liệu cũ).
2. `ExamState.untimed?: boolean` - practice/review/arena sessions không
   clamp `timeUsedSec` theo `timeLimitSec`; exam mode giữ nguyên.
3. `ExamScreen` header (practice modes): chip đồng hồ đếm lên mm:ss cạnh
   chip "Câu X/N"; heartbeat 1s bật cho cả practice.
4. `saveExamResult` + `savePracticeResult`: ghi `time_used_sec`.
5. `BatchState.startedAtMs` + `BatchResult.timeUsedSec`; `BatchSummary`
   hiển thị tổng thời gian.
6. Đồng hồ ôn luyện là **đếm lên** (không giới hạn) - đo tốc độ làm bài,
   không gây áp lực như đếm ngược thi thử.

## Out of scope

- Giới hạn thời gian cứng cho ôn luyện (không yêu cầu).
- Per-question latency (đã có telemetry CR-49 riêng).

## Impact

- `src/lib/exam/examSession.ts` (ExamState.untimed, computeExamResult)
- `src/lib/qb/bank.ts` (set untimed theo mode)
- `src/components/ExamScreen.tsx` (heartbeat + header chip)
- `src/lib/practiceResults.ts` (insert cột mới)
- `src/lib/batch/batchSession.ts` (startedAtMs, BatchResult.timeUsedSec)
- `src/components/BatchSummary.tsx` (hiển thị)
- `supabase/migrations/0022_results_time_used.sql`
- Tests: examSession.test (clamp), batchSession.test (time), markup test

## Rủi ro

- Thấp: cột nullable, insert best-effort (lỗi không chặn flow).
- Test hiện hữu assert clamp timeUsedSec - cập nhật theo semantics mới.

-- CR-52: ghi thoi gian lam bai cho tat ca che do (on luyen, thi thu).
-- Truoc day results chi luu diem - timeUsedSec bi mat khi roi man ket qua.
-- Nullable: cac row cu chua do thoi gian.
alter table practice.results
  add column if not exists time_used_sec int;

alter table practice.results
  add constraint results_time_used_sec_nonneg check (time_used_sec is null or time_used_sec >= 0);

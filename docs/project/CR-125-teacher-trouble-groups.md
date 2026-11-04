# CR-125 - Trouble groups trong bao cao giao bai (IXL trouble spots)

## Van de

Bao cao giao bai (`assignment_report` + report panel trong AdminScreen)
hien tra ve:
- roster: moi HS mot dong (trang thai, diem, thoi gian)
- questions: top cau sai nhieu cua CA LOP (accuracy + skill)

Co giao biet "cau X sai nhieu" nhung khong biet "em nao yeu ky nang
nao" - co che Trouble Spots cua IXL (nhom HS theo scaffold bi ket de
chia nhom day lai). Phan tich competitive
(docs/research/competitive-abeka-razkids-ixl-littlefox.md) xep day la
gap teacher-side con thieu that duy nhat cua truc analytics.

## Thay doi

- Migration `0072_assignment_report_skill_students.sql`: extend
  `practice.assignment_report` them key `skill_students` - cross-tab
  per-student x per-skill {skill, student_id, student_name, correct,
  total, accuracy} tu `assignment_attempts.answers` join
  `qb_questions.skill`. Chi tinh tren attempt da submit.
- `src/lib/assignments.ts`: type `ReportSkillStudentRow` + map.
- `AdminScreen` report panel: section "Nhom yeu theo ky nang" - group
  theo skill (accuracy < 70%), moi nhom liet ke ten em + ti le dung;
  flag "Qua han, chua nop" tren roster row khi now > due_at va
  !submitted_at.

## Verify

- Migration apply qua MCP; query RPC tra skill_students dung tren
  assignment co data that.
- Browser: report panel hien section nhom yeu + flag qua han.
- tsc + tests + build xanh.

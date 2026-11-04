# Competitive research: Abeka, Raz-Kids, IXL, Little Fox

Ngay: 2026-11-04. Muc tieu: khai thac (harness) co che cua 4 platform
giao duc da chung minh retention/monetization, map vao English Arena.
Moi muc ket luan bang verdict: ADOPT (lay nguyen) / ADAPT (lay co che,
doi form) / SKIP.

Hien trang EA de doi chieu:
- Placement: 15 cau image-choice tinh (3 cau/lop x 5 lop), mot lan,
  chi ra grade - khong strand, khong adaptive, khong continuous.
- Content: word-level (1.190 tu + art) va sentence-level (word order,
  missing letter). KHONG co doan van/truyen (reading passage).
- Games: 18 tro, 5 skill family, pronunciation mic, world map,
  hearts/diem - nhung diem khong tieu duoc (khong co shop/sink).
- Teacher: class + scopes + assignments + per-skill report + class
  show. Chua co pacing/trouble-spot grouping, chua co alert.
- TTS (speakWord), quiz engine, recorder/assess pipeline da san sang.

---

## 1. Raz-Kids / Raz-Plus (Learning A-Z) - leveled reading, doi thu gan nhat

Core loop: thu vien 3.000+ sach chia level aa->Z2 (correlate Lexile +
grade). HS doc/nghe sach -> lam comprehension quiz -> sao. **Level Up!**
- doc+nghe het sach trong level va pass quiz >= 80% thi AUTO len level
tiep. Reading Room = thu vien tu do theo level. Flight Check = running
record danh gia level. Ghi am doc lai -> GV nghe cham.

Kinh te sao (star economy): listen 10, doc sach 50, quiz pass 100,
perfect 150, level-up 500. Sao TIEU DUOC: mua do Raz Rocket room +
Avatar Builder. GV co the bat/tat incentives va thuong sao.

Gia: ~classroom license (25 HS), trial 14 ngay.

**Co che dang harness:**
- ADAPT - Level Up auto-progression: quy tac don gian (hoan thanh level
  + quiz >= nguong -> mo level moi), self-paced, khong can GV thao tac.
- ADOPT - Star economy + sink: diem phai tieu duoc vao cosmetics moi
  co retention loop dong.
- ADAPT - Record-reading cho GV nghe: ta DA CO recorder/assess tu CR-120,
  chi can cho phep GV replay trong report.
- ADOPT - "Doc - Nghe - Quiz" 3-mode packaging moi content unit.

## 2. Little Fox - content-as-product (4.700+ truyen hoat hinh, 9 level)

Core loop: moi truyen = animation player (caption on/off) + eBook
(Read to Me karaoke highlight / Read It Myself) + quiz + printable book
+ MP3. Level test: quiz >= 70% = dung level. Badge/attendance/learning
log/certificate. Moi ngay T2-T6 ra truyen moi (daily cadence hook).
$180/nam, 4 user/tai khoan - thuan B2C.

**Co che dang harness:**
- ADOPT - Story-as-container: 1 truyen -> 4 mode (xem/nghe, doc theo
  karaoke, quiz, in). TA co du 3/4: TTS, quiz, art. Thieu karaoke
  highlight + truyen.
- ADAPT - Karaoke read-along: highlight tung cau/tu theo TTS - ap dung
  duoc ngay voi sentence-level content hien co truoc khi co truyen dai.
- ADOPT - 70% quiz = "dung level" heuristic: don gian hon placement
  tinh cua ta, co the bo sung vao Level Up rule.
- ADAPT - Daily cadence: "truyen moi moi ngay" la retention hook; voi
  pipeline gen content co the lam "cau chuyen tuan nay".

## 3. IXL - adaptive practice engine (8.500 skills)

Core loop: **SmartScore 0-100** - diem tang khi dung, giam khi sai;
phi tuyen: gan 100 cang kho len, sai gan dinh tru nang. 80 = proficient
(muc tieu), 100 = mastery, LUON dat duoc (khong phai % dung).
**Real-Time Diagnostic**: arena cau hoi adaptive ~45 phut -> so grade
level theo TUNG STRAND (thang 0-1300, +10 diem ~ 1 thang hoc), CAP NHAT
LIEN TUC khi luyen (khong phai test mot lan). **Action Plan**: moi em
co danh sach skill de xuat rieng tu diagnostic; routine "1 skill toi
80 moi ngay". Teacher analytics: Diagnostic Overview, Strand Analysis
(nhom HS theo level tung strand -> chia nhom day), Trouble Spots
(nhom theo muc scaffolding bi ket -> day lai), Progress & Growth
(+10/thang = intervention trigger).

Gia: $9.95-19.95/tre/thang B2C; classroom license 25 HS.

**Co che dang harness:**
- ADAPT - Mastery score kieu SmartScore theo topic: thay diem phang
  bang score 0-100 per topic (correct +, wrong -, bao hoa gan dinh).
  Data da co (results per topic) - thuan code, khong can content moi.
- ADAPT - Continuous diagnostic: placement hien tai la one-shot; nen
  tro thanh estimate cap nhat tu ket qua luyen tap (topic-level
  proficiency -> grade-level estimate).
- ADOPT - Trouble Spots grouping: teacher report hien co per-skill -
  nang cap thanh "nhom HS cung yeu skill X" de co giao bai remediation
  (da co nut "Giao bai luyen lai phan yeu" - noi vao group).
- ADOPT - Action plan routine: "moi ngay 1 topic toi 80" - goal
  setting ro rang thay vi "choi game tuy y".

## 4. Abeka - curriculum company (spiral pedagogy, parent dashboard)

Khong phai software-first: full-grade kits + video lessons giao vien
that, $1.4k/nam, accredited/unaccredited. Co che phan mem nam o
dashboard: assign bai, permission theo grade, grade alert (<80%
thong bao), calendar tu sap + dieu chinh nam hoc, trang thai
ahead/on-track/behind. Pedagogy moat: **spiral learning** - khai niem
lap lai xoan oc qua cac lop, on tap thuong xuyen.

**Co che dang harness:**
- ADOPT - Spiral review (SRS-lite): tu/cau da dung quay lai theo
  khoang cach (1d/3d/7d) - "On lai" mode tren data co san.
- ADAPT - Pacing status: teacher/parent thay "dung tien do / cham"
  so voi due date assignment; grade alert khi score < nguong.
- SKIP - Video lessons/accredited: khong phai mo hinh cua minh.

---

## Gaps xep theo leverage (PO call)

| # | Gap | Co che nguon | Effort | Impact |
|---|-----|--------------|--------|--------|
| 1 | Khong co reading/listening content (moi thu word/sentence) | Raz-Kids Level Up + Little Fox story-as-container | LON (content pipeline + player) | Rat cao - ca Raz-Kids va Little Fox chung minh day la retention engine |
| 2 | Placement tinh, khong adaptive mastery | IXL SmartScore + continuous diagnostic | VUA (pure code, data co san) | Cao - mo khoa recommended-next + trouble spots + pacing |
| 3 | Diem khong tieu duoc | Raz-Kids star sink | VUA | Cao - engagement loop dong |
| 4 | Khong co spiral review | Abeka | NHO-VUA | Trung-cao - retention dai han |
| 5 | Teacher thieu pacing/trouble grouping | IXL analytics + Abeka pacing | NHO | Trung - bam vao report co san |

## Infra audit (2026-11-04) - nhieu thu DA CO, backlog hieu chinh

Audit codebase sau khi viet backlog ban dau - EA da build san phan lon
phan "adaptive/diagnostic":

- `practice.qb_attempt_events` (migration 0017): per-answer immutable
  events (question_id, is_correct, grade, mode, latency, session) qua
  `record_attempt_events` RPC - chinh la substrate cua SmartScore.
- `logAdaptive` trong `src/lib/qb/telemetry.ts`: shadow policy DA chay
  (rolling <60% -> de, >85% -> kho) + `log_adaptive_decision` RPC.
- `src/lib/engagement/skills.ts`: 2 tang taxonomy (12 UI buckets +
  ~25 qb bank skills) + `drillSkillsFor` map weak-skill -> drill RPC.
- `src/lib/engagement/coach.ts` (CR-58): weak-skill engine - counters
  theo 7 ngay, accuracy <0.8 = yeu, toi da 3 goi y drill. Day chinh la
  mini-IXL diagnostic+action-plan phia client.
- Spaced review DA CO (SRS queue 1d->3d->7d->mastered,
  `ReviewQueueCard`, badge `review-10`) - muc CR-122 trong backlog cu
  la DONE.
- Teacher report da co per-skill breakdown + "Giao bai luyen lai".
- Star economy: sao TICH LUY (cap/grade, mo sticker, gift box ->
  home items collection) nhung khong phai currency tieu chu dong.

Hieu chinh backlog: CR-121 thu nho con "mastery presentation +
teacher trouble grouping"; CR-122 bo (da co); CR-123 van la gap lon
nhat (content); CR-124 thanh "deliberate spend" (thap); CR-125 la
phan thieu that su phia teacher.

## Backlog hieu chinh

- **CR-121 "ArenaScore" (thu nho)**: mastery score 0-100 per qb-skill
  per student (SmartScore-lite: +dung/-sai, bao hoa gan dinh, 80=dat)
  tinh tu `qb_attempt_events`; hien thi student-facing (progress toi
  80/topic tren map/shelf) + nang cap coach tu accuracy thuong sang
  score co saturation.
- **CR-122**: ~~spiral review~~ - DA CO san (SRS queue + mastered).
- **CR-123 "Doc truyen" leveled track**: truyen ngan theo topic+grade,
  moi truyen = Nghe (TTS) + Doc theo (karaoke sentence highlight) +
  Quiz + Doc to (record, reuse CR-120 pipeline). Content: pipeline gen
  qua browser automation (dung rule content factory). Level Up rule:
  xong truyen level + quiz >= 70% -> mo level. **Gap lon nhat.**
- **CR-124 "Cua hang sao" (thap)**: sao tieu chu dong - chon mua
  avatar phu kien/trang tri world thay vi chi gift box ngau nhien.
- **CR-125 Teacher trouble groups**: tu qb_attempt_events + skillKeyFor,
  teacher report nhom HS theo skill yeu (ai ket o scaffold nao), flag
  cham tien do vs due date, alert score < nguong. Phan teacher-side
  thieu that su cua IXL analytics.

Thu tu hieu chinh: CR-125 (teacher-facing, re, data co san) ->
CR-121 (student mastery surface, pure code) -> CR-123 (pillar content,
can content factory - session rieng) -> CR-124 (tuy chon).

## Pricing intel

IXL $10-20/tre/thang; Raz-Kids classroom ~25 HS; Little Fox $180/nam
gia dinh; Abeka $1.4k/nam curriculum. Mo hinh B2B truong cua minh gan
Raz-Kids/IXL-classroom hon Abeka - trial 24h + class seeding cua minh
dung huong self-serve classroom.

# Google Play listing - English Arena

Package: `com.vieschool.englisharena`
Store presence URL (PWA): https://ea.vieschool.com/app
Privacy policy URL: https://ea.vieschool.com/privacy.html
Category: Education
Contact email: hello@vieschool.com

## Short description (80 chars max)

Luyện tiếng Anh lớp 1-5 theo SGK Global Success - chơi mà học mỗi ngày

## Full description (4000 chars max)

English Arena giúp học sinh tiểu học luyện tiếng Anh mỗi ngày qua trò chơi,
bài luyện và đề thi bám sát chương trình Tiếng Anh Global Success của
Bộ Giáo dục và Đào tạo.

DÀNH CHO AI
- Học sinh lớp 1 đến lớp 5: luyện từ vựng, ngữ pháp, nghe, đọc và phát âm.
- Giáo viên: giao bài tập theo lớp, chấm và theo dõi tiến độ từng học sinh.
- Phụ huynh: xem báo cáo học tập của con theo tuần.

NỘI DUNG
- Hơn 99.000 câu hỏi tiếng Anh được kiểm duyệt, bám sát từng bài học SGK.
- Đề luyện, đề thi thử theo cấu trúc của trường.
- Nghe chuẩn, luyện phát âm có chấm điểm tự động.
- 15+ trò chơi: lật thẻ, bóng bay, đua xe, câu cá, đấu trường xếp hạng.

AN TOÀN CHO TRẺ EM
- Không quảng cáo, không mua bán trong app, không theo dõi.
- Học sinh chơi được ngay không cần tài khoản.
- Tài khoản học sinh do giáo viên hoặc phụ huynh tạo.
- Không chat, không nội dung do người dùng tạo công khai.

English Arena - sản phẩm của VieSchool.
Hỗ trợ: hello@vieschool.com - 0948 042 989 (Zalo/WhatsApp)

## Data safety form (draft answers)

Data collection: YES (minimal, see privacy policy)

| Data type | Collected? | Shared? | Purpose | Required? |
|---|---|---|---|---|
| Email address | Only teacher/parent accounts | No | Account management | Optional |
| User IDs (display name, role) | Yes | No | App functionality, personalization | Optional |
| App activity (scores, progress) | Yes | No | App functionality, analytics | Yes |
| Audio recordings (pronunciation) | Optional, user-initiated | No | App functionality | Optional |
| Approximate location | No | - | - | - |
| Device or other IDs | No | - | - | - |

Data encrypted in transit: YES
Data deletion request mechanism: YES (hello@vieschool.com)
Committed to Play Families policy: YES (kids app, see below)

## Target audience & content

- Age group: 6-12 (children) + adults (teachers/parents surfaces)
- Designed for Families program: DECLARE - app is primarily for children
- Ads: NO ads SDK
- In-app purchases: NONE (no IAP in v1)
- UGC / social features: none (no chat, no public profiles)

## Content rating questionnaire (IARC) - draft answers

- Violence: none (cartoon-style games only)
- Sexuality / nudity: none
- Language: none
- Controlled substances: none
- Gambling: none
- User interaction / UGC: no
- Location sharing: no
- Expected rating: Everyone / PEGI 3

## Store listing assets (generated in repo `_shots/store/`)

- 01-entry.png - login/home (1080x1920)
- 02-grade-select.png - grade map (1080x1920)
- 03-next.png - grade 3 hub (1080x1920)
- 04-gamezone.png - game shelf + missions (1080x1920)
- feature-graphic.png - 1024x500 banner
- Icon: public/icon-512.png (512x512)

## Release checklist (operator steps)

1. Play Console -> Create app -> name "English Arena",
   default language vi-VN, app type App, free.
2. Complete: Privacy policy URL, Data safety, Target audience
   (Designed for Families), Content rating, Store listing
   (copy above), icon + feature graphic + 4 screenshots.
3. Production -> Create release -> upload AAB
   (`ea-android/android/app/build/outputs/bundle/release/app-release.aab`,
   signed with upload key in secrets dir - Play App Signing enrolled
   by default).
4. Release notes (vi): "Phát hành đầu tiên."
5. Submit for review.

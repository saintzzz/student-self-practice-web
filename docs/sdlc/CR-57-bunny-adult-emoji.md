# CR-57: Thỏ Trắng trưởng thành hiển thị sai loài (kỳ lân thay vì thỏ)

> Ngày: 2026-10-05 - Loại: minor fix (bug nội dung hiển thị) - Trạng thái: Fixed

## 1. Vấn đề

User báo: "Thỏ Trắng - Trưởng thành mà hình lại là con ngựa kì cục".
Nguyên nhân: `PET_SPECIES.bunny.emojis[3]` = 🦄 - chuỗi tiến hóa
🥚→🐰→🐇→🦄 biến thỏ thành ngựa ở stage cuối. Các loài khác đều tiến hóa
cùng họ (mèo→hổ, thằn lằn→rồng), chỉ thỏ nhảy loài.

## 2. Sửa

`emojis[3]` = `🐇👑` - thỏ đội vương miện. Unicode chỉ có 2 glyph thỏ
(🐰 mặt, 🐇 thân) nên 👑 mang tín hiệu "đỉnh chuỗi" - khớp luôn badge
`pet-adult` đang dùng 👑. PetCard render raw text nên chuỗi 2 glyph
hiển thị cạnh nhau bình thường, không ảnh hưởng emoji asset pipeline.

## 3. Verify

- pet.test: assert adult emoji chứa 🐇, không chứa 🦄.
- Playwright: pet card Thỏ Trắng Trưởng thành hiện 🐇👑.

# CR-150 - Ambient video surfaces (Veo via Google Flow)

PO call: generated video chỉ đặt ở bề mặt cảm xúc/trang trí - tuyệt đối
không trong câu hỏi (clean-play doctrine; Veo cũng không render chính
xác khẩu hình phonics). 9 clips, Omni 1.2 Flash 16:9 720p.

## Clips (manifest-video.mjs -> public/videos/)

| Slot | Clip | Nơi hiển thị |
|---|---|---|
| land-playground/town/jungle/city/space-loop | 5 | `LandArt` hero - video phủ lên still art cùng crop/mask/filter |
| mystery-island-reveal | 1 | `MysteryIslandCard` panel mở |
| pet-cat/bunny/dragon-evolve | 3 | `PetCard` pet-evolved banner khi `stage >= 4` (clip vẽ dạng crown/star-charm khớp stage-4/5 art) |

## Thiết kế

- **`LoopingVideo`**: `<video muted loop autoPlay playsInline
  preload="metadata">`, poster = webp still. `onError` -> render null;
  ảnh fallback bên dưới luôn hiện -> zero-regression cho file thiếu,
  mạng chậm, data-saver.
- **`LandArt`**: `LAND_LOOPS` set (5 land, `sky` không có) - chỉ hero/
  hero-compact overlay video; strip giữ static (không đốt băng thông).
- **Driver**: `run-flow-video.mjs` - tab project video RIÊNG
  (`cfedce1d-...`, agent session là linear nên tách khỏi image lane).
  Flow: snapshot `.video-container` -> submit -> chờ card mới (~5min/
  clip) -> click vào `/edit/` -> "Tải xuống" -> 720p -> save mp4.
  Watchdog + breaker y như image driver.
- Agent settings project video: confirm-before-create = "Không bao
  giờ" (autonomous), model Omni 1.2 Flash, 16:9, 1 result.

## Còn lại

- Clips ở `artgen-out/*.mp4` -> `public/videos/` (copy khi lane xong).
- Nếu cần loop seamless hơn: re-gen với prompt "perfect loop" hoặc
  trim frame đầu/cuối.

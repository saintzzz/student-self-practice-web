/**
 * kids-UX (R4): collectible home-item pool - free cosmetic decorations of
 * equal value that a gift box places in the pet/scene home (Khan-Kids
 * collectible-with-a-home pattern). Emoji glyphs reuse the existing
 * Twemoji/Noto credit - no new license. No rarity tiers, no currency.
 */
export interface HomeItem {
  id: string;
  nameVi: string;
  emoji: string;
  /** Bespoke art (ChatGPT gen); emoji stays the fallback glyph. */
  art?: string;
}

export const HOME_ITEMS: readonly HomeItem[] = [
  { id: 'ball', nameVi: 'Quả bóng', emoji: '⚽', art: `/images/home/home-ball.webp` },
  { id: 'balloon', nameVi: 'Bóng bay', emoji: '🎈', art: `/images/home/home-balloon.webp` },
  { id: 'kite', nameVi: 'Con diều', emoji: '🪁', art: `/images/home/home-kite.webp` },
  { id: 'teddy', nameVi: 'Gấu bông', emoji: '🧸', art: `/images/home/home-teddy.webp` },
  { id: 'sunflower', nameVi: 'Hoa hướng dương', emoji: '🌻', art: `/images/home/home-sunflower.webp` },
  { id: 'cactus', nameVi: 'Cây xương rồng', emoji: '🌵', art: `/images/home/home-cactus.webp` },
  { id: 'mushroom', nameVi: 'Nấm nhỏ', emoji: '🍄', art: `/images/home/home-mushroom.webp` },
  { id: 'castle', nameVi: 'Lâu đài', emoji: '🏰', art: `/images/home/home-castle.webp` },
  { id: 'tent', nameVi: 'Lều trại', emoji: '⛺', art: `/images/home/home-tent.webp` },
  { id: 'carousel', nameVi: 'Đu quay', emoji: '🎠', art: `/images/home/home-carousel.webp` },
  { id: 'slide', nameVi: 'Cầu trượt', emoji: '🛝', art: `/images/home/home-slide.webp` },
  { id: 'yoyo', nameVi: 'Yo-yo', emoji: '🪀', art: `/images/home/home-yoyo.webp` },
  { id: 'palette', nameVi: 'Bảng màu', emoji: '🎨', art: `/images/home/home-palette.webp` },
  { id: 'guitar', nameVi: 'Đàn ghita', emoji: '🎸', art: `/images/home/home-guitar.webp` },
  { id: 'drum', nameVi: 'Trống con', emoji: '🥁', art: `/images/home/home-drum.webp` },
  { id: 'bike', nameVi: 'Xe đạp', emoji: '🚲', art: `/images/home/home-bike.webp` },
  { id: 'canoe', nameVi: 'Thuyền nan', emoji: '🛶', art: `/images/home/home-canoe.webp` },
  { id: 'star-lamp', nameVi: 'Đèn ngôi sao', emoji: '⭐', art: `/images/home/home-star-lamp.webp` },
  { id: 'rainbow', nameVi: 'Cầu vồng', emoji: '🌈', art: `/images/home/home-rainbow.webp` },
  { id: 'moon', nameVi: 'Ông trăng', emoji: '🌙', art: `/images/home/home-moon.webp` },
  { id: 'sun', nameVi: 'Ông mặt trời', emoji: '☀️', art: `/images/home/home-sun.webp` },
  { id: 'tree', nameVi: 'Cây xanh', emoji: '🌳', art: `/images/home/home-tree.webp` },
  { id: 'fish', nameVi: 'Bể cá', emoji: '🐠', art: `/images/home/home-fish.webp` },
  { id: 'butterfly', nameVi: 'Chuồn chuồn', emoji: '🦋', art: `/images/home/home-butterfly.webp` },
] as const;

export const HOME_ITEM_IDS: ReadonlySet<string> = new Set(HOME_ITEMS.map((i) => i.id));

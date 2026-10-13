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
}

export const HOME_ITEMS: readonly HomeItem[] = [
  { id: 'ball', nameVi: 'Quả bóng', emoji: '⚽' },
  { id: 'balloon', nameVi: 'Bóng bay', emoji: '🎈' },
  { id: 'kite', nameVi: 'Con diều', emoji: '🪁' },
  { id: 'teddy', nameVi: 'Gấu bông', emoji: '🧸' },
  { id: 'sunflower', nameVi: 'Hoa hướng dương', emoji: '🌻' },
  { id: 'cactus', nameVi: 'Cây xương rồng', emoji: '🌵' },
  { id: 'mushroom', nameVi: 'Nấm nhỏ', emoji: '🍄' },
  { id: 'castle', nameVi: 'Lâu đài', emoji: '🏰' },
  { id: 'tent', nameVi: 'Lều trại', emoji: '⛺' },
  { id: 'carousel', nameVi: 'Đu quay', emoji: '🎠' },
  { id: 'slide', nameVi: 'Cầu trượt', emoji: '🛝' },
  { id: 'yoyo', nameVi: 'Yo-yo', emoji: '🪀' },
  { id: 'palette', nameVi: 'Bảng màu', emoji: '🎨' },
  { id: 'guitar', nameVi: 'Đàn ghita', emoji: '🎸' },
  { id: 'drum', nameVi: 'Trống con', emoji: '🥁' },
  { id: 'bike', nameVi: 'Xe đạp', emoji: '🚲' },
  { id: 'canoe', nameVi: 'Thuyền nan', emoji: '🛶' },
  { id: 'star-lamp', nameVi: 'Đèn ngôi sao', emoji: '⭐' },
  { id: 'rainbow', nameVi: 'Cầu vồng', emoji: '🌈' },
  { id: 'moon', nameVi: 'Ông trăng', emoji: '🌙' },
  { id: 'sun', nameVi: 'Ông mặt trời', emoji: '☀️' },
  { id: 'tree', nameVi: 'Cây xanh', emoji: '🌳' },
  { id: 'fish', nameVi: 'Bể cá', emoji: '🐠' },
  { id: 'butterfly', nameVi: 'Chuồn chuồn', emoji: '🦋' },
] as const;

export const HOME_ITEM_IDS: ReadonlySet<string> = new Set(HOME_ITEMS.map((i) => i.id));

import type { GameDef } from './types';

/**
 * CR-83 shelf metadata only - the hub tile (main bundle) imports THIS,
 * never the game components. Implementation code loads through the lazy
 * GameScreen chunk (bundle-budget D-03).
 */
export const GAME_DEFS: readonly GameDef[] = [
  {
    id: 'memory-match',
    title: 'Lật thẻ nhớ',
    tagline: 'Ghép hình với từ giống nhau',
    emoji: '🃏',
  },
  {
    id: 'balloon-pop',
    title: 'Bóng bay',
    tagline: 'Nghe từ rồi chạm đúng bóng',
    emoji: '🎈',
  },
  {
    id: 'racing-cars',
    title: 'Đua xe',
    tagline: 'Trả lời đúng để xe Heo về đích',
    emoji: '🏎️',
  },
  {
    id: 'fishing-catch',
    title: 'Câu cá',
    tagline: 'Chạm con cá mang hình đúng',
    emoji: '🎣',
  },
  {
    id: 'letter-catch',
    title: 'Bắt chữ',
    tagline: 'Chạm bóng chữ theo thứ tự đánh vần',
    emoji: '🫧',
  },
  {
    id: 'tic-tac-toe',
    title: 'Caro',
    tagline: 'Trả lời để đặt X thắng máy',
    emoji: '⭕',
  },
];

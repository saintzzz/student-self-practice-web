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
  {
    id: 'whack-a-mole',
    title: 'Đập chuột',
    tagline: 'Nghe từ rồi đập con chuột đúng',
    emoji: '🔨',
  },
  {
    id: 'feed-the-pig',
    title: 'Cho Heo ăn',
    tagline: 'Chọn đúng đĩa để cho Heo ăn',
    emoji: '🐷',
  },
  {
    id: 'picture-reveal',
    title: 'Lật tranh',
    tagline: 'Trả lời đúng để lật mở bức tranh',
    emoji: '🖼️',
  },
  {
    id: 'treasure-chest',
    title: 'Hòm kho báu',
    tagline: 'Trả lời đúng để mở ổ khóa vàng',
    emoji: '🧰',
  },
  {
    id: 'gold-quest',
    title: 'Đào vàng',
    tagline: 'Trả lời đúng rồi chọn rương may mắn',
    emoji: '💎',
  },
  {
    id: 'quiz-show',
    title: 'Ai là triệu phú',
    tagline: 'Lên đỉnh giải thưởng trước khi hết giờ',
    emoji: '🎤',
    grades: ['grade-3', 'grade-4', 'grade-5'],
  },
  {
    id: 'maze-chase',
    title: 'Đi mê cung',
    tagline: 'Dẫn Heo tới ô đáp án, né con ma',
    emoji: '👻',
  },
  {
    id: 'word-worm',
    title: 'Rắn đánh vầm',
    tagline: 'Ăn chữ cái theo thứ tự đánh vần',
    emoji: '🐛',
  },
  {
    id: 'castle-guard',
    title: 'Giữ thành',
    tagline: 'Trả lời đúng bắn hạ quái trước cổng',
    emoji: '🏰',
  },
];

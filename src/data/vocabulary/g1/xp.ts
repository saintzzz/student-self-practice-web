import type { Topic, VocabWord } from '../../../types';
import { xp } from '../xp';

export const G1_XP_ANIMALS_TOPIC: Topic = { id: 'g1-xp-animals', gradeId: 'grade-1', name: 'Động vật' };
export const G1_XP_NATURE_TOPIC: Topic = { id: 'g1-xp-nature', gradeId: 'grade-1', name: 'Thiên nhiên' };
export const G1_XP_THINGS_TOPIC: Topic = { id: 'g1-xp-things', gradeId: 'grade-1', name: 'Đồ vật quanh em' };

/** CR-15: easy animal words (baby animals, farm/bird additions). */
export const G1_XP_ANIMALS_WORDS: VocabWord[] = xp('g1-xp-animals', [
  ['puppy', 'puppy', 'puppies', '🐕', 'Chó con', true],
  ['kitten', 'kitten', 'kittens', '🐈', 'Mèo con', true],
  ['piglet', 'piglet', 'piglets', '🐖', 'Lợn con', true],
  ['calf', 'calf', 'calves', '🐮', 'Bê con', true],
  ['foal', 'foal', 'foals', '🐎', 'Ngựa con', true],
  ['chick', 'chick', 'chicks', '🐤', 'Gà con', true],
  ['bunny', 'bunny', 'bunnies', '🐇', 'Thỏ con', true],
  ['rooster', 'rooster', 'roosters', '🐓', 'Gà trống', true],
  ['turkey-bird', 'turkey', 'turkeys', '🦃', 'Gà tây', true],
  ['goose', 'goose', 'geese', '🪿', 'Con ngỗng', true],
  ['dove', 'dove', 'doves', '🕊️', 'Chim bồ câu', true],
  ['poodle', 'poodle', 'poodles', '🐩', 'Chó xù poodle', true],
  ['rat', 'rat', 'rats', '🐀', 'Chuột cống', true],
]);

/** CR-15: nature/weather words with clear glyphs. */
export const G1_XP_NATURE_WORDS: VocabWord[] = xp('g1-xp-nature', [
  ['cactus', 'cactus', 'cactuses', '🌵', 'Cây xương rồng', true],
  ['tulip', 'tulip', 'tulips', '🌷', 'Hoa tulip', true],
  ['rose', 'rose', 'roses', '🌹', 'Hoa hồng', true],
  ['sunflower', 'sunflower', 'sunflowers', '🌻', 'Hoa hướng dương', true],
  ['hibiscus', 'hibiscus', 'hibiscuses', '🌺', 'Hoa dâm bụt', true],
  ['daisy', 'daisy', 'daisies', '🌼', 'Hoa cúc nhỏ', true],
  ['lotus', 'lotus', 'lotuses', '🪷', 'Hoa sen', true],
  ['clover', 'clover', 'clovers', '🍀', 'Cỏ bốn lá', true],
  ['bamboo', 'bamboo', null, '🎋', 'Cây tre', false],
  ['nest', 'nest', 'nests', '🪹', 'Tổ chim', true],
  ['herb', 'herb', 'herbs', '🌿', 'Cây thảo mộc', true],
  ['maple-leaf', 'maple leaf', 'maple leaves', '🍁', 'Lá phong', true],
  ['volcano', 'volcano', 'volcanoes', '🌋', 'Núi lửa', true],
  ['desert', 'desert', 'deserts', '🏜️', 'Sa mạc', true],
  ['earth', 'Earth', null, '🌎', 'Trái Đất', false],
  ['planet', 'planet', 'planets', '🪐', 'Hành tinh', true],
  ['snowman', 'snowman', 'snowmen', '⛄', 'Người tuyết', true],
  ['sunrise', 'sunrise', 'sunrises', '🌄', 'Bình minh', true],
  ['sunset', 'sunset', 'sunsets', '🌇', 'Hoàng hôn', true],
  ['bubbles', 'bubbles', null, '🫧', 'Bong bóng', false],
]);

/** CR-15: simple everyday objects a G1 child can name. */
export const G1_XP_THINGS_WORDS: VocabWord[] = xp('g1-xp-things', [
  ['lock', 'lock', 'locks', '🔒', 'Ổ khóa', true],
  ['hammer', 'hammer', 'hammers', '🔨', 'Cái búa', true],
  ['saw', 'saw', 'saws', '🪚', 'Cái cưa', true],
  ['soap', 'soap', null, '🧼', 'Xà phòng', false],
  ['comb', 'comb', 'combs', '🪮', 'Cái lược', true],
  ['vase', 'vase', 'vases', '🏺', 'Cái lọ hoa', true],
  ['pin', 'pin', 'pins', '📍', 'Cái ghim', true],
  ['page', 'page', 'pages', '📄', 'Trang giấy', true],
  ['watch', 'watch', 'watches', '⌚', 'Đồng hồ đeo tay', true],
  ['phone', 'phone', 'phones', '📱', 'Điện thoại', true],
  ['radio', 'radio', 'radios', '📻', 'Cái radio', true],
  ['battery', 'battery', 'batteries', '🔋', 'Cục pin', true],
  ['plug', 'plug', 'plugs', '🔌', 'Phích cắm điện', true],
  ['bin', 'bin', 'bins', '🗑️', 'Thùng rác', true],
  ['broom', 'broom', 'brooms', '🧹', 'Cây chổi', true],
  ['bookmark', 'bookmark', 'bookmarks', '🔖', 'Kẹp đánh dấu trang', true],
  ['newspaper', 'newspaper', 'newspapers', '🗞️', 'Tờ báo', true],
  ['hook', 'hook', 'hooks', '🪝', 'Cái móc', true],
  ['knot', 'knot', 'knots', '🪢', 'Nút thắt', true],
  ['chain', 'chain', 'chains', '⛓️', 'Dây xích', true],
]);

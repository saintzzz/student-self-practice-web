/**
 * CR-24 - authored science-in-English bank for the Thi thử Science
 * program (IOE runs "IOE Science" alongside English). Each fact yields
 * multiple question variants (MCQ, True/False, fill-in) so ~40 facts per
 * band produce a 100+ question pool.
 */
export interface ScienceFact {
  /** Question stem for the MCQ/fill variant. */
  question: string;
  /** Correct answer (short - a word or number). */
  answer: string;
  /** 3 plausible wrong answers for the MCQ variant. */
  distractors: readonly [string, string, string];
  /** True/False variant: a true statement about the fact... */
  trueStatement: string;
  /** ...and a false one (flip one detail). */
  falseStatement: string;
  explanationVi: string;
}

export const SCIENCE_G12: readonly ScienceFact[] = [
  { question: 'How many legs does a cat have?', answer: 'four', distractors: ['two', 'six', 'eight'], trueStatement: 'A cat has four legs.', falseStatement: 'A cat has six legs.', explanationVi: 'Mèo có 4 chân.' },
  { question: 'Which animal can fly?', answer: 'bird', distractors: ['fish', 'dog', 'cat'], trueStatement: 'A bird can fly.', falseStatement: 'A fish can fly.', explanationVi: 'Chim bay được, cá thì bơi.' },
  { question: 'What do plants need to grow?', answer: 'water', distractors: ['candy', 'toys', 'shoes'], trueStatement: 'Plants need water to grow.', falseStatement: 'Plants need candy to grow.', explanationVi: 'Cây cần nước và ánh sáng để lớn.' },
  { question: 'Where does a fish live?', answer: 'water', distractors: ['tree', 'sky', 'house'], trueStatement: 'A fish lives in water.', falseStatement: 'A fish lives in a tree.', explanationVi: 'Cá sống dưới nước.' },
  { question: 'What colour is the sun?', answer: 'yellow', distractors: ['blue', 'green', 'black'], trueStatement: 'The sun is yellow.', falseStatement: 'The sun is blue.', explanationVi: 'Mặt trời màu vàng.' },
  { question: 'Which season is cold?', answer: 'winter', distractors: ['summer', 'spring', 'autumn'], trueStatement: 'Winter is cold.', falseStatement: 'Summer is cold.', explanationVi: 'Mùa đông lạnh.' },
  { question: 'What do we use to see?', answer: 'eyes', distractors: ['ears', 'hands', 'feet'], trueStatement: 'We use our eyes to see.', falseStatement: 'We use our ears to see.', explanationVi: 'Dùng mắt để nhìn.' },
  { question: 'What do we use to hear?', answer: 'ears', distractors: ['eyes', 'nose', 'mouth'], trueStatement: 'We use our ears to hear.', falseStatement: 'We use our eyes to hear.', explanationVi: 'Dùng tai để nghe.' },
  { question: 'Which animal says "woof"?', answer: 'dog', distractors: ['cat', 'duck', 'bird'], trueStatement: 'A dog says "woof".', falseStatement: 'A cat says "woof".', explanationVi: 'Chó sủa "woof/ gâu gâu".' },
  { question: 'Is ice hot or cold?', answer: 'cold', distractors: ['hot', 'warm', 'big'], trueStatement: 'Ice is cold.', falseStatement: 'Ice is hot.', explanationVi: 'Đá lạnh.' },
  { question: 'What do bees make?', answer: 'honey', distractors: ['milk', 'bread', 'juice'], trueStatement: 'Bees make honey.', falseStatement: 'Bees make milk.', explanationVi: 'Ong làm mật.' },
  { question: 'Which is a fruit?', answer: 'apple', distractors: ['carrot', 'potato', 'rice'], trueStatement: 'An apple is a fruit.', falseStatement: 'A carrot is a fruit.', explanationVi: 'Táo là trái cây; cà rốt là củ.' },
  { question: 'What animal gives us milk?', answer: 'cow', distractors: ['cat', 'bird', 'fish'], trueStatement: 'A cow gives us milk.', falseStatement: 'A bird gives us milk.', explanationVi: 'Bò cho sữa.' },
  { question: 'What do we drink every day?', answer: 'water', distractors: ['sand', 'paper', 'grass'], trueStatement: 'We drink water every day.', falseStatement: 'We drink sand every day.', explanationVi: 'Uống nước mỗi ngày.' },
];

export const SCIENCE_G3: readonly ScienceFact[] = [
  { question: 'Which planet do we live on?', answer: 'Earth', distractors: ['Mars', 'Moon', 'Sun'], trueStatement: 'We live on planet Earth.', falseStatement: 'We live on planet Mars.', explanationVi: 'Chúng ta sống trên Trái Đất.' },
  { question: 'What is the biggest star we can see?', answer: 'the Sun', distractors: ['the Moon', 'Mars', 'a comet'], trueStatement: 'The Sun is a star.', falseStatement: 'The Moon is a star.', explanationVi: 'Mặt trời là một ngôi sao; Mặt trăng là vệ tinh.' },
  { question: 'Which animal is a mammal?', answer: 'whale', distractors: ['shark', 'frog', 'snake'], trueStatement: 'A whale is a mammal.', falseStatement: 'A shark is a mammal.', explanationVi: 'Cá voi là động vật có vú; cá mập là cá.' },
  { question: 'What do plants make from sunlight?', answer: 'food', distractors: ['toys', 'shoes', 'paper'], trueStatement: 'Plants make food from sunlight.', falseStatement: 'Plants make toys from sunlight.', explanationVi: 'Cây quang hợp tạo thức ăn.' },
  { question: 'Which part of the plant takes water from the ground?', answer: 'root', distractors: ['leaf', 'flower', 'fruit'], trueStatement: 'Roots take water from the ground.', falseStatement: 'Flowers take water from the ground.', explanationVi: 'Rễ hút nước từ đất.' },
  { question: 'What do we call a baby dog?', answer: 'puppy', distractors: ['kitten', 'calf', 'chick'], trueStatement: 'A baby dog is a puppy.', falseStatement: 'A baby dog is a kitten.', explanationVi: 'Chó con là puppy; mèo con là kitten.' },
  { question: 'Which season has the most rain in Viet Nam?', answer: 'summer', distractors: ['winter', 'spring', 'autumn'], trueStatement: 'Summer has a lot of rain in Viet Nam.', falseStatement: 'Winter has the most rain in Viet Nam.', explanationVi: 'Mùa hè/mùa mưa ở VN nhiều mưa nhất.' },
  { question: 'What is water when it is very cold?', answer: 'ice', distractors: ['steam', 'rain', 'cloud'], trueStatement: 'Very cold water becomes ice.', falseStatement: 'Very cold water becomes steam.', explanationVi: 'Nước đông thành đá khi rất lạnh.' },
  { question: 'What is water when it is very hot?', answer: 'steam', distractors: ['ice', 'snow', 'rain'], trueStatement: 'Very hot water becomes steam.', falseStatement: 'Very hot water becomes ice.', explanationVi: 'Nước sôi thành hơi nước.' },
  { question: 'Which animal lays eggs?', answer: 'chicken', distractors: ['cow', 'dog', 'cat'], trueStatement: 'A chicken lays eggs.', falseStatement: 'A cow lays eggs.', explanationVi: 'Gà đẻ trứng; bò là động vật có vú.' },
  { question: 'Which is the biggest animal on land?', answer: 'elephant', distractors: ['mouse', 'cat', 'rabbit'], trueStatement: 'The elephant is the biggest land animal.', falseStatement: 'The mouse is the biggest land animal.', explanationVi: 'Voi là động vật trên cạn lớn nhất.' },
  { question: 'What do we breathe in to live?', answer: 'air', distractors: ['water', 'juice', 'milk'], trueStatement: 'We breathe in air to live.', falseStatement: 'We breathe in water to live.', explanationVi: 'Hít thở không khí để sống.' },
  { question: 'Which is NOT a source of light?', answer: 'moon', distractors: ['sun', 'candle', 'lamp'], trueStatement: 'The Moon only reflects sunlight.', falseStatement: 'The Moon makes its own light.', explanationVi: 'Mặt trăng chỉ phản chiếu ánh sáng mặt trời.' },
  { question: 'What keeps us warm in winter?', answer: 'coat', distractors: ['fan', 'ice', 'shorts'], trueStatement: 'A coat keeps us warm.', falseStatement: 'A fan keeps us warm.', explanationVi: 'Áo khoác giữ ấm; quạt làm mát.' },
];

export const SCIENCE_G45: readonly ScienceFact[] = [
  { question: 'What is the full moon?', answer: 'a round bright moon', distractors: ['a half moon', 'a new moon', 'no moon'], trueStatement: 'A full moon is round and bright.', falseStatement: 'A full moon looks like a half circle.', explanationVi: 'Trăng rằm tròn và sáng.' },
  { question: 'How long does the Earth take to go around the Sun?', answer: 'one year', distractors: ['one day', 'one week', 'one month'], trueStatement: 'The Earth takes one year to go around the Sun.', falseStatement: 'The Earth takes one day to go around the Sun.', explanationVi: 'Trái Đất quay quanh Mặt trời mất 1 năm (365 ngày).' },
  { question: 'What causes day and night?', answer: 'the Earth spins', distractors: ['the Sun moves', 'the Moon blocks the Sun', 'clouds cover the sky'], trueStatement: 'Day and night happen because the Earth spins.', falseStatement: 'Day and night happen because the Sun spins.', explanationVi: 'Ngày và đêm do Trái Đất tự quay.' },
  { question: 'Which gas do plants take in?', answer: 'carbon dioxide', distractors: ['oxygen', 'helium', 'hydrogen'], trueStatement: 'Plants take in carbon dioxide.', falseStatement: 'Plants take in oxygen to make food.', explanationVi: 'Cây hấp thụ CO2 để quang hợp, nhả ra oxy.' },
  { question: 'Which organ pumps blood around the body?', answer: 'heart', distractors: ['brain', 'stomach', 'lung'], trueStatement: 'The heart pumps blood.', falseStatement: 'The brain pumps blood.', explanationVi: 'Tim bơm máu đi khắp cơ thể.' },
  { question: 'What do we use to think?', answer: 'brain', distractors: ['heart', 'stomach', 'hand'], trueStatement: 'We use the brain to think.', falseStatement: 'We use the stomach to think.', explanationVi: 'Não dùng để suy nghĩ.' },
  { question: 'Which animals have a backbone?', answer: 'vertebrates', distractors: ['insects', 'worms', 'jellyfish'], trueStatement: 'Vertebrates have a backbone.', falseStatement: 'Insects have a backbone.', explanationVi: 'Động vật có xương sống gọi là vertebrates; côn trùng không có.' },
  { question: 'What is the water cycle?', answer: 'water moving between sea, sky and land', distractors: ['water in a bottle', 'a bath', 'rain only'], trueStatement: 'The water cycle moves water between sea, sky and land.', falseStatement: 'The water cycle only happens in a bottle.', explanationVi: 'Vòng tuần hoàn nước: bay hơi - mưa - chảy về biển.' },
  { question: 'Which is a solid?', answer: 'rock', distractors: ['water', 'air', 'steam'], trueStatement: 'A rock is a solid.', falseStatement: 'Water is a solid at room temperature.', explanationVi: 'Đá là chất rắn; nước lỏng; hơi nước là khí.' },
  { question: 'What does a thermometer measure?', answer: 'temperature', distractors: ['rain', 'wind', 'time'], trueStatement: 'A thermometer measures temperature.', falseStatement: 'A thermometer measures rain.', explanationVi: 'Nhiệt kế đo nhiệt độ.' },
  { question: 'Which planet is closest to the Sun?', answer: 'Mercury', distractors: ['Earth', 'Mars', 'Jupiter'], trueStatement: 'Mercury is closest to the Sun.', falseStatement: 'Earth is closest to the Sun.', explanationVi: 'Sao Thủy gần Mặt trời nhất.' },
  { question: 'What do we call animals that eat only plants?', answer: 'herbivores', distractors: ['carnivores', 'omnivores', 'insects'], trueStatement: 'Herbivores eat only plants.', falseStatement: 'Herbivores eat only meat.', explanationVi: 'Herbivore = động vật ăn cỏ; carnivore = ăn thịt.' },
  { question: 'Why do we see lightning before we hear thunder?', answer: 'light travels faster than sound', distractors: ['sound travels faster than light', 'thunder comes first', 'they happen at different places'], trueStatement: 'We see lightning first because light travels faster than sound.', falseStatement: 'Sound travels faster than light.', explanationVi: 'Ánh sáng nhanh hơn âm thanh nên thấy chớp trước tiếng sấm.' },
  { question: 'Which is the biggest planet in our Solar System?', answer: 'Jupiter', distractors: ['Earth', 'Mars', 'Venus'], trueStatement: 'Jupiter is the biggest planet.', falseStatement: 'Earth is the biggest planet.', explanationVi: 'Sao Mộc lớn nhất hệ Mặt Trời.' },
];

export function scienceBankForGrade(gradeId: string): readonly ScienceFact[] {
  if (gradeId === 'grade-1' || gradeId === 'grade-2') return SCIENCE_G12;
  if (gradeId === 'grade-3') return SCIENCE_G3;
  return SCIENCE_G45;
}

/**
 * CR-25 - classification lists for generated "Which one is a ...?" and
 * "Which is NOT a ...?" questions. Members/nonMembers are authored so
 * every generated item is factually unambiguous.
 */
export interface ScienceClass {
  label: string;
  labelVi: string;
  members: readonly string[];
  nonMembers: readonly string[];
}

const CLASSES_G12: readonly ScienceClass[] = [
  { label: 'animal', labelVi: 'con vật', members: ['dog', 'cat', 'fish', 'bird', 'duck'], nonMembers: ['apple', 'chair', 'pen', 'car', 'tree'] },
  { label: 'fruit', labelVi: 'trái cây', members: ['apple', 'banana', 'orange', 'mango', 'grape'], nonMembers: ['carrot', 'potato', 'rice', 'bread', 'egg'] },
  { label: 'vegetable', labelVi: 'rau củ', members: ['carrot', 'potato', 'cabbage', 'tomato', 'onion'], nonMembers: ['apple', 'cake', 'milk', 'juice', 'candy'] },
  { label: 'insect', labelVi: 'côn trùng', members: ['ant', 'bee', 'butterfly', 'mosquito', 'fly'], nonMembers: ['dog', 'frog', 'spider', 'fish', 'bird'] },
  { label: 'thing in the sky', labelVi: 'vật trên trời', members: ['sun', 'moon', 'star', 'cloud', 'bird'], nonMembers: ['fish', 'rock', 'table', 'worm', 'dog'] },
  { label: 'thing we can eat', labelVi: 'đồ ăn được', members: ['rice', 'bread', 'egg', 'apple', 'fish'], nonMembers: ['rock', 'chair', 'paper', 'soap', 'shoe'] },
  { label: 'thing with legs', labelVi: 'đồ vật/con vật có chân', members: ['table', 'chair', 'dog', 'cat', 'bed'], nonMembers: ['ball', 'cup', 'book', 'fish', 'cloud'] },
];

const CLASSES_G3: readonly ScienceClass[] = [
  { label: 'mammal', labelVi: 'động vật có vú', members: ['cat', 'whale', 'bat', 'elephant', 'cow'], nonMembers: ['frog', 'snake', 'eagle', 'shark', 'ant'] },
  { label: 'insect', labelVi: 'côn trùng', members: ['ant', 'bee', 'beetle', 'butterfly', 'mosquito'], nonMembers: ['spider', 'worm', 'snail', 'frog', 'lizard'] },
  { label: 'planet', labelVi: 'hành tinh', members: ['Earth', 'Mars', 'Venus', 'Jupiter', 'Saturn'], nonMembers: ['the Moon', 'the Sun', 'a comet', 'a star', 'Pluto'] },
  { label: 'plant part', labelVi: 'bộ phận của cây', members: ['root', 'leaf', 'flower', 'stem', 'fruit'], nonMembers: ['rock', 'wing', 'fin', 'shell', 'tail'] },
  { label: 'thing made of water', labelVi: 'dạng của nước', members: ['ice', 'snow', 'rain', 'steam', 'cloud'], nonMembers: ['sand', 'rock', 'fire', 'wind', 'soil'] },
  { label: 'job that helps people', labelVi: 'nghề giúp người', members: ['doctor', 'teacher', 'farmer', 'firefighter', 'nurse'], nonMembers: ['clown', 'pirate', 'robot', 'ghost', 'giant'] },
  { label: 'part of your body', labelVi: 'bộ phận cơ thể', members: ['arm', 'leg', 'head', 'hand', 'foot'], nonMembers: ['wing', 'fin', 'leaf', 'rock', 'cloud'] },
];

const CLASSES_G45: readonly ScienceClass[] = [
  { label: 'mammal', labelVi: 'động vật có vú', members: ['whale', 'bat', 'dolphin', 'tiger', 'human'], nonMembers: ['crocodile', 'penguin', 'octopus', 'butterfly', 'shark'] },
  { label: 'reptile', labelVi: 'bò sát', members: ['snake', 'lizard', 'crocodile', 'turtle', 'gecko'], nonMembers: ['frog', 'eagle', 'spider', 'whale', 'clam'] },
  { label: 'solid', labelVi: 'chất rắn', members: ['rock', 'ice', 'wood', 'metal', 'glass'], nonMembers: ['water', 'air', 'steam', 'milk', 'oil'] },
  { label: 'liquid', labelVi: 'chất lỏng', members: ['water', 'milk', 'juice', 'oil', 'rain'], nonMembers: ['ice', 'rock', 'steam', 'air', 'sand'] },
  { label: 'gas', labelVi: 'chất khí', members: ['air', 'steam', 'oxygen', 'smoke', 'carbon dioxide'], nonMembers: ['water', 'ice', 'rock', 'oil', 'soil'] },
  { label: 'planet', labelVi: 'hành tinh trong hệ Mặt Trời', members: ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Neptune'], nonMembers: ['the Moon', 'the Sun', 'a comet', 'an asteroid', 'a star'] },
  { label: 'herbivore', labelVi: 'động vật ăn cỏ', members: ['cow', 'elephant', 'rabbit', 'deer', 'giraffe'], nonMembers: ['lion', 'eagle', 'shark', 'wolf', 'frog'] },
  { label: 'sense organ', labelVi: 'cơ quan giác quan', members: ['eye', 'ear', 'nose', 'tongue', 'skin'], nonMembers: ['heart', 'lung', 'bone', 'muscle', 'brain'] },
];

export function scienceClassesForGrade(gradeId: string): readonly ScienceClass[] {
  if (gradeId === 'grade-1' || gradeId === 'grade-2') return CLASSES_G12;
  if (gradeId === 'grade-3') return CLASSES_G3;
  return CLASSES_G45;
}

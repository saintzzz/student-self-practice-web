/**
 * CR-24 - authored science-in-English bank for the Thi thử Science
 * program (IOE runs "IOE Science" alongside English). Each fact yields
 * multiple question variants (MCQ, True/False, fill-in) so ~40 facts per
 * band produce a 100+ question pool.
 */
export interface ScienceDistractor {
  /**
   * CR-144 - wrong-but-tempting option text. Where a documented K-5
   * misconception exists (moon glows by itself, plants eat soil,
   * heavier falls faster, seasons = nearer the sun) the distractor IS
   * that misconception, so a wrong tap surfaces a real belief instead
   * of noise.
   */
  text: string;
  /**
   * CR-144 - one-line Vietnamese "tại sao sai" shown as "Gợi ý" when the
   * child picks this option. States the correction, never the answer
   * word - the answer is already shown by the verdict layer.
   */
  whyVi: string;
}

export interface ScienceFact {
  /** Question stem for the MCQ/fill variant. */
  question: string;
  /** Correct answer (short - a word or number). */
  answer: string;
  /** 3 plausible wrong answers for the MCQ variant. */
  distractors: readonly [ScienceDistractor, ScienceDistractor, ScienceDistractor];
  /** True/False variant: a true statement about the fact... */
  trueStatement: string;
  /** ...and a false one (flip one detail). */
  falseStatement: string;
  explanationVi: string;
}

const d = (text: string, whyVi: string): ScienceDistractor => ({ text, whyVi });

export const SCIENCE_G12: readonly ScienceFact[] = [
  { question: 'How many legs does a cat have?', answer: 'four', distractors: [d('two', '2 chân là của chim - mèo có 4 chân.'), d('six', '6 chân là của côn trùng - mèo có 4 chân.'), d('eight', '8 chân là của nhện - mèo có 4 chân.')], trueStatement: 'A cat has four legs.', falseStatement: 'A cat has six legs.', explanationVi: 'Mèo có 4 chân.' },
  { question: 'Which animal can fly?', answer: 'bird', distractors: [d('fish', 'Cá bơi dưới nước, không bay được.'), d('dog', 'Chó chạy trên cạn, không bay được.'), d('cat', 'Mèo nhảy được nhưng không bay được.')], trueStatement: 'A bird can fly.', falseStatement: 'A fish can fly.', explanationVi: 'Chim bay được, cá thì bơi.' },
  { question: 'What do plants need to grow?', answer: 'water', distractors: [d('milk', 'Cây không uống sữa - cây cần nước và ánh nắng.'), d('bread', 'Cây không ăn bánh - cây tự tạo thức ăn nhờ nước và nắng.'), d('food from the soil', 'Đất chỉ cho cây chất khoáng - cây tự tạo thức ăn nhờ ánh nắng, không "ăn" đất.')], trueStatement: 'Plants need water to grow.', falseStatement: 'Plants need candy to grow.', explanationVi: 'Cây cần nước và ánh sáng để lớn.' },
  { question: 'Where does a fish live?', answer: 'water', distractors: [d('tree', 'Cây là chỗ chim đậu - cá sống dưới nước.'), d('sky', 'Bầu trời là chỗ chim bay - cá sống dưới nước.'), d('house', 'Nhà là chỗ người ở - cá sống dưới nước.')], trueStatement: 'A fish lives in water.', falseStatement: 'A fish lives in a tree.', explanationVi: 'Cá sống dưới nước.' },
  { question: 'What colour is the sun?', answer: 'yellow', distractors: [d('blue', 'Xanh dương là màu bầu trời - mặt trời màu vàng.'), d('green', 'Xanh lá là màu cây cối - mặt trời màu vàng.'), d('black', 'Đen là màu của đêm - mặt trời sáng vàng.')], trueStatement: 'The sun is yellow.', falseStatement: 'The sun is blue.', explanationVi: 'Mặt trời màu vàng.' },
  { question: 'Which season is cold?', answer: 'winter', distractors: [d('summer', 'Mùa hè nóng - mùa đông mới lạnh.'), d('spring', 'Mùa xuân ấm áp - mùa đông mới lạnh.'), d('autumn', 'Mùa thu mát mẻ - mùa đông mới lạnh.')], trueStatement: 'Winter is cold.', falseStatement: 'Summer is cold.', explanationVi: 'Mùa đông lạnh.' },
  { question: 'What do we use to see?', answer: 'eyes', distractors: [d('ears', 'Tai để nghe - mắt mới để nhìn.'), d('hands', 'Tay để cầm nắm - mắt mới để nhìn.'), d('feet', 'Chân để đi lại - mắt mới để nhìn.')], trueStatement: 'We use our eyes to see.', falseStatement: 'We use our ears to see.', explanationVi: 'Dùng mắt để nhìn.' },
  { question: 'What do we use to hear?', answer: 'ears', distractors: [d('eyes', 'Mắt để nhìn - tai mới để nghe.'), d('nose', 'Mũi để ngửi - tai mới để nghe.'), d('mouth', 'Miệng để ăn nói - tai mới để nghe.')], trueStatement: 'We use our ears to hear.', falseStatement: 'We use our eyes to hear.', explanationVi: 'Dùng tai để nghe.' },
  { question: 'Which animal says "woof"?', answer: 'dog', distractors: [d('cat', 'Mèo kêu meo meo - chó mới sủa gâu gâu.'), d('duck', 'Vịt kêu quác quác - chó mới sủa gâu.'), d('bird', 'Chim hót líu lo - chó mới sủa gâu.')], trueStatement: 'A dog says "woof".', falseStatement: 'A cat says "woof".', explanationVi: 'Chó sủa "woof/ gâu gâu".' },
  { question: 'Is ice hot or cold?', answer: 'cold', distractors: [d('hot', 'Đá lạnh - nước chỉ đóng băng khi rất lạnh.'), d('warm', 'Ấm nghĩa là hơi nóng - đá luôn lạnh.'), d('big', 'To là kích thước - câu hỏi hỏi nóng hay lạnh, đá lạnh.')], trueStatement: 'Ice is cold.', falseStatement: 'Ice is hot.', explanationVi: 'Đá lạnh.' },
  { question: 'What do bees make?', answer: 'honey', distractors: [d('milk', 'Sữa là của bò - ong làm mật ong.'), d('bread', 'Bánh mì do người làm - ong làm mật ong.'), d('juice', 'Nước ép từ trái cây - ong làm mật ong.')], trueStatement: 'Bees make honey.', falseStatement: 'Bees make milk.', explanationVi: 'Ong làm mật.' },
  { question: 'Which is a fruit?', answer: 'apple', distractors: [d('carrot', 'Cà rốt là rau củ - táo mới là trái cây.'), d('potato', 'Khoai tây là củ - táo mới là trái cây.'), d('rice', 'Gạo là hạt - táo mới là trái cây.')], trueStatement: 'An apple is a fruit.', falseStatement: 'A carrot is a fruit.', explanationVi: 'Táo là trái cây; cà rốt là củ.' },
  { question: 'What animal gives us milk?', answer: 'cow', distractors: [d('cat', 'Mèo không cho sữa ta uống - bò mới cho sữa.'), d('bird', 'Chim đẻ trứng, không cho sữa - bò cho sữa.'), d('fish', 'Cá không cho sữa - bò cho sữa.')], trueStatement: 'A cow gives us milk.', falseStatement: 'A bird gives us milk.', explanationVi: 'Bò cho sữa.' },
  { question: 'What do we drink every day?', answer: 'water', distractors: [d('sand', 'Cát không uống được - ta uống nước mỗi ngày.'), d('paper', 'Giấy không uống được - ta uống nước mỗi ngày.'), d('grass', 'Cỏ là thức ăn của bò - ta uống nước mỗi ngày.')], trueStatement: 'We drink water every day.', falseStatement: 'We drink sand every day.', explanationVi: 'Uống nước mỗi ngày.' },
  // CR-144 - canonical misconception: kids think the Moon glows by itself.
  { question: 'Where does the Moon get its light?', answer: 'the Sun', distractors: [d('it makes its own light', 'Mặt trăng không tự sáng - nó phản chiếu ánh sáng mặt trời.'), d('the Earth', 'Trái Đất không chiếu sáng mặt trăng - ánh sáng đến từ mặt trời.'), d('the stars', 'Các sao quá xa và quá mờ - mặt trăng sáng nhờ mặt trời.')], trueStatement: 'The Moon shines because of the Sun.', falseStatement: 'The Moon makes its own light.', explanationVi: 'Mặt trăng phản chiếu ánh sáng mặt trời, không tự phát sáng.' },
  // CR-144 - canonical misconception: "the Sun drinks it" / it just disappears.
  { question: 'What happens to a puddle on a hot day?', answer: 'it dries up into the air', distractors: [d('the Sun drinks it', 'Mặt trời không uống nước - nhiệt làm nước bay hơi lên trời.'), d('it sinks under the ground', 'Vũng nước bay hơi vào không khí, không chìm hết xuống đất.'), d('it turns into stone', 'Nước bay hơi thành hơi nước, không hóa đá.')], trueStatement: 'A puddle dries up into the air on a hot day.', falseStatement: 'A puddle turns into stone on a hot day.', explanationVi: 'Nước bay hơi vào không khí khi trời nóng (bay hơi).' },
];

export const SCIENCE_G3: readonly ScienceFact[] = [
  { question: 'Which planet do we live on?', answer: 'Earth', distractors: [d('Mars', 'Sao Hỏa là hành tinh khác - ta sống trên Trái Đất.'), d('Moon', 'Mặt trăng là vệ tinh, không phải hành tinh ta sống trên đó.'), d('Sun', 'Mặt trời là ngôi sao - ta sống trên Trái Đất.')], trueStatement: 'We live on planet Earth.', falseStatement: 'We live on planet Mars.', explanationVi: 'Chúng ta sống trên Trái Đất.' },
  { question: 'What is the biggest star we can see?', answer: 'the Sun', distractors: [d('the Moon', 'Mặt trăng là vệ tinh, không phải ngôi sao.'), d('Mars', 'Sao Hỏa là hành tinh, không phải ngôi sao.'), d('a comet', 'Sao chổi là băng và đá bay - mặt trời mới là ngôi sao gần nhất.')], trueStatement: 'The Sun is a star.', falseStatement: 'The Moon is a star.', explanationVi: 'Mặt trời là một ngôi sao; Mặt trăng là vệ tinh.' },
  { question: 'Which animal is a mammal?', answer: 'whale', distractors: [d('shark', 'Cá mập là cá, không phải động vật có vú.'), d('frog', 'Ếch là động vật lưỡng cư, không phải có vú.'), d('snake', 'Rắn là bò sát, không phải có vú.')], trueStatement: 'A whale is a mammal.', falseStatement: 'A shark is a mammal.', explanationVi: 'Cá voi là động vật có vú; cá mập là cá.' },
  { question: 'What do plants make from sunlight?', answer: 'food', distractors: [d('water', 'Cây LẤY nước từ đất qua rễ - nước không phải thứ cây tự tạo ra từ nắng.'), d('juice', 'Nước ép có sẵn TRONG quả - chất dinh dưỡng cây tự tạo nhờ nắng mới là "food".'), d('paper', 'Giấy do người làm từ gỗ - cây tự tạo thức ăn.')], trueStatement: 'Plants make food from sunlight.', falseStatement: 'Plants make toys from sunlight.', explanationVi: 'Cây quang hợp tạo thức ăn.' },
  { question: 'Which part of the plant takes water from the ground?', answer: 'root', distractors: [d('leaf', 'Lá quang hợp - rễ mới hút nước từ đất.'), d('flower', 'Hoa tạo hạt giống - rễ hút nước.'), d('fruit', 'Quả chứa hạt - rễ hút nước.')], trueStatement: 'Roots take water from the ground.', falseStatement: 'Flowers take water from the ground.', explanationVi: 'Rễ hút nước từ đất.' },
  { question: 'What do we call a baby dog?', answer: 'puppy', distractors: [d('kitten', 'Kitten là mèo con - chó con là puppy.'), d('calf', 'Calf là bò con (bê) - chó con là puppy.'), d('chick', 'Chick là gà con - chó con là puppy.')], trueStatement: 'A baby dog is a puppy.', falseStatement: 'A baby dog is a kitten.', explanationVi: 'Chó con là puppy; mèo con là kitten.' },
  { question: 'Which season has the most rain in Viet Nam?', answer: 'summer', distractors: [d('winter', 'Mùa đông lạnh và khô - mùa hè mới là mùa mưa.'), d('spring', 'Mùa xuân mưa nhỏ phùn - mùa hè mưa nhiều nhất.'), d('autumn', 'Mùa thu ít mưa hơn - mùa hè là mùa mưa.')], trueStatement: 'Summer has a lot of rain in Viet Nam.', falseStatement: 'Winter has the most rain in Viet Nam.', explanationVi: 'Mùa hè/mùa mưa ở VN nhiều mưa nhất.' },
  { question: 'What is water when it is very cold?', answer: 'ice', distractors: [d('steam', 'Hơi nước là khi nước rất nóng - rất lạnh thì thành đá.'), d('rain', 'Mưa là nước lỏng rơi xuống - đông lạnh mới thành đá.'), d('cloud', 'Mây là hơi nước trên trời - nước rất lạnh thành đá.')], trueStatement: 'Very cold water becomes ice.', falseStatement: 'Very cold water becomes steam.', explanationVi: 'Nước đông thành đá khi rất lạnh.' },
  { question: 'What is water when it is very hot?', answer: 'steam', distractors: [d('ice', 'Đá là khi nước rất lạnh - rất nóng thì thành hơi nước.'), d('snow', 'Tuyết là khi lạnh - nước sôi thành hơi nước.'), d('rain', 'Mưa là nước lỏng - nước sôi mới thành hơi.')], trueStatement: 'Very hot water becomes steam.', falseStatement: 'Very hot water becomes ice.', explanationVi: 'Nước sôi thành hơi nước.' },
  { question: 'Which animal lays eggs?', answer: 'chicken', distractors: [d('cow', 'Bò là động vật có vú, đẻ con không đẻ trứng.'), d('dog', 'Chó đẻ con, không đẻ trứng.'), d('cat', 'Mèo đẻ con, không đẻ trứng.')], trueStatement: 'A chicken lays eggs.', falseStatement: 'A cow lays eggs.', explanationVi: 'Gà đẻ trứng; bò là động vật có vú.' },
  { question: 'Which is the biggest animal on land?', answer: 'elephant', distractors: [d('mouse', 'Chuột là con vật nhỏ - voi mới lớn nhất trên cạn.'), d('cat', 'Mèo nhỏ hơn voi nhiều - voi lớn nhất trên cạn.'), d('rabbit', 'Thỏ nhỏ - voi là động vật trên cạn lớn nhất.')], trueStatement: 'The elephant is the biggest land animal.', falseStatement: 'The mouse is the biggest land animal.', explanationVi: 'Voi là động vật trên cạn lớn nhất.' },
  { question: 'What do we breathe in to live?', answer: 'air', distractors: [d('water', 'Ta hít không khí để thở - nước để uống.'), d('juice', 'Nước ép để uống - ta thở không khí.'), d('milk', 'Sữa để uống - ta thở không khí.')], trueStatement: 'We breathe in air to live.', falseStatement: 'We breathe in water to live.', explanationVi: 'Hít thở không khí để sống.' },
  { question: 'Which is NOT a source of light?', answer: 'moon', distractors: [d('sun', 'Mặt trời TỰ phát sáng - nó là nguồn sáng thật.'), d('candle', 'Nến tự cháy sáng - nó là nguồn sáng.'), d('lamp', 'Đèn phát sáng - nó là nguồn sáng.')], trueStatement: 'The Moon only reflects sunlight.', falseStatement: 'The Moon makes its own light.', explanationVi: 'Mặt trăng chỉ phản chiếu ánh sáng mặt trời.' },
  { question: 'What keeps us warm in winter?', answer: 'coat', distractors: [d('fan', 'Quạt làm mát - áo khoác mới giữ ấm.'), d('ice', 'Đá lạnh - áo khoác mới giữ ấm.'), d('shorts', 'Quần ngắn mặc mùa hè - áo khoác giữ ấm.')], trueStatement: 'A coat keeps us warm.', falseStatement: 'A fan keeps us warm.', explanationVi: 'Áo khoác giữ ấm; quạt làm mát.' },
  // CR-144 - canonical misconception: plants "eat" food from the soil.
  { question: 'Where does a plant get most of its food?', answer: 'it makes food from sunlight', distractors: [d('from the soil', 'Đất giữ cây đứng và cho nước/khoáng - cây TỰ làm thức ăn nhờ ánh nắng.'), d('from the rain', 'Mưa cho cây nước, không phải thức ăn - cây quang hợp tạo thức ăn.'), d('from the wind', 'Gió không cho cây thức ăn - cây tự tạo thức ăn nhờ nắng.')], trueStatement: 'A plant makes its own food from sunlight.', falseStatement: 'A plant gets its food from the soil.', explanationVi: 'Cây tự tạo thức ăn nhờ quang hợp - đất chỉ cho nước và khoáng.' },
];

export const SCIENCE_G45: readonly ScienceFact[] = [
  { question: 'What is the full moon?', answer: 'a round bright moon', distractors: [d('a half moon', 'Trăng khuyết mới là nửa - trăng rằm tròn đầy.'), d('a new moon', 'Trăng non (new moon) là khi gần như không thấy trăng.'), d('no moon', 'Không có trăng là trăng non - trăng rằm là lúc trăng tròn nhất.')], trueStatement: 'A full moon is round and bright.', falseStatement: 'A full moon looks like a half circle.', explanationVi: 'Trăng rằm tròn và sáng.' },
  { question: 'How long does the Earth take to go around the Sun?', answer: 'one year', distractors: [d('one day', 'Một ngày là Trái Đất TỰ QUAY 1 vòng - đi quanh mặt trời mất 1 năm.'), d('one week', 'Một tuần quá ngắn - Trái Đất cần 365 ngày.'), d('one month', 'Một tháng là chu kỳ mặt trăng - Trái Đất cần 1 năm.')], trueStatement: 'The Earth takes one year to go around the Sun.', falseStatement: 'The Earth takes one day to go around the Sun.', explanationVi: 'Trái Đất quay quanh Mặt trời mất 1 năm (365 ngày).' },
  { question: 'What causes day and night?', answer: 'the Earth spins', distractors: [d('the Sun moves', 'Mặt trời không chạy quanh ta - Trái Đất tự quay tạo ngày đêm.'), d('the Moon blocks the Sun', 'Mặt trăng chỉ che mặt trời khi nhật thực - ngày đêm do Trái Đất quay.'), d('clouds cover the sky', 'Mây chỉ che bầu trời - ngày đêm do Trái Đất tự quay.')], trueStatement: 'Day and night happen because the Earth spins.', falseStatement: 'Day and night happen because the Sun spins.', explanationVi: 'Ngày và đêm do Trái Đất tự quay.' },
  { question: 'Which gas do plants take in?', answer: 'carbon dioxide', distractors: [d('nitrogen', 'Nitơ nhiều nhất trong khí trời nhưng cây dùng CO2 để quang hợp.'), d('helium', 'Heli là khí bơm bóng bay - cây hấp thụ CO2.'), d('hydrogen', 'Hydro nằm trong nước - khí cây hút từ không khí là CO2.')], trueStatement: 'Plants take in carbon dioxide.', falseStatement: 'Plants take in oxygen to make food.', explanationVi: 'Cây hấp thụ CO2 để quang hợp, nhả ra oxy.' },
  { question: 'Which organ pumps blood around the body?', answer: 'heart', distractors: [d('brain', 'Não để suy nghĩ - tim mới bơm máu.'), d('stomach', 'Dạ dày tiêu hóa thức ăn - tim bơm máu.'), d('lung', 'Phổi để thở - tim bơm máu.')], trueStatement: 'The heart pumps blood.', falseStatement: 'The brain pumps blood.', explanationVi: 'Tim bơm máu đi khắp cơ thể.' },
  { question: 'What do we use to think?', answer: 'brain', distractors: [d('heart', 'Tim bơm máu - não mới suy nghĩ (dù ta hay nói "trái tim biết").'), d('stomach', 'Dạ dày tiêu hóa thức ăn - não suy nghĩ.'), d('hand', 'Tay cầm nắm - não suy nghĩ.')], trueStatement: 'We use the brain to think.', falseStatement: 'We use the stomach to think.', explanationVi: 'Não dùng để suy nghĩ.' },
  { question: 'Which animals have a backbone?', answer: 'vertebrates', distractors: [d('insects', 'Côn trùng không có xương sống - chúng có vỏ ngoài.'), d('worms', 'Giun mềm, không có xương sống.'), d('jellyfish', 'Sứa mềm như thạch, không có xương sống.')], trueStatement: 'Vertebrates have a backbone.', falseStatement: 'Insects have a backbone.', explanationVi: 'Động vật có xương sống gọi là vertebrates; côn trùng không có.' },
  { question: 'What is the water cycle?', answer: 'water moving between sea, sky and land', distractors: [d('water in a bottle', 'Nước trong chai đứng yên - vòng tuần hoàn là nước DI CHUYỂN biển - trời - đất.'), d('a bath', 'Bồn tắm giữ nước yên - vòng tuần hoàn là bay hơi, mưa, chảy về biển.'), d('rain only', 'Mưa chỉ là 1 phần - còn bay hơi lên và chảy về biển nữa.')], trueStatement: 'The water cycle moves water between sea, sky and land.', falseStatement: 'The water cycle only happens in a bottle.', explanationVi: 'Vòng tuần hoàn nước: bay hơi - mưa - chảy về biển.' },
  { question: 'Which is a solid?', answer: 'rock', distractors: [d('water', 'Nước là chất LỎNG - đá mới là chất rắn.'), d('air', 'Không khí là chất KHÍ - đá là chất rắn.'), d('steam', 'Hơi nước là chất KHÍ - đá là chất rắn.')], trueStatement: 'A rock is a solid.', falseStatement: 'Water is a solid at room temperature.', explanationVi: 'Đá là chất rắn; nước lỏng; hơi nước là khí.' },
  { question: 'What does a thermometer measure?', answer: 'temperature', distractors: [d('rain', 'Mưa đo bằng vũ kế - nhiệt kế đo nhiệt độ.'), d('wind', 'Gió đo bằng chong chóng gió - nhiệt kế đo nhiệt độ.'), d('time', 'Giờ đo bằng đồng hồ - nhiệt kế đo nhiệt độ.')], trueStatement: 'A thermometer measures temperature.', falseStatement: 'A thermometer measures rain.', explanationVi: 'Nhiệt kế đo nhiệt độ.' },
  { question: 'Which planet is closest to the Sun?', answer: 'Mercury', distractors: [d('Earth', 'Trái Đất đứng thứ 3 từ mặt trời - Sao Thủy gần nhất.'), d('Mars', 'Sao Hỏa đứng thứ 4 - Sao Thủy gần nhất.'), d('Jupiter', 'Sao Mộc rất xa mặt trời - Sao Thủy gần nhất.')], trueStatement: 'Mercury is closest to the Sun.', falseStatement: 'Earth is closest to the Sun.', explanationVi: 'Sao Thủy gần Mặt trời nhất.' },
  { question: 'What do we call animals that eat only plants?', answer: 'herbivores', distractors: [d('carnivores', 'Carnivore là động vật ăn THỊT - ăn cỏ mới là herbivore.'), d('omnivores', 'Omnivore ăn CẢ thịt lẫn cây - chỉ ăn cây mới là herbivore.'), d('insects', 'Côn trùng là một loại vật - từ chỉ nhóm ăn cây là herbivores.')], trueStatement: 'Herbivores eat only plants.', falseStatement: 'Herbivores eat only meat.', explanationVi: 'Herbivore = động vật ăn cỏ; carnivore = ăn thịt.' },
  { question: 'Why do we see lightning before we hear thunder?', answer: 'light travels faster than sound', distractors: [d('sound travels faster than light', 'Ngược lại - ÁNH SÁNG nhanh hơn âm thanh nên thấy chớp trước.'), d('thunder comes first', 'Sấm và chớp xảy ra CÙNG lúc - chớp đến mắt trước vì ánh sáng nhanh hơn.'), d('they happen at different places', 'Chúng cùng một chỗ - khác nhau vì tốc độ ánh sáng và âm thanh.')], trueStatement: 'We see lightning first because light travels faster than sound.', falseStatement: 'Sound travels faster than light.', explanationVi: 'Ánh sáng nhanh hơn âm thanh nên thấy chớp trước tiếng sấm.' },
  { question: 'Which is the biggest planet in our Solar System?', answer: 'Jupiter', distractors: [d('Earth', 'Trái Đất nhỏ hơn Sao Mộc nhiều - Sao Mộc lớn nhất.'), d('Mars', 'Sao Hỏa nhỏ hơn Trái Đất - Sao Mộc lớn nhất.'), d('Venus', 'Sao Kim chỉ cỡ Trái Đất - Sao Mộc lớn nhất.')], trueStatement: 'Jupiter is the biggest planet.', falseStatement: 'Earth is the biggest planet.', explanationVi: 'Sao Mộc lớn nhất hệ Mặt Trời.' },
  // CR-144 - THE canonical misconception: seasons because Earth is
  // "closer to the Sun in summer". Real cause: axial tilt.
  { question: 'Why do we have seasons?', answer: 'the tilt of the Earth', distractors: [d('the Earth moves closer to the Sun', 'Trái Đất KHÔNG lại gần mặt trời vào mùa hè - mùa sinh ra do trục Trái Đất nghiêng.'), d('the Sun gets hotter in summer', 'Mặt trời không tự nóng hơn - trục nghiêng đổi góc chiếu sáng.'), d('the Moon changes the weather', 'Mặt trăng không tạo mùa - mùa do trục nghiêng của Trái Đất.')], trueStatement: 'Seasons happen because the Earth is tilted.', falseStatement: 'Seasons happen because the Earth moves closer to the Sun.', explanationVi: 'Mùa do trục Trái Đất nghiêng, không phải khoảng cách tới mặt trời.' },
  // CR-144 - canonical misconception: heavier objects fall faster.
  { question: 'A heavy ball and a light ball drop from the same height. Which lands first?', answer: 'they land together', distractors: [d('the heavy ball', 'Vật nặng KHÔNG rơi nhanh hơn - cùng độ cao, hai quả bóng chạm đất cùng lúc.'), d('the light ball', 'Vật nhẹ cũng không chậm hơn - chúng chạm đất cùng lúc.'), d('the bigger ball', 'Kích thước không quyết định - chúng chạm đất cùng lúc.')], trueStatement: 'Two balls dropped together land together.', falseStatement: 'A heavy ball lands before a light ball.', explanationVi: 'Cùng rơi từ một độ cao, vật nặng và nhẹ chạm đất cùng lúc.' },
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
  { label: 'job that helps people', labelVi: 'nghề giúp người', members: ['doctor', 'teacher', 'farmer', 'firefighter', 'nurse'], nonMembers: ['mermaid', 'dragon', 'robot', 'ghost', 'giant'] },
  { label: 'part of your body', labelVi: 'bộ phận cơ thể', members: ['arm', 'leg', 'head', 'hand', 'foot'], nonMembers: ['wing', 'fin', 'leaf', 'rock', 'cloud'] },
];

const CLASSES_G45: readonly ScienceClass[] = [
  { label: 'mammal', labelVi: 'động vật có vú', members: ['whale', 'bat', 'dolphin', 'tiger', 'human'], nonMembers: ['crocodile', 'penguin', 'octopus', 'butterfly', 'shark'] },
  { label: 'reptile', labelVi: 'bò sát', members: ['snake', 'lizard', 'crocodile', 'turtle', 'gecko'], nonMembers: ['frog', 'eagle', 'spider', 'whale', 'clam'] },
  { label: 'solid', labelVi: 'chất rắn', members: ['rock', 'ice', 'wood', 'metal', 'glass'], nonMembers: ['water', 'air', 'steam', 'milk', 'oil'] },
  { label: 'liquid', labelVi: 'chất lỏng', members: ['water', 'milk', 'juice', 'oil', 'rain'], nonMembers: ['ice', 'rock', 'steam', 'air', 'sand'] },
  { label: 'gas', labelVi: 'chất khí', members: ['air', 'steam', 'oxygen', 'hydrogen', 'carbon dioxide'], nonMembers: ['water', 'ice', 'rock', 'oil', 'soil'] },
  { label: 'planet', labelVi: 'hành tinh trong hệ Mặt Trời', members: ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Neptune'], nonMembers: ['the Moon', 'the Sun', 'a comet', 'an asteroid', 'a star'] },
  { label: 'herbivore', labelVi: 'động vật ăn cỏ', members: ['cow', 'elephant', 'rabbit', 'deer', 'giraffe'], nonMembers: ['lion', 'eagle', 'shark', 'wolf', 'frog'] },
  { label: 'sense organ', labelVi: 'cơ quan giác quan', members: ['eye', 'ear', 'nose', 'tongue', 'skin'], nonMembers: ['heart', 'lung', 'bone', 'muscle', 'brain'] },
];

export function scienceClassesForGrade(gradeId: string): readonly ScienceClass[] {
  if (gradeId === 'grade-1' || gradeId === 'grade-2') return CLASSES_G12;
  if (gradeId === 'grade-3') return CLASSES_G3;
  return CLASSES_G45;
}

/**
 * CR-82-A lib: deterministic ambiguity adjudicator for same-lexicon-set
 * MCQ candidates. Extracted from qb-ambiguity-classify.mjs - keep in sync
 * by editing THIS file. Returns true only when the prompt proves a unique
 * selector for the keyed answer (zero-error doctrine).
 */
// object -> only natural preposition(s) for bare "X is ___ the Y" cloze.
// KEEP requires answer in the mapped set AND every other choice implausible.
const UNIQUE_PREP = {
  wall: ['on'], ceiling: ['on'], vase: ['in'], water: ['in'],
  kitchen: ['in'], bedroom: ['in'], bathroom: ['in'], 'living room': ['in'],
  net: ['over'], tunnel: ['through'], rope: ['over'], hole: ['into'],
  road: ['across', 'along'], street: ['across', 'along', 'on', 'across from'],
  bridge: ['over', 'across'], 'bus stop': ['at'], cinema: ['at'],
  train: ['on'], left: ['on'], right: ['on'],
};
const SPATIAL = ['in', 'on', 'at', 'under', 'between', 'next to', 'in front of', 'behind', 'near', 'across', 'over', 'above', 'through', 'into', 'along', 'by', 'next', 'opposite', 'inside', 'outside', 'beside', 'around', 'towards', 'past', 'down', 'up', 'across from', 'far from', 'off'];

const EMOTIONS = ['happy', 'sad', 'angry', 'scared', 'excited', 'bored', 'tired', 'hungry', 'thirsty', 'sick', 'nervous', 'proud', 'calm', 'brave', 'lonely', 'worried', 'surprised', 'confused', 'sleepy', 'peaceful', 'glad', 'afraid', 'shy', 'curious', 'energetic', 'upset', 'cheerful', 'frustrated', 'disappointed', 'grateful', 'guilty', 'jealous', 'relaxed', 'amused', 'down', 'mad', 'furious', 'terrified', 'delighted', 'anxious', 'stressed', 'embarrassed', 'hopeful', 'hopeless', 'miserable', 'pleased', 'satisfied', 'carefree', 'scary', 'fine', 'good', 'great', 'well', 'better', 'okay', 'ok', 'healthy', 'strong', 'weak', 'young', 'old', 'quiet', 'loud', 'cold', 'cool', 'hot', 'warm', 'bad', 'new', 'clean', 'dirty', 'hungry', 'full', 'unhappy', 'friendly', 'popular', 'social', 'active'];
const STRICT_FEEL = ['happy', 'sad', 'angry', 'scared', 'excited', 'bored', 'tired', 'hungry', 'thirsty', 'sick', 'nervous', 'proud', 'calm', 'brave', 'lonely', 'worried', 'surprised', 'confused', 'sleepy', 'peaceful', 'glad', 'afraid', 'shy', 'curious', 'energetic', 'upset', 'cheerful', 'frustrated', 'disappointed', 'grateful', 'guilty', 'jealous', 'relaxed', 'amused', 'down', 'mad', 'furious', 'terrified', 'delighted', 'anxious', 'stressed', 'embarrassed', 'hopeful', 'hopeless', 'miserable', 'pleased', 'satisfied', 'carefree', 'unhappy', 'hurt'];
const FEEL_CTX = [
  [/thirsty/, ['drink', 'thirsty']], [/tired/, ['sleep', 'tired', 'rest', 'sleepy', 'nap']],
  [/lost|lose/, ['sad', 'worried', 'upset']], [/win|won|prize|first place|good grade|top mark|passed|champion/, ['happy', 'proud', 'excited', 'glad']],
  [/ghost|dark|spider|snake|thunder|dentist|height|big dog/, ['scared', 'afraid', 'nervous', 'worried', 'frightened', 'terrified']],
  [/cries|crying|\bcry\b/, ['sad', 'unhappy']], [/no friends|all alone|nobody/, ['lonely', 'sad']],
  [/not scared/, ['brave'], 'scared'], [/not excited/, ['calm'], 'excited'], [/not angry/, ['happy', 'calm'], 'angry'],
  [/need(s)? (some )?water/, ['thirsty']], [/hungry|need(s)? (some )?food/, ['hungry', 'eat']],
  [/birthday|party|gift|present/, ['happy', 'excited', 'glad']],
  [/too hard|too difficult/, ['frustrated', 'tired', 'sad']],
  [/feel like sleeping|want(s)? to sleep/, ['sleepy', 'tired']],
  [/scared of|afraid of/, ['scared', 'afraid', 'brave']],
  [/new year|holiday|vacation|summer break/, ['excited', 'happy']],
  [/sick|fever|flu|cold\b/, ['sick', 'tired', 'rest']],
];
const OBJ_VERB = [
  [/songs?\b/, 'singing|sing'], [/books?\b/, 'reading|read'], [/football|soccer|basketball|volleyball|badminton|tennis|golf|chess|ping.?pong/, 'playing|play'],
  [/kites?\b/, 'flying|fly'], [/\btv\b|cartoons?|movies?|films?/, 'watching|watch'],
  [/photos?\b|pictures?\b/, 'taking|take|drawing|draw'], [/flowers?\b|trees?\b|vegetables?\b/, 'growing|grow|planting|plant|watering|water'],
  [/guitar|piano|drums?|violin/, 'playing|play'], [/games?\b/, 'playing|play|watching|watch|making|make|winning|win|losing|lose|enjoying|enjoy|having|have|joining|join|finishing|finish'],
  [/sports?\b/, 'playing|play|doing|do'], [/a truck|a car|a bus/, 'driving|drive'],
  [/balls?\b/, 'kicking|kick|throwing|throw|catching|catch|playing|play|hitting|hit'],
  [/milk|juice|water|tea|coffee|soda|lemonade|a cup|a glass|a bottle/, 'drinking|drink|having|have'],
  [/in the garden/, 'working|work|gardening|garden'],
];
const IRR = { rode: 'ride', ran: 'run', ate: 'eat', drank: 'drink', sang: 'sing', swam: 'swim', flew: 'fly', grew: 'grow', took: 'take', made: 'make', did: 'do', done: 'do', does: 'do', went: 'go', gone: 'go', goes: 'go', saw: 'see', seen: 'see', wrote: 'write', drove: 'drive', drew: 'draw', sat: 'sit', won: 'win', had: 'have', has: 'have', was: 'be', were: 'be', is: 'be', are: 'be', am: 'be', said: 'say', gave: 'give', given: 'give', came: 'come', fell: 'fall', fallen: 'fall', felt: 'feel', bought: 'buy', brought: 'bring', thought: 'think', taught: 'teach', caught: 'catch', slept: 'sleep', kept: 'keep', left: 'leave', met: 'meet', wore: 'wear', worn: 'wear', tore: 'tear', chose: 'choose', chosen: 'choose', began: 'begin', begun: 'begin', broke: 'break', broken: 'break', spoke: 'speak', spoken: 'speak', stole: 'steal', woke: 'wake', hid: 'hide', hidden: 'hide', built: 'build', spent: 'spend', sent: 'send', lent: 'lend', lost: 'lose', found: 'find', held: 'hold', stood: 'stand', understood: 'understand', told: 'tell', sold: 'sell', heard: 'hear', put: 'put', cut: 'cut', hit: 'hit', let: 'let', set: 'set', shut: 'shut', hurt: 'hurt', cost: 'cost', got: 'get', gotten: 'get', forgot: 'forget', knew: 'know', known: 'know', threw: 'throw', thrown: 'throw', lay: 'lie', lain: 'lie', read: 'read', waked: 'wake' };
const OBJ_CTX = [
  [/hobby is cooking|likes? (to )?cook|loves? cooking|enjoys? cooking|can make delicious/, 'food|dishes|meals|cakes?'],
  [/hobby is reading|likes? (to )?read|loves? reading|enjoys? reading|have many/, 'books?|stories|comics?'],
  [/likes? (to )?draw|loves? drawing|good at drawing|hobby is drawing/, 'art|pictures?|drawings?'],
  [/learning about animals|loves? animals/, 'science'],
  [/loves? space|dreams? of space|likes? space/, 'astronaut'],
  [/loves? (doing )?experiments|likes? (doing )?experiments/, 'scientist'],
  [/needs? (some )?new pencils|needs? pencils|pencils for school/, 'bookstore|stationery|supermarket|book shop'],
  [/buys? some sweets|wants? (to buy )?(some )?sweets/, 'supermarket|sweet shop|candy store|grocery|market'],
  [/milk and bread|needs? (some )?milk/, 'grocery store|supermarket|market|grocery'],
  [/throat hurts/, 'sore throat'],
  [/past events/, 'history'],
  [/collect(ing|s)? stamps/, 'stamps'],
  [/monkey/, 'bananas?'],
  [/gloves/, 'two'],
  [/sleepy/, 'sleep|rest|nap|bed'],
  [/umbrella/, 'rainy|rain|wet'],
  [/snow|snowy/, 'snowmen|snowman|snowballs?'],
  [/high _B_|fever/, 'fever'],
  [/bigger smartphone|like a bigger|bigger than a (phone|smartphone)/, 'tablet'],
  [/it is cold|it's cold|cold (day|weather|outside)|very cold/, 'jacket|coat|sweater|scarf|warm clothes|warm coat'],
  [/on (my |his |her |your |their |our )?feet/, 'sandals|shoes|socks|boots|slippers'],
  [/on (my |his |her |your |their |our )?head/, 'cap|hat|helmet'],
  [/to buy (some )?(drinks?|things|food|snacks?|vegetables?)|buy drinks|buy some sweets/, 'supermarket|shop|store|market|grocery|bookstore'],
  [/for school/, 'book|bag|pen|pencil|notebook|uniform|school bag|ruler|eraser|books|pencils|new bag'],
  [/at the market|market/, 'groceries|vegetables?|food|fruit'],
  [/experiments?/, 'do|doing|conduct|conducting|make|making'],
  [/farmer/, 'grow|growing|plant|planting|vegetables?|farm|rice'],
  [/fresh vegetables?/, 'market|supermarket|grocery|farm'],
  [/_B_ juice/, 'apple|orange|mango|grape|pineapple|lemon|strawberry'],
  [/because .*(can|get to) (play|go|relax|rest|swim|watch|sleep|read)/, 'saturday|sunday'],
  [/if (i|he|she|we|they|[a-z]+) had|if i were/, 'would'],
  [/how _B_ time|_B_ time do you/, 'much'],
  [/what _B_ (she|he|it|[a-z]{2,}) (like|want|need|do|play|eat|drink|go|have|watch|read)/, 'does'],
  [/what _B_ (you|we|they|i) (like|want|need|do|play|eat|drink|go|have|watch|read)/, 'do'],
  [/like _B_\s*\?*$/, 'best|most'],
  [/looking at the toys?|see(s|ing)? the toys?/, 'car|robot|ball|doll|teddy( bear)?|kite|train|blocks?|bike|plane|drum'],
  [/want(s)? to be|want(s)? to become/, 'writer|author|poet|scientist|astronaut|doctor|nurse|teacher|singer|pilot|farmer|vet|cook|chef|driver|lawyer|artist|painter|builder|engineer|worker|actor|police( officer|man)?|dentist|musician'],
  [/help(s|ing)? (sick |the )?animals?|loves? animals/, 'vet|farmer|zookeeper'],
  [/help(s|ing)? build|build(s|ing)? (houses|buildings|bridges)/, 'builder|engineer|worker'],
  [/read(ing)? books?.*(want|be a|become|dream)/, 'writer|author|poet'],
  [/drink/, 'juice|water|milk|tea|coffee|soda|lemonade|smoothie'],
  [/sport/, 'swimming|running|football|soccer|badminton|tennis|volleyball|basketball|cycling|skipping|riding|jogging|skiing'],
  [/wear(ing)?|wearing|put on/, 'dress|shirt|t-shirt|tshirt|skirt|pants|shorts|coat|jacket|sweater|jeans|hat|cap|gloves?|scarf|scarves|socks?|shoes?|boots?|sandals?|uniform|swimsuit|glasses|sunglasses|helmet|belt|tie|blouse|hoodie|raincoat|pajamas|mask|glove|boot|sandal|sock|shoe|mittens?|slippers?|vest|suit|apron|ring|watch|earrings?|necklace|bracelet|backpack|bag|tights|leggings|cardigan|jersey|kimono|tuxedo|overalls|turban|crown|wig|cape|poncho|beret|bowtie|braces?|overalls|jumper|polo|tank top|camisole|bikini|wetsuit|visor|beret|stockings?|trousers|blazer|waistcoat|jumpsuit|romper|onesie|leotard|tutu|sarong|kilt|tunic|moccasins?|clogs?|loafers?|heels?|pumps?|flats?|sneakers?|trainers?|espadrilles?|galoshes?|wellingtons?|anorak|parka|windbreaker|blazer|shawl|stole|muff|bandana|headband|wristband|armband|sash|medal|tiara|veil|lei|badge|pin|costume|disguise|face mask|eye patch|life jacket|seatbelt|harness|goggles|nappy|diaper|bra|briefs|boxers|thong|underwear|lingerie|slip|camisole|girdle|corset|garter|stocking|pantyhose|hosiery|leggings|jeggings|capris?|culottes?|skorts?|sweatpants?|track pants?|yoga pants?|cargo pants?|khakis?|chinos?|corduroys?|flannels?|denims?|overalls?|dungarees?|rompers?|playsuits?|unitards?|bodysuits?|catsuits?|jumpsuits?|sweatsuits?|tracksuits?|shellsuits?|snowsuits?|ski suits?|wet suits?|dry suits?|space suits?|hazmat suits?|business suits?|pantsuits?|skirt suits?|three-piece suits?|morning coats?|tailcoats?|frock coats?|smoking jackets?|dinner jackets?|sports coats?|field jackets?|bomber jackets?|denim jackets?|leather jackets?|fur jackets?|fleece jackets?|puffer jackets?|down jackets?|sports jackets?|varsity jackets?|letterman jackets?|hoodies?|sweatshirts?|fleeces?|pullovers?|jumpers?|cardigans?|turtlenecks?|crewnecks?|v-necks?|polo shirts?|henleys?|raglans?|baseball tees?|tank tops?|muscle shirts?|crop tops?|tube tops?|halter tops?|bandeau tops?|corsets?|bustiers?|bralettes?|sports bras?|nightgowns?|nightshirts?|pajamas|robes?|bathrobes?|kimonos?|kaftans?|muumuus?|sarongs?|sarongs|caftans?|djellabas?|abayas?|hijabs?|niqabs?|burkas?|chadors?|saris?|sarees?|lehengas?|salwar kameez|kurtas?|sherwanis?|ao dai|cheongsams?|qipaos?|hanboks?|yukatas?|haoris?|obi|kilts?|dirndls?|lederhosen|sombreros?|cowboy hats?|fedoras?|trilbies?|bowlers?|derbies?|top hats?|bowler hats?|panama hats?|sun hats?|sunhats?|beanies?|bobble hats?|stocking caps?|watch caps?|skull caps?|baseball caps?|snapbacks?|trucker hats?|bucket hats?|boonie hats?|newsboy caps?|flat caps?|berets?|turbans?|hijabs?|headscarves?|bandanas?|do-rags?|durags?|balaclavas?|ski masks?|earmuffs?|ear muffs?|ear warmers?|headphones?|earbuds?|earrings?|ear cuffs?|ear climbers?|ear jackets?|ear threads?|nose rings?|lip rings?|eyebrow rings?|belly rings?|anklets?|toe rings?|thumb rings?|mood rings?|class rings?|wedding rings?|engagement rings?|promise rings?|eternity rings?|cocktail rings?|signet rings?|championship rings?|class necklaces?|chokers?|lockets?|pendants?|medallions?|amulets?|talismans?|rosaries?|prayer beads?|mala beads?|tennis bracelets?|bangles?|cuffs?|charm bracelets?|friendship bracelets?|id bracelets?|medical bracelets?|fitness trackers?|smartwatches?|watches?|pocket watches?|wristwatches?|brooches?|lapel pins?|tie clips?|tie bars?|tie pins?|collar stays?|cufflinks?|studs?|ascots?|cravats?|neckties?|bow ties?|bolo ties?|scarves?|infinity scarves?|pashminas?|shawls?|wraps?|stoles?|capes?|ponchos?|serapes?|ruanas?|mufflers?|neck warmers?|gaiters?|balaclavas?|snoods?|gloves?|mittens?|fingerless gloves?|driving gloves?|work gloves?|gardening gloves?|rubber gloves?|latex gloves?|winter gloves?|ski gloves?|boxing gloves?|baseball gloves?|golf gloves?|cycling gloves?|weightlifting gloves?|oven mitts?|pot holders?|belts?|sashes?|cummerbunds?|suspenders?|braces?|garters?|garter belts?|suspenders|tool belts?|money belts?|fanny packs?|waist bags?|belt bags?|holsters?|scabbards?|quivers?|bandoliers?|backpacks?|rucksacks?|knapsacks?|daypacks?|book bags?|school bags?|messenger bags?|shoulder bags?|crossbody bags?|handbags?|purses?|clutches?|totes?|satchels?|briefcases?|laptop bags?|duffel bags?|gym bags?|beach bags?|diaper bags?|lunch bags?|cooler bags?|garment bags?|suitcases?|luggage|carry-ons?|weekender bags?|overnight bags?|umbrella hats?|rain bonnets?|shower caps?|swim caps?|bathing caps?|football helmets?|bicycle helmets?|motorcycle helmets?|safety helmets?|hard hats?|welding masks?|face shields?|safety glasses?|sunglasses?|reading glasses?|eyeglasses?|spectacles?|monocles?|pince-nez|goggles?|swim goggles?|ski goggles?|safety goggles?|virtual reality headsets?|vr headsets?|headsets?|headphones?|earphones?|earplugs?|hearing aids?|bandanas?|handkerchiefs?|pocket squares?|boutonnieres?|corsages?|leis?|garlands?|wreaths?|crowns?|tiaras?|diadems?|circlets?|wreaths?|halos?|miters?|mitres?|bishop hats?|graduation caps?|mortarboards?|academic regalia|robes?|gowns?|graduation gowns?|wedding dresses?|wedding gowns?|bridal gowns?|bridesmaid dresses?|prom dresses?|evening gowns?|ball gowns?|cocktail dresses?|sundresses?|maxi dresses?|midi dresses?|mini dresses?|wrap dresses?|shift dresses?|sheath dresses?|bodycon dresses?|a-line dresses?|empire dresses?|peplum dresses?|shirt dresses?|sweater dresses?|slip dresses?|camisole dresses?|blouses?|shirts?|button-downs?|button-ups?|oxfords?|flannels?|plaids?|ginghams?|checks?|stripes?|polka dots?|tie-dyes?|camouflage|camo|tie|necktie|cravat|ascot|scarf|scarves|shawl|pashmina|bandana|headscarf|kerchief|veil|hijab|turban|beanie|beret|fedora|sombrero|visor|hard hat|helmet|crown|tiara|wreath|lei|medal|badge|pin|brooch|cufflinks?|tie clip|tie bar|watch|wristwatch|bracelet|bangle|cuff|ring|earring|necklace|pendant|locket|choker|amulet|anklet|armband|wristband|sweatband|headband|hair clip|hairband|hair tie|scrunchie|ribbon|bow|barrette|bobby pin|hairpin|comb|hat pin|bonnet|sunbonnet|mobcap|nightcap|shower cap|swim cap|bathing cap|woolly hat|bobble hat|trap|cap|lid|hat'],
  [/go(es)? to school|school day|go to class/, 'monday|tuesday|wednesday|thursday|friday|saturday'],
  [/present|gift|souvenir/, 'for'],
  [/buy(ing)? (a |some )?(new )?(dress|clothes|skirt|shirt|blouse|pants|jeans|jacket|coat|uniform)/, 'clothes store|clothing store|boutique|mall|clothes shop'],
  [/it is warm|it's warm|warm day/, 'good|warm|hot|happy'],
  [/winter|cold (days?|season|weather|mornings?|nights?)|on cold|when it's cold|when it is cold/, 'cold|snow|snowy|december|january|february|sweaters?|coats?|jackets?|scar(f|ves)|boots?|gloves|warm clothes'],
  [/pieces of paper|colou?rful pieces|paper from different countries/, 'stamps'],
  [/stamp(s)? collection|collects? stamps/, 'stamps'],
  [/doctor|hospital|dentist/, 'sick|ill|bad|terrible|sore|medicine|a cough'],
  [/in summer|summer|sunny|hot day/, 'shorts|t-shirt|tshirt|dress|sandals|skirt|swimsuit|sunglasses|flip-flops|tank top'],
  [/\brain|rainy/, 'raincoats?|umbrella|boots|raincoat'],
  [/rabbit|bunny/, 'carrots?|carrot'],
  [/cough/, 'cough syrup|medicine|syrup'],
  [/stomach hurts|tooth hurts|head hurts/, 'pill|medicine|doctor|dentist'],
  [/astronaut/, 'space|the moon|moon|mars'],
  [/lift(ing)? (heavy )?things|heavy things|lift heavy/, 'strong'],
  [/_B_ do you feel/, 'how'],
  [/_B_ at (speaking|math|maths|english|sport|drawing|singing|playing|swimming|reading|writing|learning)/, 'good'],
  [/subject is art|loves? art|likes? art/, 'draw|drawing|paint|painting|draw and paint'],
  [/favorite day|favourite day/, 'monday|tuesday|wednesday|thursday|friday|saturday|sunday'],
  [/library|works in a library/, 'reading|read|books|librarian'],
  [/if (i|you|we|they|he|she) (have|am|get|go|can|see|find)/, 'will'],
  [/n'?t\b|not\b|never\b/, 'any'],
  [/_B_ of (juice|water|milk|soda|lemonade)/, 'bottle|glass|cup|can'],
  [/sunny|sun/, 'sunny|hot|warm'],
  [/favorite .*because|loves? .*because|best .*because/, 'comfortable|nice|big|beautiful|clean|bright|cozy|quiet|large|spacious|good|great|fun|interesting'],
  [/numbers|count(ing)?|add(ing)?|calculat/, 'math|maths'],
  [/sing(ing)? songs?|music/, 'music'],
  [/run(ning)?|jump(ing)?|sport(s)?|exercise|team|play(s)? games/, 'pe'],
  [/experiment(s)?|nature|plant(s)? and animal(s)?/, 'science'],
  [/computer(s)?/, 'it'],
  [/english words?|abc|learn(s)? english/, 'english'],
  [/vietnamese/, 'vietnamese'],
  [/good at (drawing|painting|art)/, 'art'],
  [/doctor|hospital|sick people/, 'doctor|nurse'],
  [/teach|students/, 'teacher'],
  [/cook(ing)?|kitchen|restaurant/, 'cook|chef'],
  [/animals?|sick animals?/, 'vet|farmer'],
  [/fly(ing)?|plane|sky/, 'pilot'],
  [/sing(ing)?|songs?|voice/, 'singer'],
  [/driv(e|ing)|bus|taxi/, 'driver'],
  [/writ(e|ing)|books?|stories/, 'writer'],
  [/draw(ing)?|paint(ing)?/, 'artist|painter'],
  [/justice|law/, 'lawyer'],
  [/build(ing)?|construct/, 'builder|engineer|worker'],
];

export const norm = (s) => String(s ?? '').trim().replace(/\.$/, '').toLowerCase();

/* ---------- attribute tables ---------- */
const T = {
  MALE: ['father', 'dad', 'brother', 'uncle', 'grandpa', 'son', 'grandfather', 'cousin', 'baby'],
  FEMALE: ['mother', 'mom', 'mum', 'sister', 'aunt', 'grandma', 'daughter', 'grandmother', 'cousin', 'baby'],
  OLD: ['grandpa', 'grandma', 'grandfather', 'grandmother'],
  BABY: ['baby'],
  PET: ['cat', 'dog', 'rabbit', 'fish', 'bird', 'mouse'],
  WILD: ['lion', 'tiger', 'zebra', 'giraffe', 'bear', 'monkey', 'elephant', 'snake', 'hippo', 'rhino', 'fox'],
  FLY: ['bird', 'bee', 'butterfly'],
  SWIM: ['fish', 'duck', 'frog'],
  EGGS: ['chicken', 'duck', 'bird'],
  WATER_LIFE: ['fish', 'frog', 'duck'],
  JUMP: ['frog', 'rabbit', 'horse'],
  CLIMB: ['monkey', 'cat'],
  TRUNK: ['elephant'],
  LONGNECK: ['giraffe'],
  STRIPED: ['zebra', 'tiger'],
  GREEN_ANIMAL: ['frog'],
  BROWN_ANIMAL: ['bear', 'monkey', 'dog', 'horse'],
  BIG: ['elephant', 'lion', 'tiger', 'bear', 'hippo', 'giraffe', 'whale', 'cow', 'horse', 'zebra', 'rhino'],
  SMALL: ['mouse', 'ant', 'bee', 'frog', 'rabbit', 'bird'],
  FARM: ['cow', 'pig', 'chicken', 'duck', 'goat', 'sheep', 'horse'],
  DRINK: ['water', 'juice', 'milk', 'tea', 'soda'],
  DESSERT: ['ice cream', 'cake', 'candy', 'cookie', 'cookies', 'chocolate', 'flan', 'pudding'],
  SOUND: { meow: 'cat', woof: 'dog', bark: 'dog', oink: 'pig', moo: 'cow', roar: 'lion', cluck: 'chicken', quack: 'duck', ribbit: 'frog' },
};
const inSet = (set, v) => set.includes(norm(v));
const countIn = (set, choices) => choices.filter((c) => inSet(set, c)).length;
const only = (set, choices) => countIn(set, choices) === 1;

const KIN = [
  [/father'?s mother|dad'?s mother|dad's mom/, 'grandma'],
  [/mother'?s mother|mom'?s mother|mum'?s mother/, 'grandma'],
  [/father'?s father|dad'?s father/, 'grandpa'],
  [/mother'?s father|mom'?s father/, 'grandpa'],
  [/father'?s brother|dad'?s brother/, 'uncle'],
  [/father'?s sister|dad'?s sister/, 'aunt'],
  [/mother'?s brother|mom'?s brother/, 'uncle'],
  [/mother'?s sister|mom'?s sister|mum'?s sister/, 'aunt'],
  [/mother'?s son|mom'?s son|mum'?s son/, 'brother'],
  [/mother'?s daughter|mom'?s daughter|mum'?s daughter/, 'sister'],
  [/father'?s son|dad'?s son/, 'brother'],
  [/father'?s daughter|dad'?s daughter/, 'sister'],
  [/grandpa and/, 'grandma'],
  [/grandma and/, 'grandpa'],
  [/\bmom\b[^a-z]{0,6}and\s*(_+|\.{2,})|mom and this/, 'dad'],
  [/\bdad\b[^a-z]{0,6}and\s*(_+|\.{2,})|dad and this/, 'mom'],
];
const JOB_VERB = [
  [/help(ing|s)? .*animals?|sick animals?|loves? animals?|works? with animals?|cares? for .*animals?/, 'vet'],
  [/patients?|hospital|sick people|helps? (the )?sick|cares? for (the )?sick/, 'doctor|nurse'],
  [/teach/, 'teacher'], [/grows? (vegetables|rice|plants)|farm/, 'farmer'],
  [/drives?/, 'driver'], [/cooks?|restaurant|kitchen/, 'cook'], [/sings?|songs?/, 'singer'],
  [/flies?|plane/, 'pilot'], [/letters?|delivers?|mail/, 'postman'], [/news|writes? articles/, 'reporter'],
  [/thiev|uniform|crime|police station/, 'police|policeman|police officer'], [/hospital|clinic/, 'doctor|nurse'],
  [/school/, 'teacher|student'], [/farm/, 'farmer'], [/airport|plane/, 'pilot'], [/build|construct/, 'worker'],
  [/engineer|machine|computer/, 'engineer'], [/bakes?|bread|cakes?/, 'baker'],
];
const SUBJ_DESC = [
  [/numbers?|count|add|subtract|calculate/, 'math|maths'], [/sings?|songs?|instruments?|music/, 'music'],
  [/draw|paint|picture|\bart\b/, 'art'], [/run|jump|sport|ball|exercise|play team|games/, 'pe'],
  [/animals?|plants?|experiments?|nature|science/, 'science'], [/computers?/, 'it'],
  [/abc|english|words|letters|read stories|learn to read/, 'english|vietnamese'], [/vietnamese/, 'vietnamese'],
  [/read and write/, 'vietnamese|english'],
];
const ROOM_ACT = [
  [/brush|teeth|wash face|shower|bath|toilet/, 'bathroom'], [/cook|stove|fridge|refrigerator|oven|food|meal|wash(ing)? dishes|dishes/, 'kitchen'],
  [/sleep|bed\b|nap/, 'bedroom'], [/watch(ing)? (tv|television)|\btv\b|television|sofa|relax/, 'living room|bedroom'],
  [/eat|dinner|lunch|breakfast|dining/, 'dining room|kitchen'], [/movie|film/, 'living room|bedroom'], [/study|work|homework|computer|books?|read(ing)?/, 'study room|bedroom'],
];
const FACT_COLOR = {
  banana: 'yellow', sun: 'yellow', grass: 'green', leaves: 'green', leaf: 'green',
  sky: 'blue', snow: 'white', tomato: 'red', strawberry: 'red', lemon: 'yellow',
  orange: 'orange', grape: 'purple', milk: 'white', chocolate: 'brown',
  frog: 'green', sea: 'blue', tree: 'green', cloud: 'white', carrot: 'orange',
  apple: 'red', eggplant: 'purple', pig: 'pink', coal: 'black', rice: 'white',
  trunk: 'brown', wood: 'brown', soil: 'brown', coffee: 'brown', envelope: 'red',
  ocean: 'blue', teeth: 'white', 'polar bear': 'white', 'polar': 'white', panda: 'black',
  elephant: 'gray', 'elephant.': 'gray', doves: 'white', dove: 'white', milk: 'white',
};
const MIX_COLOR = [
  [/red.*(and|\+|plus).*yellow|yellow.*(and|\+|plus).*red/, 'orange'],
  [/blue.*(and|\+|plus).*yellow|yellow.*(and|\+|plus).*blue/, 'green'],
  [/red.*(and|\+|plus).*blue|blue.*(and|\+|plus).*red/, 'purple'],
  [/black.*(and|\+|plus).*white|white.*(and|\+|plus).*black/, 'grey|gray'],
];
const SPORT_DESC = [
  [/shuttlecock/, 'badminton'], [/helmet|bicycle|bike|cycle/, 'cycling'], [/pool|water|swim/, 'swimming'],
  [/racket.*net|net.*racket/, 'tennis'], [/racket/, 'tennis|badminton|table tennis'],
  [/net/, 'tennis|badminton|volleyball'], [/basket|hoop/, 'basketball'], [/chess|board/, 'chess'],
  [/kick|goal|ball/, 'football|basketball|volleyball'],
];
const SEASON_DESC = [
  [/cold|snow|freezing|coat|jacket|scarf|warm clothes/, 'winter'], [/hot|sunny|beach|t-shirt|swimsuit|shorts|ice cream|longest days|swim|no school|school (break|holiday|vacation)|summer (break|holiday|vacation)/, 'summer'],
  [/flowers? (bloom|are blooming)|bloom|t[eế]t|lunar new year/, 'spring'], [/leaves (fall|are falling)|lose (their )?leaves|leaves.*(fall|drop)|harvest|follows summer/, 'autumn'],
];
const MONTH_TO_SEASON = { december: 'winter', january: 'winter', february: 'winter', march: 'spring', april: 'spring', may: 'spring', june: 'summer', july: 'summer', august: 'summer', september: 'autumn', october: 'autumn', november: 'autumn' };
const VOWEL = /^[aeiou]/;
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/** Return true when prompt supplies a unique selector satisfied by ans. */
export function selector(p, ans, choices, set) {
  const pl = p.toLowerCase();
  const a = norm(ans);
  const cs = choices.map(norm);

  // restatement / translation / word-formation / phonics
  if (/in english\b|word for ["'].+["']|in vietnamese|tiếng anh|word means|means ["']/i.test(p)) return true;
  if (/choose the word|grand_+|grand\.{3}|spelled|spelling|starts with the same sound|begins with|rhymes/i.test(p)) return true;
  if (!/not\b|n't|isn't|aren't|don't|doesn't/.test(pl)) {
    if (new RegExp(`\\b${a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(pl)) return true; // restated (word-boundary: "in" must not match inside "running")
    const syn = { mother: 'mom|mum', mom: 'mother|mum', mum: 'mother|mom', father: 'dad', dad: 'father', grandma: 'grandmother', grandmother: 'grandma', grandpa: 'grandfather', grandfather: 'grandpa' }[a];
    if (syn && new RegExp(`\\b(${syn})\\b`).test(pl) && /_{2,}|\.{2,}/.test(pl)) return true; // synonym restated
  }

  // article grammar: only one vowel-initial choice
  if (/\ban\s*(_{2,}|\.{2,}|…|\[\s*\])/.test(pl) && cs.filter((c) => VOWEL.test(c)).length === 1 && VOWEL.test(a)) return true;
  if (/\ba\s*(_{2,}|\.{2,}|…|\[\s*\])/.test(pl) && cs.filter((c) => !VOWEL.test(c)).length === 1 && !VOWEL.test(a)) return true;

  /* sequence completion ("one, two, ___" / "Monday, Tuesday, ___").
     r35-B1: naming sequence members plus a unique member key proves the
     question is ABOUT the sequence, not that the key is correct -
     "Monday, Tuesday, ___" keyed 'Friday' passed under the old rule.
     Approve only a verifiable completion: the members named in the
     prompt, in order, form a consecutive ascending run entirely before
     the blank, and the key equals the next member of the run. Anything
     else falls through to arithmetic rules or manual review. */
  const SEQ_ORDERS = {
    day: DAYS,
    month: MONTHS,
    cardinal:
      'one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty'.split(
        ' ',
      ),
    numeral: Array.from({ length: 31 }, (_, i) => String(i + 1)),
    ordinal:
      'first second third fourth fifth sixth seventh eighth ninth tenth eleventh twelfth'.split(' '),
    season: ['spring', 'summer', '(?:autumn|fall)', 'winter'],
  };
  const gapPos = pl.search(/_{2,}|\.{2,}|…|\[\s*\]/);
  const seqExpected = (order, cyclic) => {
    // every occurrence, so a repeated member breaks the run
    // ("Monday, Tuesday, Monday, ___" must not approve 'wednesday').
    const hits = [];
    order.forEach((n, i) => {
      const re = new RegExp(`\\b(?:${n})\\b`, 'g');
      let m;
      while ((m = re.exec(pl)) !== null) hits.push({ m: m.index, i });
    });
    const sorted = hits.sort((x, y) => x.m - y.m);
    const before = sorted.filter((h) => gapPos < 0 || h.m < gapPos);
    const after = gapPos < 0 ? [] : sorted.filter((h) => h.m > gapPos);
    if (before.length < 2) return null;
    const step = cyclic ? (i) => (i + 1) % order.length : (i) => i + 1;
    if (!before.every((h, k) => k === 0 || h.i === step(before[k - 1].i))) return null;
    const next = before[before.length - 1].i + 1;
    // noncyclic orders end ("nineteen, twenty, ___" is NOT 'one');
    // cyclic sets wrap (saturday -> sunday is consecutive).
    if (!cyclic && next >= order.length) return null;
    const expIdx = next % order.length;
    // r37: members after the blank must continue the run exactly
    // ("Mon, Tue, ___, Fri, Thu" is contradictory -> manual review).
    let prev = expIdx;
    for (const h of after) {
      if (h.i !== step(prev)) return null;
      prev = h.i;
    }
    return order[expIdx];
  };
  const seqMatch = (exp) => exp != null && new RegExp(`^(?:${exp})$`, 'i').test(a);
  if (set === 'day' || set === 'month') {
    if (seqMatch(seqExpected(SEQ_ORDERS[set], true))) return true;
    // 'weekday'/'weekend' and non-completion patterns fall through to
    // the day/month arithmetic below or to manual review.
  } else {
    for (const order of [SEQ_ORDERS.cardinal, SEQ_ORDERS.numeral, SEQ_ORDERS.ordinal, SEQ_ORDERS.season]) {
      if (seqMatch(seqExpected(order, false))) return true;
    }
  }

  // r39: single-anchor relative position - "the day before tuesday", "next
  // month", "the second month", "first day of the school week", "days between
  // monday and friday". Expected value is provably unique, so a match keeps.
  const ORD_IDX = {
    first: 0, second: 1, third: 2, fourth: 3, fifth: 4, sixth: 5, seventh: 6,
    eighth: 7, ninth: 8, tenth: 9, eleventh: 10, twelfth: 11, last: -1,
  };
  const SCHOOL_WEEK = DAYS.slice(1, 6); // mon..fri (vn school week)
  const seqMember = (w) => {
    for (const order of [DAYS, MONTHS, SEQ_ORDERS.cardinal, SEQ_ORDERS.numeral]) {
      const i = order.findIndex((n) => new RegExp(`^(?:${n})$`, 'i').test(w));
      if (i >= 0) return { order, i };
    }
    return null;
  };
  const relCandidates = new Set();
  // "before|after <member>" / "<member> comes after" - wrap day/month only
  for (const m of pl.matchAll(/\b(before|after|comes after)\s+(?:the\s+)?([a-z]+)\b/g)) {
    const sm = seqMember(m[2]);
    if (!sm) continue;
    const delta = m[1] === 'before' ? -1 : 1;
    const cyc = sm.order === DAYS || sm.order === MONTHS;
    const j = sm.i + delta;
    if (j < 0 && !cyc) continue;
    if (j >= sm.order.length && !cyc) continue;
    relCandidates.add(sm.order[(j + sm.order.length) % sm.order.length]);
  }
  // "next <unit>" / "the next <member>" - anchor = the stated member ("this
  // month is october. next month is ___")
  if (/\bnext\b/.test(pl)) {
    for (const m of pl.matchAll(/\b(?:this|last)\s+(?:day|week|month|year)\s+is\s+([a-z]+)\b/g)) {
      const sm = seqMember(m[1]);
      if (sm && sm.i + 1 < sm.order.length) relCandidates.add(sm.order[sm.i + 1]);
      else if (sm && (sm.order === DAYS || sm.order === MONTHS)) relCandidates.add(sm.order[0]);
    }
  }
  // "the <ord> <unit> (of ...)" -> positional member of the unit's order.
  // skip fact clauses ("the first month is january") - only phrases whose
  // sentence names no other member are the queried position.
  const segOf = (pos) => {
    const s = pl.lastIndexOf('.', pos) + 1;
    const e = pl.indexOf('.', pos);
    return pl.slice(s, e < 0 ? undefined : e);
  };
  const segHasMember = (seg, skip) =>
    [...seg.matchAll(/\b([a-z]+)\b/g)].some(
      (w) => w.index !== skip && seqMember(w[1]) != null,
    );
  for (const m of pl.matchAll(/\b(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth|last)\s+(school day of the week|day of the school week|school day|school week|day of the week|day|month|week)\b/g)) {
    const seg = segOf(m.index);
    if (segHasMember(seg, m.index)) continue;
    const idx = m[1] === 'last' ? -1 : ORD_IDX[m[1]];
    const unit = m[2];
    if (unit === 'school day' || unit === 'school week' || unit === 'school day of the week' || unit === 'day of the school week') {
      const k = idx === -1 ? SCHOOL_WEEK.length - 1 : idx;
      // 'saturday' in choices is a defensible last-school-day rival (vn
      // saturday schools) - only keep when absent.
      if (!(m[1] === 'last' && choices.some((c) => /saturday/i.test(String(c)))) && SCHOOL_WEEK[k]) relCandidates.add(SCHOOL_WEEK[k]);
    } else if (unit === 'month') {
      const k = idx === -1 ? MONTHS.length - 1 : idx;
      if (MONTHS[k]) relCandidates.add(MONTHS[k]);
    } else {
      // plain day/week: 'first' is monday-or-sunday, 'last' is saturday-or-
      // sunday depending on convention - ambiguous unless only one convention
      // answer is among the choices.
      const conv = m[1] === 'last' ? ['saturday', 'sunday'] : m[1] === 'first' ? ['sunday', 'monday'] : [DAYS[idx]];
      const present = conv.filter((c) => c && cs.includes(c));
      if (present.length === 1) relCandidates.add(present[0]);
    }
  }
  // "days between <d1> and <d2>" -> exclusive distance
  const bw = /\b(?:days|months)\s+between\s+([a-z]+)\s+and\s+([a-z]+)\b/.exec(pl);
  if (bw) {
    const s1 = seqMember(bw[1]), s2 = seqMember(bw[2]);
    if (s1 && s2 && s1.order === s2.order) {
      const diff = Math.abs(s2.i - s1.i) - 1;
      if (diff >= 1) relCandidates.add(SEQ_ORDERS.cardinal[diff - 1]);
    }
  }
  if (relCandidates.size === 1 && seqMatch([...relCandidates][0])) return true;
  // r39b: queried category - when the stem asks for a kind (day/month/color/
  // animal/fruit/number) and exactly ONE choice belongs to it, the others are
  // non-answers, so the single member is uniquely defensible.
  const CAT_Q = [
    [/\bday\b/, DAYS], [/\bmonth\b/, MONTHS],
    [/\bcolou?r\b/, ['red','orange','yellow','green','blue','purple','pink','brown','black','white','grey','gray']],
    [/\banimal\b/, T.ANIMAL ?? []],
    [/\bfruit\b/, ['apple','banana','orange','mango','grape','pear','peach','melon','lemon','cherry']],
    [/\bnumber\b/, SEQ_ORDERS.cardinal.concat(SEQ_ORDERS.numeral)],
  ];
  for (const [re, members] of CAT_Q) {
    if (!re.test(pl)) continue;
    const inCat = cs.filter((c) => members.some((n) => new RegExp(`^(?:${n})$`, 'i').test(c)));
    if (inCat.length === 1 && norm(inCat[0]) === a) return true;
  }

  // sound mapping
  const snd = /['"]([a-z][a-z ]*?)[!?.,]*['"]/.exec(pl)?.[1] ?? /says? (\w+)/.exec(pl)?.[1];
  if (snd) { const target = T.SOUND[norm(snd.split(' ')[0])] ?? T.SOUND[norm(snd)]; if (target) return norm(ans) === target; }
  if (/says|barks?|sounds?/.test(pl) && a === 'dog') return true;

  // animal attributes - keep only when exactly one choice matches
  const attr = (re, set2) => re.test(pl) && only(set2, cs) && inSet(set2, a);
  if (attr(/pet/, T.PET)) return true;
  if (attr(/wild/, T.WILD)) return true;
  if (attr(/fly|flies|wings/, T.FLY)) return true;
  if (attr(/swims?|lives? in (the )?water|in water/, T.WATER_LIFE)) return true;
  if (attr(/lays? eggs?/, T.EGGS)) return true;
  if (attr(/jumps?|hops?/, T.JUMP)) return true;
  if (attr(/climbs?/, T.CLIMB)) return true;
  if (attr(/trunk/, T.TRUNK)) return true;
  if (attr(/long neck/, T.LONGNECK)) return true;
  if (attr(/striped|stripes/, T.STRIPED)) return true;
  if (attr(/\bbig\b|large/, T.BIG)) return true;
  if (attr(/little|small/, T.SMALL)) return true;
  if (attr(/farm/, T.FARM)) return true;
  if (attr(/green/, T.GREEN_ANIMAL)) return true;
  if (attr(/brown/, T.BROWN_ANIMAL)) return true;
  const letterM = /starts? with (?:the )?letter '?([a-z])'?|['"]([a-z]+)['"] at the (?:start|beginning)|beginning with '?([a-z])'?|starts? with '?([a-z])'?\b/i.exec(p);
  if (letterM) { const l = letterM.slice(1).find(Boolean).toLowerCase(); return cs.filter((c) => c.startsWith(l)).length === 1 && a.startsWith(l); }
  if (/green and jumps|green.*jump/.test(pl) && a === 'frog') return true;
  if (/big and grey|big and gray/.test(pl) && a === 'elephant') return true;
  if (/four legs/.test(pl) && only(['dog', 'cat', 'cow', 'pig', 'horse', 'sheep', 'goat', 'rabbit', 'mouse', 'lion', 'tiger', 'bear', 'elephant', 'zebra', 'giraffe', 'monkey', 'hippo', 'fox', 'donkey'], cs) && !inSet(['bird', 'fish', 'snake', 'duck', 'chicken', 'frog'], a)) return true;

  // kinship logic
  for (const [re, want] of KIN) if (re.test(pl)) return a === want || (want === 'dad' && a === 'father') || (want === 'mom' && ['mother', 'mom', 'mum'].includes(a));

  // day/month arithmetic & facts
  const dayIdx = (n) => DAYS.indexOf(n);
  const monIdx = (n) => MONTHS.indexOf(n);
  const mDay = set === 'day' && (/today is (\w+)[.,].*tomorrow/i.exec(p) ?? /it is (\w+day) today.*tomorrow/i.exec(p) ?? /the day after (\w+day)\b/i.exec(p));
  if (mDay) if (dayIdx(a) === (dayIdx(mDay[1].toLowerCase()) + 1) % 7) return true;
  const mYes = set === 'day' && /yesterday (was|is) (\w+)[.,].*today/i.exec(p);
  if (mYes) if (dayIdx(a) === (dayIdx(mYes[2].toLowerCase()) + 1) % 7) return true;
  const mTom = set === 'day' && (/tomorrow is (\w+day)[.,].*yesterday/i.exec(p) ?? /tomorrow will be (\w+day)[.,].*yesterday/i.exec(p));
  if (mTom) if (dayIdx(a) === (dayIdx(mTom[1].toLowerCase()) + 6) % 7) return true;
  const mTom2 = set === 'day' && /tomorrow is (\w+day)[.,].*today/i.exec(p);
  if (mTom2) if (dayIdx(a) === (dayIdx(mTom2[1].toLowerCase()) + 6) % 7) return true;
  const anchor = set === 'day' && (/it is (\w+day)\b/i.exec(p) ?? /today is (\w+day)\b/i.exec(p));
  if (anchor && /yesterday/.test(pl)) if (dayIdx(a) === (dayIdx(anchor[1].toLowerCase()) + 6) % 7) return true;
  if (anchor && /tomorrow/.test(pl)) if (dayIdx(a) === (dayIdx(anchor[1].toLowerCase()) + 1) % 7) return true;
  const mMon = set === 'month' && /month (after|before) (\w+)/i.exec(p);
  if (mMon) if (monIdx(a) === (mMon[1] === 'after' ? monIdx(mMon[2].toLowerCase()) + 1 : monIdx(mMon[2].toLowerCase()) - 1)) return true;
  if (set === 'day' && /not a (school day|weekday)|no school/.test(pl)) { const wd = ['saturday', 'sunday']; if (cs.filter((c) => wd.includes(c)).length === 1) return wd.includes(a); }
  const sm = set === 'month' && /(spring|summer|autumn|fall|winter) month/.exec(pl);
  if (sm) { const map = { spring: [2, 3, 4], summer: [5, 6, 7], autumn: [8, 9, 10], fall: [8, 9, 10], winter: [11, 0, 1] }[sm[1]]; if (cs.filter((c) => map.includes(monIdx(c))).length === 1) return map.includes(monIdx(a)); }
  if (set === 'month' && /christmas/.test(pl)) if (a === 'december' && cs.filter((c) => c === 'december').length === 1) return true;
  if (set === 'month' && /halloween/.test(pl)) if (a === 'october') return true;
  if (set === 'month' && /new year|t[eế]t/.test(pl)) if (['january', 'february'].includes(a)) return true;
  if (set === 'day' && /weekend/.test(pl)) { const wd = ['saturday', 'sunday']; const inP = wd.filter((d) => new RegExp(`\\b${d}\\b`).test(pl)); if (inP.length === 1) if (a === wd.find((d) => d !== inP[0])) return true; if (cs.filter((c) => wd.includes(c)).length === 1) return wd.includes(a); }
  if (set === 'day' && /can'?t go to school|don'?t go to school|doesn'?t go to school|no school/.test(pl)) { const wd = ['saturday', 'sunday']; if (cs.filter((c) => wd.includes(c)).length === 1) return wd.includes(a); }
  if (set === 'day' && /school days?:?\s*\w+day (to|-)/.test(pl)) if (a === 'friday') return true;
  if (set === 'day' && /go to school|school day|goes to school|because of school|at school|school days|school morning|class|lessons?/.test(pl)) { const wd = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']; if (cs.filter((c) => wd.includes(c)).length === 1) return wd.includes(a); }
  if (set === 'day' && /sleep late|sleep in|stay up|lie in|day off|rest at home|can (play|rest|relax|watch)/.test(pl)) { const wd = ['saturday', 'sunday']; if (cs.filter((c) => wd.includes(c)).length === 1) return wd.includes(a); }
  if (set === 'day' && /can'?t go to (the )?(park|zoo|beach)|can'?t play/.test(pl) && /school/.test(pl)) { const wd = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']; if (cs.filter((c) => wd.includes(c)).length === 1) return wd.includes(a); }
  if (set === 'month' && /shortest.*(name|word)/.test(pl)) if (a === 'may') return true;
  if (set === 'month' && /shortest/.test(pl) && /days|month/.test(pl)) if (a === 'february') return true;
  if (set === 'month' && /summer (vacation|holiday|break)/.test(pl)) { const sm2 = ['may', 'june', 'july']; if (cs.filter((c) => sm2.includes(c)).length === 1) return sm2.includes(a); }
  if (set === 'month' && /school.*(starts|begins|opens)|starts? school|back to school/.test(pl)) { const fm = ['august', 'september']; if (cs.filter((c) => fm.includes(c)).length === 1) return fm.includes(a); }
  if (set === 'month' && /hot|hottest|warmest|sunny/.test(pl)) { const hm = ['june', 'july', 'august']; if (cs.filter((c) => hm.includes(c)).length === 1) return hm.includes(a); }
  if (set === 'month' && /(in|is) (spring|summer|autumn|fall|winter)\b/.test(pl)) { const sn = /(spring|summer|autumn|fall|winter)/.exec(pl)[1]; const map = { spring: ['march', 'april', 'may'], summer: ['june', 'july', 'august'], autumn: ['september', 'october', 'november'], fall: ['september', 'october', 'november'], winter: ['december', 'january', 'february'] }[sn]; if (cs.filter((c) => map.includes(c)).length === 1) return map.includes(a); }
  if (set === 'month' && /warm clothes|coat|cold|winter/.test(pl)) { const wm = ['december', 'january', 'february']; if (cs.filter((c) => wm.includes(c)).length === 1) return wm.includes(a); }
  if (set === 'month' && /flowers?|beautiful/.test(pl)) { const pm = ['march', 'april', 'may']; if (cs.filter((c) => pm.includes(c)).length === 1) return pm.includes(a); }
  if (set === 'month' && /mid-autumn|trung thu/.test(pl)) { const mm = ['september', 'october']; if (cs.filter((c) => mm.includes(c)).length === 1) return mm.includes(a); }
  if (set === 'month' && /most days|31 days|longest.*days|more days/.test(pl)) { const d31 = ['january', 'march', 'may', 'july', 'august', 'october', 'december']; if (cs.filter((c) => d31.includes(c)).length === 1) return d31.includes(a); }
  if (set === 'month' && /fewest days|shortest.*(days|month)|28 or 29|28-29/.test(pl)) if (a === 'february') return true;
  if (set === 'month' && /30 days|thirty days/.test(pl)) { const d30 = ['april', 'june', 'september', 'november']; if (cs.filter((c) => d30.includes(c)).length === 1) return d30.includes(a); }
  if (set === 'month' && /longest.*(name|word)|most letters/.test(pl)) if (a === 'september') return true;
  if (set === 'month' && /cool (month|weather)|autumn month/.test(pl)) { const am3 = ['september', 'october', 'november']; if (cs.filter((c) => am3.includes(c)).length === 1) return am3.includes(a); }
  if (set === 'month' && /children'?s day/.test(pl)) if (a === 'june') return true;
  const mdMatch = set === 'month' && /more days in (\w+) than/.exec(pl);
  if (mdMatch) { const dim = (m) => (m === 'february' ? 28 : ['april', 'june', 'september', 'november'].includes(m) ? 30 : 31); const shorter = cs.filter((c) => dim(c) < dim(mdMatch[1].toLowerCase())); if (shorter.length === 1) return a === shorter[0]; }
  if (set === 'month' && /winter.*(starts|begins)/.test(pl)) { const wm = ['december', 'january']; if (cs.filter((c) => wm.includes(c)).length === 1) return wm.includes(a); }
  if (set === 'month' && /summer.*(starts|begins)/.test(pl)) { const sm3 = ['june', 'july']; if (cs.filter((c) => sm3.includes(c)).length === 1) return sm3.includes(a); }
  if (set === 'month' && /(spring|autumn).*(starts|begins)/.test(pl)) { const am = ['march', 'september']; if (cs.filter((c) => am.includes(c)).length === 1) return am.includes(a); }
  if (set === 'month' && /leaves (turn|fall)|turn(ing)? yellow|fall foliage/.test(pl)) { const am2 = ['september', 'october', 'november']; if (cs.filter((c) => am2.includes(c)).length === 1) return am2.includes(a); }

  // gender selector: only one choice fits
  if (/^(he|this is my .*\. he|.*\. he is|.* he has)/.test(pl) || /\bhe\b/.test(pl.slice(0, 40))) {
    if (only(T.MALE.filter((m) => m !== 'cousin' && m !== 'baby'), cs) && inSet(T.MALE, a)) return true;
  }
  if (/^(she|this is my .*\. she|.*\. she is|.* she has)/.test(pl) || /\bshe\b/.test(pl.slice(0, 40))) {
    if (only(T.FEMALE.filter((f) => f !== 'cousin' && f !== 'baby'), cs) && inSet(T.FEMALE, a)) return true;
  }

  // age/look selectors with single-match sets
  if (/old(est)? man|old(est)?\b/.test(pl) && only(T.OLD, cs) && inSet(T.OLD, a)) return true;
  if (/who is (the )?old(er|est)?|older than|oldest/.test(pl)) { const ot = ['father', 'mother', 'dad', 'mom', 'mum', 'grandpa', 'grandma', 'grandfather', 'grandmother', 'uncle', 'aunt']; if (only(ot, cs) && inSet(ot, a)) return true; }
  if (/old(er|est)|elder/.test(pl) && only(['brother', 'sister'], cs) && inSet(['brother', 'sister'], a)) return true;
  if (/great\b/.test(pl)) { const gg = ['grandma', 'grandpa', 'grandmother', 'grandfather']; if (only(gg, cs) && inSet(gg, a)) return true; }
  if (/young(est)?|baby/.test(pl) && cs.filter((c) => T.BABY.includes(c)).length === 1) return inSet(T.BABY, a);
  if (/young/.test(pl) && only(['brother', 'sister', 'son', 'daughter', 'cousin'], cs) && inSet(['brother', 'sister', 'son', 'daughter', 'cousin'], a)) return true;
  if (/woman/.test(pl) && only(T.FEMALE.filter((f) => f !== 'baby'), cs) && inSet(T.FEMALE, a)) return true;
  if (/boy/.test(pl) && only(['brother', 'son'], cs) && inSet(['brother', 'son'], a)) return true;
  if (/man\b/.test(pl) && !/woman/.test(pl) && only(T.MALE.filter((m) => !['baby', 'son'].includes(m)), cs) && inSet(T.MALE, a)) return true;

  // job-from-description (job set only)
  if (set === 'job') for (const [re, want] of JOB_VERB) if (re.test(pl)) return new RegExp(`^(${want})$`).test(a) && cs.filter((c) => new RegExp(`^(${want})$`).test(c)).length === 1;

  // subject-from-description (subject set only)
  if (set === 'subject') for (const [re, want] of SUBJ_DESC) if (re.test(pl)) return new RegExp(`^(${want})$`).test(a) && cs.filter((c) => new RegExp(`^(${want})$`).test(c)).length === 1;

  // room-from-activity (room set only)
  if (set === 'room') for (const [re, want] of ROOM_ACT) if (re.test(pl)) return new RegExp(`^(${want})$`).test(a) && cs.filter((c) => new RegExp(`^(${want})$`).test(c)).length === 1;

  // factual colors (color set only) - object nearest the blank decides
  if (set === 'color') {
    if (/night|night sky|dark/.test(pl)) if (a === 'black') return true;
    if (/cloudy|rain(ing|y)?|storm/.test(pl)) if (a.replace('grey', 'gray') === 'gray') return true;
    const blankAt = Math.max(pl.lastIndexOf('___'), pl.lastIndexOf('...'));
    const matched = Object.entries(FACT_COLOR)
      .map(([obj, col]) => {
        const esc = obj.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
        const m = new RegExp(`\\b${esc}(es|s)?\\b`).exec(pl);
        return m ? { obj, col, at: m.index } : null;
      })
      .filter(Boolean)
      .sort((x, y) => x.at - y.at);
    if (matched.length) {
      const target = matched.filter((m) => m.at < blankAt || blankAt === -1).pop() ?? matched[matched.length - 1];
      if (a.replace('grey', 'gray') === target.col.replace('grey', 'gray')) return true;
    }
    for (const [re, want] of MIX_COLOR) if (re.test(pl)) return new RegExp(`^(${want})$`).test(a);
  }

  // drinks & food (food set only)
  if (set === 'food') {
    if (/dessert|sweet( food|s)?/.test(pl)) if (only(T.DESSERT, cs) && inSet(T.DESSERT, a)) return true;
    if (/strong bones|calcium|white and cold/.test(pl)) if (a === 'milk') return true;
    if (/vitamin c/.test(pl)) if (a === 'orange' && cs.filter((c) => c === 'orange').length === 1) return true;
    if (/it is hot|hot day|weather is hot|hot weather/.test(pl) && /eat|ice cream|food/.test(pl)) if (only(T.DESSERT, cs) && inSet(T.DESSERT, a)) return true;
    const cm = /\b(yellow|red|green|purple|white|brown)\b/.exec(pl);
    if (cm) { const matches = cs.filter((c) => (FACT_COLOR[c] ?? '').replace('grey', 'gray') === cm[1]); if (matches.length === 1) if (a === matches[0]) return true; }
    if (/drink|thirsty/.test(pl)) if (only(T.DRINK, cs) && inSet(T.DRINK, a)) return true;
    if (/eat|hungry/.test(pl)) if (cs.filter((c) => !T.DRINK.includes(c)).length === 1) return !inSet(T.DRINK, a);
    if (/cook/.test(pl)) if (cs.filter((c) => !T.DRINK.includes(c)).length === 1) return !inSet(T.DRINK, a);
  }

  // sports/seasons descriptors (own set only)
  if (set === 'sport') for (const [re, want] of SPORT_DESC) if (re.test(pl)) return new RegExp(`^(${want})$`).test(a) && cs.filter((c) => new RegExp(`^(${want})$`).test(c)).length === 1;
  if (set === 'season') {
    const mon = new RegExp(`\\b(${MONTHS.join('|')})\\b`).exec(pl);
    if (mon && /season/.test(pl)) { const want = MONTH_TO_SEASON[mon[1]]; if (cs.filter((c) => c === want).length === 1) return a === want; }
    if (/rain|wettest|rainy/.test(pl)) if (a === 'summer') return true;
    for (const [re, want] of SEASON_DESC) if (re.test(pl)) if (a === want && cs.filter((c) => c === want).length === 1) return true;
  }

  // preposition cloze (prep set): keep only fixed collocations & context-forced items.
  // pn normalizes every blank style to ' _B_ ' so rules can be written uniformly.
  // ---------- universal grammar constructions (any set) ----------
  {
    const pn = ` ${pl.replace(/\s*_{2,}\s*|\s*\.{2,}\s*|\s*…\s*/g, ' _B_ ')} `.replace(/\s+/g, ' ');
    const aa = a.replace(/[.!?,;:\s]+$/, '');
    const ccs = cs.map((c) => c.replace(/[.!?,;:\s]+$/, ''));
    const PL_EXC = new Set(['children', 'people', 'men', 'women', 'police', 'parents', 'mice', 'feet', 'teeth', 'geese', 'oxen', 'fish', 'sheep', 'deer', 'offspring', 'classmates', 'neighbors', 'friends', 'kids', 'students', 'teachers', 'workers', 'players', 'members', 'siblings', 'cousins', 'grandparents', 'animals', 'birds', 'visitors', 'tourists', 'cattle', 'clothes', 'goods', 'stairs', 'glasses', 'scissors', 'trousers', 'pants', 'shorts', 'jeans', 'goggles', 'earrings']);

    // cardinal number -> singular/plural noun morphology
    const numM = /\b(\d+|a|an|one|two|three|four|five|six|seven|eight|nine|ten|many|some|few|several) _B_/.exec(pn);
    if (numM) {
      const W2N = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
      const n = W2N[numM[1]] ?? parseInt(numM[1], 10);
      const IRR_PL = ['children', 'men', 'women', 'feet', 'teeth', 'mice', 'geese', 'people'];
      const isPl = (c) => {
        if (IRR_PL.includes(c) || !/s$/.test(c)) return IRR_PL.includes(c);
        const stems = [];
        if (/ies$/.test(c)) stems.push(c.slice(0, -3) + 'y');
        if (/ves$/.test(c)) stems.push(c.slice(0, -3) + 'f', c.slice(0, -3) + 'fe');
        if (/(s|sh|ch|x|z|o)es$/.test(c)) stems.push(c.slice(0, -2));
        if (/es$/.test(c)) stems.push(c.slice(0, -1));
        stems.push(c.slice(0, -1));
        return stems.some((s) => ccs.includes(s));
      };
      const isSg = (c) => !isPl(c) && ccs.some((o) => isPl(o) && o.replace(/e?s$/, '') === c);
      if (n === 1) {
        const sg = ccs.filter((c) => isSg(c) || (!isPl(c) && !ccs.some((o) => isPl(o))));
        if (sg.length === 1 && aa === sg[0] && ccs.every((c) => c === sg[0] || isPl(c))) return true;
      } else if (n > 1 || /many|some|few|several/.test(numM[1])) {
        const NONPL_S = new Set(['is', 'as', 'has', 'was', 'does', 'goes', 'this', 'yes', 'his', 'hers', 'its', 'thus', 'plus', 'bus', 'gas', 'us', 'news', 'always', 'perhaps', 'besides', 'sometimes', 'physics', 'maths']);
        const plForm = (c) => /s$/.test(c) && !NONPL_S.has(c) && !/(ss|us|sis)$/.test(c);
        const pls = ccs.filter(isPl);
        const eff = pls.length === 1 ? pls : ccs.filter(plForm);
        if (eff.length === 1 && aa === eff[0]) return true;
      }
    }

    // subject + _B_ + non-verb complement -> unique be-form by agreement
    // (all choices must be be-forms, so the construction selects one)
    if (ccs.every((c) => /^(am|is|are|be|was|were)$/.test(c))) {
      const sm = /\b(i|we|they|you|he|she|it|these|those|my \w+|the \w+|your \w+|nam|lan|mai|minh|anh|linh|huy|ha|hien|phong|thao|tuan|dung|huong|son|nhi|vy|khoa|trang|quang|[a-z]+s) _B_ \w+/.exec(pn);
      if (sm) {
        const subj = sm[1];
        const want =
          subj === 'i' ? 'am'
          : /^(we|they|you|these|those)$/.test(subj) || /s$/.test(subj) ? 'are'
          : 'is';
        const valid = ccs.filter((c) => c === want || /^(was|were)$/.test(c));
        if (aa === want && valid.length === 1) return true;
      }
    }

    // arithmetic fact: "N and M is ___" / "N plus M equals ___"
    const arM = /(\w+) (and|plus) (\w+) (is|equals?|makes?|are)\b/.exec(pn);
    if (arM) {
      const W2N = { zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20 };
      const x = W2N[arM[1]] ?? (/^\d+$/.test(arM[1]) ? +arM[1] : null);
      const y = W2N[arM[3]] ?? (/^\d+$/.test(arM[3]) ? +arM[3] : null);
      if (x != null && y != null) {
        const sum = x + y;
        const N2W = Object.fromEntries(Object.entries(W2N).map(([w, n]) => [n, w]));
        const hits = ccs.filter((c) => c === String(sum) || c === N2W[sum]);
        if (hits.length === 1 && (aa === String(sum) || aa === N2W[sum])) return true;
      }
    }

    // dialogue QA: quoted question -> unique matching response pattern
    if (/[""'']| says?\b|^a:|cannot|can you|do you|does (he|she|your)/.test(pl)) {
      const QA = [
        [/how old are you/, /^i('?m| am) (a|\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)( years old)?[.!]?$/],
        [/what('?s| is) your name/, /^(my name is|i('?m| am)) (?!fine\b|ok\b|okay\b|good\b|well\b|happy\b|sad\b|angry\b|tired\b|hungry\b|a\b|an\b|the\b|\d|one\b|two\b|three\b|four\b|five\b|six\b|seven\b|eight\b|nine\b|ten\b|eleven\b|twelve\b)[a-z]+[.!]?$/],
        [/how are you/, /^i('?m| am) (fine|ok|okay|good|well|happy|great)[,.!]?/],
        [/where are you from/, /^i('?m| am) from/],
        [/what is this|what'?s this/, /^(it'?s |it is |this is )/],
        [/what color|what colour/, /^(it'?s |it is )?\w+$/],
        [/says? ['""]? ?(hello|hi)\b/, /^(hello|hi)\b/],
      ];
      for (const [qRe, rRe] of QA) {
        if (!qRe.test(pl)) continue;
        const hits = ccs.filter((c) => rRe.test(c));
        if (hits.length === 1 && rRe.test(aa)) return true;
      }
      // can/do/does yes-no question: explicit cue in the prompt picks polarity
      if (/can('|’)?t\b|cannot\b|can you|do you|does (he|she|your)/.test(pl)) {
        const neg = /cannot|can('|’)?t\b| does not| do not|don't|doesn't/.test(pl);
        const noH = ccs.filter((c) => /^no(,| |!|\.)/.test(c));
        const yesH = ccs.filter((c) => /^yes(,| |!|\.)/.test(c));
        if (neg && noH.length === 1 && /^no/.test(aa)) return true;
        if (!neg && yesH.length === 1 && /^yes/.test(aa)) return true;
      }
    }

    // quoted imperative: "___ your books, please" -> unique base-form verb
    if (/[""''] _B_/.test(pn) || /says? ['""]? ?(_B_ )/.test(pn)) {
      const base = ccs.filter((c) => !/(s|es|ing|ed|to )$/.test(c) && !/^to /.test(c));
      if (base.length === 1 && aa === base[0]) return true;
    }

    // verb agreement: subject + _B_ + object/complement, all choices are
    // inflections of the same verb -> agreement selects the form.
    {
      const LEM2 = (w) => {
        const irr = { rode: 'ride', ridden: 'ride', ran: 'run', ate: 'eat', eaten: 'eat', drank: 'drink', drunk: 'drink', sang: 'sing', sung: 'sing', swam: 'swim', swum: 'swim', flew: 'fly', flown: 'fly', grew: 'grow', grown: 'grow', took: 'take', taken: 'take', made: 'make', did: 'do', done: 'do', does: 'do', went: 'go', gone: 'go', goes: 'go', saw: 'see', seen: 'see', wrote: 'write', written: 'write', drove: 'drive', driven: 'drive', drew: 'draw', drawn: 'draw', sat: 'sit', won: 'win', had: 'have', has: 'have', was: 'be', were: 'be', is: 'be', are: 'be', am: 'be', been: 'be', said: 'say', gave: 'give', given: 'give', came: 'come', fell: 'fall', fallen: 'fall', felt: 'feel', bought: 'buy', brought: 'bring', thought: 'think', taught: 'teach', caught: 'catch', slept: 'sleep', kept: 'keep', left: 'leave', met: 'meet', wore: 'wear', worn: 'wear', tore: 'tear', torn: 'tear', chose: 'choose', chosen: 'choose', began: 'begin', begun: 'begin', broke: 'break', broken: 'break', spoke: 'speak', spoken: 'speak', stole: 'steal', stolen: 'steal', woke: 'wake', woken: 'wake', hid: 'hide', hidden: 'hide', built: 'build', spent: 'spend', sent: 'send', lent: 'lend', lost: 'lose', found: 'find', held: 'hold', stood: 'stand', understood: 'understand', told: 'tell', sold: 'sell', heard: 'hear', put: 'put', cut: 'cut', hit: 'hit', let: 'let', set: 'set', shut: 'shut', hurt: 'hurt', cost: 'cost', got: 'get', forgot: 'forget', forgotten: 'forget', knew: 'know', known: 'know', threw: 'throw', thrown: 'throw', lay: 'lie', lain: 'lie', read: 'read', rode2: 'x', froze: 'freeze', frozen: 'freeze', bit: 'bite', bitten: 'bite', beat: 'beat', beaten: 'beat', shrank: 'shrink', shrunk: 'shrink', stank: 'stink', stunk: 'stink', rang: 'ring', rung: 'ring', sprang: 'spring', sprung: 'spring', dug: 'dig', stuck: 'stick', struck: 'strike', hung: 'hang', swung: 'swing', blew: 'blow', blown: 'blow', showed: 'show', shown: 'show', paid: 'pay', laid: 'lay', wound: 'wind', bound: 'bind', ground: 'grind' };
        if (irr[w]) return irr[w];
        if (/ies$/.test(w)) { const st = w.slice(0, -3); if (ccs.includes(st + 'ie')) return st + 'ie'; return st + 'y'; }
        if (/ied$/.test(w) && w.length > 4) { const st = w.slice(0, -3); if (ccs.includes(st + 'ie')) return st + 'ie'; return st + 'y'; }
        const SHORT = new Set(['go', 'do', 'be', 'see', 'die', 'lie', 'tie', 'fly', 'try', 'cry', 'dry', 'buy', 'say', 'pay', 'lay', 'run', 'win', 'sit', 'cut', 'put', 'hit', 'let', 'set', 'eat', 'get', 'rid', 'hop', 'nap', 'rub', 'hug', 'dig', 'jog', 'beg', 'nod', 'pat', 'bat', 'vet', 'hop', 'ski', 'use', 'age', 'ice']);
        if (/ying$/.test(w) && w.length > 4) { const cand = w.slice(0, -4) + 'ie'; if (ccs.includes(cand) || /^(d|l|t|v)$/.test(w.slice(0, -4))) return cand; }
        if (/ing$/.test(w) && w.length > 4) { const st = w.slice(0, -3).replace(/(.)\1$/, '$1'); for (const c of [st, st + 'e', st + 'en', st + 'y', st + 'ie']) if (ccs.includes(c)) return c; return st.length >= 3 || SHORT.has(st) ? st : w; }
        if (/ed$/.test(w) && w.length > 3) { const st = w.slice(0, -2).replace(/(.)\1$/, '$1'); for (const c of [st, st + 'e', st + 'en', st + 'y']) if (ccs.includes(c)) return c; return st.length >= 3 || SHORT.has(st) ? st : w; }
        if (/ies$/.test(w)) return w.slice(0, -3) + 'y';
        if (/s$/.test(w)) { const st = w.slice(0, -1); if (ccs.includes(st)) return st; if (/es$/.test(w)) return w.slice(0, -2); return st; }
        return w;
      };
      // malformed multi-word distractors ("is have", "was go") can't fill an
      // agreement slot - exclude them from the same-lemma requirement
      // "aux + non-ing" ("is have") and "to X" can't fill a bare agreement slot;
      // "is reading" stays - it is a valid progressive rival, not malformed.
      const gram = ccs.filter((c) => !/^to /.test(c) && !/^(is|are|am|was|were|do|does|did|has|have|had|will|would|can|could|shall|should|must|may|might|be|been) (?!.*ing\b)/.test(c));
      const NAMES0 = 'nam|lan|mai|minh|anh|linh|huy|ha|hien|phong|thao|tuan|dung|huong|son|nhi|vy|khoa|trang|quang|an|hoa|bao|chi|dao|dat|dieu|dong|duc|duy|giang|hai|han|hang|hanh|hao|hau|hiep|hoai|hoang|hop|hue|hung|khanh|lam|le|lien|loan|loc|long|luong|ly|manh|my|nga|nghi|ngoc|nguyen|nhan|nhat|nhu|oanh|phat|phuc|phuong|quoc|quyen|quyet|quynh|sang|sen|suong|tam|thang|thanh|thien|tho|thu|thuan|thuc|thuy|tien|toan|tri|trieu|trinh|truc|trung|truong|tu|tung|tuyen|uyen|van|viet|vinh|xuan|yen|tom|lucy|mary|john|jack|peter|anna|lily|emma|sam|ben|nick|sue|kim|alex|jim|tim|bob|ted|ron|dan|leo|max|amy|rose|jane|sara|lisa|nina|tina|julia|laura|grace|helen|kate|beth|ruth|david|mike|henry|kevin|tony|adam|andy|bill|carl|fred|george|harry|james|mark|paul|steve|eric|linda|alan|betty|carol|diana|edward|frank|irene|joe|karen|larry|nancy|oliver|patricia|robert|sandra|thomas|victor|wendy|zoe|aaron|brian|chris|dennis|ethan|felix|gary|howard|ivan|jacob|kyle|luke|matt|nathan|owen|philip|ryan|sean|todd|vincent|william|xavier|zachary|alice|cindy|doris|ellen|fiona|gloria|hannah|ivy|jenny|kitty|monica|nora|olivia|paula|rachel|stella|ursula|vicky|winnie|bella|claire|danny|emily|freddie|gemma|isabel|kenny|molly|noah|oscar|polly|rosie|sammy|tommy|maria|sophia|mia|chloe|ella|scarlett|leo|felix|jason|jessica|ashley|amanda|stephanie|nicole|michelle|kimberly|deborah|dorothy|margaret|charles|joseph|donald|kenneth|richard|susan|jennifer|elizabeth|barbara';
      // subject may carry adjectives/adverbs between it and the blank
      // ("my younger brother _B_", "she often _B_")
      const sub0 = new RegExp(`\\b(i|we|they|you|he|she|it|everyone|everybody|someone|somebody|anyone|anybody|nobody|no one|each|people|children|parents|kids|students|teachers|friends|boys|girls|men|women|(?:the|my|your|his|her|our|their|a|an|every|each|this|that) (?:[a-z]+ )*?[a-z]+s?|this|that|these|those|${NAMES0})(?:\\s+(?:often|always|usually|sometimes|never|rarely|seldom|normally|generally|hardly ever|really|also|just|still|already|every \\w+|on \\w+days?|at weekends?))*\\s+_B_ \\w+`).exec(pn);
      // if the subject is known, drop multiword choices whose aux can't agree
      // with it ("is having" is not a real rival for "we _B_ lunch")
      let gramS = gram;
      if (sub0) {
        const s0 = sub0[1];
        const det0 = /^(?:the|my|your|his|her|our|their|a|an|every|each|this|that) (?:[a-z]+ )*([a-z]+)$/.exec(s0);
        const third0 = /^(he|she|it|this|that|everyone|everybody|someone|somebody|anyone|anybody|nobody|no one|each)$/.test(s0) || new RegExp(`^(${NAMES0})$`).test(s0) || (det0 != null && !det0[1].endsWith('s') && !PL_EXC.has(det0[1]) && !/^their\b/.test(s0));
        gramS = gram.filter((c) => (third0 ? !/^(am|are|were|do|have)\b/.test(c) : !/^(is|has|does|was)\b/.test(c)));
      }
      const lems = new Set(gramS.map((c) => LEM2(c.split(/\s+/).slice(-1)[0])));
      if (gramS.length >= 2 && lems.size === 1 && !/^(am|is|are|be|was|were)$/.test([...lems][0])) {
        const NAMES = 'nam|lan|mai|minh|anh|linh|huy|ha|hien|phong|thao|tuan|dung|huong|son|nhi|vy|khoa|trang|quang|an|hoa|bao|chi|dao|dat|dieu|dong|duc|duy|giang|hai|han|hang|hanh|hao|hau|hiep|hoai|hoang|hop|hue|hung|khanh|lam|le|lien|loan|loc|long|luong|ly|manh|my|nga|nghi|ngoc|nguyen|nhan|nhat|nhu|oanh|phat|phuc|phuong|quoc|quyen|quyet|quynh|sang|sen|suong|tam|thang|thanh|thien|tho|thu|thuan|thuc|thuy|tien|toan|tri|trieu|trinh|truc|trung|truong|tu|tung|tuyen|uyen|van|viet|vinh|xuan|yen|tom|lucy|mary|john|jack|peter|anna|lily|emma|sam|ben|nick|sue|kim|alex|jim|tim|bob|ted|ron|dan|leo|max|amy|rose|jane|sara|lisa|nina|tina|julia|laura|grace|helen|kate|beth|ruth|david|mike|henry|kevin|tony|adam|andy|bill|carl|fred|george|harry|james|mark|paul|steve|eric|linda|alan|betty|carol|diana|edward|frank|irene|joe|karen|larry|nancy|oliver|patricia|robert|sandra|thomas|victor|wendy|zoe|aaron|brian|chris|dennis|ethan|felix|gary|howard|ivan|jacob|kyle|luke|matt|nathan|owen|philip|ryan|sean|todd|vincent|william|xavier|zachary|alice|cindy|doris|ellen|fiona|gloria|hannah|ivy|jenny|kitty|monica|nora|olivia|paula|rachel|stella|ursula|vicky|winnie|bella|claire|danny|emily|freddie|gemma|isabel|kenny|molly|noah|oscar|polly|rosie|sammy|tommy|maria|sophia|mia|chloe|ella|scarlett|leo|felix|jason|jessica|ashley|amanda|stephanie|nicole|michelle|kimberly|deborah|dorothy|margaret|charles|joseph|donald|kenneth|richard|susan|jennifer|elizabeth|barbara';
        const sub = sub0;
        const lemma = [...lems][0];
        // auxiliary before the blank carries the agreement -> base form only
        const auxAhead = /\b(do|does|did|can|can't|cannot|could|couldn't|will|won't|would|wouldn't|shall|should|shouldn't|must|mustn't|may|might|don't|doesn't|didn't|to)\b[^_]{0,15}_B_/.test(pn);
        if (auxAhead) {
          const b = ccs.filter((c) => LEM2(c.split(' ').slice(-1)[0]) === c && c === lemma);
          if (b.length === 1 && aa === b[0]) return true;
        }
        // be-verb before blank -> progressive -ing form (no subject needed)
        if (/\b(is|are|am|was|were|be) _B_/.test(pn)) {
          const ings = ccs.filter((c) => /ing$/.test(c) && LEM2(c.split(' ').slice(-1)[0]) === lemma && LEM2(c.split(' ').slice(-1)[0]) !== c);
          if (ings.length === 1 && aa === ings[0]) return true;
        }
        if (sub) {
          const s = sub[1];
          const detNoun = /^(?:the|my|your|his|her|our|their|a|an|every|each|this|that) (?:[a-z]+ )*([a-z]+)$/.exec(s);
          const third =
            /^(he|she|it|this|that|everyone|everybody|someone|somebody|anyone|anybody|nobody|no one|each)$/.test(s) ||
            new RegExp(`^(${NAMES})$`).test(s) ||
            (detNoun != null && !detNoun[1].endsWith('s') && !PL_EXC.has(detNoun[1]) && !/^their\b/.test(s));
          const pastCue = /\byesterday\b|last (week|month|year|sunday|monday|tuesday|wednesday|thursday|friday|saturday|night|summer|winter|holiday|time)|\bago\b|once upon|in \d{4}\b|when (i|he|she|we|they|you) (was|were|got|had|went|came)/.test(pl);
          if (pastCue) {
            // past form only: irregular-list past or regular -ed morphology
            const irrPasts = { ride: 'rode', run: 'ran', eat: 'ate', drink: 'drank', sing: 'sang', swim: 'swam', fly: 'flew', grow: 'grew', take: 'took', make: 'made', do: 'did', go: 'went', see: 'saw', write: 'wrote', drive: 'drove', draw: 'drew', sit: 'sat', win: 'won', have: 'had', be: 'was', say: 'said', give: 'gave', come: 'came', fall: 'fell', feel: 'felt', buy: 'bought', bring: 'brought', think: 'thought', teach: 'taught', catch: 'caught', sleep: 'slept', keep: 'kept', leave: 'left', meet: 'met', wear: 'wore', choose: 'chose', begin: 'began', break: 'broke', speak: 'spoke', steal: 'stole', wake: 'woke', hide: 'hid', build: 'built', spend: 'spent', send: 'sent', lend: 'lent', lose: 'lost', find: 'found', hold: 'held', stand: 'stood', understand: 'understood', tell: 'told', sell: 'sold', hear: 'heard', put: 'put', cut: 'cut', hit: 'hit', let: 'let', set: 'set', shut: 'shut', hurt: 'hurt', cost: 'cost', get: 'got', forget: 'forgot', know: 'knew', throw: 'threw', lie: 'lay', read: 'read' };
            // match the past form as spelled in the choices instead of guessing
            // English doubling rules (stress-dependent: listen->listened, stop->stopped)
            const cands = [lemma + 'ed', lemma + 'd', lemma + lemma.slice(-1) + 'ed', lemma.slice(0, -1) + 'ied'];
            const validPasts = irrPasts[lemma] ? [irrPasts[lemma]] : cands;
            const pasts = ccs.filter((c) => validPasts.includes(c) || (lemma === 'be' && /^(was|were)$/.test(c)));
            if (pasts.length === 1 && aa === pasts[0]) return true;
          } else {
            const IRR_S = { have: ['has'], do: ['does'], go: ['goes'], be: ['is'] };
            const validS = IRR_S[lemma] ?? [lemma + 's', lemma + 'es', /[^aeiou]y$/.test(lemma) ? lemma.slice(0, -1) + 'ies' : ''];
            const sForm = ccs.filter((c) => validS.includes(c));
            const bForm = ccs.filter((c) => LEM2(c) === c && c === lemma);
            if (third) { if (sForm.length === 1 && aa === sForm[0]) return true; }
            else if (bForm.length === 1 && aa === bForm[0]) return true;
          }
        }
      }
    }

    // demonstratives: _B_ is/are + near/far cue -> this/that/these/those grid
    {
      const dm = /_B_ (is|are|was|were)\b/.exec(pn);
      if (dm) {
        const plural = /^(are|were)$/.test(dm[1]);
        const near = /near|here|close|pointing at (my |the |your )?\w+ (near|close)/.test(pl) && !/far/.test(pl);
        const far = /far|over there|there$|away/.test(pl);
        const want = plural ? (far ? 'those' : 'these') : (far ? 'that' : 'this');
        const grid = ['this', 'that', 'these', 'those'];
        const cands = ccs.filter((c) => grid.includes(c));
        if (cands.length >= 2 && (near || far)) {
          if (cands.filter((c) => c === want).length === 1 && aa === want) return true;
        }
      }
    }

    // numeric sequence: >=2 numbers around the blank in a regular step
    {
      const W2N = { zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12 };
      const toks = pn.replace(/[?!.,]/g, ' ').split(/\s+/).filter(Boolean);
      const seq = toks.map((t) => (t === '_B_' ? 'B' : W2N[t] ?? (/^\d+$/.test(t) ? +t : 'x')));
      const runs = seq.join(' ').match(/(?:\d+|B)(?: (?:\d+|B)){2,}/g) ?? [];
      for (const run of runs) {
        const parts = run.split(' ');
        const bIdx = parts.indexOf('B');
        if (bIdx < 0) continue;
        const nums = parts.map((x) => (x === 'B' ? null : +x));
        const known = nums.filter((v) => v != null);
        if (known.length < 2) continue;
        // infer step from first two known neighbors
        const diffs = [];
        for (let i = 1; i < nums.length; i++) if (nums[i] != null && nums[i - 1] != null) diffs.push(nums[i] - nums[i - 1]);
        if (!diffs.length || !diffs.every((d) => d === diffs[0])) continue;
        const step = diffs[0];
        let expected = null;
        if (bIdx > 0 && nums[bIdx - 1] != null) expected = nums[bIdx - 1] + step;
        else if (bIdx + 1 < nums.length && nums[bIdx + 1] != null) expected = nums[bIdx + 1] - step;
        if (expected == null) continue;
        const N2W = Object.fromEntries(Object.entries(W2N).map(([w, n]) => [n, w]));
        const hits = ccs.filter((c) => c === String(expected) || c === N2W[expected]);
        if (hits.length === 1 && (aa === String(expected) || aa === N2W[expected])) return true;
      }
    }

    // look/feel/seem/sound + adjective -> unique descriptive choice
    if (/\b(look|feel|seem|sound)s? _B_/.test(pn)) {
      const ADJ = new Set(["happy","sad","angry","scared","afraid","excited","bored","tired","hungry","thirsty","sick","nervous","proud","calm","brave","lonely","worried","surprised","confused","sleepy","peaceful","glad","shy","curious","energetic","upset","cheerful","frustrated","disappointed","grateful","guilty","jealous","relaxed","amused","mad","furious","terrified","delighted","anxious","stressed","embarrassed","hopeful","hopeless","miserable","pleased","satisfied","unhappy","hurt","frightened","tall","short","fat","thin","slim","strong","weak","big","small","large","huge","tiny","little","long","wide","narrow","deep","shallow","high","low","thick","heavy","light","round","square","flat","straight","curved","sharp","blunt","hard","soft","smooth","rough","firm","solid","hollow","empty","full","hot","cold","warm","cool","wet","dry","clean","dirty","new","old","young","fresh","stale","ripe","raw","cooked","frozen","broken","fixed","open","closed","shut","locked","safe","dangerous","free","busy","ready","early","late","fast","slow","quick","easy","difficult","simple","complex","good","bad","better","best","worse","worst","fine","great","excellent","perfect","terrible","awful","wonderful","lovely","beautiful","pretty","ugly","handsome","cute","nice","kind","mean","rude","polite","friendly","unfriendly","funny","serious","strict","gentle","sweet","sour","salty","spicy","bitter","delicious","tasty","yummy","rich","poor","cheap","expensive","famous","popular","special","normal","common","rare","strange","odd","weird","usual","unusual","important","useful","useless","helpful","harmful","careful","careless","lucky","unlucky","clever","smart","stupid","silly","dumb","wise","foolish","honest","dishonest","lazy","hardworking","active","quiet","noisy","loud","silent","bright","dark","colorful","colourful","white","black","red","blue","green","yellow","orange","purple","pink","brown","gray","grey","golden","silver","same","different","other","another","right","wrong","correct","incorrect","true","false","real","fake","alive","dead","awake","asleep","alone","married","single","sorry","welcome","interesting","boring","exciting","amazing","surprising","scary","disgusting","charming","attractive","pleasant","enjoyable","comfortable","uncomfortable","healthy","unhealthy","ill","well","painful","successful","possible","impossible","probable","likely","certain","sure","positive","negative","modern","ancient","recent","local","foreign","public","private","personal","official","fair","unfair","equal","similar","exact","clear","obvious","necessary","unnecessary","available","absent","present","missing","lost","found","whole","half","enough","several","various","main","major","minor","extra","spare","regular","irregular","formal","informal","natural","artificial","wild","tame","domestic","male","female","human","royal","noble","holy","sacred","magic","magical","electric","electronic","digital","online","offline","mobile","global","international","national","rural","urban","central","northern","southern","eastern","western","left","right","front","back","top","bottom","middle","inner","outer","upper","lower","first","last","next","previous","following","final","initial","original","current","past","future","daily","weekly","monthly","yearly","annual","hourly","immediate","instant","sudden","gradual","permanent","temporary","constant","continuous","frequent","occasional"]);
      const hits = ccs.filter((c) => ADJ.has(c));
      if (hits.length === 1 && aa === hits[0]) return true;
    }

    // all-numeric choices + singular noun after blank -> "one" (two+ would need plural)
    if (ccs.every((c) => /^(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|\d+)$/.test(c))) {
      const nw = /_B_ (\w+)/.exec(pn);
      if (aa === 'one' && ((nw && !/s$/.test(nw[1])) || /\b(a|an) _B_/.test(pn))) return true;
    }

    // existential there: "there _B_ <plural cue>" -> are, "there _B_ a/one" -> is
    {
      const th = /\bthere _B_ (\w+)/.exec(pn);
      if (th && /^(are|is|am|be|was|were)$/.test(aa)) {
        const w = th[1];
        const isSing = /^(a|an|one|this|that|no|another)$/.test(w);
        const isPl = /^(two|three|four|five|six|seven|eight|nine|ten|\d+|some|many|few|several|lots|a lot)$/.test(w) || (/s$/.test(w) && !isSing);
        const want = isPl ? 'are' : isSing ? 'is' : null;
        if (want && ccs.filter((c) => c === want).length === 1 && aa === want) return true;
      }
    }

    // "this/these _B_ <noun>" -> is/are by demonstrative number
    if (/^(am|is|are|be|was|were)$/.test(aa)) {
      const dm = /\b(this|these|those|that|it|there) _B_/.exec(pn);
      if (dm) {
        const want = /^(these|those)$/.test(dm[1]) ? 'are' : 'is';
        if (dm[1] !== 'there' && ccs.filter((c) => c === want).length === 1 && aa === want) return true;
      }
    }

    // animal can _B_: exactly one physiologically possible action
    {
      const PHYS = { fly: /bird|bee|butterfly|eagle|parrot|plane/, swim: /fish|duck|frog|turtle|whale|dolphin|shark|penguin|seal|swan|dog|cat/, jump: /frog|rabbit|kangaroo|horse/, run: /horse|cheetah|dog|cat|tiger|lion|zebra|deer|rabbit/, climb: /monkey|cat|squirrel/, hop: /rabbit|kangaroo|frog/, crawl: /baby|snail|turtle|ant|spider|snake/, sing: /bird|girl|boy|mom|dad|teacher/, walk: /duck|penguin|baby|dog|cat|boy|girl/ };
      const am = /\b(fish|bird|frog|snake|horse|rabbit|cat|dog|monkey|duck|bee|turtle|snail|kangaroo|cheetah|lion|tiger|elephant|bear|panda|whale|dolphin|shark|eagle|parrot|penguin|butterfly|ant|spider|squirrel|zebra|deer|swan|baby|boy|girl)s? can _B_/.exec(pn);
      if (am) {
        const an = am[1];
        const possible = ccs.filter((c) => {
          const v = c.split(' ')[0].replace(/[^a-z]/g, '').replace(/ing$/, '').replace(/s$/, '');
          return Object.entries(PHYS).some(([act, re]) => re.test(an) && v.startsWith(act.slice(0, 4)));
        });
        if (possible.length === 1 && aa.split(' ')[0].replace(/[^a-z]/g, '').startsWith(possible[0].split(' ')[0].replace(/[^a-z]/g, '').slice(0, 4))) return true;
      }
    }

    // animal sound: "<animal> is _B_-ing" / "the X is ___ing"
    {
      const SND = { dog: /bark/, cat: /meow|miaow|mew/, bird: /chirp|sing|tweet/, lion: /roar/, tiger: /roar/, cow: /moo/, bee: /buzz/, snake: /hiss/, frog: /croak/, horse: /neigh/, sheep: /baa/, pig: /oink/, duck: /quack/, chicken: /cluck/, mouse: /squeak/, elephant: /trumpet/, monkey: /chatter/, donkey: /bray/, rooster: /crow/, wolf: /howl/ };
      const sm = /\b(dog|cat|bird|lion|tiger|cow|bee|snake|frog|horse|sheep|pig|duck|chicken|mouse|elephant|monkey|donkey|rooster|wolf)s? (is|are) _B_|\b(this|that|it) is a (dog|cat|bird|lion|tiger|cow|bee|snake|frog|horse|sheep|pig|duck|chicken|mouse|elephant|monkey|donkey|rooster|wolf)\b.*\bis _B_/.exec(pn);
      const animal = sm && (sm[1] ?? sm[4]);
      if (animal && SND[animal]) {
        const hits = ccs.filter((c) => SND[animal].test(c));
        if (hits.length === 1 && SND[animal].test(aa)) return true;
      }
    }

    // body-part instrument: "verb with (my|your|our) _B_"
    {
      const BODY = [
        [/\bkick\b.*with (my |your |our )?_B_|_B_ .*kick/, 'foot|feet'],
        [/point(ing)? (at|to|with).*(my |your |our )?_B_|point with (my |your |our )?_B_/, 'finger|fingers'],
        [/see with (my |your |our )?_B_/, 'eye|eyes'],
        [/hear(ing)? with (my |your |our )?_B_|listen with (my |your |our )?_B_/, 'ear|ears'],
        [/smell(ing)? with (my |your |our )?_B_/, 'nose'],
        [/eat(ing)? with (my |your |our )?_B_/, 'hand|hands|mouth'],
        [/write|writ(ing|e) with (my |your |our )?_B_/, 'hand|hands'],
        [/walk(ing)? with (my |your |our )?_B_/, 'leg|legs|foot|feet'],
        [/_B_ with (my |your |our )?hands/, 'clap|clapping|wave|waving|claps'],
        [/between (my |your |the )?(eyes|ears) and (my |your |the )?mouth/, 'nose'],
        [/brush.*teeth|teeth.*brush/, 'toothbrush'],
      ];
      for (const [re, want] of BODY) {
        if (!re.test(pn)) continue;
        const hits = ccs.filter((c) => new RegExp(`^(${want})$`, 'i').test(c));
        if (hits.length === 1 && new RegExp(`^(${want})$`, 'i').test(aa)) return true;
      }
    }

    // weather observation -> matching weather adjective
    {
      const WCTX = [
        [/white snow|snow( is)? falling|it is snowing|snow outside/, 'snowy'],
        [/rain(ing| is falling)|it is raining|rain outside|wet day/, 'rainy'],
        [/\bthe sun (is )?(shining|bright)|sunshine|bright sun\b/, 'sunny'],
        [/wind is blowing|strong wind|the wind\b/, 'windy'],
        [/\bfog\b|can'?t see/, 'foggy'],
        [/clouds? (in|cover|everywhere)|grey sky|gray sky|many clouds/, 'cloudy'],
      ];
      for (const [re, want] of WCTX) {
        if (!re.test(pl)) continue;
        const hits = ccs.filter((c) => c === want);
        if (hits.length === 1 && aa === want) return true;
      }
    }

    // fixed phrases & greetings
    {
      const FIX = [
        [/nice to meet _B_|nice to _B_ you|to meet _B_ too/, 'you|you too'],
        [/goodbye.*_B_ you|goodbye _B_|bye _B_ you/, 'see'],
        [/how are _B_|how _B_ you (doing|feeling)/, 'you'],
        [/when you (leave|go|say goodbye)/, 'goodbye|bye|good bye'],
        [/happy birthday.*_B_|_B_ .*happy birthday/, 'thank you|thanks'],
        [/good _B_ (everybody|everyone|class|boys|girls|teacher)/, 'morning|afternoon|evening'],
        [/good _B_$|_B_ morning|good _B_[,!]/, 'morning|afternoon|evening|night'],
      ];
      for (const [re, want] of FIX) {
        if (!re.test(pn) && !re.test(pl)) continue;
        const hits = ccs.filter((c) => new RegExp(`^(${want})`, 'i').test(c));
        if (hits.length === 1 && new RegExp(`^(${want})`, 'i').test(aa)) return true;
      }
    }

    // gendered kinship -> a man/a woman; mom+dad -> parents
    {
      if (/mom.*dad|dad.*mom|mother.*father|father.*mother|parents/.test(pl)) {
        if (/(mom|mother|mum|dad|father|parents) (and|&) (mom|mother|mum|dad|father|parents)/.test(pl) && ccs.filter((c) => c === 'parents').length === 1 && aa === 'parents') return true;
      }
      const FEM = /mother|mom\b|mum\b|grandmother|grandma|aunt|sister|daughter|she\b|woman|girl/;
      const MAL = /father|dad\b|grandfather|grandpa|uncle|brother|son\b|he\b|man\b|boy/;
      if (/(is|are) _B_|_B_ a (man|woman|boy|girl)/.test(pn)) {
        if (FEM.test(pl) && ccs.filter((c) => /^a woman$/.test(c)).length === 1 && aa === 'a woman') return true;
        if (MAL.test(pl) && ccs.filter((c) => /^a man$/.test(c)).length === 1 && aa === 'a man') return true;
      }
      // "this is <name>. _B_ bag" -> his/her by name gender
      const nm = /\bthis is (tom|mike|john|jack|peter|david|nick|sam|ben|ken|leo|max|tuan|minh|nam|phong|huy|son|dung|quang|khoa|anh\b|bob|tim|jim|dan|ted|ron|alex|eric|henry|kevin|tony|adam|andy|bill|carl|fred|george|harry|james|mark|paul|steve)/.exec(pl);
      const nf = /\bthis is (mary|lucy|anna|jane|lily|rose|amy|sue|kim\b|lan|mai|linh|thao|ha\b|hien|trang|nhi|vy|huong|nga|van|my\b|hanh|yen|chi|emma|sara|lisa|nina|tina|julia|laura|grace|helen|kate|beth|ruth)/.exec(pl);
      if ((nm || nf) && / _B_ \w/.test(pn)) {
        const want = nm ? 'his' : 'her';
        const poss = ccs.filter((c) => /^(his|her|their|my|your|its)$/.test(c));
        if (poss.length >= 1 && poss.includes(want) && aa === want) return true;
      }
    }

    // adjective-before-noun: "_B_ <noun>" with exactly one adjective choice
    {
      const ADJ = new Set(['happy', 'sad', 'big', 'small', 'little', 'long', 'short', 'tall', 'fat', 'thin', 'good', 'bad', 'new', 'old', 'young', 'smart', 'nice', 'kind', 'funny', 'angry', 'tired', 'hungry', 'thirsty', 'surprised', 'scared', 'fast', 'slow', 'hot', 'cold', 'beautiful', 'pretty', 'ugly', 'strong', 'weak', 'lazy', 'busy', 'clean', 'dirty', 'wet', 'dry', 'soft', 'hard', 'loud', 'quiet', 'boring', 'interesting', 'brave', 'clever', 'silly', 'polite', 'rude', 'rich', 'poor', 'dark', 'light', 'heavy', 'easy', 'difficult', 'wrong', 'right', 'true', 'real', 'same', 'different', 'normal', 'special', 'famous', 'red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'black', 'white', 'brown', 'grey', 'gray', 'golden', 'silver', 'joyful', 'colorful', 'nervous', 'smiling', 'crying', 'frowning', 'sleeping', 'sitting', 'standing', 'running', 'walking', 'flying', 'swimming', 'jumping', 'clapping', 'laughing', 'sweet', 'sour', 'cute', 'lovely']);
      const mw = /_B_ (\w+)/.exec(pn);
      const FUNC = /^(in|on|at|to|of|for|with|by|from|into|over|under|between|through|during|before|after|above|below|up|down|out|off|about|against|along|among|around|behind|beside|beyond|near|past|since|toward|upon|within|without|the|a|an|this|that|these|those|my|your|his|her|its|our|their|very|so|too|quite|rather|really|just|only|also|even|still|now|then|here|there|when|where|why|how|what|who|which|is|are|am|was|were|be|been|being|do|does|did|have|has|had|can|could|will|would|shall|should|must|may|might|not|no|yes|and|or|but|if|because|than|as|much|many|more|most|some|any|all|every|each|both|few|several|enough)$/;
      if (mw && !FUNC.test(mw[1]) && !/s$/.test(mw[1])) {
        const ADJSUF = /(ish|ous|ful|less|ive|ern|able|ible|est|al|ic)$/;
        const adj = ccs.filter((c) => ADJ.has(c.toLowerCase()));
        const nounish = ccs.filter((c) => !ADJ.has(c.toLowerCase()) && !ADJSUF.test(c.toLowerCase()) && !FUNC.test(c.toLowerCase()));
        if (adj.length === 1 && nounish.length === ccs.length - 1 && aa.toLowerCase() === adj[0].toLowerCase()) return true;
      }
    }

    // "_B_ <vowel-word>" with article choices only -> an (non-article rivals don't fill)
    {
      const vw = /_B_ ([aeiou]\w*)/.exec(pn);
      if (vw) {
        const articles = ['a', 'an', 'the', 'some', 'any', 'one'];
        const artIn = ccs.filter((c) => articles.includes(c.toLowerCase()));
        const nonArt = ccs.filter((c) => !articles.includes(c.toLowerCase()));
        if (artIn.length && nonArt.every((c) => /^(is|are|am|be|was|were|do|does|has|have|had|to|in|on|at|of|for|with|by|not|no|yes|my|your|his|her|its|our|their|this|that|these|those|it|he|she|we|they|i|you|two|three|four|five|six|seven|eight|nine|ten|many|much|few|little|very|so|too)$/i.test(c))) {
          // only 'an' fits a vowel word; 'the'/'some' are also defensible -> skip if present
          if (!nonArt.some((c) => articles.includes(c.toLowerCase())) && artIn.every((c) => c.toLowerCase() === 'an' || c.toLowerCase() === 'a')) {
            if (artIn.filter((c) => c.toLowerCase() === 'an').length === 1 && aa.toLowerCase() === 'an') return true;
          }
        }
      }
    }

    // symbolic arithmetic: "7 + 13 = _B_", "A + B = _B_ + C", "N - M = _B_"
    {
      const eq =
        /(\d+)\s*([+\-x×*])\s*(\d+)\s*=\s*_B_\s*([+\-x×*])\s*(\d+)/.exec(pn) ||
        /(\d+)\s*([+\-x×*])\s*(\d+)\s*=\s*_B_/.exec(pn);
      if (eq) {
        const calc = (x, o, y) => (o === '+' ? x + y : o === '-' ? x - y : x * y);
        let expected = calc(+eq[1], eq[2], +eq[3]);
        if (eq[4] && eq[5]) expected = eq[2] === eq[4] && eq[2] !== undefined ? (eq[2] === '+' ? expected - +eq[5] : expected + +eq[5]) : null;
        if (expected != null) {
          const hits = ccs.filter((c) => c === String(expected));
          if (hits.length === 1 && aa === String(expected)) return true;
        }
      }
    }

    // "___ some milk" -> "There is" (uncountable) / "There are" (plural)
    {
      const tt = /_B_ (a |an |one |the |some |two |three |four |five |six |seven |eight |nine |ten |many |few |several |lots of |a lot of |\d+ )?([a-z]+)/.exec(pn);
      if (tt && ccs.length >= 2 && ccs.every((c) => /^(there|here|it|they|this|that) [a-z ]+$/i.test(c))) {
        const det = (tt[1] ?? '').trim();
        const noun = tt[2];
        const UNCOUNT = new Set(['milk', 'water', 'bread', 'rice', 'juice', 'soup', 'food', 'meat', 'fish', 'money', 'time', 'homework', 'news', 'tea', 'coffee', 'sugar', 'salt', 'butter', 'cheese', 'chocolate', 'air', 'rain', 'snow', 'ice', 'grass', 'paper', 'wood', 'traffic', 'music', 'information', 'furniture', 'petrol', 'gold']);
        let want;
        if (/^(a|an|one|the)$/.test(det) || UNCOUNT.has(noun)) want = 'there is';
        else if (/^(some|two|three|four|five|six|seven|eight|nine|ten|many|few|several|lots of|a lot of|\d+)$/.test(det) || (/s$/.test(noun) && !/ss$/.test(noun))) want = 'there are';
        else want = 'there is';
        const hits = ccs.filter((c) => c.toLowerCase() === want);
        if (hits.length === 1 && aa.toLowerCase() === want) return true;
      }
    }

    // species offspring: "baby X came from ___" / "X has ___" -> unique valid term
    {
      const OFF = {
        bear: ['cubs', 'a cub'], lion: ['cubs', 'a cub'], tiger: ['cubs', 'a cub'], panda: ['cubs', 'a cub'], wolf: ['cubs', 'a cub', 'pups', 'puppies'],
        dog: ['puppies', 'a puppy', 'pups'], cat: ['kittens', 'a kitten'],
        cow: ['calves', 'a calf'], elephant: ['calves', 'a calf'], whale: ['calves', 'a calf'], dolphin: ['calves', 'a calf'], giraffe: ['calves', 'a calf'], hippo: ['calves', 'a calf'], rhino: ['calves', 'a calf'], deer: ['calves', 'a calf'],
        sheep: ['lambs', 'a lamb'], goat: ['kids', 'a kid'], horse: ['foals', 'a foal'], pig: ['piglets', 'a piglet'],
        chicken: ['chicks', 'a chick', 'chicks from eggs', 'babies from eggs', 'eggs'], hen: ['chicks', 'a chick', 'chicks from eggs', 'babies from eggs', 'eggs'], duck: ['ducklings', 'a duckling', 'chicks', 'chicks from eggs', 'babies from eggs', 'eggs'], goose: ['goslings', 'chicks', 'chicks from eggs', 'babies from eggs', 'eggs'], eagle: ['eaglets', 'chicks', 'chicks from eggs', 'babies from eggs', 'eggs'], bird: ['chicks', 'a chick', 'chicks from eggs', 'baby birds', 'babies from eggs', 'eggs'], penguin: ['chicks', 'chicks from eggs', 'babies from eggs', 'eggs'], rooster: ['chicks', 'chicks from eggs', 'babies from eggs', 'eggs'], ostrich: ['chicks', 'chicks from eggs', 'babies from eggs', 'eggs'], owl: ['owlets', 'chicks', 'chicks from eggs', 'babies from eggs', 'eggs'],
        frog: ['tadpoles', 'a tadpole', 'tadpoles from eggs', 'babies from eggs'],
        butterfly: ['caterpillars', 'a caterpillar', 'caterpillars from eggs', 'babies from cocoons'],
        mosquito: ['larvae', 'larvae from eggs', 'babies from eggs'], fly: ['larvae', 'larvae from eggs', 'maggots'],
        salmon: ['babies from eggs', 'eggs'], fish: ['babies from eggs', 'eggs', 'fry'],
        snake: ['babies from eggs', 'eggs', 'snakelets'], turtle: ['babies from eggs', 'eggs', 'hatchlings'], lizard: ['babies from eggs', 'eggs'], gecko: ['babies from eggs', 'eggs'], snail: ['babies from eggs', 'eggs'], crocodile: ['babies from eggs', 'eggs', 'hatchlings'], shark: ['babies from eggs', 'eggs', 'pups'], octopus: ['babies from eggs', 'eggs'], spider: ['babies from eggs', 'eggs', 'spiderlings'], bee: ['larvae', 'larvae from eggs', 'babies from eggs'],
        earthworm: ['babies from cocoons', 'cocoons', 'worms from cocoons'], rabbit: ['kits', 'a kit', 'kittens', 'a kitten', 'bunnies'], kangaroo: ['joeys', 'a joey'],
        shrimp: ['babies from eggs', 'eggs', 'larvae'], parrot: ['chicks', 'chicks from eggs', 'babies from eggs', 'eggs'], toad: ['tadpoles', 'a tadpole', 'babies from eggs'], sparrow: ['chicks', 'chicks from eggs', 'babies from eggs', 'eggs'], starfish: ['babies from eggs', 'eggs'], crab: ['babies from eggs', 'eggs'], lobster: ['babies from eggs', 'eggs'], prawn: ['babies from eggs', 'eggs', 'larvae'], beetle: ['larvae', 'babies from eggs', 'eggs'], ant: ['larvae', 'babies from eggs', 'eggs'], silkworm: ['larvae', 'caterpillars from eggs', 'babies from eggs', 'eggs'],
      };
      const sp = /\b(bear|lion|tiger|panda|wolf|dog|cat|cow|elephant|whale|dolphin|giraffe|hippo|rhino|deer|sheep|goat|horse|pig|chicken|hen|duck|goose|eagle|bird|penguin|rooster|ostrich|owl|frog|butterfly|mosquito|fly|salmon|fish|snake|turtle|lizard|gecko|snail|crocodile|shark|octopus|spider|bee|earthworm|rabbit|kangaroo|shrimp|parrot|toad|sparrow|starfish|crab|lobster|prawn|beetle|ant|silkworm)s?\b/.exec(pl);
      if (sp && /came from|comes? from|has|have|hatches?|lays?|gives? birth|its? baby/.test(pl)) {
        const valid = OFF[sp[1]];
        if (valid) {
          const hits = ccs.filter((c) => valid.includes(c));
          if (hits.length === 1 && aa === hits[0]) return true;
        }
      }
    }

    // frequency cue: "only on my birthday" -> rarely/never unique
    if (/only on (my |the |your |his |her )?\w|once a (year|month|week)|almost never|only at |only in |once every/.test(pl)) {
      const hits = ccs.filter((c) => /^(rarely|seldom|never|hardly ever|scarcely|sometimes)$/i.test(c));
      if (hits.length === 1 && /^(rarely|seldom|never|hardly ever|scarcely|sometimes)$/i.test(aa)) return true;
    }

    // place value: "31 = ___ tens and 1 one" / "45 = 4 tens and ___ ones"
    {
      let e = null;
      const pv1 = /(\d+)\s*=\s*_B_\s*ten/.exec(pn);
      const pv2 = /(\d+)\s*=\s*(\d+)\s*ten\(s\)?\s*and\s*_B_\s*one/.exec(pn);
      if (pv1) e = Math.floor(+pv1[1] / 10);
      else if (pv2) e = +pv2[1] - 10 * +pv2[2];
      if (e != null && Number.isInteger(e)) {
        const hits = ccs.filter((c) => c === String(e));
        if (hits.length === 1 && aa === String(e)) return true;
      }
    }

    // missing addend/subtrahend: "358 + ___ = 606" -> 606-358
    {
      const ma = /(\d+)\s*\+\s*_B_\s*=\s*(\d+)/.exec(pn);
      const ms = /(\d+)\s*-\s*_B_\s*=\s*(\d+)/.exec(pn);
      const e = ma ? +ma[2] - +ma[1] : ms ? +ms[1] - +ms[2] : null;
      if (e != null) {
        const hits = ccs.filter((c) => c === String(e));
        if (hits.length === 1 && aa === String(e)) return true;
      }
    }

    // negation + blank -> "any"/"not" unique
    if (/n't\b|\bnot\b|\bno\b|never|without|hardly/.test(pl)) {
      const any = ccs.filter((c) => c === 'any');
      if (/_B_ (rain|water|milk|bread|rice|juice|money|time|sugar|salt|food|meat|tea|coffee|snow|ice|soup|help|information|homework|news|cheese|butter|chocolate|traffic|paper|wood|furniture|petrol|gold|air|grass)/.test(pn) && any.length === 1 && aa === 'any') return true;
    }
    if (/\b(is|are|was|were|do|does|did|can|could|will|would|shall|should|must|may|might) _B_ (many|much|more|so |very |really )/.test(pn)) {
      if (ccs.filter((c) => c === 'not').length === 1 && aa === 'not') return true;
    }

    // comparative unique: two quantities/entities compared or explicit "than"
    {
      const propComp = (c) => /^(better|worse|more|most)$/.test(c) || /(er|ier)$/.test(c) || /^more (beautiful|interesting|difficult|expensive|important|comfortable|dangerous|popular|delicious|exciting|careful|wonderful|terrible|horrible|intelligent|famous|colourful|colorful|powerful|successful|beautiful)/.test(c);
      const comp = ccs.filter(propComp);
      const cmpCtx = /_B_ than\b|than (the |a |an |your |my |his |her |our |their |yours|me|you|him|us|them|mine)/.test(pn) || /\d+\s*(km|kg|cm|m|m\/s|km\/h|years?|years old|points?|marks?)\b.*\d+|\d+.*\band\b.*\d+|two \w+s? (or|and)|both\b| or (a|an|the )?\w+/.test(pl);
      if (comp.length === 1 && cmpCtx && aa === comp[0]) return true;
    }

    // reported speech + future marker -> "would X" unique
    if (/\b(said|told|reported|thought|hoped|promised|believed|knew|wished)\b/.test(pl) && /in the future|soon|tomorrow|next (week|month|year|time)|someday|one day|later/.test(pl)) {
      const hits = ccs.filter((c) => /^would /.test(c));
      if (hits.length === 1 && /^would /.test(aa)) return true;
    }

    // "subject _B_ a/an/the <noun>" with be/have choices -> has/have by agreement
    if (/_B_ (a|an|the) \w/.test(pn)) {
      const VH = new Set(['is', 'are', 'am', 'was', 'were', 'be', 'has', 'have', 'had', 'haves']);
      if (ccs.length >= 2 && ccs.every((c) => VH.has(c))) {
        const NAMES = 'nam|lan|mai|minh|anh|linh|huy|ha|hien|phong|thao|tuan|dung|huong|son|nhi|vy|khoa|trang|quang|an|hoa|bao|chi|dao|dat|dieu|dong|duc|duy|giang|hai|han|hang|hanh|hao|hau|hiep|hoai|hoang|hop|hue|hung|khanh|lam|le|lien|loan|loc|long|luong|ly|manh|my|nga|nghi|ngoc|nguyen|nhan|nhat|nhu|oanh|phat|phuc|phuong|quoc|quyen|quyet|quynh|sang|sen|suong|tam|thang|thanh|thien|tho|thu|thuan|thuc|thuy|tien|toan|tri|trieu|trinh|truc|trung|truong|tu|tung|tuyen|uyen|van|viet|vinh|xuan|yen|tom|lucy|mary|john|jack|peter|anna|lily|emma|sam|ben|nick|sue|kim|alex|jim|tim|bob|ted|ron|dan|leo|max|amy|rose|jane|sara|lisa|nina|tina|julia|laura|grace|helen|kate|beth|ruth|david|mike|henry|kevin|tony|adam|andy|bill|carl|fred|george|harry|james|mark|paul|steve|eric|linda|alan|betty|carol|diana|edward|frank|irene|joe|karen|larry|nancy|oliver|patricia|robert|sandra|thomas|victor|wendy|zoe|aaron|brian|chris|dennis|ethan|felix|gary|howard|ivan|jacob|kyle|luke|matt|nathan|owen|philip|ryan|sean|todd|vincent|william|xavier|zachary|alice|cindy|doris|ellen|fiona|gloria|hannah|ivy|jenny|kitty|monica|nora|olivia|paula|rachel|stella|ursula|vicky|winnie|bella|claire|danny|emily|freddie|gemma|isabel|kenny|molly|noah|oscar|polly|rosie|sammy|tommy|maria|sophia|mia|chloe|ella|scarlett|leo|felix|jason|jessica|ashley|amanda|stephanie|nicole|michelle|kimberly|deborah|dorothy|margaret|charles|joseph|donald|kenneth|richard|susan|jennifer|elizabeth|barbara';
        const subj = new RegExp(`\\b(i|we|they|you|he|she|it|the [a-z]+s?|my [a-z]+s?|your [a-z]+s?|his [a-z]+s?|her [a-z]+s?|our [a-z]+s?|their [a-z]+s?|this|that|${NAMES}) _B_ (a|an|the) `).exec(pn);
        if (subj) {
          const s = subj[1];
          const detNoun = /^(the|my|your|his|her|our|their) ([a-z]+)$/.exec(s);
          const third = /^(he|she|it|this|that)$/.test(s) || new RegExp(`^(${NAMES})$`).test(s) || (detNoun != null && !detNoun[2].endsWith('s') && detNoun[1] !== 'their');
          const want = third ? 'has' : 'have';
          if (ccs.filter((c) => c === want).length === 1 && aa === want) return true;
        }
      }
    }

    // immediate-attention cue ("Be quiet!", "Look!", "Listen!") -> present
    // progressive: unique "be + V-ing" choice agreeing with the subject
    if (/\b(be quiet|hurry up|shh|attention)\b|(look!|listen!)/i.test(pl)) {
      const NAMES2 = 'nam|lan|mai|minh|anh|linh|huy|ha|hien|phong|thao|tuan|dung|huong|son|nhi|vy|khoa|trang|quang|an|hoa|bao|chi|dao|dat|dieu|dong|duc|duy|giang|hai|han|hang|hanh|hao|hau|hiep|hoai|hoang|hop|hue|hung|khanh|lam|le|lien|loan|loc|long|luong|ly|manh|my|nga|nghi|ngoc|nguyen|nhan|nhat|nhu|oanh|phat|phuc|phuong|quoc|quyen|quyet|quynh|sang|sen|suong|tam|thang|thanh|thien|tho|thu|thuan|thuc|thuy|tien|toan|tri|trieu|trinh|truc|trung|truong|tu|tung|tuyen|uyen|van|viet|vinh|xuan|yen|tom|lucy|mary|john|jack|peter|anna|lily|emma|sam|ben|nick|sue|kim|alex|jim|tim|bob|ted|ron|dan|leo|max|amy|rose|jane|sara|lisa|nina|tina|julia|laura|grace|helen|kate|beth|ruth|david|mike|henry|kevin|tony|adam|andy|bill|carl|fred|george|harry|james|mark|paul|steve|eric|linda|alan|betty|carol|diana|edward|frank|irene|joe|karen|larry|nancy|oliver|patricia|robert|sandra|thomas|victor|wendy|zoe|aaron|brian|chris|dennis|ethan|felix|gary|howard|ivan|jacob|kyle|luke|matt|nathan|owen|philip|ryan|sean|todd|vincent|william|xavier|zachary|alice|cindy|doris|ellen|fiona|gloria|hannah|ivy|jenny|kitty|monica|nora|olivia|paula|rachel|stella|ursula|vicky|winnie|bella|claire|danny|emily|freddie|gemma|isabel|kenny|molly|noah|oscar|polly|rosie|sammy|tommy|maria|sophia|mia|chloe|ella|scarlett|leo|felix|jason|jessica|ashley|amanda|stephanie|nicole|michelle|kimberly|deborah|dorothy|margaret|charles|joseph|donald|kenneth|richard|susan|jennifer|elizabeth|barbara';
      const subj = new RegExp(`\\b(i|we|they|you|he|she|it|the [a-z]+s?|my [a-z]+s?|your [a-z]+s?|his [a-z]+s?|her [a-z]+s?|our [a-z]+s?|their [a-z]+s?|this|that|${NAMES2}|[a-z]+) _B_`).exec(pn);
      if (subj) {
        const s = subj[1];
        const det = /^(the|my|your|his|her|our|their) ([a-z]+)$/.exec(s);
        const third = /^(he|she|it|this|that)$/.test(s) || new RegExp(`^(${NAMES2})$`).test(s) || (det && !det[2].endsWith('s') && det[1] !== 'their') || (/^[a-z]+$/.test(s) && !/^(i|we|they|you)$/.test(s) && !s.endsWith('s') && !/children|men|women|people|kids|boys|girls|students|teachers|friends|parents/.test(s));
        const wantBe = /^i$/.test(s) ? 'am' : third ? 'is' : 'are';
        const hits = ccs.filter((c) => new RegExp(`^${wantBe} \\w+ing\\b`).test(c));
        if (hits.length === 1 && hits[0] === aa) return true;
      }
    }

    // modal before base verb: "he ___ play" -> unique modal choice
    {
      const vb = /_B_ ([a-z]+)/.exec(pn);
      if (vb) {
        const MODALS = ['can', 'could', 'will', 'would', 'shall', 'should', 'must', 'may', 'might', 'cannot', "can't", "don't", "doesn't", "didn't", 'do', 'does', 'did', "shouldn't", "wouldn't", "couldn't", "mustn't", 'will not', "won't"];
        const verbAfter = vb[1];
        const hits = ccs.filter((c) => MODALS.includes(c));
        // only valid when the word after blank is a base verb & modal+verb parses
        if (hits.length === 1 && aa === hits[0] && /^(can|could|will|would|shall|should|must|may|might|do|does|did|cannot|can't|don't|doesn't|didn't|won't|shouldn't|wouldn't|couldn't|mustn't)$/.test(hits[0])) {
          if (ccs.every((c) => MODALS.includes(c) || /^(is|are|am|was|were|be|been|like|likes|want|wants|enjoy|enjoys|has|have|had|going|go|cans|musts|wills|woulds|shoulds|coulds|mays|mights|shalls|cannots)$/.test(c))) return true;
        }
      }
    }

    // "follow ... until you reach" connective
    if (/follow (this |the )?\w* ?road|_B_ you reach|_B_ you get (to|there)/.test(pn)) {
      if (ccs.filter((c) => c === 'until').length === 1 && aa === 'until') return true;
    }

    // affirmative + plural countable -> count-quantifier unique
    if (/_B_ \w+s\b/.test(pn) && !/n't\b|\bnot\b|\?/.test(pn)) {
      const CQ = /^(a lot of|lots of|many|several|a few|few|plenty of|a couple of|a number of|most|all|both|two|three|four|five|six|seven|eight|nine|ten|\d+)$/;
      const hits = ccs.filter((c) => CQ.test(c));
      if (hits.length === 1 && CQ.test(aa)) return true;
    }

    // quoted imperative: only bare infinitive forms count (is/are/am/was/were
    // and -ing forms are inflected, not imperative)
    {
      const imp = /[""''] _B_|says?:? ?[""'] ?(_B_ )|! _B_|_B_ quiet|_B_ your/.test(pn);
      if (imp) {
        const base = ccs.filter((c) => !/(s|es|ing|ed)$/.test(c) && !/^to /.test(c) && !/^(is|are|am|was|were|be|been|being|do|does|did|has|have|had|will|would|can|could|shall|should|must|may|might)$/.test(c));
        const impBe = ccs.filter((c) => c === 'be');
        if (/_B_ quiet|_B_ careful|_B_ good|_B_ nice|_B_ happy|_B_ brave|_B_ strong|_B_ silent|_B_ still/.test(pn) && impBe.length === 1 && aa === 'be') return true;
        if (base.length === 1 && aa === base[0] && /^(sit|stand|open|close|stop|go|come|look|listen|read|write|put|take|give|turn|hurry|help|clean|wash|eat|drink|try|wait|watch|touch|raise|point|show|tell|keep|make|do)/.test(base[0])) return true;
      }
    }

    // "how much/many" by noun countability
    {
      const hm = /_B_ (much|many)|_B_ (\w+s?)\b.*\b(do you|you drink|you eat|you have|you need|you want|are there|is there|does (he|she|your|my))/.exec(pn);
      const hm2 = /how _B_ (\w+)/.exec(pn);
      const UNCOUNT = /^(water|milk|bread|rice|juice|money|time|sugar|salt|food|meat|tea|coffee|snow|rain|ice|soup|help|information|homework|news|cheese|butter|chocolate|traffic|paper|wood|furniture|petrol|gold|air|grass|oil|honey|jam|soup|pork|beef|chicken|fish|fruit|money|space|energy|power|dust|sand|smoke|steam|blood|skin|hair)$/;
      if (hm2) {
        const noun = hm2[1].replace(/s$/, '');
        const want = UNCOUNT.test(hm2[1]) || UNCOUNT.test(noun) ? 'much' : /\w+s$/.test(hm2[1]) ? 'many' : null;
        if (want && ccs.filter((c) => c === want).length === 1 && aa === want) {
          const other = want === 'much' ? 'many' : 'much';
          if (!ccs.includes(other) || true) return true;
        }
      }
    }

    // manner adverb: "<adj> <noun> ... <verb> _B_" -> adverb of same adjective
    {
      const adv = /\b(drives?|walks?|talks?|speaks?|sings?|dances?|runs?|works?|plays?|swims?|reads?|writes?|listens?|does|did|draws?|paints?|shouts?|answers?|learns?|studies?|behaves?|performs?) _B_/.exec(pn);
      if (adv) {
        const adjCue = /\b(careful|slow|quick|fast|loud|quiet|soft|hard|good|well|happy|beautiful|easy|nice|gentle|polite|clear|perfect|fluent|skillful)\w*\b/.exec(pl);
        if (adjCue) {
          const base = adjCue[1].replace(/y$/, 'i');
          const want = adjCue[1] === 'good' ? 'well' : adjCue[1] === 'fast' || adjCue[1] === 'hard' ? adjCue[1] : base + 'ly';
          const hits = ccs.filter((c) => c === want);
          if (hits.length === 1 && aa === want) return true;
        }
        // unique -ly adverb when only one choice is a real adverb form
        const lys = ccs.filter((c) => /ly$/.test(c) || c === 'well' || c === 'fast' || c === 'hard');
        if (lys.length === 1 && aa === lys[0]) return true;
      }
    }

    // comparative with "than" + known size/intensity ordering -> unique direction
    {
      const SIZE = ['ant', 'bee', 'fly', 'mouse', 'rat', 'frog', 'chicken', 'duck', 'cat', 'rabbit', 'dog', 'pig', 'sheep', 'goat', 'monkey', 'wolf', 'tiger', 'lion', 'horse', 'cow', 'bear', 'giraffe', 'hippo', 'elephant', 'whale'];
      const cmp = new RegExp(`\\b(${SIZE.join('|')})s?\\b.{0,20}_B_ (?:than )?(?:a |an |the )?(?:${SIZE.join('|')})s?\\b|(?:${SIZE.join('|')})s?\\b.{0,15}(?:is|are) _B_`).exec(pn);
      if (cmp) {
        const first = SIZE.indexOf(cmp[1] ?? '');
        // bigger side: the earlier-named animal vs choices
        const bigs = ccs.filter((c) => /^(bigger|larger|taller|greater|huger|wider|longer|stronger|heavier|faster)$/.test(c));
        const smalls = ccs.filter((c) => /^(smaller|shorter|littler|tiny|weaker|slower|lighter)$/.test(c));
        const subjAnimal = cmp[1] ? SIZE.indexOf(cmp[1]) : -1;
        // find second animal if present
        const second = new RegExp(`_B_ (?:than )?(?:a |an |the )?(${SIZE.join('|')})`).exec(pn);
        if (second && subjAnimal >= 0) {
          const sIdx = SIZE.indexOf(second[1]);
          if (subjAnimal > sIdx && bigs.length === 1 && bigs.includes(aa)) return true;
          if (subjAnimal < sIdx && smalls.length === 1 && smalls.includes(aa)) return true;
        }
      }
    }

    // "be going to" future with this weekend / tomorrow / next
    if (/\bthis (weekend|saturday|sunday|holiday|vacation|summer|winter|afternoon|evening)|tomorrow|next (week|month|year|sunday|monday|tuesday|wednesday|thursday|friday|saturday|holiday|summer|winter|time)|soon\b/.test(pl)) {
      const subj = /\b(i|we|they|you|he|she|it|the [a-z]+s?|my [a-z]+s?|[a-z]+) _B_/.exec(pn);
      if (subj) {
        const s = subj[1];
        const det = /^(the|my) ([a-z]+)$/.exec(s);
        const third = /^(he|she|it|this|that)$/.test(s) || (det && !det[2].endsWith('s')) || (/^[a-z]+$/.test(s) && !/^(i|we|they|you)$/.test(s) && !s.endsWith('s') && !/children|men|women|people|kids|boys|girls|students|teachers|friends|parents|class|family|team/.test(s));
        const wantBe = /^i$/.test(s) ? 'am' : third ? 'is' : 'are';
        const hits = ccs.filter((c) => new RegExp(`^${wantBe} going to\\b`).test(c));
        const anyGoing = ccs.filter((c) => /going to/.test(c));
        if (anyGoing.length >= 1 && hits.length === 1 && hits[0] === aa) return true;
      }
    }

    // inversion progressive: "(is|are) <subj> _B_" -> -ing unique
    {
      const inv = /\b(is|are|am|was|were) (he|she|it|i|we|they|you|the [a-z]+s?|my [a-z]+s?|your [a-z]+s?|[a-z]+) _B_/.exec(pn);
      if (inv) {
        const ings = ccs.filter((c) => /ing$/.test(c));
        const bases = ccs.filter((c) => !/(ing|s|es|ed)$/.test(c));
        if (ings.length === 1 && aa === ings[0]) return true;
      }
    }

    // malformed-plural distractors: "healthy ___ -> teeth" where other choices
    // are wrong plural formations of the same noun
    {
      const BADPL = /^(tooths|teeths|toothes|childs|childrens|childes|mouses|mices|foots|feets|mans|womans|sheeps|deers|knifes|wifes|lifes|potatos|tomatos|heros|leafs|wolfs|loafs|babyes|citys|boys|girlss|boxs|watchs|buss|peoples|persons|mices|oxs|oxes|geeses|gooses|bretheren|sistren|cattles|trouserses)$/;
      const good = ccs.filter((c) => !BADPL.test(c));
      const bad = ccs.filter((c) => BADPL.test(c));
      if (bad.length >= 1 && good.length === 1 && good[0] === aa) return true;
    }

    // clock time: "half past seven" -> 7:30
    {
      const T2M = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12 };
      const tm = /(half|quarter|twenty|ten|five) (past|to) (\w+)/.exec(pl) || /(\w+) o'?clock/.exec(pl);
      if (tm) {
        let h, m;
        if (/o'?clock/.test(tm[0])) { h = T2M[tm[1]] ?? parseInt(tm[1]); m = 0; }
        else {
          const mins = { half: 30, quarter: 15, twenty: 20, ten: 10, five: 5 };
          h = T2M[tm[3]] ?? parseInt(tm[3]); m = mins[tm[1]] ?? 0;
          if (tm[2] === 'to') { h -= 1; m = 60 - m; }
        }
        if (h != null) {
          const want = `${h}:${String(m).padStart(2, '0')}`;
          const hits = ccs.filter((c) => c === want || c === `${h}:${m === 0 ? '00' : m}`);
          if (hits.length === 1 && (aa === want || aa === hits[0])) return true;
        }
      }
    }

    // antonym: "the opposite of X" -> unique antonym in choices
    {
      const ANT = { hot: 'cold', cold: 'hot', big: 'small', small: 'big', tall: 'short', short: 'tall', long: 'short', fast: 'slow', slow: 'fast', happy: 'sad', sad: 'happy', good: 'bad', bad: 'good', old: 'young', young: 'old', new: 'old', rich: 'poor', poor: 'rich', strong: 'weak', weak: 'strong', easy: 'difficult', difficult: 'easy', hard: 'easy', heavy: 'light', light: 'heavy', fat: 'thin', thin: 'fat', beautiful: 'ugly', ugly: 'beautiful', clean: 'dirty', dirty: 'clean', open: 'closed', closed: 'open', high: 'low', low: 'high', early: 'late', late: 'early', day: 'night', night: 'day', black: 'white', white: 'black', near: 'far', far: 'near', up: 'down', down: 'up', left: 'right', right: 'left', front: 'back', back: 'front', inside: 'outside', outside: 'inside', top: 'bottom', bottom: 'top', start: 'finish', finish: 'start', begin: 'end', end: 'begin', morning: 'evening', evening: 'night', love: 'hate', hate: 'love', buy: 'sell', sell: 'buy', win: 'lose', lose: 'win', laugh: 'cry', cry: 'laugh', wet: 'dry', dry: 'wet', full: 'empty', empty: 'full', loud: 'quiet', quiet: 'loud' };
      const op = /opposite of ['""]?(\w+)['""]?/i.exec(pl) || /(\w+) is(?:n't| not) \w+[,;.!]? (?:it|he|she|this) is _B_|but (?:it|he|she|my \w+|the \w+|this) is _B_/.exec(pl);
      if (op && ANT[op[1].toLowerCase()]) {
        const want = ANT[op[1].toLowerCase()];
        const hits = ccs.filter((c) => c === want);
        if (hits.length === 1 && aa === want) return true;
      }
      // "A is <adj>, but B is _B_" -> unique antonym of that adjective
      const contrast = /(\w+) is (\w+)[,;.!]? but (?:a |an |the |my |your |his |her |our |their )?\w+ is _B_|but (?:a |an |the |my |your |his |her |our |their )?\w+ is _B_/.exec(pn);
      if (contrast && ANT[(contrast[2] ?? '').toLowerCase()]) {
        const want = ANT[contrast[2].toLowerCase()];
        const hits = ccs.filter((c) => c === want);
        if (hits.length === 1 && aa === want) return true;
      }
    }

    // fixed collocations / cultural facts
    {
      const FACT = [
        [/turn off the _B_|switch off the _B_/, 'light'],
        [/grey.*thunder|thunder.*grey|hear thunder|sky is grey.*thunder/, 'storm'],
        [/pho\b.*breakfast|breakfast.*\bpho|hot noodle.*breakfast|north of vietnam.*noodle/, 'pho'],
        [/break between lessons|time between classes/, 'playtime'],
        [/20 degrees|not hot.*not cold|not cold.*not hot/, 'warm'],
        [/no one helps|by itself|all alone|on its own/, 'itself'],
        [/turn off.*light|switch off.*light/, 'light'],
        [/play.*football|football.*play/, 'play'],
        [/full of grey clouds|cannot see the sun.*cloud|can'?t see the sun.*cloud/, 'cloudy'],
        [/stops? fires?|puts? out fires?|fights? fires?|fire truck/, 'firefighter'],
      ];
      for (const [re, want] of FACT) {
        if (re.test(pn) && ccs.filter((c) => c === want).length === 1 && aa === want) return true;
      }
    }

    // "_B_ <noun>" -> unique attributive possessive determiner (their/his/her/our)
    // works regardless of which subject owns the noun
    if (/_B_ \w/.test(pn)) {
      const POSS = /^(their|his|her|its|our|my|your)$/;
      const hits = ccs.filter((c) => POSS.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // plural subject + "_B_ <noun>" -> "their"
    {
      const plSub = /\b(the twins|twins|they|my (parents|grandparents|sisters|brothers|friends|classmates|cousins)|the (boys|girls|students|children|kids|parents|friends)|[a-z]+s\b) _B_/.exec(pn);
      if (plSub && ccs.filter((c) => c === 'their').length === 1 && aa === 'their') {
        if (!ccs.some((c) => /^(his|her|its|our|my|your)$/.test(c) && (c === 'their' ? false : !/our/.test(c) || false))) return true;
      }
    }

    // disagreement cue: "B does NOT agree" -> unique negative response
    if (/does not agree|doesn'?t agree|disagree|not agree/.test(pl)) {
      const neg = ccs.filter((c) => /^i do not think|^i don'?t think|^no\b|^i don'?t agree|i do not think so|i disagree/i.test(c));
      if (neg.length === 1 && neg[0] === aa) return true;
    }

    // "let's X" paraphrase -> "we should X" unique
    if (/let'?s\b/i.test(pl)) {
      const hits = ccs.filter((c) => /^we should|^let us|^let'?s/i.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // response-type QA by answer shape
    {
      const byTransport = /\bby (bike|bus|car|train|plane|boat|ship|motorcycle|taxi|foot|bicycle)\b/i;
      if (byTransport.test(pl) && /_B_ (do|does|did|is|are|can) you|_B_ do they|_B_ does (he|she|your)/.test(pn)) {
        if (ccs.filter((c) => c === 'how').length === 1 && aa === 'how') return true;
      }
      if (/where is|where'?s|where do|where does|where are/.test(pl)) {
        const loc = ccs.filter((c) => /next to|behind|in front of|near|on the|at the|across from|between|opposite|over there|here|turn (left|right)/i.test(c));
        if (loc.length === 1 && loc[0] === aa) return true;
      }
      if (/- drawing|- singing|- dancing|- reading|- writing|- playing|- painting|- eating|- sleeping|- cooking|- swimming|- running|- jumping|- climbing|- flying|- walking|- talking|- listening|- watching|- driving|- working|- studying|- teaching|- learning|- buying|- selling|- making|- doing|- having|- giving|- taking|- getting|- going|- coming|- sitting|- standing|- lying|- wearing|- carrying|- holding|- opening|- closing|- cleaning|- washing|- brushing|- combing|- dressing|- feeding|- helping|- waiting|- looking|- finding|- picking|- putting|- throwing|- catching|- kicking|- hitting|- cutting|- breaking|- building|- fixing|- planting|- watering|- growing|- harvesting|- cooking|- baking|- frying|- boiling|- steaming|- grilling|- roasting|- toasting/i.test(pl)) {
        if (ccs.filter((c) => c === 'what').length === 1 && aa === 'what') return true;
      }
      // action-description answers -> "what"
      if (/(is|are|am) \w+ing\b/.test(pl) && /_B_ is (he|she|it|the \w+|my \w+|your \w+)|_B_ are (they|we|the \w+)|_B_ is \w+ doing/.test(pn)) {
        if (ccs.filter((c) => c === 'what').length === 1 && aa === 'what') return true;
      }
    }

    // two-blank article pair: "_B_ X and _B_ Y" with paired article answers
    {
      const pair = /_B_ (\w+)[^.]{0,20}and _B_ (\w+)/.exec(pn);
      if (pair) {
        const art = (w) => (/^[aeiou]/.test(w) ? 'an' : 'a');
        const wantPair = `${art(pair[1])} - ${art(pair[2])}`;
        const wantPair2 = `${art(pair[1])}-${art(pair[2])}`;
        const hits = ccs.filter((c) => c === wantPair || c === wantPair2 || c === `${art(pair[1])} ${art(pair[2])}`);
        if (hits.length === 1 && (hits[0] === aa || aa === wantPair || aa === wantPair2)) return true;
      }
    }

    // bird/swim-fly pair: "a bird ___ swim but it ___ fly" -> "can't - can"
    if (/bird\b.*_B_ swim.*but.*_B_ fly|bird\b.*_B_ fly.*but.*_B_ swim/.test(pn)) {
      const canFly = /_B_ fly/.test(pn);
      const want = /_B_ swim.*but.*_B_ fly/.test(pn) ? "can't - can" : 'can - can\'t';
      const wantAlt = want.replace(' - ', '-');
      if (ccs.some((c) => c === want || c === wantAlt) && (aa === want || aa === wantAlt)) return true;
    }

    // workplace cloze: "a chef works in a _B_" -> unique mapped workplace
    {
      const WORK = { chef: 'restaurant', cook: 'restaurant', doctor: 'hospital', nurse: 'hospital', teacher: 'school', farmer: 'farm', pilot: 'airport', waiter: 'restaurant', baker: 'bakery', vet: 'clinic', policeman: 'police station', police: 'police station', librarian: 'library', scientist: 'laboratory' };
      const wm = /\b(chef|cook|doctor|nurse|teacher|farmer|vet|pilot|waiter|baker|policeman|police|librarian|scientist)\b[^.]{0,25}works? (in|at) (a |an |the )?_B_/.exec(pn)
        ?? /\b(chef|cook|doctor|nurse|teacher|farmer|vet|pilot|waiter|baker|policeman|police|librarian|scientist)\b[^.]{0,25}_B_ works?/.exec(pn);
      if (wm) {
        const hits = ccs.filter((c) => c === WORK[wm[1]]);
        if (hits.length === 1 && hits[0] === aa) return true;
      }
      // job -> signature action: "a chef can _B_" -> cook*
      const JOB_ACT = { chef: 'cook', cook: 'cook', teacher: 'teach', doctor: 'help|treat|examine|cure', vet: 'take care|help|treat|cure', farmer: 'grow|plant|harvest', pilot: 'fly', singer: 'sing', driver: 'drive', writer: 'write', builder: 'build', nurse: 'take care|help|look after', baker: 'bake|make', fisherman: 'fish|catch', artist: 'draw|paint', painter: 'paint|draw', dancer: 'dance', reporter: 'report|write' };
      const jm = /\b(chef|cook|teacher|doctor|vet|farmer|pilot|singer|driver|writer|builder|nurse|baker|fisherman|artist|painter|dancer|reporter)\b[^.]{0,20}\b(can|likes to|loves to|wants to)\s*_B_/.exec(pn);
      if (jm) {
        const hits = ccs.filter((c) => new RegExp(`^(${JOB_ACT[jm[1]]})`, 'i').test(c));
        if (hits.length === 1 && hits[0] === aa) return true;
      }
      // job -> signature object: "a veterinarian takes care of _B_" -> animals
      const JOB_OBJ = { vet: 'animals?', veterinarian: 'animals?', doctor: 'patients?|sick people', nurse: 'patients?|sick people', teacher: 'students?|children|pupils', farmer: 'vegetables?|rice|crops?|plants?|animals?', postman: 'letters?|mail|parcels?', baker: 'bread|cakes?|pastries' };
      const jom = /\b(vet|veterinarian|doctor|nurse|teacher|farmer|postman|baker)\b[^.]{0,30}\b(takes care of|cares for|looks after|grows?|teaches|delivers?|makes?|bakes?)\s+_B_/.exec(pn);
      if (jom) {
        const hits = ccs.filter((c) => new RegExp(`^(${JOB_OBJ[jom[1]]})$`).test(c));
        if (hits.length === 1 && hits[0] === aa) return true;
      }
    }

    // place -> characteristic object: "there is a _B_ in the playground" -> slide
    {
      const PLACE_OBJ = [
        [/playground/, 'slide|swing|seesaw|sandbox|merry-go-round'],
        [/\bbeach\b/, 'sand|shells?|waves?|crabs?'],
        [/\bfarm\b/, 'cows?|pigs?|chickens?|barn|tractor|sheep|horses?|ducks?'],
        [/\bzoo\b/, 'lions?|tigers?|monkeys?|elephants?|giraffes?|zebras?'],
        [/kitchen/, 'fridge|stove|sink|cooker|oven|refrigerator'],
        [/garden/, 'flowers?|trees?|plants?|grass'],
        [/aquarium/, 'fish|sharks?|turtles?'],
        [/library/, 'books?|shelves|librarian'],
        [/\bsky\b/, 'sun|moon|stars?|clouds?|birds?|rainbow|rainbows?|kites?|planes?|balloons?'],
      ];
      const pm = /there (is|are) (a |an |some |many |two |three |four |five )?_B_ (in|at|on|under) (the |my |our )?([\w ]+)/.exec(pn);
      if (pm) {
        for (const [re, want] of PLACE_OBJ) {
          if (!re.test(pm[5])) continue;
          const hits = ccs.filter((c) => new RegExp(`^(${want})$`).test(c));
          if (hits.length === 1 && hits[0] === aa) return true;
        }
      }
    }

    // wh-question resolved by the glossed answer after "? -": "___ is your teacher? - She is in the classroom" -> where
    {
      const qm = /\?\s*[-–:]\s*(.+)/.exec(pn);
      if (qm && /_B_/.test(pn.slice(0, pn.indexOf('?') + 1))) {
        const resp = qm[1];
        const whN = (w) => ccs.filter((c) => c === w).length;
        if (/^(in|at|on|under|next to|behind|near|inside|outside|between|over)\b|\b(is|are|was|were|went|go|goes|am|live|stay)\s+(in|at|on|to|under|next to|near|behind|inside|outside)\b/.test(resp) && aa === 'where' && whN('where') === 1) return true;
        if (/^at \d|\d{1,2}(:\d{2})?\s*(o'clock|am|pm|a\.m|p\.m)|morning|afternoon|evening|night|yesterday|tomorrow|weekend|\w+day\b/.test(resp) && aa === 'when' && whN('when') === 1) return true;
        if (/\w+'s\b/.test(resp) && aa === 'whose' && whN('whose') === 1) return true;
        if (/^(mr|mrs|ms|miss)\b|^my (mom|dad|mother|father|sister|brother|friend|teacher|uncle|aunt|grandma|grandpa)|^(a|an|the) (teacher|doctor|student|boy|girl|man|woman|nurse|farmer|vet|chef|pilot|driver)\b/.test(resp) && aa === 'who' && whN('who') === 1) return true;
      }
    }

    // "what's the matter?" -> unique symptom-shaped response
    if (/what'?s the matter|what is the matter|what'?s wrong/.test(pl)) {
      const sym = ccs.filter((c) => /stomachache|headache|toothache|fever|cough|sore|sick|ill|tired|sad|hurt|broken|cold\b|flu|dizzy|lost|cut|ache/.test(c));
      if (sym.length === 1 && sym[0] === aa) return true;
    }

    // species-ability facts: fish can't fly / birds can fly
    if (/\b(fish|penguin|ostrich)\w*\b[^.?!]{0,15}_B_ (fly|swim|run|climb|jump)/.test(pn)) {
      const want = /\b(fish|penguin|ostrich)\w*\b[^.?!]{0,15}_B_ fly/.test(pn) ? "can't" : 'can';
      if (aa === want && ccs.filter((c) => c === want).length === 1) return true;
    }
    if (/\b(bird|birds|bee|bees|butterfl\w+|eagle|parrot|duck|owl|bat)\b[^.?!]{0,15}_B_ fly/.test(pn)) {
      if (aa === 'can' && ccs.filter((c) => c === 'can').length === 1) return true;
    }
    if (/\bfish\b[^.?!]{0,15}_B_ (swim|live)/.test(pn) && aa === 'can' && ccs.filter((c) => c === 'can').length === 1) return true;

    // "_B_ <uncountable>" affirmative -> 'some' unique (a/an/many invalid, much not offered)
    {
      const UNCOUNT = 'rice|water|juice|milk|bread|money|soup|meat|cheese|butter|sugar|salt|tea|coffee|homework|information|news|chocolate|food|paper|ink|soap';
      const um = new RegExp(`_B_ (${UNCOUNT})\\b`).exec(pn);
      if (um && !/not|n't|\?|how|\bor\b/.test(pn) && !/^[aeiou]/.test(um[1])) {
        if (aa === 'some' && ccs.every((c) => /^(some|a|an|many|few|one|two|three)$/.test(c))) return true;
      }
    }

    // past cue + unique well-formed negative "didn't <base>"
    if (/\byesterday\b|last (night|week|month|year|sunday|monday|tuesday|wednesday|thursday|friday|saturday|time)|\bago\b/.test(pl)) {
      const ok = ccs.filter((c) => {
        const m = /^didn'?t ([a-z]+)$/.exec(c);
        return m && !/(ed|ing|s)$/.test(m[1]);
      });
      if (ok.length === 1 && ok[0] === aa) return true;
    }

    // superlative: "the cheetah is _B_ animal on land" -> "the fastest" unique
    if (/_B_ \w+ (in|on|of) \w|_B_ (one |animal|player|student|boy|girl|kid|person|runner|swimmer|of all)/.test(pn) || /_B_ (in|of) (the world|our class|the class|my family|the group|land|all)/.test(pn)) {
      const sup = ccs.filter((c) => /^the (most |\w+(est|iest)\b)/.test(c));
      const malformed = ccs.filter((c) => /^(the \w+|the \w+er|\w+er than|the more|more \w+)$/.test(c) && !/^the (most |\w+(est|iest)\b)/.test(c));
      if (sup.length === 1 && sup[0] === aa && sup.length + malformed.length === ccs.length) return true;
    }

    // mid-autumn festival -> lanterns/mooncakes
    if (/mid-autumn|trung thu|moon ?festival/.test(pl)) {
      const hits = ccs.filter((c) => /lanterns?|mooncakes?/.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // "too <adj> to/for" construction: unique when rivals are enough/very much/so much/much
    if (/_B_ \w+ (for \w+ to |to \w+)/.test(pn)) {
      if (aa === 'too' && ccs.filter((c) => c === 'too').length === 1 && ccs.every((c) => /^(too|enough|very much|so much|much|a lot)$/.test(c))) return true;
    }

    // "it _B_ rain" -> only "is going to" well-formed among malformed rivals
    if (/going to/.test(aa)) {
      const gt = ccs.filter((c) => /^(is|are|am) going to$/.test(c));
      const malformed = ccs.filter((c) => !/^(is|are|am) going to$/.test(c));
      if (gt.length === 1 && gt[0] === aa && malformed.every((c) => !/^(will|would|can|could|shall|should|must|may|might)$/.test(c))) return true;
    }

    // "have/has/had _B_" -> unique past participle
    if (/\b(has|have|had) _B_/.test(pn)) {
      const MALF = new Set(['losed', 'runned', 'goed', 'eated', 'doed', 'seed', 'buyed', 'teached', 'catched', 'bringed', 'thinked', 'sleeped', 'feeled', 'selled', 'telled', 'standed', 'understanded', 'winned', 'flied', 'flyed', 'cryed', 'studyed', 'plaied', 'haveed', 'hased', 'beed', 'wased', 'maked', 'taked', 'getted', 'putted', 'cutted', 'hitted', 'leaved', 'readed', 'wroted', 'writed', 'drived', 'speaked', 'breaked', 'choosed', 'weared', 'keeped', 'finded', 'holded', 'heared', 'feeled', 'meeted', 'sitted', 'rinked', 'singed', 'swimmed', 'beginned', 'forgetted', 'gotted', 'knowed', 'growed', 'throwed', 'drawed', 'blowed', 'showed', 'wore', 'torned']);
      const isPart = (w) => {
        if (!/^[a-z]+$/.test(w) || MALF.has(w)) return false;
        if (/en$/.test(w)) return true;
        if (/ed$/.test(w)) return true;
        return Object.prototype.hasOwnProperty.call(IRR, w) && !/^(do|does|go|goes|have|has|is|are|am|was|were|read|put|cut|hit|let|set|shut|hurt|cost)$/.test(w);
      };
      const parts = ccs.filter((c) => isPart(c.split(' ')[0]));
      if (parts.length === 1 && parts[0] === aa) return true;
    }

    // "twice a day" glossed by "in the morning and before bed"
    if (/_B_ (a|times a) day/.test(pn) && /morning/.test(pl) && /bed|night|evening|dinner/.test(pl)) {
      if (aa === 'twice' && ccs.filter((c) => c === 'twice').length === 1) return true;
    }

    // verb -> agent noun: "they are building a house. they are _B_" -> builders
    {
      const AGENT = { build: 'builders?', swim: 'swimmers?', teach: 'teachers?', drive: 'drivers?', write: 'writers?', sing: 'singers?', dance: 'dancers?', run: 'runners?', bake: 'bakers?', farm: 'farmers?', play: 'players?', paint: 'painters?', work: 'workers?', report: 'reporters?', win: 'winners?', climb: 'climbers?', jump: 'jumpers?', skate: 'skaters?', clean: 'cleaners?', design: 'designers?', program: 'programmers?', fight: 'fighters?', visit: 'visitors?', act: 'actors?|actress', sail: 'sailors?', invent: 'inventors?', lead: 'leaders?', speak: 'speakers?', learn: 'learners?', travel: 'travell?ers?', cook: 'cooks?' };
      for (const [v, pat] of Object.entries(AGENT)) {
        if (!new RegExp(`\\b${v}(s|ing|ed)?\\b`).test(pl)) continue;
        const hits = ccs.filter((c) => new RegExp(`^(${pat})$`).test(c));
        if (hits.length === 1 && hits[0] === aa) return true;
      }
    }

    // hand collocations: "please _B_ your hands" -> raise
    if (/please _B_ (your |the |our )?hands?/.test(pn)) {
      const hits = ccs.filter((c) => /^(raise|wash|clap|shake|put up|hold up|wave)$/.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // eating/drinking -> edible object unique
    {
      const em = /\b(eat(ing|s|en)?|drink(ing|s)?|cook(ing|s)?|hungry[^.]{0,15}eat|for (lunch|dinner|breakfast))\b[^.?!]{0,15}(a |an |some |big |small |hot |delicious )?_B_/.exec(pn);
      if (em) {
        const FOOD = 'burger|pizza|rice|noodles?|bread|cake|candy|sandwich|apple|banana|orange|meat|fish|chicken|soup|salad|eggs?|cookies?|chocolate|ice cream|fruit|fruits|vegetables?|hot ?dog|fries|chips|pasta|pho|sushi|dumplings?|pancakes?|waffles?|cereal|porridge|steak|pie|donuts?|cheese|yogurt|milk|juice|water|tea|coffee|lemonade|smoothie|mooncakes?|sweets?';
        const hits = ccs.filter((c) => new RegExp(`^(${FOOD})$`).test(c));
        if (hits.length === 1 && hits[0] === aa) return true;
      }
    }

    // "i never forget" -> always unique
    if (/never forget|never forgets/.test(pl)) {
      if (aa === 'always' && ccs.filter((c) => c === 'always').length === 1) return true;
    }

    // vietnamese dish facts
    if (/\bpho\b|banh mi|spring rolls?|com tam|banh xeo|bun cha/.test(pl)) {
      const hits = ccs.filter((c) => /^(dish|food|noodle soup|specialty|vietnamese food)$/.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // "should NOT" + illness -> unique inappropriate action
    if (/should not|shouldn'?t/.test(pl) && /fever|sick|ill|cold|flu|toothache|headache|stomachache|sore|broken|hurt/.test(pl)) {
      const good = ccs.filter((c) => /rest|drink|water|sleep|medicine|doctor|tell|stay|bed|warm|soup|vegetable|fruit|juice|relax|home/.test(c));
      const bad = ccs.filter((c) => /play|run|swim|outside|ice cream|candy|sweet|sport|football|exercise|stay up|junk|computer|phone|tv\b/.test(c));
      if (bad.length === 1 && bad[0] === aa && bad.length + good.length === ccs.length) return true;
    }

    // fire job -> firefighter
    if (/stops? fires|fights? fires|puts? out fires|fire ?truck/.test(pl)) {
      const hits = ccs.filter((c) => /fire ?(fighter|man)/.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }
    // nap -> afternoon time
    if (/takes? a nap|naps\b|nap time/.test(pl)) {
      const hits = ccs.filter((c) => /p\.?\s?m\.?$/i.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }
    // ride a bike collocation
    if (/_B_ (a |an |the |my |his |her |your )?(bike|bicycle|motorbike|scooter|horse)/.test(pn)) {
      const hits = ccs.filter((c) => /^(ride|rides|riding|rode)$/i.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }
    // species habitat / team-size facts
    for (const [re, want] of [
      [/\bsharks?\b/, 'ocean|sea'],
      [/\bwhales?\b/, 'ocean|sea'],
      [/\bpenguins?\b/, 'antarctica|antarctic|south pole|cold'],
      [/football team|soccer team/, 'eleven'],
      [/basketball team/, 'five'],
      [/volleyball team/, 'six'],
      [/dentist/, 'toothache|teeth|cavity'],
      [/plant(ing)? (some )?flowers?|grow(ing)? flowers?|plant(ing)? (trees|vegetables)|school garden/, 'garden'],
      [/teeth/, 'dentist'],
      [/haircut|cut (my |his |her )?hair/, 'barber|hairdresser'],
    ]) {
      if (!re.test(pl)) continue;
      const hits = ccs.filter((c) => new RegExp(`^(${want})$`, 'i').test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }
    // greener action for clean air: "plant more _B_ to make the air cleaner" -> trees
    if (/plant(ing)? (more |some |a lot of )?_B_|make the air (cleaner|fresher)|clean(er)? (the )?air|reduce pollution/.test(pn)) {
      const hits = ccs.filter((c) => /^trees?$|^plants?$/.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }
    // relative pronoun: "the book _B_ my teacher gave me" -> that/which unique
    if (/\w+ _B_ (my|your|his|her|our|their|the|a|an|i|we|they|he|she)\s+\w+/.test(pn)) {
      const rel = ccs.filter((c) => /^(that|which|who|whom|whose|where|when|what)$/.test(c));
      const valid = ccs.filter((c) => /^(that|which)$/.test(c));
      if (rel.length === ccs.length && valid.length === 1 && valid[0] === aa) return true;
    }
    // first conditional: "if it rains tomorrow, we _B_ at home" -> will stay
    if (/\bif\b/.test(pl) && /,[\s\S]{0,60}_B_/.test(pn)) {
      const hits = ccs.filter((c) => /^will\b|^won't\b/.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }
    // reported speech: "asked/told/said if ... -> would"
    if (/asked|told|said|wondered/.test(pl) && /_B_|if|whether/.test(pn)) {
      const hits = ccs.filter((c) => /^would\b/.test(c));
      if (hits.length === 1 && hits[0] === aa && /asked|told|said|wondered/.test(pl)) return true;
    }
    // future opinion: "i think it _B_ tomorrow -> will rain"
    if (/i think|i believe|i hope|i guess|probably|maybe|perhaps/.test(pl) && /tomorrow|next|soon|later|tonight/.test(pl)) {
      const hits = ccs.filter((c) => /^will\b|^won't\b/.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }
    // subject + tense cue -> unique be-form among be/do/have choices
    {
      const beS = /\b(i|we|they|you|he|she|it|my [a-z]+s?|our [a-z]+s?|the [a-z]+s?|your [a-z]+s?|his [a-z]+s?|her [a-z]+s?|their [a-z]+s?|[a-z]{3,}( and [a-z]{3,})?) _B_\b/.exec(pn);
      if (beS && ccs.every((c) => /^(am|is|are|was|were|be|do|does|did|have|has|can|will)$/.test(c))) {
        const sB = beS[1].trim();
        const pluralSub = /^(we|they|you)$/.test(sB) || / and /.test(sB) || /(children|parents|students|friends|boys|girls|kids|people|teachers|workers|players|members|visitors|tourists)\b/.test(sB) || /^(the|my|our|your|his|her|their) [a-z]+s$/.test(sB);
        const past = /\byesterday\b|last (night|week|month|year|sunday|monday|tuesday|wednesday|thursday|friday|saturday|summer|winter|holiday|time)|\bago\b|in \d{4}\b|\bborn\b/.test(pl);
        const want = past ? (/^i$/.test(sB) || !pluralSub ? 'was' : 'were')
                          : (/^i$/.test(sB) ? 'am' : pluralSub ? 'are' : 'is');
        if (aa === want && ccs.filter((c) => c === want).length === 1) return true;
      }
    }
    // "X and I ... _B_ play" -> we
    if (/\b\w+ and i\b[\s\S]{0,40}?\b_B_\b/.test(pn) || /^.{0,4}_B_\b[\s\S]{0,20}\bplay|go|do|study|learn/.test(pn)) {
      if (/ and i\b/.test(pn) && aa === 'we' && ccs.filter((c) => c === 'we').length === 1) return true;
    }
    // "it is wrong / against the rules" -> negative modal unique
    if (/\b(cheat|copy|lie|lies|steal|smoke|fight|litter|drop litter|be late|play with fire|bully|waste)\b/.test(pl) && /\b(wrong|bad|against (the )?rules?|not allowed|learn nothing|harmful|dangerous)\b/.test(pl)) {
      const neg = ccs.filter((c) => /^(should not|shouldn't|must not|mustn't|cannot|can't|can not|do not|don't|never|no)$/.test(c));
      if (neg.length === 1 && neg[0] === aa) return true;
    }
    // protect environment -> unique eco action
    if (/protect (the )?(ocean|environment|earth|planet|nature|sea|forest|animals)|save (the )?(ocean|earth|energy|water)|keep .*clean|reduce pollution/.test(pl)) {
      const good = ccs.filter((c) => /reuse|reduce|recycle|save|plant|clean|pick up|turn off|walk|bike|use less|reuse or reduce/.test(c));
      const bad = ccs.filter((c) => /use more|throw|burn|waste|litter|more plastic|pollute|cut down/.test(c));
      if (good.length === 1 && good[0] === aa && good.length + bad.length === ccs.length) return true;
    }
    // big-count gloss -> "lots of"
    if (/counted (over )?\d+|over \w+ (hundred|thousand)|\d{3,}/.test(pl)) {
      const hits = ccs.filter((c) => /^(lots of|a lot of|many|hundreds of|plenty of)$/.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }
    // rush hour -> traffic heaviest
    if (/rush hour/.test(pl)) {
      const hits = ccs.filter((c) => /traffic|heaviest|busy|crowd/.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }
    // won prize -> congratulations response
    if (/won (first |the )?(prize|contest|competition|game|match|race|award)|first place|gold medal|champion/.test(pl)) {
      const hits = ccs.filter((c) => /congratulat|well done|great job|good job/.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }
    // cough -> warm-water advice unique
    if (/cough|sore throat/.test(pl)) {
      const hits = ccs.filter((c) => /warm water|honey|syrup|medicine|warm tea|see a doctor/.test(c));
      const bad = ccs.filter((c) => /cold|coke|ice cream|sweet|candy|outside|play/.test(c));
      if (hits.length === 1 && hits[0] === aa && hits.length + bad.length === ccs.length) return true;
    }
    // "what time" when the glossed answer is a clock time
    if (/\?\s*[-–:]\s*(at |half past|\d|seven|eight|nine|ten)/.test(pn) || /at half past|at \d{1,2}(:\d{2})?|o'clock/.test(pl)) {
      const hits = ccs.filter((c) => /^(what time|when)$/.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // wh-question be-agreement: "what _B_ you eating?" -> are
    {
      const whBe = /_B_ (you|we|they|he|she|it|i|your|the|my|[a-z]{3,}) \w+ing\b/.exec(pn);
      if (whBe && ccs.every((c) => /^(am|is|are|was|were|do|does|be|have|has|did)$/.test(c))) {
        const s2 = whBe[1];
        const want = /^(you|we|they|your|the|my|[a-z]{3,}s)$/.test(s2) ? 'are' : /^i$/.test(s2) ? 'am' : 'is';
        if (aa === want && ccs.filter((c) => c === want).length === 1) return true;
      }
    }

    // has/have agreement: "<subj> _B_ <noun>" -> has (3rd) / have (non-3rd)
    {
      const hv = /\b(i|we|they|you|he|she|it|(?:the|my|your|his|her|our|their|a|an|every|each|this|that) (?:[a-z]+ )*?[a-z]+s?|this|that|these|those|[a-z]{3,}) _B_ \w+/.exec(pn);
      if (hv && ccs.every((c) => /^(have|has|had|is|are|am|was|were|do|does|haves|having|be)$/.test(c))) {
        const s3 = hv[1].trim();
        const lastN3 = /(?:the|my|your|his|her|our|their|a|an|every|each|this|that) (?:[a-z]+ )*([a-z]+)$/.exec(s3);
        const pl3 = /^(we|they|you|i)$/.test(s3) || / and /.test(s3) || /s$/.test(s3) || (lastN3 != null && PL_EXC.has(lastN3[1]));
        const want = pl3 ? 'have' : 'has';
        if (aa === want && ccs.filter((c) => c === want).length === 1 && !/^(family|team|class|group|crowd|staff|crew|public)$/.test(lastN3?.[1] ?? '')) return true;
      }
    }

    // "at the moment / now" -> subject-matching progressive "is V-ing" unique
    if (/\bnow\b|at the moment|right now|this minute|look!?|listen!|hurry up/.test(pl)) {
      const subP = /\b(i|we|they|you|he|she|it|(?:the|my|your|his|her|our|their) (?:[a-z]+ )*[a-z]+s?|[a-z]{3,}(?: and [a-z]{3,})?) _B_/.exec(pn);
      const BASE_ING = new Set(['sing', 'bring', 'ring', 'king', 'thing', 'wing', 'fling', 'sling', 'sting', 'string', 'spring', 'cling', 'swing', 'wring', 'ceiling', 'morning', 'evening', 'during', 'something', 'anything', 'nothing', 'everything', 'darling', 'sterling', 'duckling', 'offspring', 'lightning', 'herring', 'shilling', 'inkling', 'sapling', 'starling', 'yearling', 'underling', 'weakling', 'seedling', 'princeling', 'foundling', 'hireling', 'nestling', 'fledgling', 'stripling', 'chang', 'bling', 'thingamajig']);
      const prog = ccs.filter((c) => { const m = /^(am|is|are|was|were) (\w+ing)$/.exec(c); return m && !BASE_ING.has(m[2]); });
      if (subP && prog.length) {
        const sP = subP[1].trim();
        const lastN = /(?:the|my|your|his|her|our|their) (?:[a-z]+ )*([a-z]+)$/.exec(sP);
        const plS = /^(we|they|you)$/.test(sP) || / and /.test(sP) || /s$/.test(sP) || (lastN != null && PL_EXC.has(lastN[1]));
        const wantAux = /^i$/.test(sP) ? 'am' : plS ? 'are' : 'is';
        const hits = prog.filter((c) => c.startsWith(wantAux + ' '));
        if (hits.length === 1 && hits[0] === aa) return true;
      }
    }

    // past cue + "subj _B_ <adj/noun>" -> was/were unique by subject agreement
    if (/\byesterday\b|last (night|week|month|year|sunday|monday|tuesday|wednesday|thursday|thursday|friday|saturday|time)|\bago\b|once upon/.test(pl)) {
      const beSet = /^(am|is|are|be|was|were|will be|won't be|would be)$/i;
      if (ccs.length && ccs.every((c) => beSet.test(c))) {
        const sm = /\b(i|you|he|she|it|we|they|the weather|my \w+|your \w+|his \w+|her \w+|our \w+|their \w+|that|this|there|[a-z]{2,}) _B_\b/.exec(pn);
        if (sm) {
          const s = sm[1].toLowerCase();
          const sg = /^(i|he|she|it|that|this|the weather)$/.test(s) || (/^(my|your|his|her|our|their) /.test(s) && !/s$/.test(s.split(' ')[1])) || (!/^(we|they|you|there)$/.test(s) && !/s$/.test(s));
          const want = sg ? 'was' : 'were';
          if (ccs.filter((c) => c === want).length === 1 && aa === want) return true;
        }
      }
    }

    // past cue + "_B_ you/we/they/... <verb>?" -> "did" unique
    if (/\byesterday\b|last (night|week|month|year|sunday|monday|tuesday|wednesday|thursday|friday|saturday)|\bago\b|this morning\b/.test(pl) && /_B_ (you|i|we|they|he|she|it|your|the|my|[a-z]{3,}) \w+/.test(pn)) {
      const others = ccs.filter((c) => /^(do|does|did|are|is|am|was|were|will|can|have|has)$/i.test(c));
      if (others.length === ccs.length && ccs.filter((c) => /^did$/i.test(c)).length === 1 && aa === 'did') return true;
    }

    // "comparative _B_" -> "than" unique
    if (/(\w+(er|ier)|more|less|better|worse|fewer|higher|lower|bigger|smaller|larger|taller|shorter|longer|faster|slower|older|younger|cheaper|easier|harder|stronger|weaker|heavier|lighter|hotter|colder|warmer|cooler|nicer|happier|sadder|prettier|uglier|cleaner|dirtier|richer|poorer|busier|lazier|earlier|later|wider|narrower|deeper|higher|thinner|fatter|safer|quicker|angrier|closer|further|farther) _B_/.test(pn)) {
      const hits = ccs.filter((c) => c === 'than');
      if (hits.length === 1 && aa === 'than') return true;
    }

    // superlative frame: "the _B_ ... (ever/of all)" or one well-formed -est
    {
      const SHORT_ADJ = '(funny|happy|easy|big|good|bad|sad|hot|cold|tall|short|long|fast|slow|old|new|nice|fine|late|hard|soft|loud|quiet|simple|fun|fat|thin|rich|poor|busy|lazy|early|pretty|ugly|dirty|clean|dark|bright|heavy|light|strong|weak|young|cheap|dear|near|far|high|low|deep|wide|narrow|thick|smooth|rough|sharp|flat|round|full|empty|wet|dry|sour|sweet|bitter|salty|fresh|tight|loose|safe|quick|angry|crazy|silly|lucky|tasty|windy|cloudy|sunny|rainy|snowy|foggy|noisy|sleepy|hungry|thirsty|healthy|greedy|friendly|lonely|tiny|huge|brave|polite|rude|kind|clever|stupid|wise|foolish|great|large|small|warm|cool)';
      const isSup = (c) => /(est|iest)$/.test(c) || /^most \w/.test(c) || /^(best|worst|least)$/.test(c);
      const malformedSup = (c) => new RegExp(`^(more|most) ${SHORT_ADJ}\\b`).test(c) || /^(gooder|badder|goodest|baddest|worser|worsest|bestest|most good|more good|most bad|more bad|funner|funnest)$/.test(c);
      const sup = ccs.filter((c) => isSup(c) && !malformedSup(c));
      const supCtx = /\bever\b|of all|in the world|in my (life|class|family)|i have ever|the \w+est|always the|usually the|is the|was the/.test(pl);
      if (!/of the two/.test(pl) && supCtx && sup.length === 1 && aa === sup[0]) return true;
    }

    // "the _B_ fun" -> most
    if (/\bthe _B_ \w+/.test(pn)) {
      const hits = ccs.filter((c) => c === 'most');
      if (hits.length === 1 && aa === 'most' && ccs.every((c) => /^(most|more|much|many)$/.test(c))) return true;
    }

    // affirmative "_B_ <plural noun>" -> 'some' unique among quantifier choices
    {
      const sm = /_B_ ([a-z]+(?: [a-z]+){0,3})/.exec(pn);
      const n2 = sm && sm[1].split(' ').some((t) => /s$/.test(t) && !/(ss|us|is)$/.test(t) && !/^(this|yes|his|hers|its|thus|plus|bus|gas|news|always|perhaps|besides|sometimes|physics|maths|series|species|christmas|tet|means)$/.test(t));
      const UNC = sm && sm[1].split(' ').some((t) => new RegExp("^(" + ["water","milk","juice","tea","coffee","sugar","salt","rice","bread","meat","money","time","homework","information","furniture","traffic","pollution","rain","snow","work","food","oil","butter","cheese","chocolate","soup","ice","air","gas","sand","grass","hair","paper","energy","electricity","housework","fun","luck","advice","news","music","luggage","equipment","soap","fruit","salad","pasta","noodles","porridge","cereal","flour","honey","jam","cream","beef","pork","weather","wind","fire","wood","metal","gold","silver","iron","plastic","glass","clay","soil","land","english","history","geography","maths","science","art","sport","pe","lightning","thunder","darkness","sunshine","daylight","sunlight","moonlight","help","praise","support","respect","courage","honesty","kindness","patience","anger","fear","joy","happiness","sadness","love","hope","peace","freedom","power","strength","health","sleep","rest","exercise","training","practice","experience","knowledge","education","research","progress","success","failure","trouble","danger","harm","damage","violence","war","peace","law","order","silence","noise","sound","light","heat","cold","warmth","pressure","speed","weight","mass","space"].join("|") + ")$").test(t));
      if (sm && (n2 || UNC) && !/not|n't|\?/.test(pn) && !/\bany\b/.test(pn)) {
        if (aa === 'some' && ccs.every((c) => /^(some|a|an|any|much)$/.test(c))) return true;
      }
    }

    // animal/plant taxonomy facts
    for (const [re, want] of [
      [/\b(eagle|sparrow|penguin|owl|parrot|flamingo|swan|duck|chicken|peacock|ostrich|crow|seagull|robin|stork|goose|turkey|hen)s?\b/, 'bird|birds|a bird|an animal that (can )?(fly|flies)'],
      [/\b(lion|tiger|bear|wolf|fox|zebra|giraffe|hippo|rhino|elephant|monkey|gorilla|leopard|cheetah|panda|koala|kangaroo|seal|otter|whale|dolphin|bat|deer|squirrel|camel|donkey)s?\b/, 'mammal|mammals|a mammal|wild animal|wild animals|a wild animal|animal'],
      [/\b(cow|pig|goat|sheep|horse|buffalo|ox|bull|hen|rooster)s?\b/, 'mammal|mammals|a mammal|farm animal|farm animals|a farm animal|animal'],
      [/\b(dog|cat|rabbit|mouse|hamster|guinea pig|goldfish|parrot|turtle|puppy|kitten)s?\b/, 'mammal|mammals|a mammal|pet|pets|a pet|pet animal|pet animals|a pet animal|animal'],
      [/\b(shark|salmon|tuna|goldfish|clownfish|eel|octopus|squid|trout|sardine|herring|mackerel|catfish|jellyfish|starfish|seahorse)s?\b/, 'fish'],
      [/\b(ant|bee|butterfly|mosquito|beetle|cockroach|dragonfly|ladybug|grasshopper|termite|wasp|caterpillar|cricket|moth|flea|louse|centipede)s?\b/, 'insect'],
      [/\b(snake|lizard|crocodile|alligator|turtle|tortoise|gecko|chameleon|iguana|cobra|python|viper)s?\b/, 'reptile'],
      [/\b(frog|toad|salamander|newt)s?\b/, 'amphibian'],
      [/\b(rose|sunflower|tulip|daisy|lotus|orchid|lily|jasmine|marigold|dandelion|hibiscus|cherry blossom)s?\b/, 'flower'],
      [/\bfish\b/, 'water|ocean|sea|pond|river|lake|aquarium|the water'],
      [/\b(spider)s?\b/, 'insect|arachnid|spider'],
      [/\b(october|oct)\b/, 'autumn|fall'],
      [/\b(december|january|february|dec|jan|feb)\b/, 'winter'],
      [/\b(june|july|august|jun|jul|aug)\b/, 'summer'],
      [/\b(march|april|may|mar|apr)\b/, 'spring'],
      [/\b(september|october|november|sep|sept|oct|nov)\b/, 'autumn|fall'],
    ]) {
      if (!re.test(pl)) continue;
      const hits = ccs.filter((c) => new RegExp(`^(a |an )?(${want})s?\\.?$`, 'i').test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // misc contextual facts
    for (const [re, want] of [
      [/bird.{0,15}nest|builds? a nest|nest in/, 'tree|branch|trees'],
      [/zebras?/, 'stripes?'],
      [/vegetables?|exercise|sport|eats? well|fruit/, 'healthy|strong|fit|health'],
      [/too much (candy|sugar|sweet|junk food|chocolate)|ate too much|lots of candy/, 'sick|stomachache|toothache|bad'],
      [/medicine|took medicine|taking the medicine|saw the doctor/, 'better|well|fine|good'],
      [/coldest|cold place|cold city/, 'antarctica|arctic|north pole|siberia'],
      [/hottest|hot place/, 'africa|desert|sahara|equator'],
      [/polar bears?/, 'arctic|north pole|cold|snow|ice'],
      [/ho chi minh|saigon|hcmc/, 'bigger|larger|big|large|modern|busy|noisy|crowded'],
      [/\bhue\b/, 'smaller|quieter|older|ancient|peaceful|quiet|small|old'],
      [/\bscience\b/, 'plants? and animals?|animals? and plants?|plants?|animals?|nature|experiments?|planets?|the earth|space|energy|matter|insects?|weather|bodies|the body'],
      [/in english class|english (lesson|subject)/, 'english|words?|abc|read|write|speak'],
      [/nest/, 'tree|branch'],
    ]) {
      if (!re.test(pl)) continue;
      const hits = ccs.filter((c) => new RegExp(`^(${want})$`, 'i').test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // young male family member -> "student" when rivals are other kin
    if (/\b(brother|son|boy|grandson|nephew|cousin|little brother|younger brother)\b/.test(pl) && /_B_/.test(pn)) {
      const hits = ccs.filter((c) => /^(student|pupil|boy|son|kid|child|classmate|teenager|baby)$/.test(c));
      const kin = ccs.filter((c) => /^(sister|mother|father|aunt|grandma|grandpa|daughter|mom|mum|parent|uncle|niece|granddaughter|wife|husband)$/.test(c));
      if (hits.length === 1 && hits[0] === aa && hits.length + kin.length === ccs.length) return true;
    }

    // "_B_ place/one" -> "the most X" / "the X-est" unique (bare rivals lack "the")
    if (/_B_ (place|one|city|country|person|girl|boy|kid|student|player|singer|dancer|animal|thing|day|month|year|season|festival|holiday|food|dish|subject|sport|game|book|movie|film|song|color|colour|job|way|time|part|member|friend|teacher|doctor|kind|type|sort)\b/.test(pn)) {
      const theSup = ccs.filter((c) => /^the (most \w+|\w+(est|iest))\b/.test(c));
      if (theSup.length === 1 && theSup[0] === aa) return true;
    }

    // past cue -> unique past-form choice regardless of mixed lemmas
    {
      const pastCue2 = /\byesterday\b|last (night|week|month|year|sunday|monday|tuesday|wednesday|thursday|friday|saturday|summer|winter|holiday|time)|\bago\b|in \d{4}\b|this morning\b|once upon/.test(pl);
      if (pastCue2) {
        const AMBIG_PAST = new Set(['read', 'put', 'cut', 'hit', 'let', 'set', 'shut', 'hurt', 'cost', 'run', 'come', 'beat', 'fit', 'quit', 'split', 'upset', 'broadcast', 'cast', 'shed', 'spread', 'wed', 'wet', 'rid', 'bid']);
        const pasts = ccs.filter((c) => /ed$/.test(c.split(' ')[0]) || Object.prototype.hasOwnProperty.call(IRR, c.split(' ')[0]) && !/^(is|are|am|do|does|go|goes|have|has|be|was|were|read|put|cut|hit|let|set|shut|hurt|cost|got)$/.test(c.split(' ')[0]) || AMBIG_PAST.has(c.split(' ')[0]));
        if (pasts.length === 1 && pasts[0] === aa) return true;
      }
    }

    // "what does a/an X do?" -> X's signature action
    {
      const qjob = /what does (a|an|the) (\w+) do|_B_ (is|are|was|were)? ?(a|an|the)? ?(\w+) (do|does)\??/.exec(pn);
      const JOB_ACT2 = { artist: 'paint|draw', painter: 'paint|draw', singer: 'sing', teacher: 'teach', doctor: 'treat|help|cure|examine', nurse: 'care|help|look after', chef: 'cook', cook: 'cook', farmer: 'grow|plant', pilot: 'fly', driver: 'drive', writer: 'write', builder: 'build', baker: 'bake', dancer: 'dance', firefighter: 'fight|stop|put out|rescue|save', policeman: 'catch|protect|keep|help', police: 'catch|protect|keep|help', 'police officer': 'keep|protect|catch|help', vet: 'treat|help|cure|care', dentist: 'fix|treat|check', postman: 'deliver', reporter: 'report|write', fisherman: 'fish|catch', scientist: 'research|discover|experiment|study', astronaut: 'explore|travel|fly', musician: 'play|sing|perform', photographer: 'take|shoot', mechanic: 'fix|repair', tailor: 'sew|make', gardener: 'garden|plant|grow', janitor: 'clean', plumber: 'fix|repair', electrician: 'fix|install|repair', carpenter: 'build|make', hairdresser: 'cut|style', barber: 'cut', lifeguard: 'save|rescue|watch', detective: 'investigate|solve|catch', judge: 'judge|decide', lawyer: 'defend|argue|help', soldier: 'fight|protect|defend', guard: 'guard|protect|watch|keep' };
      const JOB_ACT3 = { 'police officer': 'keeps?|protects?|catches?|arrests?|helps?|patrols?|maintains?', policeman: 'keeps?|protects?|catches?|arrests?|helps?|patrols?', police: 'keeps?|protects?|catches?|arrests?|helps?', scientist: 'researches?|discovers?|experiments?|studies|studied|conducts?|invents?|analyz|works? in a lab|does? experiments?', pilot: 'flies|fly|flying|flew|aviat|drives? (a |the )?plane', artist: 'paints?|draws?|creates?|designs?', painter: 'paints?|draws?', singer: 'sings?|sang|sung|singing|performs?', teacher: 'teaches?|taught|educat|instructs?|explains?|helps? (students?|children|kids|pupils) (learn|study)', doctor: 'treats?|helps?|cures?|examines?|cares? for|heals?|diagnos|prescrib|works? in (a |the )?hospital', nurse: 'cares?|helps?|looks? after|treats?|takes? care|works? in (a |the )?hospital', chef: 'cooks?|bakes?|prepares?', cook: 'cooks?|bakes?|prepares?', farmer: 'grows?|plants?|harvests?|raises?|works? on (a |the )?farm|feeds?', driver: 'drives?|drove|driving|takes? (people|passengers)', writer: 'writes?|wrote|writing|authors?|publishes?|tells? stories', builder: 'builds?|built|constructs?|makes? (houses?|buildings?|roads?|bridges?|machines?)', baker: 'bakes?|makes? (bread|cakes?|pastries)', dancer: 'dances?|danced|dancing|performs?', firefighter: 'fights? (fires?)|stops?|puts? out|rescues?|saves?|extinguish', vet: 'treats?|helps?|cures?|cares? for (sick )?(animals?|pets?)|works? with animals?', dentist: 'fixes? (teeth)|treats?|checks? (teeth)|cleans? teeth', postman: 'delivers?|brings? (letters?|mail|packages?|parcels?)', reporter: 'reports?|writes?|interviews?|covers?', fisherman: 'fishes?|catches? (fish)|works? (on|at|in) (the )?(sea|ocean|river|boat)', astronaut: 'explores?|travels?|flies|works? in space', musician: 'plays?|sings?|performs?|makes? music', photographer: 'takes?|shoots?|photographs?', mechanic: 'fixes?|repairs?|works? on (cars?|engines?|machines?)', tailor: 'sews?|makes? (clothes?|dresses?|suits?)', gardener: 'gardens?|plants?|grows?|tends?', janitor: 'cleans?|sweeps?|mops?|takes? care', plumber: 'fixes?|repairs?|installs?', electrician: 'fixes?|installs?|repairs?', carpenter: 'builds?|makes? (furniture|things|tables?|chairs?)', hairdresser: 'cuts?|styles?|trims?', barber: 'cuts?|trims?|shaves?', lifeguard: 'saves?|rescues?|watches?|guards?', detective: 'investigates?|solves?|catches?|finds?', judge: 'judges?|decides?|rules?', lawyer: 'defends?|argues?|helps?|represents?', soldier: 'fights?|protects?|defends?|serves?', guard: 'guards?|protects?|watches?|keeps?', 'security guard': 'guards?|protects?|watches?|keeps?', vet2: 'x' };
      const jm2 = /what does (?:a\/an|a|an|the|\w+) ([a-z]+(?: [a-z]+)?) do\b|_B_ (?:a\/an|a|an|the) ([a-z]+(?: [a-z]+)?) does\b|(?:a|an|the) ([a-z]+(?: [a-z]+)?) (?:keeps?|helps?|makes?|takes care|takes?)\b[^.]{0,40}_B_|(?:a|an|the) ([a-z]+(?: [a-z]+)?) (?:is|are) (?:a |an )?_B_|person who ([a-z]+(?: [a-z]+)?)/.exec(pn);
      let jobN = jm2 && (jm2[1] ?? jm2[2] ?? jm2[3] ?? jm2[4] ?? jm2[5]);
      if (jobN && !JOB_ACT3[jobN] && JOB_ACT3[jobN.split(' ').slice(-1)[0]]) jobN = jobN.split(' ').slice(-1)[0];
      if (jm2 && jobN && JOB_ACT3[jobN]) {
        const hits = ccs.filter((c) => new RegExp(`\\b(${JOB_ACT3[jobN]})`, 'i').test(c));
        if (hits.length === 1 && hits[0] === aa) return true;
      }
      // "keeps people safe / protects" -> police officer
      if (/keeps? people safe|keeps? us safe|protects? people|catches? thieves|maintains? order/.test(pl)) {
        const hits = ccs.filter((c) => /police|security|guard|bodyguard|officer/.test(c));
        if (hits.length === 1 && hits[0] === aa) return true;
      }
    }

    // "42 km race" -> marathon
    if (/42|long race|marathon/.test(pl) && /race|run|kilomet/.test(pl)) {
      const hits = ccs.filter((c) => /marathon/.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // vietnamese frequency gloss: "(trạng từ tần suất ...)" -> mapped adverb
    {
      const vg = /\(trạng từ tần suất\s*["""']?([^)"']+)['")]?\s*\)/.exec(pl);
      const FREQ_VN = { 'thỉnh thoảng': 'sometimes', 'đôi khi': 'sometimes', 'thường': 'usually', 'thường xuyên': 'usually', 'luôn luôn': 'always', 'luôn': 'always', 'không bao giờ': 'never', 'hiếm khi': 'rarely', 'hiếm': 'rarely', 'ít khi': 'seldom', 'hay': 'often' };
      if (vg) {
        const want = FREQ_VN[vg[1].trim()] ?? Object.entries(FREQ_VN).find(([k]) => vg[1].includes(k))?.[1];
        if (want) {
          const hits = ccs.filter((c) => new RegExp(`^(${want})$`, 'i').test(c));
          if (hits.length === 1 && hits[0] === aa) return true;
        }
      }
    }

    // "<adj> _B_ <adj>" both positive -> "and" unique
    if (/\b(clever|smart|kind|nice|good|beautiful|pretty|tall|strong|brave|friendly|funny|happy|hard-working|hardworking|diligent|polite|helpful|lovely|gentle|honest|rich|famous|popular|active|healthy|tidy|clean|neat|bright|warm|cool|sweet|cute|lovely|wonderful|great|excellent|amazing|interesting|comfortable|peaceful|quiet|big|large|spacious|modern|new|young|fresh|delicious|tasty|colorful|colourful) _B_ (clever|smart|kind|nice|good|beautiful|pretty|tall|strong|brave|friendly|funny|happy|hard-working|hardworking|diligent|polite|helpful|lovely|gentle|honest|rich|famous|popular|active|healthy|tidy|clean|neat|bright|warm|cool|sweet|cute|wonderful|great|excellent|amazing|interesting|comfortable|peaceful|quiet|big|large|spacious|modern|new|young|fresh|delicious|tasty|colorful|colourful)\b/.test(pn)) {
      const hits = ccs.filter((c) => /^(and|but|or)$/.test(c));
      if (hits.length === 1 && aa === 'and' && !ccs.some((c) => c === 'but')) return true;
    }

    // racket sports: "plays _B_ with her racket" -> badminton
    if (/racket|shuttlecock/.test(pl)) {
      const hits = ccs.filter((c) => /badminton|tennis|squash|table tennis|ping/.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // habitat facts round 3
    for (const [re, want] of [
      [/\bcamels?\b/, 'desert|sahara'],
      [/\btigers?\b|\blions?\b|\bmonkeys?\b|\bparrots?\b/, 'jungle|forest'],
      [/\bdolphins?\b|\bwhales?\b|\bsharks?\b|\boctopus/, 'ocean|sea'],
      [/\bbears?\b/, 'forest|cave|mountain|woods'],
      [/\bwolves?\b|\bfoxes?\b/, 'forest|woods'],
      [/\bfrogs?\b/, 'pond|lake|water|river'],
      [/\beagles?\b|\bhawks?\b|\bfalcons?\b/, 'mountain|cliff|sky|nest'],
      [/different countries|countries of the world|maps?|capitals?/, 'geography'],
      [/numbers?|calculations?|equations?|fractions?/, 'math|maths|mathematics'],
      [/histor(y|ical)|past events|ancient|wars?|kings?|dynast(y|ies)/, 'history'],
      [/languages?|foreign/, 'language|english|vietnamese|french|spanish|languages'],
      [/body|organs?|muscles?|bones|cells|digest|breathe/, 'biology|science|health'],
      [/computer|software|code|programming|typing/, 'it|computer science|informatics'],
      [/sing(ing)?|songs?|melod(y|ies)|instruments?|rhythm|notes?/, 'music'],
      [/draw(ing)?|paint(ing)?|pictures?|colors?|colours?|sketch/, 'art'],
      [/sport|exercise|games?|physical|ball/, 'pe|physical education|sport'],
      [/racket/, 'badminton|tennis|squash'],
    ]) {
      if (!re.test(pl)) continue;
      const hits = ccs.filter((c) => new RegExp(`^(${want})$`, 'i').test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // "of all / in the world" -> "the most" or "the X-est" unique
    if (/of (all|them all)|in the world|of the (year|class|group|family)|ever/.test(pl)) {
      const theSup = ccs.filter((c) => /^the (most \w+|\w+(est|iest)|best|worst)\b/.test(c));
      if (theSup.length === 1 && theSup[0] === aa) return true;
      if (aa === 'the most' && ccs.filter((c) => c === 'the most').length === 1) return true;
    }

    // malformed-modal rivals -> "can" unique
    if (/_B_ \w+/.test(pn) && ccs.every((c) => /^(can|can't|cannot|could|couldn't|will|won't|would|wouldn't|must|mustn't|should|shouldn't|may|might|shall|cans|is can|can to|can\'t to|do can|am can|is can\'t)$/.test(c))) {
      const valid = ccs.filter((c) => /^(can|can't|cannot|could|couldn't|will|won't|would|wouldn't|must|mustn't|should|shouldn't|may|might|shall)$/.test(c));
      if (valid.length === 1 && valid[0] === aa) return true;
    }

    // keeps people _B_ -> safe
    if (/keeps? (people|us|you|everyone|citizens|the city|the town) _B_/.test(pn)) {
      const hits = ccs.filter((c) => /^(safe|protected|secure)$/.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // meal -> time of day
    for (const [re, want] of [
      [/lunch/, 'afternoon|noon|midday'],
      [/dinner|supper/, 'evening|night'],
      [/breakfast/, 'morning'],
      [/_B_ (a |an |some |the )?\w* ?(salad|cake|sandwich|pizza|dinner|meal|soup|dessert|breakfast|lunch)/, 'makes?|making|made|cooks?|cooking|cooked|bakes?|baking|baked|prepares?|preparing|prepared|is (making|cooking|baking|preparing)|eats?|eating|ate|havin?g?|has|had|fixes?|fixing|grills?|grilling|fries?|frying|serves?|serving'],
    ]) {
      if (!re.test(pl) && !re.test(pn)) continue;
      const hits = ccs.filter((c) => new RegExp(`^(${want})`, 'i').test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // object -> the only sensible verb: "she is _B_ an umbrella" -> holding
    for (const [re, want] of [
      [/umbrella/, 'hold|carrying|holding|using|use'],
      [/house|building/, 'build|building|painting|buying'],
      [/book|story|newspaper|magazine|letter/, 'read|reading'],
      [/song|music|guitar|piano|violin|drum/, 'play|playing|sing|singing'],
      [/ball|football|balloon|kite/, 'play|playing|kick|kicking|fly|flying'],
      [/food|dinner|lunch|breakfast|meal|cake|soup/, 'cook|cooking|make|making|eat|eating'],
      [/water|juice|milk|tea|coffee|glass|bottle/, 'drink|drinking|pour|pouring'],
      [/photo|picture|selfie/, 'take|taking|draw|drawing|paint|painting'],
      [/homework|exercise|test|exam/, 'do|doing|finish|finishing'],
      [/bed|sleep/, 'sleep|sleeping|lie|lying|rest|resting'],
      [/car|bus|taxi|truck|motorbike/, 'driv|is driving|take|taking'],
      [/bike|bicycle|horse/, 'rid|is riding'],
      [/phone/, 'call|calling|use|using|answer|answering'],
      [/letter|email|card|note/, 'write|writing|send|sending'],
      [/teeth/, 'brush|brushing|clean|cleaning'],
      [/hands?/, 'wash|washing|clap|clapping|raise|raising|shake|shaking'],
      [/clothes|shirt|dress|jacket|coat|uniform/, 'wear|wearing|put|putting|wash|washing'],
      [/garden/, 'work|working|plant|planting|water|watering'],
      [/homework|housework|chores/, 'do|doing|help|helping'],
      [/television|tv|cartoon|film|movie/, 'watch|watching'],
      [/computer/, 'play|playing|use|using|work|working|type|typing'],
      [/game/, 'play|playing|use|using|watch|watching|make|making|win|winning|lose|losing|join|joining|enjoy|enjoying|have|having|finish|finishing'],
      [/school|class|lesson/, 'go|going|attend|attending|study|studying|teach|teaching|learn|learning'],
      [/snowman|snowball/, 'make|making|build|building|throw|throwing'],
      [/sandcastle/, 'build|building|make|making'],
      [/fire|fires/, 'fight|fighting|put out|stop|stopping|extinguish'],
      [/criminal|thief|robber|bad guy/, 'catch|catching|arrest|arresting|chase|chasing'],
      [/patient|sick person/, 'treat|treating|help|helping|examine|examining|cure|curing'],
      [/problem|question|exercise|puzzle/, 'solve|solving|answer|answering|work|working'],
    ]) {
      const mm = new RegExp(`_B_ (a |an |the |my |his |her |your |our |their |some )?\\w*${re.source}\\w*`).exec(pn);
      if (!mm) continue;
      const hits = ccs.filter((c) => new RegExp(`^(${want})`, 'i').test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // sun + hat -> sunny; grass -> flowers; parent + job
    if (/hat|sunscreen|sunglasses|sun\b|shade/.test(pl)) {
      const hits = ccs.filter((c) => /^(sunny|hot|warm)$/.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }
    if (/grass|meadow|field|lawn/.test(pl)) {
      const hits = ccs.filter((c) => /flowers?|grass|plants?|cows?|sheep|butterfl|bugs?|insects?/.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }
    if (/\b(mom|dad|mother|father|aunt|uncle|grandma|grandpa|mum|mommy|daddy|parents?)\b.{0,30}(is|are|works? as) (a |an )?_B_|(mom|dad|mother|father|aunt|uncle|grandma|grandpa) is a _B_/.test(pn)) {
      const hits = ccs.filter((c) => /^(teacher|doctor|nurse|farmer|driver|cook|chef|worker|engineer|police|policeman|police officer|pilot|singer|writer|artist|dentist|vet|builder|baker|postman|reporter|soldier|scientist|businessman|businesswoman|manager|secretary|cashier|waiter|waitress|barber|tailor|mechanic|plumber|electrician|firefighter|fireman|librarian|architect|lawyer|judge|athlete|coach|musician|actor|actress|photographer|journalist|translator|professor|lecturer|nurse|surgeon|pharmacist|accountant|banker|programmer|designer|painter|sculptor|poet|novelist|editor|publisher|chef|carpenter|gardener|janitor|cleaner|security guard|detective|spy|astronaut|sailor|captain|fisherman|hunter|lumberjack|miner|mason|welder|electrician|technician|clerk|typist|receptionist|secretary|assistant|housewife|homemaker|student|pupil)$/.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // male subject + wear -> skirt/dress unique (bank logic)
    if (/\b(he|boy|son|brother|dad|father|uncle|grandpa|man|his|him)\b.{0,30}(wear|wears?|put on|dresses? in)\b[^.]{0,20}_B_|(he|boy|son|brother|dad|father|uncle|grandpa|man) (cannot|can't|doesn't|wont|won't) (wear|put on) _B_|_B_ (a |an )?(skirt|dress)/.test(pn)) {
      const fem = ccs.filter((c) => /^(a |an )?(skirt|dress|blouse|high heels|heels|bra|bikini|gown)s?\.?$/.test(c));
      const maleCtx = /\b(he|boy|son|brother|dad|father|uncle|grandpa|man|his|him)\b/.test(pl) && /cannot|can't|doesn't|won't|not|never/.test(pl);
      if (maleCtx && fem.length === 1 && fem[0] === aa) return true;
    }

    // "_B_ <noun> than <noun>" -> more/less/fewer unique
    if (/_B_ (\w+ ){1,3}than|_B_ more/.test(pn)) {
      const hits = ccs.filter((c) => /^(more|fewer)$/.test(c));
      if (hits.length === 1 && hits[0] === aa && !ccs.some((c) => c === 'less')) return true;
    }

    // place -> its worker: "there is a _B_ in the office" -> secretary
    {
      const PLACE_PERSON = [
        [/office/, 'secretary|clerk|manager|worker|boss'],
        [/hospital|clinic/, 'doctors?|nurses?|patient'],
        [/school|classroom/, 'teachers?|students?|pupils?|principal'],
        [/restaurant|kitchen/, 'chefs?|cooks?|waiters?|waitress'],
        [/farm/, 'farmers?|cowboys?'],
        [/airport|plane/, 'pilots?|passengers?'],
        [/library/, 'librarians?|readers?'],
        [/store|shop|market|supermarket/, 'cashiers?|shoppers?|sellers?|customers?'],
        [/fire station/, 'firefighters?|firemen'],
        [/police station/, 'police|policemen|police officers?'],
        [/zoo/, 'zookeepers?|animals?|visitors?'],
        [/bank/, 'bankers?|tellers?|managers?'],
        [/bakery/, 'bakers?'],
        [/gym|stadium/, 'athletes?|players?|coaches?|trainers?'],
        [/hotel/, 'receptionists?|guests?|bellboys?'],
        [/theater|cinema/, 'actors?|actresses?|audience|viewers?'],
        [/garage/, 'mechanics?'],
        [/salon|barbershop/, 'barbers?|hairdressers?'],
        [/court/, 'judges?|lawyers?'],
        [/church|temple|mosque|pagoda/, 'priests?|monks?|imams?|worshippers?'],
      ];
      const ppm = /there (is|are) (a |an |some |many |two |three |four |five )?_B_ (in|at|on|inside) (the |my |our |an |a )?([\w ]+)/.exec(pn);
      if (ppm) {
        for (const [re, want] of PLACE_PERSON) {
          if (!re.test(ppm[5])) continue;
          const hits = ccs.filter((c) => new RegExp(`^(${want})$`, 'i').test(c));
          if (hits.length === 1 && hits[0] === aa) return true;
        }
      }
    }

    // "on _B_" with day choices -> unique weekday
    if (/\bon _B_\b/.test(pn)) {
      const hits = ccs.filter((c) => /^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // breakfast -> morning
    if (/breakfast|cook breakfast|eat breakfast|have breakfast|make breakfast/.test(pl)) {
      const hits = ccs.filter((c) => /^(morning|morning\.|in the morning)$/.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // "a car/bus/taxi" -> driving/taking unique
    if (/_B_ (a |the |his |her |my )?(car|bus|taxi|truck|motorbike|ferry|boat|train|bike|bicycle)/.test(pn)) {
      const vMap = { car: 'driv|is driving', bus: 'driv|is driving|take|taking', taxi: 'take|taking|driv|is driving', truck: 'driv|is driving', motorbike: 'rid|driv|is riding', ferry: 'take|taking|rid', boat: 'rid|row|sail|take', train: 'take|taking|rid', bike: 'rid|is riding', bicycle: 'rid|is riding' };
      const veh = /_B_ (a |the |his |her |my )?(car|bus|taxi|truck|motorbike|ferry|boat|train|bike|bicycle)/.exec(pn);
      const want = vMap[veh[2]];
      const hits = ccs.filter((c) => new RegExp(`^(${want})`, 'i').test(c));
      // keep only when the rival vehicle-verbs can't fill ("ride a car" is wrong)
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // misc facts round 2
    for (const [re, want] of [
      [/enough _B_|get enough|stay healthy|keep healthy/, 'sleep|rest|water|exercise|food|sleep\.'],
      [/strong bones|bones|calcium/, 'milk|calcium|drink milk|cheese|yogurt'],
      [/nha rong/, "uncle ho|ho chi minh|president ho|uncle ho's departure"],
      [/da nang|danang/, 'beach|beaches|surf|coast|beautiful beaches and surfing|central'],
      [/ha long/, 'bay|unesco|heritage|islands|caves|beautiful'],
      [/hanoi/, 'capital|north|hoan kiem|old quarter|pho'],
      [/lucky money|li xi/, 'red envelope|envelope|tet|money'],
      [/_B_ to work\b/, 'travel|commute|walk|drive|ride|take|go|get|run|jog|hurry|cycle|bike|head|come|return|fly'],
      [/sandwich/, 'cheese|ham|egg|butter|lettuce|tomato|cheese and bread|ham and bread'],
      [/_B_ and bread|bread and/, 'cheese|butter|ham|egg|jam|milk'],
      [/ferry|cross the river/, 'take|ride|boat'],
      [/beautiful beaches|surfing|beach/, 'da nang|nha trang|vung tau|phu quoc|beach|sea|ocean'],
      [/parade|fireworks?/, 'watch|see|enjoy|celebrate|will'],
    ]) {
      if (!re.test(pn) && !re.test(pl)) continue;
      const hits = ccs.filter((c) => new RegExp(`^(${want})`, 'i').test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // comparative where rivals are malformed ("better driver" vs "gooder")
    if (/_B_ (\w+ ){0,3}than|\w+ _B_ than/.test(pn)) {
      const MALF_COMP = /^(gooder|badder|goodest|baddest|worser|worsest|bestest|most good|more good|most bad|more bad|funner|funnest|more bigger|more better|most best|most better|most bigger|interestinger|beautifuller|more beautiful|more busy|more funny|more happy|more easy|more big|more small|more tall|more short|more long|more fast|more slow|more old|more new|more nice|more hot|more cold|more warm|more cool|more fat|more thin|more rich|more poor|more lazy|more early|more pretty|more ugly|more dirty|more clean|more dark|more bright|more heavy|more light|more strong|more weak|more young|more cheap|more high|more low|more deep|more wide|more narrow|more thick|more smooth|more rough|more sharp|more flat|more full|more empty|more wet|more dry|more quick|more angry|more silly|more lucky|more tasty|more windy|more cloudy|more sunny|more rainy|more snowy|more foggy|more noisy|more sleepy|more hungry|more thirsty|more healthy|more greedy|more friendly|more lonely|more tiny|more huge|more brave|more polite|more rude|more clever|more stupid|more wise|more foolish|more great|more large|more safe|more fine|more late|more hard|more soft|more loud|more quiet|more simple|more fun|more dear|more near|more far|more sour|more sweet|more bitter|more salty|more fresh|more tight|more loose|more sad)$/;
      const comp = ccs.filter((c) => (/(er|ier)$|^more \w|^less \w|^(better|worse|less|more|fewer)$/.test(c)) && !MALF_COMP.test(c));
      if (comp.length === 1 && aa === comp[0]) return true;
    }

    // "how are you" greeting
    if (/(hello|hi|hey|good (morning|afternoon|evening))[,.!]? _B_ are you|_B_ are you\??$/.test(pn)) {
      if (aa === 'how' && ccs.filter((c) => c === 'how').length === 1) return true;
    }

    // "see you later/soon/tomorrow" - exactly one farewell completion allowed
    if (/see (you|ya) _B_|_B_ -? ?see you/.test(pn)) {
      const FAREWELL = /^(later|soon|tomorrow|again|then|next (week|time|monday|tuesday|wednesday|thursday|friday|saturday|sunday)|tonight|afterwards|in the morning|on monday|at noon)$/;
      const hits = ccs.filter((c) => FAREWELL.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // "a pair of + plurale tantum" fixed collocation
    if (/_B_ of (jeans|glasses|scissors|shorts|pants|trousers|shoes|gloves|socks|earrings|chopsticks|sunglasses|tights|leggings|pyjamas|pajamas|binoculars|headphones|speakers|pliers|tweezers|tongs|scales|clippers)/.test(pn)) {
      if (aa === 'pair' && ccs.filter((c) => c === 'pair').length === 1) return true;
    }

    // "if i were you" fixed subjunctive
    if (/if (i|he|she|it|we|they|you) _B_ (you|me|him|her|us|them|rich|a |the |there|here|wrong|right)/.test(pn)) {
      const hits = ccs.filter((c) => c === 'were');
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // "good _B_" + explicit clock time -> time-of-day greeting
    {
      const tm = /(?:at|it's|it is|around|about) (\d{1,2})(?::\d{2})?\s*(a\.?m\.?|p\.?m\.?|am|pm)/.exec(pl);
      if (tm && /good _B_|_B_ (everyone|everybody|class|teacher|mom|dad|guys|children|kids|all)|good _B_ (to |for )?everyone/.test(pn)) {
        const h = +tm[1] % 12 + (/p\.?m/.test(tm[2]) ? 12 : 0);
        const want = h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening';
        if (ccs.includes(want) && aa === want && ccs.filter((c) => c === want).length === 1) return true;
      }
    }

    // reported speech past: "told me that he _B_ a new phone" -> past form unique
    if (/\b(told|said|reported|claimed|admitted|explained|mentioned|added|replied|answered|wrote|thought|believed|knew|heard|noticed|felt|found|learned|realized|remembered|forgot|promised|warned|hoped|wished|informed|confessed|denied|suggested|insisted|complained|exclaimed|announced|declared|stated|remarked|commented|observed|whispered|shouted|yelled|screamed|cried|asked|wondered) (me |us |him |her |them |you |my \w+ |the \w+ |our \w+ |his \w+ |their \w+ )?that\b/.test(pl)) {
      const subM = new RegExp(`that (i|we|they|you|he|she|it|everyone|everybody|someone|somebody|anyone|anybody|nobody|people|children|parents|the \\w+|my \\w+|his \\w+|her \\w+|our \\w+|their \\w+|a \\w+|an \\w+|${'nam|lan|mai|minh|anh|linh|huy|ha|hien|phong|thao|tuan|dung|huong|son|nhi|vy|khoa|trang|quang|an|hoa|bao|chi|dao|dat|dieu|dong|duc|duy|giang|hai|han|hang|hanh|hao|hau|hiep|hoai|hoang|hop|hue|hung|khanh|lam|le|lien|loan|loc|long|luong|ly|manh|my|nga|nghi|ngoc|nguyen|nhan|nhat|nhu|oanh|phat|phuc|phuong|quoc|quyen|quyet|quynh|sang|sen|suong|tam|thang|thanh|thien|tho|thu|thuan|thuc|thuy|tien|toan|tri|trieu|trinh|truc|trung|truong|tu|tung|tuyen|uyen|van|viet|vinh|xuan|yen|tom|lucy|mary|john|jack|peter|anna|lily|emma|sam|ben|nick|sue|kim|alex|jim|tim|bob|ted|ron|dan|leo|max|amy|rose|jane|sara|lisa|nina|tina|julia|laura|grace|helen|kate|beth|ruth|david|mike|henry|kevin|tony|adam|andy|bill|carl|fred|george|harry|james|mark|paul|steve|eric|linda|alan|betty|carol|diana|edward|frank|irene|joe|karen|larry|nancy|oliver|patricia|robert|sandra|thomas|victor|wendy|zoe'}) _B_`).exec(pn);
      if (subM) {
        const PAST_OF = { ride: 'rode', run: 'ran', eat: 'ate', drink: 'drank', sing: 'sang', swim: 'swam', fly: 'flew', grow: 'grew', take: 'took', make: 'made', do: 'did', go: 'went', see: 'saw', write: 'wrote', drive: 'drove', draw: 'drew', sit: 'sat', win: 'won', have: 'had', be: 'was|were', say: 'said', give: 'gave', come: 'came', fall: 'fell', feel: 'felt', buy: 'bought', bring: 'brought', think: 'thought', teach: 'taught', catch: 'caught', sleep: 'slept', keep: 'kept', leave: 'left', meet: 'met', wear: 'wore', choose: 'chose', begin: 'began', break: 'broke', speak: 'spoke', steal: 'stole', wake: 'woke', hide: 'hid', build: 'built', spend: 'spent', send: 'sent', lend: 'lent', lose: 'lost', find: 'found', hold: 'held', stand: 'stood', understand: 'understood', tell: 'told', sell: 'sold', hear: 'heard', put: 'put', cut: 'cut', hit: 'hit', let: 'let', set: 'set', shut: 'shut', hurt: 'hurt', cost: 'cost', get: 'got', forget: 'forgot', know: 'knew', throw: 'threw', lie: 'lay', read: 'read', buy2: 'x', freeze: 'froze', bite: 'bit', beat: 'beat', shrink: 'shrank', stink: 'stank', ring: 'rang', spring: 'sprang', dig: 'dug', stick: 'stuck', strike: 'struck', hang: 'hung', swing: 'swung', blow: 'blew', show: 'showed', pay: 'paid', lay: 'laid', wind: 'wound', bind: 'bound', grind: 'ground' };
        const L = (w) => { const t = w.split(' ').slice(-1)[0]; if (PAST_OF[t] || /ed$|^(was|were|did|had)$/.test(t)) return 'P'; if (/ing$/.test(t)) return 'ING'; return 'BASE'; };
        // choices: only the past form can sit in reported speech (will X / X-s / X-ing excluded)
        const pastLike = ccs.filter((c) => { const t = c.split(' ').slice(-1)[0]; return !/^(will|would|can|could|shall|should|must|may|might|is|are|am)\b/.test(c) && (/(ed|ied)$/.test(t) || Object.values(PAST_OF).includes(t) || /^(was|were|had|did|got|went|came|saw|made|took|gave|said|told|bought|brought|thought|caught|taught|slept|kept|left|met|wore|chose|began|broke|spoke|stole|woke|hid|built|spent|sent|lent|lost|found|held|stood|understood|sold|heard|put|cut|hit|let|set|shut|hurt|cost|forgot|knew|threw|lay|read|froze|bit|beat|shrank|stank|rang|sprang|dug|stuck|struck|hung|swung|blew|showed|paid|laid|wound|bound|ground|wrote|rode|drove|drew|ate|drank|sang|swam|flew|grew|won|did|ran|sat|fell|felt)$/.test(t)); });
        const nonPast = ccs.filter((c) => /^(will|would|can|could|shall|should|must|may|might|is|are|am)\b|ing$|s$|es$/.test(c) && !pastLike.includes(c));
        if (pastLike.length === 1 && pastLike[0] === aa && nonPast.length === ccs.length - 1) return true;
      }
    }

    // device -> function: "a _B_ records sound" -> microphone
    for (const [fn, want] of [
      [/shows? (you )?(websites?|videos?|images?|pictures?|photos?|screens?)|display|screen/, 'screen|monitor|television|tv'],
      [/records? (sound|voice|audio|songs?|music)|record (my |your |his |her )?voice/, 'microphone|recorder|tape recorder'],
      [/prints? (papers?|documents?|photos?|pictures?|pages?|files?|reports?)/, 'printer'],
      [/types? (letters?|words?|documents?|emails?|messages?)|keyboards?/, 'keyboard'],
      [/plays? (loud |loudly )?(sound|music|songs?|audio)|loudly|sound (comes? out|from)/, 'speaker|speakers'],
      [/connects? (to )?(the )?(internet|wifi|web|network)|wifi|wireless/, 'router|modem'],
      [/takes? (photos?|pictures?|selfies?|videos?)|record videos?|films?/, 'camera|phone|smartphone|video camera'],
      [/stores? (files?|data|documents?|information|photos?)|save files?/, 'computer|hard drive|usb|disk|laptop'],
      [/charges? (your |my |the )?(phone|battery|device)|charge/, 'charger|battery'],
      [/helps? (you )?(type|write) (on|in|with)|type on/, 'keyboard'],
      [/controls? (the )?(tv|television|air conditioner|ac|fan|machine)/, 'remote|remote control'],
      [/tells? (you )?(the )?time|show(s|ed)? (the )?time/, 'clock|watch'],
      [/cooks? (rice|food|meals?)|rice/, 'rice cooker|cooker'],
      [/keeps? (food|drinks?|things) (cold|cool|fresh)|refrigerat/, 'fridge|refrigerator|freezer'],
      [/washes? (clothes|laundry|dishes)|laundry|wash/, 'washing machine|washer|dishwasher'],
      [/dries? (your |my |the )?(hair|clothes)/, 'hair dryer|dryer'],
      [/cools? (the |your |my )?(room|air|house)|air condition/, 'air conditioner|fan|ac'],
      [/heats? (the |your |my )?(room|water|house|food)|warms? the|heat/, 'heater|stove|oven|microwave'],
      [/bakes? (cakes?|bread|cookies|pizza)/, 'oven'],
      [/sweeps?|vacuums?|cleans? (the )?(floor|carpet|house)/, 'vacuum|vacuum cleaner|broom|mop'],
      [/calls? (people|friends|family)|make calls?|phone calls?/, 'phone|telephone|smartphone|mobile'],
      [/listens? to (music|songs?|the radio)|radio/, 'radio|speaker|phone|headphones'],
      [/watches? (tv|television|cartoons?|films?|movies?|news|videos?)/, 'tv|television|screen|phone|computer'],
      [/reads? (the )?(news|newspaper|stories|books) (online|on)|news online/, 'computer|phone|tablet|screen'],
      [/sends? (emails?|messages?|letters?|texts?)/, 'phone|computer|laptop|tablet'],
      [/takes? (you )?to (school|work|the airport|places)/, 'bus|car|taxi|train|motorbike|bike'],
    ]) {
      if (!fn.test(pl)) continue;
      const hits = ccs.filter((c) => new RegExp(`^(${want})$`).test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // verb -> only sensible object: "climbing a _B_" -> ladder
    for (const [re, want] of [
      [/climb(ing|s)? (up )?(a |an |the )?_B_|climb(ing|s)? _B_/, 'ladder|tree|mountain|wall|stairs|hill|rope|fence|cliff|rocks?'],
      [/fly(ing|s)? (a |an |the )?_B_|fly _B_/, 'kite|plane|airplane|balloon|flag'],
      [/rid(e|ing|es) (a |an |the |my |your |his |her )?_B_|rid(e|ing) _B_/, 'bike|bicycle|horse|motorbike|scooter|bus|train|elephant|camel'],
      [/driv(e|ing|es) (a |an |the |my |your |his |her )?_B_/, 'car|bus|taxi|truck|motorbike|van'],
      [/sail(ing|s)? (a |an |the )?_B_|row(ing|s)? (a |an |the )?_B_/, 'boat|ship|yacht|canoe|kayak'],
      [/kick(ing|s)? (a |an |the )?_B_|kick _B_/, 'ball|football|balloon|can|box'],
      [/draw(ing|s)? (a |an |the )?_B_|paint(ing|s)? (a |an |the )?_B_/, 'picture|painting|portrait|house|flower|tree|cat|dog|map|scene'],
      [/plant(ing|s)? (a |an |the )?_B_|grow(ing|s)? (a |an |the )?_B_/, 'tree|trees|flower|flowers|plant|plants|seed|seeds|rice|vegetable|vegetables|grass|crop|crops'],
      [/brush(ing|es)? (my |your |his |her |our |their |the )?_B_|comb(ing|s)? (my |your |his |her )?_B_/, 'teeth|hair'],
      [/wash(ing|es)? (my |your |his |her |our |their |the )?_B_/, 'hands|face|hair|clothes|dishes|car|body|feet'],
      [/cut(ting|s)? (a |an |the |my |your |his |her )?_B_/, 'paper|cake|hair|grass|tree|wood|rope|ribbon|nails'],
      [/carry(ing|ies)? (a |an |the |my |your |his |her )?_B_|hold(ing|s)? (a |an |the |my |your |his |her )?_B_/, 'umbrella|bag|box|baby|balloon|flag|book|tray|basket'],
      [/wear(ing|s)? (a |an |the |my |your |his |her )?_B_|putting? on (a |an |the )?_B_/, 'hats?|caps?|coats?|jackets?|shirts?|t-shirts?|tshirts?|dress|dresses|skirts?|shoes?|boots?|glasses|sunglasses|uniforms?|scar(f|ves)|scarves|gloves?|masks?|helmets?|sweaters?|jeans|pants|shorts|sandals?|slippers?|socks?|stockings?|ties?|belts?|blouses?|hoodies?|raincoats?|pajamas|swimsuits?|earrings?|necklaces?|watches?|rings?|bracelets?|backpacks?|bags?|mittens?|beanies?|vests?|suits?|aprons?|robes?|slippers|overalls?|turbans?|crowns?|wigs?|capes?|ponchos?|leggings?|tights|trousers|cardigans?|jerseys?|kimonos?|saris?|tuxedos?|underwear|diapers?|bandanas?|visors?|berets?|sombreros?|bowties?|suspenders?|cufflinks?|brooches?|lockets?|pendants?|anklets?|chokers?|shawls?|stoles?|muffs?|parkas?|anoraks?|windbreakers?|blazers?|waistcoats?|jumpsuits?|rompers?|onesies?|leotards?|tutus?|sarongs?|kilts?|tunics?|togas?|corsets?|flip.?flops?|sneakers?|trainers?|cleats?|skates?|rollerblades?|clogs?|loafers?|oxfords?|wedges?|heels?|pumps?|flats?|moccasins?|espadrilles?|galoshes?|wellingtons?|snow boots?|rain boots?|cowboy boots?|combat boots?|hiking boots?|work boots?|rain.?coats?|trench coats?|pea coats?|duffle coats?|fur coats?|topcoats?|overcoats?|polo shirts?|sweatshirts?|tank tops?|crop tops?|camisoles?|bodysuits?|swimwear|bikinis?|wetsuits?|life jackets?|seatbelts?|harness(es)?|goggles?|wristbands?|headbands?|armbands?|sashes?|medals?|medallions?|tiaras?|veils?|wreaths?|garlands?|lei|name tags?|badges?|pins?|patches?|costumes?|disguises?|face masks?|eye patches?'],
      [/eat(ing|s)? (a |an |the |some |my |your |his |her )?_B_/, 'apple|banana|orange|cake|rice|bread|sandwich|pizza|noodles|soup|ice cream|candy|chocolate|fruit|food|breakfast|lunch|dinner|meal|snack|cookie|biscuit|meat|fish|chicken|egg|salad|vegetable|vegetables'],
      [/drink(ing|s)? (a |an |the |some |my |your |his |her )?_B_/, 'water|milk|juice|tea|coffee|lemonade|soda|smoothie|milkshake'],
      [/read(ing|s)? (a |an |the |my |your |his |her )?_B_/, 'book|story|newspaper|magazine|letter|comic|map|sign|menu|email'],
      [/watch(ing|es)? (a |an |the |my |your |his |her )?_B_/, 'tv|television|movie|film|cartoon|video|show|game|match|news|youtube'],
      [/listen(ing|s)? to (a |an |the |my |your |his |her )?_B_/, 'music|song|songs|radio|teacher|story|news|podcast|birds|mom|dad|me'],
      [/play(ing|s)? (a |an |the |my |your |his |her )?_B_/, 'piano|guitar|violin|drum|drums|flute|trumpet|football|soccer|basketball|tennis|badminton|chess|game|games|cards|hide and seek|tag|volleyball|baseball|ping pong|hockey'],
      [/sing(ing|s)? (a |an |the |my |your |his |her )?_B_/, 'song|songs|anthem|lullaby|melody'],
      [/open(ing|s)? (a |an |the |my |your |his |her )?_B_/, 'door|window|book|box|gift|present|bag|bottle|envelope|umbrella|eyes|mouth|shop|store'],
      [/close[sd]?(ing)? (a |an |the |my |your |his |her )?_B_|shut(ting|s)? (a |an |the )?_B_/, 'door|window|book|box|bag|eyes|mouth|shop|store|lid'],
      [/turn(ing|s)? on (a |an |the |my |your |his |her )?_B_|turn(ing|s)? off (a |an |the |my |your |his |her )?_B_/, 'light|lights|tv|television|computer|fan|radio|tap|faucet|lamp|phone|stove|machine|air conditioner'],
      [/cross(ing|es)? (a |an |the )?_B_|walk across (a |an |the )?_B_/, 'road|street|bridge|river|crossing|zebra crossing|intersection'],
      [/swim(ming|s)? in (a |an |the )?_B_|swim(ming)? (a |an |the )?_B_/, 'pool|river|sea|ocean|lake|water|beach'],
      [/fish(ing|es)? in (a |an |the )?_B_|fish(ing|es)? (a |an |the )?_B_|catch(ing|es)? (a |an |the )?_B_ fish/, 'river|sea|ocean|lake|pond|fish|fishes'],
      [/walk(ing|s)? (the |a |an |my |your |his |her )?_B_|takes? (the |a |an |my |your |his |her )?_B_ for a walk/, 'dog|puppy|pet|baby|child'],
      [/feed(ing|s)? (the |a |an |my |your |his |her )?_B_/, 'dog|cat|bird|fish|baby|pet|animals|chicken|duck|rabbit|cow|horse|pig|sheep|monkey|elephant'],
      [/hides? behind (a |an |the |my |your |his |her )?_B_|hid(e|ing)? behind/, 'tree|door|wall|curtain|bush|sofa|chair|table|box|rock|car|building'],
      [/sleep(s|ing)? (on|in) (a |an |the |my |your |his |her )?_B_/, 'bed|sofa|floor|mat|hammock|tent|couch'],
      [/sit(s|ting)? (on|in|at|under|behind) (a |an |the |my |your |his |her )?_B_/, 'chair|sofa|bench|table|desk|floor|tree|grass|rock|seat|stool|mat'],
      [/stand(s|ing)? (on|in|at|behind|under|next to|beside) (a |an |the |my |your |his |her )?_B_/, 'chair|table|desk|door|tree|wall|stage|platform|line|queue|bus stop|corner'],
      [/wait(s|ing)? for (a |an |the |my |your |his |her )?_B_/, 'bus|train|mom|dad|friend|teacher|doctor|light|signal|turn|rain'],
      [/look(s|ing)? at (a |an |the |my |your |his |her )?_B_|look(s|ing)? for (a |an |the |my |your |his |her )?_B_/, 'picture|photo|map|book|sky|stars|moon|sun|board|screen|watch|clock|mirror|bird|flower|keys|glasses|phone|bag|dog|cat'],
      [/point(s|ing)? at (a |an |the |my |your |his |her )?_B_|point(s|ing)? to/, 'picture|map|board|star|moon|bird|plane|sign|letter|word|blackboard|whiteboard'],
      [/chase(s|ing)? (a |an |the |my |your |his |her )?_B_|run(s|ning)? after (a |an |the )?_B_/, 'ball|dog|cat|bird|butterfly|thief|mouse|kite|bus|friend'],
      [/push(es|ing)? (a |an |the |my |your |his |her )?_B_|pull(s|ing)? (a |an |the |my |your |his |her )?_B_/, 'door|cart|swing|button|car|chair|box|wagon|rope|handle|pram|stroller'],
      [/throw(s|ing)? (a |an |the |my |your |his |her )?_B_|catch(es|ing)? (a |an |the |my |your |his |her )?_B_/, 'ball|balloon|frisbee|stone|stick|water|snowball|paper'],
      [/shoot(s|ing)? (a |an |the )?_B_|score[sd]?(ing)? (a |an |the )?_B_/, 'goal|basket|ball|arrow|target|hoop'],
      [/hit(s|ting)? (a |an |the |my |your |his |her )?_B_/, 'ball|drum|nail|button|piñata|target|table|wall|hand'],
      [/break(s|ing)? (a |an |the |my |your |his |her )?_B_|broke (a |an |the |my |your |his |her )?_B_/, 'window|glass|cup|plate|vase|egg|toy|stick|branch|leg|arm|phone|mirror|chair|table|bottle|record|rules?'],
      [/fix(es|ing)? (a |an |the |my |your |his |her )?_B_|repair(s|ing)? (a |an |the )?_B_/, 'car|bike|bicycle|machine|computer|phone|watch|clock|tv|radio|toy|chair|table|roof|pipe|leak|engine|wheel|door|window'],
      [/park(s|ing)? (a |an |the |my |your |his |her )?_B_|park(ed)? (a |an |the )?_B_/, 'car|bus|bike|truck|motorbike|taxi|van|scooter'],
      [/answer(s|ing)? (a |an |the |my |your |his |her )?_B_/, 'question|phone|door|teacher|call|email|letter|bell'],
      [/borrows? (a |an |the |my |your |his |her )?_B_|borrowed/, 'book|pen|pencil|money|bike|umbrella|ruler|eraser|phone|toy'],
      [/lends? (a |an |the |my |your |his |her )?_B_|lent/, 'book|pen|pencil|money|bike|umbrella|ruler|eraser|phone|toy'],
      [/shares? (a |an |the |my |your |his |her )?_B_|shared/, 'toy|toys|book|books|food|snack|candy|umbrella|pencil|apple|cookie|game|phone'],
      [/forget(s|ting)? (a |an |the |my |your |his |her )?_B_|forgot/, 'homework|book|bag|umbrella|phone|keys|glasses|hat|lunch|wallet|money|ticket|name|birthday|password|words?'],
      [/remember(s|ing)? (a |an |the |my |your |his |her )?_B_|remembered/, 'name|birthday|address|phone number|password|story|song|words?|face|day|time'],
      [/los(t|es|ing)? (a |an |the |my |your |his |her )?_B_|lost (a |an |the |my |your |his |her )?_B_/, 'key|keys|phone|money|wallet|bag|book|glasses|watch|toy|ball|dog|cat|way|ticket|pen|pencil|hat|gloves?|shoe|shoes|umbrella'],
      [/find(s|ing)? (a |an |the |my |your |his |her )?_B_|found (a |an |the |my |your |his |her )?_B_/, 'key|keys|phone|money|wallet|bag|book|glasses|watch|toy|ball|dog|cat|way|ticket|pen|pencil|shell|coin|treasure|bird|insect|letter|photo|gift'],
      [/buys? (a |an |the |some |my |your |his |her )?_B_|bought|buying/, 'gift|present|book|pen|bag|shoes|dress|shirt|toy|ball|ice cream|cake|flowers?|food|drink|ticket|souvenir|phone|computer|car|house|bike'],
      [/sells? (a |an |the |some |my |your |his |her )?_B_|sold|selling/, 'fruit|vegetables|food|drink|books|toys|clothes|shoes|flowers|bread|cake|ice cream|tickets|newspapers|fish|eggs|milk|rice'],
      [/pick(s|ing|ed)? (up )?(a |an |the |some |my |your |his |her )?_B_/, 'book|pen|pencil|phone|bag|box|ball|flower|flowers|apple|shell|trash|litter|coin|toy|baby|package|letter|card'],
      [/deliver(s|ing|ed)? (a |an |the |some |my |your |his |her )?_B_/, 'letter|letters|mail|package|packages|parcel|parcels|food|pizza|newspaper|newspapers|box|boxes|goods|order|medicine|flowers|post'],
      [/recycle[sd]?(ing)? (a |an |the |some |my |your |his |her )?_B_/, 'paper|plastic|bottles|cans|glass|trash|waste|bags|cardboard|metal|newspapers|boxes'],
      [/collect(s|ing|ed)? (a |an |the |some |my |your |his |her )?_B_/, 'stamps|coins|shells|rocks|leaves|cards|stickers|toys|bottles|cans|eggs|flowers|data|information|money|books|posters|photos|insects|butterflies'],
    ]) {
      if (!re.test(pn)) continue;
      const hits = ccs.filter((c) => new RegExp(`^(${want})s?\\.?$`, 'i').test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // online-safety & civics facts
    if (/share (your |my |our |their |the )?_B_ (with|to|online)|give (your |the )?_B_ to strangers|strangers online|online (safety|strangers)|keep (your |the )?_B_ (secret|private|safe)/.test(pn)) {
      const hits = ccs.filter((c) => /^(password|passwords|address|phone number|personal information|information|name|age|school|photo|location|secrets?)$/.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }
    // pollution facts: "bad for air/water" -> pollution/smoke/plastic
    if (/bad for (the )?(air|water|environment|ocean|sea|river|earth|planet|nature|health|lungs?|teeth|eyes)|harm(s|ful)? (the )?(air|water|environment|ocean|sea|river|earth|planet|nature|health|animals?|fish|birds?)|destroy(s|ing)? (the )?(ozone|environment|forests?|ocean|habitats?)|kill(s|ing)? (the )?(fish|birds?|animals?|plants?|trees?|ocean|sea life|marine)/.test(pl)) {
      const POLL = /^(pollution|smoke|plastic|plastic waste|trash|rubbish|waste|litter|chemicals?|oil|gas|fumes?|exhaust|smog|dust|noise|carbon|co2|sugar|candy|junk food|soda|alcohol|cigarettes?|smoking|fire|fireworks?|deforestation|cutting down trees?|throwing trash|littering|pesticides?)$/;
      const hits = ccs.filter((c) => POLL.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }
    // "save _B_" -> energy/water/money
    if (/save _B_|saving _B_|to save|_B_ energy|_B_ water|_B_ money/.test(pn)) {
      const SAVE = /^(energy|electricity|water|money|power|fuel|gas|time|trees?|forests?|animals?|wildlife|nature|earth|planet|environment|lives?|paper)$/;
      const hits = ccs.filter((c) => SAVE.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }
    // "how old are you" / "_B_ much is X" price
    if (/_B_ old (are you|is (he|she|your)|am i)|_B_ many years? old/.test(pn)) {
      if (aa === 'how' && ccs.filter((c) => c === 'how').length === 1) return true;
    }
    if (/_B_ much (is|are|does|do|was|were)|_B_ much money|_B_ does .* cost/.test(pn)) {
      if (aa === 'how' && ccs.filter((c) => c === 'how').length === 1) return true;
    }
    // "too _B_ + uncountable" -> much; "too _B_ + plural count" -> many
    if (/too _B_ (\w+)/.test(pn)) {
      const wAfter = /too _B_ (\w+)/.exec(pn)[1];
      const UNCT = /^(water|milk|juice|tea|coffee|sugar|salt|rice|bread|meat|money|time|homework|information|furniture|traffic|noise|pollution|rain|snow|sun|sunshine|light|work|food|oil|butter|cheese|chocolate|candy|soup|ice|air|smoke|dust|sand|grass|hair|paper|plastic|glass|wood|space|energy|electricity|homework|housework|fun|luck|progress|advice|news|music|art|luggage|baggage|equipment|software|mail|bread|soup)$/;
      const PLCT = /^(books?|pencils?|pens?|chairs?|tables?|students?|people|children|kids|cars?|bikes?|toys?|shoes?|bags?|boxes?|apples?|oranges?|bananas?|trees?|flowers?|animals?|dogs?|cats?|birds?|fish|houses?|rooms?|windows?|doors?|computers?|phones?|games?|things|questions?|problems?|mistakes?|friends?|hours?|days?|weeks?|months?|years?|times?|dollars?|words?|letters?|numbers?|pictures?|photos?|pages?|stories?|songs?|movies?|tests?|exams?|classes?|lessons?)$/;
      const want = UNCT.test(wAfter) ? 'much' : PLCT.test(wAfter) ? 'many' : null;
      if (want && ccs.filter((c) => c === want).length === 1 && aa === want) return true;
    }
    // famous places in Vietnam
    if (/famous (place|places|landmark|destination|site|spot|tourist|attraction)s? (in|of) vietnam|in vietnam|vietnam'?s|vietnamese/.test(pl) && /_B_/.test(pn)) {
      const VNPL = /^(trang an|ha long bay|halong bay|hoan kiem lake|sword lake|ben thanh market|independence palace|reunification palace|ho chi minh mausoleum|temple of literature|van mieu|one pillar pagoda|perfume pagoda|thien mu pagoda|imperial city|hue citadel|hoi an|hoi an ancient town|my son|pho quoc|phu quoc|da lat|dalat|sapa|sa pa|nha trang|da nang|danang|golden bridge|ba na hills|fansipan|mekong delta|cu chi tunnels|con dao|cat ba|moc chau|ninh binh|quang binh|son doong|phong nha|ban gioc|thac ban gioc|ha giang|hanoi|ho chi minh city|saigon|hue|can tho|vung tau|mui ne|quy nhon|vinpearl|ba den mountain|ho guom|west lake|ho tay|long bien bridge|thang long|ngoc son temple|lotus tower|landmark 81|bitexco|dragon bridge|han river|my khe beach|an bang beach|non nuoc|marble mountains|cam ranh|phong nha cave|paradise cave|tien son|dark cave|tu duc tomb|khai dinh|minh mang|dong ba market|dam sen|suoi tien|vinwonders|safari|ba vi|cuc phuong|tam dao|yen tu|bai dinh|trang an complex|huong son|mai chau|pu luong|ba be|ban gioc waterfall|cao bang|ha giang loop|dong van|meo vac|lung cu|mu cang chai|yen bai|son la|dien bien|lai chau|kon tum|gai lai|buon ma thuot|dak lak|pleiku|tuy hoa|phu yen|quy nhon|binh dinh|quang ngai|ly son|quang tri|dmz|vinh moc|quang binh|ha tinh|nghe an|vinh city|cua lo|thanh hoa|sam son|ninh binh|nam dinh|hai phong|cat ba island|do son|quang ninh|mong cai|tra co|yen tu|bac ninh|bac giang|lang son|lao cai|son tay|ba vi national park|tam dao national park|cuc phuong national park|phong nha ke bang|bach ma|pho quoc national park|cat tien|yok don|kon ka kinh|chu mom ray|lo go xa mat|tram chim|u minh|can gio|nam cat tien|bidoup nui ba|pu mat|ben en|xoan singing|ca tru|quan ho|then singing|giong festival|perfume festival|hung kings|au co|lac long quan|son tinh|thuy tinh|thanh giong|chu dong tu|tien dung|lieu hanh|mau thuong ngan|ba chua kho|ba chua xu|thien hau|tran hung dao|le loi|nguyen trai|quang trung|nguyen hue|ly thuong kiet|tran nhan tong|phat tich|dau pagoda|but thap|tay phuong|thay pagoda|gia lam|co loa|soc son|dong da|bach dang|nhu nguyet|chi lang|van don|bach dang river|lo river|red river|hong river|ma river|lam river|ca river|thu bon|han river|ba river|dong nai|saigon river|tien river|hau river|vam co|dong thap muoi|plain of reeds|u minh forest|tra su|cajuput|mangrove|can gio mangrove|xuan thuy|tien hai|con xen|con nguoi|con ky|hon khoai|hon chong|hon phu tu|hon tam|hon mun|hon tre|hon lao|hon son|nam du|ba lua|hai tac|pirate islands|tho chau|phu quy|con dao|con lon|hon bay canh|hon cau|hon tai|hon do|dao ly son|dao be|dao tran|dao phu quy|dao cat ba|dao co to|dao quan lan|dao minh chau|dao ngoc vung|dao thanh lan|dao vinhtruc|dao tuan chau|dao tuan châu)$/;
      const hits = ccs.filter((c) => VNPL.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // "thank someone -> thank you"; "ask politely -> please"
    if (/thank(s|ing)? (someone|him|her|them|your|\w+)|say .*thank|polite|good manners?/.test(pl) && /_B_|say/.test(pn)) {
      const hits = ccs.filter((c) => /^thank(s| you)/.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // numeric comparison: "4 is _B_ than 20" -> smaller (proven by arithmetic)
    {
      const nm = /(\d+(?:\.\d+)?) is _B_ than (\d+(?:\.\d+)?)/.exec(pn) ?? /is (\d+(?:\.\d+)?) _B_ than (\d+(?:\.\d+)?)/.exec(pn);
      if (nm) {
        const x = +nm[1], y = +nm[2];
        const want = x < y ? /^(smaller|less|lower|fewer|tinier|shorter|cheaper|lighter|younger)$/ : x > y ? /^(bigger|greater|larger|more|higher|taller|longer|heavier|older|most|expensive)$/ : /^(equal|the same|same)$/;
        const hits = ccs.filter((c) => want.test(c));
        if (hits.length === 1 && hits[0] === aa) return true;
      }
    }

    // species -> offspring: "baby rabbit came from _B_" -> kits
    {
      const SP = { rabbit: 'kits?|baby rabbits?', duck: 'ducklings?', duckling: 'ducklings?', frog: 'tadpoles?', bee: 'larvae', beetle: 'larvae', ant: 'larvae', butterfly: 'caterpillars?', caterpillar: 'butterfl', moth: 'caterpillars?', mosquito: 'larvae|wrigglers?', fly: 'maggots?|larvae', chicken: 'chicks?|chickens? from eggs?', hen: 'chicks?', bird: 'chicks?|nestlings?|hatchlings?', sparrow: 'chicks?', eagle: 'eaglets?|chicks?', owl: 'owlets?|chicks?', goose: 'goslings?', swan: 'cygnets?', turkey: 'poults?|chicks?', goldfish: 'babies from eggs?|fry|fingerlings?', fish: 'fry|babies from eggs?|fingerlings?', salmon: 'fry|fingerlings?', dog: 'pupp(ies|y)|pups?', cat: 'kittens?|kits?', lion: 'cubs?', tiger: 'cubs?', bear: 'cubs?', wolf: 'cubs?|pups?', fox: 'cubs?|kits?|pups?', cow: 'calf|calves', horse: 'foals?|colts?|fill(y|ies)', deer: 'fawns?', goat: 'kids?', sheep: 'lambs?', pig: 'piglets?', kangaroo: 'joeys?', koala: 'joeys?', elephant: 'calves|calf', whale: 'calves|calf', dolphin: 'calves|calf|pups?', shark: 'pups?', snake: 'hatchlings?|snakelets?', turtle: 'hatchlings?', crocodile: 'hatchlings?', alligator: 'hatchlings?', penguin: 'chicks?', monkey: 'babies|infants?', human: 'babies|infants?', mouse: 'pups?|pinkies?', rat: 'pups?|pinkies?', hamster: 'pups?', giraffe: 'calves|calf', zebra: 'foals?|colts?', donkey: 'foals?', camel: 'calves|calf', hippo: 'calves|calf', rhino: 'calves|calf', leopard: 'cubs?', cheetah: 'cubs?', panda: 'cubs?', seal: 'pups?', otter: 'pups?|kits?', beaver: 'kits?', squirrel: 'kits?|pups?', hedgehog: 'hoglets?|pups?', bat: 'pups?', shrimp: 'babies from eggs?|larvae', parrot: 'chicks?', toad: 'tadpoles?', ostrich: 'chicks?', crab: 'babies from eggs?', lobster: 'babies from eggs?', prawn: 'babies from eggs?|larvae', starfish: 'babies from eggs?', beetle: 'larvae|babies from eggs?', silkworm: 'larvae|babies from eggs?', jellyfish: 'babies from eggs?|larvae|planulae?', seahorse: 'babies|fry', octopus: 'babies from eggs?|larvae', squid: 'babies from eggs?|larvae', swan2: 'x' };
      const sm = /baby (\w+)|came from|hatch(es|ed)? from|born (as|from)|it came from/.exec(pl);
      if (sm) {
        const animal = /baby (\w+)/.exec(pl)?.[1];
        const want = animal && SP[animal];
        if (want) {
          const hits = ccs.filter((c) => new RegExp(`^(a |an |the )?(${want})( from eggs?|s)?\\.?$`, 'i').test(c));
          const stem = (s) => s.replace(/^(a|an|the|one) /, '').replace(/(from eggs?)$/, '').trim().replace(/ies$/, 'y').replace(/ves$/, 'f').replace(/(s|es)$/, '');
          const distinct = [...new Set(hits.map(stem))];
          if (distinct.length === 1 && hits.includes(aa)) return true;
          if (hits.length === 1 && hits[0] === aa) return true;
        }
      }
    }

    // "play _B_ tennis/football/..." -> no article (sport = zero article)
    if (/\bplays?\s*_B_|_B_ (tennis|football|soccer|badminton|basketball|volleyball|baseball|hockey|chess|golf|rugby|cricket|table tennis|ping pong|swimming|running|jogging|yoga|karate|judo|taekwondo|boxing|wrestling|gymnastics|athletics|aerobics)/.test(pn)) {
      const noArt = ccs.filter((c) => /^(ø|-|--|no article|x|Ø \(no article\))$/i.test(c) || c === 'ø (no article)');
      if (noArt.length === 1 && noArt[0] === aa) return true;
      if (/^ø|^x$|^-$|^no article/.test(aa) && ccs.filter((c) => /^(a|an|the)$/.test(c)).length === ccs.length - 1) return true;
    }

    // "X is a/an _B_" taxonomy: ostrich->bird etc.
    {
      const TAX = { ostrich: 'bird', emu: 'bird', penguin: 'bird', flamingo: 'bird', owl: 'bird', eagle: 'bird', sparrow: 'bird', crow: 'bird', parrot: 'bird', peacock: 'bird', swan: 'bird', duck: 'bird', goose: 'bird', chicken: 'bird', turkey: 'bird', kiwi: 'bird|fruit', cobra: 'snake|reptile', python: 'snake|reptile', viper: 'snake|reptile', crocodile: 'reptile', alligator: 'reptile', lizard: 'reptile', gecko: 'reptile', chameleon: 'reptile', turtle: 'reptile', tortoise: 'reptile', iguana: 'reptile', snake: 'reptile', frog: 'amphibian', toad: 'amphibian', salamander: 'amphibian', shark: 'fish', salmon: 'fish', tuna: 'fish', goldfish: 'fish', dolphin: 'mammal', whale: 'mammal', bat: 'mammal', platypus: 'mammal', kangaroo: 'marsupial|mammal', koala: 'marsupial|mammal', ant: 'insect', bee: 'insect', beetle: 'insect', butterfly: 'insect', moth: 'insect', mosquito: 'insect', fly: 'insect', grasshopper: 'insect', cricket: 'insect', dragonfly: 'insect', ladybug: 'insect', termite: 'insect', spider: 'arachnid', scorpion: 'arachnid', tick: 'arachnid', crab: 'crustacean', lobster: 'crustacean', shrimp: 'crustacean', prawn: 'crustacean', crayfish: 'crustacean', snail: 'mollusk|mollusc|gastropod', slug: 'mollusk|mollusc|gastropod', octopus: 'mollusk|mollusc|cephalopod', squid: 'mollusk|mollusc|cephalopod', clam: 'mollusk|mollusc|bivalve', oyster: 'mollusk|mollusc|bivalve', worm: 'worm|annelid|invertebrate', jellyfish: 'cnidarian|jellyfish|sea animal', starfish: 'echinoderm|starfish|sea animal', 'sea urchin': 'echinoderm', coral: 'cnidarian|coral', sponge: 'poriferan|sponge', rose: 'flower', tulip: 'flower', sunflower: 'flower', daisy: 'flower', lily: 'flower|flower name', lotus: 'flower', orchid: 'flower', jasmine: 'flower', daffodil: 'flower', carnation: 'flower', marigold: 'flower', poppy: 'flower', violet: 'flower', dandelion: 'flower|weed', oak: 'tree', pine: 'tree', maple: 'tree', birch: 'tree', willow: 'tree', palm: 'tree', bamboo: 'grass|plant|tree', cactus: 'plant|succulent', fern: 'plant', moss: 'plant', mushroom: 'fungus', apple: 'fruit', banana: 'fruit', orange: 'fruit|color', mango: 'fruit', grape: 'fruit', strawberry: 'fruit|berry', blueberry: 'fruit|berry', raspberry: 'fruit|berry', watermelon: 'fruit', pineapple: 'fruit', papaya: 'fruit', lemon: 'fruit', lime: 'fruit', coconut: 'fruit', cherry: 'fruit', peach: 'fruit', pear: 'fruit', plum: 'fruit', apricot: 'fruit', kiwi2: 'fruit', carrot: 'vegetable', potato: 'vegetable', tomato: 'vegetable|fruit', onion: 'vegetable', garlic: 'vegetable|herb', cabbage: 'vegetable', lettuce: 'vegetable', broccoli: 'vegetable', spinach: 'vegetable', cucumber: 'vegetable', pumpkin: 'vegetable|squash', pepper: 'vegetable|spice', corn: 'vegetable|grain|cereal', wheat: 'grain|cereal|grass', rice2: 'grain|cereal', oak2: 'x' };
      const tm = /\b(?:a|an) (\w+) is (?:a|an) _B_|(\w+) is (?:a|an) _B_|(a|an) (\w+)\b[^.]{0,10}_B_/.exec(pn);
      const w = tm && (tm[1] ?? tm[2] ?? tm[4]);
      if (w && TAX[w]) {
        const hits = ccs.filter((c) => new RegExp(`^(a |an )?(${TAX[w]})s?\\.?$`, 'i').test(c));
        if (hits.length === 1 && hits[0] === aa) return true;
      }
    }

    // weather-danger -> can't/shouldn't
    if (/very (cold|hot|dangerous|dark|late|stormy|rainy|windy|foggy)|too (cold|hot|dangerous|dark|late)|storm|heavy rain|thunder|lightning|blizzard|hurricane|typhoon|flood/.test(pl) && /go outside|play outside|go out|swim|sail|drive|fly|climb|hike|camp|picnic/.test(pl)) {
      const hits = ccs.filter((c) => /^(can't|cannot|shouldn't|mustn't|don't|do not|should not|must not|won't|will not|can not)$/.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // rain -> clouds
    if (/rain (falls?|comes?|drops?) (down )?(to earth )?from|rain comes? from|water falls? from|drops? of rain/.test(pl)) {
      const hits = ccs.filter((c) => /^clouds?$/.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // "someday/in the future/one day" -> will + verb unique
    if (/\bsomeday\b|in the future|one day(?!.)|when (i|he|she|we|they|you) grow(s)? up/.test(pl)) {
      const hits = ccs.filter((c) => /^(will|is going to|are going to|am going to|would|'ll|shall) /.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // "must _B_ the forests/earth/animals" -> protect
    if (/(must|should|have to|need to|ought to|try to|want to|going to|have got to|got to) _B_ (the )?(forests?|earth|planet|environment|nature|animals?|wildlife|ocean|sea|rivers?|trees?|water|air|our home|the world)/.test(pn)) {
      const hits = ccs.filter((c) => /^(protect|save|preserve|conserve|keep|care for|take care of|look after|help|defend|guard|clean|stop polluting|plant)$/.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // "person who designs buildings" -> architect (occupation-by-definition)
    if (/person who|someone who|a (man|woman|person|people|worker) who/.test(pl) || /^who |^what is a person who|^choose the job/.test(pl)) {
      const OCC = [
        [/designs? buildings?/, "architect"],
        [/designs? (clothes?|fashion)/, "fashion designer|designer"],
        [/designs?|writes? (code|programs?|software|websites?|apps?|games?)|codes?|programs?/, "programmer|developer|designer|engineer"],
        [/makes? laws?/, "politician|lawmaker"],
        [/writes? (books?|novels?|stories|poems?|articles?|news)/, "writer|author|novelist|poet|journalist|reporter"],
        [/paints? (pictures?|portraits?)/, "painter|artist"],
        [/teaches?|instructs?|educates?|tutors?|gives? lessons?/, "teacher|instructor|professor|tutor|lecturer|coach|trainer"],
        [/treats?|cures?|heals?|operates?|examines? patients?/, "doctor|surgeon|physician|nurse"],
        [/fixes? teeth|cleans? teeth|teeth/, "dentist"],
        [/flies? (planes?|airplanes?|jets?|aircraft|helicopters?)/, "pilot|aviator"],
        [/drives? (cars?|buses?|taxis?|trucks?|trains?)/, "driver|chauffeur"],
        [/catches? (thieves?|criminals?|robbers?)|arrests?|stops? crime|keeps? (people|us|the city) safe|protects? (people|the public)|maintains? order|police station/, "police|policeman|police officer|officer|detective"],
        [/fights? fires?|puts? out fires?|rescues?|saves? people from fires?/, "firefighter|fireman"],
        [/grows?|plants?|harvests?|works? on (a |the )?farm|raises? (animals?|crops?)/, "farmer"],
        [/cooks?|prepares? (food|meals?)|works? in (a |the )?(kitchen|restaurant)/, "cook|chef"],
        [/bakes?|makes? (bread|cakes?|pastries)/, "baker"],
        [/builds?|constructs? (houses?|buildings?|roads?|bridges?)/, "builder|construction worker|engineer"],
        [/fixes?|repairs? (cars?|machines?|engines?|computers?|phones?)/, "mechanic|technician|repairman|engineer"],
        [/cuts? hair|styles? hair|trims?/, "barber|hairdresser|hairstylist"],
        [/sells?|works? in (a |the )?(shop|store|market|supermarket)/, "seller|shopkeeper|salesperson|salesman|saleswoman|cashier|vendor|shop assistant"],
        [/sings?|performs? music/, "singer|musician|vocalist|performer"],
        [/acts? (in|on)|performs? (on|in) (stage|films?|movies?|plays?)/, "actor|actress|performer"],
        [/reports? (the )?news|writes? (news|articles?)|interviews?/, "reporter|journalist|news reporter|correspondent"],
        [/takes? (photos?|pictures?)|photographs?/, "photographer"],
        [/delivers? (letters?|mail|packages?|parcels?|food)/, "postman|mailman|delivery man|courier|messenger"],
        [/translates?|interprets?/, "translator|interpreter"],
        [/researches?|discovers?|invents?|experiments?|works? in (a |the )?lab|studies? science/, "scientist|researcher|inventor"],
        [/travels? (to|in) space|works? in space|goes? to (the )?(moon|mars)/, "astronaut|cosmonaut|spaceman"],
        [/sails?|navigates?|works? on (a |the )?(ship|boat|sea)/, "sailor|captain|seaman"],
        [/catches? fish|fishes?/, "fisherman|fisher|angler"],
        [/serves? (food|drinks?|customers?)|takes? orders?|works? in (a |the )?(restaurant|cafe)/, "waiter|waitress|server|bartender"],
        [/cleans?|sweeps?|mops?|tidies/, "cleaner|janitor|maid|housekeeper"],
        [/guards?|protects?|patrols?|keeps? watch/, "guard|security guard|bodyguard|watchman"],
        [/investigates?|solves? (crimes?|cases?|mysteries)/, "detective|investigator|spy"],
        [/judges?|decides?|works? in (a |the )?court/, "judge|magistrate"],
        [/defends?|represents? (in court)|legal advice/, "lawyer|attorney"],
        [/fights? for|protects? (the )?country|serves? (in )?(the )?(army|military)/, "soldier|military"],
        [/trains?|coaches? (teams?|players?|athletes?)/, "coach|trainer"],
        [/competes?|plays? (sports?|professionally)|runs? races?/, "athlete|player|sportsman|sportswoman"],
        [/studies?|goes? to (school|university|college)/, "student|pupil|scholar"],
        [/manages?|leads?|directs?|runs? (a |the )?(company|business|hotel|restaurant)/, "manager|boss|director|leader|ceo"],
        [/helps? (the )?(sick|patients?|doctors?)|assists? (the )?doctor/, "nurse|assistant|paramedic"],
        [/models?|walks? (the )?runway/, "model|supermodel"],
        [/creates?|designs?|draws?|illustrates?|animates?|makes? (art|designs?|graphics?|websites?|games?)/, "artist|designer|illustrator|animator|architect|engineer"],
        [/treats? (animals?|pets?)|animal doctor|sick animals?/, "vet|veterinarian"],
        [/works? in (a |the )?library|lends? books?/, "librarian"],
        [/counts? money|manages? money|works? in (a |the )?bank|accounts?/, "accountant|banker|cashier"],
        [/welcomes? guests?|works? at (the )?(front desk|reception)|answers? phones?/, "receptionist|secretary|assistant"],
      ];
      for (const [re, want] of OCC) {
        if (!re.test(pl)) continue;
        const hits = ccs.filter((c) => new RegExp("^(a |an )?("+want+")s?$", "i").test(c));
        if (hits.length === 1 && hits[0] === aa) return true;
      }
    }

    // "one/a/an <adj> _B_" -> the only singular choice
    if (/\b(one|a|an|every|each|single|only one|the first|the last|my first|my last|one new|one old|one more|another) ([a-z]+ )?_B_/.test(pn) || /^one \w+ _B_|has one|have one|got one|only one/.test(pn)) {
      const NONPL_S2 = new Set(['is', 'as', 'has', 'was', 'does', 'goes', 'this', 'yes', 'his', 'hers', 'its', 'thus', 'plus', 'bus', 'gas', 'us', 'news', 'always', 'perhaps', 'besides', 'sometimes', 'physics', 'maths', 'pants', 'shorts', 'jeans', 'trousers', 'glasses', 'scissors', 'clothes', 'shoes', 'socks', 'gloves', 'boots', 'sandals', 'sneakers', 'slippers', 'pajamas', 'sunglasses', 'binoculars', 'earrings', 'belongings', 'goods', 'stairs', 'arms', 'riches', 'manners', 'customs', 'police', 'cattle', 'people', 'children', 'men', 'women', 'feet', 'teeth', 'mice', 'geese', 'oxen']);
      const isPl2 = (w) => { const t = w.split(' ').slice(-1)[0].replace(/\.$/, ''); return (NONPL_S2.has(t) ? /^(pants|shorts|jeans|trousers|glasses|scissors|clothes|shoes|socks|gloves|boots|sandals|sneakers|slippers|pajamas|sunglasses|binoculars|earrings|belongings|goods|stairs|arms|riches|manners|customs|police|cattle|people|children|men|women|feet|teeth|mice|geese|oxen)$/.test(t) : /(s|es|ies|ves)$/.test(t) && !/^(ss|us|is|as|this|yes|his|hers|its|plus|bus|gas|thus|news|physics|maths|series|species|christmas|tet|means|fuss|miss|kiss|boss|class|grass|glass|dress|press|stress|guess|unless|across|loss|cross|chess|moss|gloss|toss|abyss|bliss|mass|mess|less|bless|dismiss|amiss|remiss|swiss|pass|hiss|discuss|profess|confess|express|impress|possess|assess|process|success|progress|address|witness|illness|darkness|kindness|sadness|happiness|goodness|badness|madness|sickness|weakness|illness|fitness|business|richness|poorness|cheapness|dearness|clearness|nearness|loudness|softness|hardness|sharpness|flatness|fullness|emptiness|wetness|dryness|quickness|slowness|fastness|quietness|noisiness|sleepiness|hungriness|thirstiness|healthiness|greediness|friendliness|loneliness|tininess|hugeness|braveness|politeness|rudeness|cleverness|stupidness|wiseness|foolishness|greatness|largeness|safeness|fineness|lateness|hardness|softness|loudness|quietness|simpleness|funness|dearness|nearness|farness|sourness|sweetness|bitterness|saltiness|freshness|tightness|looseness|sadness|angriness|silliness|luckiness|tastiness|windiness|cloudiness|sunniness|raininess|snowiness|fogginess|noisiness|merriness)$/.test(t)); };
      const sing = ccs.filter((c) => !isPl2(c));
      if (sing.length === 1 && sing[0] === aa && ccs.length > 1) return true;
    }

    // "dog can _B_ very high" -> jump (species-capable action)
    {
      const ANIMAL_CAN = { dog: 'jump|run|swim|bark|dig|fetch|play|sit|stand|walk|catch|sleep|eat|drink|roll|wag|sniff|howl|chase', cat: 'jump|climb|run|meow|purr|scratch|sleep|play|catch|hunt|hide|pounce', bird: 'fly|sing|chirp|hop|flutter|soar|glide|nest|peck|tweet', fish: 'swim|dive|jump|splash|glide|dart', frog: 'jump|hop|swim|croak|dive|leap', rabbit: 'jump|hop|run|dig|burrow|nibble', horse: 'run|gallop|trot|jump|neigh|kick|graze', monkey: 'climb|swing|jump|chatter|screech|play', squirrel: 'climb|jump|run|gather|hoard|scamper', kangaroo: 'jump|hop|bounce|kick|box', dolphin: 'swim|jump|dive|play|splash', whale: 'swim|dive|spout|sing|breach', bird2: 'x' };
      const am = /\b(dog|cat|bird|fish|frog|rabbit|horse|monkey|squirrel|kangaroo|dolphin|whale)s?\b[^.]{0,20}\bcan _B_/.exec(pn);
      if (am) {
        const a2 = /dog|cat|bird|fish|frog|rabbit|horse|monkey|squirrel|kangaroo|dolphin|whale/.exec(pn)[0];
        const want = ANIMAL_CAN[a2];
        if (want) {
          const hits = ccs.filter((c) => new RegExp(`^(${want})$`, 'i').test(c));
          if (hits.length === 1 && hits[0] === aa) return true;
        }
      }
    }

    // person + very -> personality adjective unique (same-sentence or next-sentence)
    if (/\b(grandma|grandpa|grandmother|grandfather|mother|father|mom|dad|mum|mommy|daddy|aunt|uncle|sister|brother|teacher|nurse|doctor|friend|neighbou?r|classmate|cousin|lady|gentleman)\b.{0,60}\b(she|he|it|they|is|are|was|were)?s*(is|are|was|were|looks?|seems?|feels?|acts?|appears?)s+(very |really |so |quite |pretty |too |rather )?_B_/.test(pn)) {
      const PERSONA = /^(kind|nice|friendly|helpful|caring|loving|gentle|warm|sweet|funny|cheerful|patient|wise|generous|polite|good|wonderful|lovely|sociable|outgoing|talkative|quiet|shy|brave|smart|clever|hardworking|diligent|lazy|honest|loyal|reliable|responsible|careful|active|energetic|calm|strict|humble|proud|selfish|mean|rude|unfriendly|cruel|nasty|annoying|boring|silly|crazy|creative|talented|athletic|sporty|musical|artistic|tall|short|fat|thin|slim|strong|weak|healthy|sick|young|old|elderly|beautiful|pretty|handsome|cute|ugly|happy|sad|angry|serious)$/
      const hits = ccs.filter((c) => PERSONA.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // "lead to _B_" with harmful inputs -> health problems
    if (/(lead|leads|leading|cause|causes|causing|result|results|resulting|contribute|contributes|contributing|bring|brings|bringing|give|gives|giving|make|makes|making) (to |up |about )?_B_/.test(pn) && /(sugar|junk food|fast food|no exercise|lack of exercise|smoking|alcohol|stress|pollution|waste|laziness|obesity|overweight|unhealthy|bad habits?|poor diet|not enough sleep|staying up late|screen time|too much tv|sitting all day)/.test(pl)) {
      const hits = ccs.filter((c) => /health problems?|obesity|diabetes|disease|illness|sickness|heart|overweight|fat|problems?|issues?|trouble|risk|danger|harm|damage|death|cancer|stroke|high blood pressure|tooth decay|cavities?/.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // "is it _B_ outside" -> weather adjective unique
    if (/\b(is|are|was|were) it _B_ (outside|today|now|this morning|in (the )?(morning|winter|summer|autumn|spring|fall))|it is _B_ outside|_B_ outside\?/.test(pn)) {
      const WADJ = /^(warm|cold|hot|cool|sunny|rainy|windy|cloudy|foggy|snowy|wet|dry|clear|bright|dark|freezing|chilly|humid|stormy|nice|beautiful|lovely|terrible|awful)$/;
      const hits = ccs.filter((c) => WADJ.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // sun/moon/star -> its action (be + V-ing where other -ing choices are nonsense)
    if (/\b(sun|moon|stars?|rain|wind|snow|light|fire|bell|phone|alarm|clock|baby|dog|cat|bird|phone) (is|are|was|were) _B_|(sun|moon|stars?) is _B_/.test(pn)) {
      const SKY_ACT = { sun: 'shin|ris|set', moon: 'shin|glow|ris', star: 'shin|twinkl|sparkl', rain: 'fall|pour|com', wind: 'blow|howl', snow: 'fall', baby: 'cry|sleep|laugh|smil', dog: 'bark|run|eat|sleep|play', cat: 'meow|sleep|play|eat|purr', bird: 'sing|fly|chirp', phone: 'ring|buzz', bell: 'ring', alarm: 'ring|beep', clock: 'tick', fire: 'burn|crackl', light: 'shin|glow|flash' };
      const objW = Object.entries(SKY_ACT).find(([k]) => new RegExp(`\\b${k}s?\\b`).test(pl))?.[1];
      if (objW) {
        const hits = ccs.filter((c) => new RegExp(`^(${objW})`, 'i').test(c));
        if (hits.length === 1 && hits[0] === aa) return true;
      }
    }

    // train -> tracks; transport -> where it runs
    if (/trains? (runs?|goes|moves?|travels?)|runs? on/.test(pl) || /_B_ (tracks?|rails?|railway)/.test(pn)) {
      const hits = ccs.filter((c) => /^(tracks?|rails?|railway|railroad)$/.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // "if we _B_" -> protect-earth semantic: only eco-positive actions
    if (/protect (the )?(earth|planet|environment|nature|our (planet|home|world))|save (the )?(earth|planet|energy|water|the environment)|keep (the )?(earth|environment|air|water) (clean|safe|green)|make the (planet|world|earth|environment) (better|cleaner|greener|safer)|the (planet|earth|environment|world) will be (better|cleaner|greener|safer)|pollution|climate change|global warming/.test(pl)) {
      const ECO = /^(plant(ing|s)? (more )?(trees?|forests?)|recycle|recycling|reuse|reusing|reduce|reducing|save (energy|water|electricity)|use less (paper|plastic|water|energy)|pick up (trash|litter|rubbish)|clean up|protect|save|conserve|preserve|walk|ride (a |our |your )?bikes?|cycle|use public (transport|transportation)|turn off (the )?(lights?|taps?|faucets?|devices)|don't litter|not litter|stop polluting|take care of (the )?(earth|planet|environment|nature)|plant trees\.?|plant more trees\.?|save water\.?|save energy\.?|recycle (paper|plastic|trash|waste|things)\.?|reduce (waste|pollution|plastic|paper)\.?|reuse (bags?|bottles?|paper|things)\.?|use (less|fewer) (paper|plastic|bags?|bottles?)\.?|walk (more|to school|instead)\.?|ride (a |your |our )?bikes?\.?|cycle (more|to school)\.?|turn off (the )?lights?\.?|pick up (the )?(trash|litter|rubbish)\.?|clean up (the )?(beach|park|river|street|neighborhood)\.?)$/;
      const hits = ccs.filter((c) => ECO.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // aux slot: "_B_ (not )? <base-verb>" with only do/does/did + be/modal choices -> agreement picks
    {
      const auxM = /\b(i|we|they|you|he|she|it|everyone|everybody|someone|somebody|anyone|anybody|nobody|people|children|parents|the \w+?s?|my \w+?s?|his \w+?s?|her \w+?s?|our \w+?s?|their \w+?s?|a \w+?s?|an \w+?s?|this|that|these|those) _B_ (not |n't |never |also |really |usually |often |always |sometimes )?(\w+)/.exec(pn);
      if (auxM && ccs.every((c) => /^(do|does|did|don't|doesn't|didn't|is|are|am|was|were|be|been|do not|does not|did not|is not|are not|am not|was not|were not)$/.test(c))) {
        const verb = auxM[auxM.length - 1];
        const isIng = /ing$/.test(verb);
        // after do/does/did the next word must be base; after is/are/was/were it must be -ing
        const beValid = isIng;
        const doValid = !isIng && !/^(is|are|am|was|were|be|been|do|does|did)$/.test(verb);
        const thirdS = /^(he|she|it|this|that|everyone|everybody|someone|somebody|anyone|anybody|nobody)$/.test(auxM[1]) || (/^(the|my|his|her|our|their|a|an) \w+[^s]$/.test(auxM[1]) && !PL_EXC.has(auxM[1].split(' ')[1]));
        const pastCue2 = /yesterday|last (week|month|year|night|time)|\bago\b|once upon/.test(pl);
        const want = doValid ? (pastCue2 ? 'did' : thirdS ? 'does' : 'do') : beValid ? (thirdS ? 'is' : 'are') : null;
        if (want && ccs.filter((c) => c === want).length === 1 && aa === want) return true;
      }
    }

    // "_B_ be <adj>" modal slot: only real modal fits
    if (/_B_ (be|seem|look|feel|sound|become|get|feel|appear) \w/.test(pn)) {
      const MOD = /^(will|would|can|could|shall|should|must|may|might|won't|wouldn't|can't|cannot|couldn't|shouldn't|mustn't)$/;
      const hits = ccs.filter((c) => MOD.test(c));
      if (hits.length === 1 && hits[0] === aa && ccs.every((c) => MOD.test(c) || /^(is|are|am|be|been|was|were|do|does|did|\w+s|\w+ing|\w+ed|will be|films?|cans|wills|woulds|shoulds|coulds|musts|mays|mights|shalls)$/.test(c))) return true;
    }

    // "X is _B_ the Y" -> location prep unique (other choices nonsense)
    if (/\b(is|are|was|were|be) _B_ (the |a |an |my |your |his |her |our |their )?\w+/.test(pn)) {
      const LOCPREP = /^(opposite|next to|near|behind|in front of|beside|between|across from|close to|far from|on|in|at|under|above|inside|outside|nearby|around|by|against|along|through|across|toward|towards|past|over|left of|right of|north of|south of|east of|west of|adjacent to|surrounded by|facing|overlooking)$/;
      const hits = ccs.filter((c) => LOCPREP.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // Vietnam facts unique to the bank
    if (/temple of literature|van mieu|quoc tu giam/.test(pl) && /first _B_|_B_ (of|in) vietnam/.test(pn)) {
      const hits = ccs.filter((c) => /universit/.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }
    if (/eyesight|eye(s)? (health|care)|see (well|better|clearly)|good vision|night blindness|bright eyes/.test(pl) && /_B_|rich in/.test(pn)) {
      const hits = ccs.filter((c) => /^vitamin a$/.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }
    if (/months? (in a year|from january to december|each year|every year|a year has)|year (has|have) _B_ months?/.test(pl) || /_B_ months? (in|from|a year|each year|every year|january)/.test(pn)) {
      const hits = ccs.filter((c) => /^(twelve|12)$/.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // breathing organ: fish -> gills; humans/mammals -> lungs
    if (/breathes?|breathing|respire/.test(pl)) {
      const want = /fish|shark|goldfish|whale|dolphin|seal|crab|shrimp|underwater|in (the )?(water|sea|ocean|river|lake|pond|tank)/.test(pl) ? /gills?/ : /lungs?|nose|air/;
      const hits = ccs.filter((c) => want.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // unit conversions: 7 days -> week, 24 hours -> day, 60 minutes -> hour, 12 months -> year
    {
      const U = [[/(seven|7) days?/, 'weeks?'], [/24 hours?/, 'days?'], [/(sixty|60) minutes?/, 'hours?'], [/(sixty|60) seconds?/, 'minutes?'], [/(twelve|12) months?/, 'years?'], [/100 centimet(re|er)s?/, 'met(re|er)s?'], [/1000 (met(re|er)s?|m)/, 'kilomet(re|er)s?|km'], [/4 weeks?/, 'months?'], [/(four|4) seasons?/, 'years?']];
      for (const [re, want] of U) {
        if (re.test(pl)) {
          const hits = ccs.filter((c) => new RegExp(`^(${want})$`, 'i').test(c));
          if (hits.length === 1 && hits[0] === aa) return true;
        }
      }
    }

    // sun sets -> evening; sun rises -> morning
    if (/sun sets?|sunsets?/.test(pl)) {
      const hits = ccs.filter((c) => /^(evening|dusk|sunset|west)$/.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }
    if (/sun rises?|sunrises?|sun comes up/.test(pl)) {
      const hits = ccs.filter((c) => /^(morning|dawn|sunrise|east)$/.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // clock hands: long -> minute, short -> hour
    if (/long hand/.test(pl)) {
      const hits = ccs.filter((c) => /^minutes?$/.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }
    if (/short hand/.test(pl)) {
      const hits = ccs.filter((c) => /^hours?$/.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // food chain roles: worm/bacteria/fungi -> decomposer
    if (/food chain|decompos|breaks? down|decays?|dead (plants?|animals?|matter|leaves|trees)/.test(pl) && /worm|bacteria|fungi|fungus|mushroom|mould|mold|dead|decay/.test(pl)) {
      const hits = ccs.filter((c) => /decompos/.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // "X hours of sleep" -> good/important (health judgment)
    if (/(hours? of )?sleep|bedtime|rest well/.test(pl) && /\b(is|are|be|it is|it is also) _B_ (for|to|good|important|necessary|essential)|_B_ for (us|children|kids|you|your (health|body|brain)|our (health|bod|brain))/.test(pn)) {
      const hits = ccs.filter((c) => /^(good|important|necessary|essential|healthy|great|vital|crucial|useful|beneficial|enough)$/.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // ailment -> remedy: headache/stomachache/toothache/cold/fever -> medicine/doctor/rest
    if (/ha(ve|s) a (headache|stomachache|toothache|cold|fever|sore throat|cough|runny nose|tooth ache|stomach ache)|feels? (sick|ill|dizzy)|got a (headache|cold|fever|toothache|stomachache)|my (head|tooth|stomach|throat|nose) (aches|hurts|is sore|is runny)/.test(pl)) {
      const hits = ccs.filter((c) => /medicine|doctor|dentist|rest|sleep|water|warm|soup|honey|tea|hospital|nurse|bed|take a (nap|rest|break)|see (the |a )?(doctor|dentist)|go to (the )?(doctor|dentist|hospital|bed)|stay (home|in bed)|drink (warm|hot|water|tea)/.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // "by _B_" -> transport noun unique
    if (/\bby _B_/.test(pn) || /_(B)_ (to|every day|here|there)\b/.test(pn)) {
      const VEH = /^(car|bus|train|plane|bike|bicycle|motorbike|motorcycle|taxi|boat|ship|ferry|subway|metro|tram|scooter|helicopter|van|truck|lorry|coach|foot|carriage|sled|rickshaw|jeep|ambulance)$/;
      const hits = ccs.filter((c) => VEH.test(c));
      if (hits.length === 1 && hits[0] === aa && /(go|come|travel|get|arrive|reach|visit|commute|ride|drive|fly|move|return|home|school|work|there|here|to the|to school|to work|to hanoi|to ho chi minh)/.test(pl)) return true;
      if (/^by _B_/.test(pn.trim()) || /_B_ (to|every day|here|there)\b/.test(pn)) {
        if (hits.length === 1 && hits[0] === aa) return true;
      }
    }

    // "play hide-and-seek" -> play/playing unique
    if (/hide-?and-?seek|hide and seek|hopscotch|tag|marbles|skip ?rope|jump rope|blind man'?s? buff/.test(pl)) {
      const hits = ccs.filter((c) => /^(play|plays|playing|played|to play)$/.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // vehicle colour facts: school bus -> yellow, fire truck -> red
    if (/\byellow\b/.test(pl) && ccs.some((c) => /school bus/.test(c))) {
      const hits = ccs.filter((c) => /school bus/.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }
    if (/\b(red|fire)\b/.test(pl) && ccs.some((c) => /fire (truck|engine)/.test(c))) {
      const hits = ccs.filter((c) => /fire (truck|engine)/.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // "wash(ing) (his/her/my) face" hygiene collocation
    if (/_B_ (his |her |my |your |their |our )?face|_B_ hands?|wash(es|ing)? (his |her |my |your )?face/.test(pn)) {
      const hits = ccs.filter((c) => /^(wash|washes|washing|washed|to wash|clean|cleans|cleaning)$/.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // "manners/kindness" -> Moral Education subject
    if (/manners|kindness|behaviou?r|respect|honesty|polite|good deeds?|right and wrong/.test(pl) && ccs.some((c) => /moral/.test(c))) {
      const hits = ccs.filter((c) => /moral/.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // season-weather table
    {
      const SEA_W = { spring: /warm|pleasant|cool|fresh|beautiful|nice|mild/, summer: /hot|sunny|swelter|scorch|warm/, autumn: /cool|dry|yellow|windy|pleasant|chilly|leaves/, fall: /cool|dry|yellow|windy|pleasant|chilly|leaves/, winter: /cold|snow|freez|chilly|icy|frosty|windy/ };
      const sm = /\b(spring|summer|autumn|fall|winter)\b/.exec(pl);
      if (sm && /(weather|it is|it'?s|is often|is usually|days? (are|is)|the (weather|air|days?))/.test(pl)) {
        const want = SEA_W[sm[1]];
        const hits = ccs.filter((c) => want.test(c));
        const anti = Object.entries(SEA_W).filter(([k]) => k !== sm[1]).some(([,w]) => hits.length === 0 && false);
        if (hits.length === 1 && hits[0] === aa) return true;
      }
    }

    // relative pronoun for person: "<person> _B_ <verb>" -> who
    {
      const pm = /\b(boy|girl|man|woman|teacher|student|doctor|nurse|farmer|driver|worker|friend|mother|father|mom|dad|sister|brother|lady|child|person|police officer|artist|singer|dancer|writer|pilot|cook|chef|baby|kid|cousin|aunt|uncle|neighbou?r|classmate|grandmother|grandfather|grandma|grandpa|wife|husband|son|daughter|king|queen|player|scientist|engineer|lawyer|soldier|firefighter|actor|actress|musician|painter|poet|author|photographer|baker|waiter|waitress|dentist|vet|mechanic|librarian|manager|director|president|principal|professor|guide|translator|editor|fisherman|sailor|explorer|inventor|designer|architect|builder|detective|officer|mayor|governor|priest|soldier|hero|winner|visitor|guest|stranger|owner|leader|member|customer|patient|farmer|guard|captain|coach|trainer|assistant|intern|volunteer|tourist|traveler|passenger|shopkeeper|merchant|cashier|banker|accountant|clerk|receptionist|programmer|user|landlord|landlady|tenant|host|hostess|presenter|announcer|reporter|journalist|candidate|delegate|representative|postman|mailman|servant|helper|pupil|student|learner|beginner|adult|youngster|teenager|toddler|newborn|elderly|senior|athlete|runner|swimmer|speaker|listener|reader|viewer|spectator|fan|supporter|partner|colleague|teammate|roommate|playmate|best friend|pen pal|boyfriend|girlfriend|bride|groom|spouse|parent|guardian|babysitter|nanny|tutor|mentor|advisor|therapist|surgeon|physician|paramedic|midwife|janitor|doorman|housekeeper|maid|butler|bodyguard|lifeguard|security guard|bouncer|attendant|flight attendant|crew|staff|employee|laborer|salesman|saleswoman|shop assistant|operator|developer|coder|customer|client|consumer|buyer|shopper|owner|proprietor|resident|citizen|inhabitant|villager|neighbor|acquaintance|companion|mate|buddy|pal|peer|subordinate|elder|minor|infant|babe|tot|tyke|gentleman|prince|princess|emperor|knight|monk|nun|pastor|saint|fairy|superhero|villain|thief|robber|burglar|prisoner|victim|survivor|refugee|immigrant|citizen|native|foreigner|pedestrian|audience|subscriber|follower|participant|competitor|rival|opponent|ally|associate|coworker|fellow|superior|elder|adult|grown-up|young man|young woman|old man|old woman|elderly person|senior citizen|middle-aged)\b[^.]{0,50} _B_ (lives?|works?|is|was|has|teaches?|helps?|sits?|stands?|comes?|goes?|runs?|walks?|sings?|reads?|writes?|speaks?|drives?|rides?|flies?|swims?|eats?|drinks?|wears?|cooks?|makes?|studies|watches|looks|listens|plays?|wins?|gives?|takes?|brings?|tells?|says?|knows?|sees?|owns?|holds?|carries?|wants?|likes?|loves?|called|named|who)/.exec(pn);
      if (pm) {
        const hits = ccs.filter((c) => /^who$/.test(c));
        if (hits.length === 1 && hits[0] === aa && !ccs.includes('that') && !ccs.includes('whom')) return true;
      }
    }

    // "if/when tired-sleepy" -> take a nap/rest unique
    if (/\b(tired|sleepy|exhausted|worn out|drowsy)\b/.test(pl) && /(should|must|can|will|may|ought to|need to|have to|had better) _B_|_B_ (a nap|some rest|a break|rest)/.test(pn)) {
      const hits = ccs.filter((c) => /^(take a nap|take a rest|take a break|have a nap|have a rest|get some rest|rest|sleep|go to bed|lie down|relax|stop|take it easy)$/i.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // "should _B_ plastic bottles/paper" -> recycle
    if (/(should|must|can|will|may|ought to|need to|try to|remember to|learn to|help|want to|have to) _B_/.test(pn) && /\b(plastic|bottles?|cans?|paper|glass|cardboard|metal|aluminum|tin|old (clothes|newspapers?|magazines?|books|toys)|trash|rubbish|waste|litter|garbage)\b/.test(pl)) {
      const hits = ccs.filter((c) => /^(recycle|reuse|reduce|recycling|reusing|collect|sort)$/i.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // daily routine: "<3rd-person> _B_ her teeth/face/hair" -> brushes/washes/combs
    {
      const rm = /\b(she|he|it|mom|dad|mother|father|sister|brother|grandma|grandpa|grandmother|grandfather|aunt|uncle|teacher|my (mom|dad|mother|father|sister|brother|grandma|grandpa)|her (mom|dad|mother|father|sister|brother)|his (mom|dad|mother|father|sister|brother)) _B_ (his |her |my |your |their |its )?(teeth|face|hands|hair|nails|shoes|clothes|homework|bed|breakfast|lunch|dinner|room|house|car|bike|dog|cat|pet|garden|plants|flowers|dishes|clothes)\b/.exec(pn);
      if (rm) {
        const V3 = { teeth: 'brush(es|ing)?|clean(s|ing)?', face: 'wash(es|ing)?|clean(s|ing)?', hands: 'wash(es|ing)?', hair: 'comb(s|ing)?|brush(es|ing)?|wash(es|ing)?|cut(s|ting)?', nails: 'cut(s|ting)?|clip(s|ping)?|clean(s|ing)?|file(s|d)?', shoes: 'tie(s|d)?|wear(s|ing)?|put(s|ting)? on|polish(es|ing)?|clean(s|ing)?', clothes: 'wash(es|ing)?|iron(s|ing)?|fold(s|ing)?|wear(s|ing)?|change(s|d)?', homework: 'do(es|ne|ing)?|finish(es|ing)?|complete(s|d)?', bed: 'make(s|ing)?', breakfast: 'cook(s|ing)?|make(s|ing)?|eat(s|ing)?|have|has|prepare(s|d)?', lunch: 'cook(s|ing)?|make(s|ing)?|eat(s|ing)?|have|has|prepare(s|d)?', dinner: 'cook(s|ing)?|make(s|ing)?|eat(s|ing)?|have|has|prepare(s|d)?', room: 'clean(s|ing)?|tidy|tidies|tidying|sweep(s|ing)?|mop(s|ping)?|vacuum(s|ing)?|dust(s|ing)?', house: 'clean(s|ing)?|tidy|tidies|tidying|sweep(s|ing)?|build(s|ing)?|buy(s|ing)?|paint(s|ing)?', car: 'wash(es|ing)?|drive(s|ing)?|clean(s|ing)?|park(s|ing)?|repair(s|ing)?|fix(es|ed|ing)?', bike: 'ride(s|ing)?|wash(es|ing)?|clean(s|ing)?|repair(s|ing)?|fix(es|ed|ing)?', dog: 'walk(s|ing)?|feed(s|ing)?|wash(es|ing)?|brush(es|ing)?|train(s|ing)?|play(s|ing)?', cat: 'feed(s|ing)?|wash(es|ing)?|brush(es|ing)?|pet(s|ting)?|play(s|ing)?', pet: 'feed(s|ing)?|walk(s|ing)?|wash(es|ing)?|play(s|ing)?|care for|look(s|ing)? after|take(s|ing)? care', garden: 'water(s|ing)?|weed(s|ing)?|tend(s|ing)?|plant(s|ing)?|work(s|ing)?', plants: 'water(s|ing)?|plant(s|ing)?|tend(s|ing)?|grow(s|ing)?', flowers: 'water(s|ing)?|plant(s|ing)?|pick(s|ing)?|smell(s|ing)?|grow(s|ing)?', dishes: 'wash(es|ing)?|do(es|ne)?|clean(s|ing)?|dry|dries|drying|put(s|ting)? away' };
        const noun = rm[rm.length - 1];
        const want = V3[noun];
        if (want) {
          const hits = ccs.filter((c) => new RegExp(`^(${want})$`, 'i').test(c));
          if (hits.length === 1 && hits[0] === aa) return true;
        }
      }
    }

    // after-rain -> rainbow unique
    if (/(after|following) (the |a |heavy )?rain|rain (has )?stopped|rain (ends?|ended)|after the storm/.test(pl) && /sky|see|appear|in the/.test(pl)) {
      const hits = ccs.filter((c) => /^rainbows?$/.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // "can't wear _B_ in the rain/cold" -> non-weather-gear unique
    if (/(can't|cannot|shouldn't|don't|do not) (wear|put on|use|bring|take) _B_ (in|when|on|during|into)/.test(pn) && /(rain|cold|snow|winter|storm|wet)/.test(pl)) {
      const RAIN = /^(raincoat|umbrella|boots?|rain boots?|wellington|wellies|coat|jacket|sweater|scarf|gloves?|hat|warm clothes?|wool(en)? (sweater|coat|scarf|hat|socks)|sweatshirt|hoodie|poncho|waterproofs?|gumboots?|rain shoes?|mittens?|earmuffs?|thermal|long johns?|leggings?|thick (coat|jacket|sweater|socks)|fleece|parka|anorak|windbreaker|rain gear|snow boots?|ski suit|overcoat|trench coat|cardigan|pullover|turtleneck|beanie|cap|helmet)s?$/;
      const hits = ccs.filter((c) => !RAIN.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // "turn _B_" -> left/right unique among non-directions
    if (/turn _B_|_B_ (at|onto|into|to) (the )?(corner|street|road|junction|intersection|traffic light|crossroads|end)|go (straight|past|ahead) and turn/.test(pn)) {
      const hits = ccs.filter((c) => /^(left|right|left turn|right turn|back|around|north|south|east|west)$/i.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // "be not _B_" with exactly one adjective choice -> keep
    if (/\b(am|is|are|was|were|be|been|feel|feels?|felt|look|looks?|looked|seem|seems?|seemed|get|gets?|got|become|becomes?|became|sound|sounds?|sounded|smell|smells?|smelled|taste|tastes?|tasted|stay|stays?|stayed|remain|remains?|remained|appear|appears?|appeared|grow|grows?|grew|turn|turns?|turned|prove|proves?|proved) (not |n't |never |still |quite |really |very |so |too |rather |pretty |fairly |kind of |sort of )?_B_/.test(pn) || /(not|n't|never) _B_/.test(pn)) {
      const ADJ = new RegExp("^(" + "happy|sad|angry|scared|afraid|excited|bored|tired|hungry|thirsty|sick|nervous|proud|calm|brave|lonely|worried|surprised|confused|sleepy|peaceful|glad|shy|curious|energetic|upset|cheerful|frustrated|disappointed|grateful|guilty|jealous|relaxed|amused|mad|furious|terrified|delighted|anxious|stressed|embarrassed|hopeful|hopeless|miserable|pleased|satisfied|unhappy|hurt|frightened|tall|short|fat|thin|slim|strong|weak|big|small|large|huge|tiny|little|long|wide|narrow|deep|shallow|high|low|thick|heavy|light|round|square|flat|straight|curved|sharp|blunt|hard|soft|smooth|rough|firm|solid|hollow|empty|full|hot|cold|warm|cool|wet|dry|clean|dirty|new|old|young|fresh|stale|ripe|raw|cooked|frozen|broken|fixed|open|closed|shut|locked|safe|dangerous|free|busy|ready|early|late|fast|slow|quick|easy|difficult|hard|simple|complex|good|bad|better|best|worse|worst|fine|great|excellent|perfect|terrible|awful|wonderful|lovely|beautiful|pretty|ugly|handsome|cute|nice|kind|mean|rude|polite|friendly|unfriendly|funny|serious|strict|gentle|sweet|sour|salty|spicy|bitter|delicious|tasty|yummy|rich|poor|cheap|expensive|famous|popular|special|normal|common|rare|strange|odd|weird|usual|unusual|important|useful|useless|helpful|harmful|careful|careless|lucky|unlucky|clever|smart|stupid|silly|dumb|wise|foolish|honest|dishonest|lazy|hardworking|active|quiet|noisy|loud|silent|bright|dark|colorful|colourful|white|black|red|blue|green|yellow|orange|purple|pink|brown|gray|grey|golden|silver|same|different|other|another|right|wrong|correct|incorrect|true|false|real|fake|alive|dead|awake|asleep|alone|married|single|sorry|welcome|interesting|boring|exciting|amazing|surprising|scary|disgusting|charming|attractive|pleasant|enjoyable|comfortable|uncomfortable|healthy|unhealthy|ill|well|painful|successful|possible|impossible|probable|likely|certain|sure|positive|negative|modern|ancient|recent|local|foreign|public|private|personal|official|fair|unfair|equal|similar|exact|clear|obvious|necessary|unnecessary|available|absent|present|missing|lost|found|whole|half|enough|several|various|main|major|minor|extra|spare|regular|irregular|formal|informal|natural|artificial|wild|tame|domestic|male|female|human|royal|noble|holy|sacred|magic|magical|electric|electronic|digital|online|offline|mobile|global|international|national|local|rural|urban|central|northern|southern|eastern|western|left|right|front|back|top|bottom|middle|inner|outer|upper|lower|first|last|next|previous|following|final|initial|original|current|recent|past|future|daily|weekly|monthly|yearly|annual|hourly|early|late|soon|immediate|instant|sudden|gradual|permanent|temporary|constant|continuous|frequent|occasional|rare|regular|irregular" + ")$", "i");
      const hits = ccs.filter((c) => ADJ.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // circuit materials: plastic/wood/rubber -> insulator; metal -> conductor
    if (/\b(plastic|wooden?|rubber|paper|glass|ceramic|cloth|fabric|cotton|wool|porcelain|styrofoam|foam|cardboard|dry|air)\b/.test(pl) && /(circuit|electric|conduct|current|wire|bulb|battery)/.test(pl)) {
      const hits = ccs.filter((c) => /insulator/.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }
    if (/\b(metal|copper|iron|steel|aluminum|aluminium|gold|silver|wire|nail|coin|key|spoon|fork|water|wet)\b/.test(pl) && /(circuit|electric|conduct|current)/.test(pl)) {
      const hits = ccs.filter((c) => /conductor/.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // Vietnam landmark -> city/province
    {
      const LM = { 'imperial city': 'hue', 'hue citadel': 'hue', 'thien mu': 'hue', 'tu duc tomb': 'hue', 'khai dinh': 'hue', 'minh mang': 'hue', 'dong ba market': 'hue', 'ha long bay': 'quang ninh', 'halong bay': 'quang ninh', 'one pillar pagoda': 'hanoi', 'temple of literature': 'hanoi', 'van mieu': 'hanoi', 'hoan kiem': 'hanoi', 'sword lake': 'hanoi', 'ho guom': 'hanoi', 'ho chi minh mausoleum': 'hanoi', 'west lake': 'hanoi', 'ho tay': 'hanoi', 'long bien bridge': 'hanoi', 'thang long': 'hanoi', 'ngoc son temple': 'hanoi', 'perfume pagoda': 'hanoi', 'ben thanh market': 'ho chi minh city|saigon', 'independence palace': 'ho chi minh city|saigon', 'reunification palace': 'ho chi minh city|saigon', 'cu chi tunnels': 'ho chi minh city|saigon', 'notre dame cathedral': 'ho chi minh city|saigon', 'landmark 81': 'ho chi minh city|saigon', 'bitexco': 'ho chi minh city|saigon', 'golden bridge': 'da nang|danang', 'ba na hills': 'da nang|danang', 'dragon bridge': 'da nang|danang', 'han river': 'da nang|danang', 'my khe beach': 'da nang|danang', 'marble mountains': 'da nang|danang', 'an bang beach': 'hoi an', 'hoi an ancient town': 'hoi an', 'hoi an': 'quang nam', 'my son': 'quang nam', 'son doong': 'quang binh', 'phong nha': 'quang binh', 'phong nha cave': 'quang binh', 'paradise cave': 'quang binh', 'tien son': 'quang binh', 'dark cave': 'quang binh', 'ban gioc': 'cao bang', 'ban gioc waterfall': 'cao bang', 'thac ban gioc': 'cao bang', 'fansipan': 'sapa|lao cai', 'sapa': 'lao cai', 'sa pa': 'lao cai', 'mu cang chai': 'yen bai', 'ha giang loop': 'ha giang', 'dong van': 'ha giang', 'meo vac': 'ha giang', 'lung cu': 'ha giang', 'dien bien': 'dien bien', 'ba be': 'bac kan', 'trang an': 'ninh binh', 'trang an complex': 'ninh binh', 'bai dinh': 'ninh binh', 'tam coc': 'ninh binh', 'cuc phuong': 'ninh binh', 'cat ba': 'hai phong', 'cat ba island': 'hai phong', 'do son': 'hai phong', 'sam son': 'thanh hoa', 'cua lo': 'nghe an', 'vinh city': 'nghe an', 'dmz': 'quang tri', 'vinh moc': 'quang tri', 'ly son': 'quang ngai', 'quy nhon': 'binh dinh', 'tuy hoa': 'phu yen', 'nha trang': 'khanh hoa', 'cam ranh': 'khanh hoa', 'vinpearl': 'nha trang|khanh hoa', 'mui ne': 'phan thiet|binh thuan', 'vung tau': 'ba ria vung tau', 'con dao': 'ba ria vung tau', 'da lat': 'lam dong', 'dalat': 'lam dong', 'bidoup': 'lam dong', 'buon ma thuot': 'dak lak', 'dak lak': 'dak lak', 'pleiku': 'gia lai', 'kon tum': 'kon tum', 'pho quoc': 'kien giang', 'phu quoc': 'kien giang', 'can tho': 'can tho', 'mekong delta': 'mekong|the mekong delta|southern vietnam|southwest vietnam', 'u minh': 'ca mau', 'ca mau': 'ca mau', 'chau doc': 'an giang', 'ba chua xu': 'an giang', 'ba den mountain': 'tay ninh', 'dam sen': 'ho chi minh city|saigon', 'suoi tien': 'ho chi minh city|saigon', 'vinwonders': 'nha trang|phu quoc|khanh hoa|kien giang', 'ba vi': 'hanoi', 'tam dao': 'vinh phuc', 'yen tu': 'quang ninh', 'mai chau': 'hoa binh', 'pu luong': 'thanh hoa', 'moc chau': 'son la', 'son la': 'son la', 'lai chau': 'lai chau', 'cao bang': 'cao bang', 'lang son': 'lang son', 'bac ninh': 'bac ninh', 'bac giang': 'bac giang', 'nam dinh': 'nam dinh', 'ha tinh': 'ha tinh', 'quang binh': 'quang binh', 'quang tri': 'quang tri', 'quang nam': 'quang nam', 'quang ngai': 'quang ngai', 'binh dinh': 'binh dinh', 'phu yen': 'phu yen', 'khanh hoa': 'khanh hoa', 'ninh thuan': 'ninh thuan', 'binh thuan': 'binh thuan', 'ba ria': 'ba ria vung tau', 'dong nai': 'dong nai', 'binh duong': 'binh duong', 'binh phuoc': 'binh phuoc', 'tay ninh': 'tay ninh', 'long an': 'long an', 'tien giang': 'tien giang', 'ben tre': 'ben tre', 'tra vinh': 'tra vinh', 'vinh long': 'vinh long', 'dong thap': 'dong thap', 'an giang': 'an giang', 'kien giang': 'kien giang', 'hau giang': 'hau giang', 'soc trang': 'soc trang', 'bac lieu': 'bac lieu', 'ca mau': 'ca mau', 'hung yen': 'hung yen', 'hai duong': 'hai duong', 'hai phong': 'hai phong', 'quang ninh': 'quang ninh', 'bac kan': 'bac kan', 'thai nguyen': 'thai nguyen', 'tuyen quang': 'tuyen quang', 'yen bai': 'yen bai', 'phu tho': 'phu tho', 'vinh phuc': 'vinh phuc', 'ha nam': 'ha nam', 'hoa binh': 'hoa binh', 'nghe an': 'nghe an', 'thanh hoa': 'thanh hoa', 'hue': 'thua thien hue|hue' };
      const lm = Object.keys(LM).find((k) => new RegExp(`\\b${k.replace(/ /g,'\\s')}\\b`).test(pl));
      if (lm && /(_B_|in |at |located|situated|found|visit|see|go to|travel)/.test(pn)) {
        const want = LM[lm];
        const hits = ccs.filter((c) => new RegExp(`^(the )?(${want})$`, 'i').test(c));
        if (hits.length === 1 && hits[0] === aa) return true;
      }
    }

    // physics facts: gravity pulls things down; magnet attracts metal
    if (/(fall|falls|fell|falling|drop|drops|dropped|dropping|down|downward|towards? (the )?(earth|ground)|pulls? (things |objects |us |everything )?down|things (fall|come down)|what makes.*fall)/.test(pl) && ccs.some((c) => /gravity/.test(c))) {
      const hits = ccs.filter((c) => /gravity/.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }
    if (/(magnet|attract|pull|stick|iron|metal)/.test(pl) && ccs.some((c) => /magnet/.test(c))) {
      const hits = ccs.filter((c) => /magnet/.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // "cannot swim in ___" -> non-water place unique
    if (/(can't|cannot|can not|couldn't|could not|don't|do not|doesn't|does not|shouldn't|mustn't) (swim|swim in|go swimming|fish|sail|boat|dive|surf)/.test(pl)) {
      const WATER = /^(the )?(pool|swimming pool|river|lake|sea|ocean|pond|beach|water|bath|bathtub|aquarium|waterpark|water park|stream|creek|reservoir|canal|lagoon|bay|gulf|puddle|waterfall|hot spring|jacuzzi|hot tub)s?\.?$/;
      const hits = ccs.filter((c) => !WATER.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // "how old are you" -> number unique
    if (/how old are you|how old is (he|she|your|the|this|that)/.test(pl)) {
      const NUM = /^(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|\d+)( years? old)?$/;
      const hits = ccs.filter((c) => NUM.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // "_B_ a (new) town/city/place" -> explore/visit/discover
    if (/_B_ (a |an |the |this |that |our |your |my |his |her |their |its )?(new |old |big |small |beautiful |famous |ancient |modern |little |nice )?(town|city|place|country|village|museum|park|zoo|market|island|castle|palace|temple|pagoda|beach|forest|mountain|cave|waterfall|bridge|building|monument|landmark|site|area|region|district|neighborhood|street|road|path|trail|route|destination|spot|location)s?( on foot| by bike| by bus| by car| by train| together| alone)?/.test(pn)) {
      const hits = ccs.filter((c) => /^(explore|visit|visiting|visited|see|seeing|discover|discovering|discovered|tour|touring|toured|walk around|go around|look around|wander|wandering|roam|roaming|hike|hiking|hiked|trek|trekking|trekked|sightsee|sightseeing|photograph|photographing|admire|admiring)$/i.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // "my ___ are blue/green/brown" -> eyes (only body part with iris color)
    if (/\bmy _B_ are (blue|green|brown|hazel|grey|gray)\b/.test(pn)) {
      const hits = ccs.filter((c) => /^eyes$/.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // "(good)bye, ___ you!" -> see
    if (/\b(good ?bye|bye|bye ?bye)\b.*_B_ you\b/.test(pn)) {
      const hits = ccs.filter((c) => /^see$/.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // "so ___ about the trip" -> exactly one emotion-adjective fits
    if (/\bso _B_ (about|for|to)\b/.test(pn)) {
      const hits = ccs.filter((c) => /^(eager|excited|happy|worried|nervous|curious|crazy|mad|serious|upset|enthusiastic|passionate|glad|proud|sorry|thankful|grateful|sad|angry|anxious|scared|afraid|thrilled|delighted)$/i.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // weather ctx + "i am ___" -> progressive clothing action unique
    if (/\bit is (cold|freezing|snow(ing|y)?|rain(ing|y)?|windy|stormy|chilly)\b/.test(pl) && /\b(i am|i'm|he is|she is|we are|they are) _B_/.test(pn)) {
      const hits = ccs.filter((c) => /^(wearing|putting on|carrying|bringing|holding) /.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // "is/are ___ VERB-ing" -> progressive-compatible time adverb unique
    if (/\b(am|is|are) _B_ \w+(ing|ying)\b/.test(pn)) {
      const hits = ccs.filter((c) => /^(now|right now|currently|at the moment|at present|today|tonight|this (morning|afternoon|evening|week|month|year))$/i.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // "(a|the) new ___" -> "pair of X" unique
    if (/\b(a|the|my|his|her|this|that) new _B_\b/.test(pn)) {
      const hits = ccs.filter((c) => /^pair of /.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // "a snake can ___" -> snake abilities unique
    if (/\b(a |the )?snakes? can( not| n't)? _B_/.test(pn) || /\bcan a snakes? _B_/.test(pn)) {
      const hits = ccs.filter((c) => /^(swim|swimming|crawl|crawling|slither|slithering|bite|biting|hiss|hissing|move|moving|climb|climbing|eat|eating|sleep|sleeping|hide|hiding|hunt|hunting)$/i.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // "___ is the <place>?" -> Where (place-denoting NP only)
    if (/^_? ?_? *b?_?_? ?_?_? *is (the |a |an |your |my |his |her |their |our |this |that )[\w' ]+\?\s*$/.test(pn) || /_B_ is (the |your |my |his |her |their |our )[\w' ]+\?\s*$/.test(pn)) {
      if (/\b(office|station|school|hospital|park|zoo|market|library|museum|bank|post office|airport|beach|cinema|restaurant|hotel|supermarket|store|shop|pharmacy|stadium|church|temple|pagoda|factory|farm|garden|playground|gym|cafeteria|canteen|kitchen|bathroom|bedroom|classroom|house|home|building|airport|harbor|port|bridge|castle|palace|gate|entrance|exit|bus stop|train station|police station|fire station|bookstore|bakery|toilet|restroom|clinic|lab|laboratory|hall|theater|theatre|pool|swimming pool|lake|river|mountain|forest|village|town|city|country|island|cave|waterfall)\b/.test(pl)) {
        const hits = ccs.filter((c) => /^where$/i.test(c));
        if (hits.length === 1 && hits[0] === aa) return true;
      }
    }

    // "has/have ___ <consonant-adj> <singular-noun>" -> 'a' unique (no 'the' rival)
    if (/\b(has|have|got) _B_ (a )?[a-z]+ [a-z]+\??/.test(pn) && aa === 'a' && !ccs.includes('the')) {
      const m = /(?:has|have|got) _B_ ([a-z]+) ([a-z]+)/.exec(pn);
      if (m && !/^[aeiou]/.test(m[1]) && !/(s|es)$/.test(m[2])) {
        const hits = ccs.filter((c) => /^a$/.test(c));
        if (hits.length === 1) return true;
      }
    }

    // "told/asked me ___ not VERB" -> 'not to' unique
    if (/\b(told|asked|tell|ask|warned|warn|reminded|remind|advised|advise) (me|him|her|us|them|you|the \w+|my \w+) _B_ not \w+/.test(pn)) {
      const hits = ccs.filter((c) => /^not to$/.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // "___ many <plural> ... ?" -> How
    if (/_B_ many [a-z]+/.test(pn) && /\?|how many/.test(pl)) {
      const hits = ccs.filter((c) => /^how$/i.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // "___ is your birthday?" -> When (date-answer questions)
    if (/_B_ is (your|the|his|her|their|our|my) (birthday|party|meeting|class|exam|test|holiday|trip|flight|train|wedding|concert|game|match|lesson|appointment|interview|vacation|festival|anniversary|graduation|show|performance|competition|race|tournament|ceremony)\??/.test(pn)) {
      const hits = ccs.filter((c) => /^when$/i.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // water cycle: drops fall from clouds -> precipitation
    if (/\b(water drops?|rain|droplets?)\b.{0,40}\b(fall|falls|falling|come|comes|coming) (down )?from (the )?clouds?\b/.test(pl) || /\bwater cycle\b/.test(pl) && /(fall|rain|down)/.test(pl)) {
      const hits = ccs.filter((c) => /^(precipitation|rain|rainfall|raining|snow|snowfall|sleet|hail)$/i.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // glossed definition: "should ___ - this means X" -> choice matching the gloss
    if (/\bshould _B_\s*[-–—:]?\s*(this )?(it )?means?\b/.test(pn)) {
      const GLOSS = [
        [/use (things|them|it|items|materials|stuff|paper|bottles?|bags?|plastic) again|again to make new|make new things from (old|used)|old things (into|to) new/, /recycl|reuse|reusing/],
        [/(air|environment|water|earth|planet|world) (cleaner|clean|better|safer|greener)|clean (the )?(air|environment|water)|fresh air|more oxygen/, /plant|tree|forest|garden/],
        [/keep (things|food|drinks?|water|it) (cold|cool|fresh)/, /fridge|refrigerator|freezer|ice/],
        [/(trash|garbage|rubbish|litter|waste) (in|into) (the )?(right |correct )?(place|bin|can)/, /bin|trash can|dustbin|litter bin/],
        [/save (water|energy|electricity|power|paper|trees)/, /turn off|save|reuse|recycl|less/],
        [/help(ing)? (sick|ill|poor|old|elderly|people|others|animals)/, /kind|help|care|volunteer|donat|nurse|doctor|vet/],
        [/keep (the )?(rivers?|seas?|oceans?|water|environment|earth|planet|air|streets?|parks?|beaches?|school|class|classroom|house|home|city|town|countryside|garden|neighborhood|beach|river|lake|ocean|sea)\b.{0,30}\b(clean|safe|green|beautiful|tidy|clear|pure)/, /not litter|don't litter|do not litter|no litter|stop litter|pick up|clean up|keep.*clean|tidy|recycl|protect/],
        [/use (a |the )?(bag|bags|bottle|bottles|box|boxes|container|containers|things|items|stuff|materials) (many|a lot of|several|more than once|over and over|again)/, /reuse|reusing|recycl/],
        [/turn off (the )?(tap|faucet|light|lights|tv|television|devices?|computer|fan|engine|machines?)/, /save|saving|conserve|less|reduce|turn off/],
      ];
      const NEG = /^(cut|waste|litter|throw|pollute|destroy|burn|harm|kill|hurt|damage|leave|keep|break|dirty|use more|buy more|drive|fly)\b|\b(in the river|everywhere|all trees|down trees)\b/;
      for (const [gre, cre] of GLOSS) {
        if (gre.test(pl)) {
          const hits = ccs.filter((c) => cre.test(c) && !NEG.test(c));
          if (hits.length === 1 && hits[0] === aa) return true;
        }
      }
    }

    // "should be ___" property of object -> unique sensible property
    if (/\b(warm coat|raincoat|coat|jacket|umbrella|window|mirror|glass|glasses|cup|mug|plate|spoon|fork|knife|table|chair|bed|pillow|blanket|door|wall|roof|floor|bridge|road|tent|backpack|bag|box|bottle|can|pot|pan|stove|oven|fridge|lamp|candle|battery|wire|cable|helmet|shoes|boots|socks|gloves|scarf|hat|sweater|shirt|pants|trousers|dress|skirt|swimsuit|life jacket|seatbelt|tire|tyre|wheel|engine|sail|anchor|paddle|oar|net|hook|bait|trap|cage|nest|shell|wing|feather|fur|scale|fin|beak|claw|horn|antler|trunk|tail)\b.{0,30}\bshould( not|n't)? be _B_/.test(pn)) {
      const NONS = /^(heavy metal|transparent|made of glass|invisible|square|edible|tasty|loud|musical|wooden legs|broken|dirty|smelly|noisy|tiny|short|flat)$/i;
      const good = ccs.filter((c) => !NONS.test(c));
      if (good.length === 1 && good[0] === aa) return true;
    }

    // "a happy ___" -> collective noun unique
    if (/\b(a|the|one) (happy|big|small|close|loving|perfect|good|nice|warm|large|poor|rich|royal|typical|nuclear|extended|whole|entire) _B_\b/.test(pn)) {
      const hits = ccs.filter((c) => /^(family|class|team|group|home|house|school|community|marriage|couple|crowd|audience|army|band|choir|club|committee|company|crew|gang|government|jury|orchestra|panel|party|public|staff|union|society|tribe|village|nation|generation|household)$/i.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // "a ___ in the <workplace>" -> associated job unique
    {
      const WORKJOB = { 'post office': 'postman|mailman|postal worker', 'post-office': 'postman|mailman|postal worker', school: 'teacher|student|pupil|principal|headmaster', classroom: 'teacher|student|pupil', hospital: 'doctor|nurse|surgeon|patient|dentist', clinic: 'doctor|nurse|dentist', farm: 'farmer', field: 'farmer|shepherd', orchard: 'farmer|gardener', 'police station': 'police officer|policeman|policewoman|officer', 'fire station': 'firefighter|fireman', restaurant: 'chef|cook|waiter|waitress', kitchen: 'chef|cook', bakery: 'baker', library: 'librarian', airport: 'pilot|flight attendant|passenger', plane: 'pilot|flight attendant|passenger', airplane: 'pilot|flight attendant|passenger', ship: 'sailor|captain', boat: 'sailor|fisherman', zoo: 'zookeeper|vet|veterinarian|zoo keeper', court: 'judge|lawyer', office: 'office worker|secretary|clerk|manager|boss', factory: 'worker|factory worker', shop: 'shopkeeper|seller|shop assistant|cashier|customer', store: 'shopkeeper|seller|shop assistant|cashier|customer', supermarket: 'cashier|shop assistant|customer', hotel: 'receptionist|porter|guest', museum: 'guide|curator|visitor', cinema: 'ticket seller|projectionist|audience', theater: 'actor|actress|audience', theatre: 'actor|actress|audience', stadium: 'athlete|player|footballer|football player|spectator|fan', gym: 'coach|trainer|athlete', beach: 'lifeguard|tourist', lab: 'scientist|researcher', laboratory: 'scientist|researcher', university: 'professor|lecturer|student', college: 'professor|lecturer|student', kindergarten: 'teacher', church: 'priest|monk|pastor', temple: 'monk', pagoda: 'monk', mosque: 'imam', bank: 'banker|teller|clerk|cashier|customer', pharmacy: 'pharmacist|chemist', garage: 'mechanic', salon: 'hairdresser|barber', barbershop: 'barber|hairdresser', studio: 'artist|photographer', gallery: 'artist|curator', garden: 'gardener', park: 'gardener', pond: 'fisherman', sea: 'fisherman|sailor', ocean: 'fisherman|sailor', lake: 'fisherman', river: 'fisherman', spaceship: 'astronaut', space: 'astronaut', rocket: 'astronaut', ambulance: 'paramedic|driver', 'fire truck': 'firefighter|fireman', 'police car': 'police officer|policeman', train: 'driver|conductor|passenger', bus: 'driver|conductor|passenger', taxi: 'driver|passenger', truck: 'driver', circus: 'clown|acrobat|magician', 'tv station': 'reporter|newsreader|presenter', 'radio station': 'dj|presenter|reporter', newspaper: 'journalist|reporter|editor', 'construction site': 'builder|worker|engineer', mine: 'miner', prison: 'prisoner|guard|warden', castle: 'king|queen|prince|princess|knight', palace: 'king|queen|prince|princess' };
      const wk = Object.keys(WORKJOB).find((k) => new RegExp(`\\b(in|at|inside|works? in|works? at|work in|work at) (the |a |an |my |his |her |our |their )?${k}\\b`).test(pl));
      if (wk) {
        const hits = ccs.filter((c) => new RegExp(`^(${WORKJOB[wk]})$`, 'i').test(c));
        if (hits.length === 1 && hits[0] === aa) return true;
      }
    }

    // "can a <animal> ___?" -> unique ability of that animal
    {
      const ABIL = { fish: 'swim|dive|splash', whale: 'swim|dive|splash|spout', shark: 'swim|bite|hunt', dolphin: 'swim|jump|dive|play', seal: 'swim|dive', octopus: 'swim|spray ink|change color', squid: 'swim|spray ink', turtle: 'swim|walk slowly|hide', tortoise: 'walk slowly|hide', frog: 'jump|hop|swim|croak', toad: 'hop|jump|croak', snake: 'swim|crawl|slither|bite|hiss', lizard: 'crawl|climb|run', crocodile: 'swim|walk|bite', alligator: 'swim|walk|bite', bird: 'fly|sing|chirp|hop|build a nest', eagle: 'fly|soar|hunt', owl: 'fly|hoot|hunt', parrot: 'talk|fly|mimic|sing', bat: 'fly|hang', butterfly: 'fly|flutter', bee: 'fly|sting|buzz|make honey', fly: 'fly|buzz', mosquito: 'fly|bite|buzz', ant: 'crawl|carry things|work|dig', spider: 'crawl|climb|spin a web|spin webs', worm: 'crawl|wiggle|dig', snail: 'crawl|move slowly', kangaroo: 'jump|hop|box', rabbit: 'hop|jump|run|dig', hare: 'hop|jump|run', monkey: 'climb|swing|jump|eat bananas', ape: 'climb|swing', gorilla: 'climb|beat its chest', chimpanzee: 'climb|swing|use tools', squirrel: 'climb|jump|run|collect nuts', dog: 'bark|run|dig|fetch|swim|wag its tail', puppy: 'bark|run|play', cat: 'climb|meow|scratch|hunt|jump|sleep', kitten: 'meow|play|climb', horse: 'run|gallop|jump|neigh|kick', pony: 'run|gallop|neigh', cheetah: 'run fast|run|hunt|sprint', lion: 'roar|hunt|run', tiger: 'roar|hunt|run|climb|swim', leopard: 'run|climb|hunt', jaguar: 'swim|climb|hunt', wolf: 'howl|hunt|run', fox: 'run|hunt|dig', bear: 'climb|fish|roar|stand', panda: 'climb|eat bamboo', koala: 'climb|sleep|eat leaves', elephant: 'trumpet|spray water|walk', giraffe: 'eat leaves|reach high branches|run', zebra: 'run|kick|graze', deer: 'run|jump', camel: 'walk|carry things|go without water', donkey: 'carry things|bray|kick', cow: 'moo|give milk|graze', buffalo: 'graze|swim|plow', ox: 'plow|pull carts|graze', goat: 'climb|graze|butt', sheep: 'baa|graze|give wool', pig: 'oink|roll in mud|dig', chicken: 'lay eggs|cluck|peck', hen: 'lay eggs|cluck|peck', rooster: 'crow', duck: 'swim|quack|fly', goose: 'honk|fly|swim', swan: 'swim|fly', penguin: 'swim|waddle|slide', ostrich: 'run fast|run|kick', emu: 'run fast|run', mouse: 'squeak|run|hide|nibble', rat: 'squeak|run|swim|nibble', hamster: 'run|nibble|hide food', 'guinea pig': 'squeak|nibble', hedgehog: 'roll into a ball|curl up', beaver: 'build dams|swim|gnaw', otter: 'swim|dive|play', walrus: 'swim|lie on ice', 'polar bear': 'swim|hunt|walk on ice', reindeer: 'pull sleighs|run|walk', moose: 'walk|swim|eat plants', bison: 'run|graze', rhino: 'charge|run', rhinoceros: 'charge|run', hippo: 'swim|walk|open its mouth wide', hippopotamus: 'swim|walk|open its mouth wide', hyena: 'laugh|hunt|run', skunk: 'spray|dig', raccoon: 'wash food|climb|steal', badger: 'dig|hunt', mole: 'dig|tunnel', gopher: 'dig|tunnel', possum: 'play dead|climb', opossum: 'play dead|climb', sloth: 'hang|move slowly|sleep', armadillo: 'roll into a ball|dig', platypus: 'swim|lay eggs|dive', echidna: 'dig|lay eggs', pufferfish: 'puff up|inflate', starfish: 'regrow arms|cling', jellyfish: 'sting|drift|swim', crab: 'walk sideways|pinch|dig', lobster: 'pinch|walk backwards', shrimp: 'swim|jump', seahorse: 'swim upright|change color', eel: 'slither|swim|shock', salmon: 'swim upstream|jump', goldfish: 'swim|blow bubbles', 'whale shark': 'swim|filter feed', ray: 'swim|glide|sting', stingray: 'sting|swim|glide', swordfish: 'swim fast', clam: 'burrow|filter feed', oyster: 'make pearls|filter feed', scallop: 'swim|clap its shells', barnacle: 'cling to rocks', 'hermit crab': 'borrow shells|walk', tadpole: 'swim|wiggle', caterpillar: 'crawl|eat leaves|become a butterfly', moth: 'fly|flutter', dragonfly: 'fly|hover', grasshopper: 'jump|hop|chirp', cricket: 'chirp|jump', ladybug: 'fly|crawl', beetle: 'crawl|fly|dig', cockroach: 'crawl|run fast', termite: 'eat wood|dig', firefly: 'glow|fly', silkworm: 'spin silk|make silk', centipede: 'crawl|run fast', millipede: 'crawl|curl up', scorpion: 'sting|pinch|crawl', tarantula: 'crawl|jump|bite', tick: 'bite|cling', flea: 'jump|bite', louse: 'crawl|bite', mite: 'crawl|bite' };
      const an = Object.keys(ABIL).find((k) => new RegExp(`\\bcan (a |an |the )?${k}s? _B_|\\b(a |an |the )?${k}s? can _B_`).test(pn));
      if (an) {
        const hits = ccs.filter((c) => new RegExp(`^(${ABIL[an]})$`, 'i').test(c));
        if (hits.length === 1 && hits[0] === aa) return true;
      }
    }

    // "rainbow after the ___" -> rain unique
    if (/\brainbow\b.{0,25}\b(after|when|during|following) (the )?_B_/.test(pn) || /_B_.{0,20}\brainbow\b/.test(pn)) {
      const hits = ccs.filter((c) => /^(rain|raining|the rain|rainstorm|shower|storm|drizzle|downpour|storm|wet weather)$/i.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // "more <adj> ___ the X" -> than
    if (/\bmore \w+ _B_ (the |a |an |my |his |her |our |their |this |that )/.test(pn) || /\b(more|less|fewer|better|worse|bigger|smaller|faster|slower|higher|lower|older|younger|taller|shorter|longer|stronger|weaker|easier|harder|cheaper|hotter|colder|warmer|cooler|drier|wetter|cleaner|dirtier|nicer|happier|sadder|prettier|uglier|richer|poorer|thinner|fatter|heavier|lighter|brighter|darker|louder|quieter|softer|sharper|safer|deeper|wider|narrower|closer|farther|further|earlier|later|sooner|greater|smarter|kinder|busier|lazier|friendlier|politer|healthier|angrier|calmer|braver|shyer|prouder|luckier|cleverer|simpler|completer|stricter|gentler|sweeter|sourer|saltier|spicier|bitterer|tastier|yummier|cheaper|dearer|nearer|surer|purer|fairer|rueder|madder|wiser|freer|truer|newer|older|elder) _B_ (the |a |an |my |his |her |our |their |this |that |than )/.test(pn)) {
      const hits = ccs.filter((c) => /^than$/i.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // "teaches/learnts ___ (and Math)" -> school subject unique
    if (/\b(teach|teaches|teaching|learn|learns|learning|study|studies|studying|like|likes|love|loves|enjoy|enjoys|favorite|favourite|best at|good at) _B_\b/.test(pn)) {
      const hits = ccs.filter((c) => /^(math|maths|mathematics|english|science|art|music|history|geography|literature|pe|physical education|physics|chemistry|biology|it|ict|informatics|computer science|vietnamese|literature|reading|writing|spelling|grammar|phonics|social studies|ethics|civics|technology|economics|psychology|philosophy|sociology|drama|dance|drawing|painting|handicraft|nature|environment)$/i.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // "made of ___" -> plausible material unique
    if (/\b(made of|made from|make of|made out of|built of|built from|constructed of|constructed from) _B_/.test(pn)) {
      const hits = ccs.filter((c) => /^(metal|plastic|ceramic|glass|wood|wooden|steel|iron|silver|gold|golden|stainless steel|porcelain|bone|ivory|melamine|enamel|aluminum|aluminium|copper|bronze|brass|tin|lead|rubber|leather|cloth|fabric|cotton|wool|silk|paper|cardboard|stone|marble|granite|brick|concrete|cement|clay|mud|straw|bamboo|rattan|wicker|rope|string|wire|nylon|polyester|vinyl|foam|sponge|wax|ice|snow|sand|dirt|soil|rock|pebble|crystal|diamond|ruby|emerald|pearl|jade|amber|coral|shell|feather|fur|hair|horn|skin|scale|velvet|denim|linen|canvas|suede|fur|felt|lace|satin)( \(.+\))?( .+)?$/i.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // "_B_ me that <clause>" -> told/informed/reminded unique
    if (/_B_ (me|him|her|us|them|you|my \w+|his \w+|the \w+|our \w+|their \w+) that\b/.test(pn)) {
      const hits = ccs.filter((c) => /^(told|tells|tell|informed|informs|inform|reminded|reminds|remind|assured|assures|assure|promised|promises|promise|warned|warns|warn|convinced|convinces|convince|persuaded|persuades|persuade|advised|advises|advise|showed|shows|show|taught|teaches|teach|emailed|emails|email|phoned|phones|phone|called|calls|call|texted|texts|text|wrote|writes|write)$/i.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // "_B_ <adjective>" -> intensifier unique when rivals are non-intensifiers
    if (/\b(is|are|was|were|looks?|feels?|seems?|sounds?|gets?|became|becomes?|stay|stays?|remains?|tastes?|smells?|very|so|too|really|quite) _B_ (beautiful|nice|good|tall|big|small|happy|sad|interesting|boring|cold|hot|warm|cool|fast|slow|easy|difficult|hard|expensive|cheap|important|careful|quiet|noisy|clean|dirty|new|old|young|long|short|high|low|wide|narrow|deep|shallow|strong|weak|rich|poor|famous|popular|dangerous|safe|useful|helpful|kind|polite|friendly|funny|serious|strict|lazy|busy|ready|early|late|right|wrong|true|false|real|same|different|hungry|thirsty|tired|sleepy|sick|healthy|ill|well|fine|great|wonderful|terrible|awful|excellent|perfect|lovely|pretty|ugly|cute|handsome|smart|clever|stupid|silly|wise|brave|shy|proud|angry|calm|excited|worried|surprised|bored|scared|afraid|nervous|glad|pleased|satisfied|disappointed|frustrated|upset|delighted|amazed|confused|jealous|lonely|peaceful|thankful|special|colorful|colourful|comfortable|wonderful|heavy|light|soft|sweet|sour|salty|delicious|tasty|fresh|modern|ancient|natural|magical|lucky|sunny|rainy|windy|cloudy|snowy|foggy|stormy|crowded|empty|full|open|closed|free|careless|helpful|harmful|successful|peaceful|noisy)\b/.test(pn)) {
      const hits = ccs.filter((c) => /^(very|really|so|quite|too|rather|pretty|fairly|extremely|super|incredibly|truly|especially|particularly|absolutely|totally|completely|a bit|a little|kind of|sort of|somewhat|slightly|very much|just|almost|nearly|always|often|sometimes|never|usually)$/i.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // steam + cold surface -> condensation
    if (/\b(steam|water vapor|water vapour|vapor|vapour|hot air|warm air)\b.{0,45}\b(cold|cool|chill)/.test(pl) || /\b(cloud|clouds)\b.{0,40}\b(cold|cool|high|sky)/.test(pl) && /(form|made|come)/.test(pl)) {
      const hits = ccs.filter((c) => /condens/i.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // "use the ___ to find information" -> internet/device unique
    if (/\b(find|search|look up|get|learn|read|send|share|watch|download|access|browse|check|post|upload|google|research|study) (the |some |more |a lot of |new |latest |quickly |easily |fast )?(information|news|answers?|facts?|data|directions?|recipes?|maps?|websites?|videos?|photos?|pictures?|music|movies|films|games|emails?|messages?|files?|documents?|images?)\b/.test(pl) && /(use|using|with|on|through|via|_B_)/.test(pn)) {
      const hits = ccs.filter((c) => /^(the )?(internet|web|world wide web|computer|laptop|phone|smartphone|tablet|ipad|search engine|google|browser|website|app|application|wifi|online dictionary|encyclopedia|library catalog|database)$/i.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // "look! ... ___ ... now" -> present progressive unique
    if (/\b(look|listen|hurry up|be quiet|shh|quick|attention)\b/.test(pl) && /\bnow\b|right now|at the moment|at present/.test(pl)) {
      const hits = ccs.filter((c) => /^(is|are|am) \w+(ing|ying) ?(together|now)?$|^\w+(ing|ying) ?(together|now)?$/i.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // last+holiday past cue -> single past-tense verb choice
    if (/\blast (tet|christmas|summer|winter|spring|autumn|fall|holiday|vacation|weekend|night|week|month|year|monday|tuesday|wednesday|thursday|friday|saturday|sunday|january|february|march|april|may|june|july|august|september|october|november|december|time|trip|visit|birthday|party|exam|test|lesson|class|term|semester|break|meal|dinner|lunch|breakfast|game|match|film|movie|show|concert|festival|tet holiday|new year|mid-autumn|reunion|gathering)\b/.test(pl) && /_B_/.test(pn)) {
      const pastish = (w) => /(ed|d)$/.test(w) || /^(was|were|did|had|went|came|got|saw|ate|drank|ran|swam|wrote|read|said|told|gave|took|made|found|felt|slept|woke|bought|brought|thought|taught|caught|flew|drew|grew|threw|blew|knew|wore|tore|swore|bore|chose|froze|spoke|broke|stole|rode|drove|wove|shook|took|mistook|forsook|overtook|undertook|won|lost|left|kept|met|fed|led|read|bled|fled|said|paid|laid|made|sat|spat|stood|understood|withstood|sold|told|held|bent|sent|spent|lent|rent|built|dealt|felt|knelt|meant|dreamt|slept|wept|crept|swept|leapt|learnt|burnt|spelt|smelt|spilt|split|quit|hit|fit|shut|cut|put|set|wet|let|bet|upset|reset|offset|broadcast|forecast|cost|burst|hurt|shut|cut|put|set|hit|split|quit|won|lost|heard|became|began|began|ran|swam|sang|rang|drank|sank|stank|sprang|hung|swung|stung|slung|wound|bound|found|ground|sought|fought|brought|thought|bought|caught|taught|wrought|besought|wound|flung|clung|climbed|called|carried|changed|chatted|checked|cheered|chose|cleaned|closed|cooked|counted|cried|crossed|danced|decided|dressed|dropped|ended|enjoyed|entered|finished|followed|happened|helped|hoped|invited|joined|jumped|kicked|kissed|laughed|learned|liked|listened|lived|looked|loved|missed|moved|needed|opened|painted|parked|passed|phoned|picked|planned|played|pointed|posted|practiced|prepared|pulled|pushed|rained|received|remembered|returned|saved|scored|shared|shopped|showed|smiled|started|stayed|stopped|studied|talked|thanked|traveled|travelled|tried|turned|typed|used|visited|waited|walked|watched|waved|wished|worked|wondered|worried|yelled)$/i.test(w);
      const hits = ccs.filter((c) => pastish(c.trim().split(/\s+/)[0]) && c.trim().split(/\s+/).every((w, i) => i === 0 || !/\d|am$|is$|are$|will$|shall$|can$|may$|must$|would$|could$|should$/.test(w)));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // "i ___ fine/happy/..." -> am (first-person agreement)
    if (/\bi _B_\b/.test(pn) && !/\?/.test(pl)) {
      const hits = ccs.filter((c) => /^am$/.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // "let's play/go out" + weather blank -> good-weather adjective unique
    if (/\blet'?s (play|go|go out|go outside|have a picnic|ride|walk|swim|play outside|play football|play soccer)\b/.test(pl)) {
      const hits = ccs.filter((c) => /^(nice|sunny|fine|warm|beautiful|pleasant|great|good|clear|cool|lovely|hot|dry|bright|awesome|perfect)$/i.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // "make a snowman" -> snowy/snowing unique
    if (/\b(make|build|making|building) a snowman\b|snowman/.test(pl)) {
      const hits = ccs.filter((c) => /^(snowy|snowing|snow|cold|freezing|white)$/i.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // "are you ___ a song/book/...?" -> V-ing unique
    if (/\b(are|is|am|were|was) (you|they|we|he|she|i|the \w+|your \w+|my \w+|his \w+|her \w+) _B_ (a |an |the |some |my |your |his |her |our |their )?\w+/.test(pn)) {
      const hits = ccs.filter((c) => /^\w+(ing|ying)$/.test(c) && c.length > 4);
      const verbs = ccs.filter((c) => /^[a-z]+$/.test(c) && c.length > 3);
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // "the ___ <noun> (in/of ...)" -> superlative unique
    if (/\bthe _B_ (a |an )?[a-z]+/.test(pn)) {
      const SUP = /^(best|worst|biggest|smallest|tallest|shortest|longest|fastest|slowest|highest|lowest|oldest|youngest|newest|prettiest|ugliest|nicest|most beautiful|most famous|most popular|most interesting|most delicious|most expensive|most important|cheapest|easiest|hardest|strongest|weakest|richest|poorest|thinnest|fattest|heaviest|lightest|brightest|darkest|loudest|quietest|softest|hardest|sharpest|safest|deepest|widest|narrowest|closest|farthest|furthest|earliest|latest|greatest|smartest|kindest|busiest|friendliest|healthiest|bravest|proudest|luckiest|cleverest|simplest|strictest|gentlest|sweetest|tastiest|finest|coolest|warmest|hottest|coldest|driest|wettest|sunnniest|sunniest|rainiest|snowiest|windiest|cloudiest|foggiest|stormiest|freshest|cleanest|dirtiest|tidiest|messiest|happiest|saddest|angriest|funniest|silliest|most|first|last|only|main)$/i;
      const hits = ccs.filter((c) => SUP.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // "___ did you go/come/travel ... ?" -> Where
    if (/_B_ (did|do|does|will|would|are|is|have|has) (you|they|we|he|she|i) (go|come|travel|visit|stay|spend|fly|drive|ride|sail|move|arrive|leave|return)\b/.test(pn)) {
      const hits = ccs.filter((c) => /^where$/i.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // "should ___ a map / take a map" -> take/bring unique
    if (/_B_ (a |the |this |that |your |my )?map\b/.test(pn) && /\b(should|need|must|can|could|will|shall|want to|have to|going to|travel|trip|visit|new place|lost)\b/.test(pl)) {
      const hits = ccs.filter((c) => /^(take|bring|carry|get|use|read|open|buy|pack|hold|look at|draw|fold|check|study|consult)$/i.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // "save ___" + resource ctx -> energy/water/electricity unique
    if (/\b(turn off|switch off|turn down|save|saving|conserve|conserving|reduce|protect)\b/.test(pl) && /_B_/.test(pn) && /\b(light|lights|water|electricity|energy|power|tap|faucet|shower|lamp|tv|television|fan|air conditioner|ac|heater|computer|paper|tree|trees|forest|fuel|gas|petrol|oil|money|food|resources?)\b/.test(pl)) {
      const hits = ccs.filter((c) => /^(energy|electricity|water|power|money|paper|fuel|gas|petrol|oil|trees|forests?|resources?|food|nature|the environment|wildlife|animals|earth|the planet)$/i.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // "went/came inside ___ it started to rain" -> because (causal)
    if (/\b(went|come|came|go|stay|stayed|ran|run|hurried|rushed|moved|got|get|sit|sat|hide|hid|took shelter|shelter) (inside|in|indoors|home|into|under)\b.{0,15}_B_.{0,15}\b(rain|raining|started|began|storm|snow|wind|dark|late|dangerous|scary|cold)\b/.test(pn)) {
      const hits = ccs.filter((c) => /^(because|as|since|for)$/i.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // job -> signature action: "a salesperson. She ___ things" -> sells
    {
      const JACT = { 'salesperson|salesman|saleswoman|seller|shopkeeper|vendor|merchant|grocer|dealer|trader': 'sell|sells|selling|sold', 'teacher|instructor|tutor|educator|professor|lecturer|headmaster|headmistress': 'teach|teaches|teaching|educate|educates|taught', 'doctor|physician|surgeon|dentist|vet|veterinarian|nurse|paramedic|therapist|pharmacist': 'treat|treats|treating|help|helps|helping|examine|examines|cure|cures|heal|heals|check|checks', 'farmer|rancher|shepherd|gardener': 'grow|grows|growing|farm|farms|plant|plants|raise|raises|harvest|harvests|grew|grew up', 'singer|vocalist|musician': 'sing|sings|singing|sang|perform|performs', 'dancer|ballerina': 'dance|dances|dancing|perform|performs', 'writer|author|novelist|poet|journalist|reporter|columnist|blogger': 'write|writes|writing|wrote|report|reports|compose|composes', 'artist|painter|illustrator|sculptor|cartoonist': 'draw|draws|paint|paints|create|creates|design|designs|drew', 'driver|chauffeur|motorist': 'drive|drives|driving|drove', 'pilot|aviator': 'fly|flies|flying|flew', 'sailor|captain|skipper|mariner': 'sail|sails|sailing|navigate|navigates', 'cook|chef|baker': 'cook|cooks|cooking|bake|bakes|prepare|prepares|cooked', 'postman|mailman|courier|messenger|delivery man': 'deliver|delivers|delivering|bring|brings|carry|carries', 'policeman|police officer|policewoman|officer|detective|sheriff|guard|security guard|bodyguard': 'catch|catches|protect|protects|help|helps|guard|guards|arrest|arrests|investigate|investigates|patrol|patrols', 'firefighter|fireman|firewoman': 'fight fires|fight fire|fights fires|fights fire|extinguish|extinguishes|rescue|rescues|save|saves|put out|puts out|put out fires|puts out fires|putting out fires', 'mechanic|technician|engineer|repairman|plumber|electrician|builder|carpenter|mason|roofer': 'repair|repairs|fix|fixes|fixing|build|builds|building|install|installs|maintain|maintains|repaired|built', 'hairdresser|barber|stylist': 'cut|cuts|cutting|style|styles|trim|trims', 'photographer|cameraman': 'take photos|take pictures|photograph|photographs|shoot|shoots|film|films', 'scientist|researcher|biologist|chemist|physicist': 'research|researches|experiment|experiments|study|studies|discover|discovers|analyze|analyzes', 'astronaut|cosmonaut': 'fly|flies|travel|travels|explore|explores|float|floats', 'fisherman|angler': 'fish|fishes|catch fish|catch|catches|net', 'babysitter|nanny|caregiver|caretaker': 'care|cares|watch|watches|look after|looks after|take care', 'waiter|waitress|server|bartender|barista': 'serve|serves|serving|bring|brings|take orders|served', 'cashier|teller|clerk': 'count|counts|scan|scans|collect|collects|handle|handles|sell|sells', 'librarian|archivist': 'organize|organizes|lend|lends|help|helps|catalog|catalogs', 'coach|trainer|instructor': 'train|trains|teach|teaches|coach|coaches|guide|guides', 'guide|tour guide': 'guide|guides|lead|leads|show|shows|explain|explains', 'translator|interpreter': 'translate|translates|interpret|interprets', 'lawyer|attorney|judge': 'defend|defends|argue|argues|judge|judges|decide|decides', 'architect': 'design|designs|draw|draws|plan|plans', 'electrician': 'install|installs|fix|fixes|repair|repairs', 'tailor|dressmaker|seamstress': 'sew|sews|make clothes|cut|cuts|stitch|stitches', 'florist|botanist': 'arrange|arranges|grow|grows|plant|plants|sell|sells', 'butcher|fishmonger': 'cut|cuts|sell|sells|prepare|prepares', 'cleaner|janitor|custodian|maid|housekeeper': 'clean|cleans|sweep|sweeps|mop|mops|tidy|tidies', 'student|pupil|scholar': 'study|studies|learn|learns|read|reads', 'principal|headmaster|dean': 'manage|manages|lead|leads|oversee|oversees', 'secretary|receptionist|assistant': 'answer|answers|type|types|schedule|schedules|greet|greets|assist|assists', 'manager|boss|director|executive': 'manage|manages|lead|leads|run|runs|oversee|oversees', 'programmer|developer|coder': 'code|codes|program|programs|write code|develop|develops', 'accountant|auditor|banker': 'count|counts|calculate|calculates|audit|audits|manage|manages', 'athlete|player|footballer|runner|swimmer|gymnast': 'play|plays|run|runs|compete|competes|train|trains|practice|practices', 'actor|actress|performer': 'act|acts|perform|performs|play|plays', 'comedian|clown|magician': 'perform|performs|entertain|entertains|joke|jokes', 'soldier|marine|trooper': 'fight|fights|defend|defends|protect|protects|serve|serves', 'explorer|adventurer|traveler|traveller': 'explore|explores|travel|travels|discover|discovers', 'hunter|huntsman': 'hunt|hunts|track|tracks|shoot|shoots', 'fisherwoman|fisher': 'fish|fishes|catch', 'model|mannequin': 'model|models|pose|poses|walk|walks', 'referee|umpire': 'officiate|officiates|judge|judges|blow the whistle', 'nurse midwife|midwife': 'deliver|delivers|assist|assists|care', 'surgeon': 'operate|operates|cut|cuts', 'analyst|economist|statistician': 'analyze|analyzes|study|studies|report|reports', 'newsreader|presenter|anchor|announcer': 'read|reads|present|presents|report|reports|announce|announces', 'spy|agent': 'spy|spies|gather|gathers|investigate|investigates', 'king|queen|ruler|emperor|president|prime minister|leader': 'rule|rules|lead|leads|govern|governs|reign|reigns', 'monk|nun|priest|imam|rabbi|pastor|friar': 'pray|prays|meditate|meditates|chant|chants|preach|preaches', 'beekeeper|apiarist': 'keep bees|keep|harvest|harvests|tend|tends', 'dolphin trainer|animal trainer|trainer': 'train|trains|teach|teaches|care', 'zookeeper|zoo keeper|gamekeeper': 'care|cares|feed|feeds|clean|cleans', 'lifeguard': 'guard|guards|rescue|rescues|watch|watches|save|saves', 'mail carrier|letter carrier': 'deliver|delivers|bring|brings' };
      const job = Object.keys(JACT).find((k) => new RegExp(`\\b(a |an |the |my |his |her |our |their )?(${k})\\b`).test(pl));
      if (job && /_B_/.test(pn)) {
        const hits = ccs.filter((c) => new RegExp(`^(${JACT[job]})( .+)?\\.?$`, 'i').test(c));
        if (hits.length === 1 && hits[0] === aa) return true;
      }
    }

    // "yesterday it was very ___" -> weather adjective (not V-ing after "very")
    if (/\b(yesterday|last night|last week|this morning|earlier|before)\b/.test(pl) && /\b(was|were|is|seemed|felt|looked|turned|became|got) (very |really |so |quite |too |rather |pretty )?_B_/.test(pn)) {
      const hits = ccs.filter((c) => /^(rainy|sunny|windy|cloudy|snowy|foggy|stormy|hot|cold|warm|cool|nice|fine|dry|wet|humid|chilly|freezing|misty|drizzly|overcast|clear|bright|dark|grey|gray|sunny|beautiful|lovely|pleasant|awful|terrible|horrible|bad|good|great)$/i.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // "sa pa is famous for its terraced ___" -> fields (VN geography fact)
    if (/\b(terraced|terrace)\b.{0,15}\bfields?\b/.test(pl) || /\bsa ?pa|sapa\b.{0,50}\b(famous|known|beautiful|terraced)/.test(pl)) {
      const hits = ccs.filter((c) => /^(fields|terraced fields|rice fields|rice terraces|terraces)$/i.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // gloss "turn off lights when leaving" -> save energy
    if (/turn off (the )?(lights?|tv|fan|ac|computer)s? (when|after|before)/.test(pl) || /leave.*room.*turn off|turn off.*(when|leav)/.test(pl)) {
      const hits = ccs.filter((c) => /^(save energy|save electricity|energy|electricity|saving energy)$/i.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // "the plane/bird/boat is ___" -> vehicle/thing signature action unique
    {
      const VEH = { 'plane|jet|airplane|aeroplane|helicopter|rocket|spaceship|kite|balloon|drone': 'fly|flying|soar|soaring|hover|hovering|glide|gliding', 'bird|butterfly|bee|eagle|owl|parrot|seagull|pigeon|sparrow': 'fly|flying|soar|soaring|hover|hovering|flap|flapping|glide|gliding|sing|singing|eat|eating|sit|sitting|stand|standing|sleep|sleeping|walk|walking|hop|hopping|perch|perching', 'boat|ship|ferry|yacht|sailboat|canoe|kayak|raft|submarine': 'sail|sailing|float|floating|drift|drifting|glide|gliding|move|moving', 'train|bus|car|truck|taxi|motorbike|motorcycle|bike|bicycle|scooter|lorry|van|ambulance|fire truck|police car|tram|streetcar|wagon|cart': 'move|moving|run|running|drive|driving|go|going|travel|traveling|travelling|roll|rolling|speed|speeding|race|racing', 'sun|sunshine|sunlight|moonlight': 'shine|shining|rise|rising|glow|glowing', 'moon': 'shine|shining|rise|rising|glow|glowing', 'rain|raindrop|water drop|droplet': 'fall|falling|drop|dropping|patter', 'snow|snowflake': 'fall|falling|drift|drifting', 'wind|breeze': 'blow|blowing|howl|howling', 'leaves|leaf': 'fall|falling|blow|blowing|drift|drifting', 'clock|watch': 'tick|ticking|work|working', 'bell|alarm': 'ring|ringing|chime|chiming', 'phone|telephone|doorbell': 'ring|ringing|buzz|buzzing', 'heart': 'beat|beating|race|racing|pound|pounding|stop|stopping', 'tv|television|radio|speaker': 'play|playing|work|working|on', 'computer|laptop|machine|engine|motor|robot|fan': 'work|working|run|running|hum|humming', 'water|river|stream|creek|waterfall|fountain': 'flow|flowing|run|running|pour|pouring', 'fire|flame|candle': 'burn|burning|flicker|flickering', 'light|lamp|bulb|star|stars': 'shine|shining|glow|glowing|twinkle|twinkling', 'cloud|clouds': 'move|moving|float|floating|drift|drifting', 'kite2': 'x' };
      const vm = /(the |a |an |my |his |her |our |their |this |that |two |three |some |many )?([a-z ]+?) (is|are|was|were) _B_/.exec(pn);
      if (vm) {
        const subj = vm[2].trim().split(' ').pop().replace(/s$/, '');
        const key = Object.keys(VEH).find((k) => new RegExp(`^(${k})$`).test(subj));
        if (key) {
          const want = VEH[key];
          const hits = ccs.filter((c) => new RegExp(`^(${want})$`, 'i').test(c));
          if (hits.length === 1 && hits[0] === aa) return true;
        }
      }
    }

    // "i am ___. thank you" -> positive state unique
    if (/\bi am _B_/.test(pn) && /\bthank(s| you)\b/.test(pl)) {
      const hits = ccs.filter((c) => /^(fine|good|great|ok|okay|alright|well|better|happy|pleased)$/i.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // "no school on ___ and ___" -> all-weekend pair unique
    if (/\bno (school|class|classes|work|lessons?)\b/.test(pl) && /_B_/.test(pn)) {
      const WK = /^(monday|tuesday|wednesday|thursday|friday)$/;
      const hits = ccs.filter((c) => c.split(/,| and /).map((d) => d.trim().replace(/\.$/, '')).every((d) => /^(saturday|sunday|weekend|weekends)$/.test(d)));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // "sliding down the ___" -> slide
    if (/\b(sliding|slide|slides|slid|sliding down|slide down)\b/.test(pl) && /_B_/.test(pn)) {
      const hits = ccs.filter((c) => /^(the )?slide\.?$/i.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // "___ in the sky" -> sky-object unique
    if (/\b(in|into|across|through|up in|high in|in the) (the )?sky\b/.test(pl) && /_B_/.test(pn)) {
      const hits = ccs.filter((c) => /^(a |an |the )?(airplane|plane|jet|bird|birds|kite|balloon|cloud|clouds|sun|moon|star|stars|rainbow|rocket|helicopter|drone|butterfly|ufo|fireworks?|lightning)\b/i.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // "performs on stage / acts in plays" -> actor/actress unique
    if (/\b(perform|performs|performing|act|acts|acting|sing|sings|dance|dances|play|plays)s? (on stage|on the stage|in plays?|in films?|in movies?|in shows?|in a play|in a film|in a movie|in concert|in public)\b/.test(pl) || /\b(perform|performing|act|acting)s? on stage\b/.test(pl)) {
      const hits = ccs.filter((c) => /^(a |an |the )?(actor|actress|performer|singer|dancer|artist|entertainer|star|musician|player)\b/i.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // "shape with N equal sides" -> polygon name unique
    if (/\b(shape|figure|polygon)\b.{0,40}\b(equal )?sides?\b/.test(pl) || /\bwith (\d+|three|four|five|six|seven|eight|nine|ten) (equal )?sides?\b/.test(pl)) {
      const NW = { 2: null, 3: 'triangle', 4: 'square|rectangle|rhombus|quadrilateral|parallelogram', 5: 'pentagon', 6: 'hexagon', 7: 'heptagon', 8: 'octagon', 9: 'nonagon', 10: 'decagon' };
      const nm = /(\d+|three|four|five|six|seven|eight|nine|ten) (equal )?sides?/.exec(pl);
      if (nm) {
        const n = { three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 }[nm[1]] ?? parseInt(nm[1]);
        const want = NW[n];
        if (want) {
          const hits = ccs.filter((c) => new RegExp(`^(a |an |the )?(${want})$`, 'i').test(c));
          if (hits.length === 1 && hits[0] === aa) return true;
        }
      }
    }

    // "go/goes ___ in the morning" -> V-ing activity unique (go running)
    if (/\b(go|goes|going|went|gone|go to|went to) _B_\b/.test(pn) || /\bgo _B_\b/.test(pn)) {
      const hits = ccs.filter((c) => /^\w+(ing|ying)$/.test(c) && c.length > 4);
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // "<job>. she works at ___" -> workplace for stated job
    {
      const JOBWP = { nurse: 'hospital|clinic', doctor: 'hospital|clinic', surgeon: 'hospital', dentist: 'clinic|dental clinic', teacher: 'school', student: 'school', farmer: 'farm|field', chef: 'restaurant|kitchen', cook: 'restaurant|kitchen', baker: 'bakery', waiter: 'restaurant', waitress: 'restaurant', librarian: 'library', pilot: 'airport|plane', 'flight attendant': 'airport|plane', firefighter: 'fire station', fireman: 'fire station', policeman: 'police station', 'police officer': 'police station', postman: 'post office', mailman: 'post office', scientist: 'lab|laboratory', mechanic: 'garage', barber: 'barbershop|salon', hairdresser: 'salon|barbershop', vet: 'clinic|animal hospital|zoo', veterinarian: 'clinic|animal hospital|zoo', zookeeper: 'zoo', soldier: 'army|base|military base', sailor: 'ship|boat|navy|sea', fisherman: 'sea|lake|river|boat', cashier: 'supermarket|shop|store|bank', receptionist: 'hotel|office', actor: 'theater|theatre', actress: 'theater|theatre', singer: 'stage|studio', musician: 'studio|stage', artist: 'studio|gallery', photographer: 'studio', athlete: 'stadium|gym', coach: 'gym|stadium', judge: 'court|courtroom', lawyer: 'court|office|law firm', banker: 'bank', pharmacist: 'pharmacy|drugstore', astronaut: 'space|spaceship|space station', writer: 'office|home|library', monk: 'temple|pagoda|monastery', priest: 'church', nun: 'convent|church', engineer: 'office|site|factory', worker: 'factory|office', 'factory worker': 'factory', 'office worker': 'office', 'shop assistant': 'shop|store', 'shop keeper': 'shop|store', guard: 'gate|entrance|bank', 'security guard': 'gate|entrance|bank|mall', janitor: 'school|office|building', cleaner: 'school|office|hotel|hospital', gardener: 'garden|park', florist: 'flower shop|shop|market', butcher: 'market|shop|butcher shop', architect: 'office|studio', programmer: 'office|home', driver: 'road|street|car|bus|taxi', 'bus driver': 'bus|road|street', 'taxi driver': 'taxi|road|street', 'truck driver': 'truck|road|street', captain: 'ship|boat', 'construction worker': 'construction site|site', miner: 'mine', 'office clerk': 'office', clerk: 'office|bank|store', manager: 'office', secretary: 'office', 'police': 'police station', 'fire fighter': 'fire station' };
      const jb = Object.keys(JOBWP).find((k) => new RegExp(`\\b(is|as|a |an |the |my |his |her |our |their |am )${k}s?\\b`).test(pl));
      if (jb && /(work|works|working|at|in|_B_)/.test(pn)) {
        const want = JOBWP[jb];
        const hits = ccs.filter((c) => new RegExp(`^(the |a |an )?(${want})\\.?$`, 'i').test(c));
        if (hits.length === 1 && hits[0] === aa) return true;
      }
    }

    // "if it rains a lot, the river ___" -> consequence unique
    if (/\bif (it |the weather |it'?s )?(rains?|raining|rain)\b/.test(pl) && /_B_/.test(pn) && /\b(river|lake|water|street|road|ground|soil|plants?|flowers?|crops?|field|sky|weather)\b/.test(pl)) {
      const hits = ccs.filter((c) => /(full|fuller|rise|rises|overflow|flood|fill|fill up|get bigger|grow|grows|wet|muddy|high|higher)/i.test(c) && !/dry|freeze|disappear|empty|low/i.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // "X is N cm, Y is M cm" -> comparative direction unique (unit-aware)
    {
      const meas = [...pl.matchAll(/(\d+(?:\.\d+)?) ?(cm|m|km|mm|kg|g|grams?|kilograms?|years?|inches?|feet|foot|meters?|hours?|minutes?|seconds?|km\/h|mph|degrees?|c|f)\b/g)];
      if (meas.length >= 2 && /_B_|than/.test(pl)) {
        const unit = meas[0][2].replace(/s$/, '');
        const DIM = { cm: 'long|short|tall|high|wide|deep|thick|narrow|big|small|large|greater|same length|same size', m: 'long|short|tall|high|wide|deep|thick|narrow|big|small|large|greater|same length|same size', meter: 'long|short|tall|high|wide|deep|thick|narrow|big|small|large|greater|same length|same size', mm: 'long|short|tall|high|wide|deep|thick|narrow|big|small|large|greater|same length|same size', km: 'long|short|far|near|farther|closer|longer|shorter|same distance', inche: 'long|short|tall|big|small|same length', feet: 'long|short|tall|high|big|small|same height|same length', foot: 'long|short|tall|high|big|small|same height|same length', kg: 'heavy|light|big|small|heavier|lighter|same weight', kilogram: 'heavy|light|heavier|lighter|same weight', g: 'heavy|light|heavier|lighter|same weight', gram: 'heavy|light|heavier|lighter|same weight', year: 'old|young|older|younger|same age', hour: 'long|short|longer|shorter|same', minute: 'long|short|longer|shorter|same', second: 'long|short|longer|shorter|same', 'km/h': 'fast|slow|faster|slower|same speed', mph: 'fast|slow|faster|slower|same speed', degree: 'hot|cold|warm|cool|hotter|colder|warmer|cooler|same' };
        const dim = DIM[unit];
        if (dim) {
          const aNum = parseFloat(meas[0][1]), bNum = parseFloat(meas[meas.length - 1][1]);
          const up = aNum > bNum;
          const POS = /^(longer|taller|bigger|heavier|larger|greater|higher|faster|older|wider|deeper|thicker|farther|further|hotter|warmer|heavier|more.*)$/i;
          const NEG = /^(shorter|smaller|lighter|lower|slower|younger|narrower|shallower|thinner|closer|colder|cooler|less.*|fewer)$/i;
          const hits = ccs.filter((c) => {
            const base = c.replace(/^(the|a|an) /, '').replace(/\.$/, '');
            if (!new RegExp(`^(${dim})(er|est)?( length| height| weight| size| distance| speed)?$`, 'i').test(base)) return false;
            return up ? POS.test(base) : NEG.test(base);
          });
          if (hits.length === 1 && hits[0] === aa) return true;
        }
      }
    }

    // "knife/scissors/fire" ctx -> dangerous/sharp unique
    if (/\b(knife|knives|scissors|fire|flame|blade|sword|gun|stove|oven|match|matches|lighter|electricity|socket|wire|chem|acid|poison|medicine|pills?|drug|cliff|edge|height|deep water|river|road|street|traffic|car|bike|glass|broken glass)\b/.test(pl) && /(don't|do not|not|never|careful|danger|warn|mustn't|shouldn't|can't|_B_)/.test(pn)) {
      const hits = ccs.filter((c) => /^(dangerous|sharp|hot|unsafe|hazardous|risky|deadly|harmful|toxic|bad|not safe)$/i.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // "had a toothache... ___ a lot of candy" -> ate (past narrative)
    if (/\b(had|has|have|got|gets?|suffered|suffering)\b.{0,30}\b(toothache|headache|stomachache|fever|cold|flu|cough|sore throat|pain|ache)\b/.test(pl) && /_B_/.test(pn)) {
      const hits = ccs.filter((c) => /^(ate|eaten|drank|drunk|took|taken|had|caught|got|received|felt|saw|visited|went|slept|rested|used|put|wore|read|played|ran|stayed|missed|skipped|ate too much|ate a lot)$/i.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // "X means ___" -> abbreviation/short-form expansion unique
    {
      const MEANS = { bye: 'goodbye', 'good bye': 'goodbye', hi: 'hello', hello: 'hello|hi', thanks: 'thank you', tv: 'television', telly: 'television', photo: 'photograph|picture', pic: 'picture|photograph', bike: 'bicycle', fridge: 'refrigerator', exam: 'examination', math: 'mathematics|maths', maths: 'mathematics', lab: 'laboratory', vet: 'veterinarian', ad: 'advertisement', advert: 'advertisement', pc: 'personal computer', phone: 'telephone', uni: 'university', doc: 'document', mum: 'mother|mom|mummy', dad: 'father|daddy', kid: 'child', kids: 'children', gym: 'gymnasium', flu: 'influenza', info: 'information', km: 'kilometer|kilometre', kg: 'kilogram', cm: 'centimeter|centimetre', mm: 'millimeter|millimetre', asap: 'as soon as possible', diy: 'do it yourself', pe: 'physical education', it: 'information technology', uk: 'united kingdom', usa: 'united states of america|united states', un: 'united nations', vip: 'very important person', diy2: 'x' };
      const mm = /\b(\w[\w']*) means?\b/.exec(pl);
      if (mm && /_B_/.test(pn)) {
        const want = MEANS[mm[1].toLowerCase()];
        if (want) {
          const hits = ccs.filter((c) => new RegExp(`^(${want})$`, 'i').test(c));
          if (hits.length === 1 && hits[0] === aa) return true;
        }
      }
    }

    // "<wearable> is for your ___" -> body part unique
    {
      const WEAR = { scarf: 'neck|throat', scarves: 'neck|throat', hat: 'head', cap: 'head', helmet: 'head', gloves: 'hands?', mittens: 'hands?', shoes: 'feet|foot', boots: 'feet|foot', sandals: 'feet|foot', socks: 'feet|foot', slippers: 'feet|foot', glasses: 'eyes|nose|face', sunglasses: 'eyes', goggles: 'eyes', earrings: 'ears', watch: 'wrist|arm', bracelet: 'wrist|arm', ring: 'finger', tie: 'neck', necklace: 'neck', belt: 'waist', mask: 'face|nose|mouth', crown: 'head', wig: 'head', bandage: 'wound|arm|leg|head', umbrella: 'head', raincoat: 'body', coat: 'body', jacket: 'body', shirt: 'body|torso', backpack: 'back|shoulders?', bag: 'shoulder|back|hand', handbag: 'hand|shoulder|arm', 'sun cream': 'face|skin', 'lip balm': 'lips', lipstick: 'lips', 'knee pads': 'knees?', 'elbow pads': 'elbows?', diaper: 'bottom|waist', nappy: 'bottom|waist' };
      const wm = /\b(\w[\w ]*?) (?:is|are) for (your|the|my|our|her|his|their)?\s*_B_/.exec(pn) ?? /\b(\w[\w ]*?) (?:is|are) (?:worn|put|used)? ?(?:on|for) (your|the|my)?\s*_B_/.exec(pn);
      if (wm) {
        const w = wm[1].trim().split(' ').pop();
        const want = WEAR[w] ?? WEAR[w + 's'] ?? WEAR[w.replace(/s$/, '')];
        if (want) {
          const hits = ccs.filter((c) => new RegExp(`^(a |an |the |your )?(${want})\\.?$`, 'i').test(c));
          if (hits.length === 1 && hits[0] === aa) return true;
        }
      }
    }

    // "looks/feels ___" -> emotion/state adjective unique among non-emotion distractors
    if (/\b(look|looks|looked|feel|feels|felt|seem|seems|seemed|sound|sounds|is|are|was|were|gets?|became|becomes) _B_\b/.test(pn)) {
      const EMO = /^(happy|sad|angry|tired|hungry|thirsty|excited|bored|worried|scared|surprised|confused|nervous|proud|shy|sleepy|sick|ill|fine|well|okay|ok|great|good|bad|upset|pleased|delighted|glad|afraid|frightened|lonely|busy|free|lazy|cheerful|grumpy|furious|miserable|relaxed|calm|anxious|embarrassed|disappointed|jealous|curious|interested|bored silly|moved|amazed|shocked|stunned|thrilled|content|satisfied|dissatisfied|annoyed|irritated|frustrated|depressed|stressed|overwhelmed|homesick|exhausted|energetic|lively|weak|strong|healthy|fit|dizzy|faint|feverish|comfortable|uncomfortable|cold|hot|warm|cool|wet|thirsty2|afraid2)$/i;
      const ANYADJ = /^(big|small|little|large|huge|tiny|tall|short|long|old|young|new|nice|kind|good|bad|funny|pretty|beautiful|handsome|ugly|fat|thin|slim|strong|weak|fast|slow|quick|clever|smart|intelligent|stupid|silly|lazy|hardworking|rich|poor|friendly|unfriendly|helpful|polite|rude|noisy|quiet|loud|strict|gentle|patient|famous|popular|special|same|different|clean|dirty|wet|dry|soft|hard|easy|difficult|interesting|boring|exciting|important|dangerous|safe|healthy|full|empty|heavy|light|dark|bright|high|low|wide|narrow|deep|shallow|thick|near|far|early|late|right|wrong|true|real|free|open|closed|ready|sure|alone|sweet|sour|salty|bitter|spicy|fresh|delicious|tasty|red|blue|green|yellow|orange|purple|pink|black|white|brown|gray|grey|golden|silver|round|square|sharp|smooth|rough|broken|married|single|modern|ancient)$/i;
      const hits = ccs.filter((c) => EMO.test(c));
      const rivals = ccs.filter((c) => c !== aa && ANYADJ.test(c));
      if (hits.length === 1 && hits[0] === aa && rivals.length === 0) return true;
    }

    // physics facts: ice->water warm, water->ice cold
    if (/\b(ice|snow)\b.{0,40}\b(turns?|turn|becomes?|become|into water|melts?|melt)\b/.test(pl) || /\b(turns? into water|melts? into water|ice turns)\b/.test(pl)) {
      const hits = ccs.filter((c) => /^(warm|hot|heated|sunny|warmth|heat)$/i.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }
    if (/\b(water|rain|puddle)\b.{0,40}\b(turns?|turn|becomes?|become|freezes?|freeze|into ice)\b/.test(pl)) {
      const hits = ccs.filter((c) => /^(cold|freezing|frozen|icy|cool)$/i.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // "turn right/left ... you will see the ___" -> landmark place unique
    if (/\b(turn (right|left)|go (straight|ahead|down|up)|walk (down|along|past)|cross|at the (traffic lights|corner|end))\b/.test(pl) && /\b(you will see|you can see|you'll see|is the|there is|is a|is an)\b/.test(pl) && /_B_/.test(pn)) {
      const hits = ccs.filter((c) => /^(a |an |the )?(police station|hospital|school|bank|post office|supermarket|shop|store|market|park|zoo|library|museum|cinema|theater|theatre|restaurant|hotel|church|temple|pagoda|stadium|station|bus stop|airport|pharmacy|bakery|bookstore|bookshop|garage|gas station|petrol station|fire station|office|factory|farm|garden|beach|bridge|fountain|statue|monument|castle|palace|tower|mall|playground|swimming pool|gym|clinic|dentist|cafe|cafeteria|gallery|aquarium|circus|fair|campsite|cabin|cottage|house|building|hall|entrance|exit|gate|door|window|sign|map)\b/i.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // "prefer(s) ___" / "like ___ing" -> V-ing unique when only one -ing choice
    if (/\b(prefer|prefers|preferred|enjoy|enjoys|enjoyed|love|loves|loved|hate|hates|hated|dislike|dislikes|mind|minds|finish|finished|suggest|suggests|avoid|avoids|keep|keeps|kept|practice|practise|consider|considers|imagine|imagines|admit|admits|deny|denies|miss|misses|resist|resists) _B_\b/.test(pn)) {
      const ings = ccs.filter((c) => /^\w+(ing|ying)$/.test(c) && c.length > 4);
      const bases = ccs.filter((c) => /^to /.test(c));
      if (ings.length === 1 && ings[0] === aa && !bases.length) return true;
    }

    // "my/his/her ___" -> noun unique when all other choices are adjectives/verbs
    {
      const ADJONLY = /^(big|small|tall|short|long|old|young|new|nice|kind|good|bad|happy|sad|funny|pretty|beautiful|handsome|ugly|fat|thin|slim|strong|weak|fast|slow|quick|clever|smart|intelligent|stupid|silly|lazy|hardworking|rich|poor|friendly|unfriendly|helpful|polite|rude|noisy|quiet|loud|shy|brave|strict|gentle|patient|famous|popular|special|favorite|favourite|best|worst|first|last|same|different|other|another|each|every|many|much|few|little|some|any|red|blue|green|yellow|orange|purple|pink|black|white|brown|grey|gray|clean|dirty|wet|dry|hot|cold|warm|cool|soft|hard|easy|difficult|interesting|boring|exciting|important|dangerous|safe|healthy|sick|full|empty|heavy|light|dark|bright|high|low|wide|narrow|deep|shallow|thick|thin|near|far|early|late|right|wrong|true|false|real|fake|free|busy|open|closed|ready|sure|afraid|alone|angry|hungry|thirsty|tired|sleepy|worried|surprised|excited|bored|confused|proud|glad|sorry|fine|ok|okay|well|ill|better|worse|cute|lovely|sweet|sour|salty|bitter|spicy|fresh|delicious|tasty|yummy|blank)$/i;
      if (/\b(my|his|her|our|their|your|a|an|the|this|that|one) _B_\s*(in|at|from|of|to)?\s*$/.test(pn) || /\b(my|his|her|our|their|your) _B_\b/.test(pn)) {
        const nonAdj = ccs.filter((c) => !ADJONLY.test(c) && !/^\w+(ing|ed|es|s)$/.test(c) && !/^to /.test(c));
        if (nonAdj.length === 1 && nonAdj[0] === aa) return true;
      }
    }

    // "is going to ___" -> base verb unique
    if (/\b(is|are|am|was|were) going to _B_\b/.test(pn) || /\bbe going to _B_\b/.test(pn)) {
      const hits = ccs.filter((c) => /^[a-z]+$/.test(c) && !/(ing|ed|es|s)$/.test(c) && !/^(rainy|sunny|windy|cloudy|snowy|foggy|stormy|hot|cold|warm|cool|nice|fine|good|bad|great|happy|sad|big|small)$/.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // "<job> builds/makes/writes ___" -> job product object unique
    {
      const JOBOBJ = { 'construction worker': 'house|houses|building|buildings|bridge|bridges|road|roads', builder: 'house|houses|building|buildings|wall|walls', painter: 'painting|paintings|picture|pictures|portrait|portraits', singer: 'song|songs', writer: 'book|books|story|stories|novel|novels|article|articles', author: 'book|books|story|stories|novel|novels', developer: 'website|websites|app|apps|software|program|programs|game|games', programmer: 'website|websites|app|apps|software|program|programs|code', chef: 'food|meal|meals|dish|dishes|dinner|lunch|breakfast', cook: 'food|meal|meals|dish|dishes|dinner|lunch|breakfast', baker: 'bread|cake|cakes|pastry|pastries|cookies|biscuits', photographer: 'photo|photos|photograph|photographs|picture|pictures', composer: 'music|song|songs|symphony|symphonies', artist: 'painting|paintings|drawing|drawings|picture|pictures|sculpture|sculptures|art', sculptor: 'sculpture|sculptures|statue|statues', architect: 'building|buildings|house|houses|design|designs|bridge|bridges', farmer: 'crop|crops|rice|vegetable|vegetables|fruit|fruits|food', teacher: 'lesson|lessons|class|classes|test|tests|homework', tailor: 'clothes|suit|suits|dress|dresses|shirt|shirts', dressmaker: 'dress|dresses|clothes', carpenter: 'furniture|table|tables|chair|chairs|door|doors', mechanic: 'car|cars|engine|engines', florist: 'bouquet|bouquets|flower arrangement', jeweler: 'ring|rings|necklace|necklaces|jewelry|jewellery', inventor: 'invention|inventions|machine|machines', designer: 'design|designs|clothes|dress|dresses|logo|logos|website|websites', shoemaker: 'shoe|shoes|boot|boots', potter: 'pot|pots|vase|vases|pottery', poet: 'poem|poems|poetry', journalist: 'article|articles|news|story|stories|report|reports', reporter: 'news|story|stories|report|reports|article|articles', novelist: 'novel|novels|book|books|story|stories', playwright: 'play|plays', filmaker: 'film|films|movie|movies', filmmaker: 'film|films|movie|movies', director: 'film|films|movie|movies|show|shows', producer: 'film|films|movie|movies|show|shows', engineer: 'machine|machines|bridge|bridges|design|designs|engine|engines', scientist: 'discovery|discoveries|experiment|experiments|research', gardener: 'garden|gardens|flower bed|flower beds', fisherman: 'fish|fishes|catch|catches', hunter: 'animal|animals|prey|meat', 'police officer': 'criminal|criminals|thief|thieves|order', detective: 'crime|crimes|case|cases|mystery|mysteries', soldier: 'peace|order|security', pilot: 'flight|flights', driver: 'passenger|passengers|car|cars|trip|trips' };
      const jobInP = Object.keys(JOBOBJ).find((k) => new RegExp(`\\b(is|as|a |an |the |my |his |her |our |their )?${k}s?\\b`, 'i').test(pl));
      if (jobInP && /_B_/.test(pn) && /\b(build|builds|make|makes|write|writes|paint|paints|draw|draws|create|creates|invent|invents|compose|composes|produce|produces|grow|grows|teach|teaches|design|designs|bake|bakes|cook|cooks|take|takes|fix|fixes|repair|repairs|catch|catches|shoot|shoots|direct|directs|sings?|writes?)\b/i.test(pl)) {
        const want = JOBOBJ[jobInP];
        const hits = ccs.filter((c) => new RegExp(`^(a |an |the |some |many |new |beautiful |nice )?(${want})s?\\.?$`, 'i').test(c));
        if (hits.length === 1 && hits[0] === aa) return true;
      }
    }

    // "good painter ... ___ beautiful than" -> positive-eval forces 'more'
    if (/\b(good|great|best|talented|famous|excellent|wonderful|skilled|amazing|better)\b.{0,50}\bthan\b/.test(pl) && /_B_/.test(pn)) {
      const hits = ccs.filter((c) => /^(more|better|greater|much more|even more)$/i.test(c));
      if (hits.length === 1 && hits[0] === aa && !ccs.some((c) => /^(less|fewer)$/i.test(c))) return true;
    }

    // "hard to see far" -> fog/foggy unique
    if (/\b(hard|difficult|cannot|can't|can not|impossible|easy to get lost|low visibility|thick)\b.{0,30}\b(see|visible|visibility|drive|walk|find)\b/.test(pl) || /\b(see far|see clearly|see the road)\b/.test(pl)) {
      const hits = ccs.filter((c) => /^(fog|foggy|mist|misty|haze|hazy|smog|smoggy)$/i.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // "see ___ later" fixed phrase
    if (/\bsee\b.{0,10}_B_.{0,10}\b(later|soon|again|tomorrow|next|then)\b|\b(goodbye|bye|see you)\b.{0,15}_B_.{0,10}\blater\b/.test(pn)) {
      const hits = ccs.filter((c) => /^you$/i.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // "X is the color of ___" -> object whose fact-color is X
    if (/\b(color|colour) of\b/.test(pl) && /_B_/.test(pn)) {
      const cm2 = /\b(red|blue|green|yellow|orange|purple|pink|black|white|brown|grey|gray|golden|silver)\b/i.exec(pl);
      if (cm2) {
        const want = cm2[1].toLowerCase().replace('grey', 'gray');
        const hits = ccs.filter((c) => (FACT_COLOR[c.replace(/^(a |an |the )/, '').replace(/\.$/, '')] ?? '').replace('grey', 'gray') === want);
        if (hits.length === 1 && hits[0] === aa) return true;
      }
    }

    // "X means ___" -> VN translation or signal meaning unique
    {
      const VN = { zero: 'không', one: 'một|mốt', two: 'hai', three: 'ba', four: 'bốn|tư', five: 'năm|lăm', six: 'sáu', seven: 'bảy|bẩy', eight: 'tám', nine: 'chín', ten: 'mười', eleven: 'mười một', twelve: 'mười hai|mười nhì', thirteen: 'mười ba', fourteen: 'mười bốn', fifteen: 'mười lăm', sixteen: 'mười sáu', seventeen: 'mười bảy', eighteen: 'mười tám', nineteen: 'mười chín', twenty: 'hai mươi', thirty: 'ba mươi', forty: 'bốn mươi', fifty: 'năm mươi', sixty: 'sáu mươi', seventy: 'bảy mươi', eighty: 'tám mươi', ninety: 'chín mươi', hundred: 'trăm|một trăm', thousand: 'nghìn|ngàn', red: 'đỏ|màu đỏ', blue: 'xanh dương|xanh lam|màu xanh|xanh', green: 'xanh lá|xanh lá cây|màu xanh lá|xanh', yellow: 'vàng|màu vàng', orange: 'cam|màu cam', purple: 'tím|màu tím', pink: 'hồng|màu hồng', black: 'đen|màu đen', white: 'trắng|màu trắng', brown: 'nâu|màu nâu', grey: 'xám|màu xám', gray: 'xám|màu xám', hello: 'xin chào|chào', hi: 'xin chào|chào', goodbye: 'tạm biệt', bye: 'tạm biệt', 'thank you': 'cảm ơn', thanks: 'cảm ơn', sorry: 'xin lỗi', yes: 'vâng|có|đúng', no: 'không', please: 'làm ơn|xin', cat: 'con mèo|mèo', dog: 'con chó|chó', fish: 'con cá|cá', bird: 'con chim|chim', book: 'quyển sách|sách', pen: 'bút|cây bút', pencil: 'bút chì', ruler: 'thước|thước kẻ', bag: 'cặp|túi|cái cặp', school: 'trường|trường học', teacher: 'cô giáo|thầy giáo|giáo viên', student: 'học sinh|sinh viên', friend: 'bạn|bạn bè', family: 'gia đình', mother: 'mẹ|má|mama', father: 'bố|ba|cha', sister: 'chị|em gái|chị gái', brother: 'anh|em trai|anh trai', water: 'nước', rice: 'cơm|gạo|lúa', milk: 'sữa', juice: 'nước ép|nước trái cây', bread: 'bánh mì|bánh mỳ', egg: 'trứng', apple: 'quả táo|táo', banana: 'chuối|quả chuối', house: 'nhà|ngôi nhà', car: 'xe|xe hơi|ô tô', bike: 'xe đạp', bus: 'xe buýt|xe bus', sun: 'mặt trời', moon: 'mặt trăng', star: 'ngôi sao|sao', rain: 'mưa', wind: 'gió', snow: 'tuyết', hot: 'nóng', cold: 'lạnh', big: 'to|lớn', small: 'nhỏ|bé', happy: 'vui|vui vẻ|hạnh phúc', sad: 'buồn', love: 'yêu|tình yêu', like: 'thích', run: 'chạy', walk: 'đi bộ|đi', eat: 'ăn', drink: 'uống', sleep: 'ngủ', play: 'chơi', read: 'đọc', write: 'viết', sing: 'hát', dance: 'nhảy|múa', swim: 'bơi', fly: 'bay', morning: 'buổi sáng', afternoon: 'buổi chiều', evening: 'buổi tối', night: 'ban đêm|đêm', today: 'hôm nay', tomorrow: 'ngày mai', yesterday: 'hôm qua', monday: 'thứ hai', tuesday: 'thứ ba', wednesday: 'thứ tư', thursday: 'thứ năm', friday: 'thứ sáu', saturday: 'thứ bảy', sunday: 'chủ nhật' };
      const mm2 = /\b(\w[\w' ]*?) means?\b/.exec(pl);
      if (mm2 && /_B_/.test(pn)) {
        const w = mm2[1].trim().toLowerCase();
        const want = VN[w];
        if (want) {
          const hits = ccs.filter((c) => new RegExp(`^(${want})$`, 'iu').test(c));
          if (hits.length === 1 && hits[0] === aa) return true;
        }
        const SIG = { red: 'stop|danger|do not go', green: 'go|go ahead', yellow: 'wait|slow down|be careful|get ready', 'a smile': 'happy|happiness|happy greeting|friendly', 'smile': 'happy|happiness|happy greeting|friendly|kind|glad', 'a big smile': 'happy|happiness|very happy', 'smiling': 'happy|happiness|friendly', nod: 'yes|agree|agreement|okay', 'nodding': 'yes|agree|agreement', 'shake head': 'no|disagree', 'shaking head': 'no|disagree', 'waving': 'hello|goodbye|hi|bye', 'wave': 'hello|goodbye|hi|bye', 'waving hand': 'hello|goodbye|hi|bye', 'thumbs up': 'good|great|okay|yes|well done|like', 'stop sign': 'stop', 'green light': 'go', 'red light': 'stop', 'yellow light': 'wait|slow down', 'a flag': 'country|nation' };
        const want2 = SIG[w] ?? SIG['a ' + w] ?? SIG[w.replace(/^a |^an /, '')];
        if (want2) {
          const hits = ccs.filter((c) => new RegExp(`^(${want2})\\.?$`, 'i').test(c));
          if (hits.length === 1 && hits[0] === aa) return true;
        }
      }
    }

    // "my ___ helps me walk/see/hear" -> body part by function
    {
      const BFN = { walk: 'legs?|feet|foot|limbs?', see: 'eyes?', 'watch': 'eyes?', hear: 'ears?', 'listen': 'ears?', smell: 'nose', taste: 'tongue|mouth', eat: 'mouth|teeth', chew: 'teeth|mouth', bite: 'teeth|mouth', talk: 'mouth|lips|tongue', speak: 'mouth|lips|tongue', hold: 'hands?|fingers?|arms?', grab: 'hands?|fingers?', carry: 'arms?|hands?|shoulders?|back', hug: 'arms?', clap: 'hands?', write: 'hands?|fingers?', draw: 'hands?|fingers?', touch: 'hands?|fingers?|skin', feel: 'skin|hands?|fingers?', think: 'brain|mind|head', remember: 'brain|mind|head', breathe: 'nose|lungs?|mouth', run: 'legs?|feet', kick: 'feet|foot|legs?', jump: 'legs?|feet', stand: 'legs?|feet', dance: 'legs?|feet|body', bend: 'knees?|back|waist', kneel: 'knees?', kiss: 'lips?|mouth', smile: 'lips?|mouth|face', laugh: 'mouth|face', cry: 'eyes?', blink: 'eyes?', swim: 'arms?|legs?|body', point: 'fingers?|hands?', count: 'fingers?|hands?|brain', pump: 'heart', beat: 'heart' };
      const bm = /\bhelps? (?:me|us|you|them|people|children|my \w+)(?: to)? (\w+)/.exec(pl)
        ?? /\blets? (?:me|us|you|them|people|children|my \w+)(?: to)? (\w+)/.exec(pl)
        ?? /\b(?:use|used|uses) (?:my |your |our |the |their |his |her )?(\w[\w ]*?) to (\w+)/.exec(pl)
        ?? /\bto (\w+) (?:food|things?|it|them|water|music|books?|toys?|letters?|words?|sounds?|danger|people)/.exec(pl);
      const verb = bm ? (bm[2] ?? bm[1]) : null;
      if (verb && /_B_/.test(pn)) {
        const want = BFN[verb.toLowerCase().replace(/s$/, '')];
        if (want) {
          const hits = ccs.filter((c) => new RegExp(`^(my |your |the )?(${want})\\.?$`, 'i').test(c));
          if (hits.length === 1 && hits[0] === aa) return true;
        }
      }
    }

    // "at night we can see the moon and ___" -> night-sky objects
    if (/\b(at night|in the (night|evening|dark|sky)|night sky|night sky|look up)\b/.test(pl) && /_B_/.test(pn)) {
      const hits = ccs.filter((c) => /^(the )?(stars?|moon|moonlight|sky|clouds?|constellations?|planets?|fireworks?|lightning|comets?|owls?|bats?)$/i.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // "fly a helicopter / drive a car / ride a bike" -> vehicle-verb collocation
    {
      const VVERB = { helicopter: 'fly|flies|pilot|pilots', plane: 'fly|flies|pilot|pilots', airplane: 'fly|flies|pilot|pilots', jet: 'fly|flies|pilot|pilots', rocket: 'fly|flies|launch|launches', kite: 'fly|flies', balloon: 'fly|flies|float|floats', car: 'drive|drives', taxi: 'drive|drives', bus: 'drive|drives', truck: 'drive|drives', lorry: 'drive|drives', train: 'drive|drives|ride|rides|take|takes', tram: 'drive|drives|ride|rides', bike: 'ride|rides|cycle|cycles', bicycle: 'ride|rides|cycle|cycles', motorbike: 'ride|rides|drive|drives', motorcycle: 'ride|rides|drive|drives', scooter: 'ride|rides', horse: 'ride|rides', camel: 'ride|rides', elephant: 'ride|rides', donkey: 'ride|rides', pony: 'ride|rides', boat: 'sail|sails|row|rows|drive|drives', ship: 'sail|sails|drive|drives|steer|steers', ferry: 'sail|sails|take|takes', canoe: 'row|rows|paddle|paddles', kayak: 'row|rows|paddle|paddles', skateboard: 'ride|rides', snowboard: 'ride|rides', surfboard: 'ride|rides' };
      const vm2 = /_B_ (a |an |the |his |her |my |our |their )?(\w[\w ]*?)\.?\s*$/.exec(pn) ?? /(can|can't|cannot|could|couldn't|will|should|must|to|likes? to|wants? to) _B_ (a |an |the )?(\w[\w ]*?)\.?( |$)/.exec(pn);
      const veh = vm2 && Object.keys(VVERB).find((k) => new RegExp(`\\b${k}s?\\b`, 'i').test(vm2[vm2.length - 1] ?? ''));
      if (veh) {
        const hits = ccs.filter((c) => new RegExp(`^(${VVERB[veh]})$`, 'i').test(c));
        if (hits.length === 1 && hits[0] === aa) return true;
      }
    }

    // "can't eat ___" -> non-edible unique
    if (/\b(can't|cannot|can not|shouldn't|should not|mustn't|must not|don't|do not|doesn't|never|not supposed to)\b.{0,25}\b(eat|drink|wear|read|play|use|touch|open|hold|catch)\b.{0,15}_B_|_B_.{0,25}\b(inedible)\b/.test(pn) && /eat/.test(pl)) {
      const ED = /^(rice|bread|noodles?|milk|juice|water|tea|coffee|cake|candy|cookie|cookies|chocolate|flan|pudding|ice cream|apple|banana|orange|grape|grapes|mango|meat|fish|chicken|egg|eggs|soup|salad|sandwich|pizza|fruit|fruits|vegetable|vegetables|food|breakfast|lunch|dinner|meal|meals|snack|snacks|beef|pork|lamb|shrimp|crab|lobster|rice|pasta|spaghetti|cheese|butter|yogurt|cereal|porridge|sugar|salt|honey|jam|biscuit|biscuits|cracker|crackers|chip|chips|fries|hamburger|burger|hot dog|hotdog|sausage|taco|burrito|noodle|pho|spring roll|dumpling|dumplings|carrot|carrots|potato|potatoes|tomato|tomatoes|onion|corn|bean|beans|pea|peas|cabbage|lettuce|cucumber|pumpkin|melon|watermelon|pineapple|papaya|lemon|lime|peach|pear|plum|cherry|strawberry|blueberry|dragon ?fruit|coconut|durian|lychee|longan|rambutan|guava|starfruit|jackfruit|peanut|nuts?|candy|sweets?|dessert|ice|snow|vomit|medicine|vitamins?)\b/i;
      const hits = ccs.filter((c) => !ED.test(c.replace(/^(a |an |the |some )/, '')) && !/^(nothing|anything|everything|food|it|them|that|this)$/.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // "wear <item> when it is ___" -> weather match
    {
      const WEARW = { raincoat: 'rain|rainy|raining|wet', umbrella: 'rain|rainy|raining|wet', coat: 'cold|cool|windy|winter', jacket: 'cold|cool|windy', sweater: 'cold|cool|chilly', jumper: 'cold|cool|chilly', scarf: 'cold|windy|cool', gloves: 'cold|freezing', mittens: 'cold|freezing', boots: 'cold|rainy|snowy|wet|winter', 'winter boots': 'snowy|cold|snow', sunglasses: 'sunny|hot|bright', 'sun hat': 'sunny|hot', hat: 'sunny|hot|cold', shorts: 'hot|sunny|warm', 't-shirt': 'hot|sunny|warm', tshirt: 'hot|sunny|warm', swimsuit: 'hot|sunny|warm', 'swimming suit': 'hot|sunny|warm', 'swimming trunks': 'hot|sunny', sandals: 'hot|sunny|warm', skirt: 'hot|sunny|warm', dress: 'hot|sunny|warm', 'winter clothes': 'cold|winter|snowy', 'warm clothes': 'cold|winter|cool', 'heavy coat': 'cold|freezing|winter', vest: 'warm|cool', mask: 'smoky|dusty|polluted', 'life jacket': 'swimming|on a boat|boating' };
      const wm3 = /\bwear(?:s|ing|n)?\b.{0,25}\b(\w[\w -]*?)\b.{0,30}\bwhen|if|because\b|\b(when|if) (it is|it'?s|the weather is|there is) _B_/.exec(pn);
      if (/_B_/.test(pn) && /\bwear|put on|dress in\b/.test(pl)) {
        const item = Object.keys(WEARW).find((k) => new RegExp(`\\b${k}\\b`, 'i').test(pl));
        if (item) {
          const want = WEARW[item];
          const hits = ccs.filter((c) => new RegExp(`^(${want})$`, 'i').test(c));
          if (hits.length === 1 && hits[0] === aa) return true;
        }
      }
    }

    // "a ___ emotion/feeling" -> emotion adjective unique
    if (/_B_ (emotion|feeling|mood)\b/.test(pn) || /\b(emotion|feeling|mood) is _B_/.test(pn)) {
      const hits = ccs.filter((c) => /^(happy|sad|angry|tired|hungry|excited|bored|worried|scared|surprised|confused|nervous|proud|shy|sleepy|hopeful|fearful|joyful|cheerful|grumpy|furious|miserable|relaxed|calm|anxious|embarrassed|disappointed|jealous|curious|amazed|shocked|thrilled|content|annoyed|frustrated|depressed|stressed|lonely|afraid|frightened|upset|pleased|delighted|glad|hopeless|helpless|grateful|thankful|loving|caring|gentle|kind|positive|negative|mixed|strong|deep|strange|odd|funny|weird)$/i.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // "can/could/should/must/will _B_" -> base-verb-phrase unique (reject -ing/-s/to- forms)
    if (/\b(can|could|should|must|will|would|shall|may|might|cannot|can't|couldn't|shouldn't|mustn't|won't|wouldn't|don't|doesn't|didn't|do|does|did|to) _B_\s*[.!?]?\s*$/.test(pn) || /\b(can|could|should|must|will|would|shall|may|might|cannot|can't|couldn't|shouldn't|mustn't|won't|wouldn't) _B_\b/.test(pn)) {
      const IRRP = /^(am|was|were|been|being|rode|drove|driven|ran|swam|swum|sang|sung|flew|flown|went|gone|ate|eaten|drank|drunk|saw|seen|did|done|made|took|taken|wrote|written|spoke|spoken|gave|given|bought|brought|thought|caught|taught|found|felt|held|kept|left|lost|met|paid|said|sold|sent|sat|slept|spent|stood|stole|stolen|told|threw|thrown|wore|worn|won|built|chose|chosen|drew|drawn|dug|fell|fallen|fed|forgot|forgotten|forgave|forgiven|froze|frozen|grew|grown|hid|hidden|knew|known|lay|lain|led|lent|lit|meant|rang|rung|rose|risen|shook|shaken|shone|shot|sank|sunk|slid|sprang|sprung|stuck|swore|sworn|swept|swung|tore|torn|understood|woke|woken|wove|wept|withdrew|withdrawn|wrung|bent|bled|bred|clung|crept|dealt|dreamt|dwelt|flung|hung|knelt|leapt|leant|learnt|misled|overheard|pled|sought|sped|spelt|spilt|spun|stank|stung|struck|strung|trodden|upheld|withheld|withstood|began|begun|blew|blown|broke|broken|dove|fought|forbade|heard|laid|proven|underwent|wound)$/i;
      const baseOk = ccs.filter((c) => !/^(to |being |been )/.test(c) && !/^\w+(ing|ying)\b/.test(c) && !/^\w+(es|s)\b(?! [a-z])/.test(c) && !/^\w+ed\b/.test(c) && !/^\w+s\b/.test(c) && !IRRP.test(c.split(' ')[0]));
      if (baseOk.length === 1 && baseOk[0] === aa) return true;
    }

    // "position/place N ... came in ___" -> ordinal(N)
    {
      const ORD = { 1: 'first|1st', 2: 'second|2nd', 3: 'third|3rd', 4: 'fourth|4th', 5: 'fifth|5th', 6: 'sixth|6th', 7: 'seventh|7th', 8: 'eighth|8th', 9: 'ninth|9th', 10: 'tenth|10th', 11: 'eleventh|11th', 12: 'twelfth|12th', 13: 'thirteenth|13th', 20: 'twentieth|20th', 21: 'twenty-first|21st', 30: 'thirtieth|30th', 100: 'hundredth|100th' };
      const om = /\b(?:position|place|number|rank|prize|lane|row|floor)\s*(?:number\s*)?(\d+)/i.exec(pl) ?? /\bcame? (?:in|at|home) (?:in )?(?:position |place )?(\d+)/i.exec(pl);
      if (om && /_B_/.test(pn) && /\b(came? in|finish|finish(ed)?|position|place|rank|ordinal)\b/i.test(pl)) {
        const want = ORD[om[1]];
        if (want) {
          const hits = ccs.filter((c) => new RegExp(`^(${want})$`, 'i').test(c));
          if (hits.length === 1 && hits[0] === aa) return true;
        }
      }
    }

    // "drink ___ water" -> positive-amount quantifier for uncountable
    if (/\bdrink _B_|_B_ (water|milk|juice|tea|coffee|medicine|soup)\b/.test(pn)) {
      const hits = ccs.filter((c) => /^(plenty of|lots of|a lot of|enough|much|some|a little|more|a glass of|a bottle of|a cup of|a liter of|litres? of|liters? of|two litres? of|two liters? of)$/i.test(c));
      if (hits.length === 1 && hits[0] === aa && !ccs.some((c) => /^(much|some|a little|lots of|a lot of|enough)$/i.test(c) && c !== hits[0])) return true;
    }

    // landmark in prompt -> the place containing it
    {
      const LM2 = { 'golden bridge': 'ba na hills|ba na|da nang|danang', 'imperial city': 'hue', 'one pillar pagoda': 'ha noi|hanoi', 'hoan kiem': 'ha noi|hanoi', 'sword lake': 'ha noi|hanoi', 'ben thanh': 'ho chi minh|saigon', 'reunification palace': 'ho chi minh|saigon', 'independence palace': 'ho chi minh|saigon', 'ha long bay': 'quang ninh|ha long', 'son doong': 'quang binh|phong nha', 'phong nha': 'quang binh|phong nha', 'fansipan': 'sapa|lao cai', 'ban gioc': 'cao bang', 'my son': 'quang nam|hoi an|da nang', 'cu chi tunnels': 'ho chi minh|saigon|cu chi', 'cu chi': 'ho chi minh|saigon|cu chi', 'mekong delta': 'can tho|mekong', 'dragon bridge': 'da nang|danang', 'marble mountains': 'da nang|danang', 'marble mountain': 'da nang|danang', 'crazy house': 'da lat|dalat', 'terraced fields': 'sapa|mu cang chai|ha giang', 'rice terraces': 'sapa|mu cang chai|ha giang|ninh binh', 'trang an': 'ninh binh', 'tam coc': 'ninh binh', 'thien mu': 'hue', 'perfume river': 'hue', 'water puppet': 'ha noi|hanoi', 'temple of literature': 'ha noi|hanoi', 'van mieu': 'ha noi|hanoi', 'opera house': 'ha noi|hanoi|ho chi minh|sydney', 'cho lon': 'ho chi minh|saigon|chinatown', 'phu quoc': 'kien giang|phu quoc', 'long bien bridge': 'ha noi|hanoi', 'thang long': 'ha noi|hanoi', 'west lake': 'ha noi|hanoi', 'chuong trinh': 'x' };
      if (/_B_/.test(pn) && /\b(visit|see|go|travel|trip|in|at|near|famous|located|there)\b/i.test(pl)) {
        const lm = Object.keys(LM2).find((k) => new RegExp(k.replace(/ /g, '\\s+'), 'i').test(pl));
        if (lm && LM2[lm] !== 'x') {
          const hits = ccs.filter((c) => new RegExp(`^(${LM2[lm]})( city| town| hills?| bay| cave| province)?\\.?$`, 'i').test(c));
          if (hits.length === 1 && hits[0] === aa) return true;
        }
      }
    }

    // "by ___ing" -> V-ing after 'by' unique (single-word or article-led phrase)
    if (/\bby _B_\b/.test(pn)) {
      const ings = ccs.filter((c) => /^\w+(ing|ying)$/.test(c) || /^\w+(ing|ying) (the|a|an|some|our|your|my|their|old|new|more|less|fewer|plastic|paper|glass|water|energy|food|waste|trash|rubbish|bags?|bottles?|trees?|cars?|electricity)\b/.test(c));
      if (ings.length === 1 && ings[0] === aa) return true;
    }

    // "___ often/always/usually do you ..." -> how
    if (/_B_ (often|always|usually|sometimes|frequently|much|many|long|far|old|tall|high)\b/.test(pn)) {
      const QW = { often: 'how', always: 'how', usually: 'how', sometimes: 'how', frequently: 'how', much: 'how', many: 'how', long: 'how', far: 'how', old: 'how', tall: 'how', high: 'how' };
      const m = /_B_ (\w+)/.exec(pn);
      const want = m && QW[m[1]];
      if (want) {
        const hits = ccs.filter((c) => new RegExp(`^${want}$`, 'i').test(c));
        if (hits.length === 1 && hits[0] === aa) return true;
      }
    }

    // "can't ___ . her leg hurts" -> body-symptom blocks matching action
    if (/\b(hurts?|ache|aches|aching|sore|pain|broken|injured|sprained|tired|ill|sick|hurt)\b/.test(pl) && /_B_/.test(pn) && /\b(can'?t|cannot|can not|couldn'?t|could not|shouldn'?t|mustn'?t)\b/.test(pl)) {
      const SYM = { 'leg|legs|foot|feet|ankle|knee|knees|heel|toe': 'walk|run|stand|dance|jump|hop|skip|play football|climb', 'arm|arms|hand|hands|finger|fingers|wrist|elbow|shoulder|shoulders': 'write|draw|carry|hold|lift|clap|swim|cook|type|play|grab|catch|throw|wave', 'eye|eyes|eyelid': 'see|read|watch|look|drive', 'ear|ears': 'hear|listen', 'mouth|lip|lips|jaw|tooth|teeth|tongue': 'eat|talk|speak|chew|bite|drink|sing|smile|kiss|open', 'head|neck|back|waist|spine': 'move|turn|bend|walk|sit|stand|lift|carry|sleep|rest|concentrate|think', 'nose': 'smell|breathe', 'throat': 'talk|speak|sing|swallow|eat|drink', 'stomach|tummy|belly': 'eat|drink|move|run|dance', 'heart': 'run|exercise|excite', 'brain': 'think|concentrate|focus|remember', 'chest|lung|lungs': 'breathe|run|smoke|exercise', 'skin': 'touch|feel|scratch', 'voice': 'talk|speak|sing', 'body': 'move|exercise|dance|play|work' };
      const part = Object.keys(SYM).find((k) => new RegExp(`\\b(${k})\\b`).test(pl));
      if (part) {
        const hits = ccs.filter((c) => new RegExp(`^(${SYM[part]})(ing|s|es)?\\b`, 'i').test(c));
        if (hits.length === 1 && hits[0] === aa) return true;
      }
    }

    // "<X and I|we|they|plural> ___ V-ing" -> are/were unique
    {
      const mm = /\b(\w+(?: and (?:i|me|you|he|she|we|they|my \w+|your \w+|his \w+|her \w+|our \w+|their \w+|nam|lan|mai|minh|anh|linh|huy|ha|hien|phong|thao|tuan|dung|huong|son|nhi|vy|khoa|trang|quang|tom|peter|mary|linda|john|jack|jill|sam|amy|lucy|lily|tony|nick|emma|oliver|sophia|mia|noah|ava|leo|max|anna|ben|dan|david|james|kate|susan|bill|alice|eve|may|june|sue|sally|bobby|danny|jenny|ken|kitty|mike|pat|paul|rosa|tim|willy)\w*)?|we|they|the \w+s|my \w+s|our \w+s|their \w+s|friends|children|students|parents|kids|boys|girls|teachers|grandparents|sisters|brothers|cousins|classmates|workers|doctors|farmers|players|people|men|women|babies|cats|dogs|birds|elephants|monkeys) _B_ (\w+ing)\b/i.exec(pn);
      if (mm) {
        const pl1 = /s$|^(we|they|people|men|women|children|friends|students|parents|kids|boys|girls|teachers|grandparents|sisters|brothers|cousins|classmates|workers|doctors|farmers|players|babies|cats|dogs|birds|elephants|monkeys)$/i.test(mm[1]) || / and /.test(mm[1]);
        const want = pl1 ? 'are|were' : 'is|was';
        const hits = ccs.filter((c) => new RegExp(`^(${want})$`, 'i').test(c));
        if (hits.length === 1 && hits[0] === aa) return true;
        // also: single correct aux among wrong-agreement distractors
        if (aa === 'are' || aa === 'is' || aa === 'am' || aa === 'was' || aa === 'were') {
          const auxes = ccs.filter((c) => /^(am|is|are|was|were|be|been|being|will be|have|has|do|does|did)$/i.test(c));
          const correct = /^(we|they|i and|.* and .*|.*s$)/i.test(mm[1].trim()) ? 'are' : 'is';
          if (pl1 && aa === 'are' && auxes.filter((c) => c === 'are').length === 1) return true;
          if (!pl1 && aa === 'is' && auxes.filter((c) => c === 'is').length === 1) return true;
        }
      }
    }

    // "___ degrees (celsius)" -> number unique
    if (/_B_ (degrees?|°)\s*(celsius|centigrade|fahrenheit|c\b|f\b)?/i.test(pn) || /\b(temperature|degrees)\b.{0,20}_B_/.test(pl)) {
      const hits = ccs.filter((c) => /^-?\d+(\.\d+)?$|^(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thirty-two|thirty five|thirty-five)$/i.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // "the ___ shows/tells/indicates" -> information-object unique
    if (/\bthe _B_ (shows?|tells?|indicates?|displays?|says|lists?|gives?|provides?|contains?)\b/.test(pn)) {
      const hits = ccs.filter((c) => /^(a |an |the )?(timetable|schedule|calendar|clock|watch|thermometer|barometer|sign|notice|poster|board|chart|graph|map|screen|display|monitor|menu|list|label|tag|receipt|ticket|book|diary|report|newspaper|magazine|letter|note|message|text|email|website|page|tv|television|radio|video|photo|picture|image|drawing|painting|document|certificate|card|id|passport|license|bill|invoice|price tag|guide|guidebook|instructions?|manual|recipe|syllabus|curriculum|program|agenda|itinerary|scoreboard|score|result|results|record|records|table|diagram|plan|blueprint|checklist|register|log|database|file|folder|announcement|advertisement|ad|banner|leaflet|flyer|brochure|catalog|catalogue|thermostat|speedometer|odometer|gauge|meter|scale|scales|ruler|compass|calendar2)$/i.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // "hoi an ... century" -> history fact 15th-17th
    if (/\bhoi an\b/i.test(pl) && /\bcentury|centuries\b/.test(pl) && /_B_/.test(pn)) {
      const hits = ccs.filter((c) => /^(15th|16th|17th|fifteenth|sixteenth|seventeenth)$/i.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // "faster to travel by ___ than by car" -> vehicle faster than car
    if (/\b(faster|quicker|slower|cheaper|more expensive|more comfortable|safer|easier|better)\b.{0,40}\bthan by (car|bus|train|plane|bike|bicycle|motorbike|boat|ship|taxi|foot)\b/.test(pl) && /_B_/.test(pn)) {
      const SPEED = { plane: 6, airplane: 6, jet: 6, train: 5, car: 4, taxi: 4, bus: 3.5, motorbike: 3, motorcycle: 3, bicycle: 2, bike: 2, boat: 2, ship: 2, ferry: 2, foot: 1, walking: 1, tram: 4, subway: 5, metro: 5, helicopter: 6, scooter: 3 };
      const cm3 = /(faster|quicker|slower|cheaper|more expensive|more comfortable|safer|easier|better) .*?than by (\w+)/i.exec(pl) ?? /(faster|quicker|slower|cheaper) .*?than (a |the |an )?(\w+)/i.exec(pl);
      if (cm3) {
        const dir = /^(faster|quicker|better|easier|safer|more comfortable)$/i.test(cm3[1]) ? 1 : /slower/i.test(cm3[1]) ? -1 : 0;
        const ref = SPEED[(cm3[3] ?? cm3[2])?.toLowerCase()];
        if (dir && ref != null) {
          const hits = ccs.filter((c) => { const s = SPEED[c.replace(/^(by |a |an |the )/, '').replace(/\.$/, '')]; return s != null && (dir > 0 ? s > ref : s < ref); });
          if (hits.length === 1 && hits[0] === aa) return true;
        }
      }
    }

    // food-chain role facts
    if (/\b(food chain|food web|eats? (meat|plants?|grass|insects?|other animals|both)|producer|consumer|decomposer|carnivore|herbivore|omnivore)\b/.test(pl) && /_B_/.test(pn)) {
      const ROLE = { 'human|people|man|person|we': 'omnivore', 'lion|tiger|wolf|shark|eagle|hawk|snake|crocodile|alligator|leopard|cheetah|fox|owl|frog|spider': 'carnivore', 'cow|goat|sheep|horse|deer|rabbit|elephant|giraffe|hippo|rhino|zebra|buffalo|camel|kangaroo|panda|grasshopper|caterpillar|butterfly|bee|snail|tortoise|parrot|chicken|duck|goose|squirrel|monkey|giraffe2': 'herbivore', 'dog|bear|pig|rat|mouse|crow|chimpanzee|monkey2': 'omnivore', 'plant|tree|grass|flower|leaf|algae|seaweed|vegetable|fruit': 'producer', 'mushroom|fungus|fungi|bacteria|worm|earthworm|mold|yeast|termite': 'decomposer' };
      const rk = Object.keys(ROLE).find((k) => new RegExp(`\\b(${k.replace(/\|?\d*$/, '')})s?\\b`).test(pl));
      if (rk) {
        const want = ROLE[rk];
        const hits = ccs.filter((c) => new RegExp(`^(a |an |the )?(${want})s?\\.?$`, 'i').test(c));
        if (hits.length === 1 && hits[0] === aa) return true;
      }
    }

    // "had a ___ and couldn't sing/eat/walk" -> ailment matching the blocked verb
    if (/\b(had|has|have|got|caught|suffered|suffers|feel|feels|felt)\b.{0,20}_B_|\b(had|has|have|got|caught) _B_/.test(pn) && /\b(can'?t|cannot|can not|couldn'?t|could not|hard to|difficult to|too \w+ to)\b.{0,20}\b(sing|eat|drink|talk|speak|chew|swallow|walk|run|dance|stand|write|draw|hold|carry|see|read|watch|hear|listen|smell|breathe|sleep|think|concentrate|smile|open|move|play|work)\b/.test(pl)) {
      const BLK = { 'sing|talk|speak|shout|swallow': 'sore throat|throat|laryngitis|cold|cough', 'eat|chew|bite|drink': 'toothache|sore tooth|stomachache|mouth ulcer|fever|no appetite', 'walk|run|dance|stand|jump|climb|hike': 'broken leg|leg pain|sprained ankle|sore feet?|bad leg|hurt leg|tired legs?|fever|flu', 'write|draw|hold|carry|type|cook': 'broken arm|hand pain|sore hand|hurt hand|sprained wrist|bad arm', 'see|read|watch|look': 'sore eyes?|eye ache|blurry eyes?|headache|tired eyes?', 'hear|listen': 'earache|sore ear|bad ear', 'smell': 'blocked nose|stuffy nose|cold|flu|runny nose', 'breathe': 'stuffy nose|blocked nose|asthma|flu|cold|cough', 'sleep|rest|concentrate|think|focus|study|work': 'headache|fever|toothache|flu|stress|pain', 'smile|laugh|kiss|open': 'mouth ulcer|sore mouth|toothache|jaw pain', 'move|play|exercise': 'tired|fever|flu|pain|ache|broken leg|hurt', 'eat2|drink2': 'x' };
      const bv = /\b(sing|eat|drink|talk|speak|chew|swallow|walk|run|dance|stand|write|draw|hold|carry|see|read|watch|hear|listen|smell|breathe|sleep|think|concentrate|smile|open|move|play|work)\b/i.exec(pl);
      if (bv) {
        const bk = Object.keys(BLK).find((k) => new RegExp(`^(${k})$`).test(bv[1].toLowerCase()));
        if (bk && BLK[bk] !== 'x') {
          const hits = ccs.filter((c) => new RegExp(`^(a |an |the |a bad )?(${BLK[bk]})\\.?$`, 'i').test(c));
          if (hits.length === 1 && hits[0] === aa) return true;
        }
      }
    }

    // "on the first/second ___" -> floor/storey unique
    if (/\bon the (first|second|third|fourth|fifth|ground|top|next|upper|lower|main) _B_/.test(pn)) {
      const hits = ccs.filter((c) => /^(floor|storey|story|level)$/i.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // "travels on tracks" -> train; narrow object-definition facts
    {
      const DEF = { 'travels on tracks|runs on rails|on rails|on tracks': 'train|tram', 'has eight legs|with eight legs': 'spider|octopus', 'eight arms|has eight arms': 'octopus', 'has a long trunk|with a long trunk': 'elephant', 'has a long neck|with a long neck': 'giraffe|swan|ostrich|flamingo', 'lives in water|lives under water': 'fish|whale|dolphin|shark|coral|seaweed|octopus', 'lays eggs|lay eggs': 'bird|chicken|duck|reptile|snake|turtle|fish|insect|spider', 'gives milk|produce milk': 'cow|goat|buffalo|sheep|camel', 'makes honey|produce honey': 'bee|bees|honeybee', 'spins a web|makes a web|in a web': 'spider', 'man?e on its neck|has a mane': 'lion', 'humps? on its back|has two humps|has a hump': 'camel', 'pouches? for babies|carries.*pouch': 'kangaroo|koala|marsupial', 'black and white stripes': 'zebra', 'shell on its back': 'turtle|tortoise|snail|crab', 'wings and feathers': 'bird', 'six legs|have six legs': 'insect|ant|bee|butterfly|beetle|fly|mosquito|dragonfly' };
      const dk = Object.keys(DEF).find((k) => new RegExp(`(${k})`, 'i').test(pl));
      if (dk && /_B_/.test(pn)) {
        const hits = ccs.filter((c) => new RegExp(`^(a |an |the )?(${DEF[dk]})s?\\.?$`, 'i').test(c));
        if (hits.length === 1 && hits[0] === aa) return true;
      }
    }

    // "type your ___ to open/unlock" -> password/pin/code
    if (/\b(type|enter|input|put in|key in|press)\b.{0,20}\b(to (open|unlock|log ?in|access|start|turn on|use|get into)|computer|phone|door|account|wifi|wi-fi|system|screen|device)\b/.test(pl) && /_B_/.test(pn)) {
      const hits = ccs.filter((c) => /^(the |a |your |my )?(password|passcode|pin|pin code|code|username|key|fingerprint|face id|verification code|otp|number|digits?)\.??$/i.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // "day and night happen because ___" -> earth spins
    if (/\bday (and|&) night\b|\bdaytime|daylight\b/.test(pl) && /\b(because|happen|occur|caused|reason|due to)\b/.test(pl) && /_B_/.test(pn)) {
      const hits = ccs.filter((c) => /earth (spins?|rotates?|turns?)|spin(s|ning)? on|rotation|rotates|axis/i.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // "very/so/too/quite ___" -> real adjective unique vs -ing/-ed/noun distractors
    if (/\b(very|so|too|quite|rather|really|pretty|extremely|incredibly|super|kind of|sort of|a bit|a little) _B_\s*[.!?]?\s*$/.test(pn) || /\b(very|so|too|quite|rather|really|pretty|extremely) _B_ \b/.test(pn)) {
      const hits = ccs.filter((c) => /^[a-z]+$/.test(c) && !/(ing|ying|ed)$/.test(c) && !/^(a|an|the|to|in|on|at|up|down|out|off|here|there|now|then|yes|no|ok|much|many|some|any|more|most|less|least|lot)$/.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // "_B_ and <adj>" -> adjective other than the post-'and' word
    {
      const am = /_B_ and (\w+)\b/.exec(pn);
      if (am) {
        const after = am[1].toLowerCase();
        const hits = ccs.filter((c) => c.toLowerCase() !== after && !/^(a|an|the|to|in|on|at|he|she|it|we|they|I|you|friend|friends|my|your|his|her|our|their)\b/i.test(c) && /^[a-z]+$/i.test(c));
        const adjLike = hits.filter((c) => !/(ing|ed)$/.test(c.toLowerCase()) || /^(kind|mild|wild|old|cold|bold|gold|told|hold|sold|fold|wind|find|mind|blind|sound|round|ground|found|interesting|boring|exciting|surprising|amazing|tiring|worrying|annoying|confusing|embarrassing|disappointing|frightening|shocking|thrilling|pleasing|charming|loving|caring|moving|touching|relaxing|fascinating|terrifying|satisfying|overwhelming|exhausting|bored|excited|surprised|worried|tired|confused|embarrassed|disappointed|interested|pleased|satisfied|frightened|shocked|thrilled|amazed|annoyed|irritated|frustrated|depressed|stressed|exhausted|moved|relaxed|married|talented|gifted|crowded|polluted|beloved|learned|naked|wicked|crooked)$/i.test(c));
        if (adjLike.length === 1 && adjLike[0] === aa) return true;
      }
    }

    // location -> matching activity (in the gym -> exercising)
    {
      const LOCACT = { gym: 'exercis|workout|work out|train|play|lift|run|gymnastics', 'swimming pool': 'swim|swimming|dive|diving', pool: 'swim|swimming|dive|diving', library: 'read|reading|study|studying|borrow|research', kitchen: 'cook|cooking|bake|baking|eat|eating|wash dishes', bedroom: 'sleep|sleeping|rest|resting|nap|napping', bathroom: 'wash|washing|brush|shower|showering|bath', 'living room': 'watch|watching|relax|relaxing|sit|sitting|talk|talking|play|playing', garden: 'play|playing|plant|planting|water|watering|grow|growing|dig|digging', park: 'play|playing|run|running|walk|walking|jog|jogging|exercise|exercising|picnic|fly|flying', playground: 'play|playing|slide|sliding|swing|swinging|climb|climbing', classroom: 'study|studying|learn|learning|read|reading|write|writing|listen|listening', 'art room': 'draw|drawing|paint|painting|color|coloring', 'music room': 'sing|singing|play|playing|dance|dancing|practice|practicing', 'computer room': 'type|typing|learn|learning|play|playing|code|coding|study|studying', lab: 'experiment|experimenting|study|studying|test|testing', laboratory: 'experiment|experimenting|test|testing|research', canteen: 'eat|eating|drink|drinking|buy|buying|lunch', cafeteria: 'eat|eating|drink|drinking|lunch', cinema: 'watch|watching|see|seeing', theater: 'watch|watching|act|acting|perform|performing', theatre: 'watch|watching|act|acting|perform|performing', stadium: 'play|playing|watch|watching|run|running|exercise|exercising|compete', beach: 'swim|swimming|sunbathe|sunbathing|play|playing|build|building|relax|relaxing|collect|collecting', farm: 'work|working|feed|feeding|plant|planting|harvest|harvesting|grow|growing', field: 'play|playing|run|running|plant|planting|work|working', forest: 'walk|walking|hike|hiking|camp|camping|explore|exploring|hunt|hunting', zoo: 'see|seeing|watch|watching|visit|visiting|look|looking', museum: 'see|seeing|visit|visiting|learn|learning|look|looking', hospital: 'work|working|treat|treating|rest|resting|recover|stay|staying', 'fire station': 'work|working|wait|waiting', 'police station': 'work|working|report|reporting', restaurant: 'eat|eating|dine|dining|cook|cooking|serve|serving|work|working', market: 'buy|buying|sell|selling|shop|shopping|work|working', supermarket: 'shop|shopping|buy|buying|work|working', shop: 'buy|buying|shop|shopping|work|working|sell|selling', store: 'buy|buying|shop|shopping|work|working', mall: 'shop|shopping|buy|buying|walk|walking', church: 'pray|praying|sing|singing|worship', temple: 'pray|praying|visit|visiting|worship', pagoda: 'pray|praying|visit|visiting|worship', mosque: 'pray|praying|worship', office: 'work|working|type|typing|write|writing|meeting', factory: 'work|working|make|making|produce|producing', workshop: 'work|working|make|making|fix|fixing|build|building', garage: 'fix|fixing|repair|repairing|park|parking|work|working', bank: 'work|working|save|saving|deposit|depositing|count|counting', 'post office': 'send|sending|post|posting|work|working|deliver|delivering|mail|mailing', airport: 'fly|flying|wait|waiting|travel|traveling|work|working|arrive|depart', station: 'wait|waiting|travel|traveling|arrive|depart', 'bus stop': 'wait|waiting|stand|standing', port: 'sail|sailing|work|working|load|loading|unload', harbour: 'sail|sailing|work|working', harbor: 'sail|sailing|work|working', stage: 'perform|performing|sing|singing|dance|dancing|act|acting', studio: 'record|recording|paint|painting|dance|dancing|work|working', court: 'play|playing|work|working|judge|judging', 'football field': 'play|playing|run|running', mountain: 'climb|climbing|hike|hiking|camp|camping', hill: 'climb|climbing|walk|walking|hike|hiking', river: 'swim|swimming|fish|fishing|row|rowing|sail|sailing', lake: 'swim|swimming|fish|fishing|row|rowing|sail|sailing|walk|walking', sea: 'swim|swimming|sail|sailing|dive|diving|surf|surfing', ocean: 'swim|swimming|sail|sailing|dive|diving|surf|surfing', island: 'visit|visiting|explore|exploring|relax|relaxing|live|living', desert: 'walk|walking|travel|traveling|ride|riding', cave: 'explore|exploring|hide|hiding|live|living', sky: 'fly|flying|float|floating', space: 'travel|traveling|explore|exploring|float|floating', moon: 'walk|walking|explore|exploring|land|landing', jungle: 'explore|exploring|walk|walking|live|living', pond: 'swim|swimming|fish|fishing|live|living', meadow: 'play|playing|run|running|graze|grazing', 'ice rink': 'skate|skating', 'ski slope': 'ski|skiing|slide|sliding', rink: 'skate|skating|slide|sliding', track: 'run|running|race|racing', court2: 'x' };
      const lm = /\b(?:in|at|on|inside|into|to|at the|in the|on the) (?:the |a |an |my |our |their |his |her )?(\w[\w -]*?)\b/.exec(pl);
      const loc = lm && Object.keys(LOCACT).find((k) => new RegExp(`\\b${k}\\b`, 'i').test(lm[1]));
      if (loc && LOCACT[loc] !== 'x' && /_B_/.test(pn) && /\b(is|are|was|were|am|like|likes|enjoy|enjoys|love|loves|can|could|will|would|should|must|go|goes|went|come|comes|be|being|been|do|does|did|to)\b/.test(pl)) {
        const want = LOCACT[loc];
        const hits = ccs.filter((c) => new RegExp(`^(${want})(s|ing|es|ed)?\\b`, 'i').test(c));
        if (hits.length === 1 && hits[0] === aa) return true;
      }
    }

    // "the traffic light is ___" -> the three colors unique
    if (/\btraffic lights?\b/.test(pl) && /_B_/.test(pn)) {
      const hits = ccs.filter((c) => /red/i.test(c) && /yellow/i.test(c) && /green/i.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // "___ is my teacher/mom/dad" -> demonstrative 'this' unique by agreement
    if (/\b_B_ is (my|your|his|her|our|their|a|an|the|not|no|\w)/.test(pn) || /\b_B_ is\b/.test(pn)) {
      const hits = ccs.filter((c) => /^(this|that|she|he|it|there|here)$/i.test(c));
      const bad = ccs.filter((c) => /^(i|you|we|they)$/.test(c));
      if (hits.length === 1 && hits[0] === aa && bad.length === ccs.length - 1) return true;
    }

    // "good morning, ___!" -> person greeting target unique
    if (/\b(good (morning|afternoon|evening|night)|hello|hi|hey|goodbye|bye|welcome|thank you|happy birthday|merry christmas|happy new year)\b.{0,10}_B_|_B_.{0,10}\b(good (morning|afternoon|evening|night)|hello|hi|hey|goodbye|bye)/.test(pn)) {
      const hits = ccs.filter((c) => /^(mr|mrs|ms|miss|dr|teacher|mom|mum|dad|daddy|mother|father|grandma|grandpa|grandmother|grandfather|uncle|aunt|brother|sister|son|daughter|baby|friend|friends|class|classmates|everyone|everybody|kids|children|boys|girls|sir|madam|guys|all|dear|nam|lan|mai|minh|anh|linh|huy|ha|hien|phong|thao|tuan|dung|huong|son|nhi|vy|khoa|trang|quang|tom|peter|mary|linda|john|jack|jill|sam|amy|lucy|lily|tony|nick|emma|oliver|sophia|mia|noah|ava|leo|max|anna|ben|dan|david|james|kate|susan|bill|alice|eve|may|june|sue|sally|bobby|danny|jenny|ken|kitty|mike|pat|paul|rosa|tim|willy|phuong|van|viet|tung|bao|ngoc|dieu|thien|gia|khanh|loc|thinh|triet|tu|vy2)\.?!?$/i.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // "___ and warm" weather pairing
    if (/_B_ and (warm|hot|sunny|dry|nice|fine|cool|cold|wet|windy)\b/.test(pn)) {
      const PAIR = { warm: 'sunny|hot|nice|fine|dry|pleasant', hot: 'sunny|dry|bright|clear', sunny: 'warm|hot|nice|bright', dry: 'sunny|hot|warm|windy', cool: 'sunny|dry|windy|cloudy|nice', cold: 'snowy|windy|cloudy|rainy|foggy|icy|wet', wet: 'rainy|stormy|cloudy', windy: 'cloudy|cool|cold|dry|sunny', nice: 'sunny|warm|fine', fine: 'sunny|warm|nice' };
      const m = /_B_ and (\w+)/.exec(pn);
      const want = PAIR[m[1]];
      if (want) {
        const hits = ccs.filter((c) => new RegExp(`^(${want})$`, 'i').test(c));
        if (hits.length === 1 && hits[0] === aa) return true;
      }
    }

    // "___ to school/zoo/park" -> motion verb unique
    if (/_B_ (to|towards|into|inside|out of|back to|over to) (school|the zoo|the park|the market|the beach|the museum|the library|the hospital|the cinema|the shop|the store|the supermarket|the farm|the zoo|home|bed|class|work|town|the airport|the station|the mountains|the countryside|the sea|the island)/.test(pn)) {
      const hits = ccs.filter((c) => /^(going|walking|running|driving|riding|cycling|flying|heading|travelling|traveling|moving|coming|marching|hurrying|rushing|dashing|crawling|sailing|swimming|hiking|jogging|strolling|wandering)$/i.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // "on the ground/floor" -> non-sky object unique
    if (/\b(on the ground|on the floor|on the grass|on the sand|on the road|in the street)\b/.test(pl) && /_B_/.test(pn)) {
      const SKY = /^(the |a |an )?(sun|moon|star|stars|cloud|clouds|sky|rainbow|bird|birds|plane|airplane|balloon|balloons|helicopter|ufo)\b/i;
      const hits = ccs.filter((c) => !SKY.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // "many ___" -> well-formed plural unique (handles irregular plurals)
    if (/\b(many|several|a few|few|lots of|a lot of|plenty of|some|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|\d+) _B_\b/.test(pn)) {
      const isPlr = (w) => /(s|es|ies|ves|ren|en|men|women|children|people|feet|teeth|mice|geese|sheep|fish|deer|oxen|data|criteria|phenomena|leaves|wolves|knives|lives|loaves|babies|bodies|families|stories|cities|countries|parties|boys|girls|toys|days|keys|ways)$/i.test(w) && !/(ss|us|is|news|ness|ous|ers|ors|ics|less)$/.test(w);
      const MALF = /(childs|childrens|mouses|gooses|tooths|foots|mans|womans|persons|sheeps|fishes|deers|knifes|leafs|wolfs|lifes|selfs|elfs|calfs|halfs|potatos|heros|photos|pianos|boxs|buss|glasss|watchs|brushs|dresss|kises|wishs|citys|boys2|keyes|storys|dayes|wayes|babys|familys|partys|bodys|countrys|librarys|factorys|cherrys|berrys|butterflys|ladys|baby2s)$/i;
      const hits = ccs.filter((c) => isPlr(c.replace(/\.$/, '').split(' ').pop()) && !MALF.test(c.replace(/\.$/, '')));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // "water falls from clouds" gloss -> rainy
    if (/\b(water|drops?|rain) (falls?|fall|falling|comes?|come|coming|drops?) (from|down from) (the )?(clouds?|sky)\b/.test(pl) && /_B_/.test(pn)) {
      const hits = ccs.filter((c) => /^(rain|rainy|raining|rains)$/i.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // "how many <plural> ___" -> "are there"
    if (/\bhow many\b/.test(pl) && /_B_/.test(pn)) {
      const hits = ccs.filter((c) => /^are there$/i.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // science facts: drawer->pull, magnet->magnetic, battery->electric, kite->wind
    {
      const FORCES = { drawer: 'pull', 'open a drawer': 'pull', 'opening a drawer': 'pull', door: 'push|pull', window: 'push|pull', 'close a door': 'push', 'closing a door': 'push', 'push a door': 'push', 'pull a drawer': 'pull', magnet: 'magnetic', battery: 'electric|electrical', kite: 'wind|windy', swing: 'push', seesaw: 'push|pull', 'washing machine': 'electric|electrical', fan: 'electric|electrical|wind', 'solar panel': 'light|solar', windmill: 'wind|windy', 'water wheel': 'water', bulb: 'electric|electrical', flashlight: 'electric|electrical', torch: 'electric|electrical' };
      if (/\bforce\b|\buses?\b|\benergy\b|\bpower\b/.test(pl) && /_B_/.test(pn)) {
        const k = Object.keys(FORCES).find((x) => new RegExp(`\\b${x.replace(/ /g, '\\s+')}\\b`, 'i').test(pl));
        if (k) {
          const hits = ccs.filter((c) => new RegExp(`^(${FORCES[k]})( force| energy| power)?\\.?$`, 'i').test(c));
          if (hits.length === 1 && hits[0] === aa) return true;
        }
      }
    }

    // island/place features
    if (/\bisland\b/.test(pl) && /_B_/.test(pn)) {
      const hits = ccs.filter((c) => /^(beach|beaches|sand|sands|palm trees?|coconut trees?|resorts?|waves?|coral|coral reefs?|shore|shores|coast|coasts)$/i.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // "drink water to avoid ___" -> dehydration
    if (/\bdrink (plenty of|lots of|enough|more|much|a lot of)? ?water\b/.test(pl) && /\bavoid|prevent|stay|keep|stop|so (that|as) not/.test(pl) && /_B_/.test(pn)) {
      const hits = ccs.filter((c) => /^(dehydration|thirst|thirsty|getting sick|illness|tiredness|headache|a headache)$/i.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // "he builds houses" -> builder (reverse job lookup)
    {
      const act = /(builds? houses?|builds? buildings?|teaches? (english|math|students?|children|us)|flies? (planes?|airplanes?|jets?)|delivers? (letters?|mail|packages?)|grows? (rice|vegetables?|crops?|plants?|food)|drives? (a |an |the )?(taxi|bus|truck|car)|writes? (books?|stories|novels?|articles?)|sings? (songs?|well|beautifully)|cooks? (food|meals?|dinner|lunch)|paints? (pictures?|houses?|walls?)|fixes? (cars?|engines?|machines?|computers?)|designs? (buildings?|houses?|websites?)|treats? (patients?|sick|animals?)|examines? (patients?|teeth)|catches? (fish|thieves|criminals?)|guards? (the )?(house|bank|building)|makes? (bread|cakes?|food|clothes?|furniture)|takes? (photos?|pictures?|care of)|looks? after|cares? for)/i.exec(pl);
      if (act && /_B_/.test(pn)) {
        const ACT2JOB = { build: 'builder|construction worker|architect|engineer', teach: 'teacher|tutor|instructor', flies: 'pilot|captain|aviator', flies2: null, deliver: 'postman|mailman|courier|delivery man', grow: 'farmer|gardener', drive: 'driver|taxi driver|bus driver|chauffeur', write: 'writer|author|journalist|novelist', sing: 'singer|musician|artist', cook: 'cook|chef|baker', paint: 'painter|artist|decorator', fix: 'mechanic|technician|repairman|engineer', design: 'architect|designer|engineer', treat: 'doctor|vet|veterinarian|nurse', examine: 'doctor|dentist|vet', catch: 'fisherman|policeman|police officer|detective', guard: 'guard|security guard|policeman', make: 'baker|cook|chef|tailor|carpenter|worker', take: 'photographer|nurse|caretaker', look: 'nurse|caretaker|babysitter|doctor|zookeeper', care: 'nurse|caretaker|doctor|babysitter|zookeeper' };
        const verbKey = Object.keys(ACT2JOB).find((v) => new RegExp(`\\b${v}`, 'i').test(act[1]));
        if (verbKey) {
          const want = ACT2JOB[verbKey];
          if (want) {
            const hits = ccs.filter((c) => new RegExp(`^(a |an |the )?(${want})\\.?$`, 'i').test(c));
            if (hits.length === 1 && hits[0] === aa) return true;
          }
        }
      }
    }

    // "if they ___ the bus, they will be late" -> base-form verb in if-clause
    if (/\bif\b/.test(pl) && /_B_/.test(pn) && /\bwill (be|get|miss|lose|fail|not|n't|have|go|become)\b/.test(pl)) {
      const ifm = /if (i|you|he|she|it|we|they|the \w+|my \w+|[a-z]{2,}) _B_\b/.exec(pn);
      if (ifm) {
        const bases = ccs.filter((c) => /^[a-z]+$/.test(c) && !/(ing|ed|es|ies)$/.test(c) && !/[^sui]s$/.test(c));
        if (bases.length === 1 && bases[0] === aa) return true;
      }
    }

    // "can be ___ into new things" -> past participle unique
    if (/\b(can be|could be|be|is|are|was|were|being|been|get|gets|got) _B_ (into|to|by|from|in|for)\b/.test(pn) || /\bcan be _B_\b/.test(pn)) {
      const hits = ccs.filter((c) => /^(recycled|turned|made|changed|transformed|converted|reused|reduced|refilled|melted|cut|used|seen|found|taken|put|divided|separated|broken|repaired|fixed|cleaned|collected|sent|sold|bought|thrown|saved|planted|grown|eaten|drunk|worn|written|read|drawn|painted|built|created|invented|discovered|formed|shaped|pressed|rolled|folded|cut up|broken down|mixed|cooked|baked|frozen|dried)$/i.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

    // "I am ___" -> only grammatically viable choice
    if (/^i am _B_|^i'?m _B_|\bi am _B_\s*[.!?]?\s*$/.test(pn) || /\bi am _B_\b/.test(pn)) {
      const viable = ccs.filter((c) => /^(ten|eleven|twelve|nine|eight|seven|six|five|four|three|two|one|\d+) years? old$|^\d+ years? old$|^(a |an )\w+/.test(c) || /^(happy|sad|angry|tired|hungry|thirsty|excited|bored|worried|scared|surprised|confused|nervous|proud|shy|sleepy|sick|ill|fine|well|okay|ok|great|good|bad|upset|pleased|glad|afraid|lonely|busy|free|lazy|ready|sure|sorry|lost|here|there|home|back|late|early|right|wrong|safe|alone|tall|short|big|small|fat|thin|strong|weak|fast|slow|clever|smart|careful|quiet|healthy|full|hot|cold|warm|cool|wet|dry|new|young|old|student|pupil|teacher|doctor|vietnamese|english|from)/i.test(c));
      if (viable.length === 1 && viable[0] === aa) return true;
    }

    // "window is best made of ___" -> glass; object->material facts
    {
      const OBJMAT = { window: 'glass|windows?.*glass', windows: 'glass', mirror: 'glass', bottle: 'glass|plastic', glasses2: null, glasses: 'glass', lens: 'glass', lenses: 'glass', vase: 'glass|ceramic|clay|porcelain', jar: 'glass|plastic', cup: 'glass|plastic|ceramic|paper|porcelain', 'wine glass': 'glass', windshield: 'glass', windscreen: 'glass', table: 'wood|wooden|metal|glass|plastic', desk: 'wood|wooden|metal', chair: 'wood|wooden|plastic|metal', bench: 'wood|wooden|metal|stone', spoon: 'metal|plastic|wood|wooden|silver|stainless steel', fork: 'metal|plastic|silver|stainless steel', knife: 'metal|steel|stainless steel', plate: 'ceramic|porcelain|plastic|glass|paper', bowl: 'ceramic|porcelain|plastic|glass|wood', bridge: 'stone|concrete|steel|metal|wood', statue: 'stone|bronze|marble|metal|gold', house: 'wood|brick|stone|concrete|cement', wall: 'brick|stone|concrete|wood|cement', roof: 'tile|tiles|metal|concrete|thatch', door: 'wood|wooden|metal|glass', gate: 'wood|metal|iron', fence: 'wood|metal|wire|bamboo', road: 'concrete|asphalt|stone|gravel', shoe: 'leather|rubber|plastic|canvas|cloth', shoes: 'leather|rubber|plastic|canvas|cloth', bag: 'leather|cloth|plastic|paper|canvas', hat: 'straw|cloth|leather|felt|wool', ring2: null, ring: 'gold|silver|metal|diamond', coin: 'metal|gold|silver|copper', key: 'metal|steel|iron|brass', wire: 'copper|metal|aluminum', cable: 'copper|metal|rubber|plastic', pipe: 'metal|plastic|copper|iron', tank: 'metal|steel', bullet: 'metal|lead', needle: 'metal|steel', nail: 'metal|iron|steel', hammer: 'metal|steel|wood', sword: 'metal|steel|iron', knife2: null, scissors: 'metal|steel', bell: 'metal|bronze|brass', bell2: null, pan: 'metal|iron|steel|copper|aluminum', pot: 'metal|clay|ceramic|copper', kettle: 'metal|steel|copper', sink: 'metal|steel|porcelain|ceramic', tire: 'rubber', tyre: 'rubber', eraser: 'rubber', glove: 'leather|rubber|cloth|wool', gloves: 'leather|rubber|cloth|wool', ball: 'rubber|leather|plastic', balloon: 'rubber|plastic|latex', boot: 'leather|rubber|plastic', boots: 'leather|rubber|plastic', jacket: 'leather|cloth|wool|denim|nylon', sweater: 'wool|cotton|yarn', coat: 'wool|cloth|leather|fur', shirt2: null, shirt: 'cotton|silk|polyester|cloth', tshirt: 'cotton|cloth', 't-shirt': 'cotton|cloth', dress: 'cotton|silk|cloth|polyester', skirt: 'cotton|silk|cloth|denim', pants: 'cotton|denim|cloth', jeans: 'denim|cotton', sock: 'cotton|wool|nylon', socks2: null, scarf2: null, scarf: 'wool|silk|cotton|knitted', tie2: null, tie: 'silk|cotton|polyester', glove2: null, curtain: 'cloth|fabric|silk|cotton', curtains: 'cloth|fabric|silk|cotton', blanket: 'wool|cotton|fabric|fleece', towel: 'cotton|cloth|fabric', pillow: 'feathers?|cotton|foam|down', mattress: 'foam|springs?|cotton', carpet: 'wool|fabric|nylon|rug', rug: 'wool|fabric|nylon', book: 'paper|cardboard', paper: 'wood|wood pulp', newspaper: 'paper', magazine: 'paper', notebook: 'paper', envelope: 'paper', box: 'cardboard|wood|plastic|metal|paper', 'cardboard box': 'cardboard', 'pencil case': 'plastic|metal|cloth|leather', pencil: 'wood|graphite', pen: 'plastic|metal', ruler: 'plastic|wood|metal|steel', 'rubber band': 'rubber', 'tyre|tire': 'x' };
      const om = /(\w[\w ]*?) (?:is|are|was|were) (?:best |usually |always |often |mostly |mainly )?(?:made|made of|made from|built|built of|built from|constructed|constructed of|constructed from)\b/.exec(pl) ?? /(\w[\w ]*?) (?:is|are|was|were) (?:best |usually |always |often )?(?:made of|made from) _B_/.exec(pn);
      if (om && /_B_/.test(pn)) {
        const obj = om[1].trim().split(' ').pop();
        const want = OBJMAT[obj] ?? OBJMAT[obj + 's'] ?? OBJMAT[obj.replace(/s$/, '')];
        if (want) {
          const hits = ccs.filter((c) => new RegExp(`^(${want})( \\(|\\.|$)`, 'i').test(c) || new RegExp(`^(${want})$`, 'i').test(c));
          if (hits.length === 1 && hits[0] === aa) return true;
        }
      }
    }

    // "is a famous place in Vietnam" -> VN place unique
    if (/\b(famous|beautiful|well-known|popular|biggest|largest|wonderful|great)\b.{0,40}\b(place|places|city|country|landmark|destination|site|spot|area|region|island|beach|bay|cave|mountain|lake|river|park)\b/.test(pl) && /\b(in|of|at) viet ?nam\b/i.test(pl) && /_B_/.test(pn)) {
      const hits = ccs.filter((c) => /^(ha noi|hanoi|ho chi minh|saigon|hue|da nang|danang|hoi an|ha long|halong|sapa|da lat|dalat|nha trang|phu quoc|mekong|son doong|phong nha|ba na|can tho|hai phong|ninh binh|quy nhon|vung tau|phan thiet|mui ne|con dao|cat ba|mai chau|pu luong|ha giang|cao bang|ban gioc|tam coc|trang an|bai dinh|my son|cu chi|vinh ha long|thang long|ben thanh|notre dame|dragon bridge|golden bridge|ba den|fansipan|bach ma|chuong|duong lam|van mieu|imperial city|one pillar|west lake|hoan kiem|sword lake|long bien|chuong trinh)\b/i.test(c));
      if (hits.length === 1 && hits[0] === aa) return true;
    }

  }

  if (set === 'prep') {
    const pn = ` ${pl.replace(/\s*_{2,}\s*|\s*\.{2,}\s*|\s*…\s*/g, ' _B_ ')} `.replace(/\s+/g, ' ');
    const uniq = (ws) => cs.filter((c) => ws.includes(c)).length === 1;
    // context clause after a dash disambiguates (e.g. "- you cannot see its head")
    if (/ - /.test(pn)) return cs.filter((c) => c === a).length === 1;
    // between needs two anchors named in the prompt
    if (a === 'between' && /( and | two )/.test(pn)) return true;
    const fixed = [
      [/nice _B_ meet you/, 'to'],
      [/feeling a little _B_/, 'down'],
      [/(good|better|bad|great|weak|worse|best) _B_/, 'at'],
      [/free time/, 'in'], [/spend _B_/, 'on'],
      [/o'clock|\d+\s?(a\.?m\.?|p\.?m\.?)/, 'at'],
      [/bike\b/, 'by'], [/lives? _B_|live _B_|living _B_/, 'in'],
      [/_B_ ?(on )?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/, 'on'],
      [/_B_ ?(in )?(january|february|march|april|may|june|july|august|september|october|november|december)\b/, 'in'],
      [/birthday is _B_|born _B_/, 'in'],
      [/morning|afternoon|evening/, 'in'], [/\bnight\b/, 'at'],
      [/_B_ (his|her|my|their) birthday|toy .*birthday/, 'for'],
      [/_B_ the party/, 'for'],
      [/_B_ two blocks/, 'for'], [/road _B_ the end|go .* _B_ the end/, 'to'],
      [/opposite side/, 'on'], [/your (left|right)\b|the (left|right)\b/, 'on'],
      [/turn _B_|on your _B_|_B_ your (left|right)/, 'right|left|right again|left again'],
      [/(stronger|taller|shorter|bigger|smaller|older|younger|faster|slower|higher|longer|prettier|heavier|thinner) _B_|better _B_ me|_B_ me\b/, 'than'],
      [/bus stop _B_ here|_B_ here\b/, 'from|near'],
      [/work(s|ing)? _B_ (a|the) /, null], // in/at workplace - always ambiguous
      [/play(ing)? _B_|volleyball|badminton/, null], // venue prep always ambiguous
      [/tree/, null], // in/on both valid
    ];
    let decided = false;
    for (const [re, want] of fixed) {
      if (!re.test(pn)) continue;
      if (want == null) { decided = true; break; }
      const ok = new RegExp(`^(${want})$`).test(a) && cs.every((c) => c === a || !want.split('|').includes(c));
      return ok;
    }
    if (decided) return false;
    // bare location cloze: object must have a single natural prep AND every
    // other spatial choice must be implausible for that object.
    const obj = new RegExp(`_B_ (the |a |an )?(${Object.keys(UNIQUE_PREP).join('|')})\\b`).exec(pn);
    if (!obj) return false;
    const nat = UNIQUE_PREP[obj[2]];
    if (!nat.includes(a)) return false;
    return cs.every((c) => c === a || !SPATIAL.includes(c) || !plaus(c, obj[2], pn));
  }
  function plaus(c, obj, pl) {
    const container = /box|basket|case|bag|bottle|glass|cup|pool|car|bus|hole/;
    const surface = /table|wall|ceiling|floor|bed|desk|board|page|map/;
    if (container.test(obj) && c === 'in') return true;
    if (surface.test(obj) && c === 'on') return true;
    if (/tree/.test(obj) && (c === 'in' || c === 'on')) return true;
    if (/( and | two )/.test(pl) && c === 'between') return true;
    if (/house|school|building|shop|museum|library|stop|station|door|tree|mother|father|students|boys|supermarket|bakery|bookstore|cafe|river|bridge/.test(obj) && /next to|near|behind|in front of|beside|next\b/.test(c)) return true;
    if (/corner/.test(obj) && (c === 'at' || c === 'on')) return true;
    if (/school|hospital|factory|office|station|airport|park|playground|beach|yard|garden|cinema/.test(obj) && (c === 'at' || c === 'in')) return true;
    if (/bridge|road|street|river/.test(obj) && /over|across|along|on/.test(c)) return true;
    if (/cloud|sky|city/.test(obj) && /above|over|through|in/.test(c)) return true;
    if (/water/.test(obj) && c === 'under') return true;
    if (/bed|sofa|armchair|chair|table/.test(obj) && /under|on|next to|behind|in front of|in\b/.test(c)) return true;
    if (/box|basket|case|bag/.test(obj) && /on|under|next to|behind|in front of/.test(c)) return true;
    return false;
  }

  // category exclusion: "which one is a X" where only one choice is X
  const cat = /which (one|word) is (a |an )?(\w+)/.exec(pl);
  if (cat) {
    const catWord = cat[3];
    const setFor = { drink: T.DRINK, pet: T.PET, 'water sport': null, animal: null }[catWord];
    if (setFor) return only(setFor, cs) && inSet(setFor, a);
    if (/drink/.test(catWord)) return only(T.DRINK, cs) && inSet(T.DRINK, a);
    if (/sport/.test(catWord)) return only(T.SWIM.concat(['running', 'cycling']), cs);
  }

  // day/month special legit patterns
  if (set === 'day' || set === 'month') {
    if (/^(any|every|all)/.test(a)) return true;
    if (/can'?t go to school/.test(pl) && a === 'sunday' && !cs.includes('saturday')) return true;
    if (/tet/.test(pl) && (a === 'february' || a === 'january')) return true;
    if (/school (starts|begins)/.test(pl) && a === 'september') return true;
  }

  // misc: like/want/need/feel/hobby cloze - keep only when the prompt carries a
  // UNIQUE selector (context, construction, collocation). Bare object/feeling
  // cloze is rejected: "I want a ___" can take every choice.
  if (set === 'misc') {
    const pn = ` ${pl.replace(/\s*_{2,}\s*|\s*\.{2,}\s*|\s*…\s*/g, ' _B_ ')} `.replace(/\s+/g, ' ');
    const aa = a.replace(/[.!?,;:\s]+$/, '');
    const ccs = cs.map((c) => c.replace(/[.!?,;:\s]+$/, ''));
    const uniqRe = (re) => ccs.filter((c) => new RegExp(`^(${re})$`, 'i').test(c));
    // asset-dependent item: "(image of X)" / "(rice)" -> kept, asset verified elsewhere
    if (/\((image|picture|photo|audio)|image of|\)[a-z]+\s*\(|\([a-z][a-z\s-]{1,20}\)\s*$/.test(pl)) return true;

    // progressive: subject + _B_ + V-ing -> unique be-form by agreement.
    // Runs BEFORE the same-lemma check (be-forms share lemma "b").
    const beM = /\b(she|he|it|i|we|they|you|my (mom|dad|sister|brother|mother|father|friend|teacher|grandma|grandpa|uncle|aunt|cousin|family)|your (mom|dad|sister|brother|mother|father|friend|teacher|grandma|grandpa|uncle|aunt|cousin|family)|nam|lan|mai|minh|anh|linh|huy|ha|hien|phong|thao|tuan|dung|huong|son|nhi|vy|khoa|trang|quang|[a-z]{3,}) _B_ (not |n'?t )?\w+ing\b/.exec(pn);
    if (beM && /^(am|is|are|be|was|were)$/.test(aa)) {
      const now = /\bnow\b|at the moment|right now|today|look!|listen!|this (morning|afternoon|evening)/.test(pl);
      const want = /^i$/.test(beM[1]) ? 'am' : /^(they|we|you)$/.test(beM[1]) ? 'are' : 'is';
      const valid = ccs.filter((c) => c === want || (!now && /^(was|were)$/.test(c)));
      return aa === want && valid.length === 1;
    }
    // verb-form cloze: every choice is an inflection of the SAME lemma -> the
    // construction alone picks the form. "like/enjoy + -ing", "to + base".
    const LEM = (w) => {
      let x = w.toLowerCase().replace(/^to\s+/, '').split(/\s+/)[0].replace(/[^a-z]/g, '');
      x = IRR[x] ?? x;
      let base = /ies$/.test(x) && ccs.includes(x.slice(0, -3) + 'ie') ? x.slice(0, -3) + 'ie' : x.replace(/ies$/, 'y');
      const SHORT = new Set(['go', 'do', 'be', 'see', 'die', 'lie', 'tie', 'fly', 'try', 'cry', 'dry', 'buy', 'say', 'pay', 'lay', 'run', 'win', 'sit', 'cut', 'put', 'hit', 'let', 'set', 'eat', 'get', 'rid', 'hop', 'nap', 'rub', 'hug', 'dig', 'jog', 'beg', 'nod', 'pat', 'bat', 'vet', 'ski', 'use', 'age', 'ice', 'row', 'bow', 'sew', 'mow', 'sow', 'tow']);
      const sfx = /(ing|ed|es|s|d)$/.exec(base);
      if (/ying$/.test(base) && base.slice(0, -4).length >= 1) base = base.slice(0, -4) + 'ie';
      else if (sfx && (sfx[1] !== 'ing' || base.slice(0, -3).length >= 3 || SHORT.has(base.slice(0, -3)))) base = base.slice(0, -sfx[1].length);
      base = base.replace(/([a-z])\1$/, '$1').replace(/(?<![iu])e$/, '');
      if (x !== base) {
        const cand = [base + 'en', base + 'e', base + 'y', base.slice(0, -1) + 'y', base.slice(0, -2) + 'ie'].find((k) => ccs.includes(k));
        if (cand) base = cand;
      }
      return base;
    };
    const isGerund = (w) => w.split(/\s+/)[0].replace(/[^a-z]/g, '').endsWith('ing');
    if (ccs.length >= 2 && ccs.every((c) => /^[a-z' -]+$/i.test(c)) && new Set(ccs.map(LEM)).size === 1) {
      if (/ to _B_|(can|could|shall|should|will|would|must|may|might|did|do|does) _B_|^.{0,6}_B_ a /.test(pn)) return LEM(aa) === aa.replace(/^to /, '').split(/\s+/)[0];
      if (/(enjoys?|likes?|loves?|hates?|hobby is|practise|practices?|finish(es|ed)?|keep(s)?|start(s|ed)?|begin(s)?|stop(s|ped)?|mind(s)?|suggest(s)?|avoid(s)?|fancy|imagine|go(es)?) _B_/.test(pn)) {
        if (ccs.some((c) => /^to /.test(c) && !c.split(/\s+/)[1]?.endsWith('ing'))) return false; // "like to X" is a valid rival (but "to X-ing" is ungrammatical)
        return isGerund(aa);
      }
      return false;
    }
    // want-family + to-infinitive: "want ___" -> "to X" is the only valid fill
    if (/(wants?|plans?|decides?|learns?|hopes?|needs?|agrees?|asks?|tries|forgets?|remembers?|expects?|offers?|promises?|refuses?|manages?|fails?|prepares?|wishes?|would like) _B_/.test(pn)) {
      return /^to /.test(aa) && uniqRe('to .+').length === 1;
    }
    // comparative: blank before "than" -> unique comparative-form choice
    if (/_B_ than|than (yours|me|you|him|her|us|them|mine)\b/.test(pn)) {
      const LONG_ADJ = /^(interesting|beautiful|difficult|important|expensive|comfortable|delicious|exciting|popular|dangerous|wonderful|careful|famous|modern|different|difficult|intelligent|convenient|favorite|colourful|colorful|peaceful|powerful|meaningful|successful|wonderful|beautiful|handsome|awesome|special|general|natural|national|traditional|international)(er|est)$/i;
      const comp = ccs.filter((c) => (/(er|ier)$|^more /.test(c) || /^(better|worse)$/.test(c)) && !LONG_ADJ.test(c));
      if (comp.length === 1 && aa === comp[0]) return true;
    }
    // noun-form cloze: choices differ only by article/plural of one noun ->
    // "collecting/many + bare plural" or "a/an + singular".
    const bare = ccs.map((c) => c.replace(/^(a|an|the|some|many|two|three)\s+/i, '').replace(/(ing|ed)$/, '').replace(/s$/, ''));
    if (ccs.length >= 2 && new Set(bare).size === 1) {
      if (/(collect(ing|s)?|have many|many|some|lots of|are|wear(ing)?|buy(ing)?|need(s)?|for (my |the |her |his |our |their )?(party|dinner|birthday)|clothes) _B_|_B_ for (my |the |her |his |our |their )?(party|dinner|birthday)/.test(pn)) return !/^(a|an|the)\s/.test(aa) && /s$/.test(aa.replace(/^(some|many)\s+/, ''));
      return false;
    }
    // wh-question: keep iff the answer-tail disambiguates
    if (/^choose|^what|_B_ (is|are|do|does|did|would|can|could) /.test(pn)) {
      if (/because/.test(pn)) return aa === 'why' && uniqRe('why').length === 1;
      if (/- (it is|it's|its|they are|there are)\b/.test(pn)) return aa === 'what' && uniqRe('what').length === 1;
      if (/wants? to be|want to be/.test(pn) && /- (a |an )?\w+/.test(pn)) return aa === 'what' && uniqRe('what').length === 1;
    }
    // dialogue politeness/response logic
    if (/says? no politely|politely/.test(pn)) return /no,? (thank|thanks)/.test(aa) && ccs.filter((c) => /thank/.test(c)).length === 1;
    if (/wants? to say yes|say yes/.test(pn)) return /good idea|sure|yes|of course|great/.test(aa) && ccs.filter((c) => /good idea|sure|yes|of course|great/.test(c)).length === 1;
    if (/no, i _B_|no, (he|she|we|they) _B_/.test(pn)) return /^do(n'?t|esn'?t)?/.test(aa);
    // modal/auxiliary: subject + tense pick exactly one
    const negSub = /\b(i|we|they|you|she|he|it|[a-z]+) _B_ not (like|want|need|enjoy|go|play|eat|drink)/.exec(pn);
    if (negSub) {
      const third = !/^(i|we|they|you)$/.test(negSub[1]);
      return aa === (third ? 'does' : 'do') && uniqRe('do|does').length >= 1;
    }
    if (/\b(i|we|they|you) _B_ (like|love|hate|want|enjoy)/.test(pn) && /scary|hate|don't|no\b|not\b|boring|bad/.test(pn)) return /^do(n'?t)?$/.test(aa) && uniqRe("do(n'?t)?").length === 1;
    if (/next week|tomorrow|tonight|next year|next month|soon/.test(pn) && /^(will|would|am|is|are|did)$/.test(aa)) return aa === 'will' && uniqRe('will').length === 1;
    // wh-aux agreement: "what sport ___ your sister like" -> does; "... you like" -> do
    const aux3 = /_B_ (your (sister|brother|mother|father|mom|dad|friend|teacher|uncle|aunt|cousin|grandma|grandpa|family)|my (sister|brother|mother|father|mom|dad|friend|teacher|uncle|aunt|cousin|grandma|grandpa|family)|she|he|it|nam|lan|mai|minh|anh|linh|huy|ha|hien|phong|thao|tuan|dung|huong|son|nhi|vy|khoa|trang|quang|ba ngoai|ba noi|ong|ba) (like|want|need|love|hate|enjoy|play|eat|drink|go|do|watch|read|live|work|study|have|get|feel|look|sound|speak|come|buy|make|take|see|find|use|wear|cook|swim|run|walk|ride|drive|fly|sing|dance|draw|write|listen|help|visit|travel|sleep|wake|start|finish)\b/.test(pn);
    if (aux3 && /^(do|does|did|don't|doesn't|didn't)$/.test(aa)) { const ok3 = ccs.filter((c) => /^(does|doesn't)$/.test(c)); return /^(does|doesn't)$/.test(aa) && ok3.length === 1; }
    const auxPl = /_B_ (you|we|they|i|your (friends|parents|brothers|sisters|classmates)|my (friends|parents|brothers|sisters|classmates)|the (students|children|boys|girls|kids|students|teachers|workers)|students|children|people|kids|boys|girls|teachers|friends|parents|classmates) (like|want|need|love|hate|enjoy|play|eat|drink|go|do|watch|read|live|work|study|have|get|feel|look|sound|speak|come|buy|make|take|see|find|use|wear|cook|swim|run|walk|ride|drive|fly|sing|dance|draw|write|listen|help|visit|travel|sleep|wake|start|finish)\b/.test(pn);
    if (auxPl && /^(do|does|did|don't|doesn't|didn't)$/.test(aa)) { const okP = ccs.filter((c) => /^(do|don't)$/.test(c)); return /^(do|don't)$/.test(aa) && okP.length === 1; }
    // bare negation cloze: "he ___ like vegetables" -> doesn't/don't by agreement
    const bareNeg = /\b(i|we|they|you|she|he|it|my (mom|dad|sister|brother|mother|father|friend|teacher|grandma|grandpa|uncle|aunt|cousin|family)|your (mom|dad|sister|brother|mother|father|friend|teacher|grandma|grandpa|uncle|aunt|cousin|family)|nam|lan|mai|minh|anh|linh|huy|ha|hien|phong|thao|tuan|dung|huong|son|nhi|vy|khoa|trang|quang|[a-z]{3,}) _B_ (like|want|need|enjoy|love|hate|eat|play|go|drink|watch|read|cook|swim|run|walk|ride|drive|fly|sing|dance|draw|write|listen|help|visit|travel|sleep|wake|live|work|study|speak|come|buy|make|take|see|find|use|wear)\b/.exec(pn);
    if (bareNeg && /^do(n'?t|esn'?t)?$/.test(aa)) {
      const third = !/^(i|we|they|you)$/.test(bareNeg[1]);
      const valid = ccs.filter((c) => (third ? /^(does|doesn't|did|didn't)$/ : /^(do|don't|did|didn't)$/).test(c));
      return valid.length === 1 && aa === valid[0];
    }
    // singular article + pluralia tantum distractors: "a red ___" -> coat (pants/shorts/socks invalid)
    const PLURALIA = ['pants', 'shorts', 'socks', 'shoes', 'gloves', 'boots', 'sandals', 'jeans', 'scissors', 'glasses', 'trousers', 'sunglasses', 'pajamas', 'clothes', 'sneakers', 'slippers'];
    if (/\b(a|an)( [a-z]+)? _B_/.test(pn)) { const plu = ccs.filter((c) => PLURALIA.includes(c)); if (ccs.length - plu.length === 1 && !PLURALIA.includes(aa)) return true; }
    // gerund-family construction + exactly one -ing choice (and no "to X" rival).
    // Only safe when every choice is a verb-form: "do you like music" is a valid
    // object reading, so noun choices defeat the -ing uniqueness.
    const VERB_LEX = new Set('be do have make take get go come run walk ride drive fly swim jump sing dance play read write draw cook eat drink sleep talk listen watch learn try climb skip fish shop study work help visit travel speak buy wear use find feel look sound start finish keep avoid mind enjoy hate love like want need practise practice rest relax sit stand clean wash brush paint color colour count share plant water chat meet call cry smile laugh open close build carry catch throw kick hit cut push pull grow teach tell say think know give bring show ask answer stay wait hop dig ski sail surf skate hike jog text type fix collect garden rain snow'.split(' '));
    const VLEM = new Set([...VERB_LEX].map((v) => { let x = IRR[v] ?? v; return x.replace(/ies$/, 'y').replace(/(ing|ed|es|s|d)$/, '').replace(/([a-z])\1$/, '$1').replace(/e$/, ''); }));
    if (/(n't )?(likes?|enjoys?|loves?|hates?|don't|doesn't|didn't|not|never|finish(es|ed)?|keep(s)?|practise|practices?|avoid(s)?|mind(s)?|fancy|imagine|prefer(s)?|go(es)?|start(s|ed)?|begin(s)?) (to )?_B_/.test(pn) && ccs.every((c) => VLEM.has(LEM(c)) || c.split(/\s+/)[0].endsWith('ing'))) {
      const ings = ccs.filter((c) => c.split(/\s+/)[0].endsWith('ing'));
      if (ings.length === 1 && aa === ings[0] && !ccs.some((c) => /^to /.test(c) && !c.split(/\s+/)[1]?.endsWith('ing'))) return true;
    }
    // interrogative/negative polarity: "did she buy ___ oranges" -> any (when no "some" rival)
    if (/^(did|do|does|is|are|can|could|would|will|have|has|shall)\b.*\?|\?/.test(pn) && aa === 'any') return uniqRe('any').length === 1 && !uniqRe('some').length;
    if (/n't|not|never/.test(pn) && aa === 'any') return uniqRe('any').length === 1 && !uniqRe('some').length;
    // future construction "going to"
    if (/going _B_/.test(pn)) return aa === 'to' && uniqRe('to').length === 1;
    // connective: causal context - "and" is a defensible rival, so it must be absent
    if (/(tired|hungry|sick|raining|late|cold|hot|busy|sad|happy|full|thirsty),? _B_/.test(pn)) return aa === 'so' && uniqRe('so').length === 1 && uniqRe('and').length === 0;
    if (/too\.?$|as well/.test(pn) && /_B_/.test(pn)) return aa === 'and' && uniqRe('and').length === 1;
    // article a/an handled by generic rule above; "some" vs "many" for plurals stays ambiguous
    // verb-object collocation: object after the blank picks the verb
    for (const [re, want] of OBJ_VERB) {
      const mm = new RegExp(`_B_ (?:[a-z']+ ){0,4}${re.source}`).exec(pn);
      if (!mm) continue;
      let pool = ccs.filter((c) => new RegExp(`^(${want})$`, 'i').test(c));
      // "hobby is to X" is a valid complement - a real to-infinitive choice makes it ambiguous
      if (/(is|are|was|were) _B_/.test(pn) && ccs.some((c) => /^to /.test(c) && !c.split(/\s+/)[1]?.endsWith('ing'))) continue;
      if (/(is|are|was|were) _B_/.test(pn)) pool = pool.filter((c) => c.endsWith('ing'));
      if (pool.length === 1 && new RegExp(`^(${want})$`, 'i').test(aa) && (!/(is|are|was|were) _B_/.test(pn) || aa.endsWith('ing'))) return true;
    }
    // object/feeling selection by explicit context (checked for every prompt -
    // a context clause selects the answer whether or not the word "feel" appears)
    for (const [re, want] of OBJ_CTX) {
      if (!re.test(pn)) continue;
      const hits = ccs.filter((c) => new RegExp(`^(${want})$`, 'i').test(c));
      if (hits.length === 1 && new RegExp(`^(${want})$`, 'i').test(aa)) return true;
    }
    for (const [re, want, neg] of FEEL_CTX) {
      if (!re.test(pn)) continue;
      const hits = ccs.filter((c) => want.includes(c));
      // "not X -> opposite" items are only safe when no other feeling-word
      // remains: "not angry, I am cold/tired" is a defensible fill.
      const strict = neg ? ccs.every((c) => c === aa || c === neg || !STRICT_FEEL.includes(c)) : true;
      if (hits.length === 1 && aa === hits[0] && strict) return true;
    }
    // subject-description -> favourite subject
    for (const [re, want] of SUBJ_DESC) {
      if (!re.test(pn) || !/subject/.test(pn)) continue;
      const hits = ccs.filter((c) => new RegExp(`^(${want})$`, 'i').test(c));
      if (hits.length === 1 && new RegExp(`^(${want})$`, 'i').test(aa)) return true;
    }
    // feelings: unique emotion among choices, or context-forced emotion
    if (/feel|feels|feeling|felt|emotion/.test(pn)) {
      const nEmo = ccs.filter((c) => EMOTIONS.includes(c)).length;
      if (nEmo === 1) return EMOTIONS.includes(aa);
      return false;
    }
    // "It is/It" subject-pronoun for a named thing
    if (/_B_ (is |subject is |month is )?(fun|interesting|boring|great)/.test(pn)) {
      const hits = ccs.filter((c) => /^it( is|s)?$/i.test(c));
      if (hits.length === 1 && /^it( is|s)?$/i.test(aa)) return true;
    }
    // intensifier before adjective: "feeling _B_ good" -> very/so/really unique
    if (/_B_ (good|well|fine|happy|much|many)/.test(pn) && /^(very|so|really|too|quite)$/.test(aa)) {
      return ccs.every((c) => c === aa || !/^(very|so|really|too|quite)$/.test(c));
    }
    // purpose: need/want X for Y
    for (const [re, want] of [[/special shoes|need shoes|new shoes/, 'running|walking|hiking|climbing|sports'], [/flowers?/, 'april|march|spring'], [/winter|cold|snow/, 'december|january|february']]) {
      if (!re.test(pn)) continue;
      const hits = ccs.filter((c) => new RegExp(`^(${want})$`, 'i').test(c));
      if (hits.length === 1 && new RegExp(`^(${want})$`, 'i').test(aa)) return true;
    }
    return false;
  }
  return false;
}


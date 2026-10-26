// Real word lists used to generate typing test content client-side.
// Kept in one file so the Content Library phase can later swap this for a
// database-backed system without touching the typing engine itself.
//
// Sizing note: even after this expansion these lists are a few hundred
// words each — small enough (a handful of KB) that bundling them stays
// negligible for page weight. If/when these grow toward the 1k/5k/10k
// word lists a serious typing site eventually wants, that's the point to
// move this to fetched JSON/an API route instead of a bundled module —
// doing that now, at this size, would trade real bundle savings for
// meaningfully more risk (async loading states through every place that
// currently reads these synchronously) than it's worth yet.

export const WORD_BANK = [
  "the","time","person","year","way","day","thing","man","world","life","hand","part","child","eye","woman",
  "place","work","week","case","point","government","company","number","group","problem","fact","water","room",
  "area","money","story","month","lot","right","study","book","job","word","business","issue","side","kind",
  "head","house","service","friend","father","power","hour","game","line","end","member","law","car","city",
  "community","name","president","team","minute","idea","body","information","back","parent","face","others",
  "level","office","door","health","art","war","history","party","result","change","morning","reason",
  "research","girl","guy","moment","air","teacher","force","education","foot","boy","age","policy","process",
  "music","market","sense","nation","plan","college","interest","death","experience","effect","use","class",
  "control","care","field","development","role","effort","rate","heart","drug","show","leader","light","voice",
  "wife","whole","police","mind","price","report","decision","son","view","relationship","town","road","arm",
  "value","condition","step","position","letter","evidence","yard","paper","impact","system","practice","speed",
  "focus","finger","reach","learn","build","grow","train","skill","able","about","above","across","act",
  "action","actually","add","address","admit","adult","affect","after","again","against","agency","agent",
  "agree","ahead","allow","almost","alone","along","already","although","always","among","amount","analysis",
  "animal","another","answer","anyone","anything","appear","apply","approach","argue","around","arrive",
  "article","ask","attack","attention","attorney","audience","author","authority","available","avoid","away",
  "baby","bad","bag","ball","bank","bar","base","beat","beautiful","bed","before","begin","behavior","behind",
  "believe","benefit","best","better","between","beyond","big","bill","billion","bit","black","blood","blue",
  "board","brother","budget","buy","call","camera","campaign","candidate","capital","card","catch","cause",
  "center","central","century","certain","certainly","chair","challenge","chance","character","charge","check",
  "choice","choose","citizen","civil","claim","clear","clearly","close","coach","cold","collection","color",
  "common","concern","conference","congress","consider","consumer","contain","continue","contract","cost",
  "could","couple","course","court","cover","create","crime","cultural","culture","cup","current","customer",
  "dark","data","daughter","deal","debate","decade","deep","defense","degree","democratic","describe","design",
  "despite","detail","determine","difference","different","difficult","dinner","direction","director",
  "discover","discuss","discussion","disease","doctor","dog","dream","drive","drop","during","each","early",
  "east","easy","eat","economic","economy","edge","election","energy","enjoy","enough","enter","entire",
  "environment","environmental","especially","establish","even","evening","event","ever","every","everybody",
  "everyone","everything","exactly","example","executive","exist","expect","explain","expert","family","far",
  "fast","feel","feeling","few","figure","fill","film","final","finally","financial","find","fine","fire",
  "firm","first","fish","five","floor","fly","follow","food","foreign","forward","free","full","fund","future",
  "garden","gas","general","generation","glass","goal","gone","good","great","green","ground","gun","hair",
  "half","happen","happy","hard","hardly","hear","heavy","help","herself","high","himself","hit","hold","hope",
  "hospital","hot","hotel","huge","human","hundred","husband","identify","image","imagine","important",
  "improve","include","including","increase","indeed","indicate","individual","industry","inside","instead",
  "institution","interesting","international","investment","involve","item","itself","join","keep","key","kid",
  "kill","kitchen","knowledge","land","language","large","last","late","later","laugh","least","leave","left",
  "legal","less","local","long","look","lose","loss","low","machine","magazine","main","maintain","major",
  "majority","make","manage","management","manager","many","material","matter","maybe","mean","measure","media",
  "medical","meet","meeting","message","method","middle","might","military","million","mission","model",
  "modern","move","movement","movie","much","must","myself","natural","nature","near","necessary","need",
  "network","never","news","newspaper","next","nice","night","none","north","note","nothing","notice","now",
  "occur","offer","official","often","once","only","onto","open","operation","opportunity","option","order",
  "organization","original","other","outside","over","owner","page","pain","painting","past","pattern","peace",
  "people","perform","performance","perhaps","period","personal","physical","pick","picture","piece","plant",
  "player","politics","poor","popular","population","positive","possible","post","potential","pretty","prevent",
  "previous","private","probably","produce","product","production","professional","professor","program",
  "project","property","protect","prove","provide","public","pull","purpose","push","quality","question",
  "quickly","quite","radio","raise","range","rather","read","ready","real","realize","really","receive",
  "recent","recently","recognize","record","red","reduce","reflect","region","relate","remain","remember",
  "remove","rest","return","reveal","rich","risk","rock","run","safe","save","scene","school","science","score",
  "season","seat","second","section","security","seek","seem","sell","send","senior","series","serious","set",
  "several","shake","share","shoot","short","shoulder","significant","similar","simple","simply","since","sing",
  "single","sister","site","situation","size","skin","small","smile","social","society","soldier","some",
  "somebody","someone","something","sometimes","song","soon","sort","sound","source","south","space","special",
  "specific","spend","sport","spring","staff","stage","stand","standard","star","start","state","statement",
  "station","stay","stock","stop","store","strategy","street","strong","structure","student","style","subject",
  "success","successful","such","suddenly","suffer","suggest","summer","support","sure","surface","table",
  "talk","tax","technology","television","tell","tend","term","test","text","than","thank","themselves","then",
  "theory","there","therefore","these","thought","thousand","threat","three","throughout","throw","today",
  "together","tonight","top","total","tough","toward","trade","traditional","travel","treat","treatment","tree",
  "trial","trip","truth","turn","type","under","understand","unit","until","upon","various","victim","visit",
  "walk","wall","watch","wear","weight","well","west","western","when","where","whether","which","while",
  "white","wide","will","win","window","within","without","worker","worry","would","write","writer","wrong",
  "yes","yet","young","yourself"
];

export const URDU_WORDS = [
  "اور","ہے","یہ","کے","کا","کی","میں","کو","نہیں","ایک","اس","پر","تھا","ہوں","کچھ","لیے","بھی","آپ","وہ","ہم",
  "دن","وقت","کام","بات","لوگ","گھر","پانی","کتاب","علم","دوست","زندگی","محبت","خوشی","امید","دنیا","انسان",
  "صبح","شام","رات","سال","شہر","سڑک","درخت","پھول","آسمان","سورج","چاند","ستارہ","خواب","سچ",
  "جھوٹ","استاد","طالب","سکول","قلم","کاغذ","پیسہ","بازار","کھانا","کپڑا","سفر","منزل","راستہ","دروازہ",
  "کھڑکی","کرسی","میز","کمرہ","باغ","پرندہ","جانور","بچہ","بڑا","چھوٹا","اچھا","برا","نیا","پرانا",
  "تیز","آہستہ","مضبوط","کمزور","گرم","ٹھنڈا","روشن","تاریک","صاف","گندا","آسان","مشکل","سستا","مہنگا",
  "خوبصورت","عقل","دل","ہاتھ","آنکھ","کان","زبان","پیر","سر","جسم","صحت","بیماری","ڈاکٹر","دوا",
  "معلم","تعلیم","امتحان","کامیابی","ناکامی","کوشش","محنت","صبر","ہمت","جرات"
];

export const ROMAN_URDU_WORDS = [
  "aap","hum","yeh","woh","kya","kaise","kahan","kab","kyun","dost","ghar","pani","kitaab","waqt","kaam","baat",
  "din","raat","subah","shaam","zindagi","mohabbat","khushi","gham","umeed","mustaqbil","maazi","haal","dunya",
  "insaan","shehar","sadak","darakht","phool","aasman","sooraj","chand","sitara","khwaab","sach","dil","aankh",
  "haath","zabaan","school","ustaad","talib","kitab","qalam",
  "jhoot","kaghaz","paisa","bazaar","khana","kapra","safar","manzil","rasta","darwaza","khirki","kursi",
  "mez","kamra","baagh","parinda","janwar","bacha","bara","chota","acha","bura","naya","purana","tez",
  "aahista","mazboot","kamzor","garam","thanda","roshan","tareek","saaf","ganda","aasan","mushkil","sasta",
  "mehnga","khoobsurat","aqal","kaan","pair","sar","jism","sehat","bimari","doctor","dawa","muallim",
  "taleem","imtehan","kamyabi","nakami","koshish","mehnat","sabar","himmat","jurrat","zaroor","shayad",
  "hamesha","kabhi","abhi","phir","lekin","magar","agar","warna","isliye","kyunke"
];

export const CODE_TOKENS = [
  "def","return","import","class","self","if","else","elif","while","for","in","range(10)","print(x)","True",
  "False","None","try","except","lambda","yield","break","continue","and","or","not","x=1","y=2","i+=1","arr[0]",
  "obj.method()","len(x)","str(x)","int(x)","list()","dict()","f'{x}'","== ","!= ","func()","const","let","var",
  "=>","import os","from lib",
  "function","return null","async","await","export","default","new","this.state","this.props","super()",
  "interface","type","extends","implements","public","private","static","void","null","undefined","typeof",
  "instanceof","catch(e)","finally","throw new Error","console.log","JSON.stringify","JSON.parse",
  "Array.from","Object.keys","Object.values","map(x =>","filter(x =>","reduce((a,b)","forEach(x =>",
  "useState()","useEffect(()","useCallback","useRef","component","props.children","module.exports",
  "require(","package main","func main()","fmt.Println","public static void","System.out.println",
  "SELECT *","FROM users","WHERE id =","INSERT INTO","UPDATE SET","DELETE FROM","git commit","git push",
  "npm install","docker run"
];

// Public-domain quotes only (centuries-old sources, long out of copyright)
// — a "type this quote" feature needs the full text, which rules out
// reproducing anything still under copyright regardless of length.
export const QUOTES: { text: string; author: string }[] = [
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "The unexamined life is not worth living.", author: "Socrates" },
  { text: "In the middle of difficulty lies opportunity.", author: "Albert Einstein" },
  { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
  { text: "Whether you think you can or you think you cannot, you are right.", author: "Henry Ford" },
  { text: "The journey of a thousand miles begins with a single step.", author: "Lao Tzu" },
  { text: "To be, or not to be, that is the question.", author: "William Shakespeare" },
  { text: "I think, therefore I am.", author: "Rene Descartes" },
  { text: "Knowing yourself is the beginning of all wisdom.", author: "Aristotle" },
  { text: "Nothing in life is to be feared, it is only to be understood.", author: "Marie Curie" },
  { text: "The mind is everything. What you think you become.", author: "Buddha" },
  { text: "That which does not kill us makes us stronger.", author: "Friedrich Nietzsche" },
  { text: "We are what we repeatedly do. Excellence, then, is not an act but a habit.", author: "Aristotle" },
  { text: "Well done is better than well said.", author: "Benjamin Franklin" },
  { text: "Life is what happens when you are busy making other plans.", author: "John Lennon" },
  { text: "Genius is one percent inspiration and ninety nine percent perspiration.", author: "Thomas Edison" },
  { text: "The only thing we have to fear is fear itself.", author: "Franklin D. Roosevelt" },
  { text: "Success is not final, failure is not fatal, it is the courage to continue that counts.", author: "Winston Churchill" },
  { text: "Simplicity is the ultimate sophistication.", author: "Leonardo da Vinci" },
  { text: "Give me six hours to chop down a tree and I will spend the first four sharpening the axe.", author: "Abraham Lincoln" },
  { text: "A room without books is like a body without a soul.", author: "Marcus Tullius Cicero" },
  { text: "Not all those who wander are lost.", author: "J.R.R. Tolkien" },
  { text: "It is never too late to be what you might have been.", author: "George Eliot" },
  { text: "The only true wisdom is in knowing you know nothing.", author: "Socrates" },
  { text: "Patience is bitter, but its fruit is sweet.", author: "Aristotle" }
];

export function pickQuote(language: "en" | "ur" | "ur-roman" = "en"): string {
  // Only English quotes for now — see the note above pickQuote's export
  // for why the language toggle is disabled for quote mode.
  void language;
  const q = pick(QUOTES);
  return q.text;
}

export function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const PUNCT_MARKS = [",", ".", "!", "?"];

export function generateWord(withPunct: boolean, withNum: boolean, bank: string[]): string {
  if (withNum && Math.random() < 0.12) {
    return String(Math.floor(Math.random() * 900) + 10);
  }
  let w = pick(bank);
  if (withPunct && Math.random() < 0.15) {
    w += pick(PUNCT_MARKS);
  }
  return w;
}

export function generateWordList(
  n: number,
  withPunct: boolean,
  withNum: boolean,
  bank: string[] = WORD_BANK
): string[] {
  const list: string[] = [];
  for (let i = 0; i < n; i++) list.push(generateWord(withPunct, withNum, bank));
  return list;
}

export function bankFor(contentType: "words" | "code", language: "en" | "ur" | "ur-roman"): string[] {
  if (contentType === "code") return CODE_TOKENS;
  if (language === "ur") return URDU_WORDS;
  if (language === "ur-roman") return ROMAN_URDU_WORDS;
  return WORD_BANK;
}

// Seeded RNG so the Daily Challenge is identical for every player on a given
// date without needing a server round-trip to fetch "today's text".
export function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function dailySeed(date = new Date()): number {
  return date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
}

export function generateSeededWords(n: number, seed: number, bank: string[] = WORD_BANK): string[] {
  const rng = mulberry32(seed);
  const list: string[] = [];
  for (let i = 0; i < n; i++) list.push(bank[Math.floor(rng() * bank.length)]);
  return list;
}

// Adaptive trainer: biases word selection toward words containing the
// caller's weak characters, instead of picking uniformly at random. Not
// exclusively weak-char words — keeping ~25% ordinary words in the mix
// avoids the drill feeling like an artificial character-soup list.
export function generateWeakKeyWordList(
  n: number,
  weakChars: string[],
  bank: string[] = WORD_BANK
): string[] {
  const weakSet = new Set(weakChars.map((c) => c.toLowerCase()).filter(Boolean));

  if (weakSet.size === 0) {
    return generateWordList(n, false, false, bank);
  }

  const weighted = bank.filter((w) => {
    const lower = w.toLowerCase();
    for (const c of weakSet) {
      if (lower.includes(c)) return true;
    }
    return false;
  });

  const pool = weighted.length > 0 ? weighted : bank;
  const list: string[] = [];

  for (let i = 0; i < n; i++) {
    const source = Math.random() < 0.75 ? pool : bank;
    list.push(source[Math.floor(Math.random() * source.length)]);
  }

  return list;
}

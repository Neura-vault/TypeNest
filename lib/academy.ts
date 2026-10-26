export const HOME_ROW_WORDS = [
  "ask","sad","dad","fall","hall","gas","gala","flask","glass","salad","half","hash","flags","falls","dash",
  "flash","glad","lag","salsa","fads","adds","asks","shall","slag","hags"
];

export const TOP_ROW_WORDS = [
  "type","tree","true","wire","were","tore","tout","pout","pure","rope","tote","trot","riot","rite","tie",
  "you","your","tour","top","pot","pit","tip","wit","wet","yet","two","our","out","put"
];

export const COMMON_WORDS = [
  "the","and","you","that","was","for","are","with","his","they","this","have","from","one","had","word",
  "but","not","what","all","were","when","your","can","said","there","use","each","which","she"
];

export interface Lesson {
  id: string;
  title: string;
  intro: string;
  words: string[];
}

export const LESSONS: Lesson[] = [
  { id: "home-row", title: "Home Row Basics", words: HOME_ROW_WORDS, intro: "Rest your left fingers on A S D F and right fingers on J K L ; . Every word below uses only home row letters." },
  { id: "top-row", title: "Top Row", words: TOP_ROW_WORDS, intro: "Reach up to Q W E R T Y U I O P without looking down." },
  { id: "common-words", title: "Common Words", words: COMMON_WORDS, intro: "The most frequent words in English — nailing them gives an outsized speed boost." },
  { id: "bottom-row", title: "Bottom Row", words: ["man","can","van","calm","zinc","next","box","vex","comb","cob","mix","nix","bin","bun","buzz","zoom","cabin","combo","maxim","bank","bomb","cave","move","name","zone"], intro: "Z X C V B N M live under the home row. Keep your fingers curved and return to home after each reach." },
  { id: "numbers", title: "Number Row", words: ["10","25","360","1984","2026","747","8080","99","1200","450","7","42","365","12345","987","2048","500","60","18","1999","24","31","77","100","8"], intro: "Reach up to the number row without moving your wrist. Say each number in your head as you type it." },
  { id: "bigrams", title: "Common Letter Pairs", words: ["th","he","in","er","an","re","on","at","en","nd","ti","es","or","te","of","ed","is","it","al","ar","st","to","nt","ng","se"], intro: "These pairs appear in thousands of words. Making them automatic lifts your whole speed." },
  { id: "hand-alternation", title: "Hand Alternation", words: ["visual","handle","bicycle","turkey","authentic","island","firm","big","dismal","enamel","formal","height","ornament","signal","pamphlet","blend","amend","chair","downy","lake","sixty","eighty","busy","civic","kayak"], intro: "Words that swing between your left and right hand are the fastest to type. Let the rhythm carry you." },
  { id: "capitals", title: "Capital Letters", words: ["Karachi","Lahore","Islamabad","Monday","Friday","April","Ahmed","Sara","Pakistan","London","Paris","Tokyo","Python","Sunday","Hello","Typing","Nest","Race","Level","Speed","Quick","Brown","Zebra","Walnut","Queen"], intro: "Hold Shift with the opposite hand to the letter you are capitalising, then release before the next key." },
  { id: "punctuation", title: "Punctuation", words: ["don't","it's","well-known","re-run","hello,","yes.","why?","wow!","(note)","[ok]","a;b","x:y","e-mail","co-op","can't","we'll","they're","what's","who's","isn't","aren't","won't","I'm","you're"], intro: "Commas, full stops and apostrophes sit on the right side. Keep your little finger relaxed." },
  { id: "symbols", title: "Symbols", words: ["#tag","@home","$50","50%","a&b","x*y","2+2","5-3","a=b","a/b","~home","^up","_name","{ok}","<tag>","|pipe|","@user","#1","$100","10%","a+b","x=y","(1+2)","[0]"], intro: "Symbols need Shift plus a reach. Slow down, stay accurate, and speed will follow." },
  { id: "long-words", title: "Long Words", words: ["keyboard","practice","typing","accuracy","consistency","improvement","challenge","tournament","leaderboard","achievement","dedication","perfectly","fingers","rhythm","posture","knowledge","development","experience","beautiful","important","different","together","everything","something","remember"], intro: "Long words build endurance. Keep a steady pace instead of rushing the start." },
  { id: "roman-urdu", title: "Roman Urdu Basics", words: ["aap","kaise","hain","main","theek","shukriya","acha","bohot","kaam","ghar","dost","pyaar","zindagi","waqt","khushi","mehnat","kamyabi","pakistan","chai","paani","khana","subah","raat","kitab","school"], intro: "Everyday Roman Urdu words, spelled the way people usually type them in chat." },
  { id: "pangram-mix", title: "Full Keyboard Mix", words: ["quick","brown","fox","jumps","over","lazy","dog","pack","my","box","with","five","dozen","liquor","jugs","sphinx","black","quartz","judge","vow","waltz","nymph","bad","jigs"], intro: "Words from every row in one set. This is the closest lesson to real typing." },
  { id: "accuracy", title: "Accuracy Check", words: ["rhythm","queue","bureau","lacquer","pizza","jazz","quartz","syzygy","fjord","jukebox","mnemonic","pneumonia","gnome","yacht","rhubarb","sphinx","awkward","bagpipe","cwm","embezzle","subtle","yellow","oxygen","vodka","zephyr"], intro: "Awkward spellings that punish rushing. Aim for clean, not fast." }
];

export const LESSON_CHAIN = LESSONS.map((l) => l.id);

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
  { id: "common-words", title: "Common Words", words: COMMON_WORDS, intro: "The most frequent words in English — nailing them gives an outsized speed boost." }
];

export const LESSON_CHAIN = LESSONS.map((l) => l.id).concat(["bottom-row", "accuracy"]);

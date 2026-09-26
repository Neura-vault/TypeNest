export type TestMode = "time" | "words";
export type ContentType = "words" | "code";
export type Language = "en" | "ur" | "ur-roman";

export interface TypingTestResult {
  testType: TestMode;
  contentType: ContentType;
  language: Language;
  durationSec?: number;
  wordCount?: number;
  wpm: number;
  rawWpm: number;
  accuracy: number;
  consistency: number;
  errors: number;
  backspaces: number;
  charactersTyped: number;
  punctuation: boolean;
  numbers: boolean;
}

export interface Profile {
  id: string;
  username: string;
  avatarUrl: string | null;
  level: number;
  xp: number;
}

export interface Mission {
  id: string;
  title: string;
  target: number;
  xp: number;
  color: string;
}

export interface Achievement {
  id: string;
  title: string;
  desc: string;
  emoji: string;
}

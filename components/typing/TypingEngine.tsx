"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { bankFor, generateWordList, pickQuote } from "@/lib/wordBank";
import { xpForTest } from "@/lib/gamification";
import {
  scoreWord,
  computeWpm,
  computeAccuracy,
  computeConsistency,
  tallyCharStats,
  mergeCharTally,
  CharTally
} from "@/lib/wpm";
import { useSettings } from "@/lib/settingsContext";
import {
  playKeySound,
  playErrorSound,
  playCompleteSound
} from "@/lib/sounds";
import RhythmChart from "./RhythmChart";
import ShareResultCard from "./ShareResultCard";

type Mode = "time" | "words";
type ContentType = "words" | "code" | "quote" | "custom";
type Language = "en" | "ur" | "ur-roman";

interface TestResult {
  wpm: number;
  rawWpm: number;
  accuracy: number;
  consistency: number;
  errors: number;
  backspaces: number;
  charactersTyped: number;
  durationSec: number | null;
  wordCount: number | null;
  charStats: Record<string, { attempts: number; errors: number }>;
  wpmHistory: number[];
  keystrokes: [number, number][];
  contentType?: string;
  isCustomText?: boolean;
  language?: string;
  punctuation?: boolean;
  numbers?: boolean;
}

interface TypedWord {
  typed: string;
  target: string;
}

const TIME_AMOUNTS = [15, 30, 60];
const WORD_AMOUNTS = [25, 50, 100];

export default function TypingEngine({
  onFinish,
  customWordGenerator
}: {
  onFinish?: (result: TestResult) => void;
  customWordGenerator?: () => string[];
}) {
  const { settings } = useSettings();

  const [mode, setMode] = useState<Mode>("time");
  const [timeAmount, setTimeAmount] = useState(30);
  const [wordAmount, setWordAmount] = useState(25);
  const [contentType, setContentType] = useState<ContentType>("words");
  const [language, setLanguage] = useState<Language>("en");
  const [punctuation, setPunctuation] = useState(false);
  const [numbers, setNumbers] = useState(false);
  const [customText, setCustomText] = useState("");
  const [customDraft, setCustomDraft] = useState("");
  const [failReason, setFailReason] = useState<string | null>(null);
  const [previousBest, setPreviousBest] = useState<number | null>(null);
  const isFixedText = contentType === "quote" || contentType === "custom";

  const [words, setWords] = useState<string[]>([]);
  const [wordIndex, setWordIndex] = useState(0);
  const [currentTyped, setCurrentTyped] = useState("");
  const [typedWords, setTypedWords] = useState<TypedWord[]>([]);

  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [liveWpm, setLiveWpm] = useState(0);
  const [liveAcc, setLiveAcc] = useState(100);
  const [result, setResult] = useState<TestResult | null>(null);
  const [paused, setPaused] = useState(false);
  const [ghostLog, setGhostLog] = useState<[number, number][] | null>(null);

  const startTimeRef = useRef<number | null>(null);
  const pausedAtRef = useRef<number | null>(null);
  const correctCharsRef = useRef(0);
  const totalTypedRef = useRef(0);
  const backspacesRef = useRef(0);
  const wpmHistoryRef = useRef<number[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSampleRef = useRef(0);
  const charStatsRef = useRef<Map<string, CharTally>>(new Map());

  // Ghost replay: netPositionRef tracks "how many characters into the
  // whole test have I reached" (finalized words + current word), sampled
  // into keystrokeLogRef roughly once a second. ghostLogRef mirrors the
  // ghostLog state into a ref so the setInterval-based tick() — whose
  // closure is captured once at test start — always reads the latest
  // fetched ghost, not a stale one.
  const finalizedLengthRef = useRef(0);
  const netPositionRef = useRef(0);
  const keystrokeLogRef = useRef<[number, number][]>([]);
  const ghostLogRef = useRef<[number, number][] | null>(null);
  const ghostRequestIdRef = useRef(0);
  const ghostCaretRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ghostLogRef.current = ghostLog;
  }, [ghostLog]);

  const currentTypedRef = useRef("");
  const wordIndexRef = useRef(0);
  const wordsRef = useRef<string[]>([]);
  const finishedRef = useRef(false);

  useEffect(() => {
    currentTypedRef.current = currentTyped;
  }, [currentTyped]);

  useEffect(() => {
    wordIndexRef.current = wordIndex;
  }, [wordIndex]);

  useEffect(() => {
    wordsRef.current = words;
  }, [words]);

  useEffect(() => {
    finishedRef.current = finished;
  }, [finished]);

  const inputRef = useRef<HTMLInputElement>(null);
  const textDisplayRef = useRef<HTMLDivElement>(null);
  const textInnerRef = useRef<HTMLDivElement>(null);
  const caretRef = useRef<HTMLDivElement>(null);
  const scrollLinesRef = useRef(0);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("typenest.customText");
      if (saved) { setCustomText(saved); setCustomDraft(saved); }
    } catch { /* ignore */ }
  }, []);

  const buildWords = useCallback(() => {
    if (customWordGenerator) {
      return customWordGenerator();
    }

    if (contentType === "custom") {
      const w = customText.split(/\s+/).filter(Boolean).slice(0, 500);
      return w.length ? w : "Paste your own text above, then press Use this text.".split(" ");
    }

    if (isFixedText) {
      return pickQuote(language).split(" ");
    }

    const count =
      mode === "words" ? wordAmount : Math.max(60, timeAmount * 4);

    const bank = bankFor(contentType, language);
    const usePunct = contentType === "code" ? false : punctuation;
    const useNum = contentType === "code" ? false : numbers;

    return generateWordList(count, usePunct, useNum, bank);
  }, [
    mode,
    wordAmount,
    timeAmount,
    contentType,
    language,
    punctuation,
    numbers,
    customText,
    customWordGenerator
  ]);

  const effectiveMode: Mode =
    isFixedText ? "words" : mode;

  const resetTest = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    startTimeRef.current = null;
    pausedAtRef.current = null;
    correctCharsRef.current = 0;
    totalTypedRef.current = 0;
    backspacesRef.current = 0;
    wpmHistoryRef.current = [];
    scrollLinesRef.current = 0;
    lastSampleRef.current = 0;
    finishedRef.current = false;
    charStatsRef.current = new Map();
    finalizedLengthRef.current = 0;
    netPositionRef.current = 0;
    keystrokeLogRef.current = [];
    setGhostLog(null);

    if (ghostCaretRef.current) {
      ghostCaretRef.current.style.opacity = "0";
    }

    // Urdu is rendered word-level (no per-character spans, RTL shaping) so
    // there's no reliable DOM position to put a ghost caret at — skip the
    // fetch entirely rather than show a broken/misleading overlay.
    setPreviousBest(null);
    if (language !== "ur" && !customWordGenerator && contentType !== "custom") {
      const myRequestId = ++ghostRequestIdRef.current;
      const amount = effectiveMode === "time" ? timeAmount : wordAmount;

      fetch(`/api/ghost?mode=${effectiveMode}&amount=${amount}`)
        .then((res) => res.json())
        .then((data) => {
          if (ghostRequestIdRef.current !== myRequestId) return;
          setGhostLog(Array.isArray(data?.keystrokes) ? data.keystrokes : null);
          setPreviousBest(typeof data?.bestWpm === "number" ? data.bestWpm : null);
        })
        .catch(() => {
          if (ghostRequestIdRef.current === myRequestId) setGhostLog(null);
        });
    }

    const freshWords = buildWords();

    wordsRef.current = freshWords;
    wordIndexRef.current = 0;
    currentTypedRef.current = "";

    setWords(freshWords);
    setWordIndex(0);
    setCurrentTyped("");
    setTypedWords([]);
    setStarted(false);
    setFinished(false);
    setPaused(false);
    setTimeLeft(timeAmount);
    setLiveWpm(0);
    setLiveAcc(100);
    setResult(null);

    if (textInnerRef.current) {
      textInnerRef.current.style.transform = "translateY(0)";
    }
  }, [buildWords, timeAmount, effectiveMode, wordAmount, language, customWordGenerator]);

  // Keyboard shortcuts: Tab then Enter restarts. Esc abandons a running test,
  // and leaves the page when no test is running.
  const router = useRouter();
  const tabArmedRef = useRef(false);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (t && t !== inputRef.current && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      if (e.key === "Tab") {
        e.preventDefault();
        tabArmedRef.current = true;
        clearTimeout(timer);
        timer = setTimeout(() => (tabArmedRef.current = false), 1500);
      } else if (e.key === "Enter" && tabArmedRef.current) {
        e.preventDefault();
        tabArmedRef.current = false;
        resetTest();
      } else if (e.key === "Escape") {
        if (started && !finished) resetTest();
        else router.push("/");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      clearTimeout(timer);
    };
  }, [resetTest, started, finished, router]);

  useEffect(() => {
    resetTest();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    mode,
    timeAmount,
    wordAmount,
    contentType,
    language,
    punctuation,
    numbers
  ]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  function currentWpm(): number {
    if (!startTimeRef.current) return 0;

    const elapsedMin =
      (Date.now() - startTimeRef.current) / 60000;

    return computeWpm(correctCharsRef.current, elapsedMin);
  }

  function currentAcc(): number {
    return computeAccuracy(
      correctCharsRef.current,
      totalTypedRef.current
    );
  }

  function startTest() {
    if (started) return;

    setStarted(true);
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(tick, 250);
  }

  function tick() {
    if (effectiveMode === "time" && startTimeRef.current) {
      const elapsed =
        (Date.now() - startTimeRef.current) / 1000;

      const left = Math.max(0, timeAmount - elapsed);

      setTimeLeft(Math.ceil(left));

      if (left <= 0) {
        finishTest();
        return;
      }
    }

    setLiveWpm(currentWpm());
    setLiveAcc(currentAcc());

    // Optional "fail" rules from Settings. Checked after a 5 second warm-up.
    if (startTimeRef.current && Date.now() - startTimeRef.current > 5000) {
      const { minWpm, minAccuracy } = settings.typing;
      if (minWpm > 0 && currentWpm() < minWpm) {
        setFailReason(`Test failed: your speed dropped below ${minWpm} WPM.`);
        resetTest();
        return;
      }
      if (minAccuracy > 0 && currentAcc() < minAccuracy) {
        setFailReason(`Test failed: your accuracy dropped below ${minAccuracy}%.`);
        resetTest();
        return;
      }
    }

    const now = Date.now();

    if (now - lastSampleRef.current >= 950) {
      wpmHistoryRef.current.push(currentWpm());

      if (startTimeRef.current) {
        keystrokeLogRef.current.push([
          now - startTimeRef.current,
          netPositionRef.current
        ]);
      }

      lastSampleRef.current = now;
    }

    updateGhostCaret();
  }

  // Locates where a raw "characters into the test" count falls within the
  // *current* word list — used both for the ghost caret (a past run's
  // count mapped onto today's words) and nowhere else. Word content
  // naturally differs between runs since words are randomly generated;
  // this treats progress as a character count along the text rather than
  // needing identical words, which is what makes a ghost from a
  // differently-worded run still a fair pace comparison.
  function locateInWords(
    charIndex: number
  ): { wordIdx: number; charIdx: number; endOfWord: boolean } {
    let remaining = Math.max(0, Math.floor(charIndex));
    const list = wordsRef.current;

    for (let i = 0; i < list.length; i++) {
      const len = list[i].length;

      if (remaining <= len) {
        return { wordIdx: i, charIdx: remaining, endOfWord: remaining === len };
      }

      remaining -= len + 1; // +1 for the space rendered after each word
    }

    const lastIdx = Math.max(0, list.length - 1);
    return {
      wordIdx: lastIdx,
      charIdx: list[lastIdx]?.length ?? 0,
      endOfWord: true
    };
  }

  // Linear-interpolates the ghost's char position at a given elapsed time
  // from its recorded [elapsedMs, charPosition] samples.
  function ghostPositionAt(
    log: [number, number][],
    elapsedMs: number
  ): number {
    if (log.length === 0) return 0;
    if (elapsedMs <= log[0][0]) return log[0][1];

    for (let i = 1; i < log.length; i++) {
      if (elapsedMs <= log[i][0]) {
        const [t0, n0] = log[i - 1];
        const [t1, n1] = log[i];

        if (t1 === t0) return n1;

        const ratio = (elapsedMs - t0) / (t1 - t0);
        return n0 + (n1 - n0) * ratio;
      }
    }

    return log[log.length - 1][1];
  }

  function updateGhostCaret() {
    const viewport = textDisplayRef.current;
    const inner = textInnerRef.current;
    const ghostEl = ghostCaretRef.current;
    const log = ghostLogRef.current;

    if (!viewport || !inner || !ghostEl) return;

    if (!log || log.length < 2 || language === "ur" || !startTimeRef.current) {
      ghostEl.style.opacity = "0";
      return;
    }

    const elapsedMs = Date.now() - startTimeRef.current;
    const pos = ghostPositionAt(log, elapsedMs);
    const { wordIdx, charIdx, endOfWord } = locateInWords(pos);

    const wordEl = inner.children[wordIdx] as HTMLElement | undefined;

    if (!wordEl) {
      ghostEl.style.opacity = "0";
      return;
    }

    const vRect = viewport.getBoundingClientRect();
    const charEl = !endOfWord
      ? (wordEl.children[charIdx] as HTMLElement | undefined)
      : undefined;

    const targetRect = (charEl ?? wordEl).getBoundingClientRect();
    const left = charEl
      ? targetRect.left
      : targetRect.right;

    ghostEl.style.left = Math.round(left - vRect.left) + "px";
    ghostEl.style.top = Math.round(targetRect.top - vRect.top) + "px";
    ghostEl.style.height = Math.round(targetRect.height) + "px";
    ghostEl.style.opacity = "0.85";
  }

  function finalizeWord(
    typed: string,
    target: string,
    countTrailingSpace = false
  ) {
    const { total, correct } = scoreWord(typed, target);

    totalTypedRef.current += total;
    correctCharsRef.current += correct;

    mergeCharTally(
      charStatsRef.current,
      tallyCharStats(typed, target)
    );

    if (countTrailingSpace) {
      totalTypedRef.current++;
      correctCharsRef.current++;
    }

    finalizedLengthRef.current += target.length + 1;
    netPositionRef.current = finalizedLengthRef.current;
  }

  function finishTest(pendingAlreadyFinalized = false) {
    if (finishedRef.current) return;

    if (!pendingAlreadyFinalized) {
      const typed = currentTypedRef.current;
      const idx = wordIndexRef.current;
      const wds = wordsRef.current;

      if (typed.length > 0) {
        finalizeWord(typed, wds[idx] ?? "");

        setTypedWords((tw) => [
          ...tw,
          {
            typed,
            target: wds[idx] ?? ""
          }
        ]);
      }
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    finishedRef.current = true;
    setFinished(true);

    const elapsedMin = startTimeRef.current
      ? (Date.now() - startTimeRef.current) / 60000
      : 1 / 60;

    const finalWpm = computeWpm(
      correctCharsRef.current,
      elapsedMin || 1 / 60
    );

    const rawWpm = computeWpm(
      totalTypedRef.current,
      elapsedMin || 1 / 60
    );

    const finalAcc = computeAccuracy(
      correctCharsRef.current,
      totalTypedRef.current
    );

    const consistency = computeConsistency(
      wpmHistoryRef.current
    );

    const testResult: TestResult = {
      wpm: finalWpm,
      rawWpm,
      accuracy: finalAcc,
      consistency,
      errors: Math.max(
        0,
        totalTypedRef.current - correctCharsRef.current
      ),
      backspaces: backspacesRef.current,
      charactersTyped: totalTypedRef.current,
      durationSec:
        effectiveMode === "time" ? timeAmount : null,
      wordCount:
        effectiveMode === "words"
          ? isFixedText
            ? words.length
            : wordAmount
          : null,
      charStats: Object.fromEntries(
        Array.from(charStatsRef.current.entries())
          .sort(
            (a, b) =>
              b[1].attempts - a[1].attempts
          )
          .slice(0, 40)
      ),
      wpmHistory: [...wpmHistoryRef.current],
      keystrokes: [...keystrokeLogRef.current],
      contentType: contentType === "custom" ? "words" : contentType,
      isCustomText: contentType === "custom",
      language,
      punctuation,
      numbers
    };

    if (ghostCaretRef.current) {
      ghostCaretRef.current.style.opacity = "0";
    }

    setResult(testResult);
    onFinish?.(testResult);

    if (settings.soundEnabled) {
      playCompleteSound();
    }
  }

  // Appends one or more already-resolved characters to the current word.
  // Used by the plain keydown path (one Latin/Roman-Urdu key at a time) and
  // by the IME composition path (Urdu and any other script that composes
  // characters instead of firing them one key at a time).
  function commitTyped(chars: string) {
    if (!chars || finished) return;

    const target = words[wordIndex] ?? "";

    if (settings.soundEnabled) {
      if (target[currentTyped.length] === chars[0]) {
        playKeySound();
      } else {
        playErrorSound();
      }
    }

    const next = currentTyped + chars;

    currentTypedRef.current = next;
    setCurrentTyped(next);
    netPositionRef.current = finalizedLengthRef.current + next.length;

    if (
      effectiveMode === "words" &&
      wordIndex === words.length - 1 &&
      next.length >= target.length
    ) {
      finalizeWord(next, target);

      setTypedWords((tw) => [
        ...tw,
        {
          typed: next,
          target
        }
      ]);

      finishTest(true);
    }
  }

  // Fires while an IME/composition session (e.g. an Urdu keyboard on
  // mobile, or a phonetic/compose-based layout on desktop) has started but
  // hasn't produced final characters yet.
  function handleCompositionStart() {
    if (finished) return;

    if (!started) {
      startTest();
    }
  }

  // Fires once the OS/browser has resolved a composition session into
  // final character(s) — this is the only reliable place to read composed
  // input for scripts like Urdu, since the individual keydown events
  // during composition don't carry the final characters in e.key.
  function handleCompositionEnd(
    e: React.CompositionEvent<HTMLInputElement>
  ) {
    // The hidden input only ever exists to receive OS/IME events — reset
    // it immediately so it never accumulates text of its own.
    e.currentTarget.value = "";

    if (e.data) {
      commitTyped(e.data);
    }
  }

  function handleKeyDown(
    e: React.KeyboardEvent<HTMLInputElement>
  ) {
    if (finished) return;

    // While a composition session is active, let the browser/IME own
    // these keystrokes entirely — the resolved characters are handled in
    // handleCompositionEnd instead. Acting on them here too would
    // double-count or corrupt composed characters (this is the standard
    // fix for IME-based scripts, Urdu included).
    if (e.nativeEvent.isComposing || e.keyCode === 229) return;

    // Difficulty: expert fails when you leave a word with a mistake, master on the first wrong key.
    if (settings.typing.difficulty !== "normal" && !e.ctrlKey && !e.metaKey) {
      const targetWord = words[wordIndex] ?? "";
      const wrongKey = e.key.length === 1 && e.key !== " " && !targetWord.startsWith(currentTyped + e.key);
      const badLeave = e.key === " " && currentTyped.length > 0 && currentTyped !== targetWord;
      if ((settings.typing.difficulty === "master" && wrongKey) || (settings.typing.difficulty === "expert" && badLeave)) {
        e.preventDefault();
        setFailReason(settings.typing.difficulty === "master" ? "Test failed: master mode ends on the first mistake." : "Test failed: expert mode ends when you leave a word with a mistake.");
        resetTest();
        return;
      }
    }

    // Stop on error: a wrong letter is ignored, so the word can only be typed correctly.
    if (settings.typing.stopOnError && e.key.length === 1 && e.key !== " " && !e.ctrlKey && !e.metaKey) {
      const targetWord = words[wordIndex] ?? "";
      if (!targetWord.startsWith(currentTyped + e.key)) {
        e.preventDefault();
        return;
      }
    }

    if (!started && e.key.length === 1) {
      startTest();
    }

    if (e.key === "Backspace") {
      e.preventDefault();

      if (currentTyped.length > 0) {
        const next = currentTyped.slice(0, -1);

        currentTypedRef.current = next;
        setCurrentTyped(next);
        netPositionRef.current = finalizedLengthRef.current + next.length;
        backspacesRef.current++;
      }

      return;
    }

    if (e.key === " ") {
      e.preventDefault();

      if (currentTyped.length === 0) return;

      const target = words[wordIndex] ?? "";

      finalizeWord(
        currentTyped,
        target,
        true
      );

      setTypedWords((tw) => [
        ...tw,
        {
          typed: currentTyped,
          target
        }
      ]);

      const nextIndex = wordIndex + 1;

      if (
        effectiveMode === "words" &&
        nextIndex >= words.length
      ) {
        wordIndexRef.current = nextIndex;
        currentTypedRef.current = "";

        setWordIndex(nextIndex);
        setCurrentTyped("");

        finishTest(true);
        return;
      }

      if (
        effectiveMode === "time" &&
        nextIndex > words.length - 15
      ) {
        const extra = generateWordList(
          50,
          punctuation,
          numbers,
          bankFor(
            isFixedText
              ? "words"
              : contentType,
            language
          )
        );

        wordsRef.current = [
          ...wordsRef.current,
          ...extra
        ];

        setWords((w) => [...w, ...extra]);
      }

      wordIndexRef.current = nextIndex;
      currentTypedRef.current = "";

      setWordIndex(nextIndex);
      setCurrentTyped("");

      return;
    }

    if (
      e.key.length === 1 &&
      !e.ctrlKey &&
      !e.metaKey &&
      !e.altKey
    ) {
      e.preventDefault();
      commitTyped(e.key);
    }
  }

  const [fontsReady, setFontsReady] = useState(false);
  const [, forceRemeasure] = useState(0);

  useEffect(() => {
    if (
      typeof document === "undefined" ||
      !("fonts" in document)
    ) {
      return;
    }

    document.fonts.ready.then(() =>
      setFontsReady(true)
    );
  }, []);

  useEffect(() => {
    function onResize() {
      forceRemeasure((n) => n + 1);
    }

    window.addEventListener("resize", onResize);

    return () =>
      window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const viewport = textDisplayRef.current;
    const inner = textInnerRef.current;
    const caret = caretRef.current;

    if (!viewport || !inner || !caret) return;

    const lineHeightPx =
      parseFloat(
        getComputedStyle(inner).lineHeight
      ) ||
      parseFloat(
        getComputedStyle(inner).fontSize
      ) * 1.75;

    viewport.style.height =
      Math.round(lineHeightPx * 4) + "px";

    const curWordEl = inner.children[
      Math.min(
        wordIndex,
        inner.children.length - 1
      )
    ] as HTMLElement | undefined;

    if (wordIndex === 0) {
      scrollLinesRef.current = 0;
    }

    if (curWordEl) {
      const lineIdx = Math.round(
        curWordEl.offsetTop / lineHeightPx
      );

      if (
        lineIdx -
          scrollLinesRef.current >
        2
      ) {
        scrollLinesRef.current =
          lineIdx - 2;
      }
    }

    inner.style.transform = `translateY(-${
      scrollLinesRef.current *
      lineHeightPx
    }px)`;

    const curCharEl =
      inner.querySelector(
        ".current-char"
      ) as HTMLElement | null;

    if (!curCharEl) {
      caret.style.opacity = "0";
      return;
    }

    const cRect =
      curCharEl.getBoundingClientRect();

    const vRect =
      viewport.getBoundingClientRect();

    caret.style.left =
      Math.round(
        cRect.left - vRect.left
      ) + "px";

    caret.style.top =
      Math.round(
        cRect.top - vRect.top
      ) + "px";

    caret.style.height =
      Math.round(cRect.height) + "px";

    caret.style.opacity = "1";
  }, [
    wordIndex,
    currentTyped,
    fontsReady,
    language,
    contentType,
    words
  ]);

  function handleBlur() {
    if (started && !finished) {
      pausedAtRef.current = Date.now();

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      setPaused(true);
    }
  }

  function handleFocus() {
    if (
      started &&
      !finished &&
      pausedAtRef.current &&
      startTimeRef.current
    ) {
      startTimeRef.current +=
        Date.now() - pausedAtRef.current;

      pausedAtRef.current = null;

      timerRef.current =
        setInterval(tick, 250);

      setPaused(false);
    }
  }

  if (result) {
    return (
      <ResultsScreen
        result={result}
        previousBest={contentType === "custom" ? null : previousBest}
        xpEarned={xpForTest(
          result.wpm,
          result.accuracy
        )}
        mode={effectiveMode}
        amount={effectiveMode === "time" ? timeAmount : wordAmount}
        theme={settings.theme}
        onRestart={resetTest}
      />
    );
  }

  return (
    <div className="py-6">
      {failReason && (
        <div className="fail-note" role="alert">
          <span>{failReason}</span>
          <button onClick={() => setFailReason(null)} aria-label="Dismiss">×</button>
        </div>
      )}
      {contentType === "custom" && (
        <div className="ct-box">
          <label htmlFor="ct-text" className="pf-label">Your text</label>
          <textarea
            id="ct-text"
            value={customDraft}
            onChange={(e) => setCustomDraft(e.target.value)}
            placeholder="Paste or write the text you want to practise. Up to 500 words."
            rows={4}
          />
          <div className="ct-actions">
            <span className="pd-lab">{customDraft.split(/\s+/).filter(Boolean).length} words. Results from your own text are not saved to leaderboards.</span>
            <button
              className="btn-primary tn-btn"
              disabled={customDraft.split(/\s+/).filter(Boolean).length < 3}
              onClick={() => {
                const t = customDraft.replace(/\s+/g, " ").trim();
                setCustomText(t);
                try { window.localStorage.setItem("typenest.customText", t); } catch { /* ignore */ }
              }}
            >
              Use this text
            </button>
          </div>
        </div>
      )}
      {!customWordGenerator && (
      <div className="tn-toolbar">
        <SegmentGroup
          value={mode}
          onChange={(v) => setMode(v as Mode)}
          options={[
            {
              label: "Time",
              value: "time"
            },
            {
              label: "Words",
              value: "words"
            }
          ]}
          disabled={isFixedText}
        />

        <Divider />

        <SegmentGroup
          value={String(
            mode === "time"
              ? timeAmount
              : wordAmount
          )}
          onChange={(v) =>
            mode === "time"
              ? setTimeAmount(Number(v))
              : setWordAmount(Number(v))
          }
          options={(
            mode === "time"
              ? TIME_AMOUNTS
              : WORD_AMOUNTS
          ).map((n) => ({
            label: String(n),
            value: String(n)
          }))}
          disabled={isFixedText}
        />

        <Divider />

        <SegmentGroup
          value={contentType}
          onChange={(v) =>
            setContentType(v as ContentType)
          }
          options={[
            {
              label: "Words",
              value: "words"
            },
            {
              label: "Quote",
              value: "quote"
            },
            {
              label: "Custom",
              value: "custom"
            },
            {
              label: "Code",
              value: "code"
            }
          ]}
        />

        <Divider />

        <SegmentGroup
          value={language}
          onChange={(v) =>
            setLanguage(v as Language)
          }
          options={[
            {
              label: "English",
              value: "en"
            },
            {
              label: "اردو",
              value: "ur"
            },
            {
              label: "Roman Urdu",
              value: "ur-roman"
            }
          ]}
          disabled={
            contentType === "code" ||
            isFixedText
          }
        />

        <Divider />

        <ToggleChip
          label="Punctuation"
          active={punctuation}
          onClick={() =>
            setPunctuation((v) => !v)
          }
          disabled={
            contentType !== "words"
          }
        />

        <ToggleChip
          label="Numbers"
          active={numbers}
          onClick={() =>
            setNumbers((v) => !v)
          }
          disabled={
            contentType !== "words"
          }
        />
      </div>
      )}

      <div className="live-row">
        <LiveStat
          value={
            effectiveMode === "time"
              ? timeLeft
              : words.length - wordIndex
          }
          label={
            effectiveMode === "time"
              ? "Time"
              : "Left"
          }
        />

        {settings.typing.liveStats !== "off" && (
          <LiveStat
          value={liveWpm}
          label="WPM"
          color="var(--blue-500)"
        />
        )}

        {settings.typing.liveStats === "full" && (
          <LiveStat
          value={`${liveAcc}%`}
          label="Accuracy"
        />
        )}
      </div>

      {ghostLog && (
        <p
          className="text-center text-xs mb-2 font-medium"
          style={{ color: "var(--amber-700)" }}
        >
          Racing your personal best — the amber line is where you were at this point last time
        </p>
      )}

      <div
        ref={textDisplayRef}
        data-blind={settings.typing.blindMode}
        onClick={() =>
          inputRef.current?.focus({
            preventScroll: true
          })
        }
        lang={
          language === "ur"
            ? "ur"
            : "en"
        }
        dir={
          language === "ur"
            ? "rtl"
            : "ltr"
        }
        className="relative overflow-hidden max-w-[1040px] mx-auto px-1 py-2 select-none cursor-text"
        style={{
          filter: paused
            ? "blur(5px)"
            : "none",
          transition: "filter 220ms",
          fontFamily:
            contentType === "code"
              ? "var(--font-mono)"
              : language === "ur"
                ? "var(--font-urdu), serif"
                : "var(--font-mono)",
          fontSize:
            language === "ur"
              ? "clamp(24px, 3vw, 34px)"
              : contentType === "code"
                ? "clamp(15px, 1.7vw, 19px)"
                : "clamp(19px, 2.2vw, 27px)",
          lineHeight:
            language === "ur"
              ? 2.3
              : 1.75,
          direction:
            language === "ur"
              ? "rtl"
              : "ltr"
        }}
      >
        <div
          ref={textInnerRef}
          className="relative"
          style={{
            transition:
              "transform 260ms cubic-bezier(.4,0,.2,1)"
          }}
        >
          {words.map((w, wi) => (
            <WordSpan
              key={wi}
              word={w}
              isCurrent={wi === wordIndex}
              isDone={wi < wordIndex}
              currentTyped={
                wi === wordIndex
                  ? currentTyped
                  : ""
              }
              typedRecord={
                typedWords[wi]
              }
              wordLevel={
                language === "ur"
              }
            />
          ))}
        </div>

        <div
          ref={caretRef}
          className="typing-caret absolute w-[2px] rounded-sm opacity-0"
          style={{
            background:
              "var(--blue-500)"
          }}
        />

        <div
          ref={ghostCaretRef}
          className="absolute w-[2px] rounded-sm opacity-0 pointer-events-none"
          style={{
            background: "var(--amber-500)",
            boxShadow: "0 0 0 3px color-mix(in srgb, var(--amber-500) 25%, transparent)",
            transition: "left 120ms linear, top 120ms linear"
          }}
          title="Your personal best, at this point in time"
        />

        <input
          ref={inputRef}
          defaultValue=""
          onChange={() => {}}
          onKeyDown={handleKeyDown}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          onBlur={handleBlur}
          onFocus={handleFocus}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          aria-hidden="true"
          tabIndex={-1}
          className="absolute opacity-0 pointer-events-none top-0 left-0 w-px h-px"
        />
      </div>

      <p
        className="text-center text-sm mt-5"
        style={{
          color: "var(--text-dim)"
        }}
      >
        {paused
          ? "Paused — click the text to resume"
          : started
            ? "Typing…"
            : "Click the text or press any key to start typing"}
      </p>

      <div className="flex justify-center mt-6">
        <button onClick={resetTest} className="btn-ghost tn-btn">
          Restart test
        </button>
      </div>
    </div>
  );
}

function WordSpan({
  word,
  isCurrent,
  isDone,
  currentTyped,
  typedRecord,
  wordLevel
}: {
  word: string;
  isCurrent: boolean;
  isDone: boolean;
  currentTyped: string;
  typedRecord?: TypedWord;
  wordLevel: boolean;
}) {
  if (wordLevel) {
    let color = "var(--text-dim)";

    if (isCurrent) {
      color = "var(--text)";
    } else if (isDone && typedRecord) {
      color =
        typedRecord.typed ===
        typedRecord.target
          ? "#1FA463"
          : "#E24B4B";
    }

    return (
      <span
        className="inline-block mx-2 mb-2.5"
        style={{
          color,
          borderBottom: isCurrent
            ? "2px solid var(--blue-500)"
            : "none"
        }}
      >
        {word}

        {isCurrent && (
          <span
            className="current-char"
            style={{
              display: "inline-block",
              width: 0
            }}
          />
        )}
      </span>
    );
  }

  return (
    <span className="inline-block mr-2.5 mb-1.5">
      {word.split("").map((c, ci) => {
        let className = "";

        if (isCurrent) {
          if (ci < currentTyped.length) {
            className =
              currentTyped[ci] === c
                ? "correct"
                : "incorrect";
          } else if (
            ci === currentTyped.length
          ) {
            className = "current-char";
          }
        } else if (
          isDone &&
          typedRecord &&
          typedRecord.typed[ci] !==
            undefined
        ) {
          className =
            typedRecord.typed[ci] === c
              ? "correct"
              : "incorrect";
        }

        const color =
          className === "correct"
            ? "var(--text)"
            : className === "incorrect"
              ? "#E24B4B"
              : "var(--text-dim)";

        return (
          <span
            key={ci}
            className={className}
            style={{ color }}
          >
            {c}
          </span>
        );
      })}

      {isCurrent &&
        currentTyped.length >
          word.length && (
          <span
            style={{
              color: "#E24B4B",
              textDecoration:
                "underline dotted"
            }}
          >
            {currentTyped.slice(
              word.length
            )}
          </span>
        )}

      {isCurrent &&
        currentTyped.length >=
          word.length && (
          <span
            className="current-char"
            style={{
              display: "inline-block",
              width: 0
            }}
          />
        )}
    </span>
  );
}

function SegmentGroup({
  value,
  onChange,
  options,
  disabled
}: {
  value: string;
  onChange: (v: string) => void;
  options: {
    label: string;
    value: string;
  }[];
  disabled?: boolean;
}) {
  return (
    <div className="seg" data-disabled={disabled ? "true" : undefined}>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className="seg-b"
          data-on={value === o.value}
          aria-pressed={value === o.value}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function ToggleChip({
  label,
  active,
  onClick,
  disabled
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="chip"
      data-on={active}
      aria-pressed={active}
    >
      {label}
    </button>
  );
}

function Divider() {
  return <div className="tn-sep" aria-hidden="true" />;
}

function LiveStat({
  value,
  label,
  color
}: {
  value: string | number;
  label: string;
  color?: string;
}) {
  return (
    <div className="live">
      <div className="live-n" style={color ? { color } : undefined}>
        {value}
      </div>
      <div className="live-l">{label}</div>
    </div>
  );
}

function ResultsScreen({
  result,
  xpEarned,
  mode,
  amount,
  theme,
  onRestart,
  previousBest
}: {
  previousBest?: number | null;
  result: TestResult;
  xpEarned: number;
  mode: "time" | "words";
  amount: number;
  theme: string;
  onRestart: () => void;
}) {
  const weak = Object.entries(result.charStats)
    .filter(([c, v]) => c.trim() && v.attempts >= 3 && v.errors > 0)
    .map(([c, v]) => ({ c, errors: v.errors, rate: Math.round((v.errors / v.attempts) * 100) }))
    .sort((a, b) => b.rate - a.rate || b.errors - a.errors)
    .slice(0, 6);
  const next =
    result.accuracy < 95
      ? "Slow down a little. Accuracy first, speed follows."
      : result.consistency < 70
        ? "Your pace swings a lot. Aim for an even rhythm."
        : "Clean and steady. Try a longer test or add punctuation.";

  return (
    <div className="rs">
      <header className="rs-head">
        <h2>Test complete</h2>
        {previousBest != null && (
          <p className="pb-line" data-up={result.wpm > previousBest}>
            {result.wpm > previousBest
              ? `New personal best: +${Math.round((result.wpm - previousBest) * 10) / 10} WPM over your ${Math.round(previousBest)} WPM record`
              : result.wpm === previousBest
                ? `You matched your personal best of ${Math.round(previousBest)} WPM`
                : `${Math.round((previousBest - result.wpm) * 10) / 10} WPM below your personal best of ${Math.round(previousBest)}`}
          </p>
        )}
      </header>

      <div className="rs-hero">
        <div className="rs-main">
          <span className="rs-big">{result.wpm}</span>
          <span className="rs-unit">WPM</span>
        </div>
        <dl className="rs-metrics">
          <div>
            <dt>Accuracy</dt>
            <dd>{result.accuracy}%</dd>
          </div>
          <div>
            <dt>Raw WPM</dt>
            <dd>{result.rawWpm}</dd>
          </div>
          <div>
            <dt>Consistency</dt>
            <dd>{result.consistency}%</dd>
          </div>
          <div>
            <dt>XP earned</dt>
            <dd>+{xpEarned}</dd>
          </div>
        </dl>
      </div>

      <section className="rs-panel">
        <h3>Typing rhythm</h3>
        <p className="rs-sub">Your speed through the test: where you sped up and where you slowed down.</p>
        <RhythmChart data={result.wpmHistory} />
      </section>

      <section className="rs-next">
        <div>
          <h3>Keys to work on</h3>
          {weak.length === 0 ? (
            <p className="rs-sub">No repeated mistakes in this test.</p>
          ) : (
            <div className="tr-keys">
              {weak.map((k) => (
                <span key={k.c} title={`${k.errors} mistakes`}><kbd>{k.c}</kbd>{k.rate}%</span>
              ))}
            </div>
          )}
        </div>
        <div>
          <h3>Next step</h3>
          <p className="rs-sub">{next}</p>
          <a href="/train" className="rs-link">Open your coach</a>
        </div>
      </section>

      <div className="rs-share">
        <ShareResultCard
          wpm={result.wpm}
          accuracy={result.accuracy}
          consistency={result.consistency}
          mode={mode}
          amount={amount}
          theme={theme}
        />
      </div>

      <div className="rs-actions">
        <button onClick={onRestart} className="btn-primary tn-btn">Next test</button>
        <span className="px-keys"><kbd>Tab</kbd> + <kbd>Enter</kbd> restarts from anywhere</span>
      </div>
    </div>
  );
}



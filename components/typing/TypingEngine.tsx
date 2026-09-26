"use client";

import { useEffect, useRef, useState, useCallback } from "react";
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
type ContentType = "words" | "code" | "quote";
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

  const buildWords = useCallback(() => {
    if (customWordGenerator) {
      return customWordGenerator();
    }

    if (contentType === "quote") {
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
    customWordGenerator
  ]);

  const effectiveMode: Mode =
    contentType === "quote" ? "words" : mode;

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
    if (language !== "ur" && !customWordGenerator) {
      const myRequestId = ++ghostRequestIdRef.current;
      const amount = effectiveMode === "time" ? timeAmount : wordAmount;

      fetch(`/api/ghost?mode=${effectiveMode}&amount=${amount}`)
        .then((res) => res.json())
        .then((data) => {
          if (ghostRequestIdRef.current !== myRequestId) return;
          setGhostLog(Array.isArray(data?.keystrokes) ? data.keystrokes : null);
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
          ? contentType === "quote"
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
      keystrokes: [...keystrokeLogRef.current]
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
            contentType === "quote"
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
      {!customWordGenerator && (
      <div className="flex flex-wrap items-center justify-center gap-3 mb-9">
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
          disabled={contentType === "quote"}
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
          disabled={contentType === "quote"}
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
            contentType === "quote"
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

      <div className="flex justify-center gap-9 mb-6">
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
          color="var(--amber-500)"
        />

        <LiveStat
          value={liveWpm}
          label="WPM"
          color="var(--blue-500)"
        />

        <LiveStat
          value={`${liveAcc}%`}
          label="Accuracy"
        />
      </div>

      {ghostLog && (
        <p
          className="text-center text-xs mb-2 font-medium"
          style={{ color: "var(--amber-700)" }}
        >
          👻 Racing your personal best — the amber line is where you were at this point last time
        </p>
      )}

      <div
        ref={textDisplayRef}
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
        className="relative overflow-hidden max-w-[820px] mx-auto px-1 py-2 select-none cursor-text"
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
                : "var(--font-heading)",
          fontSize:
            language === "ur"
              ? 32
              : contentType === "code"
                ? 19
                : 26,
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

      <div className="flex justify-center gap-2.5 mt-6">
        <button
          onClick={resetTest}
          className="btn-ghost px-4 py-2 rounded-xl text-sm font-semibold"
        >
          ↻ Restart
        </button>

        <button
          onClick={resetTest}
          className="btn-primary px-4 py-2 rounded-xl text-sm font-semibold"
        >
          New Test
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
    <div
      className="flex items-center gap-1 rounded-full p-1 border"
      style={{
        background: "var(--surface)",
        borderColor: "var(--border)",
        opacity: disabled ? 0.4 : 1,
        pointerEvents: disabled
          ? "none"
          : "auto"
      }}
    >
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className="px-3.5 py-1.5 rounded-full text-sm font-semibold"
          style={{
            background:
              value === o.value
                ? "var(--blue-500)"
                : "transparent",
            color:
              value === o.value
                ? "#fff"
                : "var(--text-dim)"
          }}
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
      className="flex items-center gap-1.5 text-sm font-semibold rounded-full border px-3.5 py-2"
      style={{
        background: active
          ? "rgba(30,111,239,.08)"
          : "var(--surface)",
        borderColor: active
          ? "var(--blue-500)"
          : "var(--border)",
        color: active
          ? "var(--blue-500)"
          : "var(--text-dim)",
        opacity: disabled ? 0.4 : 1
      }}
    >
      {label}
    </button>
  );
}

function Divider() {
  return (
    <div
      className="w-px h-[22px]"
      style={{
        background: "var(--border)"
      }}
    />
  );
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
    <div className="text-center">
      <div
        className="font-heading text-[34px] font-bold leading-none"
        style={{
          color:
            color ?? "var(--text)"
        }}
      >
        {value}
      </div>

      <div
        className="text-xs font-semibold uppercase tracking-wide mt-1"
        style={{
          color: "var(--text-dim)"
        }}
      >
        {label}
      </div>
    </div>
  );
}

function ResultsScreen({
  result,
  xpEarned,
  mode,
  amount,
  theme,
  onRestart
}: {
  result: TestResult;
  xpEarned: number;
  mode: "time" | "words";
  amount: number;
  theme: string;
  onRestart: () => void;
}) {
  return (
    <div className="max-w-2xl mx-auto py-10 text-center">
      <div
        className="icon-tile lg solid tile-amber mx-auto mb-4"
        style={{ fontSize: 26 }}
      >
        🏆
      </div>

      <h2 className="text-2xl font-bold mb-1">
        Test Completed!
      </h2>

      <p
        className="text-sm mb-6"
        style={{
          color: "var(--text-dim)"
        }}
      >
        Nice work — here&apos;s how it went.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mb-6">
        <ResultTile
          value={result.wpm}
          label="WPM"
          color="var(--blue-500)"
        />

        <ResultTile
          value={`${result.accuracy}%`}
          label="Accuracy"
          color="var(--teal-500)"
        />

        <ResultTile
          value={result.rawWpm}
          label="Raw WPM"
          color="var(--violet-500)"
        />

        <ResultTile
          value={`${result.consistency}%`}
          label="Consistency"
          color="var(--amber-500)"
        />
      </div>

      <div className="card p-5 mb-6 text-left">
        <h3 className="font-semibold mb-1 text-center">
          Typing Rhythm
        </h3>
        <p
          className="text-xs text-center mb-3"
          style={{
            color: "var(--text-dim)"
          }}
        >
          Your speed through the test — where you sped up, where you slowed down.
        </p>
        <RhythmChart data={result.wpmHistory} />
      </div>

      <p
        className="badge mx-auto w-fit mb-6"
        style={{
          color: "var(--amber-700)"
        }}
      >
        +{xpEarned} XP earned
      </p>

      <ShareResultCard
        wpm={result.wpm}
        accuracy={result.accuracy}
        consistency={result.consistency}
        mode={mode}
        amount={amount}
        theme={theme}
      />

      <div className="flex justify-center gap-3">
        <button
          onClick={onRestart}
          className="btn-ghost px-5 py-2.5 rounded-xl font-semibold"
        >
          Try Again
        </button>

        <button
          onClick={onRestart}
          className="btn-primary px-5 py-2.5 rounded-xl font-semibold"
        >
          New Test
        </button>
      </div>
    </div>
  );
}

function ResultTile({
  value,
  label,
  color
}: {
  value: string | number;
  label: string;
  color?: string;
}) {
  return (
    <div className="card hover-lift p-4.5 text-center">
      <div
        className="font-heading text-2xl font-bold"
        style={{
          color:
            color ?? "var(--text)"
        }}
      >
        {value}
      </div>

      <div
        className="text-xs mt-1"
        style={{
          color: "var(--text-dim)"
        }}
      >
        {label}
      </div>
    </div>
  );
}

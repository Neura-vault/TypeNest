import { z } from "zod";

// One schema per route body. Keeping them here (not inline in each route)
// means the "what fields exist, what are their bounds" question has one
// answer instead of N slightly-different hand-written checks.

export const TestSchema = z.object({
  testType: z.enum(["time", "words"]),
  contentType: z.enum(["words", "code", "quote"]).optional(),
  language: z.string().max(8).optional(),
  durationSec: z.number().int().positive().nullable().optional(),
  wordCount: z.number().int().positive().nullable().optional(),
  wpm: z.number().min(0).max(350),
  rawWpm: z.number().min(0).max(350).optional(),
  accuracy: z.number().min(0).max(100),
  consistency: z.number().min(0).max(100).nullable().optional(),
  errors: z.number().int().min(0).max(100000).optional(),
  backspaces: z.number().int().min(0).max(100000).optional(),
  charactersTyped: z.number().int().min(0).max(1000000).optional(),
  charStats: z
    .record(
      z.string().max(4),
      z.object({ attempts: z.number().int().min(0).max(100000), errors: z.number().int().min(0).max(100000) })
    )
    .optional(),
  keystrokes: z
    .array(z.tuple([z.number().min(0).max(3_600_000), z.number().min(0).max(1_000_000)]))
    .max(2000)
    .optional(),
  punctuation: z.boolean().optional(),
  numbers: z.boolean().optional()
});

export const RaceSchema = z.object({
  difficulty: z.enum(["beginner", "easy", "normal", "hard", "expert", "insane"]),
  playerWpm: z.number().min(0).max(350),
  aiWpm: z.number().min(0).max(350)
  // "won" is intentionally not accepted here anymore — the server decides.
});

export const ChallengeSchema = z.object({
  wpm: z.number().min(0).max(350),
  accuracy: z.number().min(0).max(100)
});

export const GameScoreSchema = z.object({
  gameId: z.enum(["falling-words", "speed-rush", "accuracy-survival"]),
  score: z.number().int().min(0).max(100000),
  wordsCleared: z.number().int().min(0).max(100000).optional(),
  difficulty: z.string().max(20).optional()
});

export const AcademyProgressSchema = z.object({
  lessonId: z.enum(["home-row", "top-row", "common-words"]),
  wpm: z.number().min(0).max(350).optional(),
  accuracy: z.number().min(0).max(100)
});

export const MissionClaimSchema = z.object({
  missionId: z.string().min(1).max(20)
});

export const CharReviewSchema = z.object({
  results: z
    .array(
      z.object({
        char: z.string().length(1),
        passed: z.boolean()
      })
    )
    .min(1)
    .max(100)
});

export const RaceRoomCreateSchema = z.object({
  wordList: z.array(z.string().min(1).max(30)).min(10).max(400),
  maxPlayers: z.number().int().min(2).max(8).optional()
});

export const RaceRoomJoinSchema = z.object({
  code: z
    .string()
    .trim()
    .min(4)
    .max(8)
    .regex(/^[a-zA-Z0-9]+$/, "Invalid room code")
});

export const RaceRoomStartSchema = z.object({
  roomId: z.string().uuid()
});

export const RaceRoomFinishSchema = z.object({
  roomId: z.string().uuid(),
  wpm: z.number().min(0).max(350),
  accuracy: z.number().min(0).max(100)
});

export const TeamCreateSchema = z.object({
  name: z.string().trim().min(2).max(40),
  emoji: z.string().trim().max(8).optional()
});

export const TeamJoinSchema = z.object({
  code: z
    .string()
    .trim()
    .min(4)
    .max(8)
    .regex(/^[a-zA-Z0-9]+$/, "Invalid team code")
});

export const TournamentCreateSchema = z.object({
  name: z.string().trim().min(2).max(60),
  maxParticipants: z.union([z.literal(4), z.literal(8), z.literal(16), z.literal(32)])
});

export const TournamentJoinSchema = z.object({
  code: z
    .string()
    .trim()
    .min(4)
    .max(8)
    .regex(/^[a-zA-Z0-9]+$/, "Invalid tournament code")
});

export const TournamentStartSchema = z.object({
  tournamentId: z.string().uuid()
});

export const TournamentAdvanceSchema = z.object({
  tournamentId: z.string().uuid()
});

export const THEMES = ["aurora", "midnight", "cyber", "ocean", "forest", "sunset"] as const;

export const SettingsSchema = z.object({
  theme: z.enum(THEMES).optional(),
  fontSize: z.number().int().min(12).max(24).optional(),
  soundEnabled: z.boolean().optional(),
  animationsEnabled: z.boolean().optional(),
  reducedMotion: z.boolean().optional(),
  focusMode: z.boolean().optional()
});

export function parseBody<T extends z.ZodTypeAny>(schema: T, data: unknown) {
  return schema.safeParse(data);
}

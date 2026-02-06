import { z } from 'zod';

const LiveDataSchema = z.object({
  setIndex: z.string().describe("The live SET index, e.g., '1,346.23'"),
  value: z.string().describe("The live SET value, e.g., '57,388.58'"),
  twoD: z.string().length(2).describe("The live 2D number, e.g., '38'"),
  lastUpdated: z.string(),
});

export const AnalyzePatternsInputSchema = z.object({
  liveData: LiveDataSchema.describe("The most recent live data including the SET index and the resulting 2D number."),
  historicalNumbers: z.array(z.string().length(2)).describe('An array of 2D numbers from the last 30+ days for filtering.'),
  evaluationNumbers: z.array(z.string().length(2)).describe('An array of all 2D numbers from the last 90+ days for statistical evaluation.'),
});
export type AnalyzePatternsInput = z.infer<typeof AnalyzePatternsInputSchema>;

const MarketContextSchema = z.object({
    previousResult: z.string().length(2),
    setOpenIndex: z.string(),
    powerDigits: z.array(z.string()),
});

const CandidateStatsSchema = z.object({
    number: z.string().length(2),
    count: z.number(),
    hitRate: z.number(),
    ruleOverlap: z.string(),
    momentum: z.string(),
    confidence: z.number(),
});
export type CandidateStats = z.infer<typeof CandidateStatsSchema>;

const CategoryHitRateSchema = z.object({
    powerDigitHitRate: z.number(),
    brotherPairHitRate: z.number(),
    oneChangeHitRate: z.number(),
    doubleNumberHitRate: z.number(),
});

const FinalSelectionSchema = z.object({
    main: z.array(z.string().length(2)),
    strongSupport: z.array(z.string().length(2)),
    watchRotation: z.array(z.string().length(2)),
});

export const AnalyzePatternsOutputSchema = z.object({
  marketContext: MarketContextSchema,
  executiveSummary: z.string(),
  categoryHitRates: CategoryHitRateSchema,
  topCandidates: z.array(CandidateStatsSchema),
  finalSelection: FinalSelectionSchema,
});
export type AnalyzePatternsOutput = z.infer<typeof AnalyzePatternsOutputSchema>;

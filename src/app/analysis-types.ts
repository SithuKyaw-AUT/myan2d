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

const CandidateNumbersSchema = z.object({
    powerDigits: z.array(z.string().length(2)),
    brotherPairs: z.array(z.string().length(2)),
    oneChange: z.array(z.string().length(2)),
    doubles: z.array(z.string().length(2)),
});

const HitRateSchema = z.object({
    number: z.string().length(2),
    count: z.number(),
    hitRate: z.number(),
});

const CategoryHitRateSchema = z.object({
    powerDigitHitRate: z.number(),
    brotherPairHitRate: z.number(),
    oneChangeHitRate: z.number(),
    doubleNumberHitRate: z.number(),
});

export const AnalyzePatternsOutputSchema = z.object({
  stage1_filtering: z.object({
    candidates: CandidateNumbersSchema,
    finalCandidates: z.array(z.string().length(2)),
    summary: z.string(),
  }),
  stage2_evaluation: z.object({
      individualHitRates: z.array(HitRateSchema),
      categoryHitRates: CategoryHitRateSchema,
      summary: z.string(),
  }),
  prediction: z.string(),
});
export type AnalyzePatternsOutput = z.infer<typeof AnalyzePatternsOutputSchema>;

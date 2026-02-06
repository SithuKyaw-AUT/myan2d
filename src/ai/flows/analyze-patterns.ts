'use server';
/**
 * @fileOverview Analyzes 2D number patterns using a two-stage process simulating Myanmar lottery analysis methods.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const LiveDataSchema = z.object({
  setIndex: z.string().describe("The live SET index, e.g., '1,346.23'"),
  value: z.string().describe("The live SET value, e.g., '57,388.58'"),
  twoD: z.string().length(2).describe("The live 2D number, e.g., '38'"),
  lastUpdated: z.string(),
});

const AnalyzePatternsInputSchema = z.object({
  liveData: LiveDataSchema.describe("The most recent live data including the SET index and the resulting 2D number."),
  historicalNumbers: z.array(z.string().length(2)).describe('An array of 2D numbers from the last 30+ days for filtering.'),
  evaluationNumbers: z.array(z.string().length(2)).describe('An array of all 2D numbers from the last 90+ days for statistical evaluation.'),
});
export type AnalyzePatternsInput = z.infer<typeof AnalyzePatternsInputSchema>;


const CandidateNumbersSchema = z.object({
    powerDigits: z.array(z.string().length(2)).describe("Candidate numbers generated from the Power Digits rule."),
    brotherPairs: z.array(z.string().length(2)).describe("Candidate numbers generated from the Brother/Mirror rule."),
    oneChange: z.array(z.string().length(2)).describe("Candidate numbers generated from the One-Change rule."),
    doubles: z.array(z.string().length(2)).describe("Candidate double numbers, if applicable."),
});

const HitRateSchema = z.object({
    number: z.string().length(2),
    count: z.number().describe("How many times the number appeared in the evaluation dataset."),
    hitRate: z.number().describe("The hit rate percentage for this number."),
});

const CategoryHitRateSchema = z.object({
    powerDigitHitRate: z.number(),
    brotherPairHitRate: z.number(),
    oneChangeHitRate: z.number(),
    doubleNumberHitRate: z.number(),
});

const AnalyzePatternsOutputSchema = z.object({
  stage1_filtering: z.object({
    candidates: CandidateNumbersSchema,
    finalCandidates: z.array(z.string().length(2)).describe("The final list of candidate numbers after applying all filtering and exclusion rules."),
    summary: z.string().describe("A brief summary of the filtering process and the final candidates."),
  }),
  stage2_evaluation: z.object({
      individualHitRates: z.array(HitRateSchema).describe("The hit rate statistics for each final candidate number."),
      categoryHitRates: CategoryHitRateSchema.describe("The aggregate hit rate for each generation rule."),
      summary: z.string().describe("A summary of the statistical evaluation, highlighting high-performing numbers and categories."),
  }),
  prediction: z.string().describe("A final, one-paragraph prediction for the next draw, synthesizing the results from both stages."),
});
export type AnalyzePatternsOutput = z.infer<typeof AnalyzePatternsOutputSchema>;


export async function analyzeSetPatterns(
  input: AnalyzePatternsInput
): Promise<AnalyzePatternsOutput> {
  return analyzeSetPatternsFlow(input);
}

const analyzeSetPatternsFlow = ai.defineFlow(
  {
    name: 'analyzeSetPatternsFlow',
    inputSchema: AnalyzePatternsInputSchema,
    outputSchema: AnalyzePatternsOutputSchema,
  },
  async ({ liveData, historicalNumbers, evaluationNumbers }) => {
    // We need the previous result, which is the first in the historical list
    const previousResult = historicalNumbers[0]; 
    // Last 5 results for double number check
    const last5Results = historicalNumbers.slice(0, 5);
    // Last 2 results for Nat Khat check
    const last2Results = historicalNumbers.slice(0, 2);
    // Total sessions for evaluation
    const totalSessions = evaluationNumbers.length;

    const prompt = `You are an expert Myanmar 2D lottery analysis engine. Your task is to perform a two-stage analysis based on the provided data and rules.

**INPUT DATA:**
*   Most Recent Live Data: ${JSON.stringify(liveData)}
*   Previous 2D Result: "${previousResult}"
*   Historical Data (for filtering, last ~30 days): ${JSON.stringify(historicalNumbers)}
*   Historical Data (for evaluation, last ~90 days, ${totalSessions} total sessions): (Data is too large to display, but use the provided counts and hit rates you will calculate).

---

**STAGE 1: RULE-BASED FILTERING**
Generate a set of candidate numbers by applying the following Myanmar 2D analysis concepts.

**RULES:**
1.  **POWER DIGITS**:
    *   The last digit of the SET open index is a power digit. (From SET Index "${liveData.setIndex}", the last digit is "${liveData.setIndex.slice(-1)}").
    *   The two digits of the previous result are potential power digits. (From "${previousResult}", the digits are "${previousResult[0]}" and "${previousResult[1]}").
    *   From these three potential power digits, select the **two most promising** ones. Generate all 2D combinations containing at least one of these two selected power digits (e.g., if power digits are 1 and 2, generate 1X, X1, 2X, X2).

2.  **BROTHER (MIRROR)**:
    *   The mirror mapping is: 0↔5, 1↔6, 2↔7, 3↔8, 4↔9.
    *   Generate the direct mirror pair of the previous result "${previousResult}".
    *   Also generate combinations where one digit from the previous result is mirrored and the other stays the same.

3.  **ONE-CHANGE**:
    *   Generate all numbers by changing only one digit from the previous result "${previousResult}". For example, if the previous result is '25', generate '20', '21', '22', '23', '24', '26', '27', '28', '29' and '05', '15', '35', '45', '55', '65', '75', '85', '95'.

4.  **DOUBLE NUMBERS**:
    *   The last 5 results were: ${JSON.stringify(last5Results)}.
    *   Check if any of these are double numbers (e.g., 00, 11, 22...).
    *   If **NO** double number appeared in the last 5 results, include all double numbers (00, 11, ..., 99) as candidates. Otherwise, include none.

5.  **EXCLUSION (NAT KHAT)**:
    *   The last 2 consecutive results were: ${JSON.stringify(last2Results)}.
    *   From the candidates generated by rules 1-4, **remove** any number that appeared in the last 2 results.

**OUTPUT for STAGE 1:**
*   List the candidate numbers generated for each rule (powerDigits, brotherPairs, oneChange, doubles).
*   List the 'finalCandidates' after applying the exclusion rule.
*   Provide a brief summary of the filtering process.

---

**STAGE 2: STATISTICAL EVALUATION**
Evaluate the 'finalCandidates' from Stage 1 using the full 90-day evaluation dataset (${totalSessions} total sessions).

**TASKS:**
1.  **Individual Hit Rates**: For each number in 'finalCandidates':
    *   Count its occurrences in the full \`evaluationNumbers\` dataset.
    *   Calculate its hit rate: \`(count / ${totalSessions}) * 100\`. Format the rate to 2 decimal places.

2.  **Category Hit Rates**: For each original candidate list (before exclusion):
    *   Count how many times any number from that list appeared in the \`evaluationNumbers\` dataset. This is the total number of 'hits' for the category.
    *   Calculate the category hit rate: \`(total category hits / ${totalSessions}) * 100\`. Format the rate to 2 decimal places.

**FORMULA:**
*   Hit Rate (%) = (Number of hits / Total Sessions) * 100

**OUTPUT for STAGE 2:**
*   Provide 'individualHitRates' for each final candidate.
*   Provide 'categoryHitRates' for power digits, brother pairs, one-change, and double numbers.
*   Provide a summary of the statistical findings.

---

**FINAL PREDICTION:**
Based on BOTH stages, provide a concise, one-paragraph prediction for the next draw. Synthesize the findings from the rule-based filtering and the statistical evaluation to justify your prediction.
`;

    const { output } = await ai.generate({
        prompt,
        output: { schema: AnalyzePatternsOutputSchema },
    });
    
    return output!;
  }
);

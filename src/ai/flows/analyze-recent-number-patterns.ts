/**
 * @fileOverview Analyzes 2D number patterns from SET data and provides predictions.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

export const AnalyzeSetPatternsInputSchema = z.object({
  // The numbers are pre-calculated and passed in.
  numbers: z.array(z.string().length(2)).describe('An array of 2D numbers from the last 4 weeks.'),
});
export type AnalyzeSetPatternsInput = z.infer<typeof AnalyzeSetPatternsInputSchema>;

export const AnalyzeSetPatternsOutputSchema = z.object({
  analysis: z.string().describe('A detailed analysis of patterns like odd/even, serials, pairs, and digit frequency.'),
  prediction: z.string().describe('A prediction for the next draw based on the analyzed patterns, with reasoning.'),
});
export type AnalyzeSetPatternsOutput = z.infer<typeof AnalyzeSetPatternsOutputSchema>;

export async function analyzeSetPatterns(
  input: AnalyzeSetPatternsInput
): Promise<AnalyzeSetPatternsOutput> {
  return analyzeSetPatternsFlow(input);
}

const analyzeSetPatternsFlow = ai.defineFlow(
  {
    name: 'analyzeSetPatternsFlow',
    inputSchema: AnalyzeSetPatternsInputSchema,
    outputSchema: AnalyzeSetPatternsOutputSchema,
  },
  async ({ numbers }) => {
    const prompt = `You are a lottery analysis expert specializing in the Thai SET-based 2D lottery.
Given the last 4 weeks of 2D numbers, perform a detailed analysis and make a prediction.

Data:
${JSON.stringify(numbers)}

Analysis:
Please analyze the following patterns in the provided data:
1.  **Odd vs. Even:** Frequency of odd and even numbers.
2.  **Serial Numbers:** Frequency of consecutive numbers (e.g., 12, 45, 89).
3.  **Paired Numbers (Doubles):** Frequency of identical digit pairs (e.g., 00, 11, 77).
4.  **Digit Frequency:** How many times each digit (0-9) has appeared in total.
5.  **High/Low:** Frequency of numbers in low range (00-49) vs high range (50-99).

Prediction:
Based on your complete analysis of all the patterns above, provide a prediction for the next draw.
Explain your reasoning clearly, referencing the patterns you identified. Suggest a few numbers that have a high probability of appearing.
`;

    const { output } = await ai.generate({
        prompt,
        output: { schema: AnalyzeSetPatternsOutputSchema }
    });
    
    return output!;
  }
);

'use server';
/**
 * @fileOverview Analyzes 2D number patterns from historical data and provides predictions.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const AnalyzeSetPatternsInputSchema = z.object({
  // The numbers are pre-calculated and passed in.
  numbers: z.array(z.string().length(2)).describe('An array of 2D numbers from the historical data.'),
});
export type AnalyzeSetPatternsInput = z.infer<typeof AnalyzeSetPatternsInputSchema>;

const DigitFrequencySchema = z.object({
  digit: z.string().describe("The digit (0-9)"),
  count: z.number().describe("How many times the digit appeared."),
});

const AnalysisSchema = z.object({
  oddEven: z.object({
    odd: z.number().describe("Count of odd numbers."),
    even: z.number().describe("Count of even numbers."),
  }).describe("Analysis of odd vs even numbers."),
  highLow: z.object({
    high: z.number().describe("Count of numbers in the high range (50-99)."),
    low: z.number().describe("Count of numbers in the low range (00-49)."),
  }).describe("Analysis of high vs low numbers."),
  digitFrequency: z.array(DigitFrequencySchema).length(10).describe("Frequency of each digit from 0 to 9, sorted by digit ascending."),
});

const PredictionSchema = z.object({
    hotNumbers: z.array(z.string().length(2)).describe("An array of three numbers that are predicted to be 'hot' or likely to appear."),
    keyDigit: z.string().length(1).describe("A single digit that is predicted to be significant in the next draw."),
    reasoning: z.string().describe("A brief, one-sentence reasoning for the prediction based on the analysis.")
});

const AnalyzeSetPatternsOutputSchema = z.object({
  analysis: AnalysisSchema,
  prediction: PredictionSchema,
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
Your task is to analyze the provided historical 2D numbers and return a structured JSON object matching the requested output schema.

Historical Data (last 200 results):
${JSON.stringify(numbers.slice(-200))}

Analysis:
Please perform the following analysis on the provided data:
1.  **Odd vs. Even**: Count the total number of odd 2D numbers and even 2D numbers. An even number is one that ends in 0, 2, 4, 6, 8.
2.  **High/Low**: Count numbers in the low range (00-49) and high range (50-99).
3.  **Digit Frequency**: Count the occurrences of each digit (0 through 9) across all numbers. The result must be an array of 10 objects, one for each digit from "0" to "9", sorted by digit.

Prediction:
Based on your complete analysis, provide the following predictions:
1.  **Hot Numbers**: Suggest exactly three 2D numbers that have a high probability of appearing.
2.  **Key Digit**: Predict a single digit that is most likely to appear in the next draw.
3.  **Reasoning**: Provide a very brief, one-sentence explanation for your prediction.
`;

    const { output } = await ai.generate({
        prompt,
        output: { schema: AnalyzeSetPatternsOutputSchema }
    });
    
    return output!;
  }
);

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

const PairDigitFrequencySchema = z.object({
  pair: z.string().describe("The pair digit (sum of two digits, last digit) (0-9)"),
  count: z.number().describe("How many times this pair digit appeared."),
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
  pairDigitFrequency: z.array(PairDigitFrequencySchema).length(10).describe("Frequency of each pair digit (sum of digits) from 0 to 9, sorted by pair ascending."),
  repeatingNumbers: z.object({
      count: z.number().describe("Count of repeating numbers (e.g., 11, 22).")
  }).describe("Analysis of repeating numbers."),
  summary: z.string().describe("A concise, one-paragraph summary of the key findings from the analysis."),
});

const PredictionSchema = z.object({
    hotNumbers: z.array(z.string().length(2)).describe("An array of three numbers that are predicted to be 'hot' or likely to appear soon."),
    coldNumbers: z.array(z.string().length(2)).describe("An array of three numbers that are 'cold' or haven't appeared in a while, making them potentially due."),
    keyDigit: z.string().length(1).describe("A single digit that is predicted to be significant in the next draw."),
    predictedPairDigit: z.string().length(1).describe("The predicted pair digit (sum of digits) for the next draw."),
    summary: z.string().describe("A detailed, one-paragraph summary explaining the predictions for the next draw, combining the analysis to form a coherent forecast.")
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
Please perform the following detailed analysis on the provided data:
1.  **Odd vs. Even**: Count the total number of odd 2D numbers and even 2D numbers. An even number is one that ends in 0, 2, 4, 6, 8.
2.  **High/Low**: Count numbers in the low range (00-49) and high range (50-99).
3.  **Digit Frequency**: Count the occurrences of each digit (0 through 9) across all numbers. The result must be an array of 10 objects, one for each digit from "0" to "9", sorted by digit.
4.  **Pair Digit (ဘရိတ်) Frequency**: For each 2D number, sum its two digits. The "pair digit" is the last digit of that sum (e.g., for '58', sum is 13, pair digit is '3'; for '07', sum is 7, pair digit is '7'). Count the frequency of each pair digit from 0 to 9. The result must be an array of 10 objects, sorted by pair digit.
5.  **Repeating Numbers**: Count how many times a repeating number (e.g., 00, 11, 22) has appeared.
6.  **Analysis Summary**: Write a concise, one-paragraph summary of the most important findings from your analysis (e.g., "The data shows a strong trend towards low, even numbers, with the digit 4 appearing most frequently. Pair digit 7 is currently dominant...").

Prediction:
Based on your complete analysis, provide the following detailed predictions:
1.  **Hot Numbers**: Suggest exactly three 2D numbers that have appeared frequently and are likely to appear again.
2.  **Cold Numbers**: Suggest exactly three 2D numbers that have not appeared in a long time and might be due for a draw.
3.  **Key Digit**: Predict a single digit that is most likely to appear in the next draw, based on frequency and trends.
4.  **Predicted Pair Digit**: Predict the most likely pair digit (ဘရိတ်) for the next draw.
5.  **Prediction Summary**: Provide a detailed, one-paragraph summary that explains your predictions. It should connect your analysis (trends, frequencies, pairs) to your chosen numbers and digits, forming a coherent forecast for the next draw.
`;

    const { output } = await ai.generate({
        prompt,
        output: { schema: AnalyzeSetPatternsOutputSchema }
    });
    
    return output!;
  }
);

'use server';
/**
 * @fileOverview Analyzes recent lottery number patterns using AI.
 *
 * - analyzeRecentNumberPatterns - A function that analyzes the lottery data for the last four weeks.
 * - AnalyzeRecentNumberPatternsInput - The input type for the analyzeRecentNumberPatterns function (currently empty).
 * - AnalyzeRecentNumberPatternsOutput - The return type for the analyzeRecentNumberPatterns function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { getHistoricalData } from '@/ai/flows/get-historical-data';

const AnalyzeRecentNumberPatternsInputSchema = z.object({
  sourceURL: z.string().optional().describe('An optional URL to a specific website for the AI to search for lottery results.'),
});
export type AnalyzeRecentNumberPatternsInput = z.infer<typeof AnalyzeRecentNumberPatternsInputSchema>;

const AnalyzeRecentNumberPatternsOutputSchema = z.object({
  analysis: z.string().describe('Analysis of lottery number patterns from the last four weeks.'),
  numberFrequency: z.array(z.object({
    number: z.string(),
    count: z.number(),
  })).describe('Frequency of each number in the last four weeks.'),
});
export type AnalyzeRecentNumberPatternsOutput = z.infer<typeof AnalyzeRecentNumberPatternsOutputSchema>;

export async function analyzeRecentNumberPatterns(
  input: AnalyzeRecentNumberPatternsInput
): Promise<AnalyzeRecentNumberPatternsOutput> {
  return analyzeRecentNumberPatternsFlow(input);
}

const analyzeRecentNumberPatternsPrompt = ai.definePrompt({
  name: 'analyzeRecentNumberPatternsPrompt',
  input: {schema: z.object({ lotteryData: z.string() })},
  output: {schema: z.object({ analysis: z.string().describe('Analysis of lottery number patterns from the last four weeks.') })},
  prompt: `Analyze the lottery data from the last four weeks to identify number patterns.

Provide insights into frequently drawn numbers and any other notable trends. Be concise.

Lottery Data:
{{{lotteryData}}}`,
});

const analyzeRecentNumberPatternsFlow = ai.defineFlow(
  {
    name: 'analyzeRecentNumberPatternsFlow',
    inputSchema: AnalyzeRecentNumberPatternsInputSchema,
    outputSchema: AnalyzeRecentNumberPatternsOutputSchema,
  },
  async input => {
    // Fetch the last four weeks (28 days) of lottery data.
    const historicalData = await getHistoricalData({ numDays: 28, sourceURL: input.sourceURL });
    const lotteryNumbers = historicalData.results.map(r => r.number) || [];
    
    // Calculate frequency
    const frequencyMap = lotteryNumbers.reduce((acc, num) => {
      acc[num] = (acc[num] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const numberFrequency = Object.entries(frequencyMap)
      .map(([number, count]) => ({ number, count }))
      .sort((a, b) => b.count - a.count);

    const {output} = await analyzeRecentNumberPatternsPrompt({
      lotteryData: JSON.stringify(historicalData.results),
    });

    return {
      analysis: output!.analysis,
      numberFrequency: numberFrequency,
    };
  }
);

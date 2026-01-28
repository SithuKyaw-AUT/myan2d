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

const AnalyzeRecentNumberPatternsInputSchema = z.object({});
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

Provide insights into frequently drawn numbers and any other notable trends.

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
    // Fetch the last four weeks of lottery data from the database.
    // Assume lottery data is an array of strings.
    const lotteryData = await getFourWeeksLotteryData();
    
    // Calculate frequency
    const frequencyMap = lotteryData.reduce((acc, num) => {
      acc[num] = (acc[num] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const numberFrequency = Object.entries(frequencyMap)
      .map(([number, count]) => ({ number, count }))
      .sort((a, b) => b.count - a.count);

    const {output} = await analyzeRecentNumberPatternsPrompt({
      lotteryData: JSON.stringify(lotteryData),
    });

    return {
      analysis: output!.analysis,
      numberFrequency: numberFrequency,
    };
  }
);

async function getFourWeeksLotteryData(): Promise<string[]> {
  // TODO: Implement database retrieval of lottery data from the last four weeks
  // Replace this with actual database retrieval logic using Firebase.
  return new Promise(resolve => {
    setTimeout(() => {
      resolve([
        '12', '34', '56', '78', '90', '23', '78',
        '13', '35', '57', '79', '91', '45', '78',
        '14', '36', '58', '80', '92', '23', '12',
        '15', '37', '59', '81', '93', '45', '78',
        '23', '99', '01', '33', '55', '88', '12',
      ]);
    }, 500);
  });
}

'use server';

/**
 * @fileOverview This file defines a Genkit flow to automatically update historical 2D lottery numbers daily.
 *
 * - updateHistoricalDataDaily - A function that initiates the process of searching for and saving the latest 2D lottery results.
 * - UpdateHistoricalDataDailyInput - The input type for the updateHistoricalDataDaily function (currently empty).
 * - UpdateHistoricalDataDailyOutput - The return type for the updateHistoricalDataDaily function, indicating success.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

// Define the input schema, now with an optional sourceURL
const UpdateHistoricalDataDailyInputSchema = z.object({
  sourceURL: z.string().optional().describe('An optional URL to a specific website for the AI to search for the lottery result.'),
});
export type UpdateHistoricalDataDailyInput = z.infer<typeof UpdateHistoricalDataDailyInputSchema>;

// Define the output schema
const UpdateHistoricalDataDailyOutputSchema = z.object({
  success: z.boolean().describe('Indicates whether the data update was successful.'),
  message: z.string().optional().describe('Optional message providing additional information about the update process.'),
  number: z.string().optional().describe('The fetched lottery number.'),
});
export type UpdateHistoricalDataDailyOutput = z.infer<typeof UpdateHistoricalDataDailyOutputSchema>;

// Exported function to initiate the data update process
export async function updateHistoricalDataDaily(input: UpdateHistoricalDataDailyInput): Promise<UpdateHistoricalDataDailyOutput> {
  return updateHistoricalDataDailyFlow(input);
}

// Define the Genkit prompt for searching lottery results
const searchLotteryResultsPrompt = ai.definePrompt({
  name: 'searchLotteryResultsPrompt',
  input: { schema: z.object({ currentDate: z.string(), sourceURL: z.string().optional() }) },
  output: {schema: z.object({number: z.string()})},
  prompt: `Search for the latest 2D lottery result for Myanmar for today's date: {{{currentDate}}}. The result should be the most recent one for today.
{{#if sourceURL}}
Please prioritize searching at this URL: {{{sourceURL}}}
{{/if}}
Provide the result in JSON format with a key called "number" that is a string containing only the two-digit number. If there are multiple results for today, return the latest one.`,
});

// Define the Genkit flow to update historical data daily
const updateHistoricalDataDailyFlow = ai.defineFlow(
  {
    name: 'updateHistoricalDataDailyFlow',
    inputSchema: UpdateHistoricalDataDailyInputSchema,
    outputSchema: UpdateHistoricalDataDailyOutputSchema,
  },
  async input => {
    try {
      const currentDate = new Date().toLocaleDateString();
      const lotteryResult = await searchLotteryResultsPrompt({
        currentDate,
        sourceURL: input.sourceURL,
      });
      
      const number = lotteryResult.output?.number;

      // TODO: Implement Firestore database saving logic here.
      // This placeholder demonstrates where you would save the lotteryResult.number to Firestore.
      console.log(`Lottery Number from AI: ${number}`);

      return {
        success: true,
        message: 'Successfully retrieved lottery data. Database saving not yet implemented.',
        number: number,
      };
    } catch (error: any) {
      console.error('Error updating historical data:', error);
      return {
        success: false,
        message: `Failed to update historical data: ${error.message}`,
      };
    }
  }
);

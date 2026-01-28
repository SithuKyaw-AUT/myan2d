'use server';
/**
 * @fileOverview Fetches historical lottery data using AI.
 */
import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const HistoricalDataInputSchema = z.object({
  numDays: z.number().describe('Number of past days to fetch data for.'),
  sourceURL: z.string().optional().describe('An optional URL to a specific website for the AI to search for lottery results.'),
});
export type HistoricalDataInput = z.infer<typeof HistoricalDataInputSchema>;

const HistoricalDataOutputSchema = z.object({
  results: z.array(z.object({
    date: z.string().describe("The date of the result in 'YYYY-MM-DD' or other clear format."),
    time: z.string().optional().describe("The time of the result, e.g., '12:01 PM'"),
    number: z.string().describe("The two-digit lottery number."),
  }))
});
export type HistoricalDataOutput = z.infer<typeof HistoricalDataOutputSchema>;


const getHistoricalDataFlow = ai.defineFlow(
  {
    name: 'getHistoricalDataFlow',
    inputSchema: HistoricalDataInputSchema,
    outputSchema: HistoricalDataOutputSchema,
  },
  async ({numDays, sourceURL}) => {
    const prompt = `Fetch the last ${numDays} days of Myanmar 2D lottery results. Today is ${new Date().toDateString()}.
{{#if sourceURL}}
Please prioritize searching at this URL: ${sourceURL}
{{/if}}
Return the results as a JSON object with a "results" key, containing an array. Each object in the array should have a "date" (e.g., 'Mon, Jul 29'), a "time" (e.g., '12:01 PM'), and a "number" (the two-digit string). There are usually two results per day (12:01 PM and 4:31 PM), please include all available results for each day, sorted from most recent to oldest.`;

    const { output } = await ai.generate({
      prompt,
      output: { schema: HistoricalDataOutputSchema },
    });
    return output!;
  }
);

export async function getHistoricalData(input: HistoricalDataInput): Promise<HistoricalDataOutput> {
  return getHistoricalDataFlow(input);
}

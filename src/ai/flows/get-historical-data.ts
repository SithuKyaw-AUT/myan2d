/**
 * @fileOverview Fetches historical data from the Thai Stock Exchange (SET).
 */
import {ai} from '@/ai/genkit';
import {z} from 'zod';

export const SetDataInputSchema = z.object({
  type: z.literal('historical').describe("The type of data to fetch: must be 'historical'"),
  days: z.number().optional().describe('For historical data, the number of past days to fetch.'),
});
export type SetDataInput = z.infer<typeof SetDataInputSchema>;

const HistoricalSetDataSchema = z.object({
  results: z.array(z.object({
    date: z.string().describe("The date of the result in 'YYYY-MM-DD' format."),
    time: z.string().describe("The time of the result, either '12:30' for market open or '16:30' for market close."),
    setIndex: z.string().describe("The SET index value at that time, e.g., '1,345.67'."),
    value: z.string().describe("The total trading value at that time in millions of Baht, e.g., '25,433.34'."),
  })).describe('An array of historical SET data, sorted from most recent to oldest.'),
});

export const SetDataOutputSchema = HistoricalSetDataSchema;
export type SetDataOutput = z.infer<typeof SetDataOutputSchema>;


const getSetDataFlow = ai.defineFlow(
  {
    name: 'getSetDataFlow',
    inputSchema: SetDataInputSchema,
    outputSchema: SetDataOutputSchema,
  },
  async ({days}) => {
    
    const prompt = `Go to https://www.set.or.th/en/market/index/overview. Fetch the historical closing SET index values and total trading values for the last ${days} days. For each day, there are two important times: the morning session close around 12:30 local time and the afternoon session close around 16:30 local time. Please provide the SET index and Value for both times for each day you can find. Today is ${new Date().toDateString()}. Return the results as a JSON object.`;
    const { output } = await ai.generate({
        prompt,
        output: { schema: HistoricalSetDataSchema },
    });
    return output!;
  }
);

export async function getSetData(input: SetDataInput): Promise<SetDataOutput> {
  return getSetDataFlow(input);
}

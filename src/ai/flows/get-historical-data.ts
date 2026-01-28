/**
 * @fileOverview Fetches live or historical data from the Thai Stock Exchange (SET).
 */
import {ai} from '@/ai/genkit';
import {z} from 'zod';

export const SetDataInputSchema = z.object({
  type: z.enum(['live', 'historical']).describe("The type of data to fetch: 'live' for the current index or 'historical' for past results."),
  days: z.number().optional().describe('For historical data, the number of past days to fetch.'),
});
export type SetDataInput = z.infer<typeof SetDataInputSchema>;

const LiveSetDataSchema = z.object({
  setIndex: z.string().describe("The current SET index value, e.g., '1,345.67'."),
  lastUpdated: z.string().describe("The timestamp of the last update, e.g., '16:30'."),
});

const HistoricalSetDataSchema = z.object({
  results: z.array(z.object({
    date: z.string().describe("The date of the result in 'YYYY-MM-DD' format."),
    time: z.string().describe("The time of the result, either '12:30' for market open or '16:30' for market close."),
    setIndex: z.string().describe("The SET index value at that time, e.g., '1,345.67'."),
  })).describe('An array of historical SET data, sorted from most recent to oldest.'),
});

export const SetDataOutputSchema = z.union([LiveSetDataSchema, HistoricalSetDataSchema]);
export type SetDataOutput = z.infer<typeof SetDataOutputSchema>;


const getSetDataFlow = ai.defineFlow(
  {
    name: 'getSetDataFlow',
    inputSchema: SetDataInputSchema,
    outputSchema: SetDataOutputSchema,
  },
  async ({type, days}) => {
    
    if (type === 'live') {
        const prompt = `Go to https://www.set.or.th/en/market/index/overview and find the current SET Index value and its update time. The value is usually a large number with two decimal places. For example, "1,345.67". The time is usually displayed next to it. Provide the most recent value available.`;
        const { output } = await ai.generate({
            prompt,
            output: { schema: LiveSetDataSchema },
        });
        return output!;
    } else {
        const prompt = `Go to https://www.set.or.th/en/market/index/overview. Fetch the historical closing SET index values for the last ${days} days. For each day, there are two important times: the morning session close around 12:30 local time and the afternoon session close around 16:30 local time. Please provide the SET index for both times for each day you can find. Today is ${new Date().toDateString()}. Return the results as a JSON object.`;
        const { output } = await ai.generate({
            prompt,
            output: { schema: HistoricalSetDataSchema },
        });
        return output!;
    }
  }
);

export async function getSetData(input: SetDataInput): Promise<SetDataOutput> {
  return getSetDataFlow(input);
}

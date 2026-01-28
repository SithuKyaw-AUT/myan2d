'use server';

import { getSetData } from '@/ai/flows/get-historical-data';
import { analyzeSetPatterns } from '@/ai/flows/analyze-recent-number-patterns';
import type { DailyResult } from './types';

function parseSetIndex(setIndex: string): number {
    return parseFloat(setIndex.replace(/,/g, ''));
}

function get2DFromSet(setIndex: string): string {
    const parsed = parseSetIndex(setIndex);
    return parsed.toFixed(2).slice(-2);
}

export async function getLiveSetData() {
  try {
    const result = await getSetData({ type: 'live' });
    if ('setIndex' in result) {
      return {
        success: true,
        data: {
            setIndex: result.setIndex,
            twoD: get2DFromSet(result.setIndex),
            lastUpdated: result.lastUpdated,
        },
      };
    }
    throw new Error("Invalid response for live data");
  } catch (error: any) {
    console.error('Failed to get live SET data:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch live SET data.',
    };
  }
}

export async function getDailyResults() {
  try {
    const result = await getSetData({ type: 'historical', days: 7 });
    if ('results' in result) {
        const groupedByDate: Record<string, DailyResult> = {};
        
        // The AI returns sorted from most recent, so we reverse to process chronologically
        const sortedResults = result.results.reverse();

        for (const res of sortedResults) {
            if (!groupedByDate[res.date]) {
                groupedByDate[res.date] = { date: res.date };
            }

            const data = {
                set: res.setIndex,
                twoD: get2DFromSet(res.setIndex),
            };

            // Simple check for morning/evening based on provided time
            if (res.time.includes('12')) {
                groupedByDate[res.date].morning = data;
            } else if (res.time.includes('16') || res.time.includes('4')) {
                groupedByDate[res.date].evening = data;
            }
        }

      return {
        success: true,
        data: Object.values(groupedByDate).reverse(), // show most recent day first
      };
    }
    throw new Error("Invalid response for historical data");
  } catch (error: any) {
    console.error('Failed to get daily results:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch daily results.',
      data: [],
    };
  }
}

export async function handleAnalysis() {
    try {
        const historicalDataResult = await getSetData({ type: 'historical', days: 28 });
        
        if ('results' in historicalDataResult) {
            const numbers = historicalDataResult.results.map(r => get2DFromSet(r.setIndex));
            if (numbers.length === 0) {
                return { success: false, error: "Not enough data for analysis." };
            }
            const analysisResult = await analyzeSetPatterns({ numbers });
            return {
                success: true,
                analysis: analysisResult.analysis,
                prediction: analysisResult.prediction,
            };
        }
        throw new Error("Could not fetch historical data for analysis.");

    } catch (error: any) {
        console.error('Analysis failed:', error);
        return {
            success: false,
            error: error.message || 'Failed to generate analysis. Please try again later.',
        };
    }
}

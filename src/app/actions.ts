'use server';

import { getSetData } from '@/ai/flows/get-historical-data';
import { analyzeSetPatterns } from '@/ai/flows/analyze-recent-number-patterns';
import type { DailyResult } from './types';

function get2DNumber(setIndex: string, setValue: string): string {
    // Sanitize inputs by removing commas
    const cleanSetIndex = setIndex.replace(/,/g, '');
    const cleanSetValue = setValue.replace(/,/g, '');

    // Last digit after dot from SET index
    const setDecimalPart = cleanSetIndex.split('.')[1];
    const firstDigit = setDecimalPart ? setDecimalPart.slice(-1) : '0';

    // Last digit before dot from Value
    const valueIntegerPart = cleanSetValue.split('.')[0];
    const secondDigit = valueIntegerPart ? valueIntegerPart.slice(-1) : '0';

    return `${firstDigit}${secondDigit}`;
}

export async function getLiveSetData() {
  try {
    const response = await fetch('https://api.thaistock2d.com/live', {
      cache: 'no-store',
    });
    if (!response.ok) {
        throw new Error(`Failed to fetch live data: ${response.statusText}`);
    }
    const result = await response.json();
    
    if (result.live) {
      const { set, value, time } = result.live;
      return {
        success: true,
        data: {
            setIndex: set,
            value: value,
            twoD: get2DNumber(set, value),
            lastUpdated: time,
        },
      };
    }
    throw new Error("Invalid response format from live data API");
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
                value: res.value,
                twoD: get2DNumber(res.setIndex, res.value),
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
            const numbers = historicalDataResult.results.map(r => get2DNumber(r.setIndex, r.value));
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

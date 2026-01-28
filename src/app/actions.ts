'use server';

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
    const response = await fetch('https://api.thaistock2d.com/history', {
      cache: 'no-store',
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch history data: ${response.statusText}`);
    }
    const results = await response.json();

    const formattedData: DailyResult[] = results.map((res: any) => ({
      date: new Date(res.date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' }),
      morning: res.morning
        ? {
            set: res.morning.set,
            value: res.morning.value,
            twoD: res.morning.number,
          }
        : undefined,
      evening: res.evening
        ? {
            set: res.evening.set,
            value: res.evening.value,
            twoD: res.evening.number,
          }
        : undefined,
    }));

    return {
      success: true,
      data: formattedData.slice(0, 7),
    };
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
        const response = await fetch('https://api.thaistock2d.com/history', {
            cache: 'no-store',
        });
        if (!response.ok) {
            throw new Error(`Failed to fetch history data for analysis: ${response.statusText}`);
        }
        const historicalDataResult = await response.json();

        const numbers: string[] = [];
        historicalDataResult.forEach((day: any) => {
            if (day.morning && day.morning.number) {
                numbers.push(day.morning.number);
            }
            if (day.evening && day.evening.number) {
                numbers.push(day.evening.number);
            }
        });
        
        if (numbers.length === 0) {
            return { success: false, error: "Not enough data for analysis." };
        }
        
        const analysisResult = await analyzeSetPatterns({ numbers });
        return {
            success: true,
            analysis: analysisResult.analysis,
            prediction: analysisResult.prediction,
        };

    } catch (error: any) {
        console.error('Analysis failed:', error);
        return {
            success: false,
            error: error.message || 'Failed to generate analysis. Please try again later.',
        };
    }
}

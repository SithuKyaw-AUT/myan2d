'use server';

import { analyzeSetPatterns } from '@/ai/flows/analyze-patterns';
import { historicalData } from '@/lib/historical-data';
import type { DailyResult } from './types';


function get2DNumber(setIndex: string, setValue: string): string {
    const cleanSetIndex = setIndex.replace(/,/g, '');
    const cleanSetValue = setValue.replace(/,/g, '');

    const setDecimalPart = cleanSetIndex.split('.')[1];
    const firstDigit = setDecimalPart ? setDecimalPart.slice(-1) : '0';

    const valueIntegerPart = cleanSetValue.split('.')[0];
    const secondDigit = valueIntegerPart ? valueIntegerPart.slice(-1) : '0';

    return `${firstDigit}${secondDigit}`;
}

export async function getLiveSetData() {
  try {
    const response = await fetch('https://api.thaistock2d.com/live', { cache: 'no-store' });
     if (!response.ok) {
        throw new Error(`Failed to fetch live data: ${response.statusText}`);
    }
    
    const responseText = await response.text();
    if (!responseText || responseText.trim() === '') {
        return { success: false, error: "Live data API returned an empty response." };
    }
    
    let result;
    try {
        result = JSON.parse(responseText);
    } catch (error) {
        console.error('Error parsing live data JSON:', error);
        return { success: false, error: "Live data API returned invalid JSON." };
    }
    
    if (result && result.live) {
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
     // Handle cases where the API returns a valid JSON but not in the expected format
    return { success: false, error: "Live data API response is not in the expected format."};
  } catch (error: any) {
    console.error('Failed to get live SET data:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch live SET data.',
    };
  }
}

export async function handleAnalysis() {
    try {
        const numbers: string[] = [];
        historicalData.forEach((day) => {
            if (day.s11_00?.twoD) numbers.push(day.s11_00.twoD);
            if (day.s12_01?.twoD) numbers.push(day.s12_01.twoD);
            if (day.s15_00?.twoD) numbers.push(day.s15_00.twoD);
            if (day.s16_30?.twoD) numbers.push(day.s16_30.twoD);
        });
        
        if (numbers.length === 0) {
            return { success: false, error: "Not enough data in local file for analysis." };
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

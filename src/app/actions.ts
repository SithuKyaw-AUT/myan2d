'use server';

import { analyzeSetPatterns } from '@/ai/flows/analyze-recent-number-patterns';

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
    
    const responseText = await response.text();
    let result;
    try {
        result = JSON.parse(responseText);
    } catch (error) {
        console.error('Error parsing live data JSON:', error);
        console.error('Received non-JSON response:', responseText);
        throw new Error("Invalid response from live data API");
    }
    
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

export async function handleAnalysis() {
    try {
        const response = await fetch('https://api.thaistock2d.com/history', {
            cache: 'no-store',
        });
        if (!response.ok) {
            throw new Error(`Failed to fetch history data for analysis: ${response.statusText}`);
        }
        
        const responseText = await response.text();
        let historicalDataResult;
        try {
            historicalDataResult = JSON.parse(responseText);
        } catch (error) {
            console.error('Error parsing history data JSON for analysis:', error);
            console.error('Received non-JSON response:', responseText);
            throw new Error("Invalid response from history data API for analysis");
        }

        const numbers: string[] = [];
        if (Array.isArray(historicalDataResult)) {
            historicalDataResult.forEach((day: any) => {
                if (day.morning && day.morning.number) {
                    numbers.push(day.morning.number);
                }
                if (day.evening && day.evening.number) {
                    numbers.push(day.evening.number);
                }
            });
        }
        
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

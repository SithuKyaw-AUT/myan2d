'use server';

import { analyzeSetPatterns } from '@/ai/flows/analyze-recent-number-patterns';
import type { DailyResult, Result } from './types';

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

// Helper function to format date to DD-MM-YYYY for the new API
function formatDateToDdMmYyyy(date: Date): string {
    const d = new Date(date);
    let day = '' + d.getDate();
    let month = '' + (d.getMonth() + 1);
    const year = d.getFullYear();

    if (day.length < 2) 
        day = '0' + day;
    if (month.length < 2) 
        month = '0' + month;

    return [day, month, year].join('-');
}


export async function getDailyResults() {
  try {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon...

    const datesToFetch: Date[] = [];
    const monday = new Date(today);
    // Go back to the most recent Monday
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    monday.setHours(0, 0, 0, 0); // Set to start of the day

    // Create an array of dates from Monday to today
    for (let i = 0; i < 7; i++) {
        const currentDate = new Date(monday);
        currentDate.setDate(monday.getDate() + i);
        if (currentDate > today) {
            break;
        }
        // Only fetch for weekdays
        if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
            datesToFetch.push(currentDate);
        }
    }
    
    if (datesToFetch.length === 0) {
        return { success: true, data: [] };
    }

    const dailyPromises = datesToFetch.map(async (date) => {
        const formattedDate = formatDateToDdMmYyyy(date);
        const response = await fetch(`https://api.thaistock2d.com/2d_result?date=${formattedDate}`, {
            cache: 'no-store',
        });
        
        if (!response.ok) {
            console.error(`Failed to fetch data for ${formattedDate}: ${response.statusText}`);
            return null; // Don't let one failed day stop the whole process
        }

        const apiResponse = await response.json();
        
        // The API returns a message like { "result": "Not Found" } or an array
        if (!apiResponse || apiResponse.result === "Not Found" || !Array.isArray(apiResponse.result)) {
            // Return a valid empty structure for this date
            return {
                date: date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' }),
            };
        }
        
        const dailyResult: DailyResult = {
            date: date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' }),
        };

        apiResponse.result.forEach((session: any) => {
             const sessionResult: Result = {
                set: session.set,
                value: session.value,
                twoD: session.number,
            };

            if (session.time === '12:01') {
                dailyResult.s12_01 = sessionResult;
            } else if (session.time === '16:30') {
                dailyResult.s16_30 = sessionResult;
            }
        });
        
        return dailyResult;
    });

    const results = (await Promise.all(dailyPromises)).filter(Boolean) as DailyResult[];
    
    // Sort results by date to ensure they are in order
    results.sort((a, b) => {
        const dateA = new Date(`2024/${a.date}`); // Use a consistent year for reliable sorting
        const dateB = new Date(`2024/${b.date}`);
        return dateA.getTime() - dateB.getTime();
    });

    return {
      success: true,
      data: results,
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

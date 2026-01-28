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
    today.setHours(0, 0, 0, 0);

    const datesToFetch: Date[] = [];
    const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon...

    // Find the most recent Monday
    const monday = new Date(today);
    const dayDiff = (dayOfWeek + 6) % 7; // 0 for Mon, 1 for Tue, ..., 6 for Sun
    monday.setDate(today.getDate() - dayDiff);


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
        try {
            const formattedDate = formatDateToDdMmYyyy(date);
            const response = await fetch(`https://api.thaistock2d.com/2d_result?date=${formattedDate}`, {
                cache: 'no-store',
            });
            
            if (!response.ok) {
                console.error(`Failed to fetch data for ${formattedDate}: ${response.statusText}`);
                return null; // Don't let one failed day stop the whole process
            }
            
            const responseText = await response.text();
            let apiResponse;
            try {
                apiResponse = JSON.parse(responseText);
            } catch (error) {
                console.error(`Error parsing JSON for ${formattedDate}:`, error);
                console.error('Received non-JSON response:', responseText);
                return {
                    date: date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' }),
                };
            }
            
            const dailyResult: DailyResult = {
                date: date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' }),
            };

            if (!apiResponse || apiResponse.result === "Not Found" || !Array.isArray(apiResponse.result)) {
                // Return a valid empty structure for this date so the row still shows
                return dailyResult;
            }
            
            const findResultForTime = (time: string): Result | undefined => {
                const session = apiResponse.result.find((s: any) => s.time === time);
                if (session) {
                    return {
                        set: session.set,
                        value: session.value,
                        twoD: session.number,
                    };
                }
                return undefined;
            }

            const s12_01_result = findResultForTime('12:01');
            const s16_30_result = findResultForTime('16:30');

            // There is no 11:00 result from the API, so it will be empty.
            dailyResult.s11_00 = undefined; 
            dailyResult.s12_01 = s12_01_result;
            // The 15:00 slot shows the most recent result before it, which is 12:01.
            dailyResult.s15_00 = s12_01_result;
            dailyResult.s16_30 = s16_30_result;
            
            return dailyResult;
        } catch (error) {
            console.error(`Error processing data for ${date.toDateString()}:`, error);
            // Return a valid empty structure for this date so the row still shows
             return {
                date: date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' }),
            };
        }
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

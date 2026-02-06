'use server';

import { analyzeSetPatterns } from '@/ai/flows/analyze-patterns';
import { getFirestore, collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
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

export async function populateFirestoreFromApi() {
    try {
        const { firestore } = initializeFirebase();

        // 1. Fetch all historical data from the API
        const response = await fetch('https://api.thaistock2d.com/history', { cache: 'no-store' });
        if (!response.ok) {
            return { success: false, error: `API request failed with status ${response.status}` };
        }
        
        let rawData;
        const responseText = await response.text();
        try {
            rawData = JSON.parse(responseText);
        } catch (e) {
            return { success: false, error: 'Failed to parse historical data. The API may be down.' };
        }

        if (!Array.isArray(rawData)) {
             return { success: false, error: 'Historical data is not in the expected format.' };
        }
        
        // 2. Process and batch write to Firestore
        const batch = writeBatch(firestore);
        const resultsCollection = collection(firestore, 'lotteryResults');

        rawData.forEach((day: any) => {
            const date = day.date.split('-').reverse().join('-'); // Convert DD-MM-YYYY to YYYY-MM-DD
            const docRef = doc(resultsCollection, date);

            const dailyData: DailyResult = {
                date: date,
                s12_01: day['12:01'] ? {
                    set: day['12:01'].set,
                    value: day['12:01'].value,
                    twoD: get2DNumber(day['12:01'].set, day['12:01'].value)
                } : null,
                s16_30: day['4:30'] ? { // API uses '4:30'
                    set: day['4:30'].set,
                    value: day['4:30'].value,
                    twoD: get2DNumber(day['4:30'].set, day['4:30'].value)
                } : null,
            };

            // Copy 12:01 result to 15:00 if it exists
            if (dailyData.s12_01) {
                dailyData.s15_00 = dailyData.s12_01;
            } else {
                 dailyData.s15_00 = null;
            }
            
            // 11:00 is always null from API history
            dailyData.s11_00 = null;

            batch.set(docRef, dailyData, { merge: true });
        });

        await batch.commit();

        return { success: true, message: `Successfully imported ${rawData.length} days of data.` };

    } catch (error: any) {
        console.error('Failed to populate Firestore:', error);
        return { success: false, error: error.message || 'An unexpected error occurred during import.' };
    }
}


export async function getLiveSetData() {
  try {
    const response = await fetch('https://api.thaistock2d.com/live', { cache: 'no-store' });
    if (!response.ok) {
        throw new Error(`Failed to fetch live data: ${response.statusText}`);
    }
    
    const responseText = await response.text();
    let result;
    try {
        result = JSON.parse(responseText);
    } catch (error) {
        console.error('Error parsing live data JSON:', error);
        return { success: false, error: "Invalid response from live data API" };
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
        const { firestore } = initializeFirebase();
        const resultsCol = collection(firestore, 'lotteryResults');
        const snapshot = await getDocs(resultsCol);
        
        const numbers: string[] = [];
        snapshot.docs.forEach((doc) => {
            const data = doc.data() as DailyResult;
            if (data.s12_01?.twoD) numbers.push(data.s12_01.twoD);
            if (data.s16_30?.twoD) numbers.push(data.s16_30.twoD);
        });
        
        if (numbers.length === 0) {
            return { success: false, error: "Not enough data in Firestore for analysis." };
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

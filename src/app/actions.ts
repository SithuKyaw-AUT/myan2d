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
        const batch = writeBatch(firestore);
        const resultsCollection = collection(firestore, 'lotteryResults');
        const today = new Date();
        let successfulImports = 0;

        // Fetch for the last 90 days
        for (let i = 0; i < 90; i++) {
            const date = new Date();
            date.setDate(today.getDate() - i);

            // Skip weekends (Saturday=6, Sunday=0)
            const dayOfWeek = date.getDay();
            if (dayOfWeek === 0 || dayOfWeek === 6) {
                continue;
            }

            const formattedApiDate = [
                ('0' + date.getDate()).slice(-2),
                ('0' + (date.getMonth() + 1)).slice(-2),
                date.getFullYear(),
            ].join('-');

            const formattedDocId = [
                date.getFullYear(),
                ('0' + (date.getMonth() + 1)).slice(-2),
                ('0' + date.getDate()).slice(-2),
            ].join('-');

            try {
                const response = await fetch(`https://api.thaistock2d.com/2d_result?date=${formattedApiDate}`, { cache: 'no-store' });
                if (!response.ok) {
                    console.warn(`API request failed for date ${formattedApiDate} with status ${response.status}`);
                    continue;
                }

                const text = await response.text();

                // Skip if the response is empty, whitespace, or just an empty JSON array "[]"
                if (!text || text.trim() === '' || text.trim() === '[]') {
                    continue;
                }

                const day = JSON.parse(text);
                
                if (!day || !day.date) {
                    continue;
                }

                const docRef = doc(resultsCollection, formattedDocId);
                const dailyData: DailyResult = {
                    date: formattedDocId,
                    s11_00: null,
                    s12_01: null,
                    s15_00: null,
                    s16_30: null,
                };
                
                let hasData = false;

                if (day['12:01']) {
                    hasData = true;
                    dailyData.s12_01 = {
                        set: day['12:01'].set,
                        value: day['12:01'].value,
                        twoD: get2DNumber(day['12:01'].set, day['12:01'].value)
                    };
                    dailyData.s15_00 = dailyData.s12_01; // Copy to 3:00 PM
                }
                
                if (day['16:30']) {
                    hasData = true;
                    dailyData.s16_30 = {
                        set: day['16:30'].set,
                        value: day['16:30'].value,
                        twoD: get2DNumber(day['16:30'].set, day['16:30'].value)
                    };
                }

                if (hasData) {
                    batch.set(docRef, dailyData, { merge: true });
                    successfulImports++;
                }
            } catch (error) {
                 console.error(`An unexpected error occurred during fetch for date ${formattedApiDate}:`, error);
                 // Continue to the next date
            }
        }

        if (successfulImports > 0) {
            await batch.commit();
        }

        return { success: true, message: `Successfully imported ${successfulImports} days of data.` };

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

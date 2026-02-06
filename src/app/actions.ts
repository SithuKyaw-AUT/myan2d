'use server';

import { analyzeSetPatterns } from '@/ai/flows/analyze-patterns';
import { getFirestore, collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import type { DailyResult, Result } from './types';


function get2DNumber(setIndex: string, setValue: string): string {
    const cleanSetIndex = setIndex.replace(/,/g, '');
    const cleanSetValue = setValue.replace(/,/g, '');

    const setDecimalPart = cleanSetIndex.split('.')[1];
    const firstDigit = setDecimalPart ? setDecimalPart.slice(-1) : '0';

    const valueIntegerPart = cleanSetValue.split('.')[0];
    const secondDigit = valueIntegerPart ? valueIntegerPart.slice(-1) : '0';

    return `${firstDigit}${secondDigit}`;
}

export async function populateFirestoreFromData(jsonData: string) {
    try {
        const { firestore } = initializeFirebase();
        const batch = writeBatch(firestore);
        const resultsCollection = collection(firestore, 'lotteryResults');

        const data: { date: string; child: { time: string; set: string; value: string; twod: string }[] }[] = JSON.parse(jsonData);

        let successfulImports = 0;

        for (const day of data) {
            const docId = day.date;
            const docRef = doc(resultsCollection, docId);

            const dailyData: DailyResult = {
                date: docId,
                s11_00: null,
                s12_01: null,
                s15_00: null,
                s16_30: null,
            };

            let hasData = false;
            for (const result of day.child) {
                const resultObj: Result = {
                    set: result.set,
                    value: result.value,
                    twoD: result.twod,
                };
                hasData = true;
                switch (result.time) {
                    case '11:00:00':
                        dailyData.s11_00 = resultObj;
                        break;
                    case '12:01:00':
                        dailyData.s12_01 = resultObj;
                        break;
                    case '15:00:00':
                        dailyData.s15_00 = resultObj;
                        break;
                    case '16:30:00':
                        dailyData.s16_30 = resultObj;
                        break;
                }
            }

            if (hasData) {
                batch.set(docRef, dailyData);
                successfulImports++;
            }
        }

        if (successfulImports > 0) {
            await batch.commit();
        }

        return { success: true, message: `Successfully imported ${successfulImports} days of data.` };

    } catch (error: any) {
        console.error('Failed to populate Firestore from data:', error);
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

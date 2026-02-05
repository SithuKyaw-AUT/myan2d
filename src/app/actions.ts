'use server';

import { analyzeSetPatterns, type AnalyzeSetPatternsInput } from '@/ai/flows/analyze-patterns';
import { getFirestore, collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { formatDateToYyyyMmDd } from '@/lib/firebase/utils';
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

export async function populateFirestoreFromApi() {
    try {
        const { firestore } = initializeFirebase();
        const response = await fetch('https://api.thaistock2d.com/history', { cache: 'no-store' });
        if (!response.ok) throw new Error(`API request failed: ${response.statusText}`);
        
        const responseText = await response.text();
        let history;
        try {
            history = JSON.parse(responseText);
        } catch (error) {
            console.error('Error parsing history data JSON:', error);
            throw new Error("Invalid response from history data API");
        }

        if (!Array.isArray(history)) throw new Error('Invalid data format from history API.');

        const batch = writeBatch(firestore);
        let count = 0;

        history.forEach((day: any) => {
          if (day.date && (day.morning || day.evening)) {
            const date = new Date(day.date);
            const docId = formatDateToYyyyMmDd(date);
            const docRef = doc(firestore, 'lotteryResults', docId);

            const dailyData: Partial<DailyResult> = { date: docId };

            if (day.morning && day.morning.number) {
              const morningResult = { set: day.morning.set, value: day.morning.value, twoD: day.morning.number };
              dailyData.s12_01 = morningResult;
              dailyData.s15_00 = morningResult; 
            }
            if (day.evening && day.evening.number) {
              dailyData.s16_30 = { set: day.evening.set, value: day.evening.value, twoD: day.evening.number };
            }
            
            batch.set(docRef, dailyData, { merge: true });
            count++;
          }
        });

        if (count > 0) {
          await batch.commit();
          return { success: true, message: `${count} days of historical data have been saved.` };
        } else {
          return { success: false, error: 'No historical data found to import.' };
        }
      } catch (error: any) {
        console.error("Firestore population error:", error);
        return { success: false, error: error.message || 'An unknown error occurred during import.' };
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

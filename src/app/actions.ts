// @ts-nocheck
'use server';

import { analyzeRecentNumberPatterns } from '@/ai/flows/analyze-recent-number-patterns';
import { updateHistoricalDataDaily } from '@/ai/flows/update-historical-data-daily';
import { getHistoricalData } from '@/ai/flows/get-historical-data';
import { startOfWeek, differenceInCalendarDays } from 'date-fns';

export async function handleAnalysis() {
  try {
    const result = await analyzeRecentNumberPatterns({});
    return {
      success: true,
      analysis: result.analysis,
      numberFrequency: result.numberFrequency,
    };
  } catch (error) {
    console.error('Analysis failed:', error);
    return {
      success: false,
      error: 'Failed to generate analysis. Please try again later.',
    };
  }
}

export async function handleUpdate() {
  try {
    const result = await updateHistoricalDataDaily({});
    if (result.success) {
      return {
        success: true,
        message:
          result.message || 'Data update process initiated successfully.',
        number: result.number,
      };
    } else {
      return {
        success: false,
        error: result.message || 'Failed to initiate data update.',
      };
    }
  } catch (error) {
    console.error('Update failed:', error);
    return {
      success: false,
      error: 'Failed to initiate data update. Please try again later.',
    };
  }
}

export async function getWeeklyHistory() {
  try {
    const now = new Date();
    const startOfThisWeek = startOfWeek(now, { weekStartsOn: 1 }); // Monday
    const numDays = differenceInCalendarDays(now, startOfThisWeek) + 1;

    const result = await getHistoricalData({ numDays });
    return {
      success: true,
      data: result.results.map(r => ({...r, id: `${r.date}-${r.time}`})),
    };
  } catch (error) {
    console.error('Failed to get weekly history:', error);
    return {
      success: false,
      error: 'Failed to fetch weekly history.',
      data: [],
    };
  }
}

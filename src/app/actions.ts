// @ts-nocheck
'use server';

import { analyzeRecentNumberPatterns } from '@/ai/flows/analyze-recent-number-patterns';
import { updateHistoricalDataDaily } from '@/ai/flows/update-historical-data-daily';

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

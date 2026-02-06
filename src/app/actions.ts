'use server';

import { analyzeSetPatterns, AnalyzePatternsInput } from '@/ai/flows/analyze-patterns';
import { promises as fs } from 'fs';
import path from 'path';
import { createHash } from 'crypto';

const CACHE_PATH = path.join(process.cwd(), 'src', 'lib', 'analysis-cache.json');

type AnalysisCache = {
    dataHash: string;
    analysisResult: any;
};

async function getAnalysisCache(): Promise<AnalysisCache | null> {
    try {
        await fs.access(CACHE_PATH);
        const fileContent = await fs.readFile(CACHE_PATH, 'utf-8');
        if (fileContent.trim() === '') return null;
        return JSON.parse(fileContent);
    } catch (error) {
        return null;
    }
}

async function setAnalysisCache(data: AnalysisCache) {
    try {
        await fs.writeFile(CACHE_PATH, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
        console.error('Failed to write analysis cache:', error);
    }
}

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

export async function handleAnalysis(input: AnalyzePatternsInput) {
    try {
        if (input.historicalNumbers.length === 0 || input.evaluationNumbers.length === 0) {
            return { success: false, error: "Not enough data for analysis." };
        }
        
        const dataString = JSON.stringify(input);
        const currentDataHash = createHash('sha256').update(dataString).digest('hex');

        const cache = await getAnalysisCache();
        if (cache && cache.dataHash === currentDataHash && cache.analysisResult) {
            return {
                success: true,
                result: cache.analysisResult,
                fromCache: true,
            };
        }
        
        const analysisResult = await analyzeSetPatterns(input);
        
        await setAnalysisCache({
            dataHash: currentDataHash,
            analysisResult: analysisResult,
        });

        return {
            success: true,
            result: analysisResult,
            fromCache: false,
        };

    } catch (error: any) {
        console.error('Analysis failed:', error);
        return {
            success: false,
            error: error.message || 'Failed to generate analysis. Please try again later.',
        };
    }
}

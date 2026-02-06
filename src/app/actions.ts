'use server';

import { promises as fs } from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import { z } from 'zod';

// --- TYPE DEFINITIONS (MOVED FROM AI FLOW) ---

const LiveDataSchema = z.object({
  setIndex: z.string().describe("The live SET index, e.g., '1,346.23'"),
  value: z.string().describe("The live SET value, e.g., '57,388.58'"),
  twoD: z.string().length(2).describe("The live 2D number, e.g., '38'"),
  lastUpdated: z.string(),
});

export const AnalyzePatternsInputSchema = z.object({
  liveData: LiveDataSchema.describe("The most recent live data including the SET index and the resulting 2D number."),
  historicalNumbers: z.array(z.string().length(2)).describe('An array of 2D numbers from the last 30+ days for filtering.'),
  evaluationNumbers: z.array(z.string().length(2)).describe('An array of all 2D numbers from the last 90+ days for statistical evaluation.'),
});
export type AnalyzePatternsInput = z.infer<typeof AnalyzePatternsInputSchema>;

const CandidateNumbersSchema = z.object({
    powerDigits: z.array(z.string().length(2)),
    brotherPairs: z.array(z.string().length(2)),
    oneChange: z.array(z.string().length(2)),
    doubles: z.array(z.string().length(2)),
});

const HitRateSchema = z.object({
    number: z.string().length(2),
    count: z.number(),
    hitRate: z.number(),
});

const CategoryHitRateSchema = z.object({
    powerDigitHitRate: z.number(),
    brotherPairHitRate: z.number(),
    oneChangeHitRate: z.number(),
    doubleNumberHitRate: z.number(),
});

export const AnalyzePatternsOutputSchema = z.object({
  stage1_filtering: z.object({
    candidates: CandidateNumbersSchema,
    finalCandidates: z.array(z.string().length(2)),
    summary: z.string(),
  }),
  stage2_evaluation: z.object({
      individualHitRates: z.array(HitRateSchema),
      categoryHitRates: CategoryHitRateSchema,
      summary: z.string(),
  }),
  prediction: z.string(),
});
export type AnalyzePatternsOutput = z.infer<typeof AnalyzePatternsOutputSchema>;


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


function performLocalAnalysis(input: AnalyzePatternsInput): AnalyzePatternsOutput {
    const { liveData, historicalNumbers, evaluationNumbers } = input;
    const previousResult = historicalNumbers[0];
    const last5Results = historicalNumbers.slice(0, 5);
    const last2Results = historicalNumbers.slice(0, 2);
    const totalSessions = evaluationNumbers.length;

    // --- STAGE 1: FILTERING ---
    const candidates = {
        powerDigits: new Set<string>(),
        brotherPairs: new Set<string>(),
        oneChange: new Set<string>(),
        doubles: new Set<string>(),
    };

    // 1. Power Digits
    const setLastDigit = liveData.setIndex.slice(-1);
    const prevDigit1 = previousResult[0];
    const prevDigit2 = previousResult[1];
    const powerDigits = [...new Set([setLastDigit, prevDigit1, prevDigit2])];
    for (const p of powerDigits) {
        for (let i = 0; i < 10; i++) {
            candidates.powerDigits.add(`${p}${i}`);
            candidates.powerDigits.add(`${i}${p}`);
        }
    }

    // 2. Brother (Mirror)
    const mirrorMap: { [key: string]: string } = { '0':'5', '5':'0', '1':'6', '6':'1', '2':'7', '7':'2', '3':'8', '8':'3', '4':'9', '9':'4' };
    const mirroredDigit1 = mirrorMap[prevDigit1];
    const mirroredDigit2 = mirrorMap[prevDigit2];
    candidates.brotherPairs.add(`${mirroredDigit1}${mirroredDigit2}`);
    candidates.brotherPairs.add(`${prevDigit1}${mirroredDigit2}`);
    candidates.brotherPairs.add(`${mirroredDigit1}${prevDigit2}`);

    // 3. One-Change
    for (let i = 0; i < 10; i++) {
        if (String(i) !== prevDigit2) candidates.oneChange.add(`${prevDigit1}${i}`);
        if (String(i) !== prevDigit1) candidates.oneChange.add(`${i}${prevDigit2}`);
    }

    // 4. Double Numbers
    const hasDoubleInLast5 = last5Results.some(n => n[0] === n[1]);
    if (!hasDoubleInLast5) {
        for (let i = 0; i < 10; i++) {
            candidates.doubles.add(`${i}${i}`);
        }
    }

    // 5. Exclusion (Nat Khat)
    const allCandidates = new Set([
        ...candidates.powerDigits,
        ...candidates.brotherPairs,
        ...candidates.oneChange,
        ...candidates.doubles,
    ]);

    for (const num of last2Results) {
        allCandidates.delete(num);
    }
    const finalCandidates = Array.from(allCandidates).sort();
    
    const stage1_filtering = {
        candidates: {
            powerDigits: Array.from(candidates.powerDigits).sort(),
            brotherPairs: Array.from(candidates.brotherPairs).sort(),
            oneChange: Array.from(candidates.oneChange).sort(),
            doubles: Array.from(candidates.doubles).sort(),
        },
        finalCandidates,
        summary: `Generated candidate numbers using Power, Brother, One-Change, and Double rules. After excluding the last 2 results, ${finalCandidates.length} final candidates remain.`
    };

    // --- STAGE 2: EVALUATION ---
    const evalCounts = evaluationNumbers.reduce((acc, num) => {
        acc[num] = (acc[num] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const individualHitRates = finalCandidates.map(num => {
        const count = evalCounts[num] || 0;
        return {
            number: num,
            count: count,
            hitRate: totalSessions > 0 ? (count / totalSessions) * 100 : 0,
        };
    });

    const calculateCategoryHitRate = (candidateSet: Set<string>): number => {
        if (totalSessions === 0) return 0;
        const hitSessions = evaluationNumbers.filter(num => candidateSet.has(num));
        return (hitSessions.length / totalSessions) * 100;
    }
    
    const categoryHitRates = {
        powerDigitHitRate: calculateCategoryHitRate(candidates.powerDigits),
        brotherPairHitRate: calculateCategoryHitRate(candidates.brotherPairs),
        oneChangeHitRate: calculateCategoryHitRate(candidates.oneChange),
        doubleNumberHitRate: calculateCategoryHitRate(candidates.doubles),
    };
    
    const stage2_evaluation = {
        individualHitRates: individualHitRates.sort((a,b) => b.hitRate - a.hitRate),
        categoryHitRates,
        summary: "Calculated historical hit rates for each final candidate and for each rule category based on the last 90+ days of data."
    };

    // --- FINAL PREDICTION ---
    const topCandidate = individualHitRates[0];
    const prediction = topCandidate 
        ? `Based on rule-based filtering and statistical analysis, the candidate with the highest historical hit rate is "${topCandidate.number}" (${topCandidate.hitRate.toFixed(2)}%). This synthesis suggests focusing on numbers that are both generated by the rules and have strong past performance.`
        : "No final candidates were generated after filtering, so no prediction can be made.";


    return {
        stage1_filtering,
        stage2_evaluation,
        prediction,
    };
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
        
        const analysisResult = performLocalAnalysis(input);
        
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

'use server';

import type { AnalyzePatternsInput, AnalyzePatternsOutput, CandidateStats } from './analysis-types';

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
    const last28Results = historicalNumbers.slice(0, 28); // Approx 1 week for momentum
    const totalSessions = evaluationNumbers.length;

    // --- STAGE 1: FILTERING & RULE OVERLAP TRACKING ---
    const candidatesOrigins: Record<string, Set<string>> = {};

    const addCandidate = (num: string, rule: string) => {
        if (!candidatesOrigins[num]) {
            candidatesOrigins[num] = new Set();
        }
        candidatesOrigins[num].add(rule);
    };

    // 1. Power Digits
    const setLastDigit = liveData.setIndex.slice(-1);
    const prevDigit1 = previousResult[0];
    const prevDigit2 = previousResult[1];
    // Heuristic: prioritize SET digit and first digit of previous result
    const powerDigits = [...new Set([setLastDigit, prevDigit1, prevDigit2])].slice(0, 2); 
    for (const p of powerDigits) {
        for (let i = 0; i < 10; i++) {
            addCandidate(`${p}${i}`, 'Power');
            addCandidate(`${i}${p}`, 'Power');
        }
    }

    // 2. Brother (Mirror)
    const mirrorMap: { [key: string]: string } = { '0':'5', '5':'0', '1':'6', '6':'1', '2':'7', '7':'2', '3':'8', '8':'3', '4':'9', '9':'4' };
    const mirroredDigit1 = mirrorMap[prevDigit1];
    const mirroredDigit2 = mirrorMap[prevDigit2];
    addCandidate(`${mirroredDigit1}${mirroredDigit2}`, 'Brother');
    addCandidate(`${prevDigit1}${mirroredDigit2}`, 'Brother');
    addCandidate(`${mirroredDigit1}${prevDigit2}`, 'Brother');

    // 3. One-Change
    for (let i = 0; i < 10; i++) {
        if (String(i) !== prevDigit2) addCandidate(`${prevDigit1}${i}`, '1-Change');
        if (String(i) !== prevDigit1) addCandidate(`${i}${prevDigit2}`, '1-Change');
    }

    // 4. Double Numbers
    const hasDoubleInLast5 = last5Results.some(n => n[0] === n[1]);
    if (!hasDoubleInLast5) {
        for (let i = 0; i < 10; i++) {
            addCandidate(`${i}${i}`, 'Double');
        }
    }

    // 5. Exclusion (Nat Khat)
    for (const num of last2Results) {
        delete candidatesOrigins[num];
    }
    const finalCandidateNumbers = Object.keys(candidatesOrigins).sort();
    
    // --- STAGE 2: EVALUATION ---
    const evalCounts = evaluationNumbers.reduce((acc, num) => {
        acc[num] = (acc[num] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    // Helper to get all candidates for a category for hit rate calculation
    const getCategoryCandidates = (rule: string) => {
        const nums = new Set<string>();
        if (rule === 'Power') {
             for (const p of powerDigits) {
                for (let i = 0; i < 10; i++) {
                    nums.add(`${p}${i}`);
                    nums.add(`${i}${p}`);
                }
            }
        } else if (rule === 'Brother') {
            nums.add(`${mirroredDigit1}${mirroredDigit2}`);
            nums.add(`${prevDigit1}${mirroredDigit2}`);
            nums.add(`${mirroredDigit1}${prevDigit2}`);
        } else if (rule === '1-Change') {
            for (let i = 0; i < 10; i++) {
                if (String(i) !== prevDigit2) nums.add(`${prevDigit1}${i}`);
                if (String(i) !== prevDigit1) nums.add(`${i}${prevDigit2}`);
            }
        } else if (rule === 'Double') {
            if (!hasDoubleInLast5) {
                for (let i = 0; i < 10; i++) {
                    nums.add(`${i}${i}`);
                }
            }
        }
        return nums;
    }
    
    // Count how many sessions had a winning number from this category
    const calculateCategoryHitRate = (candidateSet: Set<string>): number => {
        if (totalSessions === 0) return 0;
        const totalHits = evaluationNumbers.filter(num => candidateSet.has(num)).length;
        return (totalHits / totalSessions) * 100;
    }
    
    const categoryHitRates = {
        powerDigitHitRate: calculateCategoryHitRate(getCategoryCandidates('Power')),
        brotherPairHitRate: calculateCategoryHitRate(getCategoryCandidates('Brother')),
        oneChangeHitRate: calculateCategoryHitRate(getCategoryCandidates('1-Change')),
        doubleNumberHitRate: calculateCategoryHitRate(getCategoryCandidates('Double')),
    };

    // Top Candidate Stats Calculation
    const topCandidates: CandidateStats[] = finalCandidateNumbers.map(num => {
        const count = evalCounts[num] || 0;
        const hitRate = totalSessions > 0 ? (count / totalSessions) * 100 : 0;
        const overlapCount = candidatesOrigins[num]?.size || 0;
        
        let momentum = "Low";
        if (last28Results.includes(num)) momentum = "Rising";
        else if (historicalNumbers.includes(num)) momentum = "Stable";
        
        let confidence = (hitRate * 15) + (overlapCount * 20);
        if (momentum === "Rising") confidence += 15;
        if (momentum === "Stable") confidence += 5;
        confidence = Math.min(Math.round(confidence), 99);

        return {
            number: num,
            count: count,
            hitRate: hitRate,
            ruleOverlap: Array.from(candidatesOrigins[num]).join(' + '),
            momentum: momentum,
            confidence: confidence,
        };
    }).sort((a, b) => b.confidence - a.confidence).slice(0, 10);

    const finalSelection = {
        main: topCandidates.slice(0, 3).map(c => c.number),
        strongSupport: topCandidates.slice(3, 6).map(c => c.number),
        watchRotation: topCandidates.slice(6, 10).map(c => c.number),
    };
    
    const executiveSummary = `Current analysis generated ${finalCandidateNumbers.length} candidate numbers through rule-based filtering. After statistical evaluation and confidence scoring, ${topCandidates.length} numbers remain in the high-interest zone. Power digit influence appears ${categoryHitRates.powerDigitHitRate > 30 ? 'dominant' : 'moderate'} in recent sessions, while Brother and Double patterns show ${categoryHitRates.brotherPairHitRate + categoryHitRates.doubleNumberHitRate < 10 ? 'weak' : 'some'} consistency. Focus on numbers with multiple rule overlaps and stable historical frequency.`;

    const marketContext = {
        previousResult: previousResult,
        setOpenIndex: liveData.setIndex,
        powerDigits: powerDigits,
    };

    return {
        marketContext,
        executiveSummary,
        categoryHitRates,
        topCandidates,
        finalSelection
    };
}


export async function handleAnalysis(input: AnalyzePatternsInput) {
    try {
        if (input.historicalNumbers.length === 0 || input.evaluationNumbers.length === 0) {
            return { success: false, error: "Not enough data for analysis." };
        }
        
        const analysisResult = performLocalAnalysis(input);

        return {
            success: true,
            result: analysisResult,
        };

    } catch (error: any) {
        console.error('Analysis failed:', error);
        return {
            success: false,
            error: error.message || 'Failed to generate analysis. Please try again later.',
        };
    }
}

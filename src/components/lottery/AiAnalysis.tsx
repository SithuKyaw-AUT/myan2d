'use client';

import { useState, useTransition, useCallback, useEffect } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  XAxis,
  YAxis,
} from 'recharts';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  BrainCircuit,
  Download,
  Loader2,
  FileText,
  PieChart,
  Star,
  ShieldAlert,
  ArrowLeftRight,
  Zap,
  Hash,
  TrendingUp,
  BarChart2,
} from 'lucide-react';
import { getLiveSetData, handleAnalysis } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '../ui/skeleton';
import { useFirestore } from '@/firebase';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { DailyResult } from '@/app/types';
import { errorEmitter } from '@/firebase/error-emitter';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Badge } from '@/components/ui/badge';
import type { AnalyzePatternsOutput, AnalyzePatternsInput } from '@/app/analysis-types';

const CACHE_KEY = 'mm2d_analysis_cache';
const ANALYSIS_TIMES = ['11:00', '12:01', '15:00', '16:30'];

function isCacheStale(cacheTimestamp: string | null): boolean {
    if (!cacheTimestamp) return true;

    try {
        const lastAnalysisDate = new Date(cacheTimestamp);
        const nowInMMT = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Yangon' }));
        const lastAnalysisInMMT = new Date(lastAnalysisDate.toLocaleString('en-US', { timeZone: 'Asia/Yangon' }));

        if (lastAnalysisInMMT.getDate() !== nowInMMT.getDate() ||
            lastAnalysisInMMT.getMonth() !== nowInMMT.getMonth() ||
            lastAnalysisInMMT.getFullYear() !== nowInMMT.getFullYear()) {
            return true;
        }

        for (const timeStr of ANALYSIS_TIMES) {
            const [hour, minute] = timeStr.split(':').map(Number);
            const triggerTime = new Date(nowInMMT);
            triggerTime.setHours(hour, minute, 0, 0);

            if (lastAnalysisInMMT < triggerTime && nowInMMT >= triggerTime) {
                return true;
            }
        }
        return false;
    } catch (error) {
        console.error("Error checking cache staleness:", error);
        return true;
    }
}


export default function AiAnalysis() {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const [analysisResult, setAnalysisResult] = useState<AnalyzePatternsOutput | null>(
    null
  );
  const [language, setLanguage] = useState<'en' | 'my'>('en');
  const firestore = useFirestore();

  const onAnalyze = useCallback(() => {
    startTransition(async () => {
      try {
        const cachedData = localStorage.getItem(CACHE_KEY);
        if (cachedData) {
          const { result, timestamp } = JSON.parse(cachedData);
          if (!isCacheStale(timestamp)) {
            setAnalysisResult(result);
            toast({
              title: "Analysis Loaded from Cache",
              description: `This analysis from ${new Date(timestamp).toLocaleTimeString()} is still fresh.`,
            });
            return;
          }
        }
      } catch (error) {
        console.error("Failed to read cache:", error);
      }

      if (!firestore) {
        toast({
          variant: 'destructive',
          title: 'Analysis Failed',
          description: 'Firestore is not available.',
        });
        return;
      }
      
      const liveDataResult = await getLiveSetData();
      if (!liveDataResult.success || !liveDataResult.data) {
        toast({
            variant: 'destructive',
            title: 'Analysis Failed',
            description: 'Could not fetch live data to begin analysis.',
        });
        return;
      }
      
      const filterQuery = query(collection(firestore, 'lottery_results'), orderBy('date', 'desc'), limit(30));
      const filterSnapshot = await getDocs(filterQuery);
      
      const historicalNumbers: string[] = [];
      filterSnapshot.forEach((doc) => {
        const day = doc.data() as DailyResult;
        if (day.s16_30?.twoD) historicalNumbers.push(day.s16_30.twoD);
        if (day.s15_00?.twoD) historicalNumbers.push(day.s15_00.twoD);
        if (day.s12_01?.twoD) historicalNumbers.push(day.s12_01.twoD);
        if (day.s11_00?.twoD) historicalNumbers.push(day.s11_00.twoD);
      });
      
      const evalQuery = query(collection(firestore, 'lottery_results'), orderBy('date', 'desc'), limit(90));
      const evalSnapshot = await getDocs(evalQuery);

      const evaluationNumbers: string[] = [];
      evalSnapshot.forEach((doc) => {
        const day = doc.data() as DailyResult;
        if (day.s16_30?.twoD) evaluationNumbers.push(day.s16_30.twoD);
        if (day.s15_00?.twoD) evaluationNumbers.push(day.s15_00.twoD);
        if (day.s12_01?.twoD) evaluationNumbers.push(day.s12_01.twoD);
        if (day.s11_00?.twoD) evaluationNumbers.push(day.s11_00.twoD);
      });


      if (historicalNumbers.length === 0 || evaluationNumbers.length === 0) {
        toast({
          variant: 'destructive',
          title: 'Analysis Failed',
          description: 'No historical data found in Firestore to analyze.',
        });
        return;
      }
      
      const analysisInput: AnalyzePatternsInput = {
          liveData: liveDataResult.data,
          historicalNumbers,
          evaluationNumbers,
      };

      const result = await handleAnalysis(analysisInput);

      if (result.success && result.result) {
        const newResult = result.result as AnalyzePatternsOutput;
        setAnalysisResult(newResult);
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({
            result: newResult,
            timestamp: new Date().toISOString()
          }));
        } catch (error) {
            console.error("Failed to save analysis to cache:", error);
            toast({
                variant: 'destructive',
                title: "Cache Warning",
                description: "Could not save result to local cache."
            });
        }
      } else {
        toast({
          variant: 'destructive',
          title: analysisResult ? 'Analysis Update Failed' : 'Analysis Failed',
          description:
            result.error || 'An unexpected error occurred.',
        });
      }
    });
  }, [firestore, toast, analysisResult]);

  useEffect(() => {
    try {
      const cachedData = localStorage.getItem(CACHE_KEY);
      if (cachedData) {
        const { result, timestamp } = JSON.parse(cachedData);
        if (!isCacheStale(timestamp)) {
          setAnalysisResult(result);
        } else {
          localStorage.removeItem(CACHE_KEY);
        }
      }
    } catch (error) {
      console.error("Failed to load cached analysis:", error);
      localStorage.removeItem(CACHE_KEY);
    }
  }, []);

  useEffect(() => {
    const handleNewResult = () => {
        onAnalyze();
    };

    errorEmitter.on('new-result-saved', handleNewResult);

    return () => {
        errorEmitter.off('new-result-saved', handleNewResult);
    };
  }, [onAnalyze]);
  
  const handleDownload = () => {
    if (!analysisResult) {
      toast({
        variant: 'destructive',
        title: 'Download Failed',
        description: 'No analysis data to download.',
      });
      return;
    }

    const t = translations[language];
    const { marketContext, analysisSummary, categoryHitRates, topCandidates, finalSelection } = analysisResult;

    let content = `mm2D LIVE — Analysis Report\n`;
    content += `=================================\n`;
    content += `Date: ${new Date().toLocaleDateString('en-GB')}\n`;
    content += `Data Window: Last 90 Sessions\n`;
    content += `Method: Rule Filtering + Statistical Validation\n\n`;

    content += `--- ${t.analysisSummary} ---\n`;
    content += `${analysisSummary}\n\n`;
    
    content += `--- ${t.marketContext} ---\n`;
    content += `Previous Result: ${marketContext.previousResult}\n`;
    content += `SET Open Index: ${marketContext.setOpenIndex}\n`;
    content += `Power Digits: ${marketContext.powerDigits.join(' / ')}\n\n`;

    content += `--- ${t.rulePerformance} ---\n`;
    content += `${t.power}: ${categoryHitRates.powerDigitHitRate.toFixed(2)}%\n`;
    content += `${t.oneChangeLabel}: ${categoryHitRates.oneChangeHitRate.toFixed(2)}%\n`;
    content += `${t.brother}: ${categoryHitRates.brotherPairHitRate.toFixed(2)}%\n`;
    content += `${t.doublesLabel}: ${categoryHitRates.doubleNumberHitRate.toFixed(2)}%\n\n`;

    content += `--- ${t.topCandidates} ---\n`;
    content += `Number | Hits | Rate   | Overlap          | Momentum  | Confidence\n`;
    content += `------------------------------------------------------------------\n`;
    topCandidates.forEach(c => {
        content += `${c.number.padEnd(7)}| ${String(c.count).padEnd(5)}| ${c.hitRate.toFixed(2).padEnd(6)}%| ${c.ruleOverlap.padEnd(17)}| ${c.momentum.padEnd(10)}| ${c.confidence}\n`;
    });
    content += `\n`;

    content += `--- ${t.finalSelection} ---\n`;
    content += `${t.main}: ${finalSelection.main.join(' • ')}\n`;
    content += `${t.strongSupport}: ${finalSelection.strongSupport.join(' • ')}\n`;
    content += `${t.watchRotation}: ${finalSelection.watchRotation.join(' • ')}\n\n`;

    content += `--- ${t.riskNotice} ---\n`;
    content += `${t.riskNoticeText}\n`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-t' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mm2d-analysis-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };


  const renderContent = () => {
    if (isPending && !analysisResult) {
      return <LoadingDashboard />;
    }
    if (analysisResult) {
      return <AnalysisDashboard data={analysisResult} language={language} />;
    }
    return (
      <div className="flex h-full min-h-[20rem] flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 py-10 text-center">
        <BrainCircuit className="mb-4 h-12 w-12 text-muted-foreground/50" />
        <p className="text-muted-foreground">
          Generate a rule-based analysis and statistical evaluation.
        </p>
      </div>
    );
  };
  const t = translations[language];

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 rounded-lg bg-primary/10 p-3">
              <BrainCircuit className="h-8 w-8 text-primary" />
            </div>
            <div>
              <CardTitle className="font-headline text-2xl">
                {t.dashboardTitle}
              </CardTitle>
              <CardDescription>
                {t.dashboardSubtitle}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
             {analysisResult && (
                <>
                 <Button variant="outline" size="sm" onClick={() => setLanguage(lang => lang === 'en' ? 'my' : 'en')}>
                    {language === 'en' ? '🇲🇲' : '🇬🇧'}
                </Button>
                 <Button variant="outline" size="sm" onClick={handleDownload} aria-label="Download analysis">
                    <Download className="h-4 w-4" />
                </Button>
                </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>{renderContent()}</CardContent>
      <CardFooter>
        <Button
          onClick={onAnalyze}
          disabled={isPending}
          className="w-full sm:w-auto"
        >
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
           {isPending
            ? analysisResult
              ? t.updatingAnalysis
              : t.analyzing
            : analysisResult
            ? t.refreshAnalysis
            : t.generateDashboard}
        </Button>
      </CardFooter>
    </Card>
  );
}

const LoadingDashboard = () => (
  <div className="space-y-6">
    <div className="space-y-2">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-1/3" />
    </div>
    <Skeleton className="h-24 rounded-lg" />
    <Skeleton className="h-56 rounded-lg" />
  </div>
);

const translations = {
    en: {
        dashboardTitle: "Analysis Dashboard",
        dashboardSubtitle: "Myanmar-style rule-based filtering and statistical evaluation.",
        generateDashboard: "Generate Dashboard",
        refreshAnalysis: "Refresh Analysis",
        analyzing: "Analyzing...",
        updatingAnalysis: "Updating Analysis...",
        analysisSummary: "Analysis Summary",
        marketContext: "Market Context",
        previousResult: "Previous Result",
        setOpenIndex: "SET Open Index",
        powerDigits: "Power Digits",
        rulePerformance: "Rule Performance (90 Sessions)",
        ruleCategoryAccuracy: "Rule Category Accuracy",
        topCandidates: "Top Candidates — Statistical Ranking",
        finalSelection: "Final Selection",
        main: "MAIN",
        strongSupport: "STRONG SUPPORT",
        watchRotation: "WATCH / ROTATION",
        riskNotice: "Risk Notice",
        riskNoticeText: "Historical hit rate remains low due to random market behavior. Analysis is designed to reduce numbers, not guarantee outcomes.",
        number: 'Number',
        hitCount: 'Hits',
        likelihood: 'Likelihood',
        ruleOverlap: 'Rule Overlap',
        momentum: 'Momentum',
        confidence: 'Confidence',
        power: 'Power',
        brother: 'Brother',
        oneChangeLabel: '1-Change',
        doublesLabel: 'Double',
    },
    my: {
        dashboardTitle: "သုံးသပ်ချက် ဒက်ရှ်ဘုတ်",
        dashboardSubtitle: "မြန်မာ့နည်းကျ စည်းမျဉ်း-အခြေပြု စစ်ထုတ်ခြင်းနှင့် စာရင်းအင်းအကဲဖြတ်ခြင်း။",
        generateDashboard: "ဒက်ရှ်ဘုတ် ဖန်တီးပါ",
        refreshAnalysis: "သုံးသပ်ချက် အသစ်လုပ်ပါ",
        analyzing: "သုံးသပ်နေသည်...",
        updatingAnalysis: "သုံးသပ်ချက် အသစ်လုပ်နေသည်...",
        analysisSummary: "သုံးသပ်ချက် အနှစ်ချုပ်",
        marketContext: "ဈေးကွက် အခြေအနေ",
        previousResult: "ယခင် ထွက်ဂဏန်း",
        setOpenIndex: "SET အဖွင့်",
        powerDigits: "ပါဝါ ကဏန်းများ",
        rulePerformance: "စည်းမျဉ်း စွမ်းဆောင်ရည် (ပွဲ ၉၀)",
        ruleCategoryAccuracy: "စည်းမျဉ်းအုပ်စု တိကျမှု",
        topCandidates: "ထိပ်တန်း ဂဏန်းများ — စာရင်းအင်း အဆင့်",
        finalSelection: "နောက်ဆုံး ရွေးချယ်မှု",
        main: "မိန်",
        strongSupport: "အားကောင်း",
        watchRotation: "စောင့်ကြည့်/လှည့်",
        riskNotice: "သတိပေးချက်",
        riskNoticeText: "ဈေးကွက်၏ ကျပန်းသဘောသဘာဝကြောင့် ယခင်ထိမှန်မှုနှုန်းမှာ နည်းနေပါသည်။ ဤသုံးသပ်ချက်သည် ဂဏန်းအရေအတွက်လျှော့ချရန်ဖြစ်ပြီး အောင်မြင်မှုကို အာမမခံပါ။",
        number: 'ဂဏန်း',
        hitCount: 'ထိရေ',
        likelihood: 'ဖြစ်နိုင်ခြေ',
        ruleOverlap: 'စည်းမျဉ်း ထပ်တူ',
        momentum: 'အရှိန်',
        confidence: 'ယုံကြည်မှု',
        power: 'ပါဝါ',
        brother: 'ညီအကို',
        oneChangeLabel: 'တစ်လုံးပြောင်း',
        doublesLabel: 'အပူး',
    }
};

const AnalysisDashboard = ({ data, language }: { data: AnalyzePatternsOutput, language: 'en' | 'my' }) => {
  const t = translations[language];
  const { marketContext, analysisSummary, categoryHitRates, topCandidates, finalSelection } = data;

  const chartData = [
      { name: t.power, "Accuracy": categoryHitRates.powerDigitHitRate, fill: "hsl(var(--chart-1))" },
      { name: t.oneChangeLabel, "Accuracy": categoryHitRates.oneChangeHitRate, fill: "hsl(var(--chart-2))" },
      { name: t.brother, "Accuracy": categoryHitRates.brotherPairHitRate, fill: "hsl(var(--chart-3))" },
      { name: t.doublesLabel, "Accuracy": categoryHitRates.doubleNumberHitRate, fill: "hsl(var(--chart-4))" },
  ];
  
  const chartConfig: ChartConfig = {
    "Accuracy": {
        label: `${t.likelihood} %`,
        color: "hsl(var(--foreground))"
    }
  };

  const getMomentumBadge = (momentum: string) => {
    switch (momentum) {
        case 'Rising': return <Badge variant="secondary" className='bg-green-500/20 text-green-500 border-green-500/30'>{momentum}</Badge>;
        case 'Stable': return <Badge variant="secondary" className='bg-blue-500/20 text-blue-500 border-blue-500/30'>{momentum}</Badge>;
        default: return <Badge variant="outline">{momentum}</Badge>;
    }
  }

  return (
    <div className="space-y-6">
      <div className='text-center'>
        <h2 className="text-xl font-bold tracking-tight sm:text-2xl">mm2D LIVE — Analysis Report</h2>
        <p className="text-xs text-muted-foreground">
          {new Date().toLocaleDateString(language === 'my' ? 'my-MM' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} | Data Window: Last 90 Sessions | Method: Rule Filtering + Statistical Validation
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
            <Card>
                <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
                    <FileText className="h-6 w-6 text-accent" />
                    <CardTitle className="text-lg">{t.analysisSummary}</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">{analysisSummary}</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <div className="flex flex-row items-center gap-4 space-y-0 pb-2">
                        <PieChart className="h-6 w-6 text-primary" />
                        <CardTitle className="text-lg">{t.rulePerformance}</CardTitle>
                    </div>
                    <CardDescription>{t.ruleCategoryAccuracy}</CardDescription>
                </CardHeader>
                <CardContent className="pl-0">
                    <ChartContainer config={chartConfig} className="h-52 w-full">
                        <BarChart accessibilityLayer data={chartData} margin={{ top: 20, left: -10, right: 10 }}>
                            <CartesianGrid vertical={false} />
                            <XAxis dataKey="name" tickLine={false} tickMargin={10} axisLine={false} fontSize={12} />
                            <YAxis tickFormatter={(value) => `${value.toFixed(0)}%`} fontSize={12}/>
                            <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                            <Bar dataKey="Accuracy" radius={5}>
                                {chartData.map((entry) => (
                                    <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ChartContainer>
                </CardContent>
            </Card>
        </div>
        
        <div className="space-y-6">
            <Card>
                <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
                     <BarChart2 className="h-6 w-6 text-muted-foreground" />
                    <CardTitle className="text-lg">{t.marketContext}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-4 text-sm">
                    <div className="flex items-center justify-between">
                        <div className='flex items-center gap-2 text-muted-foreground'><ArrowLeftRight className="h-4 w-4"/> {t.previousResult}</div>
                        <span className="font-mono font-bold text-lg">{marketContext.previousResult}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <div className='flex items-center gap-2 text-muted-foreground'><Hash className="h-4 w-4"/> {t.setOpenIndex}</div>
                        <span className="font-mono font-bold">{marketContext.setOpenIndex}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <div className='flex items-center gap-2 text-muted-foreground'><Zap className="h-4 w-4"/> {t.powerDigits}</div>
                        <span className="font-mono font-bold text-lg">{marketContext.powerDigits.join(' / ')}</span>
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
                    <Star className="h-6 w-6 text-yellow-400 fill-yellow-400" />
                    <CardTitle className="text-lg">{t.finalSelection}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-4">
                    <div className='flex items-start gap-3'>
                        <Badge className='border-green-500 text-green-500 bg-green-500/10' variant="outline">{t.main}</Badge>
                        <div className="flex flex-wrap gap-2">{finalSelection.main.map(n => <Badge className="text-lg" key={n}>{n}</Badge>)}</div>
                    </div>
                     <div className='flex items-start gap-3'>
                        <Badge className='border-blue-500 text-blue-500 bg-blue-500/10' variant="outline">{t.strongSupport}</Badge>
                        <div className="flex flex-wrap gap-2">{finalSelection.strongSupport.map(n => <Badge variant="secondary" className="text-md" key={n}>{n}</Badge>)}</div>
                    </div>
                     <div className='flex items-start gap-3'>
                        <Badge variant="outline">{t.watchRotation}</Badge>
                        <div className="flex flex-wrap gap-2">{finalSelection.watchRotation.map(n => <Badge variant="outline" className="text-sm" key={n}>{n}</Badge>)}</div>
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>
      
      <Card>
        <CardHeader>
            <div className="flex flex-row items-center gap-4 space-y-0 pb-2">
                <TrendingUp className="h-6 w-6 text-primary" />
                <CardTitle className="text-lg">{t.topCandidates}</CardTitle>
            </div>
        </CardHeader>
        <CardContent className="px-0">
             <div className="h-72 overflow-auto">
                <Table>
                    <TableHeader className="sticky top-0 z-10 bg-card/80 backdrop-blur-sm">
                        <TableRow>
                            <TableHead className="w-20 text-center">{t.number}</TableHead>
                            <TableHead className="text-center">{t.hitCount}</TableHead>
                            <TableHead className="text-center">{t.likelihood}%</TableHead>
                            <TableHead>{t.ruleOverlap}</TableHead>
                            <TableHead className='text-center'>{t.momentum}</TableHead>
                            <TableHead className="text-center w-24">{t.confidence}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {topCandidates.map(c => (
                            <TableRow key={c.number}>
                                <TableCell className="text-center font-mono font-bold text-lg">{c.number}</TableCell>
                                <TableCell className="text-center">{c.count}</TableCell>
                                <TableCell className="text-center">{c.hitRate.toFixed(1)}%</TableCell>
                                <TableCell><Badge variant="outline">{c.ruleOverlap}</Badge></TableCell>
                                <TableCell className="text-center">{getMomentumBadge(c.momentum)}</TableCell>
                                <TableCell className="text-center font-semibold text-lg">{c.confidence}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </CardContent>
      </Card>
      
       <Card className="bg-amber-600/10 border-amber-600/20">
        <CardHeader className="flex flex-row items-center gap-4 space-y-0 p-4">
            <ShieldAlert className="h-5 w-5 text-amber-600 flex-shrink-0" />
            <div className='flex-1'>
                 <CardTitle className="text-base text-amber-500">{t.riskNotice}</CardTitle>
                 <CardDescription className="text-amber-600/80 text-xs">{t.riskNoticeText}</CardDescription>
            </div>
        </CardHeader>
      </Card>

    </div>
  );
};

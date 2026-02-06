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
import { BrainCircuit, Download, Loader2, Percent, WandSparkles } from 'lucide-react';
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
import type { AnalyzePatternsOutput, AnalyzePatternsInput } from '@/app/analysis-types';


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
      
      // Fetch numbers for filtering (last 30 days ~ 120 results)
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
      
      // Fetch numbers for evaluation (last 90 days ~ 360 results)
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
        setAnalysisResult(result.result as AnalyzePatternsOutput);
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
    const handleNewResult = () => {
        toast({ title: 'New result saved!', description: 'Automatically updating analysis...' });
        onAnalyze();
    };

    errorEmitter.on('new-result-saved', handleNewResult);

    return () => {
        errorEmitter.off('new-result-saved', handleNewResult);
    };
  }, [onAnalyze, toast]);
  
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
    const { stage2_evaluation, prediction } = analysisResult;
    const top10Candidates = stage2_evaluation.individualHitRates.slice(0, 10);
    const categoryRates = stage2_evaluation.categoryHitRates;

    let content = `mm2D Live - Analysis Report\n`;
    content += `=================================\n\n`;

    content += `--- ${t.executiveSummary} ---\n`;
    content += `${prediction}\n\n`;

    content += `--- ${t.analysisBreakdown} ---\n\n`;

    content += `* ${t.categoryPerformance} *\n`;
    content += `- ${t.power}: ${categoryRates.powerDigitHitRate.toFixed(2)}%\n`;
    content += `- ${t.brother}: ${categoryRates.brotherPairHitRate.toFixed(2)}%\n`;
    content += `- ${t.oneChangeLabel}: ${categoryRates.oneChangeHitRate.toFixed(2)}%\n`;
    content += `- ${t.doublesLabel}: ${categoryRates.doubleNumberHitRate.toFixed(2)}%\n\n`;

    content += `* ${t.top10Candidates} *\n`;
    content += `${t.number.padEnd(10)} | ${t.hitCount.padEnd(15)} | ${t.likelihood}\n`;
    content += `${'-'.repeat(10)} | ${'-'.repeat(15)} | ${'-'.repeat(12)}\n`;
    top10Candidates.forEach(item => {
      content += `${item.number.padEnd(10)} | ${String(item.count).padEnd(15)} | ${item.hitRate.toFixed(2)}%\n`;
    });

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
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
                Analysis Dashboard
              </CardTitle>
              <CardDescription>
                Myanmar-style rule-based filtering and statistical evaluation.
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
              ? 'Updating Analysis...'
              : 'Analyzing...'
            : analysisResult
            ? 'Refresh Analysis'
            : 'Generate Dashboard'}
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
        executiveSummary: "Executive Summary",
        executiveSummarySubtitle: "Synthesized from rule-based filtering and statistical analysis.",
        analysisBreakdown: "Analysis Breakdown",
        analysisBreakdownSubtitle: "Historical performance of rules and top candidates.",
        categoryPerformance: "Rule Category Performance",
        top10Candidates: "Top 10 Likely Numbers",
        number: 'Number',
        hitCount: 'Hit Count (90d)',
        likelihood: 'Likelihood (%)',
        power: 'Power',
        brother: 'Brother',
        oneChangeLabel: '1-Change',
        doublesLabel: 'Doubles',
    },
    my: {
        executiveSummary: "အမှုဆောင် အနှစ်ချုပ်",
        executiveSummarySubtitle: "စည်းမျဉ်း-အခြေပြု စစ်ထုတ်ခြင်းနှင့် စာရင်းအင်းအကဲဖြတ်ခြင်းမှ ပေါင်းစပ်ထားသည်။",
        analysisBreakdown: "သုံးသပ်ချက် အသေးစိတ်",
        analysisBreakdownSubtitle: "စည်းမျဉ်းများနှင့် ထိပ်တန်းဂဏန်းများ၏ ယခင်စွမ်းဆောင်ရည်။",
        categoryPerformance: "စည်းမျဉ်းအုပ်စု စွမ်းဆောင်ရည်",
        top10Candidates: "အလားအလာအရှိဆုံး ဂဏန်း ၁၀ ကွက်",
        number: 'ဂဏန်း',
        hitCount: 'ထိမှန်မှု (ရက် ၉၀)',
        likelihood: 'ဖြစ်နိုင်ခြေ (%)',
        power: 'ပါဝါ',
        brother: 'ညီအကို',
        oneChangeLabel: 'တစ်လုံးပြောင်း',
        doublesLabel: 'အပူး',
    }
};

const AnalysisDashboard = ({ data, language }: { data: AnalyzePatternsOutput, language: 'en' | 'my' }) => {
  const { stage2_evaluation, prediction } = data;
  const t = translations[language];
  
  const top10Candidates = stage2_evaluation.individualHitRates.slice(0, 10);
  
  const chartData = [
      { name: t.power, "Likelihood": stage2_evaluation.categoryHitRates.powerDigitHitRate, fill: "hsl(var(--chart-1))" },
      { name: t.brother, "Likelihood": stage2_evaluation.categoryHitRates.brotherPairHitRate, fill: "hsl(var(--chart-2))" },
      { name: t.oneChangeLabel, "Likelihood": stage2_evaluation.categoryHitRates.oneChangeHitRate, fill: "hsl(var(--chart-3))" },
      { name: t.doublesLabel, "Likelihood": stage2_evaluation.categoryHitRates.doubleNumberHitRate, fill: "hsl(var(--chart-4))" },
  ];
  
  const chartConfig: ChartConfig = {
    "Likelihood": {
        label: t.likelihood,
        color: "hsl(var(--foreground))"
    }
  };

  return (
    <div className="space-y-6">
       <Card>
        <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
                <WandSparkles className="h-6 w-6 text-accent" />
                <CardTitle className="text-xl">{t.executiveSummary}</CardTitle>
            </div>
          <CardDescription>{t.executiveSummarySubtitle}</CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-sm text-muted-foreground">{prediction}</p>
        </CardContent>
      </Card>
      
       <Card>
        <CardHeader>
            <div className="flex items-center gap-2">
                <Percent className="h-6 w-6 text-primary" />
                <CardTitle className="text-xl">{t.analysisBreakdown}</CardTitle>
            </div>
          <CardDescription>{t.analysisBreakdownSubtitle}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div>
                 <h4 className="font-semibold mb-2 text-base">{t.categoryPerformance}</h4>
                 <ChartContainer config={chartConfig} className="h-52 w-full">
                    <BarChart accessibilityLayer data={chartData} margin={{ top: 20 }}>
                        <CartesianGrid vertical={false} />
                        <XAxis dataKey="name" tickLine={false} tickMargin={10} axisLine={false} />
                        <YAxis tickFormatter={(value) => `${value.toFixed(0)}%`} />
                        <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent indicator="dot" />}
                        />
                        <Bar dataKey="Likelihood" radius={4}>
                            <LabelList position="top" offset={4} className="fill-foreground" fontSize={12} formatter={(value: number) => `${value.toFixed(1)}%`} />
                             {chartData.map((entry) => (
                                <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                            ))}
                        </Bar>
                    </BarChart>
                </ChartContainer>
            </div>
            <div>
                 <h4 className="font-semibold mb-2 text-base">{t.top10Candidates}</h4>
                 <div className="h-64 overflow-auto rounded-md border">
                    <Table>
                        <TableHeader className="sticky top-0 bg-muted/50">
                            <TableRow>
                                <TableHead className="w-[100px]">{t.number}</TableHead>
                                <TableHead>{t.hitCount}</TableHead>
                                <TableHead className="text-right">{t.likelihood}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {top10Candidates.map(item => (
                                <TableRow key={item.number}>
                                    <TableCell className="font-mono font-bold">{item.number}</TableCell>
                                    <TableCell>{item.count}</TableCell>
                                    <TableCell className="text-right">{item.hitRate.toFixed(2)}%</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                 </div>
            </div>
        </CardContent>
      </Card>
    </div>
  );
};

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
import { BrainCircuit, Loader2, Percent, WandSparkles } from 'lucide-react';
import { getLiveSetData, handleAnalysis } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '../ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useFirestore } from '@/firebase';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { DailyResult } from '@/app/types';
import { errorEmitter } from '@/firebase/error-emitter';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../ui/accordion';
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
  const [isFromCache, setIsFromCache] = useState(false);
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
        if (result.fromCache) {
          setIsFromCache(true);
          toast({
            title: 'Loaded from Cache',
            description: 'Analysis results are up-to-date.',
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
    const handleNewResult = () => {
        toast({ title: 'New result saved!', description: 'Automatically updating analysis...' });
        onAnalyze();
    };

    errorEmitter.on('new-result-saved', handleNewResult);

    return () => {
        errorEmitter.off('new-result-saved', handleNewResult);
    };
  }, [onAnalyze, toast]);


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
            {analysisResult && isFromCache && (
                <Badge variant="secondary" className="whitespace-nowrap">Loaded from Cache</Badge>
            )}
             {analysisResult && (
                 <Button variant="outline" size="sm" onClick={() => setLanguage(lang => lang === 'en' ? 'my' : 'en')}>
                    {language === 'en' ? '🇲🇲' : '🇬🇧'}
                </Button>
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
    <Skeleton className="h-40 rounded-lg" />
    <Skeleton className="h-56 rounded-lg" />
    <Skeleton className="h-24 rounded-lg" />
  </div>
);

const NumberBadge = ({ number }: { number: string }) => (
    <Badge variant="outline" className="text-base font-mono tracking-widest">{number}</Badge>
);

const translations = {
    en: {
        finalPrediction: 'Final Prediction',
        predictionSubtitle: 'Synthesized from rule-based filtering and statistical analysis.',
        stage1Title: 'Stage 1: Rule-Based Filtering',
        candidateGroups: 'Candidate Number Groups',
        powerDigits: 'Power Digits',
        brotherPairs: 'Brother (Mirror) Pairs',
        oneChange: 'One-Change Numbers',
        doubles: 'Double Numbers',
        finalCandidates: 'Final Candidates',
        finalCandidatesSubtitle: 'The final list of candidates after applying the Nat Khat (exclusion) rule.',
        stage2Title: 'Stage 2: Statistical Evaluation',
        categoryHitRates: 'Category Hit Rates',
        individualHitRates: 'Individual Candidate Hit Rates',
        number: 'Number',
        hitCount: 'Hit Count',
        hitRate: 'Hit Rate (%)',
        power: 'Power',
        brother: 'Brother',
        oneChangeLabel: '1-Change',
        doublesLabel: 'Doubles',
    },
    my: {
        finalPrediction: 'နောက်ဆုံး ခန့်မှန်းချက်',
        predictionSubtitle: 'စည်းမျဉ်း-အခြေပြု စစ်ထုတ်ခြင်းနှင့် စာရင်းအင်းအကဲဖြတ်ခြင်းမှ ပေါင်းစပ်ထားသည်။',
        stage1Title: 'အဆင့် ၁: စည်းမျဉ်း-အခြေပြု စစ်ထုတ်ခြင်း',
        candidateGroups: 'ဖြစ်နိုင်သောဂဏန်းအုပ်စုများ',
        powerDigits: 'ပါဝါဂဏန်းများ',
        brotherPairs: 'ညီအကို (မှန်) ဂဏန်းများ',
        oneChange: 'တစ်လုံးပြောင်း ဂဏန်းများ',
        doubles: 'အပူးဂဏန်းများ',
        finalCandidates: 'နောက်ဆုံး ရွေးချယ်ထားသော ဂဏန်းများ',
        finalCandidatesSubtitle: 'နက္ခတ်(ဖယ်ထုတ်ခြင်း)စည်းမျဉ်းကို အသုံးပြုပြီးနောက် နောက်ဆုံးရွေးချယ်ထားသော ဂဏန်းများစာရင်း။',
        stage2Title: 'အဆင့် ၂: စာရင်းအင်းအကဲဖြတ်ခြင်း',
        categoryHitRates: 'အုပ်စုလိုက် ထိနှုန်းများ',
        individualHitRates: 'တစ်ဦးချင်းစီ၏ ထိနှုန်းများ',
        number: 'ဂဏန်း',
        hitCount: 'ထိအရေအတွက်',
        hitRate: 'ထိနှုန်း (%)',
        power: 'ပါဝါ',
        brother: 'ညီအကို',
        oneChangeLabel: 'တစ်လုံးပြောင်း',
        doublesLabel: 'အပူး',
    }
};

const AnalysisDashboard = ({ data, language }: { data: AnalyzePatternsOutput, language: 'en' | 'my' }) => {
  const { stage1_filtering, stage2_evaluation, prediction } = data;
  const t = translations[language];
  
  const chartData = [
      { name: t.power, "Hit Rate": stage2_evaluation.categoryHitRates.powerDigitHitRate, fill: "hsl(var(--chart-1))" },
      { name: t.brother, "Hit Rate": stage2_evaluation.categoryHitRates.brotherPairHitRate, fill: "hsl(var(--chart-2))" },
      { name: t.oneChangeLabel, "Hit Rate": stage2_evaluation.categoryHitRates.oneChangeHitRate, fill: "hsl(var(--chart-3))" },
      { name: t.doublesLabel, "Hit Rate": stage2_evaluation.categoryHitRates.doubleNumberHitRate, fill: "hsl(var(--chart-4))" },
  ];
  
  const chartConfig: ChartConfig = {
    "Hit Rate": {
        label: t.hitRate,
        color: "hsl(var(--foreground))"
    }
  };

  return (
    <div className="space-y-6">
       <Card>
        <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
                <WandSparkles className="h-6 w-6 text-accent" />
                <CardTitle className="text-xl">{t.finalPrediction}</CardTitle>
            </div>
          <CardDescription>{t.predictionSubtitle}</CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-sm text-muted-foreground">{prediction}</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
            <CardTitle>{t.stage1Title}</CardTitle>
            <CardDescription>{stage1_filtering.summary}</CardDescription>
        </CardHeader>
        <CardContent>
            <Accordion type="single" collapsible defaultValue="candidates">
                <AccordionItem value="candidates">
                    <AccordionTrigger className="text-base">{t.candidateGroups}</AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-2">
                       <div>
                           <h4 className="font-semibold mb-2">{t.powerDigits}</h4>
                           <div className="flex flex-wrap gap-2">{stage1_filtering.candidates.powerDigits.map(n => <NumberBadge key={n} number={n} />)}</div>
                       </div>
                       <div>
                           <h4 className="font-semibold mb-2">{t.brotherPairs}</h4>
                           <div className="flex flex-wrap gap-2">{stage1_filtering.candidates.brotherPairs.map(n => <NumberBadge key={n} number={n} />)}</div>
                       </div>
                       <div>
                           <h4 className="font-semibold mb-2">{t.oneChange}</h4>
                           <div className="flex flex-wrap gap-2">{stage1_filtering.candidates.oneChange.map(n => <NumberBadge key={n} number={n} />)}</div>
                       </div>
                       {stage1_filtering.candidates.doubles.length > 0 && (
                        <div>
                           <h4 className="font-semibold mb-2">{t.doubles}</h4>
                           <div className="flex flex-wrap gap-2">{stage1_filtering.candidates.doubles.map(n => <NumberBadge key={n} number={n} />)}</div>
                       </div>
                       )}
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="final">
                    <AccordionTrigger className="text-base">{t.finalCandidates} ({stage1_filtering.finalCandidates.length})</AccordionTrigger>
                    <AccordionContent className="pt-2">
                        <p className="text-sm text-muted-foreground mb-4">{t.finalCandidatesSubtitle}</p>
                        <div className="flex flex-wrap gap-2">{stage1_filtering.finalCandidates.map(n => <NumberBadge key={n} number={n} />)}</div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </CardContent>
      </Card>
      
       <Card>
        <CardHeader>
            <div className="flex items-center gap-2">
                <Percent className="h-6 w-6 text-primary" />
                <CardTitle className="text-xl">{t.stage2Title}</CardTitle>
            </div>
          <CardDescription>{stage2_evaluation.summary}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div>
                 <h4 className="font-semibold mb-2 text-base">{t.categoryHitRates}</h4>
                 <ChartContainer config={chartConfig} className="h-52 w-full">
                    <BarChart accessibilityLayer data={chartData} margin={{ top: 20 }}>
                        <CartesianGrid vertical={false} />
                        <XAxis dataKey="name" tickLine={false} tickMargin={10} axisLine={false} />
                        <YAxis tickFormatter={(value) => `${value.toFixed(0)}%`} />
                        <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent indicator="dot" />}
                        />
                        <Bar dataKey="Hit Rate" radius={4}>
                            <LabelList position="top" offset={4} className="fill-foreground" fontSize={12} formatter={(value: number) => `${value.toFixed(1)}%`} />
                             {chartData.map((entry) => (
                                <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                            ))}
                        </Bar>
                    </BarChart>
                </ChartContainer>
            </div>
            <div>
                 <h4 className="font-semibold mb-2 text-base">{t.individualHitRates}</h4>
                 <div className="h-64 overflow-auto rounded-md border">
                    <Table>
                        <TableHeader className="sticky top-0 bg-muted/50">
                            <TableRow>
                                <TableHead className="w-[100px]">{t.number}</TableHead>
                                <TableHead>{t.hitCount}</TableHead>
                                <TableHead className="text-right">{t.hitRate}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {stage2_evaluation.individualHitRates
                                .sort((a,b) => b.hitRate - a.hitRate)
                                .map(item => (
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

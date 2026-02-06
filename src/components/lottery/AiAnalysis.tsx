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
import { AnalyzePatternsOutput, AnalyzePatternsInput } from '@/app/actions';


export default function AiAnalysis() {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const [analysisResult, setAnalysisResult] = useState<AnalyzePatternsOutput | null>(
    null
  );
  const [isFromCache, setIsFromCache] = useState(false);
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
      return <AnalysisDashboard data={analysisResult} />;
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
                AI Analysis Dashboard
              </CardTitle>
              <CardDescription>
                Myanmar-style rule-based filtering and statistical evaluation.
              </CardDescription>
            </div>
          </div>
          {analysisResult && isFromCache && (
            <Badge variant="secondary" className="whitespace-nowrap">Loaded from Cache</Badge>
          )}
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

const AnalysisDashboard = ({ data }: { data: AnalyzePatternsOutput }) => {
  const { stage1_filtering, stage2_evaluation, prediction } = data;
  
  const chartData = [
      { name: "Power", "Hit Rate": stage2_evaluation.categoryHitRates.powerDigitHitRate, fill: "hsl(var(--chart-1))" },
      { name: "Brother", "Hit Rate": stage2_evaluation.categoryHitRates.brotherPairHitRate, fill: "hsl(var(--chart-2))" },
      { name: "1-Change", "Hit Rate": stage2_evaluation.categoryHitRates.oneChangeHitRate, fill: "hsl(var(--chart-3))" },
      { name: "Doubles", "Hit Rate": stage2_evaluation.categoryHitRates.doubleNumberHitRate, fill: "hsl(var(--chart-4))" },
  ];
  
  const chartConfig: ChartConfig = {
    "Hit Rate": {
        label: "Hit Rate (%)",
        color: "hsl(var(--foreground))"
    }
  };

  return (
    <div className="space-y-6">
       <Card>
        <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
                <WandSparkles className="h-6 w-6 text-accent" />
                <CardTitle className="text-xl">Final Prediction</CardTitle>
            </div>
          <CardDescription>Synthesized from rule-based filtering and statistical analysis.</CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-sm text-muted-foreground">{prediction}</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
            <CardTitle>Stage 1: Rule-Based Filtering</CardTitle>
            <CardDescription>{stage1_filtering.summary}</CardDescription>
        </CardHeader>
        <CardContent>
            <Accordion type="single" collapsible defaultValue="candidates">
                <AccordionItem value="candidates">
                    <AccordionTrigger className="text-base">Candidate Number Groups</AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-2">
                       <div>
                           <h4 className="font-semibold mb-2">Power Digits</h4>
                           <div className="flex flex-wrap gap-2">{stage1_filtering.candidates.powerDigits.map(n => <NumberBadge key={n} number={n} />)}</div>
                       </div>
                       <div>
                           <h4 className="font-semibold mb-2">Brother (Mirror) Pairs</h4>
                           <div className="flex flex-wrap gap-2">{stage1_filtering.candidates.brotherPairs.map(n => <NumberBadge key={n} number={n} />)}</div>
                       </div>
                       <div>
                           <h4 className="font-semibold mb-2">One-Change Numbers</h4>
                           <div className="flex flex-wrap gap-2">{stage1_filtering.candidates.oneChange.map(n => <NumberBadge key={n} number={n} />)}</div>
                       </div>
                       {stage1_filtering.candidates.doubles.length > 0 && (
                        <div>
                           <h4 className="font-semibold mb-2">Double Numbers</h4>
                           <div className="flex flex-wrap gap-2">{stage1_filtering.candidates.doubles.map(n => <NumberBadge key={n} number={n} />)}</div>
                       </div>
                       )}
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="final">
                    <AccordionTrigger className="text-base">Final Candidates ({stage1_filtering.finalCandidates.length})</AccordionTrigger>
                    <AccordionContent className="pt-2">
                        <p className="text-sm text-muted-foreground mb-4">The final list of candidates after applying the Nat Khat (exclusion) rule.</p>
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
                <CardTitle className="text-xl">Stage 2: Statistical Evaluation</CardTitle>
            </div>
          <CardDescription>{stage2_evaluation.summary}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div>
                 <h4 className="font-semibold mb-2 text-base">Category Hit Rates</h4>
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
                 <h4 className="font-semibold mb-2 text-base">Individual Candidate Hit Rates</h4>
                 <div className="h-64 overflow-auto rounded-md border">
                    <Table>
                        <TableHeader className="sticky top-0 bg-muted/50">
                            <TableRow>
                                <TableHead className="w-[100px]">Number</TableHead>
                                <TableHead>Hit Count</TableHead>
                                <TableHead className="text-right">Hit Rate (%)</TableHead>
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

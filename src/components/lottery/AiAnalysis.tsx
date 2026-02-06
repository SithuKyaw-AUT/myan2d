'use client';

import { useState, useTransition } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
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
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { BrainCircuit, Loader2, Repeat, WandSparkles } from 'lucide-react';
import { handleAnalysis } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '../ui/skeleton';
import { Separator } from '../ui/separator';

// Define the types for the structured analysis data
type AnalysisResult = {
  analysis: {
    oddEven: { odd: number; even: number };
    highLow: { high: number; low: number };
    digitFrequency: Array<{ digit: string; count: number }>;
    pairDigitFrequency: Array<{ pair: string; count: number }>;
    repeatingNumbers: { count: number };
    summary: string;
  };
  prediction: {
    hotNumbers: string[];
    coldNumbers: string[];
    keyDigit: string;
    predictedPairDigit: string;
    summary: string;
  };
};

export default function AiAnalysis() {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(
    null
  );

  const onAnalyze = () => {
    setAnalysisResult(null);
    startTransition(async () => {
      const result = await handleAnalysis();
      if (result.success && result.result) {
        setAnalysisResult(result.result as AnalysisResult);
      } else {
        toast({
          variant: 'destructive',
          title: 'Analysis Failed',
          description:
            result.error || 'An unexpected error occurred.',
        });
      }
    });
  };

  const renderContent = () => {
    if (isPending) {
      return <LoadingDashboard />;
    }
    if (analysisResult) {
      return <AnalysisDashboard data={analysisResult} />;
    }
    return (
      <div className="flex h-full min-h-[20rem] flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 py-10 text-center">
        <BrainCircuit className="mb-4 h-12 w-12 text-muted-foreground/50" />
        <p className="text-muted-foreground">
          Generate a visual dashboard with AI-powered analysis and predictions.
        </p>
      </div>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0 rounded-lg bg-primary/10 p-3">
            <BrainCircuit className="h-8 w-8 text-primary" />
          </div>
          <div>
            <CardTitle className="font-headline text-2xl">
              AI Analysis Dashboard
            </CardTitle>
            <CardDescription>
              A visual breakdown of patterns and predictions from historical data.
            </CardDescription>
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
          {isPending ? 'Analyzing...' : 'Generate Dashboard'}
        </Button>
      </CardFooter>
    </Card>
  );
}

const LoadingDashboard = () => (
  <div className="space-y-6">
    {/* Prediction Skeleton */}
    <div className="space-y-2">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-1/3" />
    </div>
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
      <Skeleton className="h-36 rounded-lg" />
      <Skeleton className="h-36 rounded-lg" />
    </div>
    {/* Summaries Skeleton */}
     <div className="space-y-2">
      <Skeleton className="h-8 w-32" />
    </div>
     <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Skeleton className="h-24 rounded-lg" />
      <Skeleton className="h-24 rounded-lg" />
    </div>
     {/* Charts Skeleton */}
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
       <Skeleton className="h-64 rounded-lg" />
       <Skeleton className="h-64 rounded-lg" />
    </div>
     <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
       <Skeleton className="h-32 rounded-lg" />
       <Skeleton className="h-32 rounded-lg" />
       <Skeleton className="h-32 rounded-lg" />
    </div>
  </div>
);

const AnalysisDashboard = ({ data }: { data: AnalysisResult }) => {
  const { analysis, prediction } = data;
  const oddEvenData = [
    { name: 'Odd', value: analysis.oddEven.odd, fill: 'var(--color-odd)' },
    { name: 'Even', value: analysis.oddEven.even, fill: 'var(--color-even)' },
  ];
  const highLowData = [
    { name: 'High', value: analysis.highLow.high, fill: 'var(--color-high)' },
    { name: 'Low', value: analysis.highLow.low, fill: 'var(--color-low)' },
  ];
  const pairDigitChartData = analysis.pairDigitFrequency.map(d => ({...d, digit: d.pair}));


  const chartConfig: ChartConfig = {
    odd: { label: 'Odd', color: 'hsl(var(--chart-2))' },
    even: { label: 'Even', color: 'hsl(var(--chart-1))' },
    high: { label: 'High', color: 'hsl(var(--chart-4))' },
    low: { label: 'Low', color: 'hsl(var(--chart-3))' },
    count: { label: 'Count', color: 'hsl(var(--chart-1))' },
    pairCount: { label: 'Count', color: 'hsl(var(--chart-2))' },
  };

  return (
    <div className="space-y-6">
       <Card>
        <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
                <WandSparkles className="h-6 w-6 text-accent" />
                <CardTitle className="text-xl">AI Predictions</CardTitle>
            </div>
          <CardDescription>Generated based on historical patterns and trends.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             <div>
                <p className="mb-2 text-center text-sm font-medium text-muted-foreground">Hot Numbers (Likely)</p>
                <div className="flex items-center justify-center gap-2 sm:gap-4">
                {prediction.hotNumbers.map((num) => (
                    <div key={num} className="flex h-16 w-16 items-center justify-center rounded-lg border-2 border-primary bg-primary/10 text-3xl font-bold text-primary shadow-inner sm:h-20 sm:w-20 sm:text-4xl">
                    {num}
                    </div>
                ))}
                </div>
            </div>
             <div>
                <p className="mb-2 text-center text-sm font-medium text-muted-foreground">Cold Numbers (Due)</p>
                <div className="flex items-center justify-center gap-2 sm:gap-4">
                {prediction.coldNumbers.map((num) => (
                    <div key={num} className="flex h-16 w-16 items-center justify-center rounded-lg border-2 border-secondary text-3xl font-bold text-secondary-foreground shadow-inner sm:h-20 sm:w-20 sm:text-4xl">
                    {num}
                    </div>
                ))}
                </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="flex flex-col items-center justify-center rounded-lg border bg-muted/30 p-4">
                <p className="mb-2 text-sm font-medium text-muted-foreground">Key Digit</p>
                <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-accent bg-accent/10 text-3xl font-bold text-accent shadow-inner sm:h-20 sm:w-20 sm:text-4xl">
                {prediction.keyDigit}
                </div>
            </div>
             <div className="flex flex-col items-center justify-center rounded-lg border bg-muted/30 p-4">
                <p className="mb-2 text-sm font-medium text-muted-foreground">Predicted Pair (ဘရိတ်)</p>
                <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-chart-5 bg-chart-5/10 text-3xl font-bold text-chart-5 shadow-inner sm:h-20 sm:w-20 sm:text-4xl">
                {prediction.predictedPairDigit}
                </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
            <CardTitle>AI Summaries</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
            <div>
                <h4 className="font-semibold mb-1 text-base">Analysis Summary</h4>
                <p className="text-sm text-muted-foreground">{analysis.summary}</p>
            </div>
            <Separator />
            <div>
                <h4 className="font-semibold mb-1 text-base">Prediction Rationale</h4>
                <p className="text-sm text-muted-foreground">{prediction.summary}</p>
            </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Digit Frequency</CardTitle>
            <CardDescription>Occurrences of each digit (0-9).</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-52 w-full">
              <BarChart accessibilityLayer data={analysis.digitFrequency} margin={{ top: 20 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="digit" tickLine={false} tickMargin={10} axisLine={false} />
                 <YAxis hide={true} />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="dot" />}
                />
                <Bar dataKey="count" fill="var(--color-count)" radius={4}>
                    <LabelList position="top" offset={4} className="fill-foreground" fontSize={12} />
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Pair Digit (ဘရိတ်) Frequency</CardTitle>
            <CardDescription>Frequency of the sum of digits.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-52 w-full">
              <BarChart accessibilityLayer data={pairDigitChartData} margin={{ top: 20 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="digit" tickLine={false} tickMargin={10} axisLine={false} />
                 <YAxis hide={true} />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="dot" />}
                />
                <Bar dataKey="count" fill="var(--color-pairCount)" radius={4}>
                    <LabelList position="top" offset={4} className="fill-foreground" fontSize={12} />
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Odd vs. Even</CardTitle>
                </CardHeader>
                 <CardContent className="flex justify-center p-0">
                    <ChartContainer config={chartConfig} className="mx-auto aspect-square h-36">
                        <PieChart>
                            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                            <Pie data={oddEvenData} dataKey="value" nameKey="name" innerRadius={30} strokeWidth={5}>
                               <Cell key="odd" fill="var(--color-odd)" />
                               <Cell key="even" fill="var(--color-even)" />
                            </Pie>
                             <ChartLegend content={<ChartLegendContent nameKey="name" />} />
                        </PieChart>
                    </ChartContainer>
                 </CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">High vs. Low</CardTitle>
                </CardHeader>
                 <CardContent className="flex justify-center p-0">
                    <ChartContainer config={chartConfig} className="mx-auto aspect-square h-36">
                        <PieChart>
                            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                            <Pie data={highLowData} dataKey="value" nameKey="name" innerRadius={30} strokeWidth={5}>
                                <Cell key="high" fill="var(--color-high)" />
                                <Cell key="low" fill="var(--color-low)" />
                            </Pie>
                             <ChartLegend content={<ChartLegendContent nameKey="name" />} />
                        </PieChart>
                    </ChartContainer>
                 </CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Repeating Numbers</CardTitle>
                    <Repeat className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                 <CardContent>
                    <div className="text-2xl font-bold">{analysis.repeatingNumbers.count}</div>
                    <p className="text-xs text-muted-foreground">Total pairs like 00, 11, etc.</p>
                 </CardContent>
            </Card>
        </div>
    </div>
  );
};

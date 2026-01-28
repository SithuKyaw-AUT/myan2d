'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { BrainCircuit, Loader2 } from 'lucide-react';
import { handleAnalysis } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '../ui/skeleton';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
} from '@/components/ui/chart';

type FrequencyData = {
  number: string;
  count: number;
};

const chartConfig = {
  count: {
    label: 'Count',
    color: 'hsl(var(--primary))',
  },
} satisfies ChartConfig;

export default function PatternAnalysis() {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const [analysis, setAnalysis] = useState<string>('');
  const [frequencyData, setFrequencyData] = useState<FrequencyData[]>([]);

  const onAnalyze = () => {
    setAnalysis('');
    setFrequencyData([]);
    startTransition(async () => {
      const result = await handleAnalysis();
      if (result.success && result.analysis && result.numberFrequency) {
        setAnalysis(result.analysis);
        setFrequencyData(result.numberFrequency.slice(0, 10)); // Take top 10 for cleaner chart
      } else {
        toast({
          variant: 'destructive',
          title: 'Analysis Failed',
          description: result.error,
        });
      }
    });
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
              Discover trends and number frequency from the last 4 weeks.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="min-h-[10rem] text-foreground/90">
        {isPending ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="mt-8 h-48 w-full" />
          </div>
        ) : analysis ? (
          <div>
            <h3 className="font-headline text-lg mb-2">AI Insights</h3>
            <p className="whitespace-pre-wrap leading-relaxed">{analysis}</p>
            {frequencyData.length > 0 && (
              <div className="mt-8">
                <h3 className="font-headline text-lg mb-2">
                  Top 10 Frequent Numbers
                </h3>
                <ChartContainer
                  config={chartConfig}
                  className="h-[250px] w-full"
                >
                  <BarChart
                    accessibilityLayer
                    data={frequencyData}
                    margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
                  >
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="number"
                      tickLine={false}
                      tickMargin={10}
                      axisLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tickMargin={10}
                      axisLine={false}
                      tickLine={false}
                    />
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent indicator="dot" />}
                    />
                    <Bar
                      dataKey="count"
                      fill="var(--color-count)"
                      radius={4}
                    />
                  </BarChart>
                </ChartContainer>
              </div>
            )}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 py-10">
            <p className="text-center text-muted-foreground">
              Click the button below to generate AI insights and analysis
              dashboard.
            </p>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button
          onClick={onAnalyze}
          disabled={isPending}
          className="w-full sm:w-auto"
        >
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isPending ? 'Analyzing...' : 'Analyze Last 4 Weeks'}
        </Button>
      </CardFooter>
    </Card>
  );
}

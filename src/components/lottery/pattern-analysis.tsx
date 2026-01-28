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

export default function PatternAnalysis() {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const [analysis, setAnalysis] = useState<string>('');

  const onAnalyze = () => {
    setAnalysis('');
    startTransition(async () => {
      const result = await handleAnalysis();
      if (result.success && result.analysis) {
        setAnalysis(result.analysis);
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
              AI Pattern Analysis
            </CardTitle>
            <CardDescription>
              Discover trends from the last 4 weeks of data.
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
          </div>
        ) : analysis ? (
          <p className="whitespace-pre-wrap leading-relaxed">{analysis}</p>
        ) : (
          <div className="flex h-full items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 py-10">
            <p className="text-center text-muted-foreground">
              Click the button below to generate AI insights.
            </p>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={onAnalyze} disabled={isPending} className="w-full sm:w-auto">
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isPending ? 'Analyzing...' : 'Analyze Last 4 Weeks'}
        </Button>
      </CardFooter>
    </Card>
  );
}

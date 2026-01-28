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
import { BrainCircuit, Loader2, WandSparkles } from 'lucide-react';
import { handleAnalysis } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '../ui/skeleton';
import { Separator } from '../ui/separator';

export default function PatternAnalysis() {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const [analysis, setAnalysis] = useState<string>('');
  const [prediction, setPrediction] = useState<string>('');

  const onAnalyze = () => {
    setAnalysis('');
    setPrediction('');
    startTransition(async () => {
      const result = await handleAnalysis();
      if (result.success && result.analysis && result.prediction) {
        setAnalysis(result.analysis);
        setPrediction(result.prediction);
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
              AI-powered patterns and predictions from the last 4 weeks.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="min-h-[10rem] text-foreground/90">
        {isPending ? (
          <div className="space-y-4">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
             <div className="pt-4">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="mt-2 h-4 w-full" />
                <Skeleton className="mt-2 h-4 w-2/3" />
            </div>
          </div>
        ) : analysis ? (
          <div className="space-y-6">
            <div>
              <h3 className="font-headline text-lg mb-2">Pattern Analysis</h3>
              <p className="whitespace-pre-wrap leading-relaxed text-sm">{analysis}</p>
            </div>
            <Separator />
             <div>
              <h3 className="font-headline text-lg mb-2 flex items-center gap-2"><WandSparkles className="text-accent" /> AI Prediction</h3>
              <p className="whitespace-pre-wrap leading-relaxed text-sm">{prediction}</p>
            </div>
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 py-10 text-center">
             <BrainCircuit className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">
              Analyze the last 4 weeks of data to find patterns and get AI-based predictions.
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
          {isPending ? 'Analyzing...' : 'Generate Analysis & Prediction'}
        </Button>
      </CardFooter>
    </Card>
  );
}

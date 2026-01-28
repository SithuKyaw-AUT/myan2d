'use client';

import { useState, useTransition, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { getLiveSetData } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '../ui/skeleton';

type LiveData = {
    setIndex: string;
    value: string;
    twoD: string;
    lastUpdated: string;
}

export default function CurrentNumber() {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const [liveData, setLiveData] = useState<LiveData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const fetchData = () => {
      startTransition(async () => {
        const result = await getLiveSetData();
        if (result.success && result.data) {
          setLiveData(result.data);
        } else {
          // On failure, only show a toast if it's the initial load.
          // Background refresh failures will be silent to avoid bothering the user.
          if (!liveData) {
            toast({
              variant: 'destructive',
              title: 'Update Failed',
              description: result.error,
            });
          }
        }
        // This will only be true on the first run.
        if (isLoading) {
            setIsLoading(false);
        }
      });
    };

    const timer = setInterval(() => {
        const time = new Date().toLocaleTimeString('en-US', {
            timeZone: 'Asia/Yangon',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
        });
        setCurrentTime(`${time} MMT`);
    }, 1000);

    fetchData();
    // Refresh every 10 seconds for a near real-time experience.
    const interval = setInterval(fetchData, 10 * 1000); 
    
    return () => {
        clearInterval(timer);
        clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Card className="w-full overflow-hidden text-center">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">
          Live 2D Number
        </CardTitle>
        <CardDescription>
            {currentTime ? `Live from the Thai SET Index | ${currentTime}` : 'Live from the Thai SET Index'}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        {isLoading ? (
             <div className="space-y-4">
                <Skeleton className="mx-auto h-24 w-40" />
                <Skeleton className="mx-auto h-6 w-1/2" />
                <Skeleton className="mx-auto h-4 w-3/4" />
            </div>
        ) : liveData ? (
          <div className="relative inline-block">
            <div className="text-8xl font-bold font-headline text-primary tracking-widest lg:text-9xl">
                {liveData.twoD}
            </div>
            <div className="mt-2 text-muted-foreground text-sm">
                <p>SET Index: <span className="font-semibold text-foreground">{liveData.setIndex}</span></p>
                <p>Value (Mil): <span className="font-semibold text-foreground">{liveData.value}</span></p>
                <p>Last Updated: {liveData.lastUpdated}</p>
            </div>
            <div className="absolute -top-2 -left-2 h-10 w-10 animate-pulse rounded-full bg-accent/20 -z-10"></div>
            <div className="absolute -bottom-2 -right-2 h-16 w-16 animate-pulse rounded-full bg-primary/20 -z-10 delay-500"></div>
          </div>
        ) : (
            <p className="text-destructive">Could not load live data.</p>
        )}
      </CardContent>
    </Card>
  );
}

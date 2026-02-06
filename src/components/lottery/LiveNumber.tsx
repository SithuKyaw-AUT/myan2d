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
import { useFirestore } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { formatDateToYyyyMmDd } from '@/lib/firebase/utils';
import type { Result } from '@/app/types';

type LiveData = {
    setIndex: string;
    value: string;
    twoD: string;
    lastUpdated: string;
}

// Times are in MMT (Myanmar Time)
const RESULT_TIMES: Record<string, string> = {
    '11:00': 's11_00',
    '12:01': 's12_01',
    '15:00': 's15_00',
    '16:30': 's16_30',
};

export default function LiveNumber() {
  const [, startTransition] = useTransition();
  const { toast } = useToast();
  const [liveData, setLiveData] = useState<LiveData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState('');
  const  firestore  = useFirestore();

  const handleWriteToFirestore = (timeKey: string, result: LiveData) => {
    if (!firestore) return;

    const today = new Date();
    const docId = formatDateToYyyyMmDd(today);
    const docRef = doc(firestore, 'lottery_results', docId);

    const resultData: Result = {
      set: result.setIndex,
      value: result.value,
      twoD: result.twoD,
    };
    
    const fieldToUpdate = RESULT_TIMES[timeKey];
    const dataToWrite: any = {
      date: docId,
      [fieldToUpdate]: resultData
    };

    setDoc(docRef, dataToWrite, { merge: true })
      .then(() => {
        toast({
          title: 'Result Saved!',
          description: `Today's ${timeKey} result (${result.twoD}) has been saved.`,
        });
      })
      .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: docRef.path,
          operation: 'update',
          requestResourceData: dataToWrite,
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  useEffect(() => {
    const fetchData = () => {
      startTransition(async () => {
        const result = await getLiveSetData();
        if (result.success && result.data) {
          const previousTwoD = liveData?.twoD;
          setLiveData(result.data);
          
          const mmtTime = new Date().toLocaleTimeString('en-US', {
              timeZone: 'Asia/Yangon',
              hour: '2-digit',
              minute: '2-digit',
              hour12: false, // 24-hour format
          });
          
          // Check if it's a result time AND the number has changed
          if (result.data.twoD !== previousTwoD) {
            for (const timeKey in RESULT_TIMES) {
                if (mmtTime.startsWith(timeKey)) {
                    handleWriteToFirestore(timeKey, result.data);
                    break;
                }
            }
          }

        } else if (result.error && !liveData) {
            toast({
              variant: 'destructive',
              title: 'Live Data Failed',
              description: result.error,
            });
        }
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

    fetchData(); // Initial fetch
    const interval = setInterval(fetchData, 10 * 1000); // Refresh every 10 seconds
    
    return () => {
        clearInterval(timer);
        clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Card className="w-full overflow-hidden text-center h-full">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">
          Live 2D Number
        </CardTitle>
        <CardDescription>
            {currentTime ? `Live from SET | ${currentTime}` : 'Connecting...'}
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
                <p>SET: <span className="font-semibold text-foreground">{liveData.setIndex}</span></p>
                <p>Value: <span className="font-semibold text-foreground">{liveData.value}</span></p>
                <p className="mt-1">Updated: {liveData.lastUpdated}</p>
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

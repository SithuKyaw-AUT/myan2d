'use client';

import { useState, useTransition, useEffect, useCallback, useRef } from 'react';
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

const FAST_POLL_INTERVAL = 10 * 1000; // 10 seconds
const NORMAL_POLL_INTERVAL = 60 * 1000; // 1 minute

function getPollingInterval(): number | null {
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Yangon' }));
    const day = now.getDay(); // Sunday = 0, Saturday = 6
    const hour = now.getHours();
    const minute = now.getMinutes();

    // No polling on weekends
    if (day === 0 || day === 6) {
        return null;
    }

    // No polling outside of general market hours (e.g., 8 AM to 6 PM MMT)
    if (hour < 8 || hour > 18) {
        return null;
    }

    // Fast polling window: 5 minutes before and 2 minutes after each result time
    const isNearResultTime = Object.keys(RESULT_TIMES).some(timeStr => {
        const [resHour, resMinute] = timeStr.split(':').map(Number);
        const timeInMinutes = hour * 60 + minute;
        const resultTimeInMinutes = resHour * 60 + resMinute;
        return timeInMinutes >= resultTimeInMinutes - 5 && timeInMinutes <= resultTimeInMinutes + 2;
    });

    if (isNearResultTime) {
        return FAST_POLL_INTERVAL;
    }

    return NORMAL_POLL_INTERVAL;
}


export default function LiveNumber() {
  const [, startTransition] = useTransition();
  const { toast } = useToast();
  const [liveData, setLiveData] = useState<LiveData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState('');
  const  firestore  = useFirestore();
  const previousTwoDRef = useRef<string | undefined>();

  const handleWriteToFirestore = useCallback((timeKey: string, result: LiveData) => {
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
        errorEmitter.emit('new-result-saved');
      })
      .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: docRef.path,
          operation: 'update',
          requestResourceData: dataToWrite,
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  }, [firestore, toast]);

  useEffect(() => {
    // Current time ticker
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

    const fetchData = () => {
      startTransition(async () => {
        const result = await getLiveSetData();
        if (result.success && result.data) {
          const previousTwoD = previousTwoDRef.current;
          setLiveData(result.data);
          previousTwoDRef.current = result.data.twoD;
          
          const mmtTime = new Date().toLocaleTimeString('en-US', {
              timeZone: 'Asia/Yangon',
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
          });
          
          if (result.data.twoD !== previousTwoD) {
            for (const timeKey in RESULT_TIMES) {
                const [resHour, resMinute] = timeKey.split(':').map(Number);
                const [currHour, currMinute] = mmtTime.split(':').map(Number);
                if (currHour === resHour && currMinute >= resMinute && currMinute <= resMinute + 1) {
                    handleWriteToFirestore(timeKey, result.data);
                    break;
                }
            }
          }

        } else if (result.error) {
            if (!previousTwoDRef.current) {
                toast({
                  variant: 'destructive',
                  title: 'Live Data Failed',
                  description: result.error,
                });
            }
        }
        if (isLoading) {
            setIsLoading(false);
        }
      });
    };

    // Smart polling for data
    let timeoutId: NodeJS.Timeout;
    const smartFetch = () => {
        fetchData();
        
        const interval = getPollingInterval();
        if (interval !== null) {
            timeoutId = setTimeout(smartFetch, interval);
        } else {
             if (isLoading) setIsLoading(false);
             if (!previousTwoDRef.current) setLiveData(null);
        }
    };

    smartFetch();
    
    return () => {
        clearInterval(timer);
        clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleWriteToFirestore]);

  return (
    <Card className="w-full overflow-hidden text-center h-full">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">
          Live 2D Number
        </CardTitle>
        <CardDescription>
            {isLoading ? 'Connecting...' : (currentTime ? `Live from SET | ${currentTime}` : 'Market Closed')}
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
            <p className="text-muted-foreground">Market is currently closed.</p>
        )}
      </CardContent>
    </Card>
  );
}

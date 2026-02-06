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
import { Skeleton } from '../ui/skeleton';

type LiveData = {
    setIndex: string;
    value: string;
    twoD: string;
    lastUpdated: string;
}

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

    const RESULT_TIMES: Record<string, string> = {
        '11:00': 's11_00',
        '12:01': 's12_01',
        '16:30': 's16_30',
    };

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
  const [liveData, setLiveData] = useState<LiveData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState('');

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
          setLiveData(result.data);
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
             setLiveData(current => current || null);
        }
    };

    smartFetch();
    
    return () => {
        clearInterval(timer);
        clearTimeout(timeoutId);
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

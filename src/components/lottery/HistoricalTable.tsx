'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { DailyResult } from '@/app/types';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, limit, orderBy } from 'firebase/firestore';
import { useMemoFirebase } from '@/hooks/use-memo-firebase';
import { Skeleton } from '../ui/skeleton';
import { format } from 'date-fns';
import { formatDateToYyyyMmDd } from '@/lib/firebase/utils';
import { Loader2 } from 'lucide-react';


function ResultCell({ twoD }: { twoD?: string | null }) {
  if (!twoD) {
    return <span className="text-muted-foreground/60 text-sm">--</span>;
  }
  return <p className="font-bold tracking-wider text-center">{twoD}</p>;
}

export default function HistoricalTable() {
  const  firestore  = useFirestore();
  const [status, setStatus] = useState<'loading' | 'updated' | 'waiting'>('loading');
  const [statusMessage, setStatusMessage] = useState<string>('Loading results...');

  const resultsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'lottery_results'),
      orderBy('date', 'desc'),
      limit(20)
    );
  }, [firestore]);

  const { data: results, isLoading } = useCollection(resultsQuery);

  useEffect(() => {
    if (isLoading) {
      setStatus('loading');
      setStatusMessage('Loading results...');
      return;
    }

    if (!results || results.length === 0) {
      setStatus('waiting');
      setStatusMessage('Waiting for initial data from backend...');
      return;
    }

    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Yangon' }));
    const day = now.getDay();

    if (day === 0 || day === 6) {
      setStatus('updated');
      setStatusMessage('Market is closed. Results are up-to-date.');
      return;
    }

    const todayStr = formatDateToYyyyMmDd(now);
    const latestResultDay = results[0] as DailyResult;

    const sessions = [
      { key: 's11_00', name: '11:00 AM', hour: 11, minute: 0 },
      { key: 's12_01', name: '12:01 PM', hour: 12, minute: 1 },
      { key: 's15_00', name: '3:00 PM', hour: 15, minute: 0 },
      { key: 's16_30', name: '4:30 PM', hour: 16, minute: 30 },
    ];

    let lastExpectedSession: typeof sessions[0] | null = null;
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    // Determine the last session that should have a result
    for (const session of sessions) {
      const sessionMinutes = session.hour * 60 + session.minute;
      // Add a small buffer (e.g., 2 minutes) to wait for backend to write
      if (nowMinutes >= sessionMinutes + 2) {
        lastExpectedSession = session;
      }
    }
    
    if (!lastExpectedSession) {
      setStatus('updated');
      setStatusMessage('Results are up-to-date.');
      return;
    }
    
    if (latestResultDay.date !== todayStr || !latestResultDay[lastExpectedSession.key as keyof DailyResult]) {
        setStatus('waiting');
        setStatusMessage(`Waiting for ${lastExpectedSession.name} result from backend...`);
    } else {
        setStatus('updated');
        setStatusMessage('Results are up-to-date.');
    }
  }, [results, isLoading]);

  const renderContent = () => {
    if (isLoading) {
      return Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell className="p-2">
            <Skeleton className="h-5 w-24" />
          </TableCell>
          <TableCell className="p-2">
            <Skeleton className="mx-auto h-6 w-8" />
          </TableCell>
          <TableCell className="p-2">
            <Skeleton className="mx-auto h-6 w-8" />
          </TableCell>
          <TableCell className="p-2">
            <Skeleton className="mx-auto h-6 w-8" />
          </TableCell>
          <TableCell className="p-2">
            <Skeleton className="mx-auto h-6 w-8" />
          </TableCell>
        </TableRow>
      ));
    }

    if (!results || results.length === 0) {
      return (
        <TableRow>
          <TableCell
            colSpan={5}
            className="py-10 text-center text-muted-foreground"
          >
            No historical data found.
          </TableCell>
        </TableRow>
      );
    }

    return (results as DailyResult[]).map((result) => {
      const dateParts = (result.date as string).split('-');
      const date = new Date(
        parseInt(dateParts[0]),
        parseInt(dateParts[1]) - 1,
        parseInt(dateParts[2])
      );

      return (
        <TableRow key={result.id}>
          <TableCell className="p-2 text-center font-medium text-muted-foreground">
            <div>{format(date, 'dd/MM/yy')}</div>
            <div className="text-xs text-muted-foreground/80">({format(date, 'EEEE')})</div>
          </TableCell>
          <TableCell className="p-2">
            <ResultCell twoD={result.s11_00?.twoD} />
          </TableCell>
          <TableCell className="p-2">
            <ResultCell twoD={result.s12_01?.twoD} />
          </TableCell>
          <TableCell className="p-2">
            <ResultCell twoD={result.s15_00?.twoD} />
          </TableCell>
          <TableCell className="p-2">
            <ResultCell twoD={result.s16_30?.twoD} />
          </TableCell>
        </TableRow>
      );
    });
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Daily Results</CardTitle>
         <CardDescription className="flex items-center gap-2 text-xs">
            {status === 'loading' && <Loader2 className="h-3 w-3 animate-spin" />}
            {status === 'waiting' && <Loader2 className="h-3 w-3 animate-spin" />}
            <span>{statusMessage}</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative h-48 overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card">
              <TableRow>
                <TableHead className="text-center px-2">Date</TableHead>
                <TableHead className="text-center px-2">11:00</TableHead>
                <TableHead className="text-center px-2">12:01</TableHead>
                <TableHead className="text-center px-2">3:00</TableHead>
                <TableHead className="text-center px-2">4:30</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>{renderContent()}</TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

'use client';

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
import { History, Loader2 } from 'lucide-react';
import type { DailyResult, Result } from '@/app/types';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, limit, orderBy, where } from 'firebase/firestore';
import { useMemo } from 'react';
import { useMemoFirebase } from '@/hooks/use-memo-firebase';
import { formatDateToYyyyMmDd, getMondayOfCurrentWeek } from '@/lib/firebase/utils';
import { Skeleton } from '../ui/skeleton';

function ResultCell({ result }: { result?: Result }) {
  if (!result) {
    return <span className="text-muted-foreground">--</span>;
  }
  return (
    <div>
      <p className="font-bold tracking-widest text-primary text-lg">{result.twoD}</p>
      <p className="text-xs text-muted-foreground">SET: {result.set}</p>
      <p className="text-xs text-muted-foreground">Value: {result.value}</p>
    </div>
  );
}


export default function WeeklyHistory() {
  const { firestore } = useFirestore();

  const resultsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    const mondayDate = getMondayOfCurrentWeek();
    const mondayString = formatDateToYyyyMmDd(mondayDate);

    return query(
      collection(firestore, 'lotteryResults'),
      where('date', '>=', mondayString),
      orderBy('date', 'desc'),
      limit(5) // Max 5 weekdays
    );
  }, [firestore]);

  const { data: results, loading } = useCollection(resultsQuery);

  const sortedResults = useMemo(() => {
    if (!results) return [];
    // The query is already ordered by date desc, but we want asc for display
    return [...results].sort((a, b) => (a.date as string).localeCompare(b.date as string));
  }, [results]);
  
  const renderContent = () => {
    if (loading) {
      return Array.from({ length: 3 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-5 w-16" /></TableCell>
          <TableCell><Skeleton className="h-12 w-20" /></TableCell>
          <TableCell><Skeleton className="h-12 w-20" /></TableCell>
          <TableCell><Skeleton className="h-12 w-20" /></TableCell>
          <TableCell><Skeleton className="h-12 w-20" /></TableCell>
        </TableRow>
      ));
    }

    if (!results || results.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
            No historical data found in Firestore for this week.
          </TableCell>
        </TableRow>
      );
    }

    return sortedResults.map((result) => (
      <TableRow key={result.id}>
        <TableCell className="font-medium">{(result.date as string).substring(5)}</TableCell>
        <TableCell><ResultCell result={result.s11_00 as Result | undefined} /></TableCell>
        <TableCell><ResultCell result={result.s12_01 as Result | undefined} /></TableCell>
        <TableCell><ResultCell result={result.s15_00 as Result | undefined} /></TableCell>
        <TableCell><ResultCell result={result.s16_30 as Result | undefined} /></TableCell>
      </TableRow>
    ));
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0 rounded-lg bg-primary/10 p-3">
            <History className="h-8 w-8 text-primary" />
          </div>
          <div>
            <CardTitle className="font-headline text-2xl">
              Daily Results
            </CardTitle>
            <CardDescription>
              Winning numbers for each session from Firestore (MMT).
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Date</TableHead>
              <TableHead>11:00 AM</TableHead>
              <TableHead>12:01 PM</TableHead>
              <TableHead>3:00 PM</TableHead>
              <TableHead>4:30 PM</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {renderContent()}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

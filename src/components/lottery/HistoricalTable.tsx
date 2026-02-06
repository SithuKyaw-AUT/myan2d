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
import type { DailyResult } from '@/app/types';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, limit, orderBy } from 'firebase/firestore';
import { useMemoFirebase } from '@/hooks/use-memo-firebase';
import { Skeleton } from '../ui/skeleton';

function ResultCell({ twoD }: { twoD?: string | null }) {
  if (!twoD) {
    return <span className="text-muted-foreground/60 text-sm">--</span>;
  }
  return <p className="font-bold tracking-wider text-center">{twoD}</p>;
}

export default function HistoricalTable() {
  const  firestore  = useFirestore();

  const resultsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'lottery_results'),
      orderBy('date', 'desc'),
      limit(20)
    );
  }, [firestore]);

  const { data: results, isLoading } = useCollection(resultsQuery);

  const renderContent = () => {
    if (isLoading) {
      return Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell>
            <Skeleton className="h-5 w-16" />
          </TableCell>
          <TableCell>
            <Skeleton className="mx-auto h-6 w-8" />
          </TableCell>
          <TableCell>
            <Skeleton className="mx-auto h-6 w-8" />
          </TableCell>
          <TableCell>
            <Skeleton className="mx-auto h-6 w-8" />
          </TableCell>
          <TableCell>
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

    return (results as DailyResult[]).map((result) => (
      <TableRow key={result.id}>
        <TableCell className="font-medium text-muted-foreground">
          {(result.date as string).substring(5)}
        </TableCell>
        <TableCell>
          <ResultCell twoD={result.s11_00?.twoD} />
        </TableCell>
        <TableCell>
          <ResultCell twoD={result.s12_01?.twoD} />
        </TableCell>
        <TableCell>
          <ResultCell twoD={result.s15_00?.twoD} />
        </TableCell>
        <TableCell>
          <ResultCell twoD={result.s16_30?.twoD} />
        </TableCell>
      </TableRow>
    ));
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Daily Results</CardTitle>
        <CardDescription>
          Recent winning numbers from Firestore.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative h-[18rem] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card">
              <TableRow>
                <TableHead className="w-[80px]">Date</TableHead>
                <TableHead className="text-center">11:00 AM</TableHead>
                <TableHead className="text-center">12:01 PM</TableHead>
                <TableHead className="text-center">3:00 PM</TableHead>
                <TableHead className="text-center">4:30 PM</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>{renderContent()}</TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

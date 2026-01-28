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
import { History } from 'lucide-react';
import type { DailyResult, Result } from '@/app/types';

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


export default function WeeklyHistory({ data }: { data: DailyResult[] }) {
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
              Winning numbers for each session (MMT).
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
            {data.length > 0 ? (
              data.map((result) => (
                <TableRow key={result.date}>
                  <TableCell className="font-medium">{result.date}</TableCell>
                  <TableCell>
                    <ResultCell result={result.s11_00} />
                  </TableCell>
                  <TableCell>
                    <ResultCell result={result.s12_01} />
                  </TableCell>
                  <TableCell>
                    <ResultCell result={result.s15_00} />
                  </TableCell>
                  <TableCell>
                    <ResultCell result={result.s16_30} />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-10 text-center text-muted-foreground"
                >
                  Could not fetch historical data.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

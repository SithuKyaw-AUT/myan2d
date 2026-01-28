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
import type { DailyResult } from '@/app/types';

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
              Morning (12:30) and Evening (16:30) results for this week.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Date</TableHead>
              <TableHead>Morning</TableHead>
              <TableHead>Evening</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length > 0 ? (
              data.map((result) => (
                <TableRow key={result.date}>
                  <TableCell className="font-medium">{result.date}</TableCell>
                  <TableCell>
                    {result.morning ? (
                        <div>
                            <p className="font-bold tracking-widest text-primary text-lg">{result.morning.twoD}</p>
                            <p className="text-xs text-muted-foreground">SET: {result.morning.set}</p>
                        </div>
                    ) : (
                        <span className="text-muted-foreground">--</span>
                    )}
                  </TableCell>
                  <TableCell>
                  {result.evening ? (
                        <div>
                            <p className="font-bold tracking-widest text-primary text-lg">{result.evening.twoD}</p>
                            <p className="text-xs text-muted-foreground">SET: {result.evening.set}</p>
                        </div>
                    ) : (
                        <span className="text-muted-foreground">--</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={3}
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

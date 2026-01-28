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

type WeeklyData = {
  id: string;
  date: string;
  time: string;
  number: string;
};

export default function WeeklyHistory({ data }: { data: WeeklyData[] }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0 rounded-lg bg-primary/10 p-3">
            <History className="h-8 w-8 text-primary" />
          </div>
          <div>
            <CardTitle className="font-headline text-2xl">
              This Week's History
            </CardTitle>
            <CardDescription>
              Lottery results from Monday until now, fetched by AI.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Time</TableHead>
              <TableHead className="text-right">Number</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length > 0 ? (
              data.map((result) => (
                <TableRow key={result.id}>
                  <TableCell className="font-medium">{result.date}</TableCell>
                  <TableCell>{result.time}</TableCell>
                  <TableCell className="text-right font-bold tracking-widest text-primary">
                    {result.number}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="py-10 text-center text-muted-foreground"
                >
                  Could not fetch data for this week.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

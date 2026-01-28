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
import { History } from 'lucide-react';
import { startOfWeek, eachDayOfInterval, format, set } from 'date-fns';

type WeeklyData = {
  id: string;
  date: string;
  time: string;
  number: string;
};

// Generate a consistent, pseudo-random number for a given day and time
const getStableNumberForDay = (day: Date, time: 'morning' | 'evening') => {
  // Simple pseudo-random number generator based on the date and time
  const seed = day.getTime() + (time === 'morning' ? 0 : 1);
  const x = Math.sin(seed) * 10000;
  const random = x - Math.floor(x);
  return Math.floor(random * 100)
    .toString()
    .padStart(2, '0');
};

export default function WeeklyHistory() {
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);

  useEffect(() => {
    const now = new Date();
    // Using weekStartsOn: 1 to set Monday as the start of the week.
    const startOfThisWeek = startOfWeek(now, { weekStartsOn: 1 });

    const days = eachDayOfInterval({ start: startOfThisWeek, end: now });

    const mockData = days
      .flatMap((day) => {
        const morningTime = set(day, {
          hours: 12,
          minutes: 1,
          seconds: 0,
          milliseconds: 0,
        });
        const eveningTime = set(day, {
          hours: 16,
          minutes: 31,
          seconds: 0,
          milliseconds: 0,
        });

        const results: WeeklyData[] = [];

        if (now >= morningTime) {
          results.push({
            id: `morning-${format(day, 'yyyy-MM-dd')}`,
            date: format(day, 'EEE, MMM d'),
            time: '12:01 PM',
            number: getStableNumberForDay(day, 'morning'),
          });
        }

        if (now >= eveningTime) {
          results.push({
            id: `evening-${format(day, 'yyyy-MM-dd')}`,
            date: format(day, 'EEE, MMM d'),
            time: '04:31 PM',
            number: getStableNumberForDay(day, 'evening'),
          });
        }

        return results;
      })
      .reverse();

    setWeeklyData(mockData);
  }, []);

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
              Lottery results from Monday until now.
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
            {weeklyData.length > 0 ? (
              weeklyData.map((result) => (
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
                  No data available for this week yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

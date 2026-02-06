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
import { historicalData } from '@/lib/historical-data';

function ResultCell({ twoD }: { twoD?: string | null }) {
  if (!twoD) {
    return <span className="text-muted-foreground/60 text-sm">--</span>;
  }
  return <p className="font-bold tracking-wider text-center">{twoD}</p>;
}

export default function HistoricalTable() {
  // Use the local data, showing the first 7 days to keep the UI consistent.
  const results = historicalData.slice(0, 7);

  const renderContent = () => {
    if (!results || results.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
            No historical data available.
          </TableCell>
        </TableRow>
      );
    }

    // The data is already sorted by date descending in the source file.
    return (results as Omit<DailyResult, 'id'>[]).map((result) => (
      <TableRow key={result.date}>
        <TableCell className="font-medium text-muted-foreground">{(result.date as string).substring(5)}</TableCell>
        <TableCell><ResultCell twoD={result.s11_00?.twoD} /></TableCell>
        <TableCell><ResultCell twoD={result.s12_01?.twoD} /></TableCell>
        <TableCell><ResultCell twoD={result.s15_00?.twoD} /></TableCell>
        <TableCell><ResultCell twoD={result.s16_30?.twoD} /></TableCell>
      </TableRow>
    ));
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">
          Daily Results
        </CardTitle>
        <CardDescription>
          Recent winning numbers from local data.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Date</TableHead>
              <TableHead className="text-center">11:00 AM</TableHead>
              <TableHead className="text-center">12:01 PM</TableHead>
              <TableHead className="text-center">3:00 PM</TableHead>
              <TableHead className="text-center">4:30 PM</TableHead>
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

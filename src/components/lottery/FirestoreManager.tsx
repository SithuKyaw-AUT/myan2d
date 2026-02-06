'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Database } from 'lucide-react';
import { useFirestore } from '@/firebase';
import { writeBatch, collection, doc } from 'firebase/firestore';
import type { DailyResult, Result } from '@/app/types';

// The JSON data provided by the user
const historicalData = `[{ "child": [{ "time": "11:00:00", "set": "1,342.01", "value": "25,336.04", "twod": "16", "history_id": "2434757" }, { "time": "12:01:00", "set": "1,338.91", "value": "32,345.64", "twod": "15", "history_id": "2435189" }, { "time": "15:00:00", "set": "1,346.55", "value": "46,594.00", "twod": "54", "history_id": "2436187" }, { "time": "16:30:00", "set": "1,346.23", "value": "57,388.58", "twod": "38", "history_id": "2436633" }], "date": "2026-02-05" }, { "child": [{ "time": "11:00:00", "set": "1,343.42", "value": "25,736.61", "twod": "26", "history_id": "2432215" }, { "time": "12:01:00", "set": "1,342.21", "value": "31,826.76", "twod": "16", "history_id": "2432647" }, { "time": "15:00:00", "set": "1,343.62", "value": "41,468.93", "twod": "28", "history_id": "2433663" }, { "time": "16:30:00", "set": "1,346.54", "value": "53,300.82", "twod": "40", "history_id": "2434107" }], "date": "2026-02-04" }, { "child": [{ "time": "11:00:00", "set": "1,344.93", "value": "26,813.75", "twod": "33", "history_id": "2429675" }, { "time": "12:01:00", "set": "1,345.49", "value": "32,509.22", "twod": "99", "history_id": "2430100" }, { "time": "15:00:00", "set": "1,335.16", "value": "45,491.98", "twod": "61", "history_id": "2431100" }, { "time": "16:30:00", "set": "1,336.11", "value": "57,100.78", "twod": "10", "history_id": "2431545" }], "date": "2026-02-03" }, { "child": [{ "time": "11:00:00", "set": "1,317.37", "value": "18,238.40", "twod": "78", "history_id": "2427129" }, { "time": "12:01:00", "set": "1,315.05", "value": "22,159.61", "twod": "59", "history_id": "2427563" }, { "time": "15:00:00", "set": "1,316.80", "value": "33,617.38", "twod": "07", "history_id": "2428582" }, { "time": "16:30:00", "set": "1,321.42", "value": "43,545.17", "twod": "25", "history_id": "2429034" }], "date": "2026-02-02" }, { "child": [{ "time": "11:00:00", "set": "1,323.34", "value": "18,069.09", "twod": "49", "history_id": "2424610" }, { "time": "12:01:00", "set": "1,326.05", "value": "22,080.77", "twod": "50", "history_id": "2425047" }, { "time": "15:00:00", "set": "1,326.99", "value": "30,895.64", "twod": "95", "history_id": "2426045" }, { "time": "16:30:00", "set": "1,325.62", "value": "46,898.74", "twod": "28", "history_id": "2426485" }], "date": "2026-01-30" }, { "child": [{ "time": "11:00:00", "set": "1,332.81", "value": "19,986.64", "twod": "16", "history_id": "2422086" }, { "time": "12:01:00", "set": "1,336.08", "value": "26,767.23", "twod": "87", "history_id": "2422530" }, { "time": "15:00:00", "set": "1,332.70", "value": "41,407.67", "twod": "07", "history_id": "2423527" }, { "time": "16:30:00", "set": "1,331.07", "value": "51,753.59", "twod": "73", "history_id": "2423970" }], "date": "2026-01-29" }, { "child": [{ "time": "11:00:00", "set": "1,335.89", "value": "16,551.94", "twod": "91", "history_id": "2419579" }, { "time": "12:01:00", "set": "1,337.06", "value": "22,520.47", "twod": "60", "history_id": "2420001" }, { "time": "15:00:00", "set": "1,338.82", "value": "34,783.28", "twod": "23", "history_id": "2420991" }, { "time": "16:30:00", "set": "1,338.90", "value": "44,733.10", "twod": "03", "history_id": "2421441" }], "date": "2026-01-28" }, { "child": [{ "time": "11:00:00", "set": "1,333.08", "value": "26,548.17", "twod": "88", "history_id": "2417082" }, { "time": "12:01:00", "set": "1,330.45", "value": "31,114.48", "twod": "54", "history_id": "2417505" }, { "time": "15:00:00", "set": "1,332.59", "value": "41,184.82", "twod": "94", "history_id": "2418470" }, { "time": "16:30:00", "set": "1,334.45", "value": "54,241.97", "twod": "51", "history_id": "2418922" }], "date": "2026-01-27" }, { "child": [{ "time": "11:00:00", "set": "1,310.74", "value": "16,747.52", "twod": "47", "history_id": "2414588" }, { "time": "12:01:00", "set": "1,310.27", "value": "22,250.93", "twod": "70", "history_id": "2415027" }, { "time": "15:00:00", "set": "1,308.02", "value": "33,781.14", "twod": "21", "history_id": "2415962" }, { "time": "16:30:00", "set": "1,307.07", "value": "42,712.69", "twod": "72", "history_id": "2416420" }], "date": "2026-01-26" }, { "child": [{ "time": "11:00:00", "set": "1,318.71", "value": "23,427.64", "twod": "17", "history_id": "2412061" }, { "time": "12:01:00", "set": "1,319.64", "value": "28,793.73", "twod": "43", "history_id": "2412499" }, { "time": "15:00:00", "set": "1,314.74", "value": "39,477.10", "twod": "47", "history_id": "2413482" }, { "time": "16:30:00", "set": "1,314.39", "value": "50,901.86", "twod": "91", "history_id": "2413928" }], "date": "2026-01-23" }, { "child": [{ "time": "11:00:00", "set": "1,324.08", "value": "26,070.98", "twod": "80", "history_id": "2409600" }, { "time": "12:01:00", "set": "1,321.94", "value": "31,452.09", "twod": "42", "history_id": "2410027" }, { "time": "15:00:00", "set": "1,311.66", "value": "53,744.60", "twod": "64", "history_id": "2410980" }, { "time": "16:30:00", "set": "1,311.64", "value": "72,724.01", "twod": "44", "history_id": "2411430" }], "date": "2026-01-22" }, { "child": [{ "time": "11:00:00", "set": "1,312.88", "value": "31,606.20", "twod": "86", "history_id": "2407087" }, { "time": "12:01:00", "set": "1,315.37", "value": "37,381.33", "twod": "71", "history_id": "2407521" }, { "time": "15:00:00", "set": "1,317.39", "value": "53,163.43", "twod": "93", "history_id": "2408483" }, { "time": "16:30:00", "set": "1,317.56", "value": "68,148.65", "twod": "68", "history_id": "2408941" }], "date": "2026-01-21" }, { "child": [{ "time": "11:00:00", "set": "1,300.08", "value": "21,339.68", "twod": "89", "history_id": "2404557" }, { "time": "12:01:00", "set": "1,301.83", "value": "28,751.44", "twod": "31", "history_id": "2405000" }, { "time": "15:00:00", "set": "1,299.00", "value": "41,773.63", "twod": "03", "history_id": "2405980" }, { "time": "16:30:00", "set": "1,296.37", "value": "52,626.54", "twod": "76", "history_id": "2406413" }], "date": "2026-01-20" }, { "child": [{ "time": "11:00:00", "set": "1,279.99", "value": "14,365.98", "twod": "95", "history_id": "2402098" }, { "time": "12:01:00", "set": "1,280.44", "value": "17,355.28", "twod": "45", "history_id": "2402534" }, { "time": "15:00:00", "set": "1,285.09", "value": "27,642.00", "twod": "92", "history_id": "2403470" }, { "time": "16:30:00", "set": "1,283.20", "value": "36,145.56", "twod": "05", "history_id": "2403922" }], "date": "2026-01-19" }, { "child": [{ "time": "11:00:00", "set": "1,265.07", "value": "16,625.27", "twod": "75", "history_id": "2399609" }, { "time": "12:01:00", "set": "1,264.77", "value": "22,172.13", "twod": "72", "history_id": "2400042" }, { "time": "15:00:00", "set": "1,275.54", "value": "34,216.55", "twod": "46", "history_id": "2400995" }, { "time": "16:30:00", "set": "1,275.60", "value": "45,773.52", "twod": "03", "history_id": "2401434" }], "date": "2026-01-16" }, { "child": [{ "time": "11:00:00", "set": "1,253.30", "value": "17,154.90", "twod": "04", "history_id": "2397111" }, { "time": "12:01:00", "set": "1,252.00", "value": "23,154.71", "twod": "04", "history_id": "2397552" }, { "time": "15:00:00", "set": "1,260.21", "value": "33,637.38", "twod": "17", "history_id": "2398510" }, { "time": "16:30:00", "set": "1,261.39", "value": "44,226.33", "twod": "96", "history_id": "2398950" }], "date": "2026-01-15" }, { "child": [{ "time": "11:00:00", "set": "1,244.94", "value": "18,818.82", "twod": "48", "history_id": "2394590" }, { "time": "12:01:00", "set": "1,244.92", "value": "22,678.53", "twod": "28", "history_id": "2395023" }, { "time": "15:00:00", "set": "1,244.76", "value": "29,620.57", "twod": "60", "history_id": "2396010" }, { "time": "16:30:00", "set": "1,244.30", "value": "39,177.88", "twod": "07", "history_id": "2396461" }], "date": "2026-01-14" }, { "child": [{ "time": "11:00:00", "set": "1,238.17", "value": "14,429.90", "twod": "79", "history_id": "2392142" }, { "time": "12:01:00", "set": "1,236.57", "value": "20,023.47", "twod": "73", "history_id": "2392564" }, { "time": "15:00:00", "set": "1,232.71", "value": "27,433.68", "twod": "13", "history_id": "2393532" }, { "time": "16:30:00", "set": "1,235.30", "value": "37,421.21", "twod": "01", "history_id": "2393974" }], "date": "2026-01-13" }, { "child": [{ "time": "11:00:00", "set": "1,243.80", "value": "16,201.03", "twod": "01", "history_id": "2389664" }, { "time": "12:01:00", "set": "1,248.32", "value": "20,904.31", "twod": "24", "history_id": "2390089" }, { "time": "15:00:00", "set": "1,246.08", "value": "26,576.98", "twod": "86", "history_id": "2391054" }, { "time": "16:30:00", "set": "1,242.20", "value": "34,141.60", "twod": "01", "history_id": "2391509" }], "date": "2026-01-12" }, { "child": [{ "time": "11:00:00", "set": "1,260.70", "value": "12,689.06", "twod": "09", "history_id": "2387195" }, { "time": "12:01:00", "set": "1,260.64", "value": "16,405.16", "twod": "45", "history_id": "2387626" }, { "time": "15:00:00", "set": "1,253.96", "value": "24,535.73", "twod": "65", "history_id": "2388577" }, { "time": "16:30:00", "set": "1,254.09", "value": "32,668.65", "twod": "98", "history_id": "2389015" }], "date": "2026-01-09" }, { "child": [{ "time": "11:00:00", "set": "1,265.57", "value": "24,182.21", "twod": "72", "history_id": "2384720" }, { "time": "12:01:00", "set": "1,262.97", "value": "29,510.75", "twod": "70", "history_id": "2385154" }, { "time": "15:00:00", "set": "1,260.20", "value": "37,776.59", "twod": "06", "history_id": "2386100" }, { "time": "16:30:00", "set": "1,253.60", "value": "48,218.82", "twod": "08", "history_id": "2386543" }], "date": "2026-01-08" }, { "child": [{ "time": "11:00:00", "set": "1,276.51", "value": "17,078.02", "twod": "18", "history_id": "2382235" }, { "time": "12:01:00", "set": "1,274.91", "value": "21,335.80", "twod": "15", "history_id": "2382665" }, { "time": "15:00:00", "set": "1,277.97", "value": "29,502.30", "twod": "72", "history_id": "2383628" }, { "time": "16:30:00", "set": "1,280.82", "value": "38,904.23", "twod": "24", "history_id": "2384078" }], "date": "2026-01-07" }]`;

export default function FirestoreManager() {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const { firestore } = useFirestore();

  const handlePopulate = async () => {
    startTransition(async () => {
      if (!firestore) {
        toast({
            variant: 'destructive',
            title: 'Import Failed',
            description: 'Firestore is not initialized.',
        });
        return;
      }

      toast({ title: 'Starting Import', description: 'Importing provided data into Firestore...' });
      
      try {
        const batch = writeBatch(firestore);
        const resultsCollection = collection(firestore, 'lotteryResults');

        const data: { date: string; child: { time: string; set: string; value: string; twod: string }[] }[] = JSON.parse(historicalData);

        let successfulImports = 0;

        for (const day of data) {
            const docId = day.date;
            const docRef = doc(resultsCollection, docId);

            const dailyData: DailyResult = {
                date: docId,
                s11_00: null,
                s12_01: null,
                s15_00: null,
                s16_30: null,
            };

            let hasData = false;
            for (const result of day.child) {
                const resultObj: Result = {
                    set: result.set,
                    value: result.value,
                    twoD: result.twod,
                };
                hasData = true;
                switch (result.time) {
                    case '11:00:00':
                        dailyData.s11_00 = resultObj;
                        break;
                    case '12:01:00':
                        dailyData.s12_01 = resultObj;
                        break;
                    case '15:00:00':
                        dailyData.s15_00 = resultObj;
                        break;
                    case '16:30:00':
                        dailyData.s16_30 = resultObj;
                        break;
                }
            }

            if (hasData) {
                batch.set(docRef, dailyData);
                successfulImports++;
            }
        }

        if (successfulImports > 0) {
            await batch.commit();
        }

        toast({
            title: 'Import Successful',
            description: `Successfully imported ${successfulImports} days of data.`,
        });

      } catch (error: any) {
        console.error('Failed to populate Firestore from data:', error);
        toast({
            variant: 'destructive',
            title: 'Import Failed',
            description: error.message || 'An unexpected error occurred during import.',
        });
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Firestore Database Manager</CardTitle>
        <CardDescription>Use this to perform a one-time import of the provided historical data.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <Database className="h-8 w-8 text-muted-foreground" />
          <div className='flex-1'>
            <p className='font-medium'>One-Time Data Import</p>
            <p className="text-sm text-muted-foreground">
             This will import the JSON data you provided directly into Firestore.
            </p>
          </div>
           <Button onClick={handlePopulate} disabled={isPending}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
            {isPending ? 'Importing...' : 'Populate Firestore from Data'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

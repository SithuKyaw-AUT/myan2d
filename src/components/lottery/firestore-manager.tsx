'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Database } from 'lucide-react';
import { useFirestore } from '@/firebase';
import { doc, writeBatch } from 'firebase/firestore';
import { formatDateToYyyyMmDd } from '@/lib/firebase/utils';
import type { DailyResult } from '@/app/types';

export default function FirestoreManager() {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const { firestore } = useFirestore();

  const populateFirestore = async () => {
    if (!firestore) {
      toast({
        variant: 'destructive',
        title: 'Firestore not available',
        description: 'Please check your Firebase configuration.',
      });
      return;
    }

    startTransition(async () => {
      try {
        toast({ title: 'Starting Import', description: 'Fetching historical data from API...' });
        
        const response = await fetch('https://api.thaistock2d.com/history', { cache: 'no-store' });
        if (!response.ok) {
          throw new Error(`API request failed: ${response.statusText}`);
        }
        
        const history = await response.json();
        if (!Array.isArray(history)) {
          throw new Error('Invalid data format from history API.');
        }

        const batch = writeBatch(firestore);
        let count = 0;

        history.forEach((day: any) => {
          if (day.date && (day.morning || day.evening)) {
            const date = new Date(day.date);
            const docId = formatDateToYyyyMmDd(date);
            const docRef = doc(firestore, 'lotteryResults', docId);

            const dailyData: Partial<DailyResult> = { date: docId };

            if (day.morning && day.morning.number) {
              dailyData.s12_01 = { set: day.morning.set, value: day.morning.value, twoD: day.morning.number };
              dailyData.s15_00 = dailyData.s12_01; // Copy to 3:00 PM slot
            }
            if (day.evening && day.evening.number) {
              dailyData.s16_30 = { set: day.evening.set, value: day.evening.value, twoD: day.evening.number };
            }
            
            batch.set(docRef, dailyData, { merge: true });
            count++;
          }
        });

        if (count > 0) {
          await batch.commit();
          toast({
            title: 'Import Successful',
            description: `${count} days of historical data have been saved to Firestore.`,
          });
        } else {
          toast({
            variant: 'destructive',
            title: 'No Data to Import',
            description: 'Could not find any historical data to import.',
          });
        }
      } catch (error: any) {
        console.error("Firestore population error:", error);
        toast({
          variant: 'destructive',
          title: 'Import Failed',
          description: error.message || 'An unknown error occurred.',
        });
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Firestore Database</CardTitle>
        <CardDescription>Manage your lottery result data storage.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <Database className="h-8 w-8 text-muted-foreground" />
          <div className='flex-1'>
            <p className='font-medium'>One-Time Data Import</p>
            <p className="text-sm text-muted-foreground">
              Fetches all available historical data from the API and saves it to your Firestore database. This should only be done once.
            </p>
          </div>
           <Button onClick={populateFirestore} disabled={isPending}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
            {isPending ? 'Importing...' : 'Populate Firestore'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

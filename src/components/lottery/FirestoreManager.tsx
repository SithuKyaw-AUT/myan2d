'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Database } from 'lucide-react';
import { useFirestore } from '@/firebase';
import { collection, doc, writeBatch } from 'firebase/firestore';
import { historicalData } from '@/lib/historical-data';

export default function FirestoreManager() {
  const [isImporting, setIsImporting] = useState(false);
  const { toast } = useToast();
  const { firestore } = useFirestore();

  const handlePopulate = async () => {
    setIsImporting(true);
    if (!firestore) {
      toast({
        variant: 'destructive',
        title: 'Import Failed',
        description: 'Firestore is not initialized. Please refresh the page.',
      });
      setIsImporting(false);
      return;
    }

    try {
      const batch = writeBatch(firestore);
      const resultsCollection = collection(firestore, 'lotteryResults');

      historicalData.forEach((day) => {
        const docRef = doc(resultsCollection, day.date);
        batch.set(docRef, day);
      });

      await batch.commit();

      toast({
        title: 'Import Successful',
        description: `Successfully imported ${historicalData.length} days of data. The historical table should now be populated.`,
      });

    } catch (error: any) {
      console.error('Failed to populate Firestore from data:', error);
      toast({
        variant: 'destructive',
        title: 'Import Failed',
        description: error.message || 'An unexpected error occurred during import. Check the browser console for details.',
      });
    } finally {
      setIsImporting(false);
    }
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
           <Button onClick={handlePopulate} disabled={isImporting}>
            {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
            {isImporting ? 'Importing...' : 'Populate Firestore from Data'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

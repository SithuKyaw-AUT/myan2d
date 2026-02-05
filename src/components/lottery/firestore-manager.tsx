'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Database } from 'lucide-react';
import { populateFirestoreFromApi } from '@/app/actions';


export default function FirestoreManager() {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handlePopulate = async () => {
    startTransition(async () => {
      toast({ title: 'Starting Import', description: 'Fetching historical data from API...' });
      const result = await populateFirestoreFromApi();
      if (result.success) {
        toast({
            title: 'Import Successful',
            description: result.message,
        });
      } else {
        toast({
            variant: 'destructive',
            title: 'Import Failed',
            description: result.error,
        });
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Firestore Database Manager</CardTitle>
        <CardDescription>Use this to perform a one-time import of historical data.</CardDescription>
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
           <Button onClick={handlePopulate} disabled={isPending}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
            {isPending ? 'Importing...' : 'Populate Firestore'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

'use client';

import { useState, useTransition, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Calendar, Loader2 } from 'lucide-react';
import { handleUpdate } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';

export default function CurrentNumber() {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const [currentNumber, setCurrentNumber] = useState<string>('--');

  useEffect(() => {
    // Set initial random number on client mount to avoid hydration mismatch
    setCurrentNumber(Math.floor(Math.random() * 100).toString().padStart(2, '0'));
  }, []);

  const onUpdate = () => {
    startTransition(async () => {
      const result = await handleUpdate();
      if (result.success) {
        toast({
          title: 'Update Initiated',
          description: result.message,
        });
        // Simulate fetching a new number for demonstration
        setCurrentNumber(
          Math.floor(Math.random() * 100)
            .toString()
            .padStart(2, '0')
        );
      } else {
        toast({
          variant: 'destructive',
          title: 'Update Failed',
          description: result.error,
        });
      }
    });
  };

  return (
    <Card className="w-full overflow-hidden text-center">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Today's 2D Number</CardTitle>
        <CardDescription>The most recent official result.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative inline-block">
          <div className="text-8xl font-bold font-headline text-primary tracking-widest lg:text-9xl">
            {currentNumber}
          </div>
          <div className="absolute -top-2 -left-2 h-10 w-10 animate-pulse rounded-full bg-accent/20 -z-10"></div>
          <div className="absolute -bottom-2 -right-2 h-16 w-16 animate-pulse rounded-full bg-primary/20 -z-10 delay-500"></div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-center bg-muted/50 p-4">
        <Button onClick={onUpdate} disabled={isPending}>
          {isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Calendar className="mr-2 h-4 w-4" />
          )}
          {isPending ? 'Updating...' : "Update Today's Number"}
        </Button>
      </CardFooter>
    </Card>
  );
}

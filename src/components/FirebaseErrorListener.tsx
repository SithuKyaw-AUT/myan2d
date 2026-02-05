'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import type { FirestorePermissionError } from '@/firebase/errors';
import { useToast } from '@/hooks/use-toast';

// This is a client-side component that listens for Firestore permission errors
// and displays them as a toast notification. This is useful for debugging
// security rules in a development environment.
// NOTE: This should be disabled in production.
export function FirebaseErrorListener() {
  const { toast } = useToast();

  useEffect(() => {
    const handleError = (error: FirestorePermissionError) => {
      console.error('Firestore Permission Error:', error.toContextObject());
      toast({
        variant: 'destructive',
        title: 'Firestore Permission Error',
        description: (
          <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
            <code className="text-white">
              {JSON.stringify(error.toContextObject(), null, 2)}
            </code>
          </pre>
        ),
      });
    };

    const unsubscribe = errorEmitter.on('permission-error', handleError);

    return () => {
      unsubscribe();
    };
  }, [toast]);

  return null;
}

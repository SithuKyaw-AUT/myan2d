'use client';
import { useEffect, useState, useRef } from 'react';
import { onSnapshot, queryEqual, type Query, type DocumentData } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export function useCollection<T extends DocumentData>(query: Query<T> | null) {
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const queryRef = useRef<Query<T> | null>(null);

  useEffect(() => {
    if (query === null) {
      setData(null);
      setLoading(false);
      return;
    }
    
    // Check if query has changed
    if (queryRef.current && queryEqual(queryRef.current, query)) {
      return;
    }

    queryRef.current = query;
    setLoading(true);

    const unsubscribe = onSnapshot(
      query,
      (snapshot) => {
        const docs = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        setData(docs as T[]);
        setLoading(false);
      },
      (err) => {
        console.error(err);
        const permissionError = new FirestorePermissionError({
          path: 'collection', // Path is not available on collection listener errors
          operation: 'list',
        });
        errorEmitter.emit('permission-error', permissionError);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [query]);

  return { data, loading, error };
}

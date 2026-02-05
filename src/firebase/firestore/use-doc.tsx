'use client';
import { useEffect, useState, useRef } from 'react';
import { onSnapshot, docEqual, type DocumentReference, type DocumentData } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export function useDoc<T extends DocumentData>(ref: DocumentReference<T> | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const refRef = useRef<DocumentReference<T> | null>(null);

  useEffect(() => {
    if (ref === null) {
      setData(null);
      setLoading(false);
      return;
    }
    
    if (refRef.current && docEqual(refRef.current, ref)) {
        return;
    }
    
    refRef.current = ref;
    setLoading(true);

    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        if (snapshot.exists()) {
          const docData = { ...snapshot.data(), id: snapshot.id };
          setData(docData as T);
        } else {
          setData(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error(err);
        const permissionError = new FirestorePermissionError({
          path: ref.path,
          operation: 'get',
        });
        errorEmitter.emit('permission-error', permissionError);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [ref]);

  return { data, loading, error };
}

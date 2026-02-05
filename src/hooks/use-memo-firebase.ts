'use client';

import { useMemo, useRef, type DependencyList } from 'react';
import { isEqual } from 'lodash';
import { queryEqual, refEqual, type Query, type DocumentReference } from 'firebase/firestore';

function useDeepCompareMemo(value: DependencyList): DependencyList {
  const ref = useRef<DependencyList>();

  if (!deepCompareEquals(value, ref.current)) {
    ref.current = value;
  }

  return ref.current!;
}

function deepCompareEquals(a: DependencyList | undefined, b: DependencyList | undefined): boolean {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;

  return a.every((dep, i) => {
    const otherDep = b[i];

    if (dep === otherDep) return true;
    if (dep === null || otherDep === null) return false;


    // Firestore Query check
    if (typeof dep === 'object' && '_query' in dep) {
      return typeof otherDep === 'object' && '_query' in otherDep && queryEqual(dep as Query, otherDep as Query);
    }
    // Firestore DocumentReference check
    if (typeof dep === 'object' && 'path' in dep) {
      return typeof otherDep === 'object' && 'path' in otherDep && refEqual(dep as DocumentReference, otherDep as DocumentReference);
    }

    // Generic deep equality check
    return isEqual(dep, otherDep);
  });
}


export function useMemoFirebase<T>(
  factory: () => T,
  deps: DependencyList | undefined
): T {
  const memoizedDeps = useDeepCompareMemo(deps || []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(factory, memoizedDeps);
}

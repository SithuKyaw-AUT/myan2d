'use client';

import { useMemo, type DependencyList } from 'react';
import { isEqual } from 'lodash';
import { queryEqual, refEqual } from 'firebase/firestore';

// Custom deep comparison hook for memoizing Firebase queries and references.
// Standard useMemo uses Object.is for comparison, which won't work for
// complex objects like Firebase queries that are recreated on each render.
function useDeepCompareMemoize(value: DependencyList) {
  const ref = React.useRef<DependencyList>([]);

  if (
    !value.every((item, i) => {
      const prevItem = ref.current[i];
      if (item && typeof item === 'object' && 'isEqual' in item && typeof item.isEqual === 'function') {
        return item.isEqual(prevItem);
      }
      if (item && typeof item === 'object' && '_query' in item) { // This is a Query
        return prevItem && queryEqual(item as any, prevItem as any);
      }
       if (item && typeof item === 'object' && 'path' in item) { // This is a DocumentReference
        return prevItem && refEqual(item as any, prevItem as any);
      }
      return isEqual(item, prevItem);
    })
  ) {
    ref.current = value;
  }

  return ref.current;
}

export function useMemoFirebase<T>(
  factory: () => T,
  deps: DependencyList | undefined
): T {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(factory, useDeepCompareMemoize(deps || []));
}

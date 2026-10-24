import { useCallback, type Ref, type RefCallback } from 'react';

function assignRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (typeof ref === 'function') return ref(value);
  if (ref) ref.current = value;
}

/** One callback ref that feeds several refs, e.g. the caller's ref and the spotlight. */
export function useMergedRefs<T>(...refs: Array<Ref<T> | undefined>): RefCallback<T> {
  return useCallback((value: T | null) => {
    const cleanups = refs.map((ref) => assignRef(ref, value));
    return () => {
      refs.forEach((ref, index) => {
        const cleanup = cleanups[index];
        if (typeof cleanup === 'function') cleanup();
        else assignRef(ref, null);
      });
    };
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- the refs are the dependencies
  }, refs);
}

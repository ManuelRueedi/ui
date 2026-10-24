import { useCallback, useRef, useState } from 'react';

/**
 * State that a parent can own (value + onChange) or leave to the component (defaultValue).
 * Mirrors Svelte's `bind:` props from messen.app.
 */
export function useControllableState<T>(
  value: T | undefined,
  defaultValue: T,
  onChange?: (next: T) => void,
): [T, (next: T) => void] {
  const [inner, setInner] = useState(defaultValue);
  const controlled = value !== undefined;
  const current = controlled ? value : inner;
  const latest = useRef({ current, controlled, onChange });
  latest.current = { current, controlled, onChange };

  const set = useCallback((next: T) => {
    if (Object.is(next, latest.current.current)) return;
    if (!latest.current.controlled) setInner(next);
    latest.current.onChange?.(next);
  }, []);

  return [current, set];
}

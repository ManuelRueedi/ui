import { useCallback, useEffect, useRef, type RefCallback } from 'react';
import { spotlight, type SpotlightOptions } from './spotlight';

type Controller = ReturnType<typeof spotlight>;

/**
 * The dotted spotlight that follows the pointer and pulses on press.
 * Returns a ref for the surface element; options can change between renders.
 */
export function useSpotlight<T extends HTMLElement>(
  options: SpotlightOptions = {},
): RefCallback<T> {
  const controller = useRef<Controller | null>(null);
  const latest = useRef(options);
  latest.current = options;
  const { disabled, focus, keyboard, pulse } = options;

  const ref = useCallback((node: T | null) => {
    if (!node) return;
    const current = spotlight(node, latest.current);
    controller.current = current;
    return () => {
      current.destroy();
      if (controller.current === current) controller.current = null;
    };
  }, []);

  useEffect(() => {
    controller.current?.update({ disabled, focus, keyboard, pulse });
  }, [disabled, focus, keyboard, pulse]);

  return ref;
}

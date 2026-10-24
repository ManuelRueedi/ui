import { useEffect, useRef, type ChangeEvent, type InputHTMLAttributes, type Ref } from 'react';
import { cx } from '../../internal/cx';
import { prefersReducedMotion } from '../../internal/reducedMotion';
import { useMergedRefs } from '../../internal/refs';
import { useSpotlight } from '../../internal/useSpotlight';
import styles from './Checkbox.module.css';

export type CheckboxProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'children' | 'size'
> & {
  label: string;
  hideLabel?: boolean;
  /** Shows a dash, for a group where only some items are checked. */
  indeterminate?: boolean;
  /** A switch turns something on or off at once; the label comes first and the switch sits at the end of the row. */
  variant?: 'box' | 'switch';
  ref?: Ref<HTMLInputElement>;
};

export function Checkbox({
  label,
  hideLabel = false,
  indeterminate = false,
  disabled = false,
  variant = 'box',
  className,
  onChange,
  ref: forwardedRef,
  ...rest
}: CheckboxProps) {
  const input = useRef<HTMLInputElement>(null);
  const box = useRef<HTMLSpanElement>(null);
  const ripple = useRef<HTMLSpanElement>(null);
  const animations = useRef<Animation[]>([]);
  const spotlight = useSpotlight<HTMLLabelElement>({
    disabled: Boolean(disabled),
    focus: false,
    keyboard: false,
  });
  const inputRef = useMergedRefs(forwardedRef, input);

  useEffect(() => {
    if (input.current) input.current.indeterminate = indeterminate;
  }, [indeterminate]);

  useEffect(() => () => stopAnimation(), []);

  function stopAnimation() {
    animations.current.forEach((animation) => animation.cancel());
    animations.current = [];
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    stopAnimation();
    const boxElement = box.current;
    const rippleElement = ripple.current;
    if (
      !prefersReducedMotion() &&
      boxElement &&
      rippleElement &&
      typeof boxElement.animate === 'function'
    ) {
      const duration =
        parseFloat(getComputedStyle(boxElement).getPropertyValue('--dur-spotlight-contract')) ||
        420;
      animations.current = [
        boxElement.animate(
          [
            { transform: 'scale(1)', offset: 0 },
            { transform: 'scale(.84)', offset: 0.18 },
            { transform: 'scale(1.12)', offset: 0.55 },
            { transform: 'scale(1)', offset: 1 },
          ],
          { duration, easing: 'cubic-bezier(.2,.6,.2,1)' },
        ),
        rippleElement.animate(
          [
            { transform: 'scale(.85)', opacity: 0, offset: 0 },
            { transform: 'scale(1)', opacity: 0.28, offset: 0.15 },
            { transform: 'scale(1.85)', opacity: 0, offset: 1 },
          ],
          { duration, easing: 'ease-out' },
        ),
      ];
    }
    onChange?.(event);
  }

  return (
    <label
      ref={spotlight}
      className={cx(
        styles.checkbox,
        disabled && styles.disabled,
        variant === 'switch' && styles.switch,
        className,
      )}
    >
      <span className={styles.control}>
        <input
          {...rest}
          ref={inputRef}
          className={styles.input}
          type="checkbox"
          role={variant === 'switch' ? 'switch' : undefined}
          disabled={disabled}
          onChange={handleChange}
        />
        <span className={styles.ripple} ref={ripple} aria-hidden="true" />
        <span className={styles.box} ref={box} aria-hidden="true">
          <svg className={styles.mark} viewBox="0 0 20 20" fill="none">
            <path className={styles.tick} pathLength={1} d="M4 10l4 4 8-9" />
            <path className={styles.dash} pathLength={1} d="M4 10h12" />
          </svg>
        </span>
      </span>
      <span className={cx(styles.label, hideLabel && styles['sr-only'])}>{label}</span>
    </label>
  );
}

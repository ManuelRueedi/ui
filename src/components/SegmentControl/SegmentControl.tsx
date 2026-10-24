import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  type ButtonHTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type Ref,
  type RefCallback,
} from 'react';
import { useUiMessages } from '../../i18n/UiProvider';
import { cx } from '../../internal/cx';
import { prefersReducedMotion } from '../../internal/reducedMotion';
import { useMergedRefs } from '../../internal/refs';
import { useControllableState } from '../../internal/useControllableState';
import { useSpotlight } from '../../internal/useSpotlight';
import styles from './SegmentControl.module.css';

export type SegmentOption = {
  label: string;
  value: string;
  disabled?: boolean;
};

export type SegmentControlProps = {
  options: SegmentOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Names the group for screen readers. */
  label?: string;
  size?: 'sm' | 'md';
  /** `segmented` for a choice, `tabs` for switching between views. */
  variant?: 'segmented' | 'tabs';
  disabled?: boolean;
  className?: string;
};

export function SegmentControl({
  options,
  value: valueProp,
  defaultValue = '',
  onValueChange,
  label,
  size = 'md',
  variant = 'segmented',
  disabled = false,
  className,
}: SegmentControlProps) {
  const messages = useUiMessages();
  const [value, setValue] = useControllableState(valueProp, defaultValue, onValueChange);
  const segment = useRef<HTMLDivElement>(null);
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);
  // One stable ref per position, so the buttons keep their spotlight between renders.
  const buttonRefs = useRef<Array<RefCallback<HTMLButtonElement>>>([]);
  const buttonRef = (index: number) =>
    (buttonRefs.current[index] ??= (node) => {
      buttons.current[index] = node;
    });
  const selectedIndex = options.findIndex((option) => option.value === value);
  const firstEnabledIndex = options.findIndex((option) => !option.disabled);
  const hasSelection = selectedIndex >= 0;
  const latestIndex = useRef(selectedIndex);
  latestIndex.current = selectedIndex;

  const isOptionDisabled = (option: SegmentOption) => disabled || Boolean(option.disabled);

  const updateIndicator = useCallback((index = latestIndex.current) => {
    const element = segment.current;
    if (!element || index < 0) return;
    const button = buttons.current[index];
    if (!button) return;

    // Rounded offsets can reach a fraction of a pixel past the edge and show a needless scrollbar.
    const origin = element.getBoundingClientRect().left + element.clientLeft - element.scrollLeft;
    const rect = button.getBoundingClientRect();
    element.style.setProperty('--indicator-x', `${rect.left - origin}px`);
    element.style.setProperty('--indicator-width', `${rect.width}px`);
    // The tab line is drawn on a layer as wide as the tabs, so it never reaches past them while it slides.
    const span = Math.max(
      0,
      ...buttons.current
        .filter((item): item is HTMLButtonElement => Boolean(item))
        .map((item) => item.getBoundingClientRect().right - origin),
    );
    element.style.setProperty('--indicator-span', `${span}px`);
  }, []);

  const scrollSelectedIntoView = useCallback((index = latestIndex.current) => {
    if (!segment.current || index < 0) return;
    buttons.current[index]?.scrollIntoView?.({
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      block: 'nearest',
      inline: 'nearest',
    });
  }, []);

  useLayoutEffect(() => {
    scrollSelectedIntoView();
    updateIndicator();
  }, [selectedIndex, options.length, size, variant, scrollSelectedIntoView, updateIndicator]);

  useEffect(() => {
    const element = segment.current;
    if (!element || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      scrollSelectedIntoView();
      updateIndicator();
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [scrollSelectedIntoView, updateIndicator]);

  function enabledOptions() {
    return options
      .map((option, index) => ({ option, index }))
      .filter(({ option }) => !option.disabled);
  }

  function moveSelection(direction: 1 | -1) {
    if (disabled || options.length === 0) return;
    const enabled = enabledOptions();
    if (enabled.length === 0) return;
    const enabledIndex = enabled.findIndex(({ option }) => option.value === value);
    const nextIndex =
      enabledIndex === -1 ? 0 : (enabledIndex + direction + enabled.length) % enabled.length;
    const next = enabled[nextIndex];
    setValue(next.option.value);
    buttons.current[next.index]?.focus();
  }

  function moveToEdge(edge: 'first' | 'last') {
    if (disabled) return;
    const enabled = enabledOptions();
    const next = edge === 'first' ? enabled[0] : enabled[enabled.length - 1];
    if (!next) return;
    setValue(next.option.value);
    buttons.current[next.index]?.focus();
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    // Readonly overflow must retain the browser's keyboard scrolling.
    if (disabled || firstEnabledIndex < 0) return;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      moveSelection(1);
    }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      moveSelection(-1);
    }
    if (event.key === 'Home') {
      event.preventDefault();
      moveToEdge('first');
    }
    if (event.key === 'End') {
      event.preventDefault();
      moveToEdge('last');
    }
  }

  return (
    // Readonly groups need keyboard focus to scroll overflowing options.
    <div
      ref={segment}
      className={cx(
        styles.segment,
        styles[variant],
        styles[size],
        disabled && styles.disabled,
        hasSelection && styles['has-selection'],
        className,
      )}
      role={variant === 'tabs' ? 'tablist' : 'radiogroup'}
      aria-label={label ?? messages.selectOption}
      aria-disabled={disabled}
      tabIndex={disabled || firstEnabledIndex < 0 ? 0 : -1}
      onKeyDown={handleKeyDown}
    >
      {hasSelection && <span className={styles.indicator} aria-hidden="true" />}
      {options.map((option, index) => {
        const optionDisabled = isOptionDisabled(option);
        const active = value === option.value;
        return (
          <SegmentButton
            key={option.value}
            buttonRef={buttonRef(index)}
            className={cx(styles.option, active && styles.active)}
            disabled={optionDisabled}
            role={variant === 'tabs' ? 'tab' : 'radio'}
            data-value={option.value}
            aria-checked={variant === 'segmented' ? active : undefined}
            aria-selected={variant === 'tabs' ? active : undefined}
            tabIndex={
              optionDisabled
                ? -1
                : active || (selectedIndex === -1 && index === firstEnabledIndex)
                  ? 0
                  : -1
            }
            onClick={() => {
              if (!optionDisabled) setValue(option.value);
            }}
          >
            <span className={styles['label-text']}>{option.label}</span>
          </SegmentButton>
        );
      })}
    </div>
  );
}

function SegmentButton({
  buttonRef,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  buttonRef: Ref<HTMLButtonElement>;
  'data-value': string;
}) {
  const spotlight = useSpotlight<HTMLButtonElement>({ disabled });
  const ref = useMergedRefs(buttonRef, spotlight);
  return <button {...rest} ref={ref} type="button" disabled={disabled} />;
}

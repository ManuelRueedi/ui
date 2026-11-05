import type { ButtonHTMLAttributes, HTMLAttributes, MouseEvent, ReactNode, Ref } from 'react';
import { X } from 'lucide-react';
import { useUiMessages } from '../../i18n/UiProvider';
import { cx } from '../../internal/cx';
import styles from './Chip.module.css';

export type ChipTone = 'neutral' | 'strong' | 'warning' | 'error';
export type ChipSize = 'sm' | 'md';

type ChipOwnProps = {
  /** The chip's text. */
  children: ReactNode;
  /** A small Lucide icon before the text. */
  icon?: ReactNode;
  /** A number after the text, e.g. how many items a filter matches. */
  count?: number | string;
  size?: ChipSize;
  tone?: ChipTone;
  /** A dashed border, e.g. for something planned or suggested but not built yet. */
  dashed?: boolean;
  /**
   * Makes the chip a toggle button that shows whether it is on.
   * Leave it out for a chip that only runs an action or only shows a status.
   */
  selected?: boolean;
  /** Makes the chip a button. Without it (and without `selected`) the chip is plain text. */
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  /** Adds a remove button after the text. */
  onRemove?: () => void;
  /** The remove button's label. Defaults to "Remove <text>" when the text is a string. */
  removeLabel?: string;
  disabled?: boolean;
  ref?: Ref<HTMLElement>;
};

export type ChipProps = ChipOwnProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof ChipOwnProps | 'type'>;

/**
 * A small label: a status, a filter that can be on or off, a quick action or a picked value
 * that can be removed. Interactive chips grow to the 44 px tap target on touch screens.
 */
export function Chip({
  children,
  icon,
  count,
  size = 'md',
  tone = 'neutral',
  dashed = false,
  selected,
  onClick,
  onRemove,
  removeLabel,
  disabled = false,
  className,
  ref,
  ...rest
}: ChipProps) {
  const messages = useUiMessages();
  const interactive = Boolean(onClick) || selected !== undefined;
  const removable = Boolean(onRemove);

  const content = (
    <>
      {icon ? (
        <span className={styles.icon} aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <span className={styles.label}>{children}</span>
      {count !== undefined ? <span className={styles.count}>{count}</span> : null}
    </>
  );

  const chipClasses = cx(
    styles.chip,
    styles[size],
    tone !== 'neutral' && styles[tone],
    dashed && styles.dashed,
    selected && styles.selected,
    disabled && styles.disabled,
  );

  const main = interactive ? (
    <button
      {...rest}
      ref={removable ? undefined : (ref as Ref<HTMLButtonElement>)}
      type="button"
      disabled={disabled}
      aria-pressed={selected}
      data-selected={selected || undefined}
      className={removable ? styles.part : cx(chipClasses, styles.interactive, className)}
      onClick={onClick}
    >
      {content}
    </button>
  ) : (
    <span
      {...(rest as HTMLAttributes<HTMLSpanElement>)}
      ref={removable ? undefined : (ref as Ref<HTMLSpanElement>)}
      aria-disabled={disabled || undefined}
      className={removable ? styles.part : cx(chipClasses, className)}
    >
      {content}
    </span>
  );

  if (!removable) return main;

  const label =
    removeLabel ??
    (typeof children === 'string' || typeof children === 'number'
      ? messages.chip.remove(String(children))
      : messages.chip.remove(''));

  return (
    <span
      ref={ref as Ref<HTMLSpanElement>}
      className={cx(chipClasses, styles.removable, interactive && styles.interactive, className)}
      data-selected={selected || undefined}
    >
      {main}
      <button
        type="button"
        className={styles.remove}
        aria-label={label.trim()}
        disabled={disabled}
        onClick={onRemove}
      >
        <X size={size === 'sm' ? 12 : 14} strokeWidth={1.75} aria-hidden="true" />
      </button>
    </span>
  );
}

export type ChipGroupProps = HTMLAttributes<HTMLDivElement> & {
  /** Names the group for screen readers, e.g. "Filter by family". */
  label: string;
  /** `wrap` breaks into rows; `scroll` keeps one row that scrolls sideways (phone filter bars). */
  overflow?: 'wrap' | 'scroll';
  ref?: Ref<HTMLDivElement>;
};

/** A row of chips with a name, e.g. filters or the options of one setting. */
export function ChipGroup({ label, overflow = 'wrap', className, ...rest }: ChipGroupProps) {
  return (
    <div
      role="group"
      aria-label={label}
      {...rest}
      className={cx(styles.group, overflow === 'scroll' && styles.scroll, className)}
    />
  );
}

import type {
  CSSProperties,
  HTMLAttributes,
  KeyboardEvent as ReactKeyboardEvent,
  ReactNode,
  Ref,
} from 'react';
import { useId } from 'react';
import { X } from 'lucide-react';
import { useUiMessages } from '../../i18n/UiProvider';
import { cx } from '../../internal/cx';
import { IconButton } from '../IconButton/IconButton';
import styles from './DrawingCard.module.css';

export type DrawingCardPlacement = 'floating' | 'docked';
export type DrawingCardWidth = 'sm' | 'md' | 'lg';

type DrawingCardOwnProps = {
  /** The card's title: plain text, or e.g. a name field that edits in place. */
  title: ReactNode;
  /** Names the card for screen readers when the title is not plain text. */
  label?: string;
  /** One line under the title, e.g. key facts. */
  subtitle?: ReactNode;
  /** A small Lucide icon before the title. */
  icon?: ReactNode;
  /** Buttons in the title row, before the close button (IconButton size "sm" fits best). */
  actions?: ReactNode;
  /** Buttons or notes at the bottom. They stay in view while the body scrolls. */
  footer?: ReactNode;
  /** Shows a close button. Escape inside the card closes it too. */
  onClose?: () => void;
  /** The close button's label. Defaults to the built-in "Close". */
  closeLabel?: string;
  /**
   * `floating` sits over the drawing; its positioned parent (`position: relative`) is the frame.
   * `docked` sits in the page flow, e.g. under a drawing or inside a sheet.
   */
  placement?: DrawingCardPlacement;
  /** Left edge of a floating card in its frame (px or any CSS length). Right-aligned when left out. */
  x?: number | string;
  /** Top edge of a floating card in its frame (px or any CSS length). */
  y?: number | string;
  width?: DrawingCardWidth;
  /** On a narrow screen a floating card moves to the bottom edge of its frame. Default true. */
  dockOnPhone?: boolean;
  children?: ReactNode;
  ref?: Ref<HTMLElement>;
};

export type DrawingCardProps = DrawingCardOwnProps &
  Omit<HTMLAttributes<HTMLElement>, keyof DrawingCardOwnProps>;

const length = (value: number | string) => (typeof value === 'number' ? `${value}px` : value);

/**
 * A small card on top of a drawing: details or settings of the picked item, right where it is.
 * Title row with optional actions and a close button, a scrolling body and a fixed footer.
 */
export function DrawingCard({
  title,
  label,
  subtitle,
  icon,
  actions,
  footer,
  onClose,
  closeLabel,
  placement = 'floating',
  x,
  y,
  width = 'md',
  dockOnPhone = true,
  className,
  style,
  onKeyDown,
  children,
  ref,
  ...rest
}: DrawingCardProps) {
  const messages = useUiMessages();
  const titleId = useId();
  const floating = placement === 'floating';

  const position: CSSProperties = {};
  if (floating && x !== undefined) {
    (position as Record<string, string>)['--drawing-card-x'] = length(x);
  }
  if (floating && y !== undefined) {
    (position as Record<string, string>)['--drawing-card-y'] = length(y);
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLElement>) {
    onKeyDown?.(event);
    if (event.key === 'Escape' && onClose && !event.defaultPrevented) {
      event.preventDefault();
      onClose();
    }
  }

  return (
    <section
      aria-label={label}
      aria-labelledby={label ? undefined : titleId}
      {...rest}
      ref={ref}
      style={{ ...position, ...style }}
      data-placement={placement}
      className={cx(
        styles.card,
        styles[placement],
        styles[width],
        floating && x !== undefined && styles.fromLeft,
        floating && dockOnPhone && styles.dockOnPhone,
        className,
      )}
      onKeyDown={handleKeyDown}
    >
      <header className={styles.header}>
        {icon ? (
          <span className={styles.icon} aria-hidden="true">
            {icon}
          </span>
        ) : null}
        <div className={styles.heading}>
          <div id={titleId} className={styles.title}>
            {title}
          </div>
          {subtitle ? <div className={styles.subtitle}>{subtitle}</div> : null}
        </div>
        {actions || onClose ? (
          <div className={styles.actions}>
            {actions}
            {onClose ? (
              <IconButton
                size="sm"
                label={closeLabel ?? messages.drawingCard.close}
                onClick={onClose}
              >
                <X size={16} strokeWidth={1.75} />
              </IconButton>
            ) : null}
          </div>
        ) : null}
      </header>
      {children ? <div className={styles.body}>{children}</div> : null}
      {footer ? <footer className={styles.footer}>{footer}</footer> : null}
    </section>
  );
}

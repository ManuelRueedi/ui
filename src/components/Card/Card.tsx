import type {
  AnchorHTMLAttributes,
  HTMLAttributes,
  KeyboardEvent as ReactKeyboardEvent,
  ReactNode,
  Ref,
} from 'react';
import { useRef } from 'react';
import { cx } from '../../internal/cx';
import { useMergedRefs } from '../../internal/refs';
import { useSpotlight } from '../../internal/useSpotlight';
import styles from './Card.module.css';

export type CardVariant = 'default' | 'muted' | 'inverse';

type CommonProps = {
  variant?: CardVariant;
  /** Makes the whole card clickable, as a link with `href` or as a button. */
  interactive?: boolean;
  children?: ReactNode;
};

export type CardProps = CommonProps &
  Omit<HTMLAttributes<HTMLElement>, keyof CommonProps> &
  Pick<AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'target' | 'rel'> & {
    ref?: Ref<HTMLElement>;
  };

export function Card({ interactive = false, ...props }: CardProps) {
  return interactive ? <InteractiveCard {...props} /> : <StaticCard {...props} />;
}

function StaticCard({
  variant = 'default',
  className,
  href: _href,
  target: _target,
  rel: _rel,
  ref,
  ...rest
}: Omit<CardProps, 'interactive'>) {
  return (
    <section
      data-loading-outline=""
      {...rest}
      ref={ref}
      className={cx(styles.card, variant !== 'default' && styles[variant], className)}
    />
  );
}

function InteractiveCard({
  variant = 'default',
  className,
  href,
  target,
  rel,
  tabIndex,
  onKeyDown,
  onKeyUp,
  ref: forwardedRef,
  ...rest
}: Omit<CardProps, 'interactive'>) {
  const element = useRef<HTMLElement>(null);
  const spotlight = useSpotlight<HTMLElement>({ keyboard: true });
  const ref = useMergedRefs<HTMLElement>(forwardedRef, element, spotlight);
  const isLink = Boolean(href);
  const classes = cx(
    styles.card,
    variant !== 'default' && styles[variant],
    styles.interactive,
    className,
  );

  function handleKeyDown(event: ReactKeyboardEvent<HTMLElement>) {
    if (!isLink && (event.key === ' ' || event.key === 'Enter')) event.preventDefault();
    onKeyDown?.(event);
  }

  function handleKeyUp(event: ReactKeyboardEvent<HTMLElement>) {
    if (!isLink && (event.key === ' ' || event.key === 'Enter')) element.current?.click();
    onKeyUp?.(event);
  }

  if (isLink) {
    return (
      <a
        data-loading-outline=""
        {...rest}
        ref={ref as Ref<HTMLAnchorElement>}
        href={href}
        target={target}
        rel={rel}
        tabIndex={tabIndex}
        className={classes}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
      />
    );
  }

  return (
    <div
      data-loading-outline=""
      {...rest}
      ref={ref as Ref<HTMLDivElement>}
      role="button"
      tabIndex={tabIndex ?? 0}
      className={classes}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
    />
  );
}

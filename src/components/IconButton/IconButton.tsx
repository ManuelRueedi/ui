import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react';
import { cx } from '../../internal/cx';
import { useMergedRefs } from '../../internal/refs';
import { useSpotlight } from '../../internal/useSpotlight';
import styles from './IconButton.module.css';

export type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  /** Read out by screen readers; the button shows only the icon. */
  label: string;
  variant?: 'ghost' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  /** Makes it a toggle button. */
  pressed?: boolean;
  children?: ReactNode;
  ref?: Ref<HTMLButtonElement>;
};

export function IconButton({
  label,
  variant = 'ghost',
  size = 'md',
  pressed,
  disabled = false,
  type = 'button',
  className,
  children,
  ref: forwardedRef,
  ...rest
}: IconButtonProps) {
  const spotlight = useSpotlight<HTMLButtonElement>({ disabled });
  const ref = useMergedRefs(forwardedRef, spotlight);

  return (
    <button
      {...rest}
      ref={ref}
      type={type}
      disabled={disabled}
      className={cx(styles['icon-button'], styles[variant], styles[size], className)}
      aria-label={label}
      aria-pressed={pressed}
      data-pressed={pressed}
    >
      <span className={styles['icon-shell']}>{children}</span>
    </button>
  );
}

import type { HTMLAttributes } from 'react';
import { cx } from '../../internal/cx';
import styles from './Badge.module.css';

export type BadgeTone = 'neutral' | 'strong' | 'warning' | 'error';

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
};

export function Badge({ tone = 'neutral', className, children, ...rest }: BadgeProps) {
  return (
    <span {...rest} className={cx(styles.badge, tone !== 'neutral' && styles[tone], className)}>
      {children}
    </span>
  );
}

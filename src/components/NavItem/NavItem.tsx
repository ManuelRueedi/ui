import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ComponentType,
  ReactNode,
  Ref,
} from 'react';
import { cx } from '../../internal/cx';
import { useMergedRefs } from '../../internal/refs';
import { useSpotlight } from '../../internal/useSpotlight';
import styles from './NavItem.module.css';

/** Any icon component that takes a size and stroke width, e.g. from lucide-react. */
export type NavIcon = ComponentType<{ size?: number | string; strokeWidth?: number | string }>;

type CommonProps = {
  active?: boolean;
  /** Shows only the icon; the label stays for screen readers. */
  compact?: boolean;
  icon?: NavIcon;
  children?: ReactNode;
};

export type NavItemProps =
  | (CommonProps &
      Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof CommonProps | 'type'> & {
        href?: undefined;
        ref?: Ref<HTMLButtonElement>;
      })
  | (CommonProps &
      Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof CommonProps> & {
        href: string;
        ref?: Ref<HTMLAnchorElement>;
      });

export function NavItem({ active = false, compact = false, icon: Icon, ...props }: NavItemProps) {
  const spotlight = useSpotlight<HTMLElement>();
  const ref = useMergedRefs<HTMLElement>(props.ref as Ref<HTMLElement> | undefined, spotlight);
  const className = cx(
    styles['nav-item'],
    active && styles.active,
    compact && styles.compact,
    props.className,
  );
  const content = (
    <span className={styles['nav-content']}>
      {Icon && <Icon size={16} strokeWidth={1.75} />}
      <span className={styles['nav-label']}>{props.children}</span>
    </span>
  );

  if (props.href !== undefined) {
    const { ref: _ref, className: _className, children: _children, ...rest } = props;
    return (
      <a {...rest} ref={ref} className={className}>
        {content}
      </a>
    );
  }

  const { ref: _ref, className: _className, children: _children, href: _href, ...rest } = props;
  return (
    <button {...rest} ref={ref} type="button" className={className}>
      {content}
    </button>
  );
}

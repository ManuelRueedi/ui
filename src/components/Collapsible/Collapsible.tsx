import { ChevronRight } from 'lucide-react';
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import { cx } from '../../internal/cx';
import { prefersReducedMotion } from '../../internal/reducedMotion';
import { useMergedRefs } from '../../internal/refs';
import { useControllableState } from '../../internal/useControllableState';
import { useSpotlight } from '../../internal/useSpotlight';
import styles from './Collapsible.module.css';

export type CollapsibleProps = {
  title: string;
  summary?: string;
  /** Open state owned by the parent. Leave out and use `defaultOpen` to let the component keep it. */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  size?: 'sm' | 'md';
  headingLevel?: 2 | 3 | 4;
  disabled?: boolean;
  toggleLabel?: string;
  /** Lets the open panel fill the remaining height and scroll. */
  fill?: boolean;
  leading?: ReactNode;
  children?: ReactNode;
};

export function Collapsible({
  title,
  summary,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  size = 'md',
  headingLevel = 2,
  disabled = false,
  toggleLabel,
  fill = false,
  leading,
  children,
}: CollapsibleProps) {
  const id = useId();
  const [open, setOpen] = useControllableState(openProp, defaultOpen, onOpenChange);
  const trigger = useRef<HTMLSpanElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const previousOpen = useRef(open);
  const [animating, setAnimating] = useState(false);
  const spotlight = useSpotlight<HTMLSpanElement>({ disabled });
  const triggerRef = useMergedRefs(trigger, spotlight);
  const Heading = `h${headingLevel}` as const;

  function toggle() {
    if (!disabled) setOpen(!open);
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLSpanElement>) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    if (!event.repeat) toggle();
  }

  // Closing a panel that holds the focus moves the focus back to its toggle.
  useLayoutEffect(() => {
    if (!open && panel.current?.contains(document.activeElement)) trigger.current?.focus();
  }, [open]);

  useEffect(() => {
    if (open === previousOpen.current) return;
    previousOpen.current = open;
    setAnimating(!prefersReducedMotion());
    const duration =
      (panel.current &&
        parseFloat(getComputedStyle(panel.current).getPropertyValue('--dur-slow'))) ||
      240;
    const timer = window.setTimeout(() => setAnimating(false), duration + 30);
    return () => window.clearTimeout(timer);
  }, [open]);

  return (
    <div
      className={cx(
        styles.collapsible,
        Boolean(leading) && styles['with-leading'],
        size === 'sm' && styles.small,
        fill && styles.fill,
      )}
    >
      {leading && <div className={styles.leading}>{leading}</div>}
      <Heading className={styles.heading}>
        {/* A non-form trigger also works inside disabled fieldsets, so readonly details remain inspectable. */}
        <span
          ref={triggerRef}
          className={cx(styles.toggle, disabled && styles.disabled)}
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-expanded={open}
          aria-controls={`${id}-content`}
          aria-label={toggleLabel || title}
          aria-describedby={summary ? `${id}-summary` : undefined}
          aria-disabled={disabled || undefined}
          onClick={toggle}
          onKeyDown={handleKeyDown}
        >
          <span className={styles['title-line']}>
            <span>{title}</span>
            <span className={cx(styles.chevron, open && styles.expanded)} aria-hidden="true">
              <ChevronRight size={16} />
            </span>
          </span>
          {summary && (
            <span className={styles.summary} id={`${id}-summary`}>
              {summary}
            </span>
          )}
        </span>
      </Heading>
      <div
        ref={panel}
        className={cx(styles.panel, open && styles.open, animating && styles.animating)}
        id={`${id}-content`}
        aria-hidden={!open}
        inert={!open}
      >
        <div className={styles['panel-inner']}>
          <div className={styles.content}>{children}</div>
        </div>
      </div>
    </div>
  );
}

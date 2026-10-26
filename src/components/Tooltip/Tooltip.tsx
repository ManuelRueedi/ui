import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { cx } from '../../internal/cx';
import {
  anchoredPosition,
  clamp,
  fitsOnSide,
  fixedBoundary,
  isPopoverOpen,
  setPopoverOpen,
  shiftInside,
  sideOrder,
} from '../../internal/placement';
import styles from './Tooltip.module.css';

export type TooltipPlacement = 'top' | 'right' | 'bottom' | 'left';
export type TooltipCollision = 'flip' | 'shift' | 'none';

export type TooltipProps = Omit<HTMLAttributes<HTMLSpanElement>, 'content'> & {
  /** Plain tooltip text. Use `tooltip` for richer content. */
  content?: string;
  tooltip?: ReactNode;
  placement?: TooltipPlacement;
  fallbackPlacements?: TooltipPlacement[];
  /** `flip` moves to the side with room, `shift` keeps the side but stays on screen. */
  collision?: TooltipCollision;
  maxWidth?: string;
  disabled?: boolean;
  /** Also opens on a tap; a tap elsewhere closes it. */
  openOnTouch?: boolean;
  /**
   * Links the tooltip to the focusable child as its description. Turn it off when the tooltip
   * only repeats the child's accessible name, as on an icon button.
   */
  describe?: boolean;
  children?: ReactNode;
};

const gap = 8;
const viewportMargin = 8;
const arrowInset = 10;
const focusableSelector =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

// Keyboard focus opens the tooltip; a script restoring focus after a mouse action does not.
function focusVisible(element: EventTarget) {
  if (!(element instanceof Element)) return true;
  try {
    return element.matches(':focus-visible');
  } catch {
    // Browsers without :focus-visible keep the old behavior.
    return true;
  }
}

/**
 * Shows a short hint on hover and keyboard focus. The tooltip sits in the browser's top layer, so
 * cards and dialogs do not clip it. The position is set straight on the element, without
 * re-rendering.
 */
export function Tooltip({
  id,
  content = '',
  tooltip,
  placement = 'top',
  fallbackPlacements,
  collision = 'flip',
  maxWidth = '240px',
  disabled = false,
  openOnTouch = false,
  describe = true,
  className,
  children,
  onPointerEnter,
  onPointerDown,
  onPointerLeave,
  onFocus,
  onBlur,
  onKeyDown,
  ...rest
}: TooltipProps) {
  const generatedId = useId();
  const tooltipId = id ?? `tooltip-${generatedId}`;
  const trigger = useRef<HTMLSpanElement>(null);
  const tooltipElement = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const active = useRef(false);
  const showCycle = useRef(0);
  const unmountTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const hasTooltip = !disabled && Boolean(content || tooltip);
  const settings = useRef({ placement, fallbackPlacements, collision });
  settings.current = { placement, fallbackPlacements, collision };

  const inTopLayer = useCallback(() => isPopoverOpen(tooltipElement.current), []);

  // The top layer keeps tooltips above field wrappers and cards that form their own stacking context.
  const setTopLayer = useCallback((open: boolean) => {
    setPopoverOpen(tooltipElement.current, open);
  }, []);

  const updatePosition = useCallback(() => {
    const triggerNode = trigger.current;
    const element = tooltipElement.current;
    if (!triggerNode || !element) return;
    const { placement, fallbackPlacements, collision } = settings.current;

    const placementOrder = () => {
      const order = fallbackPlacements?.length ? fallbackPlacements : sideOrder(placement);
      const unique = Array.from(new Set(order));
      return unique.includes(placement) ? unique : [placement, ...unique];
    };
    const shouldClampX = (next: TooltipPlacement) =>
      collision === 'flip' || (collision === 'shift' && (next === 'top' || next === 'bottom'));
    const shouldClampY = (next: TooltipPlacement) =>
      collision === 'flip' || (collision === 'shift' && (next === 'left' || next === 'right'));

    const triggerRect = triggerNode.getBoundingClientRect();
    const tooltipRect = { width: element.offsetWidth, height: element.offsetHeight };
    // Top-layer elements are positioned against the viewport, whatever their ancestors do.
    const boundaryRect = fixedBoundary(element, inTopLayer());
    const nextPlacement =
      collision === 'flip'
        ? (placementOrder().find((candidate) =>
            fitsOnSide(candidate, triggerRect, tooltipRect, boundaryRect, gap, viewportMargin),
          ) ?? placement)
        : placement;
    const { x: nextX, y: nextY } = anchoredPosition(
      nextPlacement,
      'center',
      triggerRect,
      tooltipRect,
      gap,
    );
    const clampedX = shouldClampX(nextPlacement)
      ? shiftInside(nextX, tooltipRect.width, boundaryRect.left, boundaryRect.right, viewportMargin)
      : nextX;
    const clampedY = shouldClampY(nextPlacement)
      ? shiftInside(
          nextY,
          tooltipRect.height,
          boundaryRect.top,
          boundaryRect.bottom,
          viewportMargin,
        )
      : nextY;

    let arrowX = 0;
    let arrowY = 0;
    if (nextPlacement === 'top' || nextPlacement === 'bottom') {
      arrowX = clamp(
        triggerRect.left + triggerRect.width / 2 - clampedX,
        arrowInset,
        Math.max(arrowInset, tooltipRect.width - arrowInset),
      );
    } else {
      arrowY = clamp(
        triggerRect.top + triggerRect.height / 2 - clampedY,
        arrowInset,
        Math.max(arrowInset, tooltipRect.height - arrowInset),
      );
    }

    element.dataset.placement = nextPlacement;
    element.style.setProperty('--tooltip-x', `${Math.round(clampedX - boundaryRect.left)}px`);
    element.style.setProperty('--tooltip-y', `${Math.round(clampedY - boundaryRect.top)}px`);
    element.style.setProperty('--tooltip-arrow-x', `${arrowX}px`);
    element.style.setProperty('--tooltip-arrow-y', `${arrowY}px`);
  }, [inTopLayer]);

  const setFlags = useCallback((positioned: boolean, ready: boolean, open: boolean) => {
    const element = tooltipElement.current;
    if (!element) return;
    element.dataset.positioned = String(positioned);
    element.dataset.ready = String(ready);
    element.dataset.open = String(open);
  }, []);

  const clearTimers = useCallback(() => {
    if (unmountTimer.current) clearTimeout(unmountTimer.current);
    unmountTimer.current = undefined;
  }, []);

  const hide = useCallback(
    (immediate = false) => {
      showCycle.current += 1;
      clearTimers();
      setIsVisible(false);
      const element = tooltipElement.current;
      if (element) element.dataset.open = 'false';

      const finish = () => {
        active.current = false;
        setFlags(false, false, false);
        setTopLayer(false);
      };
      if (immediate) {
        finish();
        return;
      }
      unmountTimer.current = setTimeout(finish, 140);
    },
    [clearTimers, setFlags, setTopLayer],
  );

  const show = useCallback(() => {
    // Touch, pointer entry and focus can all belong to the same interaction.
    if (!hasTooltip || (active.current && !unmountTimer.current)) return;
    const cycle = ++showCycle.current;
    const current = () => active.current && cycle === showCycle.current;
    clearTimers();
    active.current = true;
    setFlags(false, false, false);
    setTopLayer(true);
    updatePosition();
    setFlags(true, false, false);
    tooltipElement.current?.getBoundingClientRect();

    requestAnimationFrame(() => {
      if (!current()) return;
      setFlags(true, true, false);
      requestAnimationFrame(() => {
        if (!current()) return;
        setFlags(true, true, true);
        setIsVisible(true);
        requestAnimationFrame(updatePosition);
      });
    });
  }, [clearTimers, hasTooltip, setFlags, setTopLayer, updatePosition]);

  useEffect(() => {
    if (disabled) hide(true);
  }, [disabled, hide]);

  // The focusable element inside the anchor gets the tooltip as its description.
  useEffect(() => {
    const anchor = trigger.current;
    if (!anchor || !hasTooltip || !describe) return;
    const target = anchor.matches(focusableSelector)
      ? anchor
      : anchor.querySelector<HTMLElement>(focusableSelector);
    if (!target) return;
    const previous = target.getAttribute('aria-describedby');
    const ids = new Set(previous?.split(/\s+/).filter(Boolean) ?? []);
    ids.add(tooltipId);
    target.setAttribute('aria-describedby', Array.from(ids).join(' '));
    return () => {
      if (previous) target.setAttribute('aria-describedby', previous);
      else target.removeAttribute('aria-describedby');
    };
  }, [hasTooltip, describe, tooltipId, children]);

  useEffect(() => {
    if (!isVisible) return;
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    const observer =
      typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(updatePosition);
    if (trigger.current) observer?.observe(trigger.current);
    if (tooltipElement.current) observer?.observe(tooltipElement.current);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      observer?.disconnect();
    };
  }, [isVisible, updatePosition]);

  useEffect(() => {
    if (!openOnTouch || !isVisible) return;
    function handleDocumentPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (trigger.current?.contains(target) || tooltipElement.current?.contains(target)) return;
      hide();
    }
    document.addEventListener('pointerdown', handleDocumentPointerDown, true);
    return () => document.removeEventListener('pointerdown', handleDocumentPointerDown, true);
  }, [openOnTouch, isVisible, hide]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  return (
    <>
      <span
        {...rest}
        ref={trigger}
        className={cx(styles['tooltip-anchor'], className)}
        data-tooltip-open={isVisible}
        onPointerEnter={(event) => {
          show();
          onPointerEnter?.(event);
        }}
        onPointerDown={(event: ReactPointerEvent<HTMLSpanElement>) => {
          if (openOnTouch && event.pointerType !== 'mouse') show();
          onPointerDown?.(event);
        }}
        onPointerLeave={(event: ReactPointerEvent<HTMLSpanElement>) => {
          if (!(openOnTouch && event.pointerType !== 'mouse')) hide();
          onPointerLeave?.(event);
        }}
        onFocus={(event) => {
          if (focusVisible(event.target)) show();
          onFocus?.(event);
        }}
        onBlur={(event) => {
          hide();
          onBlur?.(event);
        }}
        onKeyDown={(event: ReactKeyboardEvent<HTMLSpanElement>) => {
          if (event.key === 'Escape') hide(true);
          onKeyDown?.(event);
        }}
      >
        {children}
      </span>
      {hasTooltip && (
        <div
          ref={tooltipElement}
          id={tooltipId}
          className={styles.tooltip}
          data-placement={placement}
          data-open="false"
          data-positioned="false"
          data-ready="false"
          popover="manual"
          role="tooltip"
          style={{ '--tooltip-max-width': maxWidth } as CSSProperties}
        >
          {tooltip ?? content}
        </div>
      )}
    </>
  );
}

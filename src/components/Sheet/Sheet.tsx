import { X } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type Ref,
  type RefObject,
} from 'react';
import { useUiMessages } from '../../i18n/UiProvider';
import { cx } from '../../internal/cx';
import { useMergedRefs } from '../../internal/refs';
import { useControllableState } from '../../internal/useControllableState';
import { IconButton } from '../IconButton/IconButton';
import styles from './Sheet.module.css';
import {
  defaultPeekHeight,
  endDrag,
  moveDrag,
  sheetGeometry,
  startDrag,
  tapSlop,
  type SheetDrag,
  type SheetGeometry,
  type SheetSnap,
} from './sheetGeometry';

export type { SheetSnap } from './sheetGeometry';

/** What asked to close the sheet: the close button, Escape, the backdrop or a swipe down. */
export type SheetCloseReason = 'button' | 'escape' | 'backdrop' | 'swipe';

export type SheetProps = Omit<HTMLAttributes<HTMLElement>, 'title' | 'children' | 'onClose'> & {
  open: boolean;
  /** The accessible name, shown as the heading unless `heading` replaces it. */
  title: string;
  description?: string;
  /** Replaces the visible title, e.g. with a rename-in-place control. `title` stays the name. */
  heading?: ReactNode;
  /** Shown before the close button, e.g. a Print button. */
  headerActions?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
  /**
   * Modal sheets (the default) use the native <dialog> in the top layer with a backdrop; the page
   * behind is inert. A non-modal sheet is a labelled section rendered in place: no backdrop, no
   * focus move and no Escape handling, so the page stays usable.
   */
  modal?: boolean;
  /**
   * The look above the phone breakpoint: a bottom sheet capped by `size`, a centred dialog, or
   * `inline` (non-modal only; a modal sheet shows as `sheet` then): no positioning at all, so the
   * parent places it, e.g. as a side panel.
   */
  wide?: 'sheet' | 'dialog' | 'inline';
  /** The width of a wide sheet or dialog: 360, 520 or 720 px. */
  size?: 'sm' | 'md' | 'lg';
  /** Overrides the layout, which otherwise follows (max-width: 760px). */
  layout?: 'phone' | 'wide';
  /** Non-modal: positioned in the nearest positioned ancestor instead of the viewport. */
  contained?: boolean;
  /**
   * Phone snaps with a drag handle: `peek` or `full`. Leave out snap and defaultSnap for a
   * sheet as tall as its content (at most `--sheet-max-height`, 88dvh by default).
   */
  snap?: SheetSnap;
  defaultSnap?: SheetSnap;
  onSnapChange?: (snap: SheetSnap) => void;
  /** The preferred peek height in px, at most 42% of the visual viewport. 232 by default. */
  peekHeight?: number;
  /**
   * The height the sheet covers on phones, in px; also while it is dragged. 0 when the layout is
   * wide, when it is closed and when it unmounts.
   */
  onHeightChange?: (px: number) => void;
  /** Whether a swipe down, Escape (modal) and the backdrop may ask to close it. Default true. */
  dismissible?: boolean;
  /**
   * Called when the user asks to close the sheet. It stays open until the parent sets `open` to
   * false, so a parent can ignore a reason.
   */
  onClose?: (reason: SheetCloseReason) => void;
  /** Modal: the element that gets the focus on open, instead of the first focusable one. */
  initialFocus?: RefObject<HTMLElement | null>;
  hideClose?: boolean;
  closeLabel?: string;
  expandLabel?: string;
  collapseLabel?: string;
  ref?: Ref<HTMLElement>;
};

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(query).matches
      : false,
  );
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [query]);
  return matches;
}

let pageScrollLocks = 0;
let restorePageScroll: (() => void) | null = null;

/** Stops the page behind open modal sheets from scrolling; keeps the scroll bar's room. */
function lockPageScroll() {
  pageScrollLocks += 1;
  if (pageScrollLocks === 1) {
    const page = document.documentElement;
    const { overflow, scrollbarGutter } = page.style;
    const hasScrollbar = page.clientWidth > 0 && window.innerWidth > page.clientWidth;
    page.style.overflow = 'hidden';
    if (hasScrollbar) page.style.scrollbarGutter = 'stable';
    restorePageScroll = () => {
      page.style.overflow = overflow;
      page.style.scrollbarGutter = scrollbarGutter;
    };
  }
  return () => {
    pageScrollLocks -= 1;
    if (pageScrollLocks > 0) return;
    restorePageScroll?.();
    restorePageScroll = null;
  };
}

function pointOutside(element: Element, x: number, y: number) {
  const box = element.getBoundingClientRect();
  return x < box.left || x > box.right || y < box.top || y > box.bottom;
}

/**
 * A bottom sheet for phones. Modal sheets sit on the native <dialog>; non-modal sheets render in
 * place. With snaps, a drag handle moves it between peek and full, and a swipe down from peek
 * asks to close it. The parent owns `open`.
 */
export function Sheet({
  id,
  open,
  title,
  description = '',
  heading,
  headerActions,
  footer,
  children,
  modal = true,
  wide = 'sheet',
  size = 'md',
  layout,
  contained = false,
  snap: snapProp,
  defaultSnap,
  onSnapChange,
  peekHeight = defaultPeekHeight,
  onHeightChange,
  dismissible = true,
  onClose,
  initialFocus,
  hideClose = false,
  closeLabel,
  expandLabel,
  collapseLabel,
  className,
  'aria-label': ariaLabel,
  'aria-labelledby': labelledBy,
  'aria-describedby': describedBy,
  ref: forwardedRef,
  ...rest
}: SheetProps) {
  const messages = useUiMessages();
  const generatedId = useId();
  const sheetId = id ?? `sheet-${generatedId}`;
  const titleId = `${sheetId}-title`;
  const descriptionId = `${sheetId}-description`;
  const narrow = useMediaQuery('(max-width: 760px)');
  const phone = (layout ?? (narrow ? 'phone' : 'wide')) === 'phone';
  const animated = !useMediaQuery('(prefers-reduced-motion: reduce)');
  const wideLook = modal && wide === 'inline' ? 'sheet' : wide;
  const snapping = snapProp !== undefined || defaultSnap !== undefined;
  const [snap, setSnap] = useControllableState(snapProp, defaultSnap ?? 'peek', onSnapChange);
  // Snaps, the handle and the drags only exist in the phone layout.
  const active = phone && snapping;

  const root = useRef<HTMLElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const ref = useMergedRefs(forwardedRef, root);
  const latest = useRef({ open, onClose, dismissible, onHeightChange, contained, initialFocus });
  latest.current = { open, onClose, dismissible, onHeightChange, contained, initialFocus };
  const snapRef = useRef(snap);
  snapRef.current = snap;
  const geometry = useRef<SheetGeometry | null>(null);
  const drag = useRef<SheetDrag | null>(null);
  const suppressClick = useRef(false);
  const reported = useRef(0);
  const [dragging, setDragging] = useState(false);
  // Bumped after a drag, so the effect below puts the sheet back on its snap height.
  const [settles, setSettles] = useState(0);

  const report = useCallback((px: number) => {
    if (reported.current === px) return;
    reported.current = px;
    latest.current.onHeightChange?.(px);
  }, []);

  /** Sets the height of a snapping sheet, at most the container's height when contained. */
  const applyHeight = useCallback(
    (height: number) => {
      const element = root.current;
      if (!element) return;
      const container = latest.current.contained ? element.offsetParent : null;
      const fitted =
        container instanceof HTMLElement && container.clientHeight > 0
          ? Math.min(height, container.clientHeight)
          : height;
      element.style.setProperty('--sheet-height', `${fitted}px`);
      if (latest.current.open) report(fitted);
    },
    [report],
  );

  const resetScroll = useCallback(() => {
    // Short screens scroll the whole sheet; taller ones scroll its body.
    if (body.current) body.current.scrollTop = 0;
    if (root.current) root.current.scrollTop = 0;
  }, []);

  const requestClose = useCallback((reason: SheetCloseReason) => {
    if (!latest.current.open) return;
    if (reason !== 'button' && !latest.current.dismissible) return;
    latest.current.onClose?.(reason);
  }, []);

  // A new open starts from the top, and an uncontrolled sheet from its default snap. This runs
  // before the height effects below, so they already use that snap.
  const wasOpen = useRef(open);
  const reopen = useRef({ snapProp, defaultSnap, setSnap });
  reopen.current = { snapProp, defaultSnap, setSnap };
  useLayoutEffect(() => {
    if (open && !wasOpen.current) {
      const { snapProp: controlled, defaultSnap: initial, setSnap: set } = reopen.current;
      if (controlled === undefined && initial !== undefined) {
        snapRef.current = initial;
        set(initial);
      }
      resetScroll();
    }
    wasOpen.current = open;
  }, [open, resetScroll]);

  // Measures the snap heights from the visual viewport (and the container when contained).
  useLayoutEffect(() => {
    const element = root.current;
    if (!element) return;
    if (!active) {
      geometry.current = null;
      element.style.removeProperty('--sheet-height');
      return;
    }
    if (!open) return;
    const viewport = window.visualViewport;
    const measure = () => {
      const next = sheetGeometry(viewport?.height ?? window.innerHeight, peekHeight);
      geometry.current = next;
      // A drag in progress keeps the height under the finger.
      if (drag.current) return;
      applyHeight(snapRef.current === 'full' ? next.fullHeight : next.peekHeight);
    };
    measure();
    const container = contained ? (element.offsetParent ?? element.parentElement) : null;
    const observer =
      container && typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    if (container) observer?.observe(container);
    window.addEventListener('resize', measure);
    viewport?.addEventListener('resize', measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', measure);
      viewport?.removeEventListener('resize', measure);
    };
  }, [active, open, peekHeight, contained, applyHeight]);

  // Puts the sheet on its snap height. Folding to peek starts the content from the top again.
  useLayoutEffect(() => {
    const current = geometry.current;
    // The ref, not `snap`: a reopen may have just reset it.
    const target = snapRef.current;
    if (!active || !open || !current) return;
    applyHeight(target === 'full' ? current.fullHeight : current.peekHeight);
    if (target === 'peek') resetScroll();
  }, [active, open, snap, settles, applyHeight, resetScroll]);

  const finishDrag = useCallback(
    (y: number, cancelled: boolean) => {
      const current = drag.current;
      const shape = geometry.current;
      drag.current = null;
      setDragging(false);
      if (!current || !shape) return;
      // The settle effect puts the sheet back on the snap the parent keeps.
      setSettles((count) => count + 1);
      if (cancelled) return;
      const release = endDrag(current, y, shape, performance.now());
      if (release === 'closed') {
        if (latest.current.dismissible) requestClose('swipe');
        else setSnap('peek');
        return;
      }
      setSnap(release);
    },
    [requestClose, setSnap],
  );

  // The body can be pulled down once it is scrolled to the top. A tap keeps the scroll position.
  useEffect(() => {
    const element = body.current;
    if (!active || !open || !element) return;
    let touchId: number | null = null;
    const scrolled = () => Math.max(element.scrollTop, root.current?.scrollTop ?? 0);
    const findTouch = (touches: TouchList) => {
      if (touchId === null) return null;
      for (let index = 0; index < touches.length; index += 1) {
        const touch = touches.item(index);
        if (touch?.identifier === touchId) return touch;
      }
      return null;
    };
    const stop = () => {
      touchId = null;
      drag.current = null;
      setDragging(false);
    };

    const onTouchStart = (event: TouchEvent) => {
      const shape = geometry.current;
      const startSnap = snapRef.current;
      if (!shape || event.touches.length !== 1) return;
      if (startSnap === 'full' && scrolled() > 1) return;
      const touch = event.touches.item(0);
      if (!touch) return;
      touchId = touch.identifier;
      drag.current = startDrag(
        startSnap,
        touch.clientY,
        shape,
        performance.now(),
        -(touch.identifier + 1),
      );
    };

    const onTouchMove = (event: TouchEvent) => {
      const touch = findTouch(event.touches);
      const current = drag.current;
      const shape = geometry.current;
      if (!touch || !current || !shape) return;
      const deltaY = touch.clientY - current.startY;
      // In full, scrolled content and an upward swipe scroll natively.
      if (current.startSnap === 'full' && (scrolled() > 1 || (deltaY < 0 && !current.moved))) {
        stop();
        return;
      }
      if (!current.moved && Math.abs(deltaY) <= tapSlop) return;
      event.preventDefault();
      if (!current.moved) setDragging(true);
      moveDrag(current, touch.clientY, shape, performance.now());
      applyHeight(current.height);
    };

    const onTouchEnd = (event: TouchEvent, cancelled = false) => {
      const touch = findTouch(event.changedTouches);
      const current = drag.current;
      if (!touch || !current) return;
      touchId = null;
      // A tap must not reset a scrolled sheet before its click: another control would move
      // under the finger.
      if (!current.moved) {
        stop();
        return;
      }
      finishDrag(touch.clientY, cancelled);
    };
    const onTouchCancel = (event: TouchEvent) => onTouchEnd(event, true);

    element.addEventListener('touchstart', onTouchStart, { passive: true });
    element.addEventListener('touchmove', onTouchMove, { passive: false });
    element.addEventListener('touchend', onTouchEnd, { passive: true });
    element.addEventListener('touchcancel', onTouchCancel, { passive: true });
    return () => {
      element.removeEventListener('touchstart', onTouchStart);
      element.removeEventListener('touchmove', onTouchMove);
      element.removeEventListener('touchend', onTouchEnd);
      element.removeEventListener('touchcancel', onTouchCancel);
      drag.current = null;
    };
  }, [active, open, applyHeight, finishDrag]);

  const handlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const shape = geometry.current;
    if (!shape || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    drag.current = startDrag(
      snapRef.current,
      event.clientY,
      shape,
      performance.now(),
      event.pointerId,
    );
    suppressClick.current = false;
    setDragging(true);
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Synthetic pointers may not support capture.
    }
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const current = drag.current;
    const shape = geometry.current;
    if (!current || !shape || current.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    moveDrag(current, event.clientY, shape, performance.now());
    applyHeight(current.height);
  };

  const handlePointerEnd = (event: ReactPointerEvent<HTMLButtonElement>, cancelled: boolean) => {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    // A drag is not a click; a tap still toggles.
    suppressClick.current = current.moved;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // The browser may have released it already.
    }
    finishDrag(event.clientY, cancelled);
  };

  const handleClick = () => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    setSnap(snapRef.current === 'peek' ? 'full' : 'peek');
  };

  // Modal: the native dialog. A close request the browser does not let us cancel still closes it.
  const closeReported = useRef(false);
  // Bumped when the browser closed the dialog by itself, so the effect below can reopen it.
  const [nativeCloses, setNativeCloses] = useState(0);
  // Closed by the layout cleanup below; that close is not the user's.
  const hidden = useRef(false);
  const layoutRuns = useRef(0);

  useEffect(() => {
    const dialog = modal ? (root.current as HTMLDialogElement | null) : null;
    if (!dialog) return;
    if (open && !dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
      latest.current.initialFocus?.current?.focus();
    }
    if (!open && dialog.open) {
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
    }
  }, [modal, open, nativeCloses]);

  // Unmounting an open modal sheet closes it first, so the browser returns focus to the opener.
  // A Suspense boundary that hides this tree runs the same cleanup and later runs the effect
  // again: then the sheet opens again if the parent still has it open.
  useLayoutEffect(() => {
    const dialog = modal ? (root.current as HTMLDialogElement | null) : null;
    layoutRuns.current += 1;
    if (
      layoutRuns.current > 1 &&
      dialog &&
      latest.current.open &&
      !dialog.open &&
      typeof dialog.showModal === 'function'
    ) {
      dialog.showModal();
    }
    return () => {
      if (dialog?.open && typeof dialog.close === 'function') {
        hidden.current = true;
        dialog.close();
      }
    };
  }, [modal]);

  useEffect(() => {
    if (modal && open) return lockPageScroll();
  }, [modal, open]);

  // A sheet as tall as its content reports its measured height, once the dialog shows.
  useEffect(() => {
    const element = root.current;
    if (!open || !phone || snapping || !element) return;
    const measure = () => report(element.offsetHeight);
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(element);
    return () => observer?.disconnect();
  }, [open, phone, snapping, report]);

  useEffect(() => {
    if (!open || !phone) report(0);
  }, [open, phone, report]);

  useEffect(() => () => report(0), [report]);

  const descriptions = [description ? descriptionId : undefined, describedBy].filter(Boolean);
  const naming = labelledBy
    ? { 'aria-labelledby': labelledBy }
    : ariaLabel
      ? { 'aria-label': ariaLabel }
      : heading !== undefined
        ? { 'aria-label': title }
        : { 'aria-labelledby': titleId };
  const expanded = snap === 'full';

  const content = (
    <>
      <header
        className={cx(
          styles.header,
          !description && styles['title-only'],
          active && styles['with-handle'],
        )}
      >
        {active && (
          <button
            type="button"
            className={styles.handle}
            aria-expanded={expanded}
            aria-label={
              expanded
                ? (collapseLabel ?? messages.sheet.collapse)
                : (expandLabel ?? messages.sheet.expand)
            }
            onClick={handleClick}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={(event) => handlePointerEnd(event, false)}
            onPointerCancel={(event) => handlePointerEnd(event, true)}
          >
            <span aria-hidden="true" className={styles.grip} />
          </button>
        )}
        <div className={styles.title}>
          {heading ?? <h2 id={titleId}>{title}</h2>}
          {description && <p id={descriptionId}>{description}</p>}
        </div>
        {(headerActions || !hideClose) && (
          <div className={styles.actions}>
            {headerActions}
            {!hideClose && (
              <IconButton
                label={closeLabel ?? messages.sheet.close}
                onClick={() => requestClose('button')}
              >
                <X size={16} strokeWidth={1.9} />
              </IconButton>
            )}
          </div>
        )}
      </header>
      <div ref={body} className={styles.body}>
        {children}
      </div>
      {footer && <footer className={styles.footer}>{footer}</footer>}
    </>
  );

  const shared = {
    ...rest,
    ...naming,
    ref,
    id: sheetId,
    className: cx(
      styles.sheet,
      modal ? styles.modal : styles.inplace,
      phone ? styles.phone : cx(styles.wide, styles[`wide-${wideLook}`]),
      styles[size],
      contained && styles.contained,
      active && styles.snapping,
      animated && styles.animated,
      className,
    ),
    'aria-describedby': descriptions.length > 0 ? descriptions.join(' ') : undefined,
    'data-layout': phone ? 'phone' : 'wide',
    'data-snap': active ? snap : undefined,
    'data-dragging': dragging ? 'true' : undefined,
  };

  if (!modal) {
    return open ? <section {...shared}>{content}</section> : null;
  }

  return (
    <dialog
      {...shared}
      aria-modal="true"
      onCancel={(event) => {
        event.preventDefault();
        if (!event.cancelable) closeReported.current = true;
        requestClose('escape');
      }}
      onClose={() => {
        if (hidden.current) {
          hidden.current = false;
          return;
        }
        const wasReported = closeReported.current;
        closeReported.current = false;
        // Native close events are queued: an earlier close must not undo a later reopen.
        const dialog = root.current as HTMLDialogElement | null;
        if (!latest.current.open || dialog?.open) return;
        // The browser closed it (a method="dialog" form or a close request it would not cancel).
        if (!wasReported) latest.current.onClose?.('button');
        // The parent owns `open`: if it stays true, the effect shows the sheet again.
        setNativeCloses((count) => count + 1);
      }}
      onKeyDown={(event: ReactKeyboardEvent<HTMLElement>) => {
        if (event.key === 'Escape' && !event.defaultPrevented) {
          // Also keeps the browser from turning the key into its own close request.
          event.preventDefault();
          requestClose('escape');
        }
        rest.onKeyDown?.(event);
      }}
      onPointerDown={(event: ReactPointerEvent<HTMLElement>) => {
        const dialog = root.current;
        // The dialog element itself is the target of a press on its backdrop, outside its box.
        if (
          dialog &&
          event.target === dialog &&
          pointOutside(dialog, event.clientX, event.clientY)
        ) {
          // Keep the pointer action from moving focus after native close restores it.
          event.preventDefault();
          requestClose('backdrop');
        }
        rest.onPointerDown?.(event);
      }}
    >
      {content}
    </dialog>
  );
}

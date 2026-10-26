import { ChevronDown, Ellipsis } from 'lucide-react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';
import { useUiMessages } from '../../i18n/UiProvider';
import { cx } from '../../internal/cx';
import {
  anchoredPosition,
  fitsOnSide,
  isPopoverOpen,
  oppositeSide,
  roomOnSide,
  setPopoverOpen,
  shiftInside,
  supportsPopover,
  viewportBox,
} from '../../internal/placement';
import { useControllableState } from '../../internal/useControllableState';
import { useSpotlight } from '../../internal/useSpotlight';
import { Button } from '../Button/Button';
import { IconButton } from '../IconButton/IconButton';
import styles from './Menu.module.css';

type FocusTarget = 'first' | 'last' | 'trigger';

export type MenuProps = {
  /** Text on the trigger, with a chevron. Leave it out for an icon-only trigger. */
  label?: ReactNode;
  /** Icon on the trigger: before the label, or alone (three dots when neither is given). */
  icon?: ReactNode;
  /** Read out for the trigger. Required in practice for an icon-only trigger; defaults to "More options". */
  ariaLabel?: string;
  variant?: 'ghost' | 'secondary';
  size?: 'sm' | 'md';
  /** Marks the trigger as holding a choice, e.g. a filter that is on. */
  active?: boolean;
  /**
   * Which trigger edge the panel lines up with, or its middle. The panel moves along the trigger
   * when it would leave the window.
   */
  align?: 'start' | 'center' | 'end';
  /**
   * Opens the panel above the trigger, e.g. in a bottom bar. The panel takes the other side when
   * there is no room, and scrolls when neither side has room for all of it.
   */
  placement?: 'bottom' | 'top';
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
  className?: string;
  panelClassName?: string;
  /** MenuItem, MenuLabel and MenuSeparator, or any content such as fields. */
  children?: ReactNode;
};

type MenuContextValue = {
  open: boolean;
  /** Closes the menu; moves the focus back to the trigger when it was inside. */
  close: () => void;
};

const MenuContext = createContext<MenuContextValue | null>(null);

/** The open state and a close action for content inside a Menu, e.g. a field that applies a choice. */
export function useMenu(): MenuContextValue {
  const value = useContext(MenuContext);
  if (!value) throw new Error('useMenu must be used inside a Menu');
  return value;
}

const fieldSelector = 'input, select, textarea, [contenteditable="true"]';

/** The tallest a panel gets on its own, as in the CSS: 70% of the window, at most 600px. */
const maxPanelHeight = (viewportHeight: number) => Math.min(viewportHeight * 0.7, 600);

function tokenLength(style: CSSStyleDeclaration, name: string, fallback: number) {
  const value = Number.parseFloat(style.getPropertyValue(name));
  return Number.isFinite(value) ? value : fallback;
}

/**
 * A button that opens a small panel of actions or settings.
 * The panel stays mounted while closed, so drafts in its fields survive.
 */
export function Menu({
  label,
  icon,
  ariaLabel,
  variant = 'ghost',
  size = 'md',
  active = false,
  align = 'end',
  placement = 'bottom',
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  disabled = false,
  className,
  panelClassName,
  children,
}: MenuProps) {
  const messages = useUiMessages();
  const id = useId();
  const triggerId = `menu-trigger-${id}`;
  const panelId = `menu-panel-${id}`;
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const pendingFocus = useRef<FocusTarget | null>(null);
  const [open, setOpen] = useControllableState(openProp, defaultOpen, onOpenChange);
  const latestOpen = useRef(open);
  latestOpen.current = open;
  const settings = useRef({ align, placement });
  settings.current = { align, placement };

  const items = useCallback(
    () =>
      Array.from(
        panel.current?.querySelectorAll<HTMLElement>('[data-menu-item]:not(:disabled)') ?? [],
      ),
    [],
  );

  const close = useCallback(
    ({ restoreFocus = false } = {}) => {
      if (!latestOpen.current) return;
      latestOpen.current = false;
      if (restoreFocus) pendingFocus.current = 'trigger';
      setOpen(false);
    },
    [setOpen],
  );

  const openAt = useCallback(
    (target: FocusTarget | null) => {
      if (disabled) return;
      if (latestOpen.current) {
        if (target === 'first') items()[0]?.focus();
        if (target === 'last') items().at(-1)?.focus();
        return;
      }
      latestOpen.current = true;
      pendingFocus.current = target;
      setOpen(true);
    },
    [disabled, items, setOpen],
  );

  // The open panel sits in the top layer, fixed next to the trigger, so sticky bars, clipping
  // parents and higher z-indices cannot cover or cut it. It stays in the menu's DOM, so focus
  // order and the outside checks do not change.
  const place = useCallback(() => {
    const element = panel.current;
    const anchor = trigger.current;
    if (!element || !anchor || !isPopoverOpen(element)) return;
    const { align, placement } = settings.current;
    const style = window.getComputedStyle(element);
    const gap = tokenLength(style, '--space-1', 4);
    const margin = tokenLength(style, '--space-3', 12);
    const boundary = viewportBox(true);
    const anchorBox = anchor.getBoundingClientRect();
    // The height the panel wants: its content (scrollHeight ignores max-height) up to the cap.
    const natural = {
      width: element.offsetWidth,
      height: Math.min(
        element.scrollHeight + element.offsetHeight - element.clientHeight,
        maxPanelHeight(boundary.height),
      ),
    };
    const fits = (side: 'top' | 'bottom') =>
      fitsOnSide(side, anchorBox, natural, boundary, gap, margin);
    const room = (side: 'top' | 'bottom') => roomOnSide(side, anchorBox, boundary, gap, margin);
    const other = oppositeSide(placement) as 'top' | 'bottom';
    const side =
      fits(placement) || (!fits(other) && room(placement) >= room(other)) ? placement : other;
    const maxHeight = Math.max(
      0,
      Math.floor(Math.min(room(side), maxPanelHeight(boundary.height))),
    );
    element.style.setProperty('--menu-max-height', `${maxHeight}px`);

    const size = { width: element.offsetWidth, height: element.offsetHeight };
    const rtl = style.direction === 'rtl';
    const edge = align === 'center' ? 'center' : (align === 'start') !== rtl ? 'start' : 'end';
    const { x, y } = anchoredPosition(side, edge, anchorBox, size, gap);
    const left = shiftInside(x, size.width, boundary.left, boundary.right, margin);
    element.style.setProperty('--menu-x', `${Math.round(left)}px`);
    element.style.setProperty('--menu-y', `${Math.round(y)}px`);
  }, []);

  useLayoutEffect(() => {
    const element = panel.current;
    if (!open || !element) return;
    // Without popover support (jsdom, older browsers) the panel stays absolute under the trigger.
    const topLayer = supportsPopover(element);
    if (topLayer) {
      // Set here rather than in the markup: jsdom's style sheet hides any [popover] element.
      element.setAttribute('popover', 'manual');
      setPopoverOpen(element, true);
      place();
    }
    // A panel opens at its top: Chrome can show a long panel scrolled to its end.
    element.scrollTop = 0;
    if (!topLayer) return;
    let frame = 0;
    const placeSoon = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(place);
    };
    const placeOnScroll = (event: Event) => {
      // Scrolling inside the panel does not move it.
      if (event.target instanceof Node && element.contains(event.target)) return;
      place();
    };
    window.addEventListener('resize', place);
    window.addEventListener('scroll', placeOnScroll, true);
    const observer =
      typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(placeSoon);
    observer?.observe(element);
    if (trigger.current) observer?.observe(trigger.current);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', placeOnScroll, true);
      observer?.disconnect();
      setPopoverOpen(element, false);
      element.removeAttribute('popover');
      for (const name of ['--menu-x', '--menu-y', '--menu-max-height']) {
        element.style.removeProperty(name);
      }
    };
  }, [open, place]);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, align, placement, place]);

  // Moves the focus once the panel has opened (or closed).
  useEffect(() => {
    const target = pendingFocus.current;
    if (!target) return;
    pendingFocus.current = null;
    if (target === 'trigger') trigger.current?.focus();
    else if (target === 'last') items().at(-1)?.focus();
    else items()[0]?.focus();
  }, [open, items]);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: Event) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) close();
    };
    // Escape with the focus outside the menu (inside, handleRootKeyDown takes it). It runs in the
    // capture phase and marks the key as used, so page-level Escape handlers leave it alone.
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      if (event.target instanceof Node && root.current?.contains(event.target)) return;
      event.preventDefault();
      close();
    };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('focusin', closeOutside);
    document.addEventListener('keydown', closeOnEscape, true);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('focusin', closeOutside);
      document.removeEventListener('keydown', closeOnEscape, true);
    };
  }, [open, close]);

  useEffect(() => {
    if (disabled) close();
  }, [disabled, close]);

  const context = useMemo<MenuContextValue>(
    () => ({
      open,
      close: () => close({ restoreFocus: root.current?.contains(document.activeElement) ?? false }),
    }),
    [open, close],
  );

  function handleRootKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    // An open menu takes Escape before a dialog around it; a field inside that used it wins.
    if (event.key !== 'Escape' || !latestOpen.current || event.defaultPrevented) return;
    event.preventDefault();
    event.stopPropagation();
    close({ restoreFocus: true });
  }

  function handleTriggerKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      openAt('first');
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      openAt('last');
    }
  }

  function handlePanelKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    // Fields keep their own arrow keys.
    if (event.target instanceof Element && event.target.closest(fieldSelector)) return;
    const list = items();
    if (!list.length) return;
    const index = list.findIndex((item) => item === document.activeElement);
    const focus = (next: number) => {
      event.preventDefault();
      list[(next + list.length) % list.length]?.focus();
    };
    if (event.key === 'ArrowDown') focus(index + 1);
    else if (event.key === 'ArrowUp') focus(index === -1 ? -1 : index - 1);
    else if (event.key === 'Home') focus(0);
    else if (event.key === 'End') focus(-1);
  }

  const triggerProps = {
    id: triggerId,
    'aria-expanded': open,
    'aria-controls': panelId,
    'data-active': active || undefined,
    disabled,
    className: styles.trigger,
    onClick: () => (latestOpen.current ? close() : openAt(null)),
    onKeyDown: handleTriggerKeyDown,
  };

  return (
    <MenuContext.Provider value={context}>
      <div
        ref={root}
        className={cx(styles.menu, className)}
        data-open={open || undefined}
        data-align={align}
        data-placement={placement}
        onKeyDown={handleRootKeyDown}
      >
        {label === undefined ? (
          <IconButton
            {...triggerProps}
            ref={trigger}
            label={ariaLabel ?? messages.menu.more}
            variant={variant}
            size={size}
          >
            {icon ?? <Ellipsis size={size === 'sm' ? 16 : 18} strokeWidth={1.8} />}
          </IconButton>
        ) : (
          <Button
            {...triggerProps}
            ref={trigger}
            aria-label={ariaLabel}
            variant={variant}
            size={size}
          >
            <span className={styles['trigger-content']}>
              {icon}
              {label}
              <ChevronDown
                className={styles.chevron}
                size={14}
                strokeWidth={1.8}
                aria-hidden="true"
              />
            </span>
          </Button>
        )}
        <div
          ref={panel}
          id={panelId}
          className={cx(styles.panel, panelClassName)}
          role="group"
          aria-labelledby={triggerId}
          hidden={!open}
          onKeyDown={handlePanelKeyDown}
        >
          {children}
        </div>
      </div>
    </MenuContext.Provider>
  );
}

type MenuItemCommon = {
  icon?: ReactNode;
  /** A quieter trailing note, e.g. a storey next to a room. */
  detail?: ReactNode;
  /** A second line under the label, read out as the item's description, e.g. why it is off. */
  description?: ReactNode;
  /** Marks the entry that is shown or chosen now; `page`, `location` or `step` say what kind. */
  current?: boolean | 'page' | 'location' | 'step';
  /** Runs the action; the menu then closes unless keepOpen is set. */
  onSelect?: (event: ReactMouseEvent<HTMLElement>) => void;
  keepOpen?: boolean;
  /** With a description, the item stays focusable so the keyboard reaches the reason. */
  disabled?: boolean;
  className?: string;
  children?: ReactNode;
};

export type MenuItemProps = MenuItemCommon &
  (
    | ({
        href?: undefined;
        /** Makes the item a toggle that is on (true) or off (false), e.g. a layer shown on the plan. */
        pressed?: boolean;
      } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof MenuItemCommon | 'onClick'>)
    | ({ href: string; pressed?: undefined } & Omit<
        AnchorHTMLAttributes<HTMLAnchorElement>,
        keyof MenuItemCommon | 'onClick'
      >)
  );

function hasContent(node: ReactNode) {
  return node !== undefined && node !== null && node !== false && node !== '';
}

/** One action in a Menu. Arrow keys move between items. */
export function MenuItem(props: MenuItemProps) {
  const menu = useContext(MenuContext);
  const {
    icon,
    detail,
    description,
    current,
    onSelect,
    keepOpen,
    disabled = false,
    className,
    children,
  } = props;
  const descriptionId = `menu-item-description-${useId()}`;
  const described = hasContent(description);
  const ref = useSpotlight<HTMLElement>({ keyboard: true, disabled });
  const label = <span className={styles['item-label']}>{children}</span>;
  const content = (
    <>
      {icon && (
        <span className={styles['item-icon']} aria-hidden="true">
          {icon}
        </span>
      )}
      {described ? (
        <span className={styles['item-text']}>
          {label}
          {/* Hidden from the name only; aria-describedby still reads it. */}
          <span id={descriptionId} className={styles['item-description']} aria-hidden="true">
            {description}
          </span>
        </span>
      ) : (
        label
      )}
      {detail && <span className={styles['item-detail']}>{detail}</span>}
    </>
  );
  const handleClick = (event: ReactMouseEvent<HTMLElement>) => {
    if (disabled) {
      event.preventDefault();
      return;
    }
    onSelect?.(event);
    if (!keepOpen) menu?.close();
  };
  const shared = {
    className: cx(styles.item, className),
    'data-menu-item': '',
    'aria-current': current === true ? ('true' as const) : current || props['aria-current'],
    'aria-describedby': cx(described && descriptionId, props['aria-describedby']) || undefined,
    onClick: handleClick,
  };

  if (props.href !== undefined) {
    const {
      icon: _icon,
      detail: _detail,
      description: _description,
      current: _current,
      onSelect: _onSelect,
      keepOpen: _keepOpen,
      disabled: _disabled,
      className: _className,
      children: _children,
      pressed: _pressed,
      ...rest
    } = props;
    return (
      <a
        {...rest}
        {...shared}
        ref={ref}
        aria-disabled={disabled || rest['aria-disabled']}
        tabIndex={disabled && !described ? -1 : rest.tabIndex}
      >
        {content}
      </a>
    );
  }

  const {
    icon: _icon,
    detail: _detail,
    description: _description,
    current: _current,
    onSelect: _onSelect,
    keepOpen: _keepOpen,
    disabled: _disabled,
    className: _className,
    children: _children,
    href: _href,
    pressed,
    type = 'button',
    ...rest
  } = props;
  // A disabled item with a reason stays focusable and in the arrow order; clicks still do nothing.
  const focusableWhileDisabled = disabled && described;
  return (
    <button
      {...rest}
      {...shared}
      ref={ref}
      type={type}
      disabled={disabled && !focusableWhileDisabled}
      aria-disabled={focusableWhileDisabled || rest['aria-disabled']}
      aria-pressed={pressed ?? rest['aria-pressed']}
    >
      {content}
    </button>
  );
}

/** A small heading over a group of items. */
export function MenuLabel({ className, children }: { className?: string; children?: ReactNode }) {
  return <p className={cx(styles.label, className)}>{children}</p>;
}

export function MenuSeparator({ className }: { className?: string }) {
  return <hr className={cx(styles.separator, className)} />;
}

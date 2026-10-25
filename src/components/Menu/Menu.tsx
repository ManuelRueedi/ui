import { ChevronDown, Ellipsis } from 'lucide-react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
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
  /** Which trigger edge the panel lines up with. */
  align?: 'start' | 'end';
  /** Opens the panel above the trigger, e.g. in a bottom bar. */
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
    // Escape with the focus outside the menu; inside, handleRootKeyDown takes it first.
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented) close();
    };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('focusin', closeOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('focusin', closeOutside);
      document.removeEventListener('keydown', closeOnEscape);
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
  /** A second, quieter line or trailing note, e.g. a storey next to a room. */
  detail?: ReactNode;
  /** Marks the entry that is shown or chosen now. */
  current?: boolean;
  /** Runs the action; the menu then closes unless keepOpen is set. */
  onSelect?: (event: ReactMouseEvent<HTMLElement>) => void;
  keepOpen?: boolean;
  disabled?: boolean;
  className?: string;
  children?: ReactNode;
};

export type MenuItemProps = MenuItemCommon &
  (
    | ({ href?: undefined } & Omit<
        ButtonHTMLAttributes<HTMLButtonElement>,
        keyof MenuItemCommon | 'onClick'
      >)
    | ({ href: string } & Omit<
        AnchorHTMLAttributes<HTMLAnchorElement>,
        keyof MenuItemCommon | 'onClick'
      >)
  );

/** One action in a Menu. Arrow keys move between items. */
export function MenuItem(props: MenuItemProps) {
  const menu = useContext(MenuContext);
  const {
    icon,
    detail,
    current,
    onSelect,
    keepOpen,
    disabled = false,
    className,
    children,
  } = props;
  const ref = useSpotlight<HTMLElement>({ keyboard: true, disabled });
  const content = (
    <>
      {icon && (
        <span className={styles['item-icon']} aria-hidden="true">
          {icon}
        </span>
      )}
      <span className={styles['item-label']}>{children}</span>
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
    'aria-current': current ? ('true' as const) : undefined,
    onClick: handleClick,
  };

  if (props.href !== undefined) {
    const {
      icon: _icon,
      detail: _detail,
      current: _current,
      onSelect: _onSelect,
      keepOpen: _keepOpen,
      disabled: _disabled,
      className: _className,
      children: _children,
      ...rest
    } = props;
    return (
      <a
        {...rest}
        {...shared}
        ref={ref}
        aria-disabled={disabled || undefined}
        tabIndex={disabled ? -1 : rest.tabIndex}
      >
        {content}
      </a>
    );
  }

  const {
    icon: _icon,
    detail: _detail,
    current: _current,
    onSelect: _onSelect,
    keepOpen: _keepOpen,
    disabled: _disabled,
    className: _className,
    children: _children,
    href: _href,
    type = 'button',
    ...rest
  } = props;
  return (
    <button {...rest} {...shared} ref={ref} type={type} disabled={disabled}>
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

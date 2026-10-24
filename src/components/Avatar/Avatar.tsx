import { ChevronUp, FlaskConical, LogIn, LogOut, Settings, UserRound } from 'lucide-react';
import {
  useEffect,
  useId,
  useRef,
  useState,
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';
import { useUiMessages } from '../../i18n/UiProvider';
import { cx } from '../../internal/cx';
import { useMergedRefs } from '../../internal/refs';
import { useSpotlight } from '../../internal/useSpotlight';
import { Button } from '../Button/Button';
import { IconButton } from '../IconButton/IconButton';
import styles from './Avatar.module.css';

type ClickHandler = (event: ReactMouseEvent<HTMLElement>) => void;
type MenuFocusTarget = 'first' | 'last';

export type AvatarProps = {
  isAuthenticated?: boolean;
  /** Shows the name next to the picture; compact shows only the picture. */
  expanded?: boolean;
  name?: string;
  detail?: string;
  imageSrc?: string;
  initials?: string;
  loading?: boolean;
  loginLabel?: string;
  loginLoadingLabel?: string;
  menuLabel?: string;
  settingsLabel?: string;
  settingsHref?: string;
  logoutLabel?: string;
  /** Development-only entry; shown when a handler is given. */
  testAccountsLabel?: string;
  onLogin?: ClickHandler;
  onSettings?: ClickHandler;
  onLogout?: ClickHandler;
  onTestAccounts?: ClickHandler;
  className?: string;
};

function resolveInitials(value: string, fallback: string) {
  const explicit = value.trim();
  if (explicit) return explicit.slice(0, 2).toUpperCase();
  const parts = fallback
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean);
  return (parts.length > 1 ? `${parts[0]}${parts[1]}` : parts[0] || 'A').toUpperCase();
}

/** The signed-in account at the foot of the sidebar, with its menu, or the log-in button. */
export function Avatar({
  isAuthenticated = false,
  expanded = true,
  name,
  detail = '',
  imageSrc = '',
  initials = '',
  loading = false,
  loginLabel,
  loginLoadingLabel,
  menuLabel,
  settingsLabel,
  settingsHref = '',
  logoutLabel,
  testAccountsLabel = '',
  onLogin,
  onSettings,
  onLogout,
  onTestAccounts,
  className,
}: AvatarProps) {
  const messages = useUiMessages().avatar;
  const menuId = `avatar-menu-${useId()}`;
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const popover = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const pendingFocus = useRef<MenuFocusTarget | 'trigger' | null>(null);
  const triggerSpotlight = useSpotlight<HTMLButtonElement>();
  const triggerRef = useMergedRefs(trigger, triggerSpotlight);

  const displayName = (name ?? messages.account).trim() || messages.account;
  const displayDetail = detail.trim();
  const avatarInitials = resolveInitials(initials, displayName);
  const hasSettingsAction = Boolean(settingsHref || onSettings);
  const hasMenuActions = Boolean(hasSettingsAction || onLogout || onTestAccounts);
  const labels = {
    login: loginLabel ?? messages.logIn,
    loginLoading: loginLoadingLabel ?? messages.opening,
    menu: menuLabel ?? messages.accountMenu,
    settings: settingsLabel ?? messages.settings,
    logout: logoutLabel ?? messages.logOut,
  };
  const triggerLabel = isOpen ? messages.closeMenu(displayName) : messages.openMenu(displayName);
  const latestOpen = useRef(isOpen);
  latestOpen.current = isOpen;

  useEffect(() => {
    if (!isAuthenticated) setIsOpen(false);
  }, [isAuthenticated]);

  // Moves the focus once the menu has rendered (or closed).
  useEffect(() => {
    const target = pendingFocus.current;
    if (!target) return;
    pendingFocus.current = null;
    if (target === 'trigger') {
      trigger.current?.focus();
      return;
    }
    const items = menuItems();
    (target === 'last' ? items[items.length - 1] : items[0])?.focus();
  }, [isOpen]);

  useEffect(() => {
    function handleDocumentClick(event: MouseEvent) {
      const target = event.target;
      if (target instanceof Node && !root.current?.contains(target)) closeMenu();
    }
    function handleDocumentKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') closeMenu({ restoreFocus: true });
    }
    document.addEventListener('click', handleDocumentClick);
    document.addEventListener('keydown', handleDocumentKeyDown);
    return () => {
      document.removeEventListener('click', handleDocumentClick);
      document.removeEventListener('keydown', handleDocumentKeyDown);
    };
  }, []);

  function menuItems() {
    return Array.from(popover.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
  }

  function openMenu(target: MenuFocusTarget = 'first') {
    if (!hasMenuActions) return;
    if (latestOpen.current) {
      const items = menuItems();
      (target === 'last' ? items[items.length - 1] : items[0])?.focus();
      return;
    }
    pendingFocus.current = target;
    setIsOpen(true);
  }

  function closeMenu({ restoreFocus = false } = {}) {
    if (!latestOpen.current) return;
    latestOpen.current = false;
    if (restoreFocus) pendingFocus.current = 'trigger';
    setIsOpen(false);
  }

  function toggleMenu() {
    if (!hasMenuActions) return;
    if (isOpen) closeMenu();
    else openMenu();
  }

  function focusRelativeMenuItem(direction: 1 | -1) {
    const items = menuItems();
    if (!items.length) return;
    const currentIndex = items.findIndex((item) => item === document.activeElement);
    const nextIndex =
      currentIndex === -1
        ? direction > 0
          ? 0
          : items.length - 1
        : (currentIndex + direction + items.length) % items.length;
    items[nextIndex]?.focus();
  }

  function handleTriggerKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
    if (!hasMenuActions) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      openMenu('first');
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      openMenu('last');
    }
  }

  function handleMenuKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        closeMenu({ restoreFocus: true });
        break;
      case 'ArrowDown':
        event.preventDefault();
        focusRelativeMenuItem(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        focusRelativeMenuItem(-1);
        break;
      case 'Home':
        event.preventDefault();
        menuItems()[0]?.focus();
        break;
      case 'End': {
        event.preventDefault();
        const items = menuItems();
        items[items.length - 1]?.focus();
        break;
      }
      case 'Tab':
        closeMenu();
        break;
    }
  }

  const handleLoginClick = (event: ReactMouseEvent<HTMLElement>) => {
    if (loading) {
      event.preventDefault();
      return;
    }
    onLogin?.(event);
  };
  const menuAction = (handler?: ClickHandler) => (event: ReactMouseEvent<HTMLElement>) => {
    closeMenu();
    handler?.(event);
  };

  const mark = (small: boolean) => (
    <span className={cx(styles['avatar-mark'], small && styles.small)} aria-hidden="true">
      {imageSrc ? (
        <img className={styles['avatar-image']} src={imageSrc} alt="" decoding="async" />
      ) : avatarInitials ? (
        <span className={styles['avatar-initials']}>{avatarInitials}</span>
      ) : (
        <UserRound size={small ? 15 : 16} strokeWidth={1.8} />
      )}
    </span>
  );

  return (
    <div
      ref={root}
      className={cx(styles.avatar, expanded ? styles.expanded : styles.compact, className)}
    >
      {isAuthenticated ? (
        <>
          <button
            ref={triggerRef}
            className={styles['avatar-trigger']}
            type="button"
            aria-label={triggerLabel}
            aria-haspopup={hasMenuActions ? 'menu' : undefined}
            aria-controls={hasMenuActions ? menuId : undefined}
            aria-expanded={hasMenuActions ? isOpen : undefined}
            disabled={!hasMenuActions}
            data-open={isOpen}
            onClick={toggleMenu}
            onKeyDown={handleTriggerKeyDown}
          >
            {mark(false)}
            {expanded && (
              <>
                <span className={styles['avatar-copy']}>
                  <strong>{displayName}</strong>
                  {displayDetail && <small>{displayDetail}</small>}
                </span>
                {hasMenuActions && (
                  <span className={styles['trigger-chevron']} aria-hidden="true">
                    <ChevronUp size={14} strokeWidth={1.8} />
                  </span>
                )}
              </>
            )}
          </button>

          {isOpen && hasMenuActions && (
            <div
              ref={popover}
              id={menuId}
              className={styles['account-popover']}
              role="menu"
              tabIndex={-1}
              aria-label={labels.menu}
              onKeyDown={handleMenuKeyDown}
            >
              <div className={styles['popover-account']}>
                {mark(true)}
                <span className={styles['popover-copy']}>
                  <strong>{displayName}</strong>
                  {displayDetail && <small>{displayDetail}</small>}
                </span>
              </div>
              {onTestAccounts && (
                <MenuItem onClick={menuAction(onTestAccounts)}>
                  <FlaskConical size={15} strokeWidth={1.8} />
                  <span>{testAccountsLabel}</span>
                </MenuItem>
              )}
              {hasSettingsAction && (
                <MenuItem href={settingsHref || undefined} onClick={menuAction(onSettings)}>
                  <Settings size={15} strokeWidth={1.8} />
                  <span>{labels.settings}</span>
                </MenuItem>
              )}
              {onLogout && (
                <MenuItem onClick={menuAction(onLogout)}>
                  <LogOut size={15} strokeWidth={1.8} />
                  <span>{labels.logout}</span>
                </MenuItem>
              )}
            </div>
          )}
        </>
      ) : (
        <div
          className={cx(
            styles['login-shell'],
            (hasSettingsAction || Boolean(onTestAccounts)) && styles['has-settings'],
          )}
          aria-live="polite"
        >
          {expanded ? (
            <Button
              className={styles['avatar-login']}
              variant="secondary"
              size="sm"
              state={loading ? 'loading' : 'idle'}
              loadingLabel={labels.loginLoading}
              onClick={handleLoginClick}
            >
              <LogIn size={15} strokeWidth={1.8} />
              {labels.login}
            </Button>
          ) : (
            <IconButton
              label={loading ? labels.loginLoading : labels.login}
              variant="secondary"
              disabled={loading}
              onClick={handleLoginClick}
            >
              <LogIn size={16} strokeWidth={1.8} />
            </IconButton>
          )}
          {onTestAccounts && (
            <IconButton label={testAccountsLabel} onClick={onTestAccounts}>
              <FlaskConical size={16} strokeWidth={1.8} />
            </IconButton>
          )}
          {hasSettingsAction &&
            (settingsHref ? (
              <a
                className={styles['signed-out-settings']}
                href={settingsHref}
                aria-label={labels.settings}
                onClick={onSettings}
              >
                <Settings size={16} strokeWidth={1.8} />
              </a>
            ) : (
              <IconButton label={labels.settings} onClick={onSettings}>
                <Settings size={16} strokeWidth={1.8} />
              </IconButton>
            ))}
        </div>
      )}
    </div>
  );
}

function MenuItem({
  href,
  onClick,
  children,
}: {
  href?: string;
  onClick: (event: ReactMouseEvent<HTMLElement>) => void;
  children: ReactNode;
}) {
  const spotlight = useSpotlight<HTMLElement>({ keyboard: true });
  if (href) {
    return (
      <a
        ref={spotlight}
        className={styles['menu-item']}
        role="menuitem"
        tabIndex={-1}
        href={href}
        onClick={onClick as AnchorHTMLAttributes<HTMLAnchorElement>['onClick']}
      >
        {children}
      </a>
    );
  }
  return (
    <button
      ref={spotlight}
      className={styles['menu-item']}
      type="button"
      role="menuitem"
      tabIndex={-1}
      onClick={onClick as ButtonHTMLAttributes<HTMLButtonElement>['onClick']}
    >
      {children}
    </button>
  );
}

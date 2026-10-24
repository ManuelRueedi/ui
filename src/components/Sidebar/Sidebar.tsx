import { MessageSquare, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import {
  Fragment,
  useEffect,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';
import { useUiMessages } from '../../i18n/UiProvider';
import { cx } from '../../internal/cx';
import { useSpotlight } from '../../internal/useSpotlight';
import { Avatar, type AvatarProps } from '../Avatar/Avatar';
import { Badge, type BadgeTone } from '../Badge/Badge';
import { Button } from '../Button/Button';
import { Card } from '../Card/Card';
import { Collapsible } from '../Collapsible/Collapsible';
import { IconButton } from '../IconButton/IconButton';
import { NavItem, type NavIcon } from '../NavItem/NavItem';
import { Tooltip } from '../Tooltip/Tooltip';
import styles from './Sidebar.module.css';

type ClickHandler = (event: ReactMouseEvent<HTMLElement>) => void;

export type SidebarNavItem = {
  id: string;
  label: string;
  icon?: NavIcon;
  href?: string;
};

export type SidebarRecentItem = {
  id: string;
  title: string;
  subtitle?: string;
  badge?: string;
  tone?: BadgeTone;
  href?: string;
  active?: boolean;
};

export type SidebarAccount = Pick<
  AvatarProps,
  | 'isAuthenticated'
  | 'name'
  | 'detail'
  | 'imageSrc'
  | 'initials'
  | 'loading'
  | 'loginLabel'
  | 'loginLoadingLabel'
  | 'menuLabel'
  | 'settingsLabel'
  | 'settingsHref'
  | 'logoutLabel'
  | 'testAccountsLabel'
>;

export type SidebarProps = {
  title: string;
  subtitle?: string;
  brandIcon?: NavIcon;
  brandImageSrc?: string;
  actionLabel?: string;
  actionIcon?: NavIcon;
  navItems: SidebarNavItem[];
  activeItem: string;
  recentTitle?: string;
  recentItems?: SidebarRecentItem[];
  account?: SidebarAccount;
  onAction?: () => void;
  /** Shown below the main action while the sidebar is open, e.g. the workspace switch. */
  workspace?: ReactNode;
  onNavigate?: (itemId: string, event: ReactMouseEvent<HTMLElement>) => void;
  onRecentSelect?: (itemId: string, event: ReactMouseEvent<HTMLElement>) => void;
  onLogin?: ClickHandler;
  onSettings?: ClickHandler;
  onLogout?: ClickHandler;
  onTestAccounts?: ClickHandler;
  /** Shown above the account as its own entry, e.g. to send feedback. */
  feedbackLabel?: string;
  onFeedback?: ClickHandler;
  defaultCollapsed?: boolean;
  className?: string;
};

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);
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

/** The app's main navigation: brand, main action, pages, recent items and the account. */
export function Sidebar({
  title,
  subtitle = '',
  brandIcon: BrandIcon,
  brandImageSrc = '',
  actionLabel = '',
  actionIcon: ActionIcon,
  navItems,
  activeItem,
  recentTitle = '',
  recentItems = [],
  account,
  onAction,
  workspace,
  onNavigate,
  onRecentSelect,
  onLogin,
  onSettings,
  onLogout,
  onTestAccounts,
  feedbackLabel = '',
  onFeedback,
  defaultCollapsed = false,
  className,
}: SidebarProps) {
  const allMessages = useUiMessages();
  const messages = allMessages.sidebar;
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [hasRecentPreference, setHasRecentPreference] = useState(false);
  const [isRecentCollapsed, setIsRecentCollapsed] = useState(false);
  const isMobile = useMediaQuery('(max-width: 760px)');
  const isShortViewport = useMediaQuery('(max-height: 640px)');
  const backdropSpotlight = useSpotlight<HTMLButtonElement>({ focus: false });
  const expandZoneSpotlight = useSpotlight<HTMLButtonElement>({ focus: false });

  const selectedIndex = navItems.findIndex((item) => item.id === activeItem);
  const effectiveCollapsed = !isMobile && isCollapsed;
  const isRecentExpanded = !isRecentCollapsed && !(isShortViewport && !hasRecentPreference);
  const compactAccountTooltip = account?.isAuthenticated
    ? (account.menuLabel ?? allMessages.avatar.accountMenu)
    : account?.loading
      ? (account.loginLoadingLabel ?? allMessages.avatar.opening)
      : (account?.loginLabel ?? allMessages.avatar.logIn);

  useEffect(() => setIsCollapsed(defaultCollapsed), [defaultCollapsed]);
  useEffect(() => {
    if (!isMobile) setIsMobileOpen(false);
  }, [isMobile]);

  const closeMobileSidebar = () => setIsMobileOpen(false);
  const toggleSidebar = () => {
    if (isMobile) closeMobileSidebar();
    else setIsCollapsed((collapsed) => !collapsed);
  };
  const expandSidebar = () => {
    if (!isMobile) setIsCollapsed(false);
  };
  const setRecentExpanded = (open: boolean) => {
    setHasRecentPreference(true);
    setIsRecentCollapsed(!open);
  };
  // Every action also closes the sidebar on phones.
  const andClose =
    (handler?: ClickHandler): ClickHandler =>
    (event) => {
      handler?.(event);
      closeMobileSidebar();
    };
  const handleAction = () => {
    onAction?.();
    closeMobileSidebar();
  };

  const withTooltip = (label: string, node: ReactNode) =>
    effectiveCollapsed ? (
      <Tooltip
        content={label}
        placement="right"
        collision="shift"
        className={styles['tooltip-anchor']}
      >
        {node}
      </Tooltip>
    ) : (
      node
    );

  const avatar = account && (
    <Avatar
      {...account}
      expanded={!effectiveCollapsed}
      onLogin={onLogin ? andClose(onLogin) : undefined}
      onSettings={onSettings ? andClose(onSettings) : undefined}
      onLogout={onLogout ? andClose(onLogout) : undefined}
      onTestAccounts={onTestAccounts ? andClose(onTestAccounts) : undefined}
    />
  );

  return (
    <>
      <div className={styles['mobile-launcher']}>
        <IconButton label={messages.open} variant="secondary" onClick={() => setIsMobileOpen(true)}>
          <PanelLeftOpen size={17} strokeWidth={1.8} />
        </IconButton>
      </div>

      {isMobileOpen && (
        <button
          ref={backdropSpotlight}
          className={styles['mobile-backdrop']}
          type="button"
          aria-label={messages.dismiss}
          onClick={closeMobileSidebar}
        />
      )}

      <aside
        className={cx(
          styles.sidebar,
          effectiveCollapsed && styles.collapsed,
          isMobileOpen && styles['mobile-open'],
          isShortViewport && styles['short-viewport'],
          className,
        )}
        aria-label={title}
        aria-hidden={isMobile && !isMobileOpen ? 'true' : undefined}
        inert={isMobile && !isMobileOpen}
      >
        {effectiveCollapsed && (
          <button
            ref={expandZoneSpotlight}
            className={styles['collapsed-expand-zone']}
            type="button"
            tabIndex={-1}
            aria-label={messages.expandBackground}
            onClick={expandSidebar}
          />
        )}

        <div className={styles['sidebar-head']}>
          {!effectiveCollapsed && (
            <div className={styles.brand}>
              {brandImageSrc ? (
                <div className={styles['brand-mark']} aria-hidden="true">
                  <img
                    className={styles['brand-image']}
                    src={brandImageSrc}
                    alt=""
                    decoding="async"
                  />
                </div>
              ) : (
                BrandIcon && (
                  <div className={styles['brand-mark']} aria-hidden="true">
                    <BrandIcon size={18} strokeWidth={1.9} />
                  </div>
                )
              )}
              <div className={styles['brand-copy']}>
                <h2>{title}</h2>
                {subtitle && <small>{subtitle}</small>}
              </div>
            </div>
          )}

          <div className={styles['sidebar-toggle']}>
            {effectiveCollapsed ? (
              withTooltip(
                messages.expand,
                <IconButton label={messages.expand} aria-expanded={false} onClick={toggleSidebar}>
                  <PanelLeftOpen size={17} strokeWidth={1.8} />
                </IconButton>,
              )
            ) : (
              <IconButton
                label={isMobile ? messages.close : messages.collapse}
                aria-expanded={isMobile ? isMobileOpen : true}
                onClick={toggleSidebar}
              >
                <PanelLeftClose size={17} strokeWidth={1.8} />
              </IconButton>
            )}
          </div>
        </div>

        {actionLabel &&
          (effectiveCollapsed ? (
            <div className={styles['compact-action']}>
              {withTooltip(
                actionLabel,
                <IconButton label={actionLabel} variant="secondary" onClick={handleAction}>
                  {ActionIcon && <ActionIcon size={16} strokeWidth={1.9} />}
                </IconButton>,
              )}
            </div>
          ) : (
            <Button className={styles['action-button']} variant="primary" onClick={handleAction}>
              {ActionIcon && <ActionIcon size={15} strokeWidth={1.9} />}
              {actionLabel}
            </Button>
          ))}

        {workspace && !effectiveCollapsed && <div className={styles.workspace}>{workspace}</div>}

        <nav
          className={cx(styles.nav, selectedIndex >= 0 && styles['has-active'])}
          style={{ '--active-index': selectedIndex } as CSSProperties}
          aria-label={messages.primary}
        >
          {navItems.map((item) => (
            <Fragment key={item.id}>
              {withTooltip(
                item.label,
                <NavItem
                  className={styles['nav-entry']}
                  active={activeItem === item.id}
                  compact={effectiveCollapsed}
                  {...(item.href ? { href: item.href } : {})}
                  icon={item.icon}
                  aria-current={activeItem === item.id ? 'page' : undefined}
                  onClick={(event: ReactMouseEvent<HTMLElement>) => {
                    onNavigate?.(item.id, event);
                    closeMobileSidebar();
                  }}
                >
                  {item.label}
                </NavItem>,
              )}
            </Fragment>
          ))}
        </nav>

        {!effectiveCollapsed && recentTitle && recentItems.length > 0 && (
          <section className={styles.recent} aria-label={recentTitle}>
            <Collapsible
              title={recentTitle}
              size="sm"
              fill
              toggleLabel={isRecentExpanded ? messages.collapseRecent : messages.expandRecent}
              open={isRecentExpanded}
              onOpenChange={setRecentExpanded}
            >
              <div className={styles['recent-list']}>
                {recentItems.map((item) => (
                  <Card
                    key={item.id}
                    interactive
                    variant="muted"
                    className={styles['recent-card']}
                    href={item.href}
                    aria-current={item.href && item.active ? 'page' : undefined}
                    data-active={item.active ? 'true' : undefined}
                    onClick={(event) => {
                      onRecentSelect?.(item.id, event);
                      closeMobileSidebar();
                    }}
                  >
                    <span className={styles['recent-card-copy']}>
                      <strong>{item.title}</strong>
                      {item.subtitle && <small>{item.subtitle}</small>}
                    </span>
                    {item.badge && <Badge tone={item.tone ?? 'neutral'}>{item.badge}</Badge>}
                  </Card>
                ))}
              </div>
            </Collapsible>
          </section>
        )}

        {onFeedback && feedbackLabel && (
          <div className={styles['sidebar-feedback']}>
            {withTooltip(
              feedbackLabel,
              <NavItem
                compact={effectiveCollapsed}
                icon={MessageSquare}
                onClick={andClose(onFeedback)}
              >
                {feedbackLabel}
              </NavItem>,
            )}
          </div>
        )}

        {avatar && (
          <div className={styles['sidebar-foot']}>{withTooltip(compactAccountTooltip, avatar)}</div>
        )}
      </aside>
    </>
  );
}

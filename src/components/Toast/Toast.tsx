import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from 'lucide-react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type Dispatch,
  type FocusEvent as ReactFocusEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type RefObject,
  type SetStateAction,
} from 'react';
import { useUiMessages } from '../../i18n/UiProvider';
import { cx } from '../../internal/cx';
import { Button } from '../Button/Button';
import { IconButton } from '../IconButton/IconButton';
import styles from './Toast.module.css';

export type ToastTone = 'neutral' | 'success' | 'warning' | 'error';

/**
 * What removed the toast: its timer, the close button, its action, Escape, a newer toast (the
 * same id, or one more than `max`), or `dismiss(id)`.
 */
export type ToastDismissReason = 'timeout' | 'button' | 'action' | 'escape' | 'replaced' | 'code';

export type ToastAction = {
  label: string;
  onClick: () => void;
  /** Closes the toast before onClick runs. Default true. */
  closes?: boolean;
};

export type ToastOptions = {
  /** The same id replaces the toast in place, e.g. 'save'. Generated when left out. */
  id?: string;
  message: string;
  /** Shown below the message, e.g. a fold with technical details. */
  details?: ReactNode;
  /** Grayscale with an icon for neutral and success; colour only for warning and error. */
  tone?: ToastTone;
  /** Replaces the tone's icon; null shows none. */
  icon?: ReactNode;
  /** One action, such as Undo, Reload or Cancel. */
  action?: ToastAction;
  /** Milliseconds until it goes; null stays. Defaults: 5000 neutral and success, 8000 warning, null error. */
  duration?: number | null;
  /** Shows the close button and lets Escape close the focused toast. Default true. */
  dismissible?: boolean;
  onDismiss?: (reason: ToastDismissReason) => void;
  /** data-* attributes on the toast, e.g. hooks for tests. */
  attributes?: Record<`data-${string}`, string>;
};

export type ToastApi = {
  /** Shows a toast, or replaces the one with the same id, and returns its id. */
  show: (options: ToastOptions) => string;
  /** Changes a shown toast. The timer starts again when the message, tone or duration changes. */
  update: (id: string, options: Partial<ToastOptions>) => void;
  /** Removes a toast; its onDismiss gets 'code'. */
  dismiss: (id: string) => void;
};

export type ToasterProps = {
  /** Screen edge the toasts stack against; the newest sits nearest to it. */
  placement?: 'top' | 'bottom';
  /** Toasts shown at once; the oldest go first. Default 3. */
  max?: number;
  /** Name of the region. Defaults to the catalog text ("Notifications"). */
  label?: string;
  /** Class on the region. */
  className?: string;
  children?: ReactNode;
};

export type ToastProps = ToastOptions & {
  /** Shown while mounted and open. Default true. */
  open?: boolean;
};

type ToastRecord = {
  id: string;
  options: ToastOptions;
  /** The element that held focus when the toast arrived, for focus return. */
  focusAtShow: Element | null;
};

type Pause = 'hover' | 'focus' | 'hidden' | 'detached';
type Timer = { remaining: number; startedAt: number; handle?: ReturnType<typeof setTimeout> };
type FocusReturn = { origins: Array<Element | null>; pointer: boolean };

const defaultDurations: Record<ToastTone, number | null> = {
  neutral: 5000,
  success: 5000,
  warning: 8000,
  error: null,
};

function toneOf(options: ToastOptions): ToastTone {
  return options.tone ?? 'neutral';
}

function durationOf(options: ToastOptions): number | null {
  return options.duration === undefined ? defaultDurations[toneOf(options)] : options.duration;
}

function sameOptions(a: ToastOptions, b: ToastOptions) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)] as Array<keyof ToastOptions>);
  for (const key of keys) {
    if (key === 'action') {
      if (
        a.action?.label !== b.action?.label ||
        a.action?.onClick !== b.action?.onClick ||
        a.action?.closes !== b.action?.closes
      )
        return false;
    } else if (!Object.is(a[key], b[key])) return false;
  }
  return true;
}

const nonTextInputTypes = [
  'button',
  'checkbox',
  'color',
  'file',
  'hidden',
  'image',
  'radio',
  'range',
  'reset',
  'submit',
];

/** Fields that bring up the on-screen keyboard when they take focus. */
const textEntrySelector = [
  'textarea',
  '[contenteditable]:not([contenteditable="false"])',
  `input${nonTextInputTypes.map((type) => `:not([type="${type}"])`).join('')}`,
].join(', ');

/** Focuses `element` when it can still take focus. After a pointer dismissal text fields are skipped. */
function focusIfAvailable(element: Element | null, pointer: boolean, region: HTMLElement) {
  if (
    !(element instanceof HTMLElement) ||
    !element.isConnected ||
    element === document.body ||
    element === document.documentElement ||
    region.contains(element) ||
    element.closest('[inert], [hidden], [aria-hidden="true"]') ||
    (pointer && element.matches(textEntrySelector))
  )
    return false;
  element.focus({ preventScroll: pointer });
  return document.activeElement === element;
}

/**
 * Shows the region in the top layer, or shows it again so it sits above top-layer content opened
 * since (sheets, tooltips). Without popover support (jsdom) the region gets no popover attribute,
 * which would hide it there, and stays fixed with a z-index.
 */
function showRegion(region: HTMLElement, raise: boolean) {
  if (typeof region.showPopover !== 'function') return;
  if (!region.hasAttribute('popover')) region.setAttribute('popover', 'manual');
  try {
    if (region.matches(':popover-open')) {
      // Hiding would drop the focus of someone working in a toast; it is on top already then.
      if (!raise || region.contains(document.activeElement)) return;
      region.hidePopover();
    }
    region.showPopover();
  } catch {
    // A disconnected element cannot change layers; nothing to undo.
  }
}

/** The toasts of one Toaster: plain state outside React, so the API stays stable and synchronous. */
class ToastStore {
  items: ToastRecord[] = [];
  /** A toast arrived since the last commit, so the region goes to the top of the top layer. */
  arrived = false;
  /** Set when a toast that held focus changes or goes; applied after the next commit. */
  focusReturn: FocusReturn | null = null;
  /** The element focus came from when it last entered the region. */
  origin: Element | null = null;
  readonly api: ToastApi;
  private sequence = 0;
  private readonly timers = new Map<string, Timer>();
  /** Timers run only while the Toaster is mounted. */
  private readonly pauses = new Set<Pause>(['detached']);
  private readonly elements = new Map<string, HTMLElement>();

  constructor(
    private readonly render: Dispatch<SetStateAction<ToastRecord[]>>,
    private readonly region: RefObject<HTMLElement | null>,
    private readonly max: RefObject<number>,
  ) {
    this.api = { show: this.show, update: this.update, dismiss: this.dismiss };
  }

  has = (id: string) => this.items.some((record) => record.id === id);

  show = (input: ToastOptions): string => {
    const id = input.id ?? `toast-${++this.sequence}`;
    const options = { ...input, id };
    const existing = this.find(id);
    if (existing) {
      this.noteFocus(existing, false);
      this.commit(this.items.map((record) => (record.id === id ? { ...record, options } : record)));
      this.startTimer(id, durationOf(options));
      existing.options.onDismiss?.('replaced');
      return id;
    }

    const active = document.activeElement;
    const focusAtShow =
      active && active !== document.body && !this.region.current?.contains(active) ? active : null;
    const next = [...this.items, { id, options, focusAtShow }];
    const dropped = next.splice(0, Math.max(0, next.length - Math.max(1, this.max.current)));
    for (const record of dropped) {
      this.stopTimer(record.id);
      this.noteFocus(record, false);
    }
    this.arrived = true;
    this.commit(next);
    this.startTimer(id, durationOf(options));
    for (const record of dropped) record.options.onDismiss?.('replaced');
    return id;
  };

  update = (id: string, options: Partial<ToastOptions>) => {
    const existing = this.find(id);
    if (existing) this.set(existing, { ...existing.options, ...options, id });
  };

  dismiss = (id: string) => this.remove(id, 'code');

  /** Replaces every option of a shown toast, as a declarative Toast does on each render. */
  replace = (id: string, options: ToastOptions) => {
    const existing = this.find(id);
    if (existing && !sameOptions(existing.options, options)) this.set(existing, options);
  };

  /** Removes a toast without telling its onDismiss (its declarative Toast closed or unmounted). */
  withdraw = (id: string) => this.remove(id, 'code', { quiet: true });

  remove(id: string, reason: ToastDismissReason, { pointer = false, quiet = false } = {}) {
    const record = this.find(id);
    if (!record) return;
    this.stopTimer(id);
    this.noteFocus(record, pointer);
    this.commit(this.items.filter((item) => item.id !== id));
    if (!quiet) record.options.onDismiss?.(reason);
  }

  act(id: string, action: ToastAction, pointer: boolean) {
    if (action.closes !== false) this.remove(id, 'action', { pointer });
    action.onClick();
  }

  register(id: string, element: HTMLElement | null) {
    if (!element) {
      this.elements.delete(id);
      return;
    }
    this.elements.set(id, element);
    return () => {
      if (this.elements.get(id) === element) this.elements.delete(id);
    };
  }

  focusIn(event: ReactFocusEvent<HTMLElement>) {
    const from = event.relatedTarget;
    if (!(from instanceof Node && event.currentTarget.contains(from))) {
      this.origin =
        from instanceof Element && from !== document.body && from !== document.documentElement
          ? from
          : null;
    }
    this.setPaused('focus', true);
  }

  focusOut(event: ReactFocusEvent<HTMLElement>) {
    const to = event.relatedTarget;
    if (!(to instanceof Node && event.currentTarget.contains(to))) this.setPaused('focus', false);
  }

  setPaused(reason: Pause, paused: boolean) {
    const before = this.pauses.size > 0;
    if (paused) this.pauses.add(reason);
    else this.pauses.delete(reason);
    const after = this.pauses.size > 0;
    this.region.current?.toggleAttribute('data-paused', after);
    if (before === after) return;
    for (const [id, timer] of this.timers) {
      if (!after) {
        if (timer.handle === undefined) this.run(id, timer);
      } else if (timer.handle !== undefined) {
        clearTimeout(timer.handle);
        timer.handle = undefined;
        timer.remaining = Math.max(0, timer.remaining - (Date.now() - timer.startedAt));
      }
    }
  }

  private find(id: string) {
    return this.items.find((record) => record.id === id);
  }

  private set(existing: ToastRecord, options: ToastOptions) {
    const restart =
      options.message !== existing.options.message ||
      toneOf(options) !== toneOf(existing.options) ||
      durationOf(options) !== durationOf(existing.options);
    this.noteFocus(existing, false);
    this.commit(
      this.items.map((record) => (record.id === existing.id ? { ...record, options } : record)),
    );
    if (restart) this.startTimer(existing.id, durationOf(options));
  }

  private commit(next: ToastRecord[]) {
    this.items = next;
    this.render(next);
  }

  /** Remembers where focus goes back to, should the change take it out of the toast. */
  private noteFocus(record: ToastRecord, pointer: boolean) {
    const element = this.elements.get(record.id);
    const active = document.activeElement;
    if (!this.focusReturn && element && active && element.contains(active)) {
      this.focusReturn = { origins: [this.origin, record.focusAtShow], pointer };
    }
  }

  private startTimer(id: string, duration: number | null) {
    this.stopTimer(id);
    if (duration === null || !Number.isFinite(duration)) return;
    const timer: Timer = { remaining: Math.max(0, duration), startedAt: 0 };
    this.timers.set(id, timer);
    if (this.pauses.size === 0) this.run(id, timer);
  }

  private run(id: string, timer: Timer) {
    timer.startedAt = Date.now();
    timer.handle = setTimeout(() => {
      timer.handle = undefined;
      this.remove(id, 'timeout');
    }, timer.remaining);
  }

  private stopTimer(id: string) {
    const timer = this.timers.get(id);
    if (timer?.handle !== undefined) clearTimeout(timer.handle);
    this.timers.delete(id);
  }
}

const ToasterContext = createContext<ToastStore | null>(null);

function useToastStore(name: string): ToastStore {
  const store = useContext(ToasterContext);
  if (!store) throw new Error(`${name} must be used inside a Toaster`);
  return store;
}

/** Shows, changes and removes toasts of the nearest Toaster. */
export function useToast(): ToastApi {
  return useToastStore('useToast').api;
}

const toneIcons = {
  neutral: Info,
  success: CircleCheck,
  warning: TriangleAlert,
  error: CircleAlert,
} as const;

function ToastItem({
  record,
  row,
  store,
  dismissLabel,
}: {
  record: ToastRecord;
  row: number;
  store: ToastStore;
  dismissLabel: string;
}) {
  const { id, options } = record;
  const { message, details, icon, action, dismissible = true, attributes } = options;
  const tone = toneOf(options);
  const ToneIcon = toneIcons[tone];
  const iconNode = icon === undefined ? <ToneIcon size={18} strokeWidth={1.9} /> : icon;
  const ref = useCallback((node: HTMLDivElement | null) => store.register(id, node), [store, id]);

  function handleKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Escape' || !dismissible || event.defaultPrevented) return;
    event.preventDefault();
    event.stopPropagation();
    store.remove(id, 'escape');
  }

  return (
    <div
      {...attributes}
      ref={ref}
      className={cx(styles.toast, styles[tone])}
      data-tone={tone}
      aria-atomic="true"
      style={{ '--toast-row': row } as CSSProperties}
      onKeyDown={handleKeyDown}
    >
      {iconNode !== null && iconNode !== false && (
        <span className={styles.icon} aria-hidden="true">
          {iconNode}
        </span>
      )}
      <div className={styles.content}>
        <p className={styles.message}>{message}</p>
        {details !== undefined && details !== null && details !== false && (
          <div className={styles.details}>{details}</div>
        )}
      </div>
      {(action || dismissible) && (
        <div className={styles.actions}>
          {action && (
            <Button
              size="sm"
              variant="secondary"
              onClick={(event) => store.act(id, action, event.detail > 0)}
            >
              {action.label}
            </Button>
          )}
          {dismissible && (
            <IconButton
              size="sm"
              label={dismissLabel}
              // A click from the keyboard (Enter or Space) counts no clicks.
              onClick={(event) => store.remove(id, 'button', { pointer: event.detail > 0 })}
            >
              <X size={16} strokeWidth={1.9} />
            </IconButton>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Holds the toasts and the region that shows them. Mount it once, inside UiProvider, around the
 * app. The region sits in the browser's top layer, so cards, drawings and sheets cannot cover it.
 * Inside an open modal dialog the page behind is inert, so dialogs keep their own status lines.
 */
export function Toaster({
  placement = 'bottom',
  max = 3,
  label,
  className,
  children,
}: ToasterProps) {
  const messages = useUiMessages();
  const [items, setItems] = useState<ToastRecord[]>([]);
  const region = useRef<HTMLElement>(null);
  const latestMax = useRef(max);
  latestMax.current = max;
  const [store] = useState(() => new ToastStore(setItems, region, latestMax));

  useLayoutEffect(() => {
    const element = region.current;
    if (element) showRegion(element, false);
    store.setPaused('detached', false);
    const syncHidden = () => store.setPaused('hidden', document.hidden);
    // Watched on the document: a toast removed under the pointer sends no pointerleave.
    const syncHover = (event: PointerEvent) => {
      const target = event.type === 'pointerout' ? event.relatedTarget : event.target;
      store.setPaused('hover', target instanceof Node && Boolean(region.current?.contains(target)));
    };
    syncHidden();
    document.addEventListener('visibilitychange', syncHidden);
    document.addEventListener('pointerover', syncHover, true);
    document.addEventListener('pointerout', syncHover, true);
    return () => {
      document.removeEventListener('visibilitychange', syncHidden);
      document.removeEventListener('pointerover', syncHover, true);
      document.removeEventListener('pointerout', syncHover, true);
      // Paused, not cleared: StrictMode and Suspense mount the Toaster again with its toasts.
      store.setPaused('detached', true);
    };
  }, [store]);

  useLayoutEffect(() => {
    const element = region.current;
    if (!element) return;
    if (store.arrived) {
      store.arrived = false;
      showRegion(element, true);
    }
    const pending = store.focusReturn;
    store.focusReturn = null;
    const active = document.activeElement;
    // Only when the change dropped the focus; an action may have moved it on purpose.
    if (pending && (!active || active === document.body)) {
      pending.origins.some((origin) => focusIfAvailable(origin, pending.pointer, element));
    }
    // Not every browser sends blur when the focused toast is removed.
    store.setPaused('focus', element.contains(document.activeElement));
    if (items.length === 0) store.setPaused('hover', false);
  }, [items, store]);

  const polite: ReactNode[] = [];
  const assertive: ReactNode[] = [];
  items.forEach((record, index) => {
    const row = placement === 'top' ? items.length - index : index + 1;
    const item = (
      <ToastItem
        key={record.id}
        record={record}
        row={row}
        store={store}
        dismissLabel={messages.toast.dismiss}
      />
    );
    if (toneOf(record.options) === 'error') assertive.push(item);
    else polite.push(item);
  });

  return (
    <ToasterContext.Provider value={store}>
      {children}
      <section
        ref={region}
        aria-label={label ?? messages.toast.region}
        className={cx(styles.region, className)}
        data-placement={placement}
        style={{ '--toast-rows': Math.max(items.length, 1) } as CSSProperties}
        onFocus={(event) => store.focusIn(event)}
        onBlur={(event) => store.focusOut(event)}
      >
        {/* Both live regions exist before any toast, so screen readers announce the first one. */}
        <div role="status" aria-live="polite" aria-atomic="false" className={styles.live}>
          {polite}
        </div>
        <div role="alert" aria-live="assertive" aria-atomic="false" className={styles.live}>
          {assertive}
        </div>
      </section>
    </ToasterContext.Provider>
  );
}

/**
 * A toast written in JSX: shown while mounted and open, updated when its props change and removed
 * when it closes or unmounts (without calling onDismiss). Once the user or its timer dismissed it,
 * it shows again when the message or tone changes, or when it opens again.
 */
export function Toast({ open = true, ...options }: ToastProps) {
  const store = useToastStore('Toast');
  const generatedId = useId();
  const id = options.id ?? `toast${generatedId}`;
  const latest = useRef(options);
  latest.current = options;
  const dismissed = useRef<{ message: string; tone: ToastTone } | null>(null);

  const onDismiss = useCallback((reason: ToastDismissReason) => {
    dismissed.current = { message: latest.current.message, tone: toneOf(latest.current) };
    latest.current.onDismiss?.(reason);
  }, []);

  useEffect(() => {
    if (!open) return;
    dismissed.current = null;
    store.show({ ...latest.current, id, onDismiss });
    return () => store.withdraw(id);
  }, [open, id, store, onDismiss]);

  useEffect(() => {
    if (!open) return;
    const next = { ...latest.current, id, onDismiss };
    if (store.has(id)) {
      store.replace(id, next);
    } else if (
      dismissed.current &&
      (dismissed.current.message !== next.message || dismissed.current.tone !== toneOf(next))
    ) {
      dismissed.current = null;
      store.show(next);
    }
  });

  return null;
}

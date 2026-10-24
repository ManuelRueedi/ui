import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { cx } from '../../internal/cx';
import styles from './PageLoading.module.css';

type Phase = 'waiting' | 'loading' | 'revealing' | 'ready';
type Outline = { x: number; y: number; width: number; height: number; radius: number };

/** True while an outer PageLoading already shows its loading picture. */
const CoveredContext = createContext(false);

export type PageLoadingProps = {
  loading?: boolean;
  label?: string;
  /** Keep available content usable while its data refreshes. */
  retainContent?: boolean;
  /** Reserve a status line below compact controls instead of covering them. */
  statusPlacement?: 'overlay' | 'below';
  /** Known destination layout while route code downloads; keeps the current page mounted. */
  placeholder?: ReactNode;
  children: ReactNode;
  className?: string;
};

function durationMs(style: CSSStyleDeclaration, token: string, fallback: number) {
  const value = style.getPropertyValue(token).trim();
  const duration = parseFloat(value);
  // CSS minification can turn 240ms into .24s.
  return Number.isFinite(duration)
    ? Math.max(0, duration * (value.endsWith('ms') ? 1 : 1000))
    : fallback;
}

/**
 * Hides a page while it loads and draws the outlines of its main surfaces as a dotted picture,
 * then reveals the page in a circle. Nested PageLoadings stay quiet while an outer one shows.
 */
export function PageLoading({
  loading = false,
  label = 'Loading page',
  retainContent = false,
  statusPlacement = 'overlay',
  placeholder,
  children,
  className,
}: PageLoadingProps) {
  const blocking = loading && !retainContent;
  const covered = useContext(CoveredContext);
  const [phase, setPhaseState] = useState<Phase>(() => (blocking ? 'waiting' : 'ready'));
  const [longWait, setLongWait] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pageHidden, setPageHidden] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [outlines, setOutlines] = useState<Outline[]>([]);
  const [radius, setRadius] = useState(0);
  const surface = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const measured = useRef(false);
  const measurementFrame = useRef(0);
  const phaseRef = useRef(phase);
  const visualActive = !covered && (phase === 'loading' || phase === 'revealing');
  const showingPlaceholder =
    placeholder !== undefined && blocking && (phase === 'waiting' || phase === 'loading');
  const live = useRef({ covered, reducedMotion, pageHidden, visualActive, mounted });
  live.current = { covered, reducedMotion, pageHidden, visualActive, mounted };

  const setPhase = useCallback((next: Phase) => {
    phaseRef.current = next;
    setPhaseState(next);
  }, []);

  const measureLayout = useCallback(() => {
    const surfaceElement = surface.current;
    const contentElement = content.current;
    const { mounted, visualActive, pageHidden } = live.current;
    if (!surfaceElement || !contentElement || !mounted || !visualActive || pageHidden) return;
    const bounds = surfaceElement.getBoundingClientRect();
    // A pixel radius stays circular on both tall phones and wide panels and reaches every corner.
    setRadius(Math.ceil(Math.hypot(bounds.width, bounds.height) / 2) + 1);
    const corner = parseFloat(getComputedStyle(surfaceElement).getPropertyValue('--radius-1')) || 4;
    const next: Outline[] = [];
    const clipping = new Map<Element, { rect: DOMRect; x: boolean; y: boolean }>();
    const traced: Element[] = [];
    // Measure only major surfaces; nested controls and text add visual noise.
    const groups =
      'aside, [data-loading-outline], table, details, [role="tablist"], [role="radiogroup"]';
    for (const element of contentElement.querySelectorAll<HTMLElement>(
      `${groups}, input, textarea, select`,
    )) {
      if (traced.some((group) => group.contains(element))) continue;
      const rect = element.getBoundingClientRect();
      if (
        rect.width < 80 ||
        rect.height < 24 ||
        getComputedStyle(element).visibility === 'hidden'
      ) {
        continue;
      }
      const hidden = element.closest(
        '[hidden], [aria-hidden="true"]:not([data-loading-content]):not([data-loading-preview])',
      );
      if (hidden && contentElement.contains(hidden)) continue;
      let left = Math.max(rect.left, bounds.left);
      let top = Math.max(rect.top, bounds.top);
      let right = Math.min(rect.right, bounds.right);
      let bottom = Math.min(rect.bottom, bounds.bottom);
      // Keep borders within the same scrolling/clipping boundaries as their content.
      for (
        let ancestor = element.parentElement;
        ancestor && ancestor !== surfaceElement;
        ancestor = ancestor.parentElement
      ) {
        let clip = clipping.get(ancestor);
        if (!clip) {
          const style = getComputedStyle(ancestor);
          clip = {
            rect: ancestor.getBoundingClientRect(),
            x: /^(hidden|clip|auto|scroll)$/.test(style.overflowX),
            y: /^(hidden|clip|auto|scroll)$/.test(style.overflowY),
          };
          clipping.set(ancestor, clip);
        }
        if (clip.x) {
          left = Math.max(left, clip.rect.left);
          right = Math.min(right, clip.rect.right);
        }
        if (clip.y) {
          top = Math.max(top, clip.rect.top);
          bottom = Math.min(bottom, clip.rect.bottom);
        }
      }
      if (right - left < 6 || bottom - top < 6) continue;
      next.push({
        x: left - bounds.left,
        y: top - bounds.top,
        width: right - left,
        height: bottom - top,
        radius: corner,
      });
      traced.push(element);
    }
    setOutlines(next);
    measured.current = true;
  }, []);

  const scheduleMeasurement = useCallback(() => {
    if (measurementFrame.current) return;
    measurementFrame.current = requestAnimationFrame(() => {
      measurementFrame.current = 0;
      measureLayout();
    });
  }, [measureLayout]);

  useEffect(() => {
    const preference =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : undefined;
    const updateMotion = () => setReducedMotion(Boolean(preference?.matches));
    const updateVisibility = () => setPageHidden(document.hidden);
    updateMotion();
    updateVisibility();
    preference?.addEventListener('change', updateMotion);
    document.addEventListener('visibilitychange', updateVisibility);
    setMounted(true);
    return () => {
      cancelAnimationFrame(measurementFrame.current);
      preference?.removeEventListener('change', updateMotion);
      document.removeEventListener('visibilitychange', updateVisibility);
    };
  }, []);

  // No drawing loop: observers schedule one measurement only when geometry can change.
  useEffect(() => {
    const contentElement = content.current;
    if (!contentElement || !mounted || !visualActive || pageHidden) return;
    const resizeObserver =
      typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(scheduleMeasurement);
    const mutationObserver = new MutationObserver(scheduleMeasurement);
    resizeObserver?.observe(contentElement);
    mutationObserver.observe(contentElement, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'hidden', 'open'],
    });
    contentElement.addEventListener('scroll', scheduleMeasurement, true);
    scheduleMeasurement();
    return () => {
      cancelAnimationFrame(measurementFrame.current);
      measurementFrame.current = 0;
      resizeObserver?.disconnect();
      mutationObserver.disconnect();
      contentElement.removeEventListener('scroll', scheduleMeasurement, true);
    };
  }, [mounted, visualActive, pageHidden, scheduleMeasurement]);

  useEffect(() => {
    if (!visualActive) {
      setOutlines([]);
      measured.current = false;
    }
  }, [visualActive]);

  // Phase changes must not restart the grace period or leave a stale reveal timer.
  useLayoutEffect(() => {
    const surfaceElement = surface.current;
    if (!mounted || !surfaceElement) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const current = phaseRef.current;
    const { covered, reducedMotion, pageHidden } = live.current;

    if (blocking) {
      if (current === 'revealing') setPhase('loading');
      // Keep an already visible page in place during fast navigation/refreshes.
      if (current !== 'loading' && current !== 'revealing') {
        const delay = durationMs(getComputedStyle(surfaceElement), '--dur-page-delay', 120);
        timer = setTimeout(() => setPhase('loading'), delay);
      }
    } else if (current !== 'ready') {
      if (current === 'waiting' || !measured.current || covered || reducedMotion || pageHidden) {
        setPhase('ready');
      } else {
        // The result has replaced the placeholder in this commit. Match it before the reveal.
        cancelAnimationFrame(measurementFrame.current);
        measurementFrame.current = 0;
        measureLayout();
        setPhase('revealing');
        const duration = durationMs(getComputedStyle(surfaceElement), '--dur-page-reveal', 600);
        timer = setTimeout(() => setPhase('ready'), duration);
      }
    }
    return () => clearTimeout(timer);
  }, [blocking, mounted, measureLayout, setPhase]);

  useEffect(() => {
    if (!loading || covered) {
      setLongWait(false);
      return;
    }
    const timer = setTimeout(() => setLongWait(true), 2000);
    return () => {
      clearTimeout(timer);
      setLongWait(false);
    };
  }, [loading, covered]);

  return (
    <CoveredContext.Provider value={covered || phase !== 'ready'}>
      <div
        ref={surface}
        className={cx(styles['page-loading'], className)}
        data-state={phase}
        aria-busy={loading}
        style={
          {
            '--loading-radius': `${radius}px`,
            '--loading-wave-size': `${radius * 4}px`,
          } as CSSProperties
        }
      >
        <div
          ref={content}
          className={styles['page-content']}
          data-loading-content=""
          inert={blocking}
          aria-hidden={blocking}
        >
          {placeholder !== undefined ? (
            <>
              {showingPlaceholder && placeholder}
              <div hidden={showingPlaceholder}>{children}</div>
            </>
          ) : (
            children
          )}
        </div>
        <div
          className={styles['loading-visual']}
          data-loading-visual=""
          data-paused={pageHidden || undefined}
          aria-hidden="true"
          hidden={!visualActive}
        >
          {visualActive &&
            (['base', 'wave'] as const).map((layer) => (
              <div key={layer} className={styles['visual-layer']} data-loading-layer={layer}>
                {outlines.map((outline, index) => (
                  <div
                    key={index}
                    className={styles.outline}
                    data-loading-outline-box=""
                    style={{
                      left: outline.x,
                      top: outline.y,
                      width: outline.width,
                      height: outline.height,
                      borderRadius: outline.radius,
                    }}
                  />
                ))}
              </div>
            ))}
        </div>
        <span
          className={cx(
            styles['loading-status'],
            longWait && styles['is-visible'],
            statusPlacement === 'below' && styles.below,
          )}
        >
          {statusPlacement === 'below' && (
            <span className={styles['status-reserve']} aria-hidden="true">
              {label}
            </span>
          )}
          <span className={styles['status-message']} role="status" aria-live="polite">
            {longWait ? label : ''}
          </span>
        </span>
      </div>
    </CoveredContext.Provider>
  );
}

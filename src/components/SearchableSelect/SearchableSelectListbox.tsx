import {
  useCallback,
  useEffect,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react';
import { useUiMessages } from '../../i18n/UiProvider';
import { cx } from '../../internal/cx';
import { useSpotlight } from '../../internal/useSpotlight';
import { Tooltip } from '../Tooltip/Tooltip';
import type { NormalizedOption } from './options';
import styles from './SearchableSelectListbox.module.css';

type ListboxProps = {
  id: string;
  label?: string;
  size?: 'md' | 'lg';
  open?: boolean;
  options?: NormalizedOption[];
  value?: string;
  activeIndex?: number;
  selectedIndex?: number;
  emptyMessage?: string;
  listboxRef: RefObject<HTMLDivElement | null>;
  chooseOption: (option: NormalizedOption) => void;
  handleOptionKeyDown: (event: ReactKeyboardEvent<HTMLElement>, option: NormalizedOption) => void;
  handleListboxPointerEnter: (event: ReactPointerEvent<HTMLElement>) => void;
  handleListboxPointerMove: (event: ReactPointerEvent<HTMLElement>) => void;
  handleListboxPointerLeave: () => void;
  handleOptionPointerEnter: (event: ReactPointerEvent<HTMLElement>, index: number) => void;
};

const gap = 4;
const viewportMargin = 8;
const preferredHeight = 204;

export function SearchableSelectListbox({
  id,
  label,
  size = 'md',
  open = false,
  options = [],
  value = '',
  activeIndex = -1,
  selectedIndex = -1,
  emptyMessage,
  listboxRef,
  chooseOption,
  handleOptionKeyDown,
  handleListboxPointerEnter,
  handleListboxPointerMove,
  handleListboxPointerLeave,
  handleOptionPointerEnter,
}: ListboxProps) {
  const messages = useUiMessages();

  // The open list lives in the top layer so field wrappers and cards cannot paint over or clip it.
  const place = useCallback(() => {
    const element = listboxRef.current;
    const anchor = element?.parentElement;
    if (!element || !anchor) return;
    const rect = anchor.getBoundingClientRect();
    const below = window.innerHeight - rect.bottom - gap - viewportMargin;
    const above = rect.top - gap - viewportMargin;
    const height = Math.min(element.scrollHeight, preferredHeight);
    const flip = below < height && above > below;
    element.style.top = flip ? '' : `${Math.round(rect.bottom + gap)}px`;
    element.style.bottom = flip ? `${Math.round(window.innerHeight - rect.top + gap)}px` : '';
    element.style.left = `${Math.round(rect.left)}px`;
    element.style.width = `${Math.round(rect.width)}px`;
    element.style.maxHeight = `${Math.round(Math.max(0, Math.min(preferredHeight, flip ? above : below)))}px`;
  }, [listboxRef]);

  useEffect(() => {
    const listbox = listboxRef.current;
    if (!open || !listbox || !('showPopover' in listbox)) return;
    if (!listbox.matches(':popover-open')) listbox.showPopover();
    place();
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(place);
    if (listbox.parentElement) observer?.observe(listbox.parentElement);
    observer?.observe(listbox);
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      observer?.disconnect();
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
      if (listbox.matches(':popover-open')) listbox.hidePopover();
      for (const property of ['top', 'bottom', 'left', 'width', 'maxHeight'] as const) {
        listbox.style[property] = '';
      }
    };
  }, [open, place, listboxRef]);

  return (
    <div
      ref={listboxRef}
      id={id}
      className={styles.listbox}
      role="listbox"
      tabIndex={-1}
      aria-label={label ? messages.optionsFor(label) : messages.options}
      aria-hidden={open ? undefined : 'true'}
      data-open={open}
      data-size={size}
      hidden={!open}
      popover="manual"
      style={{ '--selected-index': selectedIndex } as CSSProperties}
      onPointerEnter={handleListboxPointerEnter}
      onPointerMove={handleListboxPointerMove}
      onPointerLeave={handleListboxPointerLeave}
    >
      {options.length ? (
        <>
          {selectedIndex >= 0 && <span className={styles['option-highlight']} aria-hidden="true" />}
          {options.map((option, index) => (
            <ListboxOption
              key={`${option.value}-${index}`}
              id={id}
              index={index}
              option={option}
              active={index === activeIndex}
              selected={option.value === value}
              onChoose={chooseOption}
              onKeyDown={handleOptionKeyDown}
              onPointerEnter={handleOptionPointerEnter}
            />
          ))}
        </>
      ) : (
        <div className={styles.empty} role="option" aria-disabled="true" aria-selected="false">
          {emptyMessage ?? messages.noMatches}
        </div>
      )}
    </div>
  );
}

function ListboxOption({
  id,
  index,
  option,
  active,
  selected,
  onChoose,
  onKeyDown,
  onPointerEnter,
}: {
  id: string;
  index: number;
  option: NormalizedOption;
  active: boolean;
  selected: boolean;
  onChoose: (option: NormalizedOption) => void;
  onKeyDown: (event: ReactKeyboardEvent<HTMLElement>, option: NormalizedOption) => void;
  onPointerEnter: (event: ReactPointerEvent<HTMLElement>, index: number) => void;
}) {
  const spotlight = useSpotlight<HTMLDivElement>({ focus: false });
  const optionId = `${id}-option-${index}`;
  return (
    <div
      ref={spotlight}
      id={optionId}
      className={cx(
        styles.option,
        active && styles['is-active'],
        selected && styles['is-selected'],
      )}
      data-option-index={index}
      role="option"
      tabIndex={-1}
      aria-label={option.label}
      aria-describedby={option.tooltip ? `${optionId}-description` : undefined}
      aria-selected={selected ? 'true' : 'false'}
      onClick={() => onChoose(option)}
      onKeyDown={(event) => onKeyDown(event, option)}
      onPointerEnter={(event) => onPointerEnter(event, index)}
    >
      <span className={styles['option-label']}>{option.label}</span>
      {option.tooltip && (
        <>
          <span id={`${optionId}-description`} className={styles['option-description']}>
            {option.tooltip}
          </span>
          <Tooltip
            className={styles['option-tooltip-trigger']}
            content={option.tooltip}
            collision="flip"
            fallbackPlacements={['right', 'top', 'bottom', 'left']}
            maxWidth="min(180px, calc(100vw - 16px))"
            openOnTouch
            placement={option.tooltipPlacement ?? 'right'}
            data-option-tooltip={option.value}
            onClick={(event) => event.stopPropagation()}
          >
            <span className={styles['option-tooltip-icon']} aria-hidden="true">
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                <circle cx="7.5" cy="7.5" r="5.75" stroke="currentColor" strokeWidth="1.4" />
                <path
                  d="M7.5 6.7V10"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
                <path
                  d="M7.5 4.95H7.51"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </Tooltip>
        </>
      )}
    </div>
  );
}

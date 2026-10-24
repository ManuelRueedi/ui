import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type InputHTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { useUiMessages } from '../../i18n/UiProvider';
import { cx } from '../../internal/cx';
import { prefersReducedMotion } from '../../internal/reducedMotion';
import { useControllableState } from '../../internal/useControllableState';
import { useSpotlight } from '../../internal/useSpotlight';
import { Field } from '../Field/Field';
import { SearchableSelectListbox } from './SearchableSelectListbox';
import {
  filterSelectOptions,
  findSelectOptionIndex,
  getSelectDisplayValue,
  normalizeSelectOption,
  type NormalizedOption,
  type SearchableSelectOption,
} from './options';
import styles from './SearchableSelect.module.css';

export type { NormalizedOption, SearchableSelectOption } from './options';

export type SearchableSelectProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'defaultValue' | 'size' | 'onSelect' | 'type' | 'children'
> & {
  label?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  options?: SearchableSelectOption[];
  size?: 'md' | 'lg';
  description?: string;
  error?: string;
  hideLabel?: boolean;
  emptyMessage?: string;
  /** Lets the user keep typed text that matches no option. */
  allowCustom?: boolean;
  /** Turn off to filter on the server with `onQueryChange`. */
  filterOptions?: boolean;
  onQueryChange?: (query: string) => void;
  onSelect?: (option: NormalizedOption) => void;
};

/** A text field with a filtered list of options (combobox). */
export function SearchableSelect({
  id,
  label,
  value: valueProp,
  defaultValue = '',
  onValueChange,
  options = [],
  size = 'md',
  placeholder,
  description,
  error,
  disabled = false,
  hideLabel = false,
  readOnly = false,
  required = false,
  emptyMessage,
  allowCustom = false,
  filterOptions = true,
  onQueryChange,
  onSelect,
  className,
  ...rest
}: SearchableSelectProps) {
  const messages = useUiMessages();
  const generatedId = useId();
  const inputId = id ?? `searchable-select-${generatedId}`;
  const listboxId = `${inputId}-listbox`;
  const [value, setValue] = useControllableState(valueProp, defaultValue, onValueChange);
  const normalizedOptions = useMemo(() => options.map(normalizeSelectOption), [options]);
  const displayValue = getSelectDisplayValue(normalizedOptions, value);
  const [query, setQuery] = useState(displayValue);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const listbox = useRef<HTMLDivElement>(null);
  const pointer = useRef({ over: false, x: 0, y: 0, type: '' });
  const spotlight = useSpotlight<HTMLDivElement>({
    disabled: disabled || readOnly,
    focus: false,
    keyboard: false,
  });

  const filteredOptions = filterOptions
    ? filterSelectOptions(normalizedOptions, query)
    : normalizedOptions;
  const selectedFilteredIndex = findSelectOptionIndex(filteredOptions, value);
  const activeOptionId =
    isOpen && activeIndex >= 0 && filteredOptions[activeIndex]
      ? `${listboxId}-option-${activeIndex}`
      : undefined;

  // Handlers on the document read the newest state through this ref.
  const latest = useRef({ isOpen, query, value, displayValue, filteredOptions });
  latest.current = { isOpen, query, value, displayValue, filteredOptions };

  function canInteract() {
    return !disabled && !readOnly && !input.current?.matches(':disabled');
  }

  function activeIndexForCurrentValue() {
    const selectedIndex = findSelectOptionIndex(normalizedOptions, latest.current.value);
    if (selectedIndex >= 0) return selectedIndex;
    return normalizedOptions.length ? 0 : -1;
  }

  function openList({ resetSearch = false } = {}) {
    if (!canInteract()) return;
    if (resetSearch && !latest.current.isOpen) {
      setQuery('');
      latest.current.query = '';
      onQueryChange?.('');
      setActiveIndex(activeIndexForCurrentValue());
    }
    latest.current.isOpen = true;
    setIsOpen(true);
  }

  function closeList() {
    latest.current.isOpen = false;
    setIsOpen(false);
    setActiveIndex(-1);
    pointer.current.over = false;
  }

  function restoreQuery() {
    setQuery(latest.current.displayValue);
  }

  function commitCustomQuery() {
    if (!canInteract() || !latest.current.isOpen) return;
    const typed = latest.current.query.trim();
    if (allowCustom && typed) {
      setValue(typed);
      setQuery(typed);
      return;
    }
    restoreQuery();
  }

  /** Leaving the field keeps typed custom text, like pressing Enter. */
  function leave() {
    const { isOpen, query, displayValue } = latest.current;
    if (allowCustom && isOpen && query !== displayValue) commitCustomQuery();
    else restoreQuery();
    closeList();
  }

  function choose(option: NormalizedOption) {
    if (!canInteract() || !latest.current.isOpen) return;
    setValue(option.value);
    setQuery(option.label);
    onSelect?.(option);
    closeList();
  }

  const leaveRef = useRef(leave);
  leaveRef.current = leave;

  // Shows the chosen option's label whenever the list is closed.
  useEffect(() => {
    if (!isOpen) setQuery(displayValue);
  }, [isOpen, displayValue]);

  useEffect(() => {
    if (disabled || readOnly) {
      closeList();
      restoreQuery();
    }
    // Chromium can keep focus on an input that becomes disabled.
    if (disabled && input.current === document.activeElement) input.current?.blur();
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled, readOnly]);

  useEffect(() => {
    if (!isOpen) return;
    if (filteredOptions.length === 0) setActiveIndex(-1);
    else if (activeIndex < 0 || activeIndex >= filteredOptions.length) setActiveIndex(0);
  }, [isOpen, filteredOptions.length, activeIndex]);

  // Keeps the active option in view.
  useLayoutEffect(() => {
    const element = listbox.current;
    if (!isOpen || activeIndex < 0 || !element) return;
    const option = element.querySelector<HTMLElement>(`[data-option-index="${activeIndex}"]`);
    if (!option) return;
    const inset = 4;
    const optionTop = option.offsetTop;
    const optionBottom = optionTop + option.offsetHeight;
    const visibleTop = element.scrollTop;
    const visibleBottom = visibleTop + element.clientHeight;
    const scrollTo = (top: number) => {
      if (Math.abs(element.scrollTop - top) < 1 || typeof element.scrollTo !== 'function') return;
      element.scrollTo({ top, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    };
    if (optionTop < visibleTop + inset) scrollTo(Math.max(optionTop - inset, 0));
    else if (optionBottom > visibleBottom - inset) {
      scrollTo(optionBottom - element.clientHeight + inset);
    }
  }, [isOpen, activeIndex]);

  // After typing, the option under a resting mouse becomes active again.
  const syncPending = useRef(false);
  // Runs after every render on purpose; the flag above keeps it to one sync per keystroke.
  // oxlint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    if (!syncPending.current) return;
    syncPending.current = false;
    const element = listbox.current;
    const { over, x, y, type } = pointer.current;
    if (!canInteract() || !isOpen || !over || !element || type !== 'mouse') return;
    if (typeof document.elementFromPoint !== 'function') return;
    const option = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-option-index]');
    if (!option || !element.contains(option)) return;
    const index = Number(option.dataset.optionIndex);
    if (Number.isInteger(index) && index >= 0 && index < filteredOptions.length) {
      setActiveIndex(index);
    }
  });

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) leaveRef.current();
    }
    // Native fieldset changes do not update the component's disabled prop.
    const fieldsetObserver = new MutationObserver(() => {
      if (input.current?.matches(':disabled')) {
        latest.current.isOpen = false;
        setIsOpen(false);
        setActiveIndex(-1);
        setQuery(latest.current.displayValue);
        if (input.current === document.activeElement) input.current.blur();
      }
    });
    for (let ancestor = input.current?.parentElement; ancestor; ancestor = ancestor.parentElement) {
      if (ancestor instanceof HTMLFieldSetElement) {
        fieldsetObserver.observe(ancestor, { attributes: true, attributeFilter: ['disabled'] });
      }
    }
    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      fieldsetObserver.disconnect();
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, []);

  function handleInput(event: ChangeEvent<HTMLInputElement>) {
    if (!canInteract()) {
      restoreQuery();
      return;
    }
    const next = event.currentTarget.value;
    setQuery(next);
    latest.current.query = next;
    onQueryChange?.(next);
    setActiveIndex(0);
    openList();
    if (pointer.current.over && pointer.current.type === 'mouse') syncPending.current = true;
  }

  function rememberPointer(event: ReactPointerEvent<HTMLElement>) {
    pointer.current.x = event.clientX;
    pointer.current.y = event.clientY;
    pointer.current.type = event.pointerType;
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (!canInteract()) return;
    const count = filteredOptions.length;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!isOpen) return openList({ resetSearch: true });
        if (count) setActiveIndex((activeIndex + 1) % count);
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (!isOpen) return openList({ resetSearch: true });
        if (count) setActiveIndex(activeIndex <= 0 ? count - 1 : activeIndex - 1);
        break;
      case 'Home':
        if (isOpen && count) {
          event.preventDefault();
          setActiveIndex(0);
        }
        break;
      case 'End':
        if (isOpen && count) {
          event.preventDefault();
          setActiveIndex(count - 1);
        }
        break;
      case 'Enter':
        if (!isOpen) return;
        event.preventDefault();
        if (activeIndex >= 0 && filteredOptions[activeIndex]) choose(filteredOptions[activeIndex]);
        else {
          commitCustomQuery();
          closeList();
        }
        break;
      case 'Escape':
        if (isOpen) {
          event.preventDefault();
          restoreQuery();
          closeList();
        }
        break;
      case 'Tab':
        leave();
        break;
    }
  }

  return (
    <Field
      id={inputId}
      label={hideLabel ? undefined : label}
      description={description}
      error={error}
      disabled={disabled}
      readOnly={readOnly}
      required={required}
      className={className}
    >
      {({ describedBy }) => (
        <div ref={root} className={styles['searchable-select']} data-open={isOpen}>
          <div className={styles.combobox}>
            <div
              ref={spotlight}
              className={cx(
                styles.control,
                disabled && styles.disabled,
                readOnly && styles.readonly,
                error && styles.invalid,
              )}
              data-size={size}
            >
              <input
                {...rest}
                ref={input}
                id={inputId}
                className={styles.input}
                value={query}
                role="combobox"
                type="text"
                placeholder={placeholder ?? messages.search}
                disabled={disabled}
                required={required}
                readOnly={readOnly}
                autoComplete="off"
                aria-autocomplete="list"
                aria-controls={listboxId}
                aria-expanded={isOpen ? 'true' : 'false'}
                aria-label={hideLabel && label ? label : undefined}
                aria-activedescendant={activeOptionId}
                aria-invalid={error ? 'true' : undefined}
                aria-describedby={describedBy}
                onPointerDown={() => {
                  if (!isOpen) openList({ resetSearch: true });
                }}
                onChange={handleInput}
                onFocus={() => openList({ resetSearch: true })}
                onKeyDown={handleKeyDown}
              />
              <span className={styles.caret} aria-hidden="true">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M3 4.5L6 7.5L9 4.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </div>
            <SearchableSelectListbox
              listboxRef={listbox}
              id={listboxId}
              label={label}
              size={size}
              open={isOpen}
              options={filteredOptions}
              value={value}
              activeIndex={activeIndex}
              selectedIndex={selectedFilteredIndex}
              emptyMessage={emptyMessage}
              chooseOption={choose}
              handleOptionKeyDown={(event, option) => {
                if (!canInteract() || !isOpen || (event.key !== 'Enter' && event.key !== ' ')) {
                  return;
                }
                event.preventDefault();
                choose(option);
              }}
              handleListboxPointerEnter={(event) => {
                if (!canInteract() || !isOpen) return;
                pointer.current.over = true;
                rememberPointer(event);
              }}
              handleListboxPointerMove={rememberPointer}
              handleListboxPointerLeave={() => {
                pointer.current.over = false;
              }}
              handleOptionPointerEnter={(event, index) => {
                if (!canInteract() || !isOpen) return;
                rememberPointer(event);
                if (event.pointerType === 'mouse') setActiveIndex(index);
              }}
            />
          </div>
        </div>
      )}
    </Field>
  );
}

import { ArrowLeft, Pencil, Plus, X } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import { useUiMessages } from '../../i18n/UiProvider';
import { cx } from '../../internal/cx';
import { prefersReducedMotion } from '../../internal/reducedMotion';
import { useControllableState } from '../../internal/useControllableState';
import { Button } from '../Button/Button';
import {
  SearchableSelect,
  type SearchableSelectOption,
} from '../SearchableSelect/SearchableSelect';
import { Tooltip } from '../Tooltip/Tooltip';
import styles from './EditableSelect.module.css';

export type EditableSelectMode = 'select' | 'create' | 'edit';
/** Return false to stay in the current mode. */
type ActionHandler = () => boolean | void;

export type EditableSelectProps = {
  id?: string;
  label?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  mode?: EditableSelectMode;
  defaultMode?: EditableSelectMode;
  onModeChange?: (mode: EditableSelectMode) => void;
  options?: SearchableSelectOption[];
  placeholder?: string;
  description?: string;
  error?: string;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  emptyMessage?: string;
  allowCustom?: boolean;
  addLabel?: string;
  editLabel?: string;
  addShortLabel?: string;
  editShortLabel?: string;
  createLabel?: string;
  saveLabel?: string;
  createFormLabel?: string;
  editFormLabel?: string;
  backLabel?: string;
  showBack?: boolean;
  /** true shows a hold-to-discard button, false hides save; leave out for both back and save. */
  hasChanges?: boolean;
  saveDisabled?: boolean;
  onCreate?: ActionHandler;
  onEdit?: ActionHandler;
  /** Return false (or a promise of false) to keep the form open. */
  onSave?: () => boolean | void | Promise<boolean | void>;
  onBack?: ActionHandler;
  /** The fields for creating or editing an entry. */
  form?: (mode: EditableSelectMode) => ReactNode;
  className?: string;
};

const modeTransitionDuration = 160;
const discardHoldMs = 500;

/** Pick an entry from a list, or create or edit one in place. */
export function EditableSelect({
  id,
  label: labelProp,
  value: valueProp,
  defaultValue = '',
  onValueChange,
  mode: modeProp,
  defaultMode = 'select',
  onModeChange,
  options = [],
  placeholder,
  description,
  error,
  disabled = false,
  readOnly = false,
  required = false,
  emptyMessage,
  allowCustom = false,
  addLabel: addLabelProp,
  editLabel: editLabelProp,
  addShortLabel: addShortLabelProp,
  editShortLabel: editShortLabelProp,
  createLabel: createLabelProp,
  saveLabel: saveLabelProp,
  createFormLabel,
  editFormLabel,
  backLabel: backLabelProp,
  showBack = true,
  hasChanges,
  saveDisabled = false,
  onCreate,
  onEdit,
  onSave,
  onBack,
  form,
  className,
}: EditableSelectProps) {
  const messages = useUiMessages();
  const editable = messages.editable;
  const generatedId = useId();
  const controlId = id ?? `editable-select-${generatedId}`;
  const [value, setValue] = useControllableState(valueProp, defaultValue, onValueChange);
  const [mode, setMode] = useControllableState<EditableSelectMode>(
    modeProp,
    defaultMode,
    onModeChange,
  );
  const [saving, setSaving] = useState(false);
  const [holdingDiscard, setHoldingDiscard] = useState(false);
  const discardTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const modeElement = useRef<HTMLDivElement>(null);
  const previousModeHeight = useRef<number | undefined>(undefined);
  const previousMode = useRef(mode);

  const label = labelProp ?? messages.selection;
  const addLabel = addLabelProp ?? editable.add;
  const editLabel = editLabelProp ?? editable.edit;
  const addShortLabel = addShortLabelProp ?? editable.create;
  const editShortLabel = editShortLabelProp ?? editable.edit;
  const createLabel = createLabelProp ?? editable.create;
  const saveLabel = saveLabelProp ?? editable.save;
  const backLabel = backLabelProp ?? editable.back;
  const isLocked = disabled || readOnly || saving;
  const canEdit = Boolean(value) && !isLocked;
  const currentSaveLabel = mode === 'edit' ? saveLabel : createLabel;
  const currentFormLabel =
    mode === 'edit'
      ? (editFormLabel ?? editLabelProp ?? editable.editSelection)
      : (createFormLabel ?? createLabelProp ?? editable.createSelection);
  const latest = useRef({ isLocked, hasChanges });
  latest.current = { isLocked, hasChanges };

  const cancelDiscard = useCallback(() => {
    clearTimeout(discardTimer.current);
    discardTimer.current = undefined;
    setHoldingDiscard(false);
  }, []);

  // Cancel a pending hold when this form closes, locks, or becomes unchanged.
  useEffect(() => cancelDiscard, [mode, isLocked, hasChanges, cancelDiscard]);

  function changeMode(next: EditableSelectMode) {
    previousModeHeight.current = modeElement.current?.offsetHeight;
    setMode(next);
  }

  // The new mode grows or shrinks from the old height while it fades in.
  useLayoutEffect(() => {
    if (previousMode.current === mode) return;
    previousMode.current = mode;
    const node = modeElement.current;
    const startHeight = previousModeHeight.current;
    previousModeHeight.current = undefined;
    if (!node || typeof node.animate !== 'function' || prefersReducedMotion()) return;
    const endHeight = node.offsetHeight;
    const y = mode === 'select' ? 8 : -6;
    node.animate(
      [
        {
          height: `${startHeight ?? endHeight}px`,
          opacity: 0.35,
          overflow: 'hidden',
          transform: `translateY(${y}px)`,
        },
        { height: `${endHeight}px`, opacity: 1, overflow: 'hidden', transform: 'translateY(0)' },
      ],
      { duration: modeTransitionDuration, easing: 'cubic-bezier(0.65, 0, 0.35, 1)' },
    );
  }, [mode]);

  function back() {
    if (onBack?.() !== false) changeMode('select');
  }

  function startDiscard() {
    if (isLocked || !hasChanges || discardTimer.current !== undefined) return;
    setHoldingDiscard(true);
    discardTimer.current = setTimeout(() => {
      cancelDiscard();
      if (!latest.current.isLocked && latest.current.hasChanges) back();
    }, discardHoldMs);
  }

  function discardKeyDown(event: ReactKeyboardEvent<HTMLElement>) {
    if (event.key === 'Escape') cancelDiscard();
    if (event.key !== ' ' && event.key !== 'Enter') return;
    event.preventDefault();
    if (!event.repeat) startDiscard();
  }

  function startCreate() {
    if (isLocked) return;
    if (onCreate?.() !== false) changeMode('create');
  }

  function startEdit() {
    if (!canEdit) return;
    if (onEdit?.() !== false) changeMode('edit');
  }

  async function save() {
    if (saveDisabled || isLocked) return;
    const result = onSave?.();
    if (result instanceof Promise) {
      setSaving(true);
      try {
        if ((await result) !== false) changeMode('select');
      } finally {
        setSaving(false);
      }
    } else if (result !== false) {
      changeMode('select');
    }
  }

  const compactActions = hasChanges === undefined;

  return (
    <div
      className={cx(styles['editable-select'], className)}
      data-mode={mode}
      data-loading-outline=""
    >
      {label && (
        <div className={styles['label-stage']} aria-hidden="true">
          <span
            className={cx(
              styles['mode-label'],
              styles['select-label'],
              isLocked && styles['disabled-label'],
            )}
          >
            <span>{label}</span>
            {required && (
              <span className={styles.required} aria-hidden="true">
                *
              </span>
            )}
          </span>
          <span
            className={cx(
              styles['mode-label'],
              styles['form-label'],
              isLocked && styles['disabled-label'],
            )}
          >
            {currentFormLabel}
          </span>
        </div>
      )}

      {mode === 'select' ? (
        <div key="select" ref={modeElement} className={styles['select-row']}>
          <SearchableSelect
            id={controlId}
            value={value}
            onValueChange={setValue}
            label={label}
            options={options}
            placeholder={placeholder}
            description={description}
            error={error}
            disabled={disabled}
            readOnly={readOnly}
            required={required}
            emptyMessage={emptyMessage}
            allowCustom={allowCustom}
            hideLabel
          />
          <div className={styles['action-row']}>
            <Tooltip content={addLabel} placement="top" className={styles['action-anchor']}>
              <Button
                className={styles['editable-action']}
                variant="ghost"
                aria-label={addLabel}
                onClick={startCreate}
                disabled={isLocked}
              >
                <Plus size={15} strokeWidth={1.9} />
                <span className={styles['action-label']}>{addShortLabel}</span>
              </Button>
            </Tooltip>
            {canEdit && (
              <Tooltip content={editLabel} placement="top" className={styles['action-anchor']}>
                <Button
                  className={styles['editable-action']}
                  variant="ghost"
                  aria-label={editLabel}
                  onClick={startEdit}
                >
                  <Pencil size={15} strokeWidth={1.9} />
                  <span className={styles['action-label']}>{editShortLabel}</span>
                </Button>
              </Tooltip>
            )}
          </div>
        </div>
      ) : (
        <div
          key="form"
          ref={modeElement}
          className={styles['form-shell']}
          role="group"
          aria-label={mode === 'edit' ? editLabel : addLabel}
        >
          <fieldset className={styles['form-fields']} disabled={isLocked}>
            {form?.(mode)}
          </fieldset>
          <div className={styles['action-row']}>
            {hasChanges ? (
              <Tooltip
                content={editable.holdToDiscard}
                placement="top"
                className={styles['action-anchor']}
              >
                <Button
                  aria-label={editable.discard}
                  aria-description={editable.holdToDiscard}
                  disabled={isLocked}
                  onPointerDown={(event) => {
                    if (event.button === 0 && event.isPrimary) startDiscard();
                  }}
                  onPointerUp={cancelDiscard}
                  onPointerCancel={cancelDiscard}
                  onPointerLeave={cancelDiscard}
                  onKeyDown={discardKeyDown}
                  onKeyUp={(event) => {
                    if (event.key === ' ' || event.key === 'Enter') {
                      event.preventDefault();
                      cancelDiscard();
                    }
                  }}
                  onBlur={cancelDiscard}
                  onClick={(event) => event.preventDefault()}
                  onContextMenu={(event) => event.preventDefault()}
                >
                  <X size={15} strokeWidth={1.9} />
                  <span>{editable.discard}</span>
                  <span
                    className={cx(styles['hold-progress'], holdingDiscard && styles.holding)}
                    aria-hidden="true"
                  />
                </Button>
              </Tooltip>
            ) : (
              (showBack || (hasChanges === false && mode === 'edit')) && (
                <Tooltip content={backLabel} placement="top" className={styles['action-anchor']}>
                  <Button
                    className={compactActions ? styles['editable-action'] : undefined}
                    aria-label={backLabel}
                    onClick={back}
                    disabled={saving}
                  >
                    <ArrowLeft size={15} strokeWidth={1.9} />
                    <span className={compactActions ? styles['action-label'] : undefined}>
                      {backLabel}
                    </span>
                  </Button>
                </Tooltip>
              )
            )}
            {hasChanges !== false && (
              <Tooltip
                content={currentSaveLabel}
                placement="top"
                className={styles['action-anchor']}
              >
                <Button
                  className={compactActions ? styles['editable-action'] : undefined}
                  aria-label={currentSaveLabel}
                  onClick={save}
                  disabled={saveDisabled || isLocked}
                  state={saving ? 'loading' : 'idle'}
                >
                  {mode === 'edit' ? (
                    <Pencil size={15} strokeWidth={1.9} />
                  ) : (
                    <Plus size={15} strokeWidth={1.9} />
                  )}
                  <span className={compactActions ? styles['action-label'] : undefined}>
                    {currentSaveLabel}
                  </span>
                </Button>
              </Tooltip>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

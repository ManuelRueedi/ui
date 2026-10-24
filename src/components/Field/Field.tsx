import { useId, type ReactNode } from 'react';
import { cx } from '../../internal/cx';
import styles from './Field.module.css';

export type FieldContext = {
  inputId: string;
  descriptionId?: string;
  errorId?: string;
  describedBy?: string;
  invalid: boolean;
};

export type FieldProps = {
  id?: string;
  label?: string;
  hideLabel?: boolean;
  description?: string;
  error?: string;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  /** Renders the control; gets the ids to connect it to the label, description and error. */
  children?: (field: FieldContext) => ReactNode;
  className?: string;
};

/** Label, description and error around one form control. */
export function Field({
  id,
  label,
  hideLabel = false,
  description,
  error,
  disabled = false,
  readOnly = false,
  required = false,
  children,
  className,
}: FieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const invalid = Boolean(error);
  const descriptionId = description ? `${inputId}-description` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [descriptionId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div
      className={cx(
        styles.field,
        disabled && styles.disabled,
        readOnly && styles.readonly,
        invalid && styles.invalid,
        className,
      )}
    >
      {label && (
        <label
          className={cx(styles.label, hideLabel && styles['visually-hidden'])}
          htmlFor={inputId}
        >
          <span>{label}</span>
          {required && (
            <span className={styles.required} aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}
      {children?.({ inputId, descriptionId, errorId, describedBy, invalid })}
      {description && (
        <span id={descriptionId} className={styles.description}>
          {description}
        </span>
      )}
      {error && (
        <span id={errorId} className={styles['error-message']}>
          {error}
        </span>
      )}
    </div>
  );
}

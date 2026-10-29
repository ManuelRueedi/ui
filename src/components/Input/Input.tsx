import type { InputHTMLAttributes, ReactNode, Ref } from 'react';
import { cx } from '../../internal/cx';
import { useSpotlight } from '../../internal/useSpotlight';
import { Field } from '../Field/Field';
import styles from './Input.module.css';

export type InputType =
  | 'text'
  | 'email'
  | 'password'
  | 'search'
  | 'url'
  | 'tel'
  | 'number'
  | 'date'
  | 'time'
  | 'datetime-local'
  | 'month'
  | 'week';

export type InputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'size' | 'prefix' | 'children'
> & {
  label?: string;
  hideLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'plain';
  type?: InputType;
  description?: string;
  error?: string;
  prefix?: ReactNode;
  suffix?: ReactNode;
  /** Drawn behind the typed text, inside the field, e.g. to mark or annotate the value. */
  underlay?: ReactNode;
  ref?: Ref<HTMLInputElement>;
};

export function Input({
  id,
  label,
  hideLabel = false,
  size = 'md',
  variant = 'default',
  placeholder = '',
  type = 'text',
  description,
  error,
  disabled = false,
  readOnly = false,
  required = false,
  prefix,
  suffix,
  underlay,
  className,
  ...rest
}: InputProps) {
  const spotlight = useSpotlight<HTMLSpanElement>({
    disabled: disabled || readOnly,
    focus: false,
    keyboard: false,
  });

  return (
    <Field
      id={id}
      label={label}
      hideLabel={hideLabel}
      description={description}
      error={error}
      disabled={disabled}
      readOnly={readOnly}
      required={required}
      className={className}
    >
      {({ inputId, describedBy }) => (
        <span
          ref={spotlight}
          className={cx(
            styles.control,
            disabled && styles.disabled,
            readOnly && styles.readonly,
            error && styles.invalid,
          )}
          data-size={size}
          data-variant={variant}
        >
          {underlay && (
            <span className={styles.underlay} aria-hidden="true">
              {underlay}
            </span>
          )}
          {prefix && (
            <span className={cx(styles.affix, styles.prefix)} aria-hidden="true">
              {prefix}
            </span>
          )}
          <input
            {...rest}
            id={inputId}
            className={styles.input}
            type={type}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            readOnly={readOnly}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={describedBy}
          />
          {suffix && <span className={cx(styles.affix, styles.suffix)}>{suffix}</span>}
        </span>
      )}
    </Field>
  );
}

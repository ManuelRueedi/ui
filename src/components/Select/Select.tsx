import type { Ref, SelectHTMLAttributes } from 'react';
import { cx } from '../../internal/cx';
import { useSpotlight } from '../../internal/useSpotlight';
import { Field } from '../Field/Field';
import styles from './Select.module.css';

export type SelectOption = { value: string; label: string; disabled?: boolean };

export type SelectProps = Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  'size' | 'children' | 'value' | 'defaultValue' | 'multiple'
> & {
  label?: string;
  hideLabel?: boolean;
  value?: string;
  defaultValue?: string;
  options?: SelectOption[];
  /** An empty first choice, e.g. "Choose…". */
  placeholder?: string;
  size?: 'md' | 'lg';
  variant?: 'default' | 'plain';
  description?: string;
  error?: string;
  /** Shows the chosen label as read-only text. A hidden input still sends the value with a form. */
  readOnly?: boolean;
  ref?: Ref<HTMLSelectElement>;
};

/** The native select, styled. For long lists with search, use SearchableSelect. */
export function Select({
  id,
  name,
  label,
  hideLabel = false,
  value,
  defaultValue,
  options = [],
  placeholder = '',
  size = 'md',
  variant = 'default',
  description,
  error,
  disabled = false,
  readOnly = false,
  required = false,
  className,
  ...rest
}: SelectProps) {
  const spotlight = useSpotlight<HTMLDivElement>({
    disabled: disabled || readOnly,
    focus: false,
    keyboard: false,
  });
  const shownValue = value ?? defaultValue ?? '';
  const selectedLabel = options.find((option) => option.value === shownValue)?.label ?? shownValue;

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
        <div
          ref={spotlight}
          className={cx(styles.control, error && styles.invalid)}
          data-size={size}
          data-variant={variant}
        >
          {readOnly ? (
            <>
              <input
                id={inputId}
                className={styles.input}
                type="text"
                value={selectedLabel}
                placeholder={placeholder}
                disabled={disabled}
                readOnly
                aria-required={required || undefined}
                aria-invalid={error ? 'true' : undefined}
                aria-describedby={describedBy}
              />
              {name && (
                <input
                  className={styles.input}
                  type="hidden"
                  name={name}
                  value={shownValue}
                  disabled={disabled}
                />
              )}
            </>
          ) : (
            <select
              {...rest}
              id={inputId}
              className={styles.select}
              name={name}
              value={value}
              defaultValue={value === undefined ? defaultValue : undefined}
              disabled={disabled}
              required={required}
              aria-invalid={error ? 'true' : undefined}
              aria-describedby={describedBy}
            >
              {placeholder && (
                <option className={styles.option} value="">
                  {placeholder}
                </option>
              )}
              {options.map((option) => (
                <option
                  key={option.value}
                  className={styles.option}
                  value={option.value}
                  disabled={option.disabled}
                >
                  {option.label}
                </option>
              ))}
            </select>
          )}
        </div>
      )}
    </Field>
  );
}

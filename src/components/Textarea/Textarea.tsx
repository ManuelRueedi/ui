import type { Ref, TextareaHTMLAttributes } from 'react';
import { cx } from '../../internal/cx';
import { useSpotlight } from '../../internal/useSpotlight';
import { Field } from '../Field/Field';
import styles from './Textarea.module.css';

export type TextareaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'children'> & {
  label?: string;
  hideLabel?: boolean;
  size?: 'md' | 'lg';
  variant?: 'default' | 'plain';
  description?: string;
  error?: string;
  ref?: Ref<HTMLTextAreaElement>;
};

export function Textarea({
  id,
  label,
  hideLabel = false,
  placeholder = '',
  rows = 3,
  size = 'md',
  variant = 'default',
  description,
  error,
  disabled = false,
  readOnly = false,
  required = false,
  className,
  ...rest
}: TextareaProps) {
  const spotlight = useSpotlight<HTMLDivElement>({
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
        <div
          ref={spotlight}
          className={cx(styles.control, error && styles.invalid)}
          data-size={size}
          data-variant={variant}
        >
          <textarea
            {...rest}
            id={inputId}
            className={styles.textarea}
            placeholder={placeholder}
            rows={rows}
            disabled={disabled}
            readOnly={readOnly}
            required={required}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={describedBy}
          />
        </div>
      )}
    </Field>
  );
}

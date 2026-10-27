import { AlertTriangle, Check } from 'lucide-react';
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode, Ref } from 'react';
import { useUiMessages } from '../../i18n/UiProvider';
import { cx } from '../../internal/cx';
import { useMergedRefs } from '../../internal/refs';
import { useSpotlight } from '../../internal/useSpotlight';
import styles from './Button.module.css';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';
export type ButtonAsyncState = 'idle' | 'loading' | 'success' | 'error';

type CommonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a running, done or failed state in place of the label. */
  state?: ButtonAsyncState;
  loadingLabel?: string;
  successLabel?: string;
  errorLabel?: string;
  /** Lets a long label break onto several lines, aligned to the start, e.g. in a narrow panel. */
  wrap?: boolean;
  children?: ReactNode;
};

type ButtonElementProps = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof CommonProps> & {
    href?: undefined;
    ref?: Ref<HTMLButtonElement>;
  };

type LinkElementProps = CommonProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof CommonProps> & {
    /** Makes the button a link to this address, for a step that opens another page. */
    href: string;
    disabled?: boolean;
    ref?: Ref<HTMLAnchorElement>;
  };

export type ButtonProps = ButtonElementProps | LinkElementProps;

export function Button(props: ButtonProps) {
  const messages = useUiMessages();
  const {
    variant = 'secondary',
    size = 'md',
    state: asyncState = 'idle',
    loadingLabel = messages.button.working,
    successLabel = messages.button.done,
    errorLabel = messages.button.failed,
    wrap = false,
    className,
    children,
  } = props;
  const isLoading = asyncState === 'loading';
  const statusLabel =
    asyncState === 'loading'
      ? loadingLabel
      : asyncState === 'success'
        ? successLabel
        : asyncState === 'error'
          ? errorLabel
          : '';
  const classes = cx(styles.button, styles[variant], styles[size], wrap && styles.wrap, className);

  const content = (
    <span className={styles['content-shell']}>
      <span className={styles['idle-content']} aria-hidden={asyncState !== 'idle'}>
        {children}
      </span>
      <span
        className={styles['status-content']}
        aria-hidden={asyncState === 'idle'}
        aria-live={asyncState === 'idle' ? 'off' : 'polite'}
        role={asyncState === 'idle' ? undefined : 'status'}
      >
        {asyncState === 'success' && (
          <Check
            className={cx(styles['status-icon'], styles['check-icon'], styles.pop)}
            size={15}
            strokeWidth={2.3}
          />
        )}
        {asyncState === 'error' && (
          <AlertTriangle
            className={cx(styles['status-icon'], styles.pop)}
            size={15}
            strokeWidth={1.9}
          />
        )}
        {statusLabel && <span className={styles['status-label']}>{statusLabel}</span>}
      </span>
    </span>
  );

  if (props.href !== undefined) {
    return <LinkButton {...props} className={classes} inner={content} />;
  }

  const {
    variant: _variant,
    size: _size,
    state: _state,
    loadingLabel: _loadingLabel,
    successLabel: _successLabel,
    errorLabel: _errorLabel,
    wrap: _wrap,
    className: _className,
    children: _children,
    href: _href,
    ref,
    type = 'button',
    disabled = false,
    onClick,
    ...rest
  } = props;
  const isDisabled = disabled || isLoading;

  return (
    <SpotlightButton
      {...rest}
      buttonRef={ref}
      type={type}
      disabled={isDisabled}
      data-state={asyncState}
      aria-busy={isLoading}
      className={classes}
      onClick={(event) => {
        if (disabled || asyncState !== 'idle') {
          event.preventDefault();
          event.nativeEvent.stopImmediatePropagation();
          return;
        }
        onClick?.(event);
      }}
    >
      {content}
    </SpotlightButton>
  );
}

function SpotlightButton({
  buttonRef,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  buttonRef?: Ref<HTMLButtonElement>;
  'data-state'?: string;
}) {
  const spotlight = useSpotlight<HTMLButtonElement>({ disabled });
  const ref = useMergedRefs(buttonRef, spotlight);
  return <button {...rest} ref={ref} disabled={disabled} />;
}

function LinkButton(props: LinkElementProps & { inner: ReactNode }) {
  const {
    variant: _variant,
    size: _size,
    state: _state,
    loadingLabel: _loadingLabel,
    successLabel: _successLabel,
    errorLabel: _errorLabel,
    wrap: _wrap,
    children: _children,
    disabled: _disabled,
    inner,
    ref: linkRef,
    ...rest
  } = props;
  const spotlight = useSpotlight<HTMLAnchorElement>();
  const ref = useMergedRefs(linkRef, spotlight);
  return (
    <a {...rest} ref={ref} data-state="idle">
      {inner}
    </a>
  );
}

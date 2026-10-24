import { X } from 'lucide-react';
import {
  useEffect,
  useId,
  useRef,
  type DialogHTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type Ref,
} from 'react';
import { useUiMessages } from '../../i18n/UiProvider';
import { cx } from '../../internal/cx';
import { useMergedRefs } from '../../internal/refs';
import { IconButton } from '../IconButton/IconButton';
import styles from './Dialog.module.css';

export type DialogProps = Omit<
  DialogHTMLAttributes<HTMLDialogElement>,
  'open' | 'title' | 'children' | 'onClose'
> & {
  open: boolean;
  title: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg';
  closeLabel?: string;
  /** Called when the user closes the dialog (close button, Escape or a click on the backdrop). */
  onClose?: () => void;
  footer?: ReactNode;
  children?: ReactNode;
  ref?: Ref<HTMLDialogElement>;
};

/** A modal dialog on the native <dialog> element. The parent owns `open`. */
export function Dialog({
  id,
  open,
  title,
  description = '',
  size = 'md',
  closeLabel,
  onClose,
  footer,
  children,
  className,
  ref: forwardedRef,
  ...rest
}: DialogProps) {
  const messages = useUiMessages();
  const generatedId = useId();
  const dialogId = id ?? `dialog-${generatedId}`;
  const titleId = `${dialogId}-title`;
  const descriptionId = `${dialogId}-description`;
  const dialog = useRef<HTMLDialogElement>(null);
  const ref = useMergedRefs(forwardedRef, dialog);
  const latest = useRef({ open, onClose });
  latest.current = { open, onClose };

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) {
      if (typeof element.showModal === 'function') element.showModal();
      else element.setAttribute('open', '');
    }
    if (!open && element.open) {
      if (typeof element.close === 'function') element.close();
      else element.removeAttribute('open');
    }
  }, [open]);

  function requestClose() {
    if (!latest.current.open) return;
    latest.current.onClose?.();
  }

  return (
    <dialog
      {...rest}
      ref={ref}
      id={dialogId}
      className={cx(styles.dialog, styles[size], className)}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        event.preventDefault();
        requestClose();
      }}
      onClose={() => {
        // Native close events are queued: an earlier close must not undo a later reopen.
        if (!latest.current.open || dialog.current?.open) return;
        latest.current.onClose?.();
      }}
      onKeyDown={(event: ReactKeyboardEvent<HTMLDialogElement>) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          requestClose();
        }
        rest.onKeyDown?.(event);
      }}
      onPointerDown={(event: ReactPointerEvent<HTMLDialogElement>) => {
        if (event.target === dialog.current) {
          // Keep the pointer action from moving focus after native close restores it.
          event.preventDefault();
          requestClose();
        }
        rest.onPointerDown?.(event);
      }}
    >
      <div className={styles.surface}>
        <header className={styles['dialog-head']}>
          <div className={styles['dialog-title']}>
            <h2 id={titleId}>{title}</h2>
            {description && <p id={descriptionId}>{description}</p>}
          </div>
          <IconButton label={closeLabel ?? messages.dialog.close} onClick={requestClose}>
            <X size={16} strokeWidth={1.9} />
          </IconButton>
        </header>
        <div className={styles['dialog-body']}>{children}</div>
        {footer && <footer className={styles['dialog-foot']}>{footer}</footer>}
      </div>
    </dialog>
  );
}

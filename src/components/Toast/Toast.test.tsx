import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode, type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { UiProvider } from '../../i18n/UiProvider';
import {
  Toast,
  Toaster,
  useToast,
  type ToastApi,
  type ToastOptions,
  type ToastProps,
  type ToasterProps,
} from './Toast';

const captured: { api?: ToastApi } = {};

function Capture() {
  captured.api = useToast();
  return null;
}

function renderToaster(props: Omit<ToasterProps, 'children'> = {}, children?: ReactNode) {
  const view = render(
    <Toaster {...props}>
      <Capture />
      {children}
    </Toaster>,
  );
  return { ...view, region: screen.getByRole('region', { name: 'Notifications' }) };
}

function api(): ToastApi {
  if (!captured.api) throw new Error('No Toaster rendered');
  return captured.api;
}

function show(options: ToastOptions) {
  let id = '';
  act(() => {
    id = api().show(options);
  });
  return id;
}

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

function toastOf(text: string) {
  const toast = screen.getByText(text).closest<HTMLElement>('[data-tone]');
  if (!toast) throw new Error(`No toast for ${text}`);
  return toast;
}

const toastCount = (region: HTMLElement) => region.querySelectorAll('[data-tone]').length;

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  captured.api = undefined;
});

describe('Toaster', () => {
  it('puts errors in the alert region and the other tones in the status region', () => {
    const { region } = renderToaster({ max: 4 });
    const status = within(region).getByRole('status');
    const alert = within(region).getByRole('alert');
    // Both live regions exist before the first toast, so it is announced.
    expect(status).toBeEmptyDOMElement();
    expect(alert).toBeEmptyDOMElement();
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveAttribute('aria-atomic', 'false');
    expect(alert).toHaveAttribute('aria-atomic', 'false');

    for (const tone of ['neutral', 'success', 'warning', 'error'] as const) {
      show({ message: `${tone} message`, tone });
    }
    expect(within(status).getByText('neutral message')).toBeInTheDocument();
    expect(within(status).getByText('success message')).toBeInTheDocument();
    expect(within(status).getByText('warning message')).toBeInTheDocument();
    expect(within(status).queryByText('error message')).toBeNull();
    expect(within(alert).getByText('error message')).toBeInTheDocument();
    expect(toastOf('error message')).toHaveAttribute('aria-atomic', 'true');
    expect(toastOf('warning message')).toHaveAttribute('aria-atomic', 'true');
  });

  it('never takes focus and names the region and the close button from the catalog', () => {
    render(
      <UiProvider locale="de-CH">
        <Toaster>
          <Capture />
          <button type="button">Speichern</button>
        </Toaster>
      </UiProvider>,
    );
    const button = screen.getByRole('button', { name: 'Speichern' });
    act(() => button.focus());
    show({ message: 'Gespeichert', attributes: { 'data-save-status': 'ok' } });
    expect(button).toHaveFocus();
    const region = screen.getByRole('region', { name: 'Mitteilungen' });
    expect(within(region).getByRole('button', { name: 'Mitteilung schliessen' })).toBeVisible();
    expect(toastOf('Gespeichert')).toHaveAttribute('data-save-status', 'ok');
  });

  it('removes toasts after the duration of their tone; errors stay', () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    const { region } = renderToaster({ max: 5 });
    show({ message: 'Saved', tone: 'success', onDismiss });
    show({ message: 'Check the input', tone: 'warning' });
    show({ message: 'Upload failed', tone: 'error' });
    show({ message: 'Preparing print', duration: null });
    show({ message: 'Copied', duration: 1000 });

    advance(1000);
    expect(screen.queryByText('Copied')).toBeNull();
    advance(3999);
    expect(screen.getByText('Saved')).toBeInTheDocument();
    advance(1);
    expect(screen.queryByText('Saved')).toBeNull();
    expect(onDismiss).toHaveBeenCalledExactlyOnceWith('timeout');
    advance(2999);
    expect(screen.getByText('Check the input')).toBeInTheDocument();
    advance(1);
    expect(screen.queryByText('Check the input')).toBeNull();
    advance(60_000);
    expect(screen.getByText('Upload failed')).toBeInTheDocument();
    expect(screen.getByText('Preparing print')).toBeInTheDocument();
    expect(toastCount(region)).toBe(2);
  });

  it('pauses the timers while the pointer is over a toast', () => {
    vi.useFakeTimers();
    const { region } = renderToaster();
    show({ message: 'Saved', duration: 1000 });
    advance(400);
    fireEvent.pointerOver(toastOf('Saved'));
    expect(region).toHaveAttribute('data-paused');
    advance(5000);
    expect(screen.getByText('Saved')).toBeInTheDocument();

    fireEvent.pointerOut(toastOf('Saved'), { relatedTarget: document.body });
    expect(region).not.toHaveAttribute('data-paused');
    // The timer goes on with the 600 ms it had left.
    advance(599);
    expect(screen.getByText('Saved')).toBeInTheDocument();
    advance(1);
    expect(screen.queryByText('Saved')).toBeNull();
  });

  it('pauses the timers while focus is inside and while the page is hidden', () => {
    vi.useFakeTimers();
    const { region } = renderToaster({}, <button type="button">Outside</button>);
    show({ message: 'Saved', duration: 1000 });
    act(() => within(toastOf('Saved')).getByRole('button', { name: 'Dismiss' }).focus());
    expect(region).toHaveAttribute('data-paused');
    advance(5000);
    expect(screen.getByText('Saved')).toBeInTheDocument();
    act(() => screen.getByRole('button', { name: 'Outside' }).focus());
    expect(region).not.toHaveAttribute('data-paused');

    let hidden = true;
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
    try {
      act(() => {
        document.dispatchEvent(new Event('visibilitychange'));
      });
      expect(region).toHaveAttribute('data-paused');
      advance(5000);
      expect(screen.getByText('Saved')).toBeInTheDocument();
      hidden = false;
      act(() => {
        document.dispatchEvent(new Event('visibilitychange'));
      });
      advance(1000);
      expect(screen.queryByText('Saved')).toBeNull();
    } finally {
      delete (document as { hidden?: boolean }).hidden;
    }
  });

  it('replaces a toast with the same id in place and starts its timer again', () => {
    vi.useFakeTimers();
    const first = vi.fn();
    const { region } = renderToaster();
    show({ message: 'Copied', duration: null });
    show({ id: 'save', message: 'Saving', duration: null, onDismiss: first });
    const element = toastOf('Saving');
    advance(10_000);

    expect(show({ id: 'save', message: 'Saved', tone: 'success' })).toBe('save');
    expect(first).toHaveBeenCalledExactlyOnceWith('replaced');
    expect(toastOf('Saved')).toBe(element);
    expect(screen.queryByText('Saving')).toBeNull();
    expect(toastCount(region)).toBe(2);
    // It keeps its place in the stack.
    expect(element.style.getPropertyValue('--toast-row')).toBe('2');
    advance(4999);
    expect(screen.getByText('Saved')).toBeInTheDocument();
    advance(1);
    expect(screen.queryByText('Saved')).toBeNull();
  });

  it('changes a toast with update and removes it with dismiss', () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    const onClick = vi.fn();
    renderToaster();
    const id = show({
      message: 'Preparing print',
      duration: null,
      onDismiss,
      action: { label: 'Cancel', onClick },
    });
    advance(10_000);
    act(() => api().update(id, { message: 'Still preparing' }));
    expect(toastOf('Still preparing')).toHaveAttribute('data-tone', 'neutral');
    // The other options stay.
    expect(
      within(toastOf('Still preparing')).getByRole('button', { name: 'Cancel' }),
    ).toBeVisible();
    advance(60_000);
    expect(screen.getByText('Still preparing')).toBeInTheDocument();

    act(() => api().update(id, { tone: 'warning', duration: 3000 }));
    expect(toastOf('Still preparing')).toHaveAttribute('data-tone', 'warning');
    act(() => api().update('unknown', { message: 'Ignored' }));
    expect(screen.queryByText('Ignored')).toBeNull();
    act(() => api().dismiss(id));
    expect(screen.queryByText('Still preparing')).toBeNull();
    expect(onDismiss).toHaveBeenCalledExactlyOnceWith('code');
  });

  it('keeps at most max toasts, the newest nearest the edge', () => {
    const dropped = vi.fn();
    const { region, rerender } = renderToaster({ max: 2 });
    show({ message: 'One', onDismiss: dropped });
    show({ message: 'Two', tone: 'error' });
    show({ message: 'Three' });
    expect(screen.queryByText('One')).toBeNull();
    expect(dropped).toHaveBeenCalledExactlyOnceWith('replaced');
    expect(toastCount(region)).toBe(2);
    expect(region.style.getPropertyValue('--toast-rows')).toBe('2');
    // The rows interleave both live regions by age.
    expect(toastOf('Two').style.getPropertyValue('--toast-row')).toBe('1');
    expect(toastOf('Three').style.getPropertyValue('--toast-row')).toBe('2');

    rerender(
      <Toaster max={2} placement="top">
        <Capture />
      </Toaster>,
    );
    expect(region).toHaveAttribute('data-placement', 'top');
    expect(toastOf('Two').style.getPropertyValue('--toast-row')).toBe('2');
    expect(toastOf('Three').style.getPropertyValue('--toast-row')).toBe('1');
  });

  it('runs the action and closes unless closes is false', async () => {
    const onClick = vi.fn();
    const onDismiss = vi.fn();
    renderToaster();
    show({ message: 'Circuit deleted', action: { label: 'Undo', onClick }, onDismiss });
    show({ message: 'Update ready', action: { label: 'Details', onClick, closes: false } });

    await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(onClick).toHaveBeenCalledOnce();
    expect(onDismiss).toHaveBeenCalledExactlyOnceWith('action');
    expect(screen.queryByText('Circuit deleted')).toBeNull();

    await userEvent.click(screen.getByRole('button', { name: 'Details' }));
    expect(onClick).toHaveBeenCalledTimes(2);
    expect(screen.getByText('Update ready')).toBeInTheDocument();
  });

  it('closes the focused toast on Escape unless it is not dismissible', () => {
    const onDismiss = vi.fn();
    renderToaster();
    show({
      message: 'Printing',
      dismissible: false,
      action: { label: 'Cancel', onClick: vi.fn() },
    });
    show({ message: 'Saved', duration: null, onDismiss });
    expect(within(toastOf('Printing')).queryByRole('button', { name: 'Dismiss' })).toBeNull();

    const cancel = within(toastOf('Printing')).getByRole('button', { name: 'Cancel' });
    act(() => cancel.focus());
    expect(fireEvent.keyDown(cancel, { key: 'Escape' })).toBe(true);
    expect(screen.getByText('Printing')).toBeInTheDocument();

    const dismiss = within(toastOf('Saved')).getByRole('button', { name: 'Dismiss' });
    act(() => dismiss.focus());
    // Handled here, so the app's own Escape shortcuts do not run as well.
    expect(fireEvent.keyDown(dismiss, { key: 'Escape' })).toBe(false);
    expect(screen.queryByText('Saved')).toBeNull();
    expect(onDismiss).toHaveBeenCalledExactlyOnceWith('escape');
  });

  it('returns focus to where it came from when a focused toast goes', () => {
    renderToaster({}, <button type="button">Save</button>);
    const save = screen.getByRole('button', { name: 'Save' });
    act(() => save.focus());
    show({ message: 'Saved', duration: null });
    const synced = show({ message: 'Synced', duration: null });
    const dismiss = within(toastOf('Saved')).getByRole('button', { name: 'Dismiss' });
    act(() => dismiss.focus());
    fireEvent.keyDown(dismiss, { key: 'Escape' });
    expect(screen.queryByText('Saved')).toBeNull();
    expect(save).toHaveFocus();

    // Also when code removes it.
    act(() => within(toastOf('Synced')).getByRole('button', { name: 'Dismiss' }).focus());
    expect(save).not.toHaveFocus();
    act(() => api().dismiss(synced));
    expect(screen.queryByText('Synced')).toBeNull();
    expect(save).toHaveFocus();
  });

  it('skips a text field after a pointer dismissal, not after a keyboard one', async () => {
    const user = userEvent.setup();
    renderToaster({}, <input aria-label="Name" />);
    const field = screen.getByLabelText('Name');

    await user.click(field);
    show({ message: 'Saved', duration: null });
    await user.click(within(toastOf('Saved')).getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByText('Saved')).toBeNull();
    expect(field).not.toHaveFocus();

    await user.click(field);
    show({ message: 'Synced', duration: null });
    const dismiss = within(toastOf('Synced')).getByRole('button', { name: 'Dismiss' });
    act(() => dismiss.focus());
    // A click from the keyboard counts no clicks.
    fireEvent.click(dismiss, { detail: 0 });
    expect(screen.queryByText('Synced')).toBeNull();
    expect(field).toHaveFocus();
  });

  it('leaves the focus alone when an action moved it on purpose', async () => {
    renderToaster(
      {},
      <>
        <button type="button">Save</button>
        <input aria-label="Search" />
      </>,
    );
    const save = screen.getByRole('button', { name: 'Save' });
    const search = screen.getByLabelText('Search');
    act(() => save.focus());
    show({
      message: 'Not found',
      action: { label: 'Search again', onClick: () => search.focus() },
    });
    await userEvent.click(screen.getByRole('button', { name: 'Search again' }));
    expect(search).toHaveFocus();
  });

  it('stops its timers when the Toaster unmounts', () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    const { unmount } = renderToaster();
    show({ message: 'Saved', duration: 1000, onDismiss });
    unmount();
    advance(5000);
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('throws when useToast has no Toaster', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Capture />)).toThrow('useToast must be used inside a Toaster');
  });
});

function Declarative({ mounted = true, ...props }: ToastProps & { mounted?: boolean }) {
  return <Toaster>{mounted && <Toast {...props} />}</Toaster>;
}

describe('Toast', () => {
  it('shows while mounted and open and updates in place', () => {
    const onDismiss = vi.fn();
    const props = { tone: 'warning', duration: null, onDismiss } as const;
    const { rerender } = render(<Declarative {...props} message="You are offline" />);
    const element = toastOf('You are offline');
    expect(element).toHaveAttribute('data-tone', 'warning');

    rerender(<Declarative {...props} message="Still offline" details="Changes wait" />);
    expect(toastOf('Still offline')).toBe(element);
    expect(within(element).getByText('Changes wait')).toBeInTheDocument();
    rerender(<Declarative {...props} message="Still offline" />);
    expect(screen.queryByText('Changes wait')).toBeNull();

    rerender(<Declarative {...props} message="Still offline" open={false} />);
    expect(screen.queryByText('Still offline')).toBeNull();
    rerender(<Declarative {...props} message="Still offline" />);
    expect(screen.getByText('Still offline')).toBeInTheDocument();

    rerender(<Declarative {...props} message="Still offline" mounted={false} />);
    expect(screen.queryByText('Still offline')).toBeNull();
    // Closing or unmounting is the parent's own doing, so onDismiss stays quiet.
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('stays dismissed until its message changes', async () => {
    const onDismiss = vi.fn();
    const { rerender } = render(<Declarative message="Saved 10:01" onDismiss={onDismiss} />);
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(onDismiss).toHaveBeenCalledExactlyOnceWith('button');
    expect(screen.queryByText('Saved 10:01')).toBeNull();

    rerender(<Declarative message="Saved 10:01" onDismiss={onDismiss} details="Again" />);
    expect(screen.queryByText('Saved 10:01')).toBeNull();
    rerender(<Declarative message="Saved 10:02" onDismiss={onDismiss} />);
    expect(screen.getByText('Saved 10:02')).toBeInTheDocument();
  });

  it('shows once under StrictMode and still times out', () => {
    vi.useFakeTimers();
    render(
      <StrictMode>
        <Declarative message="Saved" duration={1000} />
      </StrictMode>,
    );
    expect(screen.getAllByText('Saved')).toHaveLength(1);
    advance(1000);
    expect(screen.queryByText('Saved')).toBeNull();
  });

  it('keeps its timer through renders that change nothing it shows', () => {
    vi.useFakeTimers();
    const { rerender } = render(<Declarative message="Saved" duration={1000} />);
    advance(600);
    rerender(
      <Declarative message="Saved" duration={1000} action={{ label: 'Open', onClick() {} }} />,
    );
    advance(400);
    expect(screen.queryByText('Saved')).toBeNull();
  });
});

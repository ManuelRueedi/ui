import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Dialog, type DialogCloseReason } from './Dialog';

// jsdom has no modal dialogs. These stand-ins open and close like a browser and fire `close`.
const dialogPrototype = HTMLDialogElement.prototype;
const original = { showModal: dialogPrototype.showModal, close: dialogPrototype.close };
let closedWhileConnected: boolean[] = [];

beforeEach(() => {
  closedWhileConnected = [];
  dialogPrototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  });
  dialogPrototype.close = vi.fn(function (this: HTMLDialogElement) {
    if (!this.hasAttribute('open')) return;
    closedWhileConnected.push(this.isConnected);
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  });
});

afterEach(() => {
  dialogPrototype.showModal = original.showModal;
  dialogPrototype.close = original.close;
});

function getDialog() {
  return screen.getByRole('dialog', { hidden: true }) as HTMLDialogElement;
}

/** A parent that owns `open`, records each reason and keeps the dialog open for some reasons. */
function Parent({ keepOpenFor = [] }: { keepOpenFor?: DialogCloseReason[] }) {
  const [open, setOpen] = useState(true);
  const [reasons, setReasons] = useState<DialogCloseReason[]>([]);
  return (
    <>
      <output aria-label="Reasons">{reasons.join(',')}</output>
      <Dialog
        open={open}
        title="Rename project"
        onClose={(reason) => {
          setReasons((previous) => [...previous, reason]);
          if (!keepOpenFor.includes(reason)) setOpen(false);
        }}
      >
        <input aria-label="Name" />
      </Dialog>
    </>
  );
}

describe('Dialog', () => {
  it('tells onClose what closed it', async () => {
    const onClose = vi.fn();
    render(
      <Dialog open title="Rename project" onClose={onClose}>
        <input aria-label="Name" />
      </Dialog>,
    );
    const dialog = getDialog();

    await userEvent.click(screen.getByRole('button', { name: 'Close dialog', hidden: true }));
    expect(onClose).toHaveBeenLastCalledWith('button');

    const escape = fireEvent.keyDown(screen.getByLabelText('Name'), { key: 'Escape' });
    expect(onClose).toHaveBeenLastCalledWith('escape');
    // A prevented keydown keeps the browser from making its own close request as well.
    expect(escape).toBe(false);

    fireEvent.pointerDown(dialog);
    expect(onClose).toHaveBeenLastCalledWith('backdrop');

    const cancel = new Event('cancel', { cancelable: true });
    act(() => {
      dialog.dispatchEvent(cancel);
    });
    expect(onClose).toHaveBeenLastCalledWith('escape');
    expect(cancel.defaultPrevented).toBe(true);
    expect(onClose).toHaveBeenCalledTimes(4);
    expect(dialog).toHaveAttribute('open');
  });

  it('stays open when the parent ignores a reason', async () => {
    render(<Parent keepOpenFor={['backdrop']} />);
    const dialog = getDialog();
    await userEvent.type(screen.getByLabelText('Name'), 'Hauptverteilung');

    fireEvent.pointerDown(dialog);
    expect(screen.getByLabelText('Reasons')).toHaveTextContent('backdrop');
    expect(dialog).toHaveAttribute('open');
    expect(screen.getByLabelText('Name')).toHaveValue('Hauptverteilung');

    fireEvent.keyDown(screen.getByLabelText('Name'), { key: 'Escape' });
    expect(screen.getByLabelText('Reasons')).toHaveTextContent('backdrop,escape');
    expect(dialog).not.toHaveAttribute('open');
  });

  it('reopens when the browser closes it while the parent keeps it open', () => {
    render(<Parent keepOpenFor={['escape', 'button']} />);
    const dialog = getDialog();

    // A close request the browser will not let the page cancel closes the dialog anyway.
    act(() => {
      dialog.dispatchEvent(new Event('cancel', { cancelable: false }));
      dialog.close();
    });
    expect(screen.getByLabelText('Reasons')).toHaveTextContent(/^escape$/);
    expect(dialog).toHaveAttribute('open');

    // A form with method="dialog" closes it without a cancel event.
    act(() => dialog.close());
    expect(screen.getByLabelText('Reasons')).toHaveTextContent(/^escape,button$/);
    expect(dialog).toHaveAttribute('open');
    expect(dialogPrototype.showModal).toHaveBeenCalledTimes(3);
  });

  it('adds its description to the aria-describedby of the caller', () => {
    const { rerender } = render(
      <>
        <p id="impact">Removes 3 circuits.</p>
        <Dialog
          open
          id="delete"
          title="Delete"
          description="Cannot be undone."
          aria-describedby="impact"
        />
      </>,
    );
    expect(getDialog()).toHaveAttribute('aria-describedby', 'delete-description impact');
    expect(getDialog()).toHaveAccessibleDescription('Cannot be undone. Removes 3 circuits.');

    rerender(
      <>
        <p id="impact">Removes 3 circuits.</p>
        <Dialog open id="delete" title="Delete" aria-describedby="impact" />
      </>,
    );
    expect(getDialog()).toHaveAttribute('aria-describedby', 'impact');

    rerender(<Dialog open id="delete" title="Delete" description="Cannot be undone." />);
    expect(getDialog()).toHaveAttribute('aria-describedby', 'delete-description');

    rerender(<Dialog open id="delete" title="Delete" />);
    expect(getDialog()).not.toHaveAttribute('aria-describedby');
  });

  it('closes the native dialog when it unmounts while open', () => {
    const { unmount } = render(<Dialog open title="Rename project" />);
    const dialog = getDialog();
    expect(dialog).toHaveAttribute('open');

    unmount();
    // Still in the document, so the browser can return focus to the opener.
    expect(closedWhileConnected).toEqual([true]);
    expect(dialog).not.toHaveAttribute('open');
  });
});

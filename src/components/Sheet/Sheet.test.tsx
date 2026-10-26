import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Suspense, useRef, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Sheet, type SheetCloseReason, type SheetProps, type SheetSnap } from './Sheet';
import {
  dragHeight,
  endDrag,
  moveDrag,
  sheetGeometry,
  sheetRelease,
  startDrag,
} from './sheetGeometry';

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
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

// jsdom's window is 768 px tall: peek is 232 px, full is 768 px.
const viewportHeight = window.innerHeight;

describe('sheet geometry', () => {
  it('opens at peek and fills the visual viewport in full', () => {
    const geometry = sheetGeometry(844);
    expect(geometry.peekHeight).toBe(232);
    expect(geometry.fullHeight).toBe(844);
    expect(sheetGeometry(844, 280).peekHeight).toBe(280);
  });

  it('caps peek at 42% of the viewport and keeps room to the full height', () => {
    expect(sheetGeometry(500).peekHeight).toBe(210);
    // Never below 196 px, but always 120 px below the full height.
    expect(sheetGeometry(420).peekHeight).toBe(196);
    expect(sheetGeometry(300)).toEqual({ peekHeight: 180, fullHeight: 300 });
    expect(sheetGeometry(100)).toEqual({ peekHeight: 160, fullHeight: 180 });
  });

  it('opens in full after an upward drag and closes from peek after a downward drag', () => {
    const geometry = sheetGeometry(844);
    expect(
      sheetRelease({ startSnap: 'peek', deltaY: -80, endHeight: 430, velocityY: -0.2, geometry }),
    ).toBe('full');
    expect(
      sheetRelease({ startSnap: 'peek', deltaY: 90, endHeight: 142, velocityY: 0.2, geometry }),
    ).toBe('closed');
    // A quick flick counts even when the drag is short.
    expect(
      sheetRelease({ startSnap: 'peek', deltaY: 20, endHeight: 212, velocityY: 0.6, geometry }),
    ).toBe('closed');
    expect(
      sheetRelease({ startSnap: 'peek', deltaY: -20, endHeight: 252, velocityY: -0.6, geometry }),
    ).toBe('full');
  });

  it('folds a full sheet to peek before it can close', () => {
    const geometry = sheetGeometry(844);
    expect(
      sheetRelease({
        startSnap: 'full',
        deltaY: 180,
        endHeight: geometry.peekHeight,
        velocityY: 0.8,
        geometry,
      }),
    ).toBe('peek');
    expect(
      sheetRelease({ startSnap: 'full', deltaY: 40, endHeight: 804, velocityY: 0.1, geometry }),
    ).toBe('full');
  });

  it('goes to the nearer snap after a short, slow drag', () => {
    const geometry = sheetGeometry(844);
    expect(
      sheetRelease({ startSnap: 'peek', deltaY: -12, endHeight: 600, velocityY: 0.1, geometry }),
    ).toBe('full');
    expect(
      sheetRelease({ startSnap: 'peek', deltaY: 12, endHeight: 400, velocityY: 0.1, geometry }),
    ).toBe('peek');
  });

  it('keeps the dragged height between its bounds', () => {
    const geometry = sheetGeometry(844);
    expect(dragHeight('peek', 232, 200, geometry)).toBe(96);
    expect(dragHeight('peek', 232, -900, geometry)).toBe(844);
    expect(dragHeight('full', 844, 900, geometry)).toBe(232);
  });

  it('ignores the flick of a pointer that rested before it let go', () => {
    const geometry = sheetGeometry(844);
    const drag = startDrag('peek', 600, geometry, 0, 1);
    moveDrag(drag, 580, geometry, 10);
    expect(drag.moved).toBe(true);
    expect(drag.velocityY).toBe(-2);
    // Released at once, the flick opens it in full; after 100 ms at rest it stays at peek.
    expect(endDrag(drag, 580, geometry, 20)).toBe('full');
    expect(endDrag(drag, 580, geometry, 110)).toBe('peek');
  });
});

/** A non-modal phone sheet with snaps, as the CircuitDocs selection drawer uses it. */
function mountDrawer({
  onClose = vi.fn(),
  ...props
}: Partial<SheetProps> & { onClose?: (reason: SheetCloseReason) => void } = {}) {
  function Harness() {
    const [open, setOpen] = useState(true);
    return (
      <>
        <button type="button" onClick={() => setOpen((value) => !value)}>
          Toggle sheet
        </button>
        <Sheet
          open={open}
          modal={false}
          layout="phone"
          defaultSnap="peek"
          title="Selected cable"
          onClose={onClose}
          {...props}
        >
          <button type="button">A content action</button>
        </Sheet>
      </>
    );
  }
  render(<Harness />);
  const sheet = () => screen.getByRole('region', { name: 'Selected cable' });
  const body = () => screen.getByRole('button', { name: 'A content action' }).parentElement!;
  const handle = () => screen.getByRole('button', { name: /^(Expand|Collapse)$/ });
  const toggle = () => act(() => handle().click());
  const touch = (type: 'touchstart' | 'touchmove' | 'touchend', y: number) => {
    const point = { identifier: 1, clientX: 20, clientY: y };
    const list = (active: boolean) => ({
      length: active ? 1 : 0,
      item: (index: number) => (active && index === 0 ? point : null),
    });
    const event = new Event(type, { bubbles: true, cancelable: true });
    Object.defineProperties(event, {
      touches: { value: list(type !== 'touchend') },
      changedTouches: { value: list(true) },
    });
    act(() => {
      body().dispatchEvent(event);
    });
    return event;
  };
  const drag = (from: number, to: number) => {
    fireEvent.pointerDown(handle(), { button: 0, pointerId: 1, clientY: from });
    fireEvent.pointerMove(handle(), { pointerId: 1, clientY: to });
    fireEvent.pointerUp(handle(), { pointerId: 1, clientY: to });
  };
  return { sheet, body, handle, toggle, touch, drag, onClose };
}

describe('Sheet touch scrolling', () => {
  it('toggles between peek and full with the handle', () => {
    const view = mountDrawer();
    expect(view.sheet()).toHaveAttribute('data-snap', 'peek');
    expect(view.handle()).toHaveAttribute('aria-expanded', 'false');
    expect(view.handle()).toHaveAccessibleName('Expand');

    view.toggle();
    expect(view.sheet()).toHaveAttribute('data-snap', 'full');
    expect(view.handle()).toHaveAttribute('aria-expanded', 'true');
    expect(view.handle()).toHaveAccessibleName('Collapse');
    expect(view.sheet().style.getPropertyValue('--sheet-height')).toBe(`${viewportHeight}px`);
  });

  it.each(['body', 'sheet'] as const)(
    'keeps a downward touch native while the %s is scrolled',
    (scrollContainer) => {
      const view = mountDrawer({ defaultSnap: 'full' });
      view[scrollContainer]().scrollTop = 90;
      view.touch('touchstart', 200);
      const move = view.touch('touchmove', 280);
      view.touch('touchend', 280);

      expect(move.defaultPrevented).toBe(false);
      expect(view.sheet()).toHaveAttribute('data-snap', 'full');
      expect(view.onClose).not.toHaveBeenCalled();
    },
  );

  it('scrolls up natively and folds on a downward touch at the top', () => {
    const view = mountDrawer({ defaultSnap: 'full' });
    view.touch('touchstart', 200);
    const up = view.touch('touchmove', 120);
    view.touch('touchend', 120);
    expect(up.defaultPrevented).toBe(false);
    expect(view.sheet()).toHaveAttribute('data-snap', 'full');

    view.touch('touchstart', 200);
    const down = view.touch('touchmove', 280);
    view.touch('touchend', 280);
    expect(down.defaultPrevented).toBe(true);
    expect(view.sheet()).toHaveAttribute('data-snap', 'peek');
    expect(view.onClose).not.toHaveBeenCalled();
  });

  it('keeps both scroll positions and the content action on a tap that does not move', () => {
    const view = mountDrawer();
    view.body().scrollTop = 30;
    view.sheet().scrollTop = 70;
    const action = vi.fn();
    const button = screen.getByRole('button', { name: 'A content action' });
    button.addEventListener('click', action);
    view.touch('touchstart', 200);
    view.touch('touchmove', 203);
    view.touch('touchend', 203);
    expect(view.body().scrollTop).toBe(30);
    expect(view.sheet().scrollTop).toBe(70);
    expect(view.sheet()).toHaveAttribute('data-snap', 'peek');
    act(() => button.click());
    expect(action).toHaveBeenCalledOnce();
    expect(view.onClose).not.toHaveBeenCalled();
  });

  it('closes on a swipe down from peek and opens in full on a swipe up', () => {
    const view = mountDrawer();
    view.touch('touchstart', 500);
    view.touch('touchmove', 420);
    view.touch('touchend', 420);
    expect(view.sheet()).toHaveAttribute('data-snap', 'full');

    view.toggle();
    view.touch('touchstart', 500);
    view.touch('touchmove', 600);
    view.touch('touchend', 600);
    expect(view.onClose).toHaveBeenCalledWith('swipe');
  });

  it('starts both scroll containers from the top when folded or opened again', async () => {
    const view = mountDrawer({ defaultSnap: 'full' });
    view.body().scrollTop = 30;
    view.sheet().scrollTop = 70;
    view.toggle();
    expect(view.body().scrollTop).toBe(0);
    expect(view.sheet().scrollTop).toBe(0);

    view.toggle();
    view.body().scrollTop = 20;
    view.sheet().scrollTop = 60;
    await userEvent.click(screen.getByRole('button', { name: 'Toggle sheet' }));
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Toggle sheet' }));
    // An uncontrolled sheet opens at its default snap again.
    expect(view.sheet()).toHaveAttribute('data-snap', 'full');
    expect(view.body().scrollTop).toBe(0);
    expect(view.sheet().scrollTop).toBe(0);
  });

  it('follows a pointer drag on the handle and closes after a swipe down', () => {
    const heights: number[] = [];
    const view = mountDrawer({ onHeightChange: (px) => heights.push(px) });
    fireEvent.pointerDown(view.handle(), { button: 0, pointerId: 1, clientY: 600 });
    fireEvent.pointerMove(view.handle(), { pointerId: 1, clientY: 500 });
    expect(view.sheet()).toHaveAttribute('data-dragging', 'true');
    expect(view.sheet().style.getPropertyValue('--sheet-height')).toBe('332px');
    fireEvent.pointerUp(view.handle(), { pointerId: 1, clientY: 500 });
    // The click after a drag does not toggle the snap back.
    fireEvent.click(view.handle());
    expect(view.sheet()).toHaveAttribute('data-snap', 'full');
    expect(view.sheet()).not.toHaveAttribute('data-dragging');
    expect(heights).toEqual([232, 332, viewportHeight]);

    view.toggle();
    view.drag(600, 700);
    expect(view.onClose).toHaveBeenCalledWith('swipe');
  });

  it('snaps back to peek instead of closing when it is not dismissible', () => {
    const view = mountDrawer({ dismissible: false });
    view.drag(600, 700);
    expect(view.onClose).not.toHaveBeenCalled();
    expect(view.sheet()).toHaveAttribute('data-snap', 'peek');
    expect(view.sheet().style.getPropertyValue('--sheet-height')).toBe('232px');
  });

  it('lets the parent own the snap', async () => {
    const onSnapChange = vi.fn();
    function Controlled() {
      const [snap, setSnap] = useState<SheetSnap>('peek');
      return (
        <>
          <button type="button" onClick={() => setSnap('full')}>
            Edit details
          </button>
          <Sheet
            open
            modal={false}
            layout="phone"
            snap={snap}
            onSnapChange={onSnapChange}
            title="Selected cable"
          >
            Content
          </Sheet>
        </>
      );
    }
    render(<Controlled />);
    const sheet = screen.getByRole('region', { name: 'Selected cable' });
    await userEvent.click(screen.getByRole('button', { name: 'Expand' }));
    // The parent did not take the change.
    expect(onSnapChange).toHaveBeenCalledWith('full');
    expect(sheet).toHaveAttribute('data-snap', 'peek');

    await userEvent.click(screen.getByRole('button', { name: 'Edit details' }));
    expect(sheet).toHaveAttribute('data-snap', 'full');
    expect(sheet.style.getPropertyValue('--sheet-height')).toBe(`${viewportHeight}px`);
  });
});

function getDialog() {
  return screen.getByRole('dialog', { hidden: true }) as HTMLDialogElement;
}

/** A parent that owns `open`, records each reason and keeps the sheet open for some reasons. */
function Parent({
  keepOpenFor = [],
  ...props
}: Partial<SheetProps> & { keepOpenFor?: SheetCloseReason[] }) {
  const [open, setOpen] = useState(true);
  const [reasons, setReasons] = useState<SheetCloseReason[]>([]);
  return (
    <>
      <output aria-label="Reasons">{reasons.join(',')}</output>
      <Sheet
        open={open}
        title="Add installation"
        onClose={(reason) => {
          setReasons((previous) => [...previous, reason]);
          if (!keepOpenFor.includes(reason)) setOpen(false);
        }}
        {...props}
      >
        <input aria-label="Search" />
      </Sheet>
    </>
  );
}

/** Puts the dialog's box at the bottom of the window, as on a phone. */
function placeAtBottom(dialog: HTMLElement) {
  vi.spyOn(dialog, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 500, 400, 268));
}

describe('Sheet close reasons', () => {
  it('tells onClose what closed it', async () => {
    const onClose = vi.fn();
    render(
      <Sheet open title="Add installation" onClose={onClose}>
        <input aria-label="Search" />
      </Sheet>,
    );
    const dialog = getDialog();
    placeAtBottom(dialog);
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleName('Add installation');

    await userEvent.click(screen.getByRole('button', { name: 'Close', hidden: true }));
    expect(onClose).toHaveBeenLastCalledWith('button');

    const escape = fireEvent.keyDown(screen.getByLabelText('Search'), { key: 'Escape' });
    expect(onClose).toHaveBeenLastCalledWith('escape');
    expect(escape).toBe(false);

    // A press on the sheet's own padding (the home bar area) is not a backdrop press.
    fireEvent.pointerDown(dialog, { clientX: 100, clientY: 760 });
    expect(onClose).toHaveBeenCalledTimes(2);
    fireEvent.pointerDown(dialog, { clientX: 100, clientY: 100 });
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
    placeAtBottom(dialog);
    await userEvent.type(screen.getByLabelText('Search'), 'Socket');

    fireEvent.pointerDown(dialog, { clientX: 100, clientY: 100 });
    expect(screen.getByLabelText('Reasons')).toHaveTextContent('backdrop');
    expect(dialog).toHaveAttribute('open');
    expect(screen.getByLabelText('Search')).toHaveValue('Socket');

    fireEvent.keyDown(screen.getByLabelText('Search'), { key: 'Escape' });
    expect(screen.getByLabelText('Reasons')).toHaveTextContent('backdrop,escape');
    expect(dialog).not.toHaveAttribute('open');
  });

  it('leaves an Escape that content inside already used', () => {
    const onClose = vi.fn();
    render(
      <Sheet open title="Add installation" onClose={onClose}>
        <input aria-label="Search" onKeyDown={(event) => event.preventDefault()} />
      </Sheet>,
    );
    fireEvent.keyDown(screen.getByLabelText('Search'), { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('reopens when the browser closes it while the parent keeps it open', () => {
    render(<Parent keepOpenFor={['escape', 'button']} />);
    const dialog = getDialog();

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

  it('only reports the close button when it is not dismissible', async () => {
    render(<Parent dismissible={false} layout="phone" defaultSnap="peek" />);
    const dialog = getDialog();
    placeAtBottom(dialog);

    fireEvent.keyDown(screen.getByLabelText('Search'), { key: 'Escape' });
    fireEvent.pointerDown(dialog, { clientX: 100, clientY: 100 });
    // A close request the browser does not let the page cancel: the sheet opens again.
    act(() => {
      dialog.dispatchEvent(new Event('cancel', { cancelable: false }));
      dialog.close();
    });
    const handle = screen.getByRole('button', { name: 'Expand', hidden: true });
    fireEvent.pointerDown(handle, { button: 0, pointerId: 1, clientY: 600 });
    fireEvent.pointerMove(handle, { pointerId: 1, clientY: 700 });
    fireEvent.pointerUp(handle, { pointerId: 1, clientY: 700 });
    expect(screen.getByLabelText('Reasons')).toBeEmptyDOMElement();
    expect(dialog).toHaveAttribute('open');

    await userEvent.click(screen.getByRole('button', { name: 'Close', hidden: true }));
    expect(screen.getByLabelText('Reasons')).toHaveTextContent('button');
    expect(dialog).not.toHaveAttribute('open');
  });

  it('closes the native dialog when it unmounts while open', () => {
    const { unmount } = render(<Sheet open title="Add installation" />);
    const dialog = getDialog();
    expect(dialog).toHaveAttribute('open');

    unmount();
    // Still in the document, so the browser can return focus to the opener.
    expect(closedWhileConnected).toEqual([true]);
    expect(dialog).not.toHaveAttribute('open');
  });

  it('does not report a close when a Suspense boundary hides it, and opens again after', async () => {
    // Browsers fire `close` in a later task, after React has finished hiding the tree.
    dialogPrototype.close = vi.fn(function (this: HTMLDialogElement) {
      if (!this.hasAttribute('open')) return;
      this.removeAttribute('open');
      setTimeout(() => this.dispatchEvent(new Event('close')));
    });
    const onClose = vi.fn();
    let resolve = () => {};
    const pending = new Promise<void>((done) => {
      resolve = done;
    });
    let ready = false;
    function Content({ wait }: { wait: boolean }) {
      if (wait && !ready) throw pending;
      return <p>Levels</p>;
    }
    const view = (wait: boolean) => (
      <Suspense fallback={<p>Loading</p>}>
        <Sheet open title="Print" onClose={onClose}>
          <Content wait={wait} />
        </Sheet>
      </Suspense>
    );
    const { rerender } = render(view(false));
    expect(getDialog()).toHaveAttribute('open');

    rerender(view(true));
    expect(getDialog()).not.toHaveAttribute('open');
    await act(() => new Promise((done) => setTimeout(done)));

    await act(async () => {
      ready = true;
      resolve();
      await pending;
    });
    expect(screen.getByText('Levels')).toBeInTheDocument();
    expect(getDialog()).toHaveAttribute('open');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('moves the focus to initialFocus and locks the page scroll while open', async () => {
    function FocusParent() {
      const [open, setOpen] = useState(false);
      const search = useRef<HTMLInputElement>(null);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Add
          </button>
          <Sheet
            open={open}
            title="Add installation"
            initialFocus={search}
            onClose={() => setOpen(false)}
          >
            <button type="button">Recent</button>
            <input ref={search} aria-label="Search" />
          </Sheet>
        </>
      );
    }
    render(<FocusParent />);
    expect(document.documentElement.style.overflow).toBe('');
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(screen.getByLabelText('Search')).toHaveFocus();
    expect(document.documentElement.style.overflow).toBe('hidden');

    fireEvent.keyDown(screen.getByLabelText('Search'), { key: 'Escape' });
    expect(getDialog()).not.toHaveAttribute('open');
    expect(document.documentElement.style.overflow).toBe('');
  });
});

describe('Sheet onHeightChange', () => {
  it('reports the snap heights on phones and 0 when wide, closed or gone', async () => {
    const onHeightChange = vi.fn();
    function HeightParent() {
      const [open, setOpen] = useState(true);
      const [layout, setLayout] = useState<'phone' | 'wide'>('phone');
      return (
        <>
          <button type="button" onClick={() => setOpen((value) => !value)}>
            Toggle sheet
          </button>
          <button type="button" onClick={() => setLayout(layout === 'phone' ? 'wide' : 'phone')}>
            Toggle layout
          </button>
          <Sheet
            open={open}
            modal={false}
            layout={layout}
            defaultSnap="peek"
            peekHeight={280}
            title="Selected socket"
            onHeightChange={onHeightChange}
          >
            Content
          </Sheet>
        </>
      );
    }
    const { unmount } = render(<HeightParent />);
    expect(onHeightChange.mock.calls).toEqual([[280]]);

    await userEvent.click(screen.getByRole('button', { name: 'Expand' }));
    expect(onHeightChange).toHaveBeenLastCalledWith(viewportHeight);

    await userEvent.click(screen.getByRole('button', { name: 'Toggle layout' }));
    expect(onHeightChange).toHaveBeenLastCalledWith(0);
    expect(screen.queryByRole('button', { name: 'Collapse' })).not.toBeInTheDocument();
    expect(screen.getByRole('region')).not.toHaveAttribute('data-snap');

    await userEvent.click(screen.getByRole('button', { name: 'Toggle layout' }));
    expect(onHeightChange).toHaveBeenLastCalledWith(viewportHeight);

    await userEvent.click(screen.getByRole('button', { name: 'Toggle sheet' }));
    expect(onHeightChange).toHaveBeenLastCalledWith(0);
    // Opened again, an uncontrolled sheet starts at its default snap.
    await userEvent.click(screen.getByRole('button', { name: 'Toggle sheet' }));
    expect(onHeightChange).toHaveBeenLastCalledWith(280);

    unmount();
    expect(onHeightChange).toHaveBeenLastCalledWith(0);
    expect(onHeightChange.mock.calls.map(([px]) => px)).toEqual([
      280,
      viewportHeight,
      0,
      viewportHeight,
      0,
      280,
      0,
    ]);
  });

  it('reports the measured height of a sheet as tall as its content', () => {
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(312);
    const onHeightChange = vi.fn();
    render(
      <Sheet open modal={false} layout="phone" title="Options" onHeightChange={onHeightChange}>
        Content
      </Sheet>,
    );
    expect(onHeightChange).toHaveBeenLastCalledWith(312);
    expect(screen.queryByRole('button', { name: 'Expand' })).not.toBeInTheDocument();
  });

  it('follows the phone breakpoint unless the layout is given', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query === '(max-width: 760px)',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    const onHeightChange = vi.fn();
    const { rerender } = render(
      <Sheet
        open
        modal={false}
        defaultSnap="peek"
        title="Options"
        onHeightChange={onHeightChange}
      />,
    );
    expect(screen.getByRole('region')).toHaveAttribute('data-layout', 'phone');
    expect(onHeightChange).toHaveBeenLastCalledWith(232);

    rerender(
      <Sheet
        open
        modal={false}
        layout="wide"
        defaultSnap="peek"
        title="Options"
        onHeightChange={onHeightChange}
      />,
    );
    expect(screen.getByRole('region')).toHaveAttribute('data-layout', 'wide');
    expect(onHeightChange).toHaveBeenLastCalledWith(0);
  });
});

describe('Sheet header', () => {
  it('keeps the title as the name when a heading replaces it', () => {
    render(
      <Sheet
        open
        modal={false}
        title="Socket 3"
        heading={
          <h2>
            <button type="button">Socket 3</button>
          </h2>
        }
        headerActions={<button type="button">Print</button>}
        className="selection-inspector"
        data-selection-inspector="true"
      />,
    );
    const sheet = screen.getByRole('region', { name: 'Socket 3' });
    expect(sheet).toHaveClass('selection-inspector');
    expect(sheet).toHaveAttribute('data-selection-inspector', 'true');
    const buttons = screen
      .getAllByRole('button')
      .map((button) => button.textContent || button.getAttribute('aria-label'));
    expect(buttons).toEqual(['Socket 3', 'Print', 'Close']);
  });

  it('takes a role, a label and close label from the caller and can hide the close button', () => {
    const { rerender } = render(
      <Sheet
        open
        modal={false}
        role="complementary"
        aria-label="Cable: W1"
        title="W1"
        closeLabel="Close properties"
      />,
    );
    expect(screen.getByRole('complementary', { name: 'Cable: W1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close properties' })).toBeInTheDocument();

    rerender(<Sheet open modal={false} title="W1" hideClose />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

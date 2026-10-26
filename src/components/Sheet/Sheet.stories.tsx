import type { Meta, StoryObj } from '@storybook/react-vite';
import { Printer } from 'lucide-react';
import { useRef, useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { darkA11y, staticStory, wait } from '../../stories/storyHelpers';
import { Button } from '../Button/Button';
import { IconButton } from '../IconButton/IconButton';
import { Input } from '../Input/Input';
import { Sheet, type SheetCloseReason, type SheetProps } from './Sheet';

const meta = {
  title: 'Components/Sheet',
  component: Sheet,
  args: {
    open: false,
    title: 'Add installation',
    description: 'Pick what to place on the plan.',
    size: 'md',
    wide: 'sheet',
  },
  argTypes: {
    size: { control: 'radio', options: ['sm', 'md', 'lg'] },
    wide: { control: 'radio', options: ['sheet', 'dialog', 'inline'] },
  },
} satisfies Meta<typeof Sheet>;

export default meta;
type Story = StoryObj<typeof meta>;

const phoneParameters = {
  ...staticStory,
  canvasLayout: 'fullscreen',
  viewport: {
    options: { phone: { name: 'Phone', styles: { width: '390px', height: '844px' } } },
  },
};

const desktopParameters = {
  ...staticStory,
  canvasLayout: 'fullscreen',
  viewport: {
    options: { desktop: { name: 'Desktop', styles: { width: '1280px', height: '800px' } } },
  },
};

const phone = { viewport: { value: 'phone' } };
const desktop = { viewport: { value: 'desktop' } };

const installations = ['Socket', 'Light', 'Switch', 'Junction box'];

/** Drags the handle with a pointer, through one point in between. */
async function dragHandle(handle: HTMLElement, fromY: number, toY: number) {
  const send = (type: string, clientY: number) =>
    handle.dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        button: 0,
        clientY,
        isPrimary: true,
        pointerId: 1,
        pointerType: 'mouse',
      }),
    );
  send('pointerdown', fromY);
  send('pointermove', (fromY + toY) / 2);
  send('pointermove', toY);
  send('pointerup', toY);
  // The browser sends the click after the release, in a task of its own.
  await wait(0);
  handle.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  await wait(0);
}

function AddSheet(
  props: Omit<SheetProps, 'open' | 'onClose' | 'title'> & { title?: string; opener?: string },
) {
  const { title = 'Add installation', opener = 'Add installation', ...rest } = props;
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<SheetCloseReason | 'none'>('none');
  const search = useRef<HTMLInputElement>(null);
  return (
    <div className="story-stack" style={{ padding: 'var(--space-4)' }}>
      <div className="story-grid">
        <Button variant="primary" onClick={() => setOpen(true)}>
          {opener}
        </Button>
        <output aria-label="Last close request">{reason}</output>
      </div>
      <Sheet
        description="Pick what to place on the plan."
        {...rest}
        open={open}
        title={title}
        initialFocus={search}
        onClose={(next) => {
          setReason(next);
          setOpen(false);
        }}
      >
        <div className="story-stack">
          <Input ref={search} label="Search" type="search" />
          <div className="story-grid">
            {installations.map((name) => (
              <Button key={name} onClick={() => setOpen(false)}>
                {name}
              </Button>
            ))}
          </div>
        </div>
      </Sheet>
    </div>
  );
}

export const ModalContentHeight: Story = {
  name: 'Modal, content height',
  globals: phone,
  parameters: phoneParameters,
  render: () => <AddSheet />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const opener = canvas.getByRole('button', { name: 'Add installation' });
    await userEvent.click(opener);
    const sheet = await within(document.body).findByRole('dialog', { name: 'Add installation' });
    await expect(sheet).toHaveAttribute('aria-modal', 'true');
    await expect(sheet).toHaveAttribute('data-layout', 'phone');
    await expect(within(sheet).getByLabelText('Search')).toHaveFocus();
    // It slides up, then sits on the bottom edge across the full width, as tall as its content.
    await waitFor(() =>
      expect(Math.abs(sheet.getBoundingClientRect().bottom - window.innerHeight)).toBeLessThan(1),
    );
    const box = sheet.getBoundingClientRect();
    await expect(box.width).toBe(390);
    await expect(box.height).toBeLessThan(window.innerHeight * 0.5);
    // The page behind does not scroll.
    await expect(document.documentElement.style.overflow).toBe('hidden');

    await userEvent.keyboard('{Escape}');
    await expect(canvas.getByLabelText('Last close request')).toHaveTextContent('escape');
    await waitFor(() => expect(sheet).not.toHaveAttribute('open'));
    await expect(opener).toHaveFocus();
    await expect(document.documentElement.style.overflow).toBe('');
  },
};

export const ModalDialogWide: Story = {
  name: 'Modal, dialog on wide screens',
  globals: desktop,
  parameters: desktopParameters,
  render: () => (
    <AddSheet
      opener="Print"
      title="Print floor plan"
      description="Choose the levels to print."
      wide="dialog"
      size="lg"
      footer={<Button variant="primary">Print</Button>}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(window.innerWidth).toBe(1280);
    await userEvent.click(canvas.getByRole('button', { name: 'Print' }));
    const sheet = await within(document.body).findByRole('dialog', { name: 'Print floor plan' });
    await waitFor(() => expect(sheet).toBeVisible());
    await expect(sheet).toHaveAttribute('data-layout', 'wide');
    // Centred like a Dialog, 720 px wide, without a handle.
    await waitFor(() => {
      const box = sheet.getBoundingClientRect();
      expect(Math.abs(box.left + box.width / 2 - window.innerWidth / 2)).toBeLessThan(1);
      expect(Math.abs(box.top + box.height / 2 - window.innerHeight / 2)).toBeLessThan(1);
    });
    await expect(sheet.offsetWidth).toBe(720);
    await expect(within(sheet).queryByRole('button', { name: 'Expand' })).toBeNull();

    // A press on the backdrop asks to close it, and nothing behind gets the press.
    await userEvent.pointer({ keys: '[MouseLeft]', target: sheet, coords: { x: 8, y: 8 } });
    await expect(canvas.getByLabelText('Last close request')).toHaveTextContent('backdrop');
    await waitFor(() => expect(sheet).not.toHaveAttribute('open'));
  },
};

const items = ['Socket 3', 'Light 1', 'Switch 2'];

/** A page with a selection sheet, like a selection inspector over a drawing. */
function SelectionPage(
  props: Partial<SheetProps> & { frame?: boolean; initialSelection?: string | null },
) {
  const { frame = false, initialSelection = null, ...rest } = props;
  const [selected, setSelected] = useState<string | null>(initialSelection);
  const [covered, setCovered] = useState(0);
  const [reason, setReason] = useState<SheetCloseReason | 'none'>('none');
  return (
    <div
      style={{
        boxSizing: 'border-box',
        height: frame ? 480 : '100dvh',
        overflow: 'hidden',
        position: 'relative',
        border: frame ? '1px solid var(--border-2)' : undefined,
      }}
      data-testid="page"
    >
      <div className="story-stack" style={{ padding: 'var(--space-4)', paddingBottom: covered }}>
        <p className="story-note">Pick an item on the plan.</p>
        <div className="story-grid">
          {items.map((item) => (
            <Button key={item} aria-pressed={selected === item} onClick={() => setSelected(item)}>
              {item}
            </Button>
          ))}
        </div>
        <p className="story-note">
          Covered height: <output aria-label="Covered height">{covered}</output>
        </p>
        <p className="story-note">
          Last close request: <output aria-label="Last close request">{reason}</output>
        </p>
      </div>
      <Sheet
        open={selected !== null}
        modal={false}
        defaultSnap="peek"
        title={selected ?? ''}
        description="Socket outlet, 230 V"
        onHeightChange={setCovered}
        onClose={(next) => {
          setReason(next);
          setSelected(null);
        }}
        footer={
          <Button variant="primary" onClick={() => setSelected(null)}>
            Done
          </Button>
        }
        {...rest}
      >
        <div className="story-form">
          <Input label="Name" defaultValue={selected ?? ''} />
          <Input label="Mounting height" defaultValue="30" suffix="cm" />
          <Input label="Circuit" defaultValue="F3" />
          <Input label="Note" />
        </div>
      </Sheet>
    </div>
  );
}

export const NonModalSnaps: Story = {
  name: 'Non-modal with snaps',
  globals: phone,
  parameters: phoneParameters,
  render: () => <SelectionPage />,
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Socket 3' }));
    const sheet = canvas.getByRole('region', { name: 'Socket 3' });
    const handle = within(sheet).getByRole('button', { name: 'Expand' });
    const covered = canvas.getByLabelText('Covered height');

    await step('It opens at peek and reports the covered height', async () => {
      await expect(sheet).toHaveAttribute('data-snap', 'peek');
      await expect(handle).toHaveAttribute('aria-expanded', 'false');
      await expect(sheet.offsetHeight).toBe(232);
      await expect(covered).toHaveTextContent('232');
      // The page stays usable: another pick changes the sheet.
      await userEvent.click(canvas.getByRole('button', { name: 'Light 1' }));
      await expect(canvas.getByRole('region', { name: 'Light 1' })).toBe(sheet);
    });

    await step('Enter and Space on the handle toggle the snap', async () => {
      handle.focus();
      await userEvent.keyboard('{Enter}');
      await expect(handle).toHaveAttribute('aria-expanded', 'true');
      await expect(handle).toHaveAccessibleName('Collapse');
      await waitFor(() => expect(sheet.offsetHeight).toBe(844));
      await expect(covered).toHaveTextContent('844');
      await userEvent.keyboard(' ');
      await expect(handle).toHaveAttribute('aria-expanded', 'false');
      await waitFor(() => expect(sheet.offsetHeight).toBe(232));
    });

    await step('A drag up opens it in full, a drag down folds it', async () => {
      await dragHandle(handle, 640, 440);
      await expect(sheet).toHaveAttribute('data-snap', 'full');
      await waitFor(() => expect(sheet.offsetHeight).toBe(844));
      await dragHandle(handle, 20, 120);
      await expect(sheet).toHaveAttribute('data-snap', 'peek');
      await waitFor(() => expect(sheet.offsetHeight).toBe(232));
    });

    await step('A swipe down from peek closes it', async () => {
      await dragHandle(handle, 640, 740);
      await expect(canvas.getByLabelText('Last close request')).toHaveTextContent('swipe');
      await expect(canvas.queryByRole('region')).toBeNull();
      await expect(covered).toHaveTextContent('0');
    });
  },
};

export const InlineDesktop: Story = {
  name: 'Inline on wide screens',
  globals: desktop,
  parameters: desktopParameters,
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 360px', height: 480 }}>
      <div className="story-stack" style={{ padding: 'var(--space-4)' }}>
        <p className="story-note">The plan</p>
      </div>
      <Sheet
        open
        modal={false}
        wide="inline"
        defaultSnap="peek"
        role="complementary"
        title="Socket 3"
        description="Socket outlet, 230 V"
        style={{ borderRadius: 0, borderWidth: '0 0 0 1px' }}
      >
        <div className="story-form">
          <Input label="Name" defaultValue="Socket 3" />
          <Input label="Mounting height" defaultValue="30" suffix="cm" />
        </div>
      </Sheet>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(window.innerWidth).toBe(1280);
    const panel = canvas.getByRole('complementary', { name: 'Socket 3' });
    // In the flow of the parent's grid: no positioning, no handle, nothing covered.
    await expect(getComputedStyle(panel).position).toBe('static');
    await expect(panel).toHaveAttribute('data-layout', 'wide');
    await expect(panel.offsetWidth).toBe(360);
    await expect(panel.offsetHeight).toBe(480);
    await expect(within(panel).queryByRole('button', { name: 'Expand' })).toBeNull();
  },
};

export const Contained: Story = {
  name: 'Contained',
  globals: phone,
  parameters: phoneParameters,
  render: () => <SelectionPage frame contained initialSelection="Socket 3" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = canvas.getByTestId('page');
    const sheet = canvas.getByRole('region', { name: 'Socket 3' });
    await expect(getComputedStyle(sheet).position).toBe('absolute');
    const frame = page.getBoundingClientRect();
    await expect(Math.abs(sheet.getBoundingClientRect().bottom - (frame.bottom - 1))).toBeLessThan(
      1,
    );
    await expect(sheet.offsetHeight).toBe(232);

    // In full it fills the frame, not the window.
    await userEvent.click(within(sheet).getByRole('button', { name: 'Expand' }));
    await waitFor(() => expect(sheet.offsetHeight).toBe(page.clientHeight));
    await expect(canvas.getByLabelText('Covered height')).toHaveTextContent(
      String(page.clientHeight),
    );
  },
};

function SettingsSheet() {
  const [open, setOpen] = useState(false);
  const [requests, setRequests] = useState(0);
  return (
    <div className="story-stack" style={{ padding: 'var(--space-4)' }}>
      <div className="story-grid">
        <Button variant="primary" onClick={() => setOpen(true)}>
          Record readings
        </Button>
        <output aria-label="Close requests">{requests}</output>
      </div>
      <Sheet
        open={open}
        title="Inspection readings"
        description="Only Save closes this sheet."
        dismissible={false}
        hideClose
        defaultSnap="peek"
        onClose={() => setRequests((count) => count + 1)}
        footer={
          <Button variant="primary" onClick={() => setOpen(false)}>
            Save
          </Button>
        }
      >
        <div className="story-form">
          <Input label="Insulation resistance" suffix="MΩ" />
          <Input label="Loop impedance" suffix="Ω" />
        </div>
      </Sheet>
    </div>
  );
}

export const NotDismissible: Story = {
  name: 'Not dismissible',
  globals: phone,
  parameters: phoneParameters,
  render: () => <SettingsSheet />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Record readings' }));
    const sheet = await within(document.body).findByRole('dialog', {
      name: 'Inspection readings',
    });
    await waitFor(() => expect(sheet).toBeVisible());
    await expect(within(sheet).queryByRole('button', { name: 'Close' })).toBeNull();
    const field = within(sheet).getByLabelText('Insulation resistance');
    await userEvent.type(field, '250');

    // Escape, the backdrop and a swipe down leave it open; a swipe down snaps back to peek.
    await userEvent.keyboard('{Escape}');
    await userEvent.pointer({ keys: '[MouseLeft]', target: sheet, coords: { x: 8, y: 8 } });
    const handle = within(sheet).getByRole('button', { name: 'Expand' });
    await dragHandle(handle, 640, 760);
    await expect(sheet).toHaveAttribute('open');
    await expect(sheet).toHaveAttribute('data-snap', 'peek');
    await waitFor(() => expect(sheet.offsetHeight).toBe(232));
    await expect(field).toHaveValue('250');
    await expect(canvas.getByLabelText('Close requests')).toHaveTextContent('0');

    await userEvent.click(within(sheet).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(sheet).not.toHaveAttribute('open'));
  },
};

export const German: Story = {
  name: 'German texts',
  tags: ['!dev', '!autodocs'],
  globals: phone,
  parameters: { ...phoneParameters, language: 'de-CH' },
  render: () => (
    <SelectionPage
      initialSelection="Socket 3"
      title="Steckdose 3"
      description="Steckdose, 230 V"
      headerActions={
        <IconButton label="Drucken">
          <Printer size={16} strokeWidth={1.9} />
        </IconButton>
      }
    />
  ),
  play: async ({ canvasElement }) => {
    const sheet = within(canvasElement).getByRole('region', { name: 'Steckdose 3' });
    const handle = within(sheet).getByRole('button', { name: 'Ganz öffnen' });
    await expect(within(sheet).getByRole('button', { name: 'Schliessen' })).toBeVisible();
    await expect(within(sheet).getByRole('button', { name: 'Drucken' })).toBeVisible();
    await userEvent.click(handle);
    await expect(handle).toHaveAccessibleName('Verkleinern');
  },
};

export const ReducedMotion: Story = {
  name: 'Reduced motion',
  tags: ['!autodocs'],
  globals: phone,
  parameters: phoneParameters,
  // Stands in for the system setting: the sheet reads it through matchMedia.
  beforeEach: () => {
    const matchMedia = window.matchMedia;
    window.matchMedia = (query: string) =>
      matchMedia.call(
        window,
        query.includes('prefers-reduced-motion') ? '(min-width: 0px)' : query,
      );
    return () => {
      window.matchMedia = matchMedia;
    };
  },
  render: () => <SelectionPage initialSelection="Socket 3" />,
  play: async ({ canvasElement }) => {
    const sheet = within(canvasElement).getByRole('region', { name: 'Socket 3' });
    await userEvent.click(within(sheet).getByRole('button', { name: 'Expand' }));
    // The snap changes at once: no height transition runs.
    await expect(sheet.offsetHeight).toBe(844);
    await expect(sheet.getAnimations()).toHaveLength(0);
  },
};

export const DarkMode: Story = {
  name: 'A11y / Dark mode',
  ...darkA11y,
  globals: { theme: 'dark', ...phone },
  parameters: phoneParameters,
  render: () => <AddSheet defaultSnap="peek" footer={<Button variant="primary">Place</Button>} />,
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Add installation' }));
    const sheet = await within(document.body).findByRole('dialog', { name: 'Add installation' });
    await waitFor(() => expect(sheet).toBeVisible());
    await expect(within(sheet).getByRole('button', { name: 'Expand' })).toBeVisible();
  },
};

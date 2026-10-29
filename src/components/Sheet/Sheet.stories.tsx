import type { Meta, StoryObj } from '@storybook/react-vite';
import { Printer } from 'lucide-react';
import { useRef, useState, type CSSProperties } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { darkA11y, staticStory, wait } from '../../stories/storyHelpers';
import { Button } from '../Button/Button';
import { IconButton } from '../IconButton/IconButton';
import { Input } from '../Input/Input';
import { Sheet, type SheetCloseReason, type SheetProps } from './Sheet';
import { sheetGeometry } from './sheetGeometry';

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

/** Whether a style rule that matches `element` sets `property` to a value that contains `text`. */
function ruleSets(element: Element, property: string, text: string) {
  const visit = (rules: CSSRuleList): boolean =>
    Array.from(rules).some((rule) => {
      if (rule instanceof CSSStyleRule) {
        return (
          element.matches(rule.selectorText) && rule.style.getPropertyValue(property).includes(text)
        );
      }
      return rule instanceof CSSGroupingRule && visit(rule.cssRules);
    });
  return Array.from(document.styleSheets).some((sheet) => {
    try {
      return visit(sheet.cssRules);
    } catch {
      // A style sheet from another origin cannot be read; ours are all local.
      return false;
    }
  });
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

    // Escape in a search field with text belongs to the field (the browser clears it).
    const search = within(sheet).getByLabelText('Search');
    await userEvent.type(search, 'Socket');
    await userEvent.keyboard('{Escape}');
    await expect(sheet).toHaveAttribute('open');
    await expect(canvas.getByLabelText('Last close request')).toHaveTextContent('none');
    await userEvent.clear(search);

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

    await step('The handle is a 44 px tap target on touch screens', async () => {
      await expect(sheet.querySelector('[data-sheet-handle]')).toBe(handle);
      await expect(handle.offsetHeight).toBeGreaterThanOrEqual(24);
      // Stands in for (pointer: coarse), where the tokens set --tap-target to 44px.
      sheet.style.setProperty('--tap-target', '44px');
      await expect(handle.offsetHeight).toBe(44);
      sheet.style.removeProperty('--tap-target');
    });

    await step('In full the header keeps clear of the status bar', async () => {
      const header = handle.closest('header')!;
      await expect(ruleSets(header, 'padding-top', 'safe-area-inset-top')).toBe(false);
      await userEvent.click(handle);
      await expect(sheet).toHaveAttribute('data-snap', 'full');
      // env(safe-area-inset-top) is 0 here; on a phone with viewport-fit=cover it is the status bar.
      await expect(ruleSets(header, 'padding-top', 'safe-area-inset-top')).toBe(true);
      await userEvent.click(handle);
      await expect(sheet).toHaveAttribute('data-snap', 'peek');
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
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) 360px',
        height: 480,
        position: 'relative',
      }}
    >
      <div className="story-stack" style={{ padding: 'var(--space-4)' }}>
        <p className="story-note">The plan</p>
      </div>
      {/* contained is for the phone sheet; the wide inline column ignores it. */}
      <Sheet
        open
        modal={false}
        wide="inline"
        contained
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
      {/* A positioned control of the page that reaches over the column. */}
      <Button style={{ position: 'absolute', right: 'var(--space-4)', bottom: 'var(--space-4)' }}>
        Zoom to fit
      </Button>
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
    // No stacking layer of its own, so a positioned sibling over it still gets the press.
    await expect(getComputedStyle(panel).zIndex).toBe('auto');
    const zoom = canvas.getByRole('button', { name: 'Zoom to fit' });
    const box = zoom.getBoundingClientRect();
    await expect(box.left).toBeGreaterThan(panel.getBoundingClientRect().left);
    const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
    await expect(zoom.contains(hit)).toBe(true);
  },
};

export const AppHooks: Story = {
  name: 'App heading and padding',
  tags: ['!autodocs'],
  globals: desktop,
  parameters: desktopParameters,
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 360px', height: 480 }}>
      {/* An app's own heading class, as a CSS Module gives it: one class, low specificity. */}
      <style>{'.story-app-heading { font-size: 18px; line-height: 28px; }'}</style>
      <div className="story-stack" style={{ padding: 'var(--space-4)' }}>
        <p className="story-note">The plan</p>
      </div>
      <Sheet
        open
        modal={false}
        wide="inline"
        role="complementary"
        title="Socket 3"
        heading={<h2 className="story-app-heading">Socket 3, kitchen</h2>}
        description="Socket outlet, 230 V"
        footer={<Button variant="primary">Done</Button>}
        style={
          {
            borderRadius: 0,
            borderWidth: '0 0 0 1px',
            '--sheet-body-padding': '0px',
            '--sheet-footer-padding': 'var(--space-2)',
          } as CSSProperties
        }
      >
        <p className="story-note">Edge-to-edge content, e.g. a list with its own row padding.</p>
      </Sheet>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const panel = canvas.getByRole('complementary', { name: 'Socket 3' });
    // The app's heading keeps its own styles; the default title's rules do not reach into it.
    const heading = within(panel).getByRole('heading', { name: 'Socket 3, kitchen' });
    await expect(getComputedStyle(heading).fontSize).toBe('18px');
    await expect(getComputedStyle(heading).lineHeight).toBe('28px');
    await expect(getComputedStyle(heading).overflowWrap).toBe('normal');
    // The padding hooks, and a stable gutter on the scrolling body.
    const body = within(panel).getByText(/^Edge-to-edge/).parentElement!;
    await expect(getComputedStyle(body).padding).toBe('0px');
    await expect(getComputedStyle(body).scrollbarGutter).toBe('stable');
    await expect(getComputedStyle(panel.querySelector('footer')!).padding).toBe('8px');
  },
};

export const DefaultTitle: Story = {
  name: 'Default title and padding',
  tags: ['!dev', '!autodocs'],
  globals: desktop,
  parameters: desktopParameters,
  render: () => (
    <Sheet
      open
      modal={false}
      wide="inline"
      title="Junction box JB-2001-kitchen-north-wall"
      description="Socket outlet, 230 V"
      footer={<Button variant="primary">Done</Button>}
    >
      <p className="story-note">Content</p>
    </Sheet>
  ),
  play: async ({ canvasElement }) => {
    const panel = within(canvasElement).getByRole('region');
    const heading = within(panel).getByRole('heading');
    await expect(getComputedStyle(heading).fontSize).toBe('15px');
    await expect(getComputedStyle(heading).overflowWrap).toBe('anywhere');
    const body = within(panel).getByText('Content').parentElement!;
    await expect(getComputedStyle(body).padding).toBe('16px');
    await expect(getComputedStyle(panel.querySelector('footer')!).padding).toBe('12px 16px');
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
    // Peek and full follow the frame, not the window: peek is at most 42% of the frame.
    const { peekHeight } = sheetGeometry(page.clientHeight);
    await expect(peekHeight).toBeLessThan(232);
    await expect(Math.abs(sheet.getBoundingClientRect().height - peekHeight)).toBeLessThan(0.5);

    // In full it fills the frame, not the window.
    const handle = within(sheet).getByRole('button', { name: 'Expand' });
    await userEvent.click(handle);
    await waitFor(() => expect(sheet.offsetHeight).toBe(page.clientHeight));
    await expect(canvas.getByLabelText('Covered height')).toHaveTextContent(
      String(page.clientHeight),
    );

    // A drag down from full follows the pointer at once.
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
    send('pointerdown', 100);
    await waitFor(() => expect(sheet).toHaveAttribute('data-dragging', 'true'));
    send('pointermove', 160);
    await waitFor(() => expect(sheet.offsetHeight).toBe(page.clientHeight - 60));
    await expect(canvas.getByLabelText('Covered height')).toHaveTextContent(
      String(page.clientHeight - 60),
    );
    send('pointercancel', 160);
    await waitFor(() => expect(sheet.offsetHeight).toBe(page.clientHeight));
    await expect(sheet).not.toHaveAttribute('data-dragging');
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

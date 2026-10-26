import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  Bug,
  Download,
  FileText,
  Filter,
  Layers,
  Map as MapIcon,
  RefreshCw,
  Share2,
  Trash2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { darkA11y, staticStory } from '../../stories/storyHelpers';
import { Button } from '../Button/Button';
import { Checkbox } from '../Checkbox/Checkbox';
import { Dialog } from '../Dialog/Dialog';
import { Input } from '../Input/Input';
import { Menu, MenuItem, MenuLabel, MenuSeparator } from './Menu';

const onShare = fn();
const onExport = fn();

const meta = {
  title: 'Components/Menu',
  component: Menu,
  args: { label: 'Project tools', variant: 'ghost', size: 'md', align: 'start' },
  argTypes: {
    variant: { control: 'radio', options: ['ghost', 'secondary'] },
    size: { control: 'radio', options: ['sm', 'md'] },
    align: { control: 'radio', options: ['start', 'center', 'end'] },
    placement: { control: 'radio', options: ['bottom', 'top'] },
  },
  render: (args) => (
    <div style={{ minHeight: 280 }}>
      <Menu {...args}>
        <MenuItem icon={<Share2 size={15} strokeWidth={1.8} />} onSelect={onShare}>
          Share
        </MenuItem>
        <MenuItem icon={<FileText size={15} strokeWidth={1.8} />}>Documents</MenuItem>
        <MenuItem icon={<Download size={15} strokeWidth={1.8} />} onSelect={onExport}>
          Export a copy
        </MenuItem>
      </Menu>
    </div>
  ),
} satisfies Meta<typeof Menu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole('button', { name: 'Project tools' });
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(trigger);
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const panel = canvas.getByRole('group', { name: 'Project tools' });
    await userEvent.click(within(panel).getByRole('button', { name: 'Share' }));
    await expect(onShare).toHaveBeenCalled();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(panel).not.toBeVisible();
  },
};

export const Keyboard: Story = {
  name: 'Keyboard and icon-only trigger',
  args: { label: undefined, align: 'start' },
  parameters: staticStory,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole('button', { name: 'More options' });
    trigger.focus();
    await userEvent.keyboard('{ArrowDown}');
    const share = canvas.getByRole('button', { name: 'Share' });
    await waitFor(() => expect(share).toHaveFocus());
    await userEvent.keyboard('{ArrowDown}');
    await expect(canvas.getByRole('button', { name: 'Documents' })).toHaveFocus();
    await userEvent.keyboard('{End}');
    await expect(canvas.getByRole('button', { name: 'Export a copy' })).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}');
    await expect(share).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(trigger).toHaveFocus());
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await userEvent.keyboard('{ArrowUp}');
    await waitFor(() =>
      expect(canvas.getByRole('button', { name: 'Export a copy' })).toHaveFocus(),
    );
    await userEvent.keyboard('{Enter}');
    await expect(onExport).toHaveBeenCalled();
    await waitFor(() => expect(trigger).toHaveFocus());
  },
};

export const Groups: Story = {
  name: 'Groups, current entry and links',
  args: { label: 'Rooms' },
  parameters: staticStory,
  render: (args) => (
    <div style={{ minHeight: 360 }}>
      <Menu {...args} defaultOpen>
        <MenuLabel>Ground floor</MenuLabel>
        <MenuItem detail="EG" current>
          Living room
        </MenuItem>
        <MenuItem detail="EG">Kitchen</MenuItem>
        <MenuSeparator />
        <MenuLabel>First floor</MenuLabel>
        <MenuItem detail="1. OG">Bedroom</MenuItem>
        <MenuItem detail="1. OG" disabled>
          Attic (not drawn yet)
        </MenuItem>
        <MenuSeparator />
        <MenuItem href="#rooms">All rooms</MenuItem>
      </Menu>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: /Living room/ })).toHaveAttribute(
      'aria-current',
      'true',
    );
    await expect(canvas.getByRole('button', { name: /Attic/ })).toBeDisabled();
    await expect(canvas.getByRole('link', { name: 'All rooms' })).toHaveAttribute('href', '#rooms');
  },
};

function SettingsPanel() {
  return (
    <div style={{ minHeight: 320 }}>
      <Menu label="View settings" variant="secondary" align="start">
        <MenuLabel>Shown on the plan</MenuLabel>
        <div className="story-stack" style={{ padding: '0 var(--space-2)' }}>
          <Checkbox label="Cable routes" defaultChecked />
          <Checkbox label="Room names" />
          <Input label="Note" placeholder="Shown on the print" />
        </div>
        <MenuSeparator />
        <MenuItem icon={<RefreshCw size={15} strokeWidth={1.8} />}>Reset view</MenuItem>
      </Menu>
    </div>
  );
}

export const WithFields: Story = {
  name: 'Fields inside',
  parameters: staticStory,
  render: () => <SettingsPanel />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole('button', { name: 'View settings' });
    await userEvent.click(trigger);
    const note = canvas.getByRole('textbox', { name: 'Note' });
    await userEvent.type(note, 'Draft');
    // Arrow keys stay with the field.
    await userEvent.keyboard('{ArrowUp}');
    await expect(note).toHaveFocus();
    await userEvent.click(canvas.getByRole('checkbox', { name: 'Room names' }));
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    // Closing keeps the draft.
    await userEvent.click(trigger);
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(trigger);
    await expect(canvas.getByRole('textbox', { name: 'Note' })).toHaveValue('Draft');
    await expect(canvas.getByRole('checkbox', { name: 'Room names' })).toBeChecked();
    await userEvent.click(canvasElement.ownerDocument.body);
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  },
};

export const Variants: Story = {
  parameters: staticStory,
  render: () => (
    <div className="story-stack" style={{ minHeight: 260, alignItems: 'flex-start' }}>
      <div className="story-grid">
        <Menu label="Ghost">
          <MenuItem>Item</MenuItem>
        </Menu>
        <Menu label="Secondary" variant="secondary">
          <MenuItem>Item</MenuItem>
        </Menu>
        <Menu label="Small" size="sm" variant="secondary">
          <MenuItem>Item</MenuItem>
        </Menu>
        <Menu label="Lighting" icon={<Filter size={15} strokeWidth={1.8} />} active>
          <MenuItem current>Lighting</MenuItem>
          <MenuItem>All systems</MenuItem>
        </Menu>
        <Menu ariaLabel="Systems" icon={<Filter size={18} strokeWidth={1.8} />} active>
          <MenuItem>All systems</MenuItem>
        </Menu>
        <Menu label="Disabled" disabled>
          <MenuItem>Item</MenuItem>
        </Menu>
      </div>
      <div style={{ marginTop: 140, display: 'flex', gap: 220 }}>
        <Menu label="Opens upwards" placement="top" align="start" defaultOpen>
          <MenuItem icon={<Trash2 size={15} strokeWidth={1.8} />}>Delete</MenuItem>
          <MenuItem>Rename</MenuItem>
        </Menu>
        <Menu label="Centred" placement="top" align="center" defaultOpen>
          <MenuItem current>Plan</MenuItem>
          <MenuItem>Side view</MenuItem>
        </Menu>
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: 'Disabled' })).toBeDisabled();
    await expect(canvas.getByRole('button', { name: 'Systems' })).toHaveAttribute(
      'data-active',
      'true',
    );
    await expect(canvas.getByRole('button', { name: 'Delete' })).toBeVisible();
    // The centred panel sits on the middle of its trigger, above it.
    const trigger = canvas.getByRole('button', { name: 'Centred' }).getBoundingClientRect();
    const panel = canvas.getByRole('group', { name: 'Centred' }).getBoundingClientRect();
    await expect(
      Math.abs(panel.left + panel.width / 2 - (trigger.left + trigger.width / 2)),
    ).toBeLessThan(1);
    await expect(panel.bottom).toBeLessThanOrEqual(trigger.top);
  },
};

const phoneParameters = {
  ...staticStory,
  canvasLayout: 'fullscreen',
  viewport: {
    options: { phone: { name: 'Phone', styles: { width: '390px', height: '844px' } } },
  },
};

const rooms = [
  'Entrance',
  'Living room',
  'Kitchen',
  'Pantry',
  'Bathroom',
  'Bedroom',
  'Children’s room',
  'Office',
  'Laundry',
  'Cellar',
  'Garage',
  'Attic',
  'Balcony',
  'Terrace',
  'Hallway upstairs',
];

/** Triggers in the corners of a phone frame that clips its content. */
function EdgeMenus() {
  return (
    <div style={{ position: 'relative', height: '100dvh', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 8, right: 8 }}>
        <Menu label="Project" variant="secondary" align="start">
          <MenuItem icon={<Share2 size={15} strokeWidth={1.8} />}>Share with the client</MenuItem>
          <MenuItem icon={<Download size={15} strokeWidth={1.8} />}>Export a copy</MenuItem>
        </Menu>
      </div>
      <div style={{ position: 'absolute', top: 300, left: 8 }}>
        <Menu label="Rooms" variant="secondary" align="start">
          {rooms.map((room) => (
            <MenuItem key={room}>{room}</MenuItem>
          ))}
        </Menu>
      </div>
      <div style={{ position: 'absolute', bottom: 8, right: 8 }}>
        <Menu label="Tools" variant="secondary">
          <MenuItem>Measure</MenuItem>
          <MenuItem>Print</MenuItem>
        </Menu>
      </div>
      <div style={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)' }}>
        <Menu label="View" variant="secondary" placement="top" align="center">
          <MenuItem icon={<MapIcon size={15} strokeWidth={1.8} />} current>
            Floor plan
          </MenuItem>
          <MenuItem icon={<Layers size={15} strokeWidth={1.8} />}>Circuit diagram</MenuItem>
        </Menu>
      </div>
    </div>
  );
}

/** Asserts that the open panel stays the given margin inside the window. */
async function expectOnScreen(panel: HTMLElement, margin = 12) {
  const rect = panel.getBoundingClientRect();
  const { clientWidth, clientHeight } = document.documentElement;
  await expect(rect.left).toBeGreaterThanOrEqual(margin - 0.5);
  await expect(rect.right).toBeLessThanOrEqual(clientWidth - margin + 0.5);
  await expect(rect.top).toBeGreaterThanOrEqual(margin - 0.5);
  await expect(rect.bottom).toBeLessThanOrEqual(clientHeight - margin + 0.5);
}

export const PhoneEdges: Story = {
  name: 'Near the edges on a phone',
  tags: ['!autodocs'],
  globals: { viewport: { value: 'phone' } },
  parameters: phoneParameters,
  render: () => <EdgeMenus />,
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    await expect(window.innerWidth).toBe(390);
    const open = async (name: string) => {
      const trigger = canvas.getByRole('button', { name });
      await userEvent.click(trigger);
      await expect(trigger).toHaveAttribute('aria-expanded', 'true');
      const panel = canvas.getByRole('group', { name });
      await waitFor(() => expect(panel).toBeVisible());
      return { trigger: trigger.getBoundingClientRect(), panel };
    };

    await step('A start-aligned panel at the right edge moves left', async () => {
      const { trigger, panel } = await open('Project');
      await expectOnScreen(panel);
      // Capped by the viewport without a classic scroll bar (100vw would include it).
      await expect(getComputedStyle(panel).maxWidth).toBe('calc(100% - 24px)');
      const rect = panel.getBoundingClientRect();
      await expect(rect.top).toBeGreaterThanOrEqual(trigger.bottom);
      await expect(rect.left).toBeLessThan(trigger.left);
    });

    await step('A long list takes the side with more room and scrolls', async () => {
      const { trigger, panel } = await open('Rooms');
      await expectOnScreen(panel);
      await expect(panel.getBoundingClientRect().top).toBeGreaterThanOrEqual(trigger.bottom);
      await expect(panel.scrollHeight).toBeGreaterThan(panel.clientHeight);
      // It opens at the top of the list.
      await expect(panel.scrollTop).toBe(0);
      // Arrow keys still reach the last room, scrolled into view.
      await userEvent.keyboard('{ArrowUp}');
      const last = canvas.getByRole('button', { name: 'Hallway upstairs' });
      await expect(last).toHaveFocus();
      await expect(last.getBoundingClientRect().bottom).toBeLessThanOrEqual(
        panel.getBoundingClientRect().bottom,
      );
    });

    await step('A panel with no room below flips above the trigger', async () => {
      const { trigger, panel } = await open('Tools');
      await expectOnScreen(panel);
      const rect = panel.getBoundingClientRect();
      await expect(rect.bottom).toBeLessThanOrEqual(trigger.top);
      await expect(rect.right).toBeLessThanOrEqual(trigger.right + 0.5);
    });

    await step('A centred panel above a bottom bar stays centred', async () => {
      const { trigger, panel } = await open('View');
      await expectOnScreen(panel);
      const rect = panel.getBoundingClientRect();
      await expect(rect.bottom).toBeLessThanOrEqual(trigger.top);
      await expect(
        Math.abs(rect.left + rect.width / 2 - (trigger.left + trigger.width / 2)),
      ).toBeLessThan(1);
      await userEvent.keyboard('{Escape}');
      await expect(panel).not.toBeVisible();
    });
  },
};

function ToolbarMenu() {
  return (
    <div style={{ height: 320, position: 'relative', width: 360 }}>
      <div
        data-testid="toolbar"
        style={{
          alignItems: 'center',
          backdropFilter: 'blur(6px)',
          border: '1px solid var(--border-1)',
          display: 'flex',
          height: 48,
          overflow: 'hidden',
          padding: '0 var(--space-2)',
          position: 'sticky',
          top: 0,
          zIndex: 8,
        }}
      >
        <Menu label="Document tools" align="start">
          <MenuItem>Print</MenuItem>
          <MenuItem>Export a copy</MenuItem>
          <MenuItem>Page setup</MenuItem>
        </Menu>
      </div>
      <div
        data-testid="drawing-tools"
        style={{
          background: 'var(--bg-3)',
          height: 200,
          marginTop: 8,
          position: 'relative',
          zIndex: 12,
        }}
      />
    </div>
  );
}

export const InToolbar: Story = {
  name: 'Inside a clipping toolbar',
  parameters: staticStory,
  render: () => <ToolbarMenu />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Document tools' }));
    const panel = canvas.getByRole('group', { name: 'Document tools' });
    await waitFor(() => expect(panel).toBeVisible());
    // The panel reaches past the toolbar that clips and blurs, and above the higher layer below.
    const toolbar = canvas.getByTestId('toolbar').getBoundingClientRect();
    await expect(panel.getBoundingClientRect().bottom).toBeGreaterThan(toolbar.bottom);
    const item = canvas.getByRole('button', { name: 'Page setup' });
    const rect = item.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    await expect(item.contains(hit)).toBe(true);
    await userEvent.click(item);
    await expect(panel).not.toBeVisible();
  },
};

function ViewsMenu() {
  const [debug, setDebug] = useState(false);
  return (
    <div style={{ minHeight: 380 }}>
      <Menu label="Views" align="start">
        <MenuLabel>Open</MenuLabel>
        <MenuItem icon={<FileText size={15} strokeWidth={1.8} />} current="page">
          Overview
        </MenuItem>
        <MenuItem icon={<MapIcon size={15} strokeWidth={1.8} />} description="Shared by Anna">
          Floor plan
        </MenuItem>
        <MenuItem
          icon={<Layers size={15} strokeWidth={1.8} />}
          disabled
          description="Anna is editing it"
        >
          Circuit diagram
        </MenuItem>
        <MenuSeparator />
        <MenuItem
          icon={<Bug size={15} strokeWidth={1.8} />}
          pressed={debug}
          keepOpen
          onSelect={() => setDebug(!debug)}
        >
          Compiler debug
        </MenuItem>
      </Menu>
    </div>
  );
}

export const States: Story = {
  name: 'Current, toggles and reasons',
  parameters: staticStory,
  render: () => <ViewsMenu />,
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole('button', { name: 'Views' });
    trigger.focus();
    await userEvent.keyboard('{ArrowDown}');
    const overview = canvas.getByRole('button', { name: 'Overview' });
    await waitFor(() => expect(overview).toHaveFocus());
    await expect(overview).toHaveAttribute('aria-current', 'page');

    await step('Descriptions are read out, also on a disabled item', async () => {
      await userEvent.keyboard('{ArrowDown}');
      const floorPlan = canvas.getByRole('button', { name: 'Floor plan' });
      await expect(floorPlan).toHaveFocus();
      await expect(floorPlan).toHaveAccessibleDescription('Shared by Anna');
      await userEvent.keyboard('{ArrowDown}');
      const diagram = canvas.getByRole('button', { name: 'Circuit diagram' });
      await expect(diagram).toHaveFocus();
      await expect(diagram).toHaveAttribute('aria-disabled', 'true');
      await expect(diagram).toHaveAccessibleDescription('Anna is editing it');
      await userEvent.keyboard('{Enter}');
      await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    });

    await step('A toggle shows the same look as the current entry', async () => {
      await userEvent.keyboard('{ArrowDown}');
      const debug = canvas.getByRole('button', { name: 'Compiler debug' });
      await expect(debug).toHaveFocus();
      await expect(debug).toHaveAttribute('aria-pressed', 'false');
      await userEvent.keyboard('{Enter}');
      await expect(debug).toHaveAttribute('aria-pressed', 'true');
      await expect(trigger).toHaveAttribute('aria-expanded', 'true');
      const pressed = getComputedStyle(debug);
      const current = getComputedStyle(overview);
      await expect(pressed.fontWeight).toBe(current.fontWeight);
      // After the short background transition.
      await waitFor(() => expect(pressed.backgroundColor).toBe(current.backgroundColor));
      await expect(pressed.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
      await userEvent.keyboard('{Escape}');
      await waitFor(() => expect(trigger).toHaveFocus());
    });
  },
};

/** A page-level Escape handler that leaves keys alone that something else used. */
function PageEscape() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const clearSelection = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented) setCount((value) => value + 1);
    };
    document.addEventListener('keydown', clearSelection);
    return () => document.removeEventListener('keydown', clearSelection);
  }, []);
  return (
    <div className="story-stack" style={{ minHeight: 220, alignContent: 'start' }}>
      <p className="story-note" role="status">
        Selection cleared {count} times
      </p>
      <Menu label="Selection tools" align="start">
        <MenuItem>Copy</MenuItem>
        <MenuItem>Delete</MenuItem>
      </Menu>
    </div>
  );
}

export const EscapeOutside: Story = {
  name: 'Escape with the focus outside',
  parameters: staticStory,
  render: () => <PageEscape />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole('button', { name: 'Selection tools' });
    await userEvent.click(trigger);
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    // Some browsers do not focus a button on click; the focus stays on the page.
    trigger.blur();
    await userEvent.keyboard('{Escape}');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(canvas.getByRole('status')).toHaveTextContent('Selection cleared 0 times');
    // With the menu closed, the page gets Escape.
    await userEvent.keyboard('{Escape}');
    await expect(canvas.getByRole('status')).toHaveTextContent('Selection cleared 1 times');
  },
};

function MenuInDialog() {
  const [open, setOpen] = useState(false);
  const [systems, setSystems] = useState(false);
  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}>
        Open dialog
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Board UV2">
        <div className="story-stack" style={{ minHeight: 160, alignContent: 'start' }}>
          <Menu label="Board tools" align="start">
            <MenuItem>Suggest busbars</MenuItem>
            <MenuItem>Print</MenuItem>
          </Menu>
          {/* Opens a controlled menu while the focus stays on this button. */}
          <div className="story-grid">
            <Button onClick={() => setSystems(true)}>Show systems</Button>
            <Menu label="Systems" align="start" open={systems} onOpenChange={setSystems}>
              <MenuItem>Lighting</MenuItem>
              <MenuItem>Sockets</MenuItem>
            </Menu>
          </div>
        </div>
      </Dialog>
    </>
  );
}

export const InDialog: Story = {
  name: 'Inside a dialog',
  parameters: staticStory,
  render: () => <MenuInDialog />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Open dialog' }));
    const dialog = await within(document.body).findByRole('dialog', { name: 'Board UV2' });
    await waitFor(() => expect(dialog).toBeVisible());
    const trigger = within(dialog).getByRole('button', { name: 'Board tools' });
    await userEvent.click(trigger);
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    // The first Escape closes only the menu.
    await userEvent.keyboard('{Escape}');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await waitFor(() => expect(trigger).toHaveFocus());
    await expect(dialog).toHaveAttribute('open');
    await expect(dialog).toBeVisible();

    // Also when the menu opened while the focus stayed elsewhere in the dialog.
    const show = within(dialog).getByRole('button', { name: 'Show systems' });
    await userEvent.click(show);
    const systems = within(dialog).getByRole('button', { name: 'Systems' });
    await expect(systems).toHaveAttribute('aria-expanded', 'true');
    await expect(show).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    await expect(systems).toHaveAttribute('aria-expanded', 'false');
    await expect(dialog).toHaveAttribute('open');
    await expect(show).toHaveFocus();

    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(within(document.body).queryByRole('dialog')).toBeNull());
  },
};

/** Things that move or hide the trigger while its menu is open. */
function MovingTriggers() {
  const [status, setStatus] = useState(false);
  const [banner, setBanner] = useState(false);
  const [mounted, setMounted] = useState(true);
  return (
    <div className="story-stack" style={{ minHeight: 1400, alignContent: 'start', width: 360 }}>
      {banner && (
        <p className="story-note" style={{ height: 60, margin: 0 }}>
          Synced
        </p>
      )}
      <div className="story-grid" style={{ justifyContent: 'flex-end' }}>
        {status && <span className="story-note">Saving changes…</span>}
        {mounted && (
          <Menu label="Project" align="end">
            <MenuItem keepOpen onSelect={() => setStatus(true)}>
              Save
            </MenuItem>
            <MenuItem keepOpen onSelect={() => setBanner(true)}>
              Sync
            </MenuItem>
            <MenuItem onSelect={() => setMounted(false)}>Close project</MenuItem>
          </Menu>
        )}
      </div>
      <div
        data-testid="scroller"
        style={{ border: '1px solid var(--border-1)', height: 200, overflow: 'auto' }}
      >
        <div style={{ height: 100 }} />
        <Menu label="Circuit" align="start">
          <MenuItem>Rename</MenuItem>
          <MenuItem>Delete</MenuItem>
        </Menu>
        <div style={{ height: 600 }} />
      </div>
    </div>
  );
}

export const FollowsTrigger: Story = {
  name: 'Follows a moving trigger',
  tags: ['!autodocs'],
  parameters: staticStory,
  render: () => <MovingTriggers />,
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const near = (a: number, b: number) => expect(Math.abs(a - b)).toBeLessThan(1);
    const project = canvas.getByRole('button', { name: 'Project' });
    const panelOf = (trigger: HTMLElement) =>
      document.getElementById(trigger.getAttribute('aria-controls') ?? '')!;
    const projectPanel = panelOf(project);

    await step('Content next to and above the trigger moves the panel with it', async () => {
      await userEvent.click(project);
      await waitFor(() => expect(projectPanel).toBeVisible());
      const before = project.getBoundingClientRect();
      // A status appears before the trigger, which moves without changing its size.
      await userEvent.click(canvas.getByRole('button', { name: 'Save' }));
      await canvas.findByText('Saving changes…');
      await waitFor(() =>
        near(projectPanel.getBoundingClientRect().right, project.getBoundingClientRect().right),
      );
      // A line above pushes the trigger down; the panel stays below it.
      await userEvent.click(canvas.getByRole('button', { name: 'Sync' }));
      await canvas.findByText('Synced');
      await expect(project.getBoundingClientRect().top).toBeGreaterThan(before.top + 50);
      await waitFor(() =>
        near(projectPanel.getBoundingClientRect().top, project.getBoundingClientRect().bottom + 4),
      );
      await userEvent.keyboard('{Escape}');
      await expect(project).toHaveAttribute('aria-expanded', 'false');
    });

    const circuit = canvas.getByRole('button', { name: 'Circuit' });
    const circuitPanel = panelOf(circuit);
    const scroller = canvas.getByTestId('scroller');
    const followsCircuit = () =>
      waitFor(() =>
        near(circuitPanel.getBoundingClientRect().top, circuit.getBoundingClientRect().bottom + 4),
      );

    await step('Scrolling a box or the page moves the panel with the trigger', async () => {
      await userEvent.click(circuit);
      await waitFor(() => expect(circuitPanel).toBeVisible());
      await followsCircuit();
      scroller.scrollTop = 60;
      await followsCircuit();
      const page = document.scrollingElement ?? document.documentElement;
      const pageTop = page.scrollTop;
      window.scrollBy(0, 40);
      await waitFor(() => expect(page.scrollTop).toBeGreaterThan(pageTop));
      await followsCircuit();
      window.scrollTo(0, pageTop);
      await expect(circuit).toHaveAttribute('aria-expanded', 'true');
    });

    await step('A trigger scrolled out of its box closes the menu', async () => {
      scroller.scrollTop = 400;
      await waitFor(() => expect(circuit).toHaveAttribute('aria-expanded', 'false'));
      await expect(circuitPanel).not.toBeVisible();
      await expect(document.querySelectorAll(':popover-open')).toHaveLength(0);
      scroller.scrollTop = 0;
    });

    await step('A menu that unmounts while open leaves nothing in the top layer', async () => {
      await userEvent.click(project);
      await waitFor(() => expect(document.querySelectorAll(':popover-open')).toHaveLength(1));
      await userEvent.click(canvas.getByRole('button', { name: 'Close project' }));
      await waitFor(() =>
        expect(canvas.queryByRole('button', { name: 'Project' })).not.toBeInTheDocument(),
      );
      await expect(document.querySelectorAll(':popover-open')).toHaveLength(0);
    });
  },
};

export const German: Story = {
  name: 'German texts',
  args: { label: undefined },
  parameters: { ...staticStory, language: 'de-CH' },
  render: (args) => (
    <div style={{ minHeight: 220 }}>
      <Menu {...args}>
        <MenuItem>Teilen</MenuItem>
        <MenuItem>Dokumente</MenuItem>
        <MenuItem disabled description="Anna bearbeitet es gerade">
          Stromlaufschema
        </MenuItem>
      </Menu>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Weitere Optionen' }));
    await expect(canvas.getByRole('button', { name: 'Teilen' })).toBeVisible();
    await expect(
      canvas.getByRole('button', { name: 'Stromlaufschema' }),
    ).toHaveAccessibleDescription('Anna bearbeitet es gerade');
  },
};

export const French: Story = {
  name: 'French texts',
  args: { label: undefined },
  parameters: { ...staticStory, language: 'fr-CH' },
  render: (args) => (
    <Menu {...args}>
      <MenuItem>Partager</MenuItem>
    </Menu>
  ),
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByRole('button', { name: 'Plus d’options' }),
    ).toBeInTheDocument();
  },
};

export const Dark: Story = {
  name: 'A11y / Dark mode',
  ...darkA11y,
  render: () => (
    <div style={{ minHeight: 440 }}>
      <Menu label="Project tools" align="start" defaultOpen>
        <MenuLabel>Project</MenuLabel>
        <MenuItem icon={<Share2 size={15} strokeWidth={1.8} />} current>
          Share
        </MenuItem>
        <MenuItem detail="PDF">Print</MenuItem>
        <MenuItem disabled>Archive</MenuItem>
        <MenuItem disabled description="Anna is editing it">
          Circuit diagram
        </MenuItem>
        <MenuItem description="Shows the compiler steps" pressed>
          Compiler debug
        </MenuItem>
        <MenuSeparator />
        <MenuItem icon={<Trash2 size={15} strokeWidth={1.8} />}>Delete</MenuItem>
      </Menu>
    </div>
  ),
};

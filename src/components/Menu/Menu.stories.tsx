import type { Meta, StoryObj } from '@storybook/react-vite';
import { Download, FileText, Filter, RefreshCw, Share2, Trash2 } from 'lucide-react';
import { useState } from 'react';
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
    align: { control: 'radio', options: ['start', 'end'] },
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
      <div style={{ marginTop: 140 }}>
        <Menu label="Opens upwards" placement="top" align="start" defaultOpen>
          <MenuItem icon={<Trash2 size={15} strokeWidth={1.8} />}>Delete</MenuItem>
          <MenuItem>Rename</MenuItem>
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
  },
};

function MenuInDialog() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}>
        Open dialog
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Board UV2">
        <div style={{ minHeight: 160 }}>
          <Menu label="Board tools" align="start">
            <MenuItem>Suggest busbars</MenuItem>
            <MenuItem>Print</MenuItem>
          </Menu>
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
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(within(document.body).queryByRole('dialog')).toBeNull());
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
      </Menu>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Weitere Optionen' }));
    await expect(canvas.getByRole('button', { name: 'Teilen' })).toBeVisible();
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
    <div style={{ minHeight: 300 }}>
      <Menu label="Project tools" align="start" defaultOpen>
        <MenuLabel>Project</MenuLabel>
        <MenuItem icon={<Share2 size={15} strokeWidth={1.8} />} current>
          Share
        </MenuItem>
        <MenuItem detail="PDF">Print</MenuItem>
        <MenuItem disabled>Archive</MenuItem>
        <MenuSeparator />
        <MenuItem icon={<Trash2 size={15} strokeWidth={1.8} />}>Delete</MenuItem>
      </Menu>
    </div>
  ),
};

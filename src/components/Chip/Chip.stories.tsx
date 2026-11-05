import type { Meta, StoryObj } from '@storybook/react-vite';
import { AlertTriangle, CheckCircle2, Filter, Lamp, Plug, Zap } from 'lucide-react';
import { useState } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';
import { darkA11y, staticStory } from '../../stories/storyHelpers';
import { Chip, ChipGroup } from './Chip';

const meta = {
  title: 'Components/Chip',
  component: Chip,
  args: { children: 'Socket', size: 'md', tone: 'neutral', dashed: false, disabled: false },
  argTypes: {
    size: { control: 'radio', options: ['sm', 'md'] },
    tone: { control: 'radio', options: ['neutral', 'strong', 'warning', 'error'] },
  },
} satisfies Meta<typeof Chip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Plain chips: statuses and facts. They are text, not buttons. */
function Statuses() {
  return (
    <div className="story-stack">
      <div className="story-grid">
        <Chip>Planned</Chip>
        <Chip tone="strong" icon={<CheckCircle2 />}>
          Built
        </Chip>
        <Chip tone="warning" icon={<AlertTriangle />}>
          Check
        </Chip>
        <Chip tone="error" icon={<AlertTriangle />}>
          Missing feed
        </Chip>
        <Chip dashed>Suggested</Chip>
      </div>
      <div className="story-grid">
        <Chip size="sm">Planned</Chip>
        <Chip size="sm" tone="strong">
          Built
        </Chip>
        <Chip size="sm" tone="warning">
          Check
        </Chip>
        <Chip size="sm" tone="error">
          Missing feed
        </Chip>
        <Chip size="sm" dashed>
          Suggested
        </Chip>
      </div>
    </div>
  );
}

export const StatusChips: Story = {
  name: 'Status chips',
  parameters: staticStory,
  render: () => <Statuses />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryAllByRole('button')).toHaveLength(0);
    await expect(canvas.getAllByText('Built')[0]).toBeVisible();
  },
};

const families = [
  { id: 'all', label: 'All', count: 42, icon: <Filter /> },
  { id: 'sockets', label: 'Sockets', count: 18, icon: <Plug /> },
  { id: 'lights', label: 'Lights', count: 12, icon: <Lamp /> },
  { id: 'feeds', label: 'Feeds', count: 3, icon: <Zap /> },
  { id: 'empty', label: 'Heating', count: 0, icon: undefined },
];

function Filters({ size = 'md' as 'sm' | 'md', overflow = 'wrap' as 'wrap' | 'scroll' }) {
  const [picked, setPicked] = useState('all');
  return (
    <div style={{ width: overflow === 'scroll' ? 300 : 'auto' }}>
      <ChipGroup label="Filter by family" overflow={overflow}>
        {families.map((family) => (
          <Chip
            key={family.id}
            size={size}
            icon={family.icon}
            count={family.count}
            selected={picked === family.id}
            disabled={family.count === 0}
            onClick={() => setPicked(family.id)}
          >
            {family.label}
          </Chip>
        ))}
      </ChipGroup>
    </div>
  );
}

export const FilterChips: Story = {
  name: 'Filter chips (selected, count, disabled)',
  parameters: staticStory,
  render: () => (
    <div className="story-stack">
      <Filters />
      <Filters size="sm" />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const [groupMd] = canvas.getAllByRole('group', { name: 'Filter by family' });
    const group = within(groupMd!);
    const all = group.getByRole('button', { name: /All/ });
    const sockets = group.getByRole('button', { name: /Sockets/ });
    await expect(all).toHaveAttribute('aria-pressed', 'true');
    await expect(sockets).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(sockets);
    await expect(sockets).toHaveAttribute('aria-pressed', 'true');
    await expect(all).toHaveAttribute('aria-pressed', 'false');
    await userEvent.keyboard('{Shift>}{Tab}{/Shift}{Enter}');
    await expect(all).toHaveAttribute('aria-pressed', 'true');
    await expect(group.getByRole('button', { name: /Heating/ })).toBeDisabled();
  },
};

export const ScrollingRow: Story = {
  name: 'One scrolling row (phone filter bar)',
  parameters: staticStory,
  render: () => <Filters overflow="scroll" />,
  play: async ({ canvasElement }) => {
    const group = within(canvasElement).getByRole('group', { name: 'Filter by family' });
    await expect(group.scrollWidth).toBeGreaterThan(group.clientWidth);
  },
};

export const ActionChips: Story = {
  name: 'Action chips',
  args: { onClick: fn() },
  parameters: staticStory,
  render: (args) => (
    <ChipGroup label="Device actions">
      <Chip onClick={args.onClick}>Connect to</Chip>
      <Chip onClick={args.onClick}>Show in schematic</Chip>
      <Chip onClick={args.onClick}>Move to</Chip>
      <Chip onClick={args.onClick} disabled>
        Delete
      </Chip>
    </ChipGroup>
  ),
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Move to' }));
    await expect(args.onClick).toHaveBeenCalledOnce();
    await userEvent.click(canvas.getByRole('button', { name: 'Delete' }));
    await expect(args.onClick).toHaveBeenCalledOnce();
    // Not toggles: no pressed state.
    await expect(canvas.getByRole('button', { name: 'Move to' })).not.toHaveAttribute(
      'aria-pressed',
    );
  },
};

function Picked() {
  const [rooms, setRooms] = useState(['Kitchen', 'Living room', 'A very long room name, hall']);
  return (
    <div style={{ width: 320 }}>
      <ChipGroup label="Picked rooms">
        {rooms.map((room) => (
          <Chip key={room} onRemove={() => setRooms(rooms.filter((r) => r !== room))}>
            {room}
          </Chip>
        ))}
        <Chip size="sm" dashed onRemove={() => undefined} disabled>
          Locked
        </Chip>
      </ChipGroup>
    </div>
  );
}

export const Removable: Story = {
  name: 'Removable chips',
  parameters: staticStory,
  render: () => <Picked />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Remove Kitchen' }));
    await expect(canvas.queryByText('Kitchen')).toBeNull();
    await expect(canvas.getByText('Living room')).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Remove Locked' })).toBeDisabled();
  },
};

function SelectableRemovable() {
  const [on, setOn] = useState(false);
  const [shown, setShown] = useState(true);
  return shown ? (
    <Chip selected={on} count={4} onClick={() => setOn(!on)} onRemove={() => setShown(false)}>
      Level 2
    </Chip>
  ) : (
    <span>Removed</span>
  );
}

export const SelectableAndRemovable: Story = {
  name: 'Toggle and remove in one chip',
  tags: ['!autodocs'],
  parameters: staticStory,
  render: () => <SelectableRemovable />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const toggle = canvas.getByRole('button', { name: /^Level 2/ });
    await userEvent.click(toggle);
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await userEvent.tab();
    await expect(canvas.getByRole('button', { name: 'Remove Level 2' })).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect(canvas.getByText('Removed')).toBeVisible();
  },
};

export const German: Story = {
  name: 'German texts',
  parameters: { ...staticStory, language: 'de-CH' },
  render: () => (
    <ChipGroup label="Gewählte Räume">
      <Chip tone="strong">Gebaut</Chip>
      <Chip dashed>Geplant</Chip>
      <Chip selected count={3} onClick={() => undefined}>
        Steckdosen
      </Chip>
      <Chip onRemove={() => undefined}>Küche</Chip>
    </ChipGroup>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: 'Küche entfernen' })).toBeVisible();
  },
};

export const DarkMode: Story = {
  name: 'A11y / Dark mode',
  ...darkA11y,
  render: () => (
    <div className="story-stack">
      <Statuses />
      <Filters />
      <Picked />
    </div>
  ),
};

import type { Meta, StoryObj } from '@storybook/react-vite';
import { Copy, Plug, Trash2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';
import { darkA11y, staticStory } from '../../stories/storyHelpers';
import { Button } from '../Button/Button';
import { Chip, ChipGroup } from '../Chip/Chip';
import { IconButton } from '../IconButton/IconButton';
import { Input } from '../Input/Input';
import { DrawingCard } from './DrawingCard';

const meta = {
  title: 'Components/DrawingCard',
  component: DrawingCard,
  args: {
    title: 'Socket 1.04',
    subtitle: 'Kitchen · circuit F3',
    placement: 'floating',
    width: 'md',
    dockOnPhone: true,
  },
  argTypes: {
    placement: { control: 'radio', options: ['floating', 'docked'] },
    width: { control: 'radio', options: ['sm', 'md', 'lg'] },
  },
  render: (args) => (
    <Drawing>
      <DrawingCard {...args}>
        <p style={{ margin: 0 }}>Double socket, 230 V, 10 A.</p>
      </DrawingCard>
    </Drawing>
  ),
} satisfies Meta<typeof DrawingCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A stand-in for a drawing: the card's frame is its nearest positioned parent. */
function Drawing({ children, height = 420 }: { children?: ReactNode; height?: number }) {
  return (
    <div
      data-testid="drawing"
      style={{
        position: 'relative',
        width: 'min(720px, calc(100vw - 2 * var(--space-8)))',
        height,
        border: '1px solid var(--border-1)',
        backgroundColor: 'var(--bg-2)',
        backgroundImage:
          'linear-gradient(var(--border-1) 1px, transparent 1px), linear-gradient(90deg, var(--border-1) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
        overflow: 'hidden',
      }}
    >
      {children}
    </div>
  );
}

const lines = Array.from({ length: 14 }, (_, index) => `Cable W${index + 1}: 3×1.5 mm², 12 m`);

function SettingsCard({ onClose }: { onClose?: () => void }) {
  const [name, setName] = useState('Socket 1.04');
  const [mounting, setMounting] = useState('flush');
  return (
    <DrawingCard
      label={name}
      icon={<Plug />}
      title={
        <Input
          label="Name"
          hideLabel
          size="sm"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      }
      subtitle="Kitchen · circuit F3"
      x={48}
      y={32}
      actions={
        <>
          <IconButton size="sm" label="Duplicate">
            <Copy size={16} strokeWidth={1.75} />
          </IconButton>
          <IconButton size="sm" variant="danger" label="Delete">
            <Trash2 size={16} strokeWidth={1.75} />
          </IconButton>
        </>
      }
      footer={
        <>
          <Button size="sm" variant="ghost">
            Show in schematic
          </Button>
          <Button size="sm" variant="primary">
            Connect to
          </Button>
        </>
      }
      onClose={onClose}
    >
      <ChipGroup label="Mounting">
        {['flush', 'surface', 'cavity wall'].map((option) => (
          <Chip key={option} selected={mounting === option} onClick={() => setMounting(option)}>
            {option}
          </Chip>
        ))}
      </ChipGroup>
      <ul style={{ margin: 'var(--space-3) 0 0', paddingLeft: 18 }}>
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </DrawingCard>
  );
}

function Closable({ children }: { children: (close: () => void) => ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <Drawing>
      {open ? (
        children(() => setOpen(false))
      ) : (
        <Button style={{ margin: 16 }} onClick={() => setOpen(true)}>
          Open card
        </Button>
      )}
    </Drawing>
  );
}

export const Default: Story = {};

export const Settings: Story = {
  name: 'Settings on the drawing (title field, actions, footer, scrolling body)',
  parameters: staticStory,
  render: () => <Closable>{(close) => <SettingsCard onClose={close} />}</Closable>,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const card = canvas.getByRole('region', { name: 'Socket 1.04' });
    const name = within(card).getByRole('textbox', { name: 'Name' });
    await userEvent.clear(name);
    await userEvent.type(name, 'Socket 2');
    await expect(canvas.getByRole('region', { name: 'Socket 2' })).toBeVisible();

    await userEvent.click(within(card).getByRole('button', { name: 'surface' }));
    await expect(within(card).getByRole('button', { name: 'surface' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    // The body scrolls; the title row and the footer stay in view.
    await expect(card.scrollHeight).toBeLessThanOrEqual(card.clientHeight + 2);
    await expect(within(card).getByRole('button', { name: 'Connect to' })).toBeVisible();

    // Escape inside the card closes it.
    name.focus();
    await userEvent.keyboard('{Escape}');
    await expect(canvas.queryByRole('region')).toBeNull();
    await userEvent.click(canvas.getByRole('button', { name: 'Open card' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Close' }));
    await expect(canvas.queryByRole('region')).toBeNull();
  },
};

export const Placements: Story = {
  name: 'Right side, at a point, and docked under the drawing',
  parameters: staticStory,
  render: () => (
    <div className="story-stack">
      <Drawing height={300}>
        <DrawingCard title="Junction box D1" subtitle="Right side (default)" width="sm" />
        <DrawingCard title="Opening O3" subtitle="At x 32, y 120" x={32} y={120} width="sm" />
      </Drawing>
      <div style={{ width: 'min(720px, calc(100vw - 2 * var(--space-8)))' }}>
        <Drawing height={160} />
        <DrawingCard placement="docked" title="Unplaced devices" subtitle="3 to place">
          <ChipGroup label="Unplaced devices">
            <Chip onClick={() => undefined}>Socket 1.05</Chip>
            <Chip onClick={() => undefined}>Light 1.02</Chip>
            <Chip onClick={() => undefined}>Switch 1.01</Chip>
          </ChipGroup>
        </DrawingCard>
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const [frame] = canvas.getAllByTestId('drawing');
    const right = canvas.getByRole('region', { name: 'Junction box D1' });
    const point = canvas.getByRole('region', { name: 'Opening O3' });
    const docked = canvas.getByRole('region', { name: 'Unplaced devices' });
    await expect(docked).toHaveAttribute('data-placement', 'docked');
    if (!window.matchMedia('(max-width: 760px)').matches) {
      const box = frame!.getBoundingClientRect();
      await expect(Math.round(box.right - right.getBoundingClientRect().right)).toBe(13);
      await expect(Math.round(point.getBoundingClientRect().left - box.left)).toBe(33);
      await expect(Math.round(point.getBoundingClientRect().top - box.top)).toBe(121);
    }
  },
};

export const Widths: Story = {
  name: 'Widths',
  parameters: staticStory,
  render: () => (
    <Drawing height={300}>
      <DrawingCard title="Small" width="sm" x={12} y={12} />
      <DrawingCard title="Medium" width="md" x={12} y={100} />
      <DrawingCard title="Large" width="lg" x={12} y={188} />
    </Drawing>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    if (window.matchMedia('(max-width: 760px)').matches) return;
    await expect(canvas.getByRole('region', { name: 'Small' }).offsetWidth).toBe(260);
    await expect(canvas.getByRole('region', { name: 'Medium' }).offsetWidth).toBe(320);
    await expect(canvas.getByRole('region', { name: 'Large' }).offsetWidth).toBe(400);
  },
};

export const Phone: Story = {
  name: 'On a phone it docks to the bottom edge',
  globals: { viewport: { value: 'phone' } },
  parameters: {
    ...staticStory,
    viewport: {
      options: { phone: { name: 'Phone', styles: { width: '390px', height: '844px' } } },
    },
  },
  render: () => (
    <Drawing height={560}>
      <SettingsCard onClose={() => undefined} />
    </Drawing>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const card = canvas.getByRole('region', { name: 'Socket 1.04' });
    if (!window.matchMedia('(max-width: 760px)').matches) return;
    const frame = canvas.getByTestId('drawing').getBoundingClientRect();
    const box = card.getBoundingClientRect();
    await expect(Math.round(frame.bottom - box.bottom)).toBe(9);
    await expect(Math.round(box.left - frame.left)).toBe(9);
    await expect(Math.round(frame.right - box.right)).toBe(9);
  },
};

export const ReadOnly: Story = {
  name: 'Read only (no actions, no close)',
  parameters: staticStory,
  render: () => (
    <Drawing height={220}>
      <DrawingCard title="Board UV1" subtitle="Shared view">
        <ChipGroup label="Status">
          <Chip tone="strong">Built</Chip>
          <Chip size="sm">12 circuits</Chip>
        </ChipGroup>
      </DrawingCard>
    </Drawing>
  ),
  play: async ({ canvasElement }) => {
    const card = within(canvasElement).getByRole('region', { name: 'Board UV1' });
    await expect(within(card).queryAllByRole('button')).toHaveLength(0);
  },
};

export const German: Story = {
  name: 'German texts',
  args: { onClose: fn() },
  parameters: { ...staticStory, language: 'de-CH' },
  render: (args) => (
    <Drawing height={260}>
      <DrawingCard
        title="Hausanschlusskasten"
        subtitle="max. Anschlussstrom 40 A"
        onClose={args.onClose}
      >
        <ChipGroup label="Netzform">
          <Chip selected onClick={() => undefined}>
            TN-S
          </Chip>
          <Chip onClick={() => undefined}>TN-C-S</Chip>
        </ChipGroup>
      </DrawingCard>
    </Drawing>
  ),
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Schliessen' }));
    await expect(args.onClose).toHaveBeenCalledOnce();
  },
};

export const DarkMode: Story = {
  name: 'A11y / Dark mode',
  ...darkA11y,
  render: () => (
    <div className="story-stack">
      <Drawing>
        <SettingsCard onClose={() => undefined} />
      </Drawing>
      <DrawingCard placement="docked" title="Unplaced devices" subtitle="3 to place" />
    </div>
  ),
};

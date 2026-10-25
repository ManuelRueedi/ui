import type { Meta, StoryObj } from '@storybook/react-vite';
import { Search } from 'lucide-react';
import { expect, userEvent, within } from 'storybook/test';
import { darkA11y, staticStory } from '../../stories/storyHelpers';
import { Input } from './Input';

const meta = {
  title: 'Components/Input',
  component: Input,
  args: {
    label: 'Project name',
    placeholder: 'Limmatstrasse 18',
    size: 'md',
    variant: 'default',
    disabled: false,
    readOnly: false,
    required: false,
  },
  argTypes: {
    size: { control: 'radio', options: ['sm', 'md', 'lg'] },
    variant: { control: 'radio', options: ['default', 'plain'] },
  },
  render: (args) => (
    <div className="story-form">
      <Input {...args} />
    </div>
  ),
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getByLabelText('Project name');
    await userEvent.type(input, 'Seestrasse 4');
    await expect(input).toHaveValue('Seestrasse 4');
  },
};

function Types() {
  return (
    <div className="story-form">
      <Input label="Search" type="search" prefix={<Search size={14} />} placeholder="Search" />
      <Input label="Email" type="email" placeholder="name@firma.ch" />
      <Input label="Date" type="date" defaultValue="2026-05-18" />
      <Input label="Amount" type="number" suffix="CHF" defaultValue="120" />
    </div>
  );
}

function States() {
  return (
    <div className="story-form">
      <Input label="With help" description="Shown on the report." defaultValue="Hauptverteilung" />
      <Input label="With error" error="Enter a name." required />
      <Input label="Read only" readOnly defaultValue="ELMU-2026-000042" />
      <Input label="Disabled" disabled defaultValue="Locked" />
      <Input label="Plain (table cell)" variant="plain" defaultValue="0.42" />
    </div>
  );
}

export const AllTypes: Story = { name: 'Types', parameters: staticStory, render: () => <Types /> };

export const AllStates: Story = {
  name: 'States',
  parameters: staticStory,
  render: () => <States />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const invalid = canvas.getByLabelText(/With error/);
    await expect(invalid).toHaveAttribute('aria-invalid', 'true');
    await expect(invalid).toHaveAccessibleDescription('Enter a name.');
    await expect(canvas.getByLabelText('Disabled')).toBeDisabled();
  },
};

export const MeasurementControls: Story = {
  name: 'Measurement controls',
  parameters: staticStory,
  render: () => (
    <div className="story-form">
      <Input label="Isolationswiderstand" size="lg" suffix="MΩ" inputMode="decimal" />
      <Input label="Schleifenimpedanz" size="lg" suffix="Ω" inputMode="decimal" />
    </div>
  ),
};

export const Sizes: Story = {
  name: 'Sizes',
  parameters: staticStory,
  render: () => (
    <div className="story-form">
      <Input label="Small" size="sm" suffix="m" defaultValue="2.45" />
      <Input label="Medium" defaultValue="2.45" suffix="m" />
      <Input label="Large" size="lg" defaultValue="2.45" suffix="m" />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const small = within(canvasElement).getByLabelText('Small');
    await userEvent.clear(small);
    await userEvent.type(small, '3.1');
    await expect(small).toHaveValue('3.1');
  },
};

export const DarkMode: Story = {
  name: 'A11y / Dark mode',
  ...darkA11y,
  render: () => (
    <div className="story-grid" style={{ alignItems: 'start' }}>
      <Types />
      <States />
    </div>
  ),
};

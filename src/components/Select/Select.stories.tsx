import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { darkA11y, staticStory } from '../../stories/storyHelpers';
import { Select } from './Select';

const options = [
  { value: 'initial', label: 'Erstprüfung' },
  { value: 'final', label: 'Schlusskontrolle' },
  { value: 'periodic', label: 'Periodische Kontrolle' },
  { value: 'acceptance', label: 'Abnahmekontrolle', disabled: true },
];

const meta = {
  title: 'Components/Select',
  component: Select,
  args: { label: 'Control type', options, placeholder: 'Choose…', size: 'md' },
  argTypes: {
    size: { control: 'radio', options: ['sm', 'md', 'lg'] },
    variant: { control: 'radio', options: ['default', 'plain'] },
  },
  render: (args) => (
    <div className="story-form">
      <Select {...args} />
    </div>
  ),
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const select = within(canvasElement).getByLabelText('Control type');
    await userEvent.selectOptions(select, 'final');
    await expect(select).toHaveValue('final');
  },
};

function States() {
  return (
    <div className="story-form">
      <Select label="With error" options={options} placeholder="Choose…" error="Choose a type." />
      <Select label="Read only" options={options} defaultValue="periodic" readOnly name="type" />
      <Select label="Disabled" options={options} defaultValue="initial" disabled />
    </div>
  );
}

export const AllStates: Story = {
  name: 'States',
  parameters: staticStory,
  render: () => <States />,
  play: async ({ canvasElement }) => {
    const readOnly = within(canvasElement).getByLabelText('Read only');
    await expect(readOnly).toHaveValue('Periodische Kontrolle');
  },
};

const groupedOptions = [
  {
    label: 'Kitchen',
    options: [
      { value: 'f1-1', label: 'F1.1 Cooker' },
      { value: 'f1-2', label: 'F1.2 Sockets' },
    ],
  },
  {
    label: 'Bathroom',
    options: [
      { value: 'f1-3', label: 'F1.3 Light' },
      { value: 'f1-4', label: 'F1.4 Heater', disabled: true },
    ],
  },
  { value: 'new', label: 'New circuit' },
];

function GroupsAndSizes() {
  return (
    <div className="story-form">
      <Select label="Circuit" options={groupedOptions} placeholder="Choose…" />
      <Select label="Read only group" options={groupedOptions} defaultValue="f1-3" readOnly />
      <Select label="Small" size="sm" options={options} defaultValue="final" />
    </div>
  );
}

export const GroupsAndSmall: Story = {
  name: 'Groups and small size',
  parameters: staticStory,
  render: () => <GroupsAndSizes />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const circuit = canvas.getByLabelText('Circuit');
    await expect(circuit.querySelectorAll('optgroup')).toHaveLength(2);
    await userEvent.selectOptions(circuit, 'f1-2');
    await expect(circuit).toHaveValue('f1-2');
    await expect(canvas.getByLabelText('Read only group')).toHaveValue('F1.3 Light');
  },
};

export const DarkMode: Story = {
  name: 'A11y / Dark mode',
  ...darkA11y,
  render: () => (
    <>
      <States />
      <GroupsAndSizes />
    </>
  ),
};

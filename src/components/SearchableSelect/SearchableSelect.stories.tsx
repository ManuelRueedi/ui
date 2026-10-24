import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { darkA11y, staticStory } from '../../stories/storyHelpers';
import { SearchableSelect } from './SearchableSelect';

const devices = [
  { value: 'ls-b13', label: 'LS B13', tooltip: 'Miniature circuit breaker, B curve, 13 A' },
  { value: 'ls-c16', label: 'LS C16', tooltip: 'Miniature circuit breaker, C curve, 16 A' },
  { value: 'fi-40-30', label: 'FI 40 A / 30 mA' },
  { value: 'fi-ls-b13', label: 'FI/LS B13 30 mA' },
  { value: 'sicherung-25', label: 'Schmelzsicherung 25 A' },
  'Leitungsschutzschalter',
  'Überspannungsschutz',
];

const meta = {
  title: 'Components/SearchableSelect',
  component: SearchableSelect,
  args: { label: 'Protection device', options: devices, size: 'md', allowCustom: false },
  argTypes: { size: { control: 'radio', options: ['md', 'lg'] } },
  render: (args) => (
    <div className="story-form" style={{ minHeight: 280 }}>
      <SearchableSelect {...args} />
    </div>
  ),
} satisfies Meta<typeof SearchableSelect>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole('combobox', { name: 'Protection device' });
    await step('Typing filters the list', async () => {
      await userEvent.click(input);
      await expect(input).toHaveAttribute('aria-expanded', 'true');
      await userEvent.type(input, 'fi');
      const listbox = within(document.body).getByRole('listbox');
      await waitFor(() =>
        expect(
          within(listbox)
            .getAllByRole('option')
            .map((option) => option.textContent),
        ).toEqual(expect.arrayContaining(['FI 40 A / 30 mA', 'FI/LS B13 30 mA'])),
      );
    });
    await step('Arrow keys and Enter choose an option', async () => {
      await userEvent.keyboard('{ArrowDown}{Enter}');
      await expect(input).toHaveValue('FI/LS B13 30 mA');
      await expect(input).toHaveAttribute('aria-expanded', 'false');
    });
    await step('Escape keeps the chosen option', async () => {
      await userEvent.click(input);
      await userEvent.type(input, 'xyz');
      await expect(within(document.body).getByText('No matches')).toBeVisible();
      await userEvent.keyboard('{Escape}');
      await expect(input).toHaveValue('FI/LS B13 30 mA');
    });
  },
};

export const Large: Story = {
  args: { size: 'lg', defaultValue: 'ls-c16' },
  parameters: staticStory,
};

export const CustomValues: Story = {
  name: 'Custom values',
  args: { allowCustom: true, label: 'Device or free text' },
  parameters: staticStory,
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getByRole('combobox');
    await userEvent.click(input);
    await userEvent.type(input, 'NH 63 A{Enter}');
    await expect(input).toHaveValue('NH 63 A');
  },
};

function States() {
  return (
    <div className="story-form" style={{ minHeight: 280 }}>
      <SearchableSelect label="With error" options={devices} error="Choose a device." />
      <SearchableSelect label="Read only" options={devices} defaultValue="ls-b13" readOnly />
      <SearchableSelect label="Disabled" options={devices} defaultValue="ls-b13" disabled />
    </div>
  );
}

export const EdgeCases: Story = {
  name: 'States',
  parameters: staticStory,
  render: () => <States />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('combobox', { name: 'Read only' })).toHaveValue('LS B13');
    await expect(canvas.getByRole('combobox', { name: 'Disabled' })).toBeDisabled();
  },
};

export const DisabledFieldset: Story = {
  name: 'Disabled fieldset closes the list',
  tags: ['!dev', '!autodocs'],
  parameters: staticStory,
  render: () => (
    <fieldset id="story-fieldset" style={{ border: 0, padding: 0, minHeight: 260 }}>
      <SearchableSelect label="Device" options={devices} />
    </fieldset>
  ),
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getByRole('combobox');
    await userEvent.click(input);
    await expect(input).toHaveAttribute('aria-expanded', 'true');
    canvasElement.querySelector('fieldset')?.setAttribute('disabled', '');
    await waitFor(() => expect(input).toHaveAttribute('aria-expanded', 'false'));
  },
};

export const DarkMode: Story = {
  name: 'A11y / Dark mode',
  ...darkA11y,
  render: () => <States />,
};

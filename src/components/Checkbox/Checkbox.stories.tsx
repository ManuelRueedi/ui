import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { darkA11y, staticStory } from '../../stories/storyHelpers';
import { Checkbox } from './Checkbox';

const meta = {
  title: 'Components/Checkbox',
  component: Checkbox,
  args: { label: 'Prüfung erledigt', variant: 'box', hideLabel: false, disabled: false },
  argTypes: { variant: { control: 'radio', options: ['box', 'switch'] } },
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const checkbox = canvas.getByRole('checkbox', { name: 'Prüfung erledigt' });
    await userEvent.click(canvas.getByText('Prüfung erledigt'));
    await expect(checkbox).toBeChecked();
    checkbox.focus();
    await userEvent.keyboard(' ');
    await expect(checkbox).not.toBeChecked();
    await expect(checkbox).toHaveFocus();
  },
};

function StateList() {
  return (
    <div className="story-section">
      <Checkbox label="Offen" />
      <Checkbox label="Erledigt" defaultChecked />
      <Checkbox label="Teilweise erledigt" indeterminate />
      <Checkbox label="Gesperrt" disabled />
      <Checkbox label="Erledigt und gesperrt" defaultChecked disabled />
    </div>
  );
}

export const States: Story = {
  parameters: staticStory,
  render: () => <StateList />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('checkbox', { name: 'Erledigt' })).toBeChecked();
    const mixed = canvas.getByRole('checkbox', { name: 'Teilweise erledigt' });
    await expect(mixed).toBePartiallyChecked();
    await userEvent.click(mixed);
    await expect(mixed).toBeChecked();
    const disabled = canvas.getByRole('checkbox', { name: 'Gesperrt' });
    await expect(disabled).toBeDisabled();
  },
};

function SwitchList() {
  return (
    <div className="story-section" style={{ width: 320 }}>
      <Checkbox variant="switch" label="Benachrichtigungen" defaultChecked />
      <Checkbox variant="switch" label="Offline speichern" />
      <Checkbox variant="switch" label="Gesperrt" disabled />
    </div>
  );
}

export const Switch: Story = {
  parameters: staticStory,
  render: () => <SwitchList />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const offline = canvas.getByRole('switch', { name: 'Offline speichern' });
    await userEvent.click(offline);
    await expect(offline).toBeChecked();
  },
};

export const WithoutVisibleLabel: Story = {
  name: 'Without visible label',
  tags: ['!dev', '!autodocs'],
  args: { label: 'Sichtprüfung erledigt', hideLabel: true },
  play: async ({ canvasElement }) => {
    // The native input is transparent on purpose; it must still carry the hidden label.
    const checkbox = within(canvasElement).getByRole('checkbox', { name: 'Sichtprüfung erledigt' });
    await userEvent.click(checkbox);
    await expect(checkbox).toBeChecked();
  },
};

export const DarkMode: Story = {
  name: 'A11y / Dark mode',
  ...darkA11y,
  render: () => (
    <div className="story-grid" style={{ alignItems: 'start' }}>
      <StateList />
      <SwitchList />
    </div>
  ),
};

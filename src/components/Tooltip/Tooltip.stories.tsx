import type { Meta, StoryObj } from '@storybook/react-vite';
import { Info } from 'lucide-react';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { darkA11y, staticStory } from '../../stories/storyHelpers';
import { Button } from '../Button/Button';
import { IconButton } from '../IconButton/IconButton';
import { Tooltip } from './Tooltip';

const meta = {
  title: 'Components/Tooltip',
  component: Tooltip,
  args: { content: 'Saves the protocol', placement: 'top', collision: 'flip', disabled: false },
  argTypes: {
    placement: { control: 'radio', options: ['top', 'right', 'bottom', 'left'] },
    collision: { control: 'radio', options: ['flip', 'shift', 'none'] },
  },
  render: (args) => (
    <div style={{ padding: 48 }}>
      <Tooltip {...args}>
        <Button variant="primary">Save</Button>
      </Tooltip>
    </div>
  ),
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole('button', { name: 'Save' });
    await userEvent.hover(button);
    const tooltip = await within(document.body).findByRole('tooltip');
    await waitFor(() => expect(tooltip).toHaveAttribute('data-open', 'true'));
    await expect(button).toHaveAccessibleDescription('Saves the protocol');
    await userEvent.unhover(button);
    await waitFor(() => expect(tooltip).toHaveAttribute('data-open', 'false'));
  },
};

function Placements() {
  return (
    <div className="story-grid" style={{ gap: 48, padding: 64 }}>
      {(['top', 'right', 'bottom', 'left'] as const).map((placement) => (
        <Tooltip key={placement} content={`Placed ${placement}`} placement={placement}>
          <IconButton label={`Info ${placement}`} variant="secondary">
            <Info size={16} strokeWidth={1.8} />
          </IconButton>
        </Tooltip>
      ))}
    </div>
  );
}

export const AllPlacements: Story = {
  name: 'Placements',
  parameters: staticStory,
  render: () => <Placements />,
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole('button', { name: 'Info right' });
    button.focus();
    const tooltip = await within(document.body).findByText('Placed right');
    await waitFor(() => expect(tooltip).toHaveAttribute('data-open', 'true'));
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(tooltip).toHaveAttribute('data-open', 'false'));
  },
};

export const DarkMode: Story = {
  name: 'A11y / Dark mode',
  ...darkA11y,
  render: () => <Placements />,
  play: async ({ canvasElement }) => {
    within(canvasElement).getByRole('button', { name: 'Info top' }).focus();
    await within(document.body).findByText('Placed top');
  },
};

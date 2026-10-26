import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { darkA11y, staticStory } from '../../stories/storyHelpers';
import { Textarea } from './Textarea';

const meta = {
  title: 'Components/Textarea',
  component: Textarea,
  args: { label: 'Notes', placeholder: 'What did you find?', rows: 3, size: 'md' },
  argTypes: {
    size: { control: 'radio', options: ['sm', 'md', 'lg'] },
    variant: { control: 'radio', options: ['default', 'plain'] },
  },
  render: (args) => (
    <div className="story-form">
      <Textarea {...args} />
    </div>
  ),
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const textarea = within(canvasElement).getByLabelText('Notes');
    await userEvent.type(textarea, 'FI tested');
    await expect(textarea).toHaveValue('FI tested');
  },
};

function States() {
  return (
    <div className="story-form">
      <Textarea label="Small" size="sm" rows={2} defaultValue="Compact note" />
      <Textarea label="With error" error="Add a note." />
      <Textarea label="Read only" readOnly defaultValue="Checked on site." />
      <Textarea label="Disabled" disabled defaultValue="Locked" />
    </div>
  );
}

export const AllStates: Story = {
  name: 'States',
  parameters: staticStory,
  render: () => <States />,
};
export const DarkMode: Story = { name: 'A11y / Dark mode', ...darkA11y, render: () => <States /> };

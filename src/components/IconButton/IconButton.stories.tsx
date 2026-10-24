import type { Meta, StoryObj } from '@storybook/react-vite';
import { Bold, Pencil, Settings, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';
import { darkA11y, staticStory } from '../../stories/storyHelpers';
import { IconButton } from './IconButton';

const meta = {
  title: 'Components/IconButton',
  component: IconButton,
  args: { label: 'Settings', variant: 'ghost', size: 'md', disabled: false },
  argTypes: {
    variant: { control: 'radio', options: ['ghost', 'secondary', 'danger'] },
    size: { control: 'radio', options: ['sm', 'md', 'lg'] },
  },
  render: (args) => (
    <IconButton {...args}>
      <Settings size={16} strokeWidth={1.8} />
    </IconButton>
  ),
} satisfies Meta<typeof IconButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

function Gallery() {
  const [bold, setBold] = useState(false);
  return (
    <div className="story-stack">
      <div className="story-section">
        <p className="story-label">Variants</p>
        <div className="story-grid">
          <IconButton label="Edit">
            <Pencil size={16} strokeWidth={1.8} />
          </IconButton>
          <IconButton label="Settings" variant="secondary">
            <Settings size={16} strokeWidth={1.8} />
          </IconButton>
          <IconButton label="Delete" variant="danger">
            <Trash2 size={16} strokeWidth={1.8} />
          </IconButton>
          <IconButton label="Locked" disabled>
            <Settings size={16} strokeWidth={1.8} />
          </IconButton>
          <IconButton label="Bold" pressed={bold} onClick={() => setBold((value) => !value)}>
            <Bold size={16} strokeWidth={1.8} />
          </IconButton>
        </div>
      </div>
      <div className="story-section">
        <p className="story-label">Sizes</p>
        <div className="story-grid">
          {(['sm', 'md', 'lg'] as const).map((size) => (
            <IconButton key={size} label={`Settings ${size}`} size={size} variant="secondary">
              <Settings size={16} strokeWidth={1.8} />
            </IconButton>
          ))}
        </div>
      </div>
    </div>
  );
}

export const VariantsAndStates: Story = {
  name: 'Variants and states',
  parameters: staticStory,
  render: () => <Gallery />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: 'Locked' })).toBeDisabled();
    const bold = canvas.getByRole('button', { name: 'Bold' });
    await expect(bold).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(bold);
    await expect(bold).toHaveAttribute('aria-pressed', 'true');
  },
};

export const DarkMode: Story = { name: 'A11y / Dark mode', ...darkA11y, render: () => <Gallery /> };

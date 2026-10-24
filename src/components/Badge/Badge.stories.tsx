import type { Meta, StoryObj } from '@storybook/react-vite';
import { AlertTriangle, CheckCircle2, Circle } from 'lucide-react';
import { darkA11y, staticStory } from '../../stories/storyHelpers';
import { Badge } from './Badge';

const meta = {
  title: 'Components/Badge',
  component: Badge,
  args: { tone: 'neutral' },
  argTypes: { tone: { control: 'radio', options: ['neutral', 'strong', 'warning', 'error'] } },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

function Tones() {
  return (
    <div className="story-grid">
      <Badge>
        <Circle size={13} strokeWidth={1.75} />
        Neutral
      </Badge>
      <Badge tone="strong">
        <CheckCircle2 size={13} strokeWidth={1.75} />
        Ready
      </Badge>
      <Badge tone="warning">
        <AlertTriangle size={13} strokeWidth={1.75} />
        Review
      </Badge>
      <Badge tone="error">
        <AlertTriangle size={13} strokeWidth={1.75} />
        Blocked
      </Badge>
    </div>
  );
}

export const Default: Story = {
  render: (args) => (
    <Badge {...args}>
      <CheckCircle2 size={13} strokeWidth={1.75} />
      Ready
    </Badge>
  ),
};

export const AllTones: Story = { name: 'Tones', parameters: staticStory, render: () => <Tones /> };
export const DarkMode: Story = { name: 'A11y / Dark mode', ...darkA11y, render: () => <Tones /> };

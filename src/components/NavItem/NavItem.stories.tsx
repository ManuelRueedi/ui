import type { Meta, StoryObj } from '@storybook/react-vite';
import { FolderOpen, Home, Settings, Users } from 'lucide-react';
import { useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';
import { darkA11y, staticStory } from '../../stories/storyHelpers';
import { NavItem } from './NavItem';

const meta = {
  title: 'Components/NavItem',
  component: NavItem,
  args: { active: false, compact: false, icon: Home, children: 'Overview' },
  argTypes: { icon: { table: { disable: true } } },
  render: (args) => (
    <div style={{ width: 240 }}>
      <NavItem {...args} />
    </div>
  ),
} satisfies Meta<typeof NavItem>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

const items = [
  { id: 'home', label: 'Overview', icon: Home },
  { id: 'projects', label: 'Projects', icon: FolderOpen },
  { id: 'team', label: 'Team', icon: Users },
  { id: 'settings', label: 'Settings', icon: Settings },
];

function Navigation() {
  const [active, setActive] = useState('home');
  return (
    <div className="story-grid" style={{ alignItems: 'start' }}>
      <nav style={{ display: 'grid', gap: 4, width: 240 }} aria-label="Wide">
        {items.map((item) => (
          <NavItem
            key={item.id}
            icon={item.icon}
            active={active === item.id}
            aria-current={active === item.id ? 'page' : undefined}
            onClick={() => setActive(item.id)}
          >
            {item.label}
          </NavItem>
        ))}
      </nav>
      <nav style={{ display: 'grid', gap: 4 }} aria-label="Compact">
        {items.map((item) => (
          <NavItem key={item.id} icon={item.icon} compact active={active === item.id}>
            {item.label}
          </NavItem>
        ))}
      </nav>
    </div>
  );
}

export const Navigations: Story = {
  name: 'Navigation',
  parameters: staticStory,
  render: () => <Navigation />,
  play: async ({ canvasElement }) => {
    const wide = within(within(canvasElement).getByRole('navigation', { name: 'Wide' }));
    await userEvent.click(wide.getByRole('button', { name: 'Projects' }));
    await expect(wide.getByRole('button', { name: 'Projects' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  },
};

export const DarkMode: Story = {
  name: 'A11y / Dark mode',
  ...darkA11y,
  render: () => <Navigation />,
};

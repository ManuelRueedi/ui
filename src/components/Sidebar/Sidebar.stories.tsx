import type { Meta, StoryObj } from '@storybook/react-vite';
import { ClipboardCheck, FolderOpen, Home, Plus, Settings, Users, Zap } from 'lucide-react';
import { useState } from 'react';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { darkA11y, staticStory } from '../../stories/storyHelpers';
import { Sidebar, type SidebarProps } from './Sidebar';

const navItems = [
  { id: 'home', label: 'Overview', icon: Home },
  { id: 'projects', label: 'Projects', icon: FolderOpen },
  { id: 'inspections', label: 'Inspections', icon: ClipboardCheck },
  { id: 'team', label: 'Team', icon: Users },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const recentItems = [
  {
    id: 'p1',
    title: 'Limmatstrasse 18',
    subtitle: 'Erstprüfung',
    badge: 'Due',
    tone: 'warning' as const,
    active: true,
  },
  {
    id: 'p2',
    title: 'Seestrasse 4',
    subtitle: 'Schlusskontrolle',
    badge: 'Done',
    tone: 'strong' as const,
  },
  { id: 'p3', title: 'Bahnhofplatz 2', subtitle: 'Periodische Kontrolle' },
];

const meta = {
  title: 'Components/Sidebar',
  component: Sidebar,
  parameters: { canvasLayout: 'fullscreen' },
  args: {
    title: 'messen',
    subtitle: 'Keller Elektro AG',
    brandIcon: Zap,
    actionLabel: 'New project',
    actionIcon: Plus,
    navItems,
    activeItem: 'home',
    recentTitle: 'Recent',
    recentItems,
    account: { isAuthenticated: true, name: 'Mara Keller', detail: 'Keller Elektro AG' },
    feedbackLabel: 'Send feedback',
    onFeedback: fn(),
    onAction: fn(),
    onSettings: fn(),
    onLogout: fn(),
  },
  argTypes: {
    brandIcon: { table: { disable: true } },
    actionIcon: { table: { disable: true } },
  },
  render: (args) => <SidebarDemo {...args} />,
} satisfies Meta<typeof Sidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

function SidebarDemo(props: SidebarProps) {
  const [active, setActive] = useState(props.activeItem);
  return (
    <div style={{ display: 'flex', minHeight: 640 }}>
      <Sidebar {...props} activeItem={active} onNavigate={(id) => setActive(id)} />
      <main style={{ flex: 1, padding: 24 }}>
        <h1>{navItems.find((item) => item.id === active)?.label}</h1>
      </main>
    </div>
  );
}

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const nav = within(canvas.getByRole('navigation', { name: 'Primary' }));
    await userEvent.click(nav.getByRole('button', { name: 'Projects' }));
    await expect(canvas.getByRole('heading', { level: 1 })).toHaveTextContent('Projects');
  },
};

export const Collapsed: Story = {
  args: { defaultCollapsed: true },
  parameters: staticStory,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: 'Expand sidebar' })).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Expand sidebar' }));
    await waitFor(() =>
      expect(canvas.getByRole('button', { name: 'Collapse sidebar' })).toBeVisible(),
    );
  },
};

export const SignedOut: Story = {
  name: 'Signed out',
  parameters: staticStory,
  args: { account: { isAuthenticated: false }, recentItems: [], onLogin: fn() },
};

export const Mobile: Story = {
  tags: ['!dev', '!autodocs'],
  parameters: staticStory,
  globals: { viewport: { value: 'mobile1' } },
};

export const DarkMode: Story = {
  name: 'A11y / Dark mode',
  ...darkA11y,
  parameters: { canvasLayout: 'fullscreen' },
};

import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { darkA11y, staticStory } from '../../stories/storyHelpers';
import { Avatar } from './Avatar';

const meta = {
  title: 'Components/Avatar',
  component: Avatar,
  args: {
    isAuthenticated: true,
    expanded: true,
    name: 'Mara Keller',
    detail: 'Keller Elektro AG',
    loading: false,
    onSettings: fn(),
    onLogout: fn(),
    onLogin: fn(),
  },
  render: (args) => (
    <div style={{ paddingTop: 180, width: 260 }}>
      <Avatar {...args} />
    </div>
  ),
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const AccountMenu: Story = {
  name: 'Account menu',
  parameters: staticStory,
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole('button', { name: 'Open account menu for Mara Keller' });
    await userEvent.click(trigger);
    const menu = canvas.getByRole('menu', { name: 'Account menu' });
    await waitFor(() =>
      expect(within(menu).getByRole('menuitem', { name: 'Settings' })).toHaveFocus(),
    );
    await userEvent.keyboard('{ArrowDown}');
    await expect(within(menu).getByRole('menuitem', { name: 'Log out' })).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(trigger).toHaveFocus());
    await expect(canvas.queryByRole('menu')).toBeNull();
    await userEvent.keyboard('{ArrowUp}');
    await userEvent.click(
      within(canvas.getByRole('menu')).getByRole('menuitem', { name: 'Log out' }),
    );
    await expect(args.onLogout).toHaveBeenCalled();
  },
};

export const Compact: Story = { args: { expanded: false }, parameters: staticStory };

function SignedOutStates() {
  return (
    <div className="story-stack" style={{ width: 260 }}>
      <Avatar onLogin={() => {}} />
      <Avatar loading onLogin={() => {}} />
      <Avatar onLogin={() => {}} settingsHref="#settings" />
      <Avatar expanded={false} onLogin={() => {}} onSettings={() => {}} />
    </div>
  );
}

export const SignedOut: Story = {
  name: 'Signed out',
  parameters: staticStory,
  render: () => <SignedOutStates />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByRole('button', { name: 'Log in' })[0]).toBeEnabled();
    await expect(canvas.getByRole('button', { name: 'Opening' })).toBeDisabled();
    await expect(canvas.getByRole('link', { name: 'Settings' })).toHaveAttribute(
      'href',
      '#settings',
    );
  },
};

export const GermanAccountMenu: Story = {
  name: 'German account menu',
  tags: ['!dev', '!autodocs'],
  parameters: { ...staticStory, language: 'de-CH' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Kontomenü für Mara Keller öffnen' }));
    await expect(canvas.getByRole('menuitem', { name: 'Abmelden' })).toBeVisible();
  },
};

export const DarkMode: Story = {
  name: 'A11y / Dark mode',
  ...darkA11y,
  render: (args) => (
    <div className="story-grid" style={{ alignItems: 'end', paddingTop: 180 }}>
      <div style={{ width: 260 }}>
        <Avatar {...args} />
      </div>
      <SignedOutStates />
    </div>
  ),
  play: async ({ canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole('button', { name: 'Open account menu for Mara Keller' }),
    );
  },
};

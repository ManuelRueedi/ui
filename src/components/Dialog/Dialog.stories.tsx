import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { darkA11y, staticStory } from '../../stories/storyHelpers';
import { Button } from '../Button/Button';
import { Input } from '../Input/Input';
import { Dialog, type DialogProps } from './Dialog';

const meta = {
  title: 'Components/Dialog',
  component: Dialog,
  args: {
    open: false,
    title: 'Rename project',
    description: 'The name shows in lists and on the report.',
    size: 'md',
  },
  argTypes: { size: { control: 'radio', options: ['sm', 'md', 'lg'] } },
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

function DialogDemo(props: Omit<DialogProps, 'open' | 'onClose'> & { buttonLabel?: string }) {
  const { buttonLabel = 'Open dialog', ...rest } = props;
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}>
        {buttonLabel}
      </Button>
      <Dialog
        {...rest}
        open={open}
        onClose={() => setOpen(false)}
        footer={
          <div className="story-grid">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => setOpen(false)}>
              Save
            </Button>
          </div>
        }
      >
        <Input label="Project name" defaultValue="Limmatstrasse 18" />
      </Dialog>
    </>
  );
}

export const Default: Story = {
  render: (args) => (
    <DialogDemo title={args.title} description={args.description} size={args.size} />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Open dialog' }));
    const dialog = await within(document.body).findByRole('dialog', { name: 'Rename project' });
    // The dialog fades in, so wait for the end of the transition.
    await waitFor(() => expect(dialog).toBeVisible());
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(dialog).not.toHaveAttribute('open'));
  },
};

export const Sizes: Story = {
  parameters: staticStory,
  render: () => (
    <div className="story-grid">
      <DialogDemo buttonLabel="Small" size="sm" title="Small dialog" />
      <DialogDemo buttonLabel="Medium" size="md" title="Medium dialog" />
      <DialogDemo buttonLabel="Large" size="lg" title="Large dialog" />
    </div>
  ),
};

export const CloseButton: Story = {
  name: 'Close button',
  tags: ['!dev', '!autodocs'],
  parameters: staticStory,
  render: () => <DialogDemo title="Rename project" />,
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Open dialog' }));
    const dialog = await within(document.body).findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Close dialog' }));
    await waitFor(() => expect(dialog).not.toHaveAttribute('open'));
  },
};

export const German: Story = {
  name: 'German dialog',
  tags: ['!dev', '!autodocs'],
  parameters: { ...staticStory, language: 'de-CH' },
  render: () => <DialogDemo buttonLabel="Öffnen" title="Projekt umbenennen" />,
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Öffnen' }));
    const dialog = await within(document.body).findByRole('dialog');
    const close = within(dialog).getByRole('button', { name: 'Dialog schliessen' });
    await waitFor(() => expect(close).toBeVisible());
  },
};

export const DarkMode: Story = {
  name: 'A11y / Dark mode',
  ...darkA11y,
  render: () => <DialogDemo title="Rename project" description="Dark surface" />,
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Open dialog' }));
    await within(document.body).findByRole('dialog');
  },
};

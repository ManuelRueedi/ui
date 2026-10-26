import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { darkA11y, staticStory } from '../../stories/storyHelpers';
import { Button } from '../Button/Button';
import { Input } from '../Input/Input';
import { Dialog, type DialogCloseReason, type DialogProps } from './Dialog';

const meta = {
  title: 'Components/Dialog',
  component: Dialog,
  args: {
    open: false,
    title: 'Rename project',
    description: 'The name shows in lists and on the report.',
    size: 'md',
  },
  argTypes: { size: { control: 'radio', options: ['sm', 'md', 'lg', 'xl'] } },
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
      <DialogDemo buttonLabel="Extra large" size="xl" title="Extra large dialog" />
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

const desktopParameters = {
  ...staticStory,
  viewport: {
    options: {
      desktop: { name: 'Desktop', styles: { width: '1440px', height: '900px' } },
    },
  },
};

function PreviewDialog() {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState(false);
  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}>
        Open documents
      </Button>
      <Dialog
        open={open}
        title="Documents"
        description="Plans and certificates of this section."
        size={preview ? 'xl' : 'lg'}
        onClose={() => {
          setOpen(false);
          setPreview(false);
        }}
      >
        {preview ? (
          <div className="story-stack">
            <Button onClick={() => setPreview(false)}>Back to list</Button>
            <div
              aria-label="Preview of Schema.pdf"
              role="img"
              style={{ border: '1px solid var(--border-1)', height: 1200 }}
            />
          </div>
        ) : (
          <Button onClick={() => setPreview(true)}>Preview Schema.pdf</Button>
        )}
      </Dialog>
    </>
  );
}

export const ExtraLarge: Story = {
  name: 'Extra large preview',
  globals: { viewport: { value: 'desktop' } },
  parameters: desktopParameters,
  render: () => <PreviewDialog />,
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Open documents' }));
    const dialog = await within(document.body).findByRole('dialog', { name: 'Documents' });
    await waitFor(() => expect(dialog).toBeVisible());
    await expect(window.innerWidth).toBe(1440);
    await expect(dialog.offsetWidth).toBe(720);

    // The size changes while the dialog stays open.
    await userEvent.click(within(dialog).getByRole('button', { name: 'Preview Schema.pdf' }));
    await within(dialog).findByRole('img', { name: 'Preview of Schema.pdf' });
    await expect(dialog).toHaveAttribute('open');
    await expect(dialog.offsetWidth).toBe(1160);
    // The surface may grow past the 760px cap of the other sizes, up to the viewport less 32px.
    await expect(dialog.offsetHeight).toBe(window.innerHeight - 32);

    await userEvent.click(within(dialog).getByRole('button', { name: 'Back to list' }));
    await expect(dialog.offsetWidth).toBe(720);
  },
};

export const ExtraLargePhone: Story = {
  name: 'Extra large on a phone',
  tags: ['!dev', '!autodocs'],
  globals: { viewport: { value: 'phone' } },
  parameters: {
    ...staticStory,
    viewport: {
      options: { phone: { name: 'Phone', styles: { width: '390px', height: '844px' } } },
    },
  },
  render: () => <DialogDemo buttonLabel="Open" size="xl" title="Symbol library" />,
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Open' }));
    const dialog = await within(document.body).findByRole('dialog', { name: 'Symbol library' });
    await waitFor(() => expect(dialog).toBeVisible());
    await expect(dialog.offsetWidth).toBe(window.innerWidth - 16);
  },
};

function KeepInputDialog() {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<DialogCloseReason | 'none'>('none');
  return (
    <div className="story-stack">
      <Button variant="primary" onClick={() => setOpen(true)}>
        Record readings
      </Button>
      <output aria-label="Last close request">{reason}</output>
      <Dialog
        open={open}
        title="Inspection readings"
        description="A click beside the dialog keeps what you typed."
        onClose={(next) => {
          setReason(next);
          // Typed readings must not get lost to a stray click on the backdrop.
          if (next !== 'backdrop') setOpen(false);
        }}
      >
        <Input label="Insulation resistance" suffix="MΩ" />
      </Dialog>
    </div>
  );
}

export const IgnoresBackdrop: Story = {
  name: 'Ignores backdrop clicks',
  parameters: staticStory,
  render: () => <KeepInputDialog />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Record readings' }));
    const dialog = await within(document.body).findByRole('dialog', {
      name: 'Inspection readings',
    });
    await waitFor(() => expect(dialog).toBeVisible());
    const field = within(dialog).getByLabelText('Insulation resistance');
    await userEvent.type(field, '250');

    // The dialog element itself is the target of a click on its backdrop.
    await userEvent.click(dialog);
    await expect(canvas.getByLabelText('Last close request')).toHaveTextContent('backdrop');
    await expect(dialog).toHaveAttribute('open');
    await expect(field).toHaveValue('250');

    await userEvent.keyboard('{Escape}');
    await expect(canvas.getByLabelText('Last close request')).toHaveTextContent('escape');
    await waitFor(() => expect(dialog).not.toHaveAttribute('open'));
  },
};

function MountedWhileOpen() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}>
        Delete circuit
      </Button>
      {open && (
        <Dialog
          open
          title="Delete circuit?"
          aria-describedby="delete-impact"
          onClose={() => setOpen(false)}
          footer={
            <div className="story-grid">
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={() => setOpen(false)}>
                Delete
              </Button>
            </div>
          }
        >
          <p id="delete-impact">Removes 3 cables and 2 terminal assignments.</p>
        </Dialog>
      )}
    </>
  );
}

export const FocusReturnOnUnmount: Story = {
  name: 'Focus returns after unmount',
  tags: ['!dev', '!autodocs'],
  parameters: staticStory,
  render: () => <MountedWhileOpen />,
  play: async ({ canvasElement }) => {
    const opener = within(canvasElement).getByRole('button', { name: 'Delete circuit' });
    await userEvent.click(opener);
    const dialog = await within(document.body).findByRole('dialog', { name: 'Delete circuit?' });
    // Described by body content the caller points at.
    await expect(dialog).toHaveAccessibleDescription(
      'Removes 3 cables and 2 terminal assignments.',
    );
    await waitFor(() =>
      expect(within(dialog).getByRole('button', { name: 'Delete' })).toBeVisible(),
    );
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(dialog).not.toBeInTheDocument());
    await expect(opener).toHaveFocus();
  },
};

export const ExtraLargeDark: Story = {
  name: 'A11y / Extra large dark',
  ...darkA11y,
  globals: { theme: 'dark', viewport: { value: 'desktop' } },
  parameters: desktopParameters,
  render: () => <PreviewDialog />,
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Open documents' }));
    const dialog = await within(document.body).findByRole('dialog', { name: 'Documents' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Preview Schema.pdf' }));
    await waitFor(() => expect(dialog.offsetWidth).toBe(1160));
  },
};

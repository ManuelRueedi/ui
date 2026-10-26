import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState, type CSSProperties } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { darkA11y, staticStory, wait } from '../../stories/storyHelpers';
import { Button } from '../Button/Button';
import { Checkbox } from '../Checkbox/Checkbox';
import { Collapsible } from '../Collapsible/Collapsible';
import { Dialog } from '../Dialog/Dialog';
import { Menu, MenuItem } from '../Menu/Menu';
import { Toast, Toaster, useToast, type ToastOptions, type ToastTone } from './Toast';

const meta = {
  title: 'Components/Toast',
  component: Toaster,
  args: { placement: 'bottom', max: 3 },
  argTypes: { placement: { control: 'radio', options: ['bottom', 'top'] } },
} satisfies Meta<typeof Toaster>;

export default meta;
type Story = StoryObj<typeof meta>;

const body = () => within(document.body);
const region = (name = 'Notifications') => body().getByRole('region', { name });
const toastOf = (element: HTMLElement) => element.closest<HTMLElement>('[data-tone]')!;

/** Waits for the entry animation (it fades in), so checks see the final colours. */
async function settled(element: HTMLElement) {
  await Promise.all(element.getAnimations().map((animation) => animation.finished));
}

/** Finds a toast by its message once it has faded in. */
async function findToast(message: string, container: HTMLElement = region()) {
  const toast = toastOf(await within(container).findByText(message));
  await settled(toast);
  return toast;
}

function ShowButton({ label, options }: { label: string; options: ToastOptions }) {
  const toast = useToast();
  return <Button onClick={() => toast.show(options)}>{label}</Button>;
}

const toneMessages: Record<ToastTone, string> = {
  neutral: 'Project opened',
  success: 'Changes saved',
  warning: 'Cable length is an estimate',
  error: 'Could not save the changes',
};

export const Tones: Story = {
  args: { max: 4 },
  render: (args) => (
    <Toaster {...args}>
      <div className="story-grid">
        {(['neutral', 'success', 'warning', 'error'] as const).map((tone) => (
          <ShowButton
            key={tone}
            label={tone[0].toUpperCase() + tone.slice(1)}
            options={{ message: toneMessages[tone], tone }}
          />
        ))}
      </div>
    </Toaster>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    for (const name of ['Neutral', 'Success', 'Warning', 'Error']) {
      await userEvent.click(canvas.getByRole('button', { name }));
    }
    const status = within(region()).getByRole('status');
    const alert = within(region()).getByRole('alert');
    await expect(await findToast(toneMessages.neutral, status)).toBeVisible();
    await expect(await findToast(toneMessages.success, status)).toBeVisible();
    const warning = await findToast(toneMessages.warning, status);
    const error = await findToast(toneMessages.error, alert);
    await expect(error).toBeVisible();
    // The newest sits nearest the bottom edge, whatever its tone.
    await expect(error.getBoundingClientRect().top).toBeGreaterThan(
      warning.getBoundingClientRect().bottom,
    );
  },
};

function DeleteCircuit() {
  const toast = useToast();
  const [deleted, setDeleted] = useState(false);
  return (
    <div className="story-stack">
      <p className="story-note">{deleted ? 'F1.2 deleted' : 'F1.2 in the list'}</p>
      <Button
        variant="danger"
        disabled={deleted}
        onClick={() => {
          setDeleted(true);
          toast.show({
            id: 'delete-f1.2',
            message: 'Circuit F1.2 deleted',
            action: { label: 'Undo', onClick: () => setDeleted(false) },
          });
        }}
      >
        Delete F1.2
      </Button>
    </div>
  );
}

export const WithAction: Story = {
  name: 'With action',
  render: (args) => (
    <Toaster {...args}>
      <DeleteCircuit />
    </Toaster>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Delete F1.2' }));
    await expect(canvas.getByText('F1.2 deleted')).toBeVisible();
    const toast = await findToast('Circuit F1.2 deleted');
    await userEvent.click(within(toast).getByRole('button', { name: 'Undo' }));
    await expect(canvas.getByText('F1.2 in the list')).toBeVisible();
    await expect(within(region()).queryByText('Circuit F1.2 deleted')).toBeNull();
  },
};

const technicalDetails = '[commit] cable.length: must be greater than 0';

// Builds the details inside the component: Storybook's source view chokes on JSX nested in an object prop.
function SaveWithDetails() {
  const toast = useToast();
  return (
    <Button
      onClick={() =>
        toast.show({
          message: 'The change was not saved',
          tone: 'error',
          details: (
            <Collapsible title="Technical details" headingLevel="none" size="sm">
              <code>{technicalDetails}</code>
            </Collapsible>
          ),
        })
      }
    >
      Save
    </Button>
  );
}

export const WithDetails: Story = {
  name: 'With details',
  render: (args) => (
    <Toaster {...args}>
      <SaveWithDetails />
    </Toaster>
  ),
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Save' }));
    const alert = within(region()).getByRole('alert');
    const toast = await findToast('The change was not saved', alert);
    await userEvent.click(within(toast).getByRole('button', { name: 'Technical details' }));
    await waitFor(() => expect(within(toast).getByText(technicalDetails)).toBeVisible());
  },
};

export const PersistentError: Story = {
  name: 'Persistent error',
  render: (args) => (
    <Toaster {...args}>
      <div className="story-grid">
        <ShowButton
          label="Copy link"
          options={{ message: 'Link copied', tone: 'success', duration: 800 }}
        />
        <ShowButton
          label="Upload plan"
          options={{ message: 'The plan could not be uploaded', tone: 'error' }}
        />
      </div>
    </Toaster>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Copy link' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Upload plan' }));
    await waitFor(() => expect(within(region()).queryByText('Link copied')).toBeNull(), {
      timeout: 2000,
    });
    await wait(400);
    const error = within(region()).getByText('The plan could not be uploaded');
    await expect(error).toBeVisible();
    await userEvent.click(within(toastOf(error)).getByRole('button', { name: 'Dismiss' }));
    await expect(within(region()).queryByText('The plan could not be uploaded')).toBeNull();
  },
};

const noop = () => {};

export const ReplaceById: Story = {
  name: 'Replace by id',
  render: (args) => (
    <Toaster {...args}>
      <div className="story-grid">
        <ShowButton
          label="Start saving"
          options={{
            id: 'save',
            message: 'Saving',
            duration: null,
            action: { label: 'Cancel', onClick: noop, closes: false },
          }}
        />
        <ShowButton
          label="Finish saving"
          options={{ id: 'save', message: 'Saved at 10:02', tone: 'success' }}
        />
        <ShowButton
          label="Fail saving"
          options={{
            id: 'save',
            message: 'Save failed',
            tone: 'error',
            action: { label: 'Retry', onClick: noop, closes: false },
          }}
        />
      </div>
    </Toaster>
  ),
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    await step('A success replaces it in place', async () => {
      await userEvent.click(canvas.getByRole('button', { name: 'Start saving' }));
      const toast = await findToast('Saving');
      await userEvent.click(canvas.getByRole('button', { name: 'Finish saving' }));
      // The same toast changes in place, so it does not slide in again.
      await expect(toast).toHaveTextContent('Saved at 10:02');
      await expect(toast).toHaveAttribute('data-tone', 'success');
      await expect(toast.getAnimations()).toHaveLength(0);
      await expect(region().querySelectorAll('[data-tone]')).toHaveLength(1);
    });

    await step('An error replaces it in place too, with the focus kept inside', async () => {
      await userEvent.click(canvas.getByRole('button', { name: 'Start saving' }));
      const toast = await findToast('Saving');
      const action = within(toast).getByRole('button', { name: 'Cancel' });
      action.focus();
      // A click from code: the focus stays on Cancel, as when the save fails on its own.
      canvas.getByRole('button', { name: 'Fail saving' }).click();
      await waitFor(() => expect(toast).toHaveAttribute('data-tone', 'error'));
      await expect(toast).toBeInTheDocument();
      await expect(toast.getAnimations()).toHaveLength(0);
      await expect(action).toHaveAccessibleName('Retry');
      await expect(action).toHaveFocus();
      // Announced with the urgency of an error from where it is.
      await expect(toast).toHaveAttribute('aria-live', 'assertive');
    });
  },
};

export const PauseOnHover: Story = {
  name: 'Pause on hover',
  render: (args) => (
    <Toaster {...args}>
      <ShowButton label="Copy link" options={{ message: 'Link copied', duration: 1200 }} />
    </Toaster>
  ),
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Copy link' }));
    const toast = await findToast('Link copied');
    await userEvent.hover(toast);
    await expect(region()).toHaveAttribute('data-paused');
    await wait(1800);
    await expect(toast).toBeVisible();
    await userEvent.unhover(toast);
    await expect(region()).not.toHaveAttribute('data-paused');
    await waitFor(() => expect(toast).not.toBeInTheDocument(), { timeout: 2000 });
  },
};

function OfflineSwitch() {
  const [offline, setOffline] = useState(false);
  return (
    <>
      <Checkbox
        variant="switch"
        label="Offline"
        checked={offline}
        onChange={(event) => setOffline(event.currentTarget.checked)}
      />
      <Toast
        open={offline}
        tone="warning"
        message="You are offline"
        details="Changes stay on this device until the connection is back."
        duration={null}
        dismissible={false}
        attributes={{ 'data-offline-toast': '' }}
      />
    </>
  );
}

export const Declarative: Story = {
  name: 'Declarative Toast',
  render: (args) => (
    <Toaster {...args}>
      <OfflineSwitch />
    </Toaster>
  ),
  play: async ({ canvasElement }) => {
    const toggle = within(canvasElement).getByRole('switch', { name: 'Offline' });
    await userEvent.click(toggle);
    const toast = await findToast('You are offline', within(region()).getByRole('status'));
    await expect(toast).toHaveAttribute('data-offline-toast');
    await expect(within(toast).queryByRole('button')).toBeNull();
    await userEvent.click(toggle);
    await expect(within(region()).queryByText('You are offline')).toBeNull();
  },
};

export const TopPlacement: Story = {
  name: 'Top placement',
  args: { placement: 'top' },
  render: (args) => (
    <Toaster {...args}>
      <ShowButton label="Sync" options={{ message: 'Project synced', tone: 'success' }} />
    </Toaster>
  ),
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Sync' }));
    const toast = await findToast('Project synced');
    await expect(toast.getBoundingClientRect().top).toBe(16);
  },
};

function KeyboardDemo() {
  return <ShowButton label="Save" options={{ message: 'Changes saved', duration: null }} />;
}

export const Keyboard: Story = {
  name: 'Escape returns focus',
  tags: ['!dev', '!autodocs'],
  parameters: staticStory,
  render: (args) => (
    <Toaster {...args}>
      <KeyboardDemo />
    </Toaster>
  ),
  play: async ({ canvasElement }) => {
    const save = within(canvasElement).getByRole('button', { name: 'Save' });
    save.focus();
    await userEvent.keyboard('{Enter}');
    const toast = await findToast('Changes saved');
    // Toasts never take focus.
    await expect(save).toHaveFocus();
    await userEvent.tab();
    await expect(within(toast).getByRole('button', { name: 'Dismiss' })).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    await expect(toast).not.toBeInTheDocument();
    await expect(save).toHaveFocus();
  },
};

export const German: Story = {
  name: 'German toast',
  tags: ['!dev', '!autodocs'],
  parameters: { ...staticStory, language: 'de-CH' },
  render: (args) => (
    <Toaster {...args}>
      <ShowButton
        label="Speichern"
        options={{ message: 'Änderungen gespeichert', tone: 'success' }}
      />
    </Toaster>
  ),
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Speichern' }));
    const toast = await findToast('Änderungen gespeichert', region('Mitteilungen'));
    await expect(
      within(toast).getByRole('button', { name: 'Mitteilung schliessen' }),
    ).toBeVisible();
  },
};

const phoneParameters = {
  ...staticStory,
  viewport: { options: { phone: { name: 'Phone', styles: { width: '390px', height: '844px' } } } },
};

const exportDetails =
  'Request https://example.com/api/v2/projects/7f3a9c1e55b24c0e9a0d3c61f1e1b2aa/exports/floorplan.pdf returned 500';

export const Phone: Story = {
  name: 'On a phone',
  tags: ['!dev', '!autodocs'],
  globals: { viewport: { value: 'phone' } },
  parameters: phoneParameters,
  render: (args) => (
    <Toaster {...args}>
      <div className="story-grid">
        <ShowButton
          label="Save"
          options={{
            message: 'Saved',
            tone: 'success',
            action: { label: 'Open report', onClick: () => {} },
          }}
        />
        <ShowButton
          label="Export"
          options={{ message: 'The export failed', tone: 'error', details: exportDetails }}
        />
      </div>
    </Toaster>
  ),
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Save' }));
    const toast = await findToast('Saved');
    // The full width less 16 px gutters on each side.
    await expect(window.innerWidth).toBe(390);
    await expect(toast.getBoundingClientRect().width).toBe(390 - 32);
    await expect(toast.getBoundingClientRect().left).toBe(16);

    // A long URL in the details breaks inside the toast.
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Export' }));
    const error = await findToast('The export failed');
    await expect(error.scrollWidth).toBeLessThanOrEqual(error.clientWidth);
    await expect(error.getBoundingClientRect().right).toBeLessThanOrEqual(390 - 16);
  },
};

/** Whether the point in the middle of the element reaches it, or something covers it. */
function reachable(element: HTMLElement) {
  const box = element.getBoundingClientRect();
  const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
  return element.contains(hit);
}

function PrintDialog() {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [cancelled, setCancelled] = useState(0);
  return (
    <div className="story-stack">
      <Button variant="primary" onClick={() => setOpen(true)}>
        Print settings
      </Button>
      <output aria-label="Cancelled">{cancelled}</output>
      <Dialog open={open} title="Print" onClose={() => setOpen(false)}>
        <Button
          onClick={() =>
            toast.show({
              id: 'print',
              message: 'Preparing print',
              duration: null,
              action: { label: 'Cancel', onClick: () => setCancelled((count) => count + 1) },
            })
          }
        >
          Print
        </Button>
      </Dialog>
    </div>
  );
}

export const UnderModal: Story = {
  name: 'Under an open dialog',
  tags: ['!autodocs'],
  parameters: staticStory,
  render: (args) => (
    <Toaster {...args}>
      <PrintDialog />
    </Toaster>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Print settings' }));
    const dialog = await body().findByRole('dialog', { name: 'Print' });
    await waitFor(() => expect(dialog).toBeVisible());
    // The page behind the dialog is inert: the toast stays under the backdrop rather than
    // being raised above it, where it would look usable while presses go to the backdrop.
    const toggles: string[] = [];
    const record = (event: Event) => toggles.push((event as ToggleEvent).newState);
    region().addEventListener('beforetoggle', record);
    await userEvent.click(within(dialog).getByRole('button', { name: 'Print' }));
    const cancel = region().querySelector<HTMLElement>('[data-tone] button')!;
    await expect(cancel).toHaveTextContent('Cancel');
    await settled(toastOf(cancel));
    region().removeEventListener('beforetoggle', record);
    await expect(toggles).toEqual([]);
    await expect(reachable(cancel)).toBe(false);

    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(dialog).not.toHaveAttribute('open'));
    await expect(reachable(cancel)).toBe(true);
    await userEvent.click(cancel);
    await expect(canvas.getByLabelText('Cancelled')).toHaveTextContent('1');
  },
};

function ProjectBar() {
  const toast = useToast();
  return (
    <div style={{ height: 320, paddingTop: 8 }}>
      <Menu label="Project" align="start">
        <MenuItem keepOpen onSelect={() => toast.show({ message: 'Saved', tone: 'success' })}>
          Save
        </MenuItem>
        <MenuItem>Rename</MenuItem>
        <MenuItem>Duplicate</MenuItem>
        <MenuItem>Delete</MenuItem>
      </Menu>
    </div>
  );
}

export const UnderOpenMenu: Story = {
  name: 'Under an open menu',
  tags: ['!autodocs'],
  globals: { viewport: { value: 'phone' } },
  parameters: { ...phoneParameters, canvasLayout: 'fullscreen' },
  args: { placement: 'top' },
  render: (args) => (
    <div style={{ '--toast-offset-top': '56px' } as CSSProperties}>
      <Toaster {...args}>
        <ProjectBar />
      </Toaster>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Project' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Save' }));
    const toast = await findToast('Saved');
    // The toast lies over the open menu's items, but the menu the user works in stays on top.
    const panel = canvas.getByRole('group', { name: 'Project' });
    const items = panel.getBoundingClientRect();
    const box = toast.getBoundingClientRect();
    const overlap = {
      left: Math.max(box.left, items.left),
      right: Math.min(box.right, items.right),
      top: Math.max(box.top, items.top),
      bottom: Math.min(box.bottom, items.bottom),
    };
    await expect(overlap.right - overlap.left).toBeGreaterThan(20);
    await expect(overlap.bottom - overlap.top).toBeGreaterThan(20);
    const hit = document.elementFromPoint(
      (overlap.left + overlap.right) / 2,
      (overlap.top + overlap.bottom) / 2,
    );
    await expect(panel.contains(hit)).toBe(true);
    await userEvent.click(canvas.getByRole('button', { name: 'Rename' }));
    await expect(canvas.getByRole('button', { name: 'Project' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  },
};

function BusyPage() {
  const toast = useToast();
  return (
    <div className="story-stack">
      <Button
        onClick={() =>
          toast.show({
            message: 'Circuit F1.2 deleted',
            action: { label: 'Undo', onClick: () => {} },
          })
        }
      >
        Delete F1.2
      </Button>
      <div className="story-grid">
        {['Plan', 'Circuits', 'Rooms', 'Print', 'Share', 'Settings'].map((name) => (
          <Button key={name}>{name}</Button>
        ))}
      </div>
    </div>
  );
}

export const Hotkey: Story = {
  name: 'F8 reaches the newest toast',
  tags: ['!dev', '!autodocs'],
  parameters: staticStory,
  render: (args) => (
    <Toaster {...args}>
      <BusyPage />
    </Toaster>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const remove = canvas.getByRole('button', { name: 'Delete F1.2' });
    remove.focus();
    await userEvent.keyboard('{Enter}');
    const toast = await findToast('Circuit F1.2 deleted');
    await expect(region()).toHaveAttribute('aria-keyshortcuts', 'F8');
    // Many controls lie between the page and the toasts in the tab order; F8 skips them.
    await userEvent.keyboard('{F8}');
    await expect(toast).toHaveFocus();
    await expect(region()).toHaveAttribute('data-paused');
    await userEvent.tab();
    await expect(within(toast).getByRole('button', { name: 'Undo' })).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    await expect(toast).not.toBeInTheDocument();
    await expect(remove).toHaveFocus();
  },
};

function AllTones() {
  return (
    <>
      <p className="story-note">Every tone at once.</p>
      {(['neutral', 'success', 'warning', 'error'] as const).map((tone) => (
        <Toast
          key={tone}
          tone={tone}
          message={toneMessages[tone]}
          duration={null}
          details={tone === 'error' ? technicalDetails : undefined}
          action={tone === 'neutral' ? { label: 'Undo', onClick: () => {} } : undefined}
        />
      ))}
    </>
  );
}

export const DarkMode: Story = {
  name: 'A11y / Dark mode',
  ...darkA11y,
  args: { max: 4 },
  render: (args) => (
    <Toaster {...args}>
      <AllTones />
    </Toaster>
  ),
  play: async () => {
    const message = await within(region()).findByText(toneMessages.error);
    await expect(region().querySelectorAll('[data-tone]')).toHaveLength(4);
    await Promise.all(Array.from(region().querySelectorAll<HTMLElement>('[data-tone]'), settled));
    await expect(message).toBeVisible();
  },
};

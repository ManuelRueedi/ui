import type { Meta, StoryObj } from '@storybook/react-vite';
import { Save, Settings, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { darkA11y, staticStory, wait } from '../../stories/storyHelpers';
import { Button, type ButtonAsyncState } from './Button';

const meta = {
  title: 'Components/Button',
  component: Button,
  args: {
    variant: 'primary',
    size: 'md',
    state: 'idle',
    disabled: false,
    loadingLabel: 'Deploying',
    successLabel: 'Deployed',
    errorLabel: 'Failed',
  },
  argTypes: {
    variant: { control: 'radio', options: ['primary', 'secondary', 'ghost', 'danger'] },
    size: { control: 'radio', options: ['sm', 'md', 'lg'] },
    state: { control: 'radio', options: ['idle', 'loading', 'success', 'error'] },
    children: { table: { disable: true } },
    className: { table: { disable: true } },
    onClick: { table: { disable: true } },
    type: { table: { disable: true } },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <div className="story-grid">
      <Button {...args}>
        <Save size={15} strokeWidth={1.75} />
        Deploy
      </Button>
    </div>
  ),
};

export const Link: Story = {
  parameters: staticStory,
  render: () => (
    <div className="story-grid">
      <Button
        variant="primary"
        size="lg"
        href="/projects/new"
        onClick={(event) => event.preventDefault()}
      >
        New project
      </Button>
      <Button href="/projects">All projects</Button>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const link = within(canvasElement).getByRole('link', { name: 'New project' });
    await expect(link).toHaveAttribute('href', '/projects/new');
    await expect(link.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
  },
};

function VariantList() {
  return (
    <div className="story-grid">
      <Button variant="primary">
        <Save size={15} strokeWidth={1.75} />
        Deploy
      </Button>
      <Button>
        <Settings size={15} strokeWidth={1.75} />
        Settings
      </Button>
      <Button variant="ghost">Cancel</Button>
      <Button variant="danger">
        <Trash2 size={15} strokeWidth={1.75} />
        Delete
      </Button>
    </div>
  );
}

function StateList() {
  return (
    <div className="story-grid">
      <Button variant="primary" state="loading" loadingLabel="Deploying">
        Deploy
      </Button>
      <Button variant="primary" state="success" successLabel="Deployed">
        Deploy
      </Button>
      <Button variant="primary" state="error" errorLabel="Failed">
        Deploy
      </Button>
      <Button state="loading" loadingLabel="Saving">
        Save
      </Button>
      <Button state="success" successLabel="Saved">
        Save
      </Button>
      <Button state="error" errorLabel="Couldn't save">
        Save
      </Button>
    </div>
  );
}

export const Variants: Story = {
  parameters: staticStory,
  render: () => (
    <div className="story-stack">
      <div className="story-section">
        <p className="story-label">Variants</p>
        <VariantList />
        <div className="story-grid">
          <Button disabled>Disabled</Button>
        </div>
      </div>
      <div className="story-section">
        <p className="story-label">Interaction states</p>
        <div className="state-grid">
          <div className="state-cell">
            <Button variant="primary">Rest</Button>
            <span>default</span>
          </div>
          <div className="state-cell">
            <Button variant="primary" className="force-hover">
              Hover
            </Button>
            <span>:hover</span>
          </div>
          <div className="state-cell">
            <Button variant="primary" className="force-active">
              Active
            </Button>
            <span>:active</span>
          </div>
          <div className="state-cell">
            <Button className="force-focus">Focus</Button>
            <span>:focus-visible</span>
          </div>
        </div>
      </div>
      <div className="story-section">
        <p className="story-label">Sizes</p>
        <div className="story-grid">
          <Button variant="primary" size="sm">
            Small
          </Button>
          <Button variant="primary">Default</Button>
          <Button variant="primary" size="lg">
            Large
          </Button>
        </div>
      </div>
    </div>
  ),
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    await step('Buttons expose expected states', async () => {
      await expect(canvas.getByRole('button', { name: 'Deploy' })).toBeEnabled();
      await expect(canvas.getByRole('button', { name: 'Settings' })).toBeEnabled();
      await expect(canvas.getByRole('button', { name: 'Cancel' })).toBeEnabled();
      await expect(canvas.getByRole('button', { name: 'Delete' })).toBeEnabled();
      await expect(canvas.getByRole('button', { name: 'Disabled' })).toBeDisabled();
    });
    await step('Keyboard focus reaches actionable buttons', async () => {
      await userEvent.tab();
      await expect(canvas.getByRole('button', { name: 'Deploy' })).toHaveFocus();
    });
  },
};

function ActionCycle() {
  const [deployState, setDeployState] = useState<ButtonAsyncState>('idle');
  const [failState, setFailState] = useState<ButtonAsyncState>('idle');

  async function run(set: (state: ButtonAsyncState) => void, outcome: 'success' | 'error') {
    set('loading');
    await wait(850);
    set(outcome);
    await wait(1100);
    set('idle');
  }

  return (
    <div className="story-section">
      <p className="story-label">Action cycle</p>
      <div className="story-grid">
        <Button
          variant="primary"
          state={deployState}
          loadingLabel="Deploying"
          successLabel="Deployed"
          onClick={() => run(setDeployState, 'success')}
        >
          <Save size={15} strokeWidth={1.75} />
          Deploy
        </Button>
        <Button
          variant="danger"
          state={failState}
          loadingLabel="Deleting"
          errorLabel="Couldn't delete"
          onClick={() => run(setFailState, 'error')}
        >
          <Trash2 size={15} strokeWidth={1.75} />
          Delete
        </Button>
      </div>
    </div>
  );
}

export const Async: Story = {
  parameters: staticStory,
  render: () => (
    <div className="story-stack">
      <div className="story-section">
        <p className="story-label">States</p>
        <StateList />
      </div>
      <ActionCycle />
      <p className="story-note">Click a button to run the loading → result → idle cycle.</p>
    </div>
  ),
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const actionCycle = within(canvas.getByText('Action cycle').parentElement as HTMLElement);
    await step('Deploy button cycles through loading and success', async () => {
      await userEvent.click(actionCycle.getByRole('button', { name: 'Deploy' }));
      await expect(actionCycle.getByRole('button', { name: 'Deploying' })).toBeDisabled();
      await waitFor(
        () => expect(actionCycle.getByRole('button', { name: 'Deployed' })).toBeVisible(),
        { timeout: 1600 },
      );
      await waitFor(
        () => expect(actionCycle.getByRole('button', { name: 'Deploy' })).toBeEnabled(),
        { timeout: 1800 },
      );
    });
    await step('Delete button cycles through loading and error', async () => {
      await userEvent.click(actionCycle.getByRole('button', { name: 'Delete' }));
      await expect(actionCycle.getByRole('button', { name: 'Deleting' })).toBeDisabled();
      await waitFor(
        () => expect(actionCycle.getByRole('button', { name: "Couldn't delete" })).toBeVisible(),
        { timeout: 1600 },
      );
    });
  },
};

export const DarkMode: Story = {
  name: 'A11y / Dark mode',
  ...darkA11y,
  render: () => (
    <div className="story-stack">
      <VariantList />
      <StateList />
    </div>
  ),
};

export const GermanStates: Story = {
  name: 'German states',
  tags: ['!dev', '!autodocs'],
  parameters: { ...staticStory, language: 'de-CH' },
  render: () => (
    <div className="story-grid">
      <Button state="loading">Speichern</Button>
      <Button state="success">Speichern</Button>
      <Button state="error">Speichern</Button>
      <Button disabled>Speichern</Button>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: 'Wird bearbeitet' })).toBeDisabled();
    await expect(canvas.getByRole('button', { name: 'Erledigt' })).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Fehlgeschlagen' })).toBeVisible();
  },
};

export const SpotlightDefaults: Story = {
  name: 'Spotlight defaults',
  tags: ['!dev', '!autodocs'],
  parameters: staticStory,
  render: () => (
    <div className="story-grid">
      <Button>Default spotlight</Button>
      <Button href="#spotlight" onClick={(event) => event.preventDefault()}>
        Link spotlight
      </Button>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const user = userEvent.setup();
    for (const surface of [
      canvas.getByRole('button', { name: 'Default spotlight' }),
      canvas.getByRole('link', { name: 'Link spotlight' }),
    ]) {
      await expect(surface).toHaveAttribute('data-spotlight-focus');
      await user.tab();
      await expect(surface).toHaveFocus();
      await expect(surface.matches(':focus-visible')).toBe(true);
      await user.keyboard('{Enter>}');
      await expect(surface).toHaveAttribute('data-spotlight-pulsing');
      await user.keyboard('{/Enter}');
      await waitFor(() => expect(surface).not.toHaveAttribute('data-spotlight-pulsing'));
      await user.pointer({ target: surface, keys: '[MouseLeft>]' });
      await expect(surface).toHaveAttribute('data-spotlight-pulsing');
      await user.pointer({ target: surface, keys: '[/MouseLeft]' });
      await waitFor(() => expect(surface).not.toHaveAttribute('data-spotlight-pulsing'));
    }
  },
};

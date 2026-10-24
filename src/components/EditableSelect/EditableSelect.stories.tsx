import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, fireEvent, userEvent, waitFor, within } from 'storybook/test';
import { darkA11y, staticStory, wait } from '../../stories/storyHelpers';
import { Input } from '../Input/Input';
import { EditableSelect, type EditableSelectMode } from './EditableSelect';

type Client = { value: string; label: string };

const initialClients: Client[] = [
  { value: 'mueller', label: 'Müller Elektro AG' },
  { value: 'keller', label: 'Keller Haustechnik GmbH' },
  { value: 'baumann', label: 'Baumann & Söhne' },
];

/** A working example: pick a client, or create or rename one in place. */
function ClientPicker({ initialMode = 'select' }: { initialMode?: EditableSelectMode }) {
  const [clients, setClients] = useState(initialClients);
  const [value, setValue] = useState('mueller');
  const [mode, setMode] = useState<EditableSelectMode>(initialMode);
  const [name, setName] = useState('');
  const current = clients.find((client) => client.value === value);
  const original = mode === 'edit' ? (current?.label ?? '') : '';

  function openForm(next: EditableSelectMode) {
    setName(next === 'edit' ? (current?.label ?? '') : '');
  }

  return (
    <div className="story-form" style={{ minHeight: 300 }}>
      <EditableSelect
        label="Client"
        options={clients}
        value={value}
        onValueChange={setValue}
        mode={mode}
        onModeChange={(next) => {
          openForm(next);
          setMode(next);
        }}
        addLabel="Add client"
        editLabel="Edit client"
        createFormLabel="New client"
        editFormLabel="Edit client"
        hasChanges={name.trim() !== original}
        saveDisabled={!name.trim()}
        onSave={() => {
          const label = name.trim();
          if (mode === 'edit') {
            setClients((list) =>
              list.map((client) => (client.value === value ? { ...client, label } : client)),
            );
          } else {
            const created = { value: `client-${clients.length + 1}`, label };
            setClients((list) => [...list, created]);
            setValue(created.value);
          }
        }}
        form={() => (
          <Input
            aria-label="Client name"
            placeholder="Company name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        )}
      />
    </div>
  );
}

const meta = {
  title: 'Components/EditableSelect',
  component: EditableSelect,
  args: { label: 'Client', options: initialClients, defaultValue: 'mueller' },
  render: (args) => (
    <div className="story-form" style={{ minHeight: 300 }}>
      <EditableSelect {...args} />
    </div>
  ),
} satisfies Meta<typeof EditableSelect>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <ClientPicker />,
  parameters: staticStory,
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    await step('Add opens an empty form; Create saves the new entry', async () => {
      await userEvent.click(canvas.getByRole('button', { name: 'Add client' }));
      const name = await canvas.findByRole('textbox', { name: 'Client name' });
      // Without changes only Back shows; typing swaps it for Discard and Create.
      await expect(canvas.queryByRole('button', { name: 'Create' })).toBeNull();
      await userEvent.type(name, 'Frei Elektro');
      await expect(canvas.getByRole('button', { name: 'Discard' })).toBeVisible();
      await userEvent.click(canvas.getByRole('button', { name: 'Create' }));
      await waitFor(() =>
        expect(canvas.getByRole('combobox', { name: 'Client' })).toHaveValue('Frei Elektro'),
      );
    });
    await step('Edit opens the form with the current name', async () => {
      await userEvent.click(canvas.getByRole('button', { name: 'Edit client' }));
      await expect(await canvas.findByRole('textbox', { name: 'Client name' })).toHaveValue(
        'Frei Elektro',
      );
      await userEvent.click(canvas.getByRole('button', { name: 'Back' }));
      await expect(await canvas.findByRole('combobox', { name: 'Client' })).toBeVisible();
    });
  },
};

export const HoldToDiscard: Story = {
  name: 'Hold to discard',
  render: () => <ClientPicker initialMode="create" />,
  parameters: staticStory,
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByRole('textbox', { name: 'Client name' }), 'Draft');
    const discard = canvas.getByRole('button', { name: 'Discard' });
    await step('A short press keeps the changes', async () => {
      fireEvent.pointerDown(discard, { button: 0, isPrimary: true });
      await wait(100);
      fireEvent.pointerUp(discard);
      await wait(600);
      await expect(canvas.getByRole('textbox', { name: 'Client name' })).toHaveValue('Draft');
    });
    await step('Holding for half a second discards them', async () => {
      fireEvent.pointerDown(discard, { button: 0, isPrimary: true });
      await waitFor(() => expect(canvas.getByRole('combobox', { name: 'Client' })).toBeVisible(), {
        timeout: 1500,
      });
    });
  },
};

export const EditForm: Story = {
  name: 'Edit form',
  args: {
    defaultMode: 'edit',
    form: () => <Input aria-label="Client name" defaultValue="Müller Elektro AG" />,
  },
  parameters: staticStory,
};

function States() {
  return (
    <div className="story-form" style={{ minHeight: 300 }}>
      <EditableSelect label="Empty" options={initialClients} placeholder="Choose a client" />
      <EditableSelect
        label="With error"
        options={initialClients}
        error="Choose a client."
        required
      />
      <EditableSelect label="Read only" options={initialClients} defaultValue="keller" readOnly />
      <EditableSelect label="Disabled" options={initialClients} defaultValue="keller" disabled />
    </div>
  );
}

export const AllStates: Story = {
  name: 'States',
  render: () => <States />,
  parameters: staticStory,
};

export const German: Story = {
  args: { label: 'Auftraggeber', defaultMode: 'create', form: () => <Input aria-label="Name" /> },
  parameters: { ...staticStory, language: 'de-CH' },
};

export const Dark: Story = { ...darkA11y, render: () => <ClientPicker /> };
export const DarkStates: Story = { ...darkA11y, render: () => <States /> };

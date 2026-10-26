import type { Meta, StoryObj } from '@storybook/react-vite';
import { Search } from 'lucide-react';
import { expect, userEvent, within } from 'storybook/test';
import { darkA11y, staticStory } from '../../stories/storyHelpers';
import { Input } from './Input';

const meta = {
  title: 'Components/Input',
  component: Input,
  args: {
    label: 'Project name',
    placeholder: 'Limmatstrasse 18',
    size: 'md',
    variant: 'default',
    disabled: false,
    readOnly: false,
    required: false,
  },
  argTypes: {
    size: { control: 'radio', options: ['sm', 'md', 'lg'] },
    variant: { control: 'radio', options: ['default', 'plain'] },
  },
  render: (args) => (
    <div className="story-form">
      <Input {...args} />
    </div>
  ),
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getByLabelText('Project name');
    await userEvent.type(input, 'Seestrasse 4');
    await expect(input).toHaveValue('Seestrasse 4');
  },
};

function Types() {
  return (
    <div className="story-form">
      <Input label="Search" type="search" prefix={<Search size={14} />} placeholder="Search" />
      <Input label="Email" type="email" placeholder="name@firma.ch" />
      <Input label="Date" type="date" defaultValue="2026-05-18" />
      <Input label="Amount" type="number" suffix="CHF" defaultValue="120" />
    </div>
  );
}

function States() {
  return (
    <div className="story-form">
      <Input label="With help" description="Shown on the report." defaultValue="Hauptverteilung" />
      <Input label="With error" error="Enter a name." required />
      <Input label="Read only" readOnly defaultValue="ELMU-2026-000042" />
      <Input label="Disabled" disabled defaultValue="Locked" />
      <Input label="Plain (table cell)" variant="plain" defaultValue="0.42" />
    </div>
  );
}

export const AllTypes: Story = { name: 'Types', parameters: staticStory, render: () => <Types /> };

export const AllStates: Story = {
  name: 'States',
  parameters: staticStory,
  render: () => <States />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const invalid = canvas.getByLabelText(/With error/);
    await expect(invalid).toHaveAttribute('aria-invalid', 'true');
    await expect(invalid).toHaveAccessibleDescription('Enter a name.');
    await expect(canvas.getByLabelText('Disabled')).toBeDisabled();
  },
};

export const MeasurementControls: Story = {
  name: 'Measurement controls',
  parameters: staticStory,
  render: () => (
    <div className="story-form">
      <Input label="Isolationswiderstand" size="lg" suffix="MΩ" inputMode="decimal" />
      <Input label="Schleifenimpedanz" size="lg" suffix="Ω" inputMode="decimal" />
    </div>
  ),
};

export const Sizes: Story = {
  name: 'Sizes',
  parameters: staticStory,
  render: () => (
    <div className="story-form">
      <Input label="Small" size="sm" suffix="m" defaultValue="2.45" />
      <Input label="Medium" defaultValue="2.45" suffix="m" />
      <Input label="Large" size="lg" defaultValue="2.45" suffix="m" />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const small = within(canvasElement).getByLabelText('Small');
    await userEvent.clear(small);
    await userEvent.type(small, '3.1');
    await expect(small).toHaveValue('3.1');
  },
};

function SearchFields() {
  return (
    <div className="story-form" style={{ width: 320 }}>
      <Input label="Search rooms" type="search" placeholder="Search" />
      <Input
        label="Search circuits"
        type="search"
        prefix={<Search size={14} />}
        defaultValue="Kitchen"
      />
      <Input label="Small search" type="search" size="sm" defaultValue="F1" />
      <Input label="Large search" type="search" size="lg" defaultValue="Kitchen" />
      <Input label="Disabled search" type="search" disabled defaultValue="Kitchen" />
      <Input label="Read-only search" type="search" readOnly defaultValue="Kitchen" />
    </div>
  );
}

/**
 * The rules for the browser's clear button. getComputedStyle cannot read that pseudo-element, but
 * the browser drops rules whose selector it does not understand, so the rules found here apply.
 */
function clearButtonRules() {
  return Array.from(document.styleSheets).flatMap((sheet) => {
    try {
      return Array.from(sheet.cssRules).filter(
        (rule): rule is CSSStyleRule =>
          rule instanceof CSSStyleRule &&
          rule.selectorText.includes('Input-input') &&
          rule.selectorText.includes('::-webkit-search-cancel-button'),
      );
    } catch {
      return [];
    }
  });
}

export const SearchField: Story = {
  name: 'Search',
  parameters: staticStory,
  render: () => <SearchFields />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole('searchbox', { name: 'Search rooms' });
    await expect(input).toHaveAttribute('type', 'search');
    await userEvent.type(input, 'Bath');
    await expect(input).toHaveValue('Bath');
    // A gray cross drawn by ui, not the blue one of the browser; none on locked fields.
    const rules = clearButtonRules();
    const cross = rules.find((rule) => rule.style.getPropertyValue('appearance') === 'none');
    await expect(cross?.style.getPropertyValue('background-color')).toBe('var(--fg-3)');
    await expect(cross?.style.getPropertyValue('mask')).toContain('var(--input-clear-icon)');
    await expect(rules.some((rule) => rule.selectorText.includes(':hover'))).toBe(true);
    const locked = rules.find((rule) => rule.style.getPropertyValue('display') === 'none');
    await expect(locked?.selectorText).toContain(':disabled');
    await expect(locked?.selectorText).toContain('[readonly]');
  },
};

export const SearchDark: Story = {
  name: 'A11y / Search dark',
  ...darkA11y,
  render: () => <SearchFields />,
};

export const DarkMode: Story = {
  name: 'A11y / Dark mode',
  ...darkA11y,
  render: () => (
    <div className="story-grid" style={{ alignItems: 'start' }}>
      <Types />
      <States />
    </div>
  ),
};

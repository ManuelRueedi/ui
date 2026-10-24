import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { darkA11y, staticStory } from '../../stories/storyHelpers';
import { SegmentControl } from './SegmentControl';

const targets = [
  { value: 'local', label: 'Local' },
  { value: 'test', label: 'Test copy' },
  { value: 'live', label: 'Live' },
];

const pageTabs = [
  { value: 'overview', label: 'Overview' },
  { value: 'measurements', label: 'Measurements' },
  { value: 'defects', label: 'Defects' },
  { value: 'report', label: 'Report' },
];

const meta = {
  title: 'Components/SegmentControl',
  component: SegmentControl,
  args: {
    options: targets,
    defaultValue: 'test',
    label: 'Deployment target',
    size: 'md',
    variant: 'segmented',
    disabled: false,
  },
  argTypes: {
    size: { control: 'radio', options: ['sm', 'md'] },
    variant: { control: 'radio', options: ['segmented', 'tabs', 'segmented-tabs'] },
  },
} satisfies Meta<typeof SegmentControl>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('radio', { name: 'Live' }));
    await expect(canvas.getByRole('radio', { name: 'Live' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await userEvent.keyboard('{ArrowLeft}');
    await expect(canvas.getByRole('radio', { name: 'Test copy' })).toHaveFocus();
    await expect(canvas.getByRole('radio', { name: 'Test copy' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await userEvent.keyboard('{End}');
    await expect(canvas.getByRole('radio', { name: 'Live' })).toHaveFocus();
  },
};

function Gallery() {
  const [tab, setTab] = useState('overview');
  return (
    <div className="story-stack" style={{ width: 460 }}>
      <SegmentControl options={targets} defaultValue="local" label="Small target" size="sm" />
      <SegmentControl
        options={[...targets.slice(0, 2), { value: 'live', label: 'Live', disabled: true }]}
        defaultValue="local"
        label="Staged target"
      />
      <SegmentControl options={targets} defaultValue="test" label="Locked target" disabled />
      <SegmentControl
        options={pageTabs}
        value={tab}
        onValueChange={setTab}
        label="Sections"
        variant="tabs"
      />
      <SegmentControl
        options={pageTabs}
        defaultValue="overview"
        label="Segmented sections"
        variant="segmented-tabs"
      />
    </div>
  );
}

export const VariantsAndStates: Story = {
  name: 'Variants and states',
  parameters: staticStory,
  render: () => <Gallery />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const sections = within(canvas.getByRole('tablist', { name: 'Sections' }));
    await userEvent.click(sections.getByRole('tab', { name: 'Defects' }));
    await expect(sections.getByRole('tab', { name: 'Defects' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    const staged = within(canvas.getByRole('radiogroup', { name: 'Staged target' }));
    await expect(staged.getByRole('radio', { name: 'Live' })).toBeDisabled();
  },
};

export const Overflow: Story = {
  tags: ['!dev', '!autodocs'],
  parameters: staticStory,
  render: () => (
    <div style={{ width: 220 }}>
      <SegmentControl options={pageTabs} defaultValue="report" label="Narrow sections" />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const group = within(canvasElement).getByRole('radiogroup');
    await expect(group.scrollWidth).toBeGreaterThan(group.clientWidth);
  },
};

export const SegmentedTabs: Story = {
  name: 'Segmented tabs',
  args: {
    options: pageTabs.map((option) => ({ ...option, disabled: option.value === 'defects' })),
    defaultValue: 'overview',
    label: 'Project sections',
    variant: 'segmented-tabs',
  },
  play: async ({ canvasElement }) => {
    const group = within(canvasElement).getByRole('tablist', { name: 'Project sections' });
    const tabs = within(group);
    await userEvent.click(tabs.getByRole('tab', { name: 'Measurements' }));
    await expect(tabs.getByRole('tab', { name: 'Measurements' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(tabs.getByRole('tab', { name: 'Measurements' })).not.toHaveAttribute(
      'aria-checked',
    );
    await expect(tabs.getByRole('tab', { name: 'Defects' })).toBeDisabled();
    await userEvent.keyboard('{ArrowRight}');
    await expect(tabs.getByRole('tab', { name: 'Report' })).toHaveFocus();
    await expect(tabs.getByRole('tab', { name: 'Report' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await userEvent.keyboard('{Home}');
    await expect(tabs.getByRole('tab', { name: 'Overview' })).toHaveFocus();
    await expect(getComputedStyle(group).getPropertyValue('--section-gap')).toBe('40px');
  },
};

const phoneParameters = {
  ...staticStory,
  viewport: {
    options: {
      phone: { name: 'Phone', styles: { width: '390px', height: '844px' } },
    },
  },
};

const phoneTabs = [
  { value: 'overview', label: 'Objekt' },
  { value: 'visual', label: 'Sichtprüfung' },
  { value: 'function', label: 'Funktionsprüfung' },
  { value: 'measurements', label: 'Messungen' },
  { value: 'defects', label: 'Mängel' },
  { value: 'report', label: 'Abschluss' },
];

export const PhoneTabs: Story = {
  name: 'Phone tabs',
  globals: { viewport: { value: 'phone' }, language: 'de-CH' },
  parameters: phoneParameters,
  beforeEach: async () => {
    await document.fonts.load('14px "Google Sans Flex"');
  },
  render: () => (
    <div style={{ width: 280, maxWidth: '100%' }}>
      <SegmentControl
        options={phoneTabs}
        defaultValue="function"
        label="Projektbereiche"
        variant="segmented-tabs"
        centerSelected
      />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const group = within(canvasElement).getByRole('tablist');
    const tabs = within(group);
    const selected = tabs.getByRole('tab', { name: 'Funktionsprüfung' });
    const phoneStyle = getComputedStyle(selected);
    await expect(window.innerWidth).toBe(390);
    await expect(phoneStyle.fontSize).toBe('14px');
    await expect(phoneStyle.paddingInlineStart).toBe('16px');
    await expect(phoneStyle.paddingInlineEnd).toBe('16px');
    await expect(getComputedStyle(group).getPropertyValue('--section-gap')).toBe('32px');
    await expect(getComputedStyle(group).maskImage).not.toBe('none');
    await waitFor(() => {
      const row = group.getBoundingClientRect();
      const item = selected.getBoundingClientRect();
      expect(Math.abs(item.left + item.width / 2 - (row.left + row.width / 2))).toBeLessThan(2);
      expect(getComputedStyle(group).getPropertyValue('--fade-left')).toBe('32px');
      expect(getComputedStyle(group).getPropertyValue('--fade-right')).toBe('32px');
    });
    await userEvent.click(selected);
    await userEvent.keyboard('{Home}');
    await waitFor(() => {
      expect(group.scrollLeft).toBe(0);
      expect(getComputedStyle(group).getPropertyValue('--fade-left')).toBe('0px');
      expect(getComputedStyle(group).getPropertyValue('--fade-right')).toBe('32px');
    });
    await userEvent.keyboard('{End}');
    await expect(tabs.getByRole('tab', { name: 'Abschluss' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await waitFor(() => {
      expect(group.scrollLeft + group.clientWidth).toBeGreaterThanOrEqual(group.scrollWidth - 1);
      expect(getComputedStyle(group).getPropertyValue('--fade-left')).toBe('32px');
      expect(getComputedStyle(group).getPropertyValue('--fade-right')).toBe('0px');
    });
  },
};

export const PhoneTabsDark: Story = {
  ...PhoneTabs,
  ...darkA11y,
  name: 'A11y / Phone tabs dark',
  globals: { ...PhoneTabs.globals, theme: 'dark' },
  parameters: phoneParameters,
};

export const DarkMode: Story = { name: 'A11y / Dark mode', ...darkA11y, render: () => <Gallery /> };

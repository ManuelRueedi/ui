import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';
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
    variant: { control: 'radio', options: ['segmented', 'tabs'] },
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
    </div>
  );
}

export const VariantsAndStates: Story = {
  name: 'Variants and states',
  parameters: staticStory,
  render: () => <Gallery />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('tab', { name: 'Defects' }));
    await expect(canvas.getByRole('tab', { name: 'Defects' })).toHaveAttribute(
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

export const DarkMode: Story = { name: 'A11y / Dark mode', ...darkA11y, render: () => <Gallery /> };

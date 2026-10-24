import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { darkA11y, staticStory } from '../../stories/storyHelpers';
import { Button } from '../Button/Button';
import { Card } from '../Card/Card';
import { Input } from '../Input/Input';
import { SegmentControl } from '../SegmentControl/SegmentControl';
import { PageLoading } from './PageLoading';

const meta = {
  title: 'Components/PageLoading',
  component: PageLoading,
  parameters: { canvasLayout: 'fullscreen' },
  args: { loading: true, label: 'Loading page', children: null },
  argTypes: { children: { table: { disable: true } } },
  render: (args) => (
    <PageLoading {...args}>
      <SamplePage />
    </PageLoading>
  ),
} satisfies Meta<typeof PageLoading>;

export default meta;
type Story = StoryObj<typeof meta>;

function SamplePage() {
  return (
    <div style={{ display: 'grid', gap: 16, padding: 24, width: 'min(720px, 100%)' }}>
      <h1>Limmatstrasse 18</h1>
      <SegmentControl
        label="Sections"
        variant="tabs"
        defaultValue="overview"
        options={[
          { value: 'overview', label: 'Overview' },
          { value: 'measurements', label: 'Measurements' },
          { value: 'report', label: 'Report' },
        ]}
      />
      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: '1fr 1fr' }}>
        <Card>
          <h2>Installation</h2>
          <p>Hauptverteilung, 3 × 400 V</p>
        </Card>
        <Card>
          <h2>Status</h2>
          <p>12 of 18 circuits measured</p>
        </Card>
      </div>
      <Input label="Note" defaultValue="FI tested" />
    </div>
  );
}

export const Default: Story = { args: { loading: false } };
export const Loading: Story = {};

function LoadingToLoaded() {
  const [loading, setLoading] = useState(false);
  return (
    <div>
      <div style={{ padding: 16 }}>
        <Button
          onClick={() => {
            setLoading(true);
            setTimeout(() => setLoading(false), 1200);
          }}
        >
          Reload
        </Button>
      </div>
      <PageLoading loading={loading}>
        <SamplePage />
      </PageLoading>
    </div>
  );
}

export const LoadingToLoadedStory: Story = {
  name: 'Loading to loaded',
  parameters: staticStory,
  render: () => <LoadingToLoaded />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Reload' }));
    const surface = canvasElement.querySelector('div[aria-busy][data-state]') as HTMLElement;
    await waitFor(() => expect(surface).toHaveAttribute('data-state', 'loading'));
    await waitFor(() => expect(surface).toHaveAttribute('data-state', 'ready'), { timeout: 3000 });
  },
};

export const RetainContent: Story = {
  name: 'Cached content refresh',
  tags: ['!dev', '!autodocs'],
  args: { retainContent: true },
  play: async ({ canvasElement }) => {
    const surface = canvasElement.querySelector('div[aria-busy][data-state]') as HTMLElement;
    await expect(surface).toHaveAttribute('data-state', 'ready');
    await expect(within(canvasElement).getByLabelText('Note')).toBeEnabled();
  },
};

export const LongWait: Story = {
  name: 'Long wait message',
  tags: ['!dev', '!autodocs'],
  play: async ({ canvasElement }) => {
    await waitFor(
      () => expect(within(canvasElement).getByRole('status')).toHaveTextContent('Loading page'),
      { timeout: 3000 },
    );
  },
};

export const DarkMode: Story = {
  name: 'A11y / Dark loading',
  ...darkA11y,
  parameters: { canvasLayout: 'fullscreen' },
};

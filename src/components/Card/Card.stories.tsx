import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';
import { darkA11y, staticStory } from '../../stories/storyHelpers';
import { Card } from './Card';

const meta = {
  title: 'Components/Card',
  component: Card,
  args: { variant: 'default', interactive: false },
  argTypes: {
    variant: { control: 'radio', options: ['default', 'muted', 'inverse'] },
    interactive: { control: 'boolean' },
    children: { table: { disable: true } },
  },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <div style={{ width: 320 }}>
      <Card {...args}>
        <h3>Limmatstrasse 18</h3>
        <p>Erstprüfung, due May 18</p>
      </Card>
    </div>
  ),
};

function VariantGallery() {
  const [activations, setActivations] = useState(0);
  const [linkActivations, setLinkActivations] = useState(0);
  return (
    <div className="story-grid" style={{ alignItems: 'stretch', width: 680 }}>
      <Card>
        <h3>Default</h3>
        <p>Static surface</p>
      </Card>
      <Card variant="muted">
        <h3>Muted</h3>
        <p>Quiet surface</p>
      </Card>
      <Card variant="inverse">
        <h3 style={{ color: 'inherit' }}>Inverse</h3>
        <p style={{ color: 'inherit' }}>Strong surface</p>
      </Card>
      <Card interactive onClick={() => setActivations((count) => count + 1)}>
        <h3>Clickable</h3>
        <p>Activations: {activations}</p>
      </Card>
      <Card
        interactive
        href="#linked"
        onClick={(event) => {
          event.preventDefault();
          setLinkActivations((count) => count + 1);
        }}
      >
        <h3>Linked</h3>
        <p>Link activations: {linkActivations}</p>
      </Card>
    </div>
  );
}

export const Variants: Story = {
  parameters: staticStory,
  render: () => <VariantGallery />,
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const clickable = canvas.getByRole('button', { name: /Clickable/ });
    const linked = canvas.getByRole('link', { name: /Linked/ });
    await step('Interactive cards get the spotlight', async () => {
      await expect(clickable).toHaveAttribute('data-spotlight-surface');
      await expect(linked).toHaveAttribute('data-spotlight-surface');
    });
    await step('Activates the clickable card with pointer and keyboard', async () => {
      await userEvent.click(clickable);
      await expect(canvas.getByText('Activations: 1')).toBeVisible();
      clickable.focus();
      await userEvent.keyboard('{Enter}');
      await expect(canvas.getByText('Activations: 2')).toBeVisible();
    });
    await step('Activates the link card', async () => {
      await userEvent.click(linked);
      await expect(canvas.getByText('Link activations: 1')).toBeVisible();
    });
  },
};

export const DarkMode: Story = {
  name: 'A11y / Dark mode',
  ...darkA11y,
  render: () => <VariantGallery />,
};

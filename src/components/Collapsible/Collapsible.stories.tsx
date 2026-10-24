import compatibility from '../../stories/compatibility.module.css';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { darkA11y, staticStory } from '../../stories/storyHelpers';
import { Checkbox } from '../Checkbox/Checkbox';
import { Input } from '../Input/Input';
import { Collapsible } from './Collapsible';

const meta = {
  title: 'Components/Collapsible',
  component: Collapsible,
  args: { title: 'Besichtigung', size: 'md', disabled: false },
  argTypes: { size: { control: 'radio', options: ['sm', 'md'] } },
  render: (args) => (
    <div style={{ width: 420 }}>
      <Collapsible {...args}>
        <p>Schutzmassnahmen, Leitungen und Kennzeichnung geprüft.</p>
      </Collapsible>
    </div>
  ),
} satisfies Meta<typeof Collapsible>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const toggle = canvas.getByRole('button', { name: 'Besichtigung' });
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(toggle);
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await userEvent.keyboard('{Enter}');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  },
};

export const WithSummary: Story = {
  name: 'With summary',
  args: { summary: '3 von 5 Punkten erledigt', defaultOpen: true },
};

function Sections() {
  return (
    <div className="story-stack" style={{ width: 420 }}>
      <Collapsible title="Messungen" summary="Isolation, Schleife, RCD" defaultOpen>
        <div className="story-form">
          <Input label="Isolationswiderstand" suffix="MΩ" defaultValue="250" />
          <Input label="Schleifenimpedanz" suffix="Ω" defaultValue="0.42" />
        </div>
      </Collapsible>
      <Collapsible
        title="Sichtprüfung"
        leading={<Checkbox label="Sichtprüfung erledigt" hideLabel defaultChecked />}
      >
        <p>Alle Punkte erledigt.</p>
      </Collapsible>
      <Collapsible title="Gesperrt" summary="Nur lesen" disabled>
        <p>Hidden</p>
      </Collapsible>
    </div>
  );
}

export const FormsAndSections: Story = {
  name: 'Forms and sections',
  parameters: staticStory,
  render: () => <Sections />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByLabelText('Isolationswiderstand')).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Gesperrt' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  },
};

export const FocusReturnsOnClose: Story = {
  name: 'Closing moves focus to the toggle',
  tags: ['!dev', '!autodocs'],
  parameters: staticStory,
  render: () => (
    <div style={{ width: 420 }}>
      <Collapsible title="Details" defaultOpen>
        <Input label="Bemerkung" />
      </Collapsible>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByLabelText('Bemerkung'));
    await userEvent.click(canvas.getByRole('button', { name: 'Details' }));
    await expect(canvas.getByRole('button', { name: 'Details' })).toHaveFocus();
  },
};

export const DarkMode: Story = {
  name: 'A11y / Dark mode',
  ...darkA11y,
  render: () => <Sections />,
};

export const HeadingAndPanelHooks: Story = {
  name: 'Heading target and responsive panel',
  tags: ['!dev', '!autodocs'],
  parameters: staticStory,
  render: () => (
    <div className="story-stack">
      {[720, 420].map((width) => (
        <div key={width} className={compatibility.container} style={{ width }}>
          <Collapsible
            title={'Section ' + width}
            defaultOpen
            leading={<Checkbox label={'Done ' + width} hideLabel />}
            headingClassName={compatibility.heading}
            panelClassName={compatibility.panel}
          >
            <Input label={'Notes ' + width} />
          </Collapsible>
        </div>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const containers = canvasElement.querySelectorAll<HTMLElement>('.' + compatibility.container);
    for (const container of containers) {
      const heading = within(container).getByRole('heading');
      const panel = container.querySelector<HTMLElement>('.' + compatibility.panel)!;
      await expect(getComputedStyle(heading).scrollMarginTop).toBe('24px');
      if (container.getBoundingClientRect().width <= 600) {
        await expect(
          Math.abs(panel.getBoundingClientRect().left - container.getBoundingClientRect().left),
        ).toBeLessThan(1);
        await expect(
          Math.abs(panel.getBoundingClientRect().width - container.getBoundingClientRect().width),
        ).toBeLessThan(1);
      } else {
        await expect(
          panel.getBoundingClientRect().left - container.getBoundingClientRect().left,
        ).toBeGreaterThan(44);
      }
      const toggle = within(container).getByRole('button');
      await userEvent.click(toggle);
      await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    }
  },
};

import { ArrowLeft } from 'lucide-react';
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

function PrefixActivationExample({ phone = false }: { phone?: boolean }) {
  const [value, setValue] = useState('measurements');
  const [prefix, setPrefix] = useState(true);
  const [replaced, setReplaced] = useState(false);
  const [events, setEvents] = useState<string[]>([]);
  const labels = phone
    ? ['Übersicht', 'Messungen', 'Mängel', 'Abschluss']
    : pageTabs.map((option) => option.label);
  return (
    <div className="story-stack" style={{ width: 520, maxWidth: '100%' }}>
      <SegmentControl
        label="Sections"
        variant={phone ? 'segmented-tabs' : 'tabs'}
        centerSelected={phone}
        options={pageTabs.map((option, index) => ({
          ...option,
          value: replaced ? option.value + '-new' : option.value,
          label: labels[index],
          disabled: option.value === 'defects',
          prefix:
            option.value === 'measurements' && prefix ? (
              <ArrowLeft size={16} strokeWidth={1.8} />
            ) : undefined,
        }))}
        value={value}
        onActivate={(next) => setEvents((previous) => [...previous, 'activate:' + next])}
        onValueChange={(next) => {
          setEvents((previous) => [...previous, 'change:' + next]);
          setValue(next);
        }}
      />
      <button type="button" onClick={() => setPrefix((shown) => !shown)}>
        Toggle back arrow
      </button>
      <button
        type="button"
        onClick={() => {
          setReplaced(true);
          setValue('measurements-new');
        }}
      >
        Replace options
      </button>
      <output aria-label="Events">{events.join(',')}</output>
    </div>
  );
}

export const PrefixAndActivation: Story = {
  name: 'Prefix and repeated activation',
  parameters: staticStory,
  render: () => <PrefixActivationExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const group = canvas.getByRole('tablist', { name: 'Sections' });
    const [overview, measurements, defects, report] = within(group).getAllByRole('tab');
    const events = canvas.getByLabelText('Events');
    await expect(measurements).toHaveAccessibleName('Measurements');
    await userEvent.click(measurements);
    await expect(events).toHaveTextContent(/^activate:measurements$/);
    await userEvent.click(report);
    await expect(events).toHaveTextContent(/^activate:measurements,activate:report,change:report$/);
    await userEvent.keyboard('{ArrowLeft}');
    await expect(measurements).toHaveFocus();
    await expect(events).toHaveTextContent(
      /^activate:measurements,activate:report,change:report,change:measurements$/,
    );
    await userEvent.keyboard(' ');
    const beforeDisabled = events.textContent;
    await expect(beforeDisabled).toMatch(/,activate:measurements$/);
    await userEvent.click(defects);
    await expect(events.textContent).toBe(beforeDisabled);
    await expect(overview).toHaveAttribute('aria-selected', 'false');

    // Prefix changes while the same tab stays selected must resize the indicator.
    await userEvent.click(canvas.getByRole('button', { name: 'Toggle back arrow' }));
    const withoutPrefix = measurements.getBoundingClientRect().width;
    await waitFor(() => {
      expect(
        Math.abs(parseFloat(group.style.getPropertyValue('--indicator-width')) - withoutPrefix),
      ).toBeLessThan(1);
    });
    await userEvent.click(canvas.getByRole('button', { name: 'Toggle back arrow' }));
    await waitFor(() => {
      expect(measurements.getBoundingClientRect().width).toBeGreaterThan(withoutPrefix);
      expect(
        Math.abs(
          parseFloat(group.style.getPropertyValue('--indicator-width')) -
            measurements.getBoundingClientRect().width,
        ),
      ).toBeLessThan(1);
    });
    // Replacing keys with the same option count must observe the new buttons too.
    await userEvent.click(canvas.getByRole('button', { name: 'Replace options' }));
    const replacement = within(group).getByRole('tab', { name: 'Measurements' });
    const replacementWithPrefix = replacement.getBoundingClientRect().width;
    await userEvent.click(canvas.getByRole('button', { name: 'Toggle back arrow' }));
    await waitFor(() => {
      expect(replacement.getBoundingClientRect().width).toBeLessThan(replacementWithPrefix);
      expect(
        Math.abs(
          parseFloat(group.style.getPropertyValue('--indicator-width')) -
            replacement.getBoundingClientRect().width,
        ),
      ).toBeLessThan(1);
    });
  },
};

export const PhonePrefixDark: Story = {
  name: 'A11y / Phone prefix dark',
  ...darkA11y,
  globals: { theme: 'dark', language: 'de-CH', viewport: { value: 'phone' } },
  parameters: phoneParameters,
  render: () => <PrefixActivationExample phone />,
  play: async ({ canvasElement }) => {
    const tab = within(canvasElement).getByRole('tab', { name: 'Messungen' });
    await expect(tab).toHaveAttribute('aria-selected', 'true');
    await expect(getComputedStyle(tab).fontSize).toBe('14px');
    await expect(getComputedStyle(tab).paddingInlineStart).toBe('16px');
  },
};

const lifecycleOptions = [
  { value: 'planning', label: 'Planning', title: 'Shows the installation as planned' },
  { value: 'built', label: 'As built', title: 'Shows what was installed on site' },
];

function LifecycleExample() {
  const [value, setValue] = useState('planning');
  const current = lifecycleOptions.find((option) => option.value === value);
  return (
    <div className="story-stack" style={{ width: 360 }}>
      <SegmentControl
        label="Lifecycle"
        describedBy="lifecycle-description"
        options={lifecycleOptions}
        value={value}
        onValueChange={setValue}
      />
      <p id="lifecycle-description" className="story-note">
        {current?.title}
      </p>
    </div>
  );
}

export const TitlesAndDescription: Story = {
  name: 'Titles and description',
  parameters: staticStory,
  render: () => <LifecycleExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const group = canvas.getByRole('radiogroup', { name: 'Lifecycle' });
    const built = canvas.getByRole('radio', { name: 'As built' });
    await expect(built).toHaveAttribute('title', 'Shows what was installed on site');
    await expect(group).toHaveAccessibleDescription('Shows the installation as planned');
    await userEvent.click(built);
    await expect(group).toHaveAccessibleDescription('Shows what was installed on site');
  },
};

export const TitlesDark: Story = {
  name: 'A11y / Titles dark',
  ...darkA11y,
  render: () => <LifecycleExample />,
};

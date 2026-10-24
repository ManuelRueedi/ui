import type { Meta, StoryObj } from '@storybook/react-vite';
import { darkA11y, staticStory } from './storyHelpers';

const meta = {
  title: 'Foundations/Colors',
  parameters: staticStory,
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const groups: Array<[string, string[]]> = [
  ['Text', ['--fg-1', '--fg-2', '--fg-3', '--fg-4', '--fg-inverse']],
  ['Surfaces', ['--bg-1', '--bg-2', '--bg-3', '--bg-4', '--bg-inverse']],
  ['Borders', ['--border-1', '--border-2', '--border-focus']],
  ['Controls', ['--ctrl-primary-bg', '--ctrl-secondary-bg', '--ctrl-secondary-border']],
  ['Status', ['--warning', '--warning-bg', '--error', '--error-bg', '--success-bg']],
];

function Swatches() {
  return (
    <div className="story-stack">
      {groups.map(([title, tokens]) => (
        <div key={title} className="story-section">
          <p className="story-label">{title}</p>
          <div className="story-grid">
            {tokens.map((token) => (
              <div key={token} className="state-cell">
                <div
                  style={{
                    background: `var(${token})`,
                    border: '1px solid var(--border-1)',
                    borderRadius: 'var(--radius-1)',
                    height: 48,
                    width: 96,
                  }}
                />
                <span>{token}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export const Default: Story = { render: () => <Swatches /> };
export const DarkMode: Story = {
  name: 'A11y / Dark mode',
  ...darkA11y,
  render: () => <Swatches />,
};

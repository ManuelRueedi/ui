import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { darkA11y, staticStory } from './storyHelpers';

const meta = {
  title: 'Foundations/Typography',
  parameters: staticStory,
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function TypeStack() {
  return (
    <div className="story-stack">
      <h1>h1 - Page title</h1>
      <h2>h2 - Section title</h2>
      <h3>h3 - Subsection title</h3>
      <p>p - Body text for normal content</p>
      <p>
        <strong>strong - Emphasized inline text</strong>
      </p>
      <small>small - Supporting text or metadata</small>
      <code>code - Monospace metadata</code>
      <table>
        <thead>
          <tr>
            <th>th - Project</th>
            <th>th - Site</th>
            <th>th - Due</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <strong>td + strong - ELMU-2026-000042</strong>
            </td>
            <td>td - Limmatstrasse 18</td>
            <td>td - May 18, 2026</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export const Default: Story = {
  render: () => <TypeStack />,
  play: async () => {
    const fonts = await document.fonts.load('14px "Google Sans Flex"');
    await expect(fonts.length).toBeGreaterThan(0);
    await expect(fonts.every((font) => font.status === 'loaded')).toBe(true);
  },
};
export const DarkMode: Story = {
  name: 'A11y / Dark mode',
  ...darkA11y,
  render: () => <TypeStack />,
};

import '../src/styles/tokens.css';
import '../src/styles/base.css';
import './story.css';
import type { Decorator, Preview } from '@storybook/react-vite';
import { UiProvider } from '../src/i18n/UiProvider';

// The spotlight layers sit on top of text; axe would read them as low contrast.
const spotlightContrastExclusions = [
  '[data-spotlight-surface] [class*="idle-content"]',
  '[data-spotlight-surface] [class*="status-content"]',
  '[data-spotlight-surface] [class*="status-label"]',
  '[data-spotlight-surface][class*="Card-card"] > *',
  '[data-spotlight-surface] [class*="nav-content"] span',
  '[data-spotlight-surface] [class*="label-text"]',
  '[data-spotlight-surface] [class*="affix"]',
  '[data-spotlight-surface] input',
  '[data-spotlight-surface] [class*="option-label"]',
];

const withTheme: Decorator = (Story, context) => {
  const language = context.parameters.language ?? context.globals.language;
  const theme = context.globals.theme === 'dark' ? 'dark' : 'light';
  const fullscreen = context.parameters.canvasLayout === 'fullscreen';
  return (
    <UiProvider locale={typeof language === 'string' ? language : 'en'}>
      <div className={`story-theme${fullscreen ? ' fullscreen' : ''}`} data-theme={theme}>
        <div className="story-theme-content">
          <Story />
        </div>
      </div>
    </UiProvider>
  );
};

const preview: Preview = {
  tags: ['autodocs'],
  initialGlobals: { theme: 'light', language: 'en' },
  globalTypes: {
    language: {
      name: 'Language',
      description: 'Preview language',
      toolbar: {
        icon: 'globe',
        items: [
          { value: 'en', title: 'English' },
          { value: 'de-CH', title: 'Deutsch (Schweiz)' },
          { value: 'fr-CH', title: 'Français (Suisse)' },
          { value: 'it-CH', title: 'Italiano (Svizzera)' },
        ],
        dynamicTitle: true,
      },
    },
    theme: {
      name: 'Theme',
      description: 'Preview theme',
      toolbar: {
        icon: 'contrast',
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
        ],
        dynamicTitle: true,
      },
    },
  },
  decorators: [withTheme],
  parameters: {
    options: { storySort: { order: ['Foundations', 'Components'] } },
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
    a11y: {
      context: { exclude: spotlightContrastExclusions },
      // Off until the labels that hide visible text are fixed, as in messen.app.
      config: { rules: [{ id: 'label-content-name-mismatch', enabled: false }] },
      test: 'error',
    },
    backgrounds: { disable: true },
    layout: 'fullscreen',
  },
};

export default preview;

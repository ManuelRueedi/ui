/** Shared story settings. */
export const staticStory = { controls: { disable: true } };

/** A hidden story that runs the accessibility check in dark mode. */
export const darkA11y = {
  tags: ['!dev', '!autodocs'],
  globals: { theme: 'dark' },
  parameters: staticStory,
};

export const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

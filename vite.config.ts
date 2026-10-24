/// <reference types="vitest/config" />
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import react from '@vitejs/plugin-react';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig, type Plugin } from 'vite';

const fromRoot = (path: string) => fileURLToPath(new URL(path, import.meta.url));

// tokens.css and base.css ship as plain files so an app can take the tokens without the components.
function copyStyleSheets(): Plugin {
  return {
    name: 'copy-style-sheets',
    apply: 'build',
    closeBundle() {
      mkdirSync(fromRoot('./dist'), { recursive: true });
      for (const name of ['tokens.css', 'base.css']) {
        const css = readFileSync(fromRoot(`./src/styles/${name}`), 'utf8');
        // The source styles are one directory deeper than the distributed styles.
        writeFileSync(fromRoot(`./dist/${name}`), css.replace('../../fonts/', '../fonts/'));
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), copyStyleSheets()],
  css: {
    modules: {
      // Readable, stable class names: ui-Button-primary. Apps and tests can still find them.
      generateScopedName: (local, filename) => {
        const component =
          filename
            .split('/')
            .pop()
            ?.replace(/\.module\.css(\?.*)?$/, '') ?? 'ui';
        return `ui-${component}-${local}`;
      },
    },
  },
  build: {
    lib: {
      entry: fromRoot('./src/index.ts'),
      formats: ['es'],
      fileName: 'index',
      cssFileName: 'ui',
    },
    rollupOptions: {
      external: [/^react($|\/)/, /^react-dom($|\/)/, /^lucide-react($|\/)/],
    },
    sourcemap: true,
    emptyOutDir: true,
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'jsdom',
          include: ['src/**/*.test.{ts,tsx}'],
          setupFiles: ['./src/test/setup.ts'],
        },
      },
      {
        // Runs every story, its play function and the accessibility check in a real browser.
        extends: true,
        plugins: [storybookTest({ configDir: fromRoot('./.storybook') })],
        test: {
          name: 'storybook',
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({
              launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined },
            }),
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
  },
});

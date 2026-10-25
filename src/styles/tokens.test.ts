import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(join(process.cwd(), 'src/styles/tokens.css'), 'utf8');

function block(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  const body = css.slice(start, css.indexOf('}', start));
  return Object.fromEntries(
    [...body.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map(([, name, value]) => [name, value.trim()]),
  );
}

const light = block(':root');
const dark = { ...light, ...block(".dark,\n[data-theme='dark']") };

function resolve(tokens: Record<string, string>, name: string): string {
  const value = tokens[name];
  const reference = /^var\((--[\w-]+)\)$/.exec(value);
  return reference ? resolve(tokens, reference[1]) : value;
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((index) => {
    const channel = parseInt(hex.slice(index, index + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(tokens: Record<string, string>, fg: string, bg: string): number {
  const [a, b] = [luminance(resolve(tokens, fg)), luminance(resolve(tokens, bg))];
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

describe('control colours', () => {
  for (const [theme, tokens] of [
    ['light', light],
    ['dark', dark],
  ] as const) {
    it(`keep white text readable on danger fills in ${theme} mode`, () => {
      expect(contrast(tokens, '--gray-0', '--ctrl-danger-bg')).toBeGreaterThanOrEqual(4.5);
      expect(contrast(tokens, '--gray-0', '--ctrl-danger-bg-press')).toBeGreaterThanOrEqual(4.5);
    });

    it(`keep primary text readable in ${theme} mode`, () => {
      expect(contrast(tokens, '--ctrl-primary-fg', '--ctrl-primary-bg')).toBeGreaterThanOrEqual(
        4.5,
      );
    });
  }
});

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SpotlightOptions } from './spotlight';
import { useSpotlight } from './useSpotlight';

function Surface({ options }: { options?: SpotlightOptions }) {
  return <button ref={useSpotlight(options)}>Spotlight</button>;
}

function press(button: HTMLElement) {
  fireEvent.pointerDown(button, { button: 0, isPrimary: true, pointerType: 'mouse' });
}

async function release(button: HTMLElement) {
  fireEvent.pointerUp(button);
  fireEvent.keyUp(button, { key: 'Enter' });
  await waitFor(() => expect(button).not.toHaveAttribute('data-spotlight-pulsing'));
}

describe('useSpotlight', () => {
  beforeEach(() => {
    // jsdom has no pseudo-element styles. The browser story checks real CSS.
    const getStyle = window.getComputedStyle.bind(window);
    vi.spyOn(window, 'getComputedStyle').mockImplementation((node) => getStyle(node));
  });
  afterEach(() => vi.restoreAllMocks());

  it.each([
    { name: 'omitted options', options: undefined },
    { name: 'only disabled supplied', options: { disabled: false } },
  ])('keeps focus and pointer/keyboard pulses after effects with $name', async ({ options }) => {
    render(<Surface options={options} />);
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('data-spotlight-focus');
    press(button);
    expect(button).toHaveAttribute('data-spotlight-pulsing');
    await release(button);
    fireEvent.keyDown(button, { key: 'Enter' });
    expect(button).toHaveAttribute('data-spotlight-pulsing');
    await release(button);
  });

  it('respects explicit opt-outs and restores defaults when options are removed', async () => {
    const { rerender } = render(
      <Surface options={{ focus: false, keyboard: false, pulse: false }} />,
    );
    const button = screen.getByRole('button');
    expect(button).not.toHaveAttribute('data-spotlight-focus');
    press(button);
    fireEvent.keyDown(button, { key: 'Enter' });
    expect(button).not.toHaveAttribute('data-spotlight-pulsing');

    rerender(<Surface options={{ focus: false, keyboard: false }} />);
    fireEvent.keyDown(button, { key: 'Enter' });
    expect(button).not.toHaveAttribute('data-spotlight-pulsing');
    press(button);
    expect(button).toHaveAttribute('data-spotlight-pulsing');
    await release(button);

    rerender(<Surface />);
    expect(button).toHaveAttribute('data-spotlight-focus');
    fireEvent.keyDown(button, { key: 'Enter' });
    expect(button).toHaveAttribute('data-spotlight-pulsing');
    await release(button);
  });

  it('cancels a press while disabled and restores interaction when re-enabled', async () => {
    const { rerender } = render(<Surface />);
    const button = screen.getByRole('button');
    press(button);
    expect(button).toHaveAttribute('data-spotlight-pulsing');

    rerender(<Surface options={{ disabled: true }} />);
    expect(button).toHaveAttribute('data-spotlight-disabled');
    expect(button).not.toHaveAttribute('data-spotlight-pulsing');
    press(button);
    fireEvent.keyDown(button, { key: 'Enter' });
    expect(button).not.toHaveAttribute('data-spotlight-pulsing');

    rerender(<Surface options={{ disabled: false }} />);
    expect(button).not.toHaveAttribute('data-spotlight-disabled');
    expect(button).toHaveAttribute('data-spotlight-focus');
    press(button);
    expect(button).toHaveAttribute('data-spotlight-pulsing');
    await release(button);
  });
});

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Tooltip } from './Tooltip';

const matches = Element.prototype.matches;

/** jsdom's own :focus-visible guess is not reliable; fix the answer for one test. */
function setFocusVisible(visible: boolean) {
  vi.spyOn(Element.prototype, 'matches').mockImplementation(function (
    this: Element,
    selector: string,
  ) {
    return selector === ':focus-visible' ? visible : matches.call(this, selector);
  });
}

afterEach(() => vi.restoreAllMocks());

function renderTooltip(props: { describe?: boolean } = {}) {
  render(
    <Tooltip content="Undo" {...props}>
      <button type="button" aria-label="Undo">
        ↶
      </button>
    </Tooltip>,
  );
  return {
    button: screen.getByRole('button', { name: 'Undo' }),
    tooltip: screen.getByRole('tooltip', { hidden: true }),
  };
}

describe('Tooltip', () => {
  it('opens on keyboard focus', async () => {
    setFocusVisible(true);
    const { button, tooltip } = renderTooltip();
    act(() => button.focus());
    await waitFor(() => expect(tooltip).toHaveAttribute('data-open', 'true'));
  });

  it('stays closed when a script restores focus after a mouse action', async () => {
    setFocusVisible(false);
    const { button, tooltip } = renderTooltip();
    act(() => button.focus());
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(tooltip).toHaveAttribute('data-positioned', 'false');
    expect(tooltip).toHaveAttribute('data-open', 'false');

    // Hovering still shows it.
    fireEvent.pointerEnter(button);
    await waitFor(() => expect(tooltip).toHaveAttribute('data-open', 'true'));
  });

  it('describes the focusable child by default', () => {
    const { button, tooltip } = renderTooltip();
    expect(button).toHaveAttribute('aria-describedby', tooltip.id);
  });

  it('leaves the description out with describe={false}', () => {
    const { button } = renderTooltip({ describe: false });
    expect(button).not.toHaveAttribute('aria-describedby');
  });
});

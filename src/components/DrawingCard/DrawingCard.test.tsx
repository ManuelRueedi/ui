import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { UiProvider } from '../../i18n/UiProvider';
import { DrawingCard } from './DrawingCard';

describe('DrawingCard', () => {
  it('is a region named by its title', () => {
    render(<DrawingCard title="Socket 1.04" subtitle="Kitchen" />);
    expect(screen.getByRole('region', { name: 'Socket 1.04' })).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('takes a label when the title is not text', () => {
    render(<DrawingCard label="Socket 1.04" title={<input aria-label="Name" />} />);
    expect(screen.getByRole('region', { name: 'Socket 1.04' })).toBeInTheDocument();
  });

  it('closes with the button and with Escape inside the card', async () => {
    const onClose = vi.fn();
    render(
      <UiProvider locale="de-CH">
        <DrawingCard title="HAK" onClose={onClose}>
          <input aria-label="Strom" />
        </DrawingCard>
      </UiProvider>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Schliessen' }));
    await userEvent.click(screen.getByRole('textbox', { name: 'Strom' }));
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('places a floating card through CSS variables', () => {
    render(<DrawingCard title="Opening" x={32} y="4rem" />);
    const card = screen.getByRole('region', { name: 'Opening' });
    expect(card.style.getPropertyValue('--drawing-card-x')).toBe('32px');
    expect(card.style.getPropertyValue('--drawing-card-y')).toBe('4rem');
  });

  it('ignores the position when docked', () => {
    render(<DrawingCard title="Unplaced" placement="docked" x={32} />);
    const card = screen.getByRole('region', { name: 'Unplaced' });
    expect(card).toHaveAttribute('data-placement', 'docked');
    expect(card.style.getPropertyValue('--drawing-card-x')).toBe('');
  });
});

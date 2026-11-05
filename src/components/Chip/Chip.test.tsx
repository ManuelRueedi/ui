import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { UiProvider } from '../../i18n/UiProvider';
import { Chip } from './Chip';

describe('Chip', () => {
  it('is plain text without onClick or selected', () => {
    render(<Chip count={3}>Planned</Chip>);
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByText('Planned')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('is a toggle button with selected', async () => {
    const onClick = vi.fn();
    render(
      <Chip selected={false} onClick={onClick}>
        Sockets
      </Chip>,
    );
    const button = screen.getByRole('button', { name: 'Sockets' });
    expect(button).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('is an action button without a pressed state', () => {
    render(<Chip onClick={() => undefined}>Move to</Chip>);
    expect(screen.getByRole('button', { name: 'Move to' })).not.toHaveAttribute('aria-pressed');
  });

  it('removes with a labelled button in the chosen language', async () => {
    const onRemove = vi.fn();
    render(
      <UiProvider locale="de-CH">
        <Chip onRemove={onRemove}>Küche</Chip>
      </UiProvider>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Küche entfernen' }));
    expect(onRemove).toHaveBeenCalledOnce();
  });

  it('does not run actions while disabled', async () => {
    const onClick = vi.fn();
    const onRemove = vi.fn();
    render(
      <Chip disabled onClick={onClick} onRemove={onRemove}>
        Locked
      </Chip>,
    );
    for (const button of screen.getAllByRole('button')) {
      expect(button).toBeDisabled();
      await userEvent.click(button);
    }
    expect(onClick).not.toHaveBeenCalled();
    expect(onRemove).not.toHaveBeenCalled();
  });
});

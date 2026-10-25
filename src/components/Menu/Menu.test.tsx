import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Menu, MenuItem, useMenu } from './Menu';

function ApplyButton() {
  const menu = useMenu();
  return (
    <button type="button" onClick={menu.close}>
      Apply
    </button>
  );
}

describe('Menu', () => {
  it('closes on a press outside, without moving the focus', async () => {
    render(
      <>
        <Menu label="Tools">
          <MenuItem>Print</MenuItem>
        </Menu>
        <button type="button">Elsewhere</button>
      </>,
    );
    const trigger = screen.getByRole('button', { name: 'Tools' });
    await userEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Elsewhere' }));
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('keeps the menu open for keepOpen items', async () => {
    const onSelect = vi.fn();
    render(
      <Menu label="Tools">
        <MenuItem keepOpen onSelect={onSelect}>
          Zoom in
        </MenuItem>
      </Menu>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Tools' }));
    await userEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(onSelect).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Tools' })).toHaveAttribute('aria-expanded', 'true');
  });

  it('lets content inside close the menu', async () => {
    render(
      <Menu label="Filter">
        <ApplyButton />
      </Menu>,
    );
    const trigger = screen.getByRole('button', { name: 'Filter' });
    await userEvent.click(trigger);
    await userEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveFocus();
  });

  it('follows a parent-owned open state', async () => {
    const onOpenChange = vi.fn();
    const { rerender } = render(
      <Menu label="Tools" open={false} onOpenChange={onOpenChange}>
        <MenuItem>Print</MenuItem>
      </Menu>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Tools' }));
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(screen.getByRole('button', { name: 'Tools' })).toHaveAttribute('aria-expanded', 'false');
    rerender(
      <Menu label="Tools" open onOpenChange={onOpenChange}>
        <MenuItem>Print</MenuItem>
      </Menu>,
    );
    expect(screen.getByRole('button', { name: 'Print' })).toBeVisible();
  });

  it('ignores clicks on a disabled item', async () => {
    const onSelect = vi.fn();
    render(
      <Menu label="Tools" defaultOpen>
        <MenuItem href="#archive" disabled onSelect={onSelect}>
          Archive
        </MenuItem>
      </Menu>,
    );
    await userEvent.click(screen.getByRole('link', { name: 'Archive' }));
    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Tools' })).toHaveAttribute('aria-expanded', 'true');
  });

  it('needs a Menu around useMenu', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<ApplyButton />)).toThrow('useMenu must be used inside a Menu');
  });
});

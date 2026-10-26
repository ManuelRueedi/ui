import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
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

  it('closes on Escape with the focus outside and marks the key as used', async () => {
    const seen: boolean[] = [];
    // A page-level handler registered before the menu opens, as apps do.
    const pageHandler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') seen.push(event.defaultPrevented);
    };
    document.addEventListener('keydown', pageHandler);
    try {
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
      act(() => screen.getByRole('button', { name: 'Elsewhere' }).focus());
      // Focus moving out closes the menu; reopen it the way a pointer does without focus.
      fireEvent.click(trigger);
      expect(trigger).toHaveAttribute('aria-expanded', 'true');
      const late: boolean[] = [];
      const lateHandler = (event: KeyboardEvent) => late.push(event.defaultPrevented);
      document.addEventListener('keydown', lateHandler);
      fireEvent.keyDown(screen.getByRole('button', { name: 'Elsewhere' }), { key: 'Escape' });
      document.removeEventListener('keydown', lateHandler);
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
      expect(seen).toEqual([true]);
      expect(late).toEqual([true]);

      // With the menu closed, Escape is left to the page.
      fireEvent.keyDown(document.body, { key: 'Escape' });
      expect(seen).toEqual([true, false]);
    } finally {
      document.removeEventListener('keydown', pageHandler);
    }
  });

  it('keeps the absolute panel when the browser has no top layer', async () => {
    render(
      <Menu label="Tools" align="center">
        <MenuItem>Print</MenuItem>
      </Menu>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Tools' }));
    const panel = screen.getByRole('group', { name: 'Tools' });
    expect(panel).toBeVisible();
    expect(panel).not.toHaveAttribute('popover');
    expect(panel.parentElement).toHaveAttribute('data-align', 'center');
  });

  it('writes the current token and keeps an aria-current passed through', () => {
    render(
      <Menu label="Go to" defaultOpen>
        <MenuItem current>Plan</MenuItem>
        <MenuItem current="page">Report</MenuItem>
        <MenuItem current="location">Kitchen</MenuItem>
        <MenuItem aria-current="step">Step 2</MenuItem>
        <MenuItem current={false}>Archive</MenuItem>
      </Menu>,
    );
    expect(screen.getByRole('button', { name: 'Plan' })).toHaveAttribute('aria-current', 'true');
    expect(screen.getByRole('button', { name: 'Report' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Kitchen' })).toHaveAttribute(
      'aria-current',
      'location',
    );
    expect(screen.getByRole('button', { name: 'Step 2' })).toHaveAttribute('aria-current', 'step');
    expect(screen.getByRole('button', { name: 'Archive' })).not.toHaveAttribute('aria-current');
  });

  it('marks toggles as pressed', async () => {
    function Toggle() {
      const [shown, setShown] = useState(false);
      return (
        <Menu label="View" defaultOpen>
          <MenuItem pressed={shown} keepOpen onSelect={() => setShown(!shown)}>
            Debug layer
          </MenuItem>
        </Menu>
      );
    }
    render(<Toggle />);
    const toggle = screen.getByRole('button', { name: 'Debug layer' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'View' })).toHaveAttribute('aria-expanded', 'true');
  });

  it('reads a description and keeps a disabled item with a reason in reach', async () => {
    const onSelect = vi.fn();
    render(
      <Menu label="Open view">
        <MenuItem description="Shows every room">Overview</MenuItem>
        <MenuItem disabled description="Someone else is editing it" onSelect={onSelect}>
          Floor plan
        </MenuItem>
        <MenuItem disabled>Print</MenuItem>
      </Menu>,
    );
    const trigger = screen.getByRole('button', { name: 'Open view' });
    trigger.focus();
    await userEvent.keyboard('{ArrowDown}');
    const overview = screen.getByRole('button', { name: 'Overview' });
    await waitFor(() => expect(overview).toHaveFocus());
    expect(overview).toHaveAccessibleDescription('Shows every room');

    await userEvent.keyboard('{ArrowDown}');
    const floorPlan = screen.getByRole('button', { name: 'Floor plan' });
    expect(floorPlan).toHaveFocus();
    expect(floorPlan).toHaveAccessibleDescription('Someone else is editing it');
    expect(floorPlan).toHaveAttribute('aria-disabled', 'true');
    expect(floorPlan).toBeEnabled();
    await userEvent.keyboard('{Enter}');
    expect(onSelect).not.toHaveBeenCalled();
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    // A disabled item without a reason stays out of the arrow order.
    expect(screen.getByRole('button', { name: 'Print' })).toBeDisabled();
    await userEvent.keyboard('{ArrowDown}');
    expect(overview).toHaveFocus();
  });

  it('needs a Menu around useMenu', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<ApplyButton />)).toThrow('useMenu must be used inside a Menu');
  });
});

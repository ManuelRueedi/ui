import { describe, expect, it } from 'vitest';
import {
  anchoredPosition,
  fitsOnSide,
  oppositeSide,
  roomOnSide,
  shiftInside,
  sideOrder,
  type Box,
} from './placement';

function box(left: number, top: number, width: number, height: number): Box {
  return { left, top, width, height, right: left + width, bottom: top + height };
}

// A 390 × 844 phone window.
const phone = box(0, 0, 390, 844);

describe('placement', () => {
  it('orders the sides: the side, its opposite, then across', () => {
    expect(sideOrder('top')).toEqual(['top', 'bottom', 'right', 'left']);
    expect(sideOrder('left')).toEqual(['left', 'right', 'bottom', 'top']);
    expect(oppositeSide('bottom')).toBe('top');
  });

  it('measures the room beside the anchor after the gap and the margin', () => {
    const trigger = box(300, 790, 80, 36);
    expect(roomOnSide('bottom', trigger, phone, 4, 12)).toBe(844 - 826 - 12 - 4);
    expect(roomOnSide('top', trigger, phone, 4, 12)).toBe(790 - 12 - 4);
    expect(fitsOnSide('bottom', trigger, { width: 220, height: 120 }, phone, 4, 12)).toBe(false);
    expect(fitsOnSide('top', trigger, { width: 220, height: 120 }, phone, 4, 12)).toBe(true);
  });

  it('lines a panel up with the start, middle or end of the anchor', () => {
    const trigger = box(100, 40, 80, 36);
    const size = { width: 220, height: 120 };
    expect(anchoredPosition('bottom', 'start', trigger, size, 4)).toEqual({ x: 100, y: 80 });
    expect(anchoredPosition('bottom', 'end', trigger, size, 4)).toEqual({ x: -40, y: 80 });
    expect(anchoredPosition('top', 'center', trigger, size, 4)).toEqual({ x: 30, y: -84 });
    expect(anchoredPosition('right', 'center', trigger, size, 8)).toEqual({ x: 188, y: -2 });
  });

  it('shifts a panel to stay inside the window, keeping the start edge when it is too long', () => {
    // Lined up with a trigger at the right edge, the panel would end at 520.
    expect(shiftInside(300, 220, phone.left, phone.right, 12)).toBe(390 - 220 - 12);
    expect(shiftInside(-40, 220, phone.left, phone.right, 12)).toBe(12);
    expect(shiftInside(80, 220, phone.left, phone.right, 12)).toBe(80);
    expect(shiftInside(80, 500, phone.left, phone.right, 12)).toBe(12);
  });
});

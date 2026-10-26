// Placement helpers for floating panels (Tooltip, Menu): room on a side, flipping and shifting a
// panel so it stays inside a boundary, and the browser's top layer. Plain DOM code.

export type Side = 'top' | 'right' | 'bottom' | 'left';
/** Where the panel lines up along the anchor edge. `start` is the left or top edge. */
export type Alignment = 'start' | 'center' | 'end';
export type Size = Pick<DOMRect, 'width' | 'height'>;
export type Box = Pick<DOMRect, 'top' | 'right' | 'bottom' | 'left' | 'width' | 'height'>;

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function oppositeSide(side: Side): Side {
  if (side === 'top') return 'bottom';
  if (side === 'bottom') return 'top';
  if (side === 'left') return 'right';
  return 'left';
}

/** The side itself, its opposite, then the two sides across. */
export function sideOrder(side: Side): Side[] {
  if (side === 'top' || side === 'bottom') return [side, oppositeSide(side), 'right', 'left'];
  return [side, oppositeSide(side), 'bottom', 'top'];
}

function vertical(side: Side) {
  return side === 'top' || side === 'bottom';
}

function spaceBeside(side: Side, anchor: Box, boundary: Box, margin: number) {
  if (side === 'top') return anchor.top - boundary.top - margin;
  if (side === 'bottom') return boundary.bottom - anchor.bottom - margin;
  if (side === 'left') return anchor.left - boundary.left - margin;
  return boundary.right - anchor.right - margin;
}

/** The room a panel has on one side of the anchor, after the gap and the margin to the boundary. */
export function roomOnSide(side: Side, anchor: Box, boundary: Box, gap: number, margin: number) {
  return spaceBeside(side, anchor, boundary, margin) - gap;
}

/** Whether a panel of this size fits on one side of the anchor. */
export function fitsOnSide(
  side: Side,
  anchor: Box,
  size: Size,
  boundary: Box,
  gap: number,
  margin: number,
) {
  const length = vertical(side) ? size.height : size.width;
  return spaceBeside(side, anchor, boundary, margin) >= length + gap;
}

/** The top left corner of a panel on one side of the anchor, lined up along the anchor edge. */
export function anchoredPosition(
  side: Side,
  align: Alignment,
  anchor: Box,
  size: Size,
  gap: number,
): { x: number; y: number } {
  const along = (start: number, length: number, panelLength: number) => {
    if (align === 'start') return start;
    if (align === 'end') return start + length - panelLength;
    return start + length / 2 - panelLength / 2;
  };
  if (side === 'top') {
    return { x: along(anchor.left, anchor.width, size.width), y: anchor.top - size.height - gap };
  }
  if (side === 'bottom') {
    return { x: along(anchor.left, anchor.width, size.width), y: anchor.bottom + gap };
  }
  if (side === 'left') {
    return { x: anchor.left - size.width - gap, y: along(anchor.top, anchor.height, size.height) };
  }
  return { x: anchor.right + gap, y: along(anchor.top, anchor.height, size.height) };
}

/**
 * Moves a start coordinate so a panel of this length stays `margin` inside the range from `min`
 * to `max`. A panel longer than the range keeps its start edge on screen.
 */
export function shiftInside(
  start: number,
  length: number,
  min: number,
  max: number,
  margin: number,
) {
  return clamp(start, min + margin, Math.max(min + margin, max - length - margin));
}

/** The window as a box. Without scroll bars, it is the area where fixed elements can show. */
export function viewportBox(withoutScrollbars = false): Box {
  const root = document.documentElement;
  const width = withoutScrollbars ? root.clientWidth || window.innerWidth : window.innerWidth;
  const height = withoutScrollbars ? root.clientHeight || window.innerHeight : window.innerHeight;
  return { top: 0, right: width, bottom: height, left: 0, width, height };
}

/** Whether these styles make the element the containing block of fixed descendants. */
export function createsFixedContainingBlock(style: CSSStyleDeclaration) {
  const willChange = style.willChange ?? '';
  const contain = style.contain ?? '';
  return Boolean(
    (style.transform && style.transform !== 'none') ||
    (style.perspective && style.perspective !== 'none') ||
    (style.filter && style.filter !== 'none') ||
    (style.backdropFilter && style.backdropFilter !== 'none') ||
    contain.includes('paint') ||
    contain.includes('layout') ||
    contain.includes('strict') ||
    contain.includes('content') ||
    willChange.includes('transform') ||
    willChange.includes('perspective') ||
    willChange.includes('filter'),
  );
}

/**
 * The box a fixed element is positioned against: the viewport, or an ancestor with a transform,
 * filter or containment. Elements in the top layer always use the viewport.
 */
export function fixedBoundary(node: HTMLElement, inTopLayer: boolean): Box {
  if (!inTopLayer) {
    let current = node.parentElement;
    while (current && current !== document.documentElement) {
      if (createsFixedContainingBlock(window.getComputedStyle(current))) {
        return current.getBoundingClientRect();
      }
      current = current.parentElement;
    }
  }
  return viewportBox();
}

/** Whether the browser can show this element in the top layer (`popover`). jsdom cannot. */
export function supportsPopover(element: HTMLElement | null): element is HTMLElement {
  return Boolean(element && 'showPopover' in element);
}

export function isPopoverOpen(element: HTMLElement | null) {
  return supportsPopover(element) && element.matches(':popover-open');
}

/** Shows or hides a `popover="manual"` element in the top layer; does nothing without support. */
export function setPopoverOpen(element: HTMLElement | null, open: boolean) {
  if (!supportsPopover(element)) return;
  try {
    if (open && !isPopoverOpen(element)) element.showPopover();
    if (!open && isPopoverOpen(element)) element.hidePopover();
  } catch {
    // A disconnected element cannot change layers; nothing to undo.
  }
}

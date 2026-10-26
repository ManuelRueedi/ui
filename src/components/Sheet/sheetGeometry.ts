// Snap heights and release rules of the phone sheet. Ported from CircuitDocs'
// useMobileSelectionDrawer, so its selection drawer keeps the same feel. Plain functions.

/** `peek` shows the start of the content; `full` fills the visual viewport. */
export type SheetSnap = 'peek' | 'full';

export type SheetGeometry = { peekHeight: number; fullHeight: number };

/** The peek height when the caller gives none. */
export const defaultPeekHeight = 232;

/** A finger or pointer that moves no more than this is a tap, not a drag. */
export const tapSlop = 4;

/**
 * The two snap heights for a visual viewport of this height. `full` is the whole viewport.
 * `peek` is the preferred height, at most 42% of the viewport but at least 196 px, and it always
 * leaves 120 px to the full height.
 */
export function sheetGeometry(
  viewportHeight: number,
  preferredPeekHeight = defaultPeekHeight,
): SheetGeometry {
  const fullHeight = Math.max(180, viewportHeight);
  const preferredPeek = Math.max(196, Math.min(preferredPeekHeight, viewportHeight * 0.42));
  const peekHeight = Math.min(preferredPeek, Math.max(160, fullHeight - 120));
  return { peekHeight, fullHeight };
}

/**
 * Where a drag ends. From `full`, 48 px down or a quick flick folds it to `peek`. From `peek`,
 * 64 px down or a quick downward flick closes it, 40 px up or a quick upward flick opens it in
 * full, and a short slow drag goes to the nearer snap. Velocities are in px/ms (down is positive).
 */
export function sheetRelease({
  startSnap,
  deltaY,
  endHeight,
  velocityY,
  geometry,
}: {
  startSnap: SheetSnap;
  deltaY: number;
  endHeight: number;
  velocityY: number;
  geometry: SheetGeometry;
}): SheetSnap | 'closed' {
  if (startSnap === 'full') {
    if (deltaY > 48 || velocityY > 0.55) return 'peek';
    return 'full';
  }
  if (deltaY > 64 || velocityY > 0.55) return 'closed';
  if (deltaY < -40 || velocityY < -0.55) return 'full';
  return endHeight >= (geometry.peekHeight + geometry.fullHeight) / 2 ? 'full' : 'peek';
}

/**
 * The height while dragging: never above `full`; never below `peek` when the drag started in
 * full, and never below 96 px when it started at peek.
 */
export function dragHeight(
  startSnap: SheetSnap,
  startHeight: number,
  deltaY: number,
  geometry: SheetGeometry,
) {
  const lowest = startSnap === 'full' ? geometry.peekHeight : 96;
  return Math.min(geometry.fullHeight, Math.max(lowest, startHeight - deltaY));
}

/** A drag of the handle (pointer) or of the body (touch). */
export type SheetDrag = {
  /** The pointer id, or a negative number derived from the touch identifier. */
  pointerId: number;
  startSnap: SheetSnap;
  startY: number;
  startHeight: number;
  height: number;
  lastY: number;
  lastTime: number;
  velocityY: number;
  moved: boolean;
};

export function startDrag(
  startSnap: SheetSnap,
  y: number,
  geometry: SheetGeometry,
  time: number,
  pointerId: number,
): SheetDrag {
  const startHeight = startSnap === 'full' ? geometry.fullHeight : geometry.peekHeight;
  return {
    pointerId,
    startSnap,
    startY: y,
    startHeight,
    height: startHeight,
    lastY: y,
    lastTime: time,
    velocityY: 0,
    moved: false,
  };
}

/** Follows the pointer: updates the velocity, the moved flag and the height. */
export function moveDrag(drag: SheetDrag, y: number, geometry: SheetGeometry, time: number) {
  const elapsed = Math.max(1, time - drag.lastTime);
  drag.velocityY = (y - drag.lastY) / elapsed;
  drag.lastY = y;
  drag.lastTime = time;
  drag.moved = drag.moved || Math.abs(y - drag.startY) > tapSlop;
  drag.height = dragHeight(drag.startSnap, drag.startHeight, y - drag.startY, geometry);
}

/** Where the drag ends. A pointer that rested for more than 80 ms releases without a flick. */
export function endDrag(drag: SheetDrag, y: number, geometry: SheetGeometry, time: number) {
  return sheetRelease({
    startSnap: drag.startSnap,
    deltaY: y - drag.startY,
    endHeight: drag.height,
    velocityY: time - drag.lastTime > 80 ? 0 : drag.velocityY,
    geometry,
  });
}

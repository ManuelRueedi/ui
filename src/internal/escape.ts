/**
 * Whether an Escape key press belongs to the focused field rather than to a dialog around it:
 * content marked it as used (defaultPrevented), or a search field with text takes it to clear
 * itself, as browsers do inside a native modal dialog.
 */
export function escapeUsedInside(event: { defaultPrevented: boolean; target: EventTarget | null }) {
  if (event.defaultPrevented) return true;
  const { target } = event;
  return target instanceof HTMLInputElement && target.type === 'search' && target.value !== '';
}

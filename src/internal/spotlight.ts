// Ported from messen.app src/lib/actions/spotlight.ts. Plain DOM code, used through useSpotlight.
export type SpotlightOptions = {
  disabled?: boolean;
  focus?: boolean;
  keyboard?: boolean;
  pulse?: boolean;
};

const defaultOptions: Required<SpotlightOptions> = {
  disabled: false,
  focus: true,
  keyboard: true,
  pulse: true,
};

type Phase = 'expanding' | 'pulsing' | 'contracting';

export function spotlight(node: HTMLElement, options: SpotlightOptions = {}) {
  let current = { ...defaultOptions, ...options };
  let phase: Phase | undefined;
  let pressed = false;
  let expanded = false;
  let generation = 0;

  function isDisabled() {
    return (
      current.disabled || node.matches(':disabled') || node.getAttribute('aria-disabled') === 'true'
    );
  }

  function ownsEvent(event: Event) {
    return (
      event.target instanceof Element && event.target.closest('[data-spotlight-surface]') === node
    );
  }

  function syncAttributes() {
    node.toggleAttribute('data-spotlight-surface', true);
    node.toggleAttribute('data-spotlight-disabled', isDisabled());
    node.toggleAttribute('data-spotlight-focus', current.focus);
  }

  function setPhase(next: Phase | undefined) {
    phase = next;
    for (const name of ['expanding', 'pulsing', 'contracting'] as const) {
      node.toggleAttribute(`data-spotlight-${name}`, name === next);
    }
  }

  function setSpot(event?: PointerEvent) {
    const rect = node.getBoundingClientRect();
    const width = node.offsetWidth;
    const height = node.offsetHeight;
    const x = event && rect.width ? ((event.clientX - rect.left) * width) / rect.width : width / 2;
    const y =
      event && rect.height ? ((event.clientY - rect.top) * height) / rect.height : height / 2;
    node.style.setProperty('--mx', `${x}px`);
    node.style.setProperty('--my', `${y}px`);
    // The mask fades out at 75% of its radius; reach the farthest corner even for edge clicks.
    const radius = Math.hypot(Math.max(x, width - x), Math.max(y, height - y)) / 0.75;
    node.style.setProperty('--spot-r-max', `${Math.ceil(radius)}px`);
  }

  function cancelPending() {
    generation += 1;
  }

  function afterTransition(done: () => void) {
    const started = generation;
    const animations =
      typeof node.getAnimations === 'function' ? node.getAnimations({ subtree: true }) : [];
    const transitions = animations.filter((animation) => {
      const effect = animation.effect as KeyframeEffect | null;
      return (
        effect?.target === node &&
        (effect.pseudoElement === '::before' || effect.pseudoElement === '::after') &&
        'transitionProperty' in animation &&
        (animation.transitionProperty === '--spot-r' || animation.transitionProperty === 'opacity')
      );
    });

    // CSS owns the timing, including reduced motion. A new press invalidates old completions.
    void Promise.allSettled(transitions.map((animation) => animation.finished)).then(() => {
      if (generation === started && !isDisabled()) done();
    });
  }

  function contract() {
    setPhase('contracting');
    afterTransition(() => setPhase(undefined));
  }

  function expand() {
    setPhase('pulsing');
    afterTransition(() => {
      expanded = true;
      if (!pressed) contract();
    });
  }

  function press() {
    if (!current.pulse || isDisabled()) return;

    const visible = Number(getComputedStyle(node, '::before').opacity) > 0;
    const restarting = (phase && phase !== 'expanding') || visible;
    cancelPending();
    pressed = true;
    expanded = false;
    node.toggleAttribute('data-spotlight-quiet', true);

    if (restarting) {
      // Continue the hover glow or reverse a contraction from its current radius.
      expand();
      return;
    }

    setPhase('expanding');
    // Commit the zero-radius starting style without delaying the pulse by extra frames.
    void getComputedStyle(node, '::before').getPropertyValue('--spot-r');
    expand();
  }

  function release() {
    pressed = false;
    if (phase === 'pulsing' && expanded) contract();
  }

  function handlePointerMove(event: PointerEvent) {
    if (!ownsEvent(event) || isDisabled() || phase || event.pointerType !== 'mouse') return;
    setSpot(event);
    node.toggleAttribute('data-spotlight-quiet', false);
  }

  function handlePointerDown(event: PointerEvent) {
    if (!ownsEvent(event) || isDisabled() || !event.isPrimary || event.button !== 0) return;
    setSpot(event);
    press();
  }

  function handlePointerLeave(event: PointerEvent) {
    release();
    if (!phase && event.pointerType === 'mouse')
      node.toggleAttribute('data-spotlight-quiet', false);
  }

  function handleFocusIn() {
    if (isDisabled() || !current.focus || phase || !node.matches(':focus-visible')) return;
    setSpot();
    node.toggleAttribute('data-spotlight-quiet', false);
  }

  function handleKeydown(event: KeyboardEvent) {
    if (!ownsEvent(event) || isDisabled() || event.repeat) return;
    if (!phase && node.matches(':focus-visible'))
      node.toggleAttribute('data-spotlight-quiet', false);
    if (!current.keyboard || (event.key !== ' ' && event.key !== 'Enter')) return;
    setSpot();
    press();
  }

  function handleKeyup(event: KeyboardEvent) {
    if (ownsEvent(event) && current.keyboard && (event.key === ' ' || event.key === 'Enter'))
      release();
  }

  node.addEventListener('pointermove', handlePointerMove);
  node.addEventListener('pointerdown', handlePointerDown);
  node.addEventListener('pointerup', release);
  node.addEventListener('pointercancel', release);
  node.addEventListener('pointerleave', handlePointerLeave);
  node.addEventListener('focusin', handleFocusIn);
  node.addEventListener('focusout', release);
  node.addEventListener('keydown', handleKeydown);
  node.addEventListener('keyup', handleKeyup);
  syncAttributes();

  return {
    update(nextOptions: SpotlightOptions = {}) {
      current = { ...defaultOptions, ...nextOptions };
      syncAttributes();
      if (isDisabled()) {
        cancelPending();
        pressed = false;
        setPhase(undefined);
      }
    },
    destroy() {
      cancelPending();
      node.removeEventListener('pointermove', handlePointerMove);
      node.removeEventListener('pointerdown', handlePointerDown);
      node.removeEventListener('pointerup', release);
      node.removeEventListener('pointercancel', release);
      node.removeEventListener('pointerleave', handlePointerLeave);
      node.removeEventListener('focusin', handleFocusIn);
      node.removeEventListener('focusout', release);
      node.removeEventListener('keydown', handleKeydown);
      node.removeEventListener('keyup', handleKeyup);
      setPhase(undefined);
      for (const name of ['surface', 'disabled', 'focus', 'quiet']) {
        node.removeAttribute(`data-spotlight-${name}`);
      }
      for (const name of ['--mx', '--my', '--spot-r-max']) node.style.removeProperty(name);
    },
  };
}

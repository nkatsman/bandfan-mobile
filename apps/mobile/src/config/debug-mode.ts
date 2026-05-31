export type DebugThumbHand = 'left' | 'right';

/**
 * Debug mode flags (code-only).
 *
 * No UI toggles, commands, or routes should mutate these at runtime.
 * Flip these constants in code when needed during development.
 */
export const DEBUG_MODE = __DEV__ && false;

export const DEBUG_THUMB_ZONES_ENABLED = DEBUG_MODE && false;

export const DEBUG_THUMB_ZONES_HAND: DebugThumbHand = 'right';

export const DEBUG_THUMB_ZONES_OPACITY = 0.3;

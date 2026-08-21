/**
 * Web half of the haptics helper — see `haptics.ts` for the contract and for why these
 * are split at all.
 *
 * There is nothing to do here. A desktop has no vibration hardware, `navigator.vibrate`
 * is missing from Safari entirely and gated behind engagement heuristics elsewhere, and
 * what it does offer is a flat buzz for n milliseconds — not the graded taps the native
 * side is built on. A no-op is a better answer than an approximation of one.
 */

export type HapticFeel = 'tap' | 'land' | 'success' | 'nearMiss';

export function haptic(_feel: HapticFeel): void { }

// Web half of the haptics helper — see `haptics.ts` for the contract and for why these are split at all.

export type HapticFeel = 'tap' | 'land' | 'success' | 'nearMiss';

export function haptic(_feel: HapticFeel): void { }

/**
 * What the app has been told about which scheme to wear.
 *
 * Three modes but only two schemes: `system` is the state a fresh install is in, where
 * the app follows the device and changes with it. Touching the toggle replaces it with
 * an explicit choice, and there is no way back to `system` from the UI — one button
 * that cycles three states would need to say which of the three it is in, and the flip
 * this app wants is a flip.
 */
export type ThemeMode = 'system' | 'light' | 'dark';

const MODES: ThemeMode[] = ['system', 'light', 'dark'];

/** Narrows whatever came back out of storage, which is a string at best. */
export function isThemeMode(value: string | null | undefined): value is ThemeMode {
    return value != null && (MODES as string[]).includes(value);
}

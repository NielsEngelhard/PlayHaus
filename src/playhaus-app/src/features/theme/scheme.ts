import type { Scheme } from '@/constants/theme';

/**
 * Narrows whatever came back out of storage, which is a string at best.
 *
 * There used to be a third state alongside the two schemes — `system`, "wear whatever
 * the device is wearing" — and a fresh install started in it. It is gone: the app is
 * light until somebody says otherwise, and a phone that happens to be in dark mode is
 * not somebody saying otherwise. Nothing ever wrote `system` to disk (the toggle only
 * ever picked one of the two real schemes), but this is a guard rather than a cast
 * precisely so that a value from a build that no longer exists reads as "never chosen"
 * and lands on light, instead of being handed to the provider as a scheme it cannot
 * resolve.
 */
export function isScheme(value: string | null | undefined): value is Scheme {
    return value === 'light' || value === 'dark';
}

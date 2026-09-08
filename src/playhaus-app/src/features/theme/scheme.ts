import type { Scheme } from '@/constants/theme';

// Narrows whatever came back out of storage, which is a string at best.
export function isScheme(value: string | null | undefined): value is Scheme {
    return value === 'light' || value === 'dark';
}

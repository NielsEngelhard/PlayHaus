import { en } from '@/features/i18n/locales/en';
import { nl } from '@/features/i18n/locales/nl';

/** Widens a catalog's literal string types back to plain `string`, at every depth. */
type Deep<T> = T extends string ? string : { [K in keyof T]: Deep<T[K]> };

// `en`'s shape, with every leaf widened back to `string`.
export type Catalog = Deep<typeof en>;

// Every language, bundled into the build.
export const resources = {
    en: { translation: en },
    nl: { translation: nl }
} as const;

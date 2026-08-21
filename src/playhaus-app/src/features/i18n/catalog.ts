import { en } from '@/features/i18n/locales/en';
import { nl } from '@/features/i18n/locales/nl';

/** Widens a catalog's literal string types back to plain `string`, at every depth. */
type Deep<T> = T extends string ? string : { [K in keyof T]: Deep<T[K]> };

/**
 * `en`'s shape, with every leaf widened back to `string`.
 *
 * A straight `typeof en` would not do: `as const` froze English's values into literal
 * types, so a Dutch catalog typed with it would have to *be* the English strings. This
 * keeps the half of the check that matters — every key present, no key invented — and
 * drops the values.
 */
export type Catalog = Deep<typeof en>;

/**
 * Every language, bundled into the build.
 *
 * No backend and no fetch: Metro has already put both catalogs in the bundle, so a
 * lookup is a property access on an object that is always in memory. That is what buys
 * the app a first paint with no loading state and no flash of untranslated keys — and
 * it is why `i18n.ts` can safely `init()` at module scope even for the web export,
 * which pre-renders in Node.
 */
export const resources = {
    en: { translation: en },
    nl: { translation: nl }
} as const;

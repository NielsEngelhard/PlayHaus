import 'i18next';
import type { en } from '@/features/i18n/locales/en';

/**
 * Teaches i18next what this app can actually say.
 *
 * `typeof en` rather than a hand-written union of key strings: the English catalog *is*
 * the shape, so a key that does not exist is a red squiggle at the call site and a key
 * that gets deleted breaks every caller — the check you want, for free, with no
 * generation step.
 *
 * Two things keep this working. It has to stay a module, hence the bare `import
 * 'i18next'` above; without it `declare module` replaces i18next's own types instead of
 * extending them. And the values here have to keep matching the runtime options in
 * `i18n.ts` — they are two halves of one statement, and TypeScript only checks this one.
 *
 * `strictKeyChecks` is deliberately left off: `index.tsx` resolves `Game.tagKeys` by
 * mapping `t` over a union of keys rather than a literal, which is the corner of these
 * types it interacts with worst.
 */
declare module 'i18next' {
    interface CustomTypeOptions {
        defaultNS: 'translation';
        resources: { translation: typeof en };
        returnNull: false;
    }
}

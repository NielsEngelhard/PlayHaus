import 'i18next';
import type { en } from '@/features/i18n/locales/en';

// Teaches i18next what this app can actually say.
declare module 'i18next' {
    interface CustomTypeOptions {
        defaultNS: 'translation';
        resources: { translation: typeof en };
        returnNull: false;
    }
}

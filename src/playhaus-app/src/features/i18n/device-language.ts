import { isLanguageCode, type LanguageCode } from '@/constants/languages';
import { getLocales } from 'expo-localization';

// The first language on the device's own preference list that this app ships a catalog for, or `null` when it ships none of them.
export function deviceLanguage(): LanguageCode | null {
    for (const locale of getLocales()) {
        if (isLanguageCode(locale.languageCode)) return locale.languageCode;
    }

    return null;
}

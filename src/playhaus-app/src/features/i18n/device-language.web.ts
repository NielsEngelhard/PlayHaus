import { isLanguageCode, type LanguageCode } from '@/constants/languages';

// The web half of `device-language.ts`.
export function deviceLanguage(): LanguageCode | null {
    if (typeof window === 'undefined') return null;

    // `languages` is the full ordered preference list.
    const tags = window.navigator.languages ?? [window.navigator.language];

    for (const tag of tags) {
        // 'nl-BE' -> 'nl'.
        const code = tag?.split('-')[0]?.toLowerCase();

        if (isLanguageCode(code)) return code;
    }

    return null;
}

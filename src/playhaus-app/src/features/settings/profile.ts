import type { LanguageCode } from "@/constants/languages";
import type { TranslationKey } from "@/features/i18n/keys";
import Feather from "@expo/vector-icons/Feather";

export const NAME_MIN_LENGTH = 4;
export const NAME_MAX_LENGTH = 16;

export type SettingKey = 'enableSounds' | 'enableMusic' | 'enableVibration';

export interface Setting {
    key: SettingKey,
    icon: keyof typeof Feather.glyphMap,
    titleKey: TranslationKey,
    descriptionKey: TranslationKey
}

export const SETTINGS: Setting[] = [
    { key: 'enableSounds',    icon: 'volume-2',   titleKey: 'profile.settings.sounds.title',    descriptionKey: 'profile.settings.sounds.description' },
    { key: 'enableMusic',     icon: 'music',      titleKey: 'profile.settings.music.title',     descriptionKey: 'profile.settings.music.description' },
    { key: 'enableVibration', icon: 'smartphone', titleKey: 'profile.settings.vibration.title', descriptionKey: 'profile.settings.vibration.description' }
];

const RANDOM_NAME_PARTS: Record<LanguageCode, { adjectives: string[], nouns: string[] }> = {
    nl: {
        adjectives: ['Snelle', 'Stille', 'Gouden', 'Wilde', 'Slimme', 'Rode'],
        nouns: ['Tijger', 'Vos', 'Uil', 'Haas', 'Mus', 'Das']
    },
    en: {
        adjectives: ['Swift', 'Quiet', 'Golden', 'Wild', 'Clever', 'Red'],
        nouns: ['Tiger', 'Fox', 'Owl', 'Hare', 'Wren', 'Badger']
    }
};

export function randomName(language: LanguageCode): string {
    const parts = RANDOM_NAME_PARTS[language];
    const pick = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)];
    const number = Math.floor(Math.random() * 90) + 10;

    return `${pick(parts.adjectives)}${pick(parts.nouns)}${number}`
        .slice(0, NAME_MAX_LENGTH);
}

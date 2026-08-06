import { Colors } from "@/constants/theme";
import Feather from "@expo/vector-icons/Feather";

/**
 * Stand-in profile data. There are no accounts yet, so the profile page reads from here
 * and keeps every edit in component state — nothing is persisted or sent anywhere.
 * Swap this module out for the real store once accounts land.
 */

export const NAME_MAX_LENGTH = 16;

export interface AvatarColor {
    id: string,
    /** Read aloud by screen readers, since the swatch itself is just a colour. */
    label: string,
    color: string,
    /** Ink or paper, whichever stays readable on top of `color`. */
    foreground: string
}

export const AVATAR_COLORS: AvatarColor[] = [
    { id: 'lemon', label: 'Citroen', color: Colors.light.lemon, foreground: Colors.light.text },
    { id: 'fire', label: 'Vuur', color: Colors.light.primary, foreground: Colors.light.textOnAccent },
    { id: 'cobalt', label: 'Kobalt', color: Colors.light.secondary, foreground: Colors.light.textOnAccent },
    { id: 'mint', label: 'Mint', color: Colors.light.mint, foreground: Colors.light.text },
    { id: 'blush', label: 'Blush', color: Colors.light.blush, foreground: Colors.light.text },
    { id: 'ink', label: 'Inkt', color: Colors.light.text, foreground: Colors.light.textOnAccent }
];

export function avatarColorById(id: string): AvatarColor {
    return AVATAR_COLORS.find(color => color.id === id) ?? AVATAR_COLORS[0];
}

export type SettingKey = 'sound' | 'vibration';

export interface Setting {
    key: SettingKey,
    icon: keyof typeof Feather.glyphMap,
    title: string,
    description: string
}

export const SETTINGS: Setting[] = [
    {
        key: 'sound',
        icon: 'volume-2',
        title: 'Geluid',
        description: 'Kleine bliepjes bij een goede letter.'
    },
    {
        key: 'vibration',
        icon: 'smartphone',
        title: 'Trillen',
        description: 'Korte haptic feedback op mobiel.'
    }
];

export interface MockProfile {
    name: string,
    avatarColorId: string,
    settings: Record<SettingKey, boolean>
}

export const MOCK_PROFILE: MockProfile = {
    name: 'Tiger28',
    avatarColorId: 'lemon',
    settings: {
        sound: true,
        vibration: true
    }
};

const RANDOM_NAME_PARTS = {
    adjectives: ['Snelle', 'Stille', 'Gouden', 'Wilde', 'Slimme', 'Rode'],
    nouns: ['Tijger', 'Vos', 'Uil', 'Haas', 'Mus', 'Das']
};

/** A throwaway name for the dice button, kept inside `NAME_MAX_LENGTH`. */
export function randomName(): string {
    const pick = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)];
    const number = Math.floor(Math.random() * 90) + 10;

    return `${pick(RANDOM_NAME_PARTS.adjectives)}${pick(RANDOM_NAME_PARTS.nouns)}${number}`
        .slice(0, NAME_MAX_LENGTH);
}

import { Colors } from "@/constants/theme";
import Feather from "@expo/vector-icons/Feather";

/**
 * The presentational half of a profile.
 *
 * What the account actually stores is small — a name, which swatch was picked,
 * two booleans — and that lives on the API. Everything here is how those turn
 * into something on screen: the hex behind a swatch id, the icon and copy for a
 * preference row. Restyling the palette is a change to this file alone.
 */

/** Kept in step with `NameMaxLength` in the Go backend, which refuses anything longer. */
export const NAME_MAX_LENGTH = 16;

export interface AvatarColor {
    id: string,
    /** Read aloud by screen readers, since the swatch itself is just a colour. */
    label: string,
    color: string,
    /** Ink or paper, whichever stays readable on top of `color`. */
    foreground: string
}

/** The ids here are the ones the backend accepts — adding one means adding it there too. */
export const AVATAR_COLORS: AvatarColor[] = [
    { id: 'lemon',  label: 'Citroen', color: Colors.light.lemon,     foreground: Colors.light.text },
    { id: 'fire',   label: 'Vuur',    color: Colors.light.primary,   foreground: Colors.light.textOnAccent },
    { id: 'cobalt', label: 'Kobalt',  color: Colors.light.secondary, foreground: Colors.light.textOnAccent },
    { id: 'mint',   label: 'Mint',    color: Colors.light.mint,      foreground: Colors.light.text },
    { id: 'blush',  label: 'Blush',   color: Colors.light.blush,     foreground: Colors.light.text },
    { id: 'ink',    label: 'Inkt',    color: Colors.light.text,      foreground: Colors.light.textOnAccent }
];

export function avatarColorById(id: string): AvatarColor {
    return AVATAR_COLORS.find(color => color.id === id) ?? AVATAR_COLORS[0];
}

/** Named after the field on the user, so a row reads its value straight off the profile. */
export type SettingKey = 'soundEnabled' | 'vibrationEnabled';

export interface Setting {
    key: SettingKey,
    icon: keyof typeof Feather.glyphMap,
    title: string,
    description: string
}

export const SETTINGS: Setting[] = [
    { key: 'soundEnabled',     icon: 'volume-2',   title: 'Geluid', description: 'Kleine bliepjes bij een goede letter.' },
    { key: 'vibrationEnabled', icon: 'smartphone', title: 'Trillen', description: 'Korte haptic feedback op mobiel.' }
];

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

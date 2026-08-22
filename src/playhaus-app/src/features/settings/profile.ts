import type { LanguageCode } from "@/constants/languages";
import { Brand } from "@/constants/theme";
import type { TranslationKey } from "@/features/i18n/keys";
import Feather from "@expo/vector-icons/Feather";

/**
 * The presentational half of a profile.
 *
 * What the account actually stores is small — a name, which swatch was picked,
 * two booleans — and that lives on the API. Everything here is how those turn
 * into something on screen: the hex behind a swatch id, the icon and copy for a
 * preference row. Restyling the palette is a change to this file alone.
 */

/**
 * Kept in step with `NameMinLength` and `NameMaxLength` in the Go backend, which
 * refuses anything outside them. Enforced here as well so the common mistake is
 * a greyed-out button rather than a round trip that comes back with a complaint.
 */
export const NAME_MIN_LENGTH = 4;
export const NAME_MAX_LENGTH = 16;

export interface AvatarColor {
    id: string,
    /**
     * Read aloud by screen readers, since the swatch itself is just a colour.
     *
     * A catalogue key, because this list is built at module load where no hook can
     * reach. The picker resolves it at render.
     */
    labelKey: TranslationKey,
    color: string,
    /** Ink or paper, whichever stays readable on top of `color`. */
    foreground: string
}

/** The ids here are the ones the backend accepts — adding one means adding it there too. */
export const AVATAR_COLORS: AvatarColor[] = [
    { id: 'lemon',  labelKey: 'profile.colors.lemon',  color: Brand.lemon,     foreground: Brand.ink },
    { id: 'fire',   labelKey: 'profile.colors.fire',   color: Brand.primary,   foreground: Brand.textOnAccent },
    { id: 'cobalt', labelKey: 'profile.colors.cobalt', color: Brand.secondary, foreground: Brand.textOnAccent },
    { id: 'mint',   labelKey: 'profile.colors.mint',   color: Brand.mint,      foreground: Brand.ink },
    { id: 'blush',  labelKey: 'profile.colors.blush',  color: Brand.blush,     foreground: Brand.ink },
    { id: 'ink',    labelKey: 'profile.colors.ink',    color: Brand.ink,       foreground: Brand.textOnAccent }
];

export function avatarColorById(id: string): AvatarColor {
    return AVATAR_COLORS.find(color => color.id === id) ?? AVATAR_COLORS[0];
}

/**
 * Named after the field on the user, so a row reads its value straight off the
 * profile and writes back through the endpoint of the same name. There are no
 * defaults to fall back on: `/me` carries all three, and a fresh account starts
 * with every one of them on.
 */
export type SettingKey = 'enableSounds' | 'enableMusic' | 'enableVibration';

export interface Setting {
    key: SettingKey,
    icon: keyof typeof Feather.glyphMap,
    /** Catalogue keys, for the same module-load reason as `AVATAR_COLORS`. */
    titleKey: TranslationKey,
    descriptionKey: TranslationKey
}

export const SETTINGS: Setting[] = [
    { key: 'enableSounds',    icon: 'volume-2',   titleKey: 'profile.settings.sounds.title',    descriptionKey: 'profile.settings.sounds.description' },
    { key: 'enableMusic',     icon: 'music',      titleKey: 'profile.settings.music.title',     descriptionKey: 'profile.settings.music.description' },
    { key: 'enableVibration', icon: 'smartphone', titleKey: 'profile.settings.vibration.title', descriptionKey: 'profile.settings.vibration.description' }
];

/**
 * The dice button's vocabulary, per language.
 *
 * Word lists rather than copy, so they live here rather than in the catalogue: nothing
 * on screen says any of these, and a translator handed "Vos" in a list of interface
 * strings has no way to know it is one half of a generated nickname.
 *
 * Every pair has to survive `NAME_MAX_LENGTH` with a two-digit suffix on the end, which
 * is what keeps both halves short.
 */
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

/**
 * A throwaway name for the dice button, kept inside `NAME_MAX_LENGTH`.
 *
 * Takes the interface language rather than the account's game locale: this is a word
 * the player is about to read on their own screen, not one that travels anywhere.
 */
export function randomName(language: LanguageCode): string {
    const parts = RANDOM_NAME_PARTS[language];
    const pick = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)];
    const number = Math.floor(Math.random() * 90) + 10;

    return `${pick(parts.adjectives)}${pick(parts.nouns)}${number}`
        .slice(0, NAME_MAX_LENGTH);
}

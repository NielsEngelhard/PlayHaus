import { Brand } from "@/constants/theme";
import { TranslationKey } from "@/features/i18n/keys";

export interface AvatarColor {
    id: string,
    labelKey: TranslationKey,
    color: string,
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

export function colorForSeat(seat: number): AvatarColor {
    return AVATAR_COLORS[seat % AVATAR_COLORS.length];
}
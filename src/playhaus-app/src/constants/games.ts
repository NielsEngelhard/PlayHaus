import { ROUTES } from '@/constants/routes';
import { Brand } from '@/constants/theme';
import type { TranslationKey } from '@/features/i18n/keys';

/**
 * The games' display names. Shared rather than per-feature: the home list, the game
 * pages' copy, and the header capsule all show the same string.
 */
export const LEAGUE_OF_LETTERS_NAME: string = "League of Letters";
export const PUBQUIZR_NAME: string = "PubquizR";
export const THE_IMPOSTER_NAME: string = "The Imposter";

/**
 * How many devices a group needs to play.
 */
export type DeviceMode = 'perPlayer' | 'oneDevice' | 'perPlayerOrOneDevice';
export const DEVICE_MODE_KEYS: Record<DeviceMode, TranslationKey> = {
    perPlayer: 'games.device.perPlayer',
    oneDevice: 'games.device.oneDevice',
    perPlayerOrOneDevice: 'games.device.perPlayerOrOneDevice',
};

export interface Game {
    slug: string,
    name: string,
    color: string,
    gradient: readonly [string, string, string],
    glyphInk: Record<'light' | 'dark', string>,
    descriptionKey: TranslationKey,
    mainCategoryIndicatorKey: TranslationKey,
    playable: boolean,
    navigationUrl: string,
    deviceMode: DeviceMode,
    minMaxPlayersIndicator: string
}

/**
 * Every game the app knows about. The home page renders this list, and `Header` looks
 * the current route up in it — one registry so a game's name and accent can't drift
 * between the card you tapped and the chrome you land in.
 */
export const GAMES: Game[] = [
    {
        slug: 'league-of-letters',
        name: LEAGUE_OF_LETTERS_NAME,
        color: Brand.primary,
        gradient: ['#FF7A45', Brand.primary, '#E04407'],
        glyphInk: { light: Brand.textOnAccent, dark: Brand.ink },
        mainCategoryIndicatorKey: 'games.leagueOfLetters.mainCategory',
        descriptionKey: 'games.leagueOfLetters.description',
        deviceMode: 'perPlayer',
        playable: true,
        navigationUrl: ROUTES.leagueOfLettersIndex,
        minMaxPlayersIndicator: "1-6"
    },
    {
        slug: 'quizzer',
        name: PUBQUIZR_NAME,
        color: Brand.secondary,
        gradient: ['#6C7BFF', Brand.secondary, '#2634C4'],
        glyphInk: { light: Brand.textOnAccent, dark: Brand.textOnAccent },
        mainCategoryIndicatorKey: 'games.quizzer.mainCategory',
        descriptionKey: 'games.quizzer.description',
        deviceMode: 'oneDevice',
        playable: true,
        navigationUrl: ROUTES.quizzerIndex,
        minMaxPlayersIndicator: "2-10"
    },
    {
        slug: 'imposter',
        name: THE_IMPOSTER_NAME,
        color: Brand.mint,
        gradient: ['#A8F5D6', Brand.mint, '#35C99A'],
        glyphInk: { light: Brand.textOnAccent, dark: Brand.textOnAccent },
        mainCategoryIndicatorKey: 'games.imposter.mainCategory',
        descriptionKey: 'games.imposter.description',
        deviceMode: 'oneDevice',
        playable: true,
        navigationUrl: ROUTES.imposterIndex,
        minMaxPlayersIndicator: "3-10"
    }    
];

/**
 * The game a path sits inside, or `null` anywhere outside `/games/{slug}`.
 *
 * Matches on the first segment after `/games/` only, so every page of a game — its
 * index, its settings, a room at `/room/ABCD` — resolves to the same entry.
 */
export function gameForPathname(pathname: string): Game | null {
    const slug = /^\/games\/([^/]+)/.exec(pathname)?.[1];
    if (!slug) return null;

    return GAMES.find(game => game.slug === slug) ?? null;
}

/**
 * A game by its `/games/{slug}` segment, or `null` for a slug this build has no
 * entry for.
 *
 * The reconnect rows use this: the wire tells them which *type* of game they are
 * drawing, and this turns that into the same glyph, gradient and accent the home
 * card wears — so one game has one face wherever it turns up.
 */
export function gameBySlug(slug: string): Game | null {
    return GAMES.find(game => game.slug === slug) ?? null;
}

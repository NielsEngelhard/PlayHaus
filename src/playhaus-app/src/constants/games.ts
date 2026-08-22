import { ROUTES } from '@/constants/routes';
import { Brand } from '@/constants/theme';
import type { TranslationKey } from '@/features/i18n/keys';

/**
 * The games' display names. Shared rather than per-feature: the home list, the game
 * pages' copy, and the header capsule all show the same string.
 */
export const LEAGUE_OF_LETTERS_NAME: string = "League of Letters";
export const PUBQUIZR_NAME: string = "PubquizR";

/**
 * How many devices a group needs to play.
 *
 * `perPlayer` — everyone plays on their own screen. `shared` — one screen the whole
 * table plays around, passed or propped up between them.
 */
export type DeviceMode = 'perPlayer' | 'shared';

/**
 * The catalogue line for each mode. Here rather than in the card because this is the
 * registry meeting the catalogue, which is what the rest of this file is for.
 */
export const DEVICE_MODE_KEYS: Record<DeviceMode, TranslationKey> = {
    perPlayer: 'games.device.perPlayer',
    shared: 'games.device.shared'
};

export interface Game {
    /** The `/games/{slug}` path segment. What the header matches a route on. */
    slug: string,
    /** A brand, so it reads the same in every language and is never translated. */
    name: string,
    /** Accent from `Brand` — fixed, so a game looks the same in either scheme. */
    color: string,
    /**
     * The fill behind the game's glyph on its home card: three stops on a 160° axis,
     * lightest first. A flat accent looks pasted on at 78px; the gradient is what makes
     * the tile read as an object.
     */
    gradient: readonly [string, string, string],
    /**
     * Ink for the glyph sitting on that gradient, per scheme.
     *
     * Two entries rather than one because the schemes take opposite decisions on the
     * warm tile: dark puts ink on it, the way it does on every bright fill it uses,
     * while light keeps paper. On the cooler, darker fills both schemes use paper.
     */
    glyphInk: Record<'light' | 'dark', string>,
    /**
     * The facts chips on the home card, one catalogue key per chip.
     *
     * A list of keys rather than the single `'Word · 1-4 players'` this used to be. That
     * separator was a formatting rule a translator had to know about but was not free to
     * change, buried in a string they were otherwise free to rewrite — and it left the
     * number of chips in the hands of whoever typed the translation. A list puts the
     * shape in the registry and the wording in the catalogue, which is the split the rest
     * of this file already makes.
     */
    tagKeys: readonly TranslationKey[],
    /** Resolved at render — see `tagKeys` for why this is a key and not a string. */
    descriptionKey: TranslationKey,
    /**
     * How many devices the group needs. An enum, not a key: the wording is the same for
     * every game that plays this way, so only the card should have to know it.
     */
    deviceMode: DeviceMode,
    playable: boolean,
    navigationUrl: string
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
        tagKeys: ['games.leagueOfLetters.tag.category', 'games.leagueOfLetters.tag.players'],
        descriptionKey: 'games.leagueOfLetters.description',
        deviceMode: 'perPlayer',
        playable: true,
        navigationUrl: ROUTES.leagueOfLettersIndex
    },
    {
        slug: 'quizzer',
        name: PUBQUIZR_NAME,
        color: Brand.secondary,
        gradient: ['#6C7BFF', Brand.secondary, '#2634C4'],
        glyphInk: { light: Brand.textOnAccent, dark: Brand.textOnAccent },
        tagKeys: ['games.quizzer.tag.category', 'games.quizzer.tag.players'],
        descriptionKey: 'games.quizzer.description',
        deviceMode: 'shared',
        playable: false,
        navigationUrl: ROUTES.quizzerIndex
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

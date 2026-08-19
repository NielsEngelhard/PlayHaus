import { ROUTES } from '@/constants/routes';
import { Brand } from '@/constants/theme';

/**
 * The games' display names. Shared rather than per-feature: the home list, the game
 * pages' copy, and the header capsule all show the same string.
 */
export const LEAGUE_OF_LETTERS_NAME: string = "League of Letters";
export const PUBQUIZR_NAME: string = "PubquizR";

export interface Game {
    /** The `/games/{slug}` path segment. What the header matches a route on. */
    slug: string,
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
    /** Facts about the game, separated by `·`. Split into chips on the home card. */
    tag: string,
    description: string,
    playable: boolean,
    navigationUrl: string
}

/** The `tag` string as the individual chips the home card renders. */
export function tagChips(tag: string): string[] {
    return tag.split('·').map(part => part.trim()).filter(part => part.length > 0);
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
        tag: 'Word · 1-6 players',
        description: 'Domineer met jouw Vocabulair, solo of tegen je vrienden.',
        playable: true,
        navigationUrl: ROUTES.leagueOfLettersIndex
    },
    {
        slug: 'quizzer',
        name: PUBQUIZR_NAME,
        color: Brand.secondary,
        gradient: ['#6C7BFF', Brand.secondary, '#2634C4'],
        glyphInk: { light: Brand.textOnAccent, dark: Brand.textOnAccent },
        tag: 'Trivia · 2-10 players',
        description: 'Snelle pubquiz rondes. Nog even geduld, de vragen worden geslepen.',
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

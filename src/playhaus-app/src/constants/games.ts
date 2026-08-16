import { ROUTES } from '@/constants/routes';
import { Colors } from '@/constants/theme';

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
    /** Accent from `Colors.light`. The home card and the header dot share it. */
    color: string,
    tag: string,
    description: string,
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
        color: Colors.light.primary,
        tag: 'Word · 1-4 players',
        description: 'Domineer met jouw Vocabulair, solo of tegen je vrienden.',
        playable: true,
        navigationUrl: ROUTES.leagueOfLettersIndex
    },
    {
        slug: 'quizzer',
        name: PUBQUIZR_NAME,
        color: Colors.light.secondary,
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

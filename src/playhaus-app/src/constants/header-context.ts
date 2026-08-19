import { gameForPathname } from '@/constants/games';
import { ROUTES } from '@/constants/routes';
import { Brand } from '@/constants/theme';
import type Feather from '@expo/vector-icons/Feather';

/**
 * What the header says about where you are.
 *
 * Worked out from the route rather than pushed up by each screen. A page that had to
 * announce itself is a page that can forget to, and the symptom of forgetting is the
 * *previous* page's name sitting in the chrome — which is exactly the bug this used to
 * have. The route always knows.
 *
 * `headerContextFor` answers `null` for a screen that should have no header at all. A
 * board is the whole screen: the wordmark and the theme toggle are not what anyone needs
 * mid-round, and the round bar it draws for itself already carries the way out.
 */
export interface HeaderContext {
    /** Where the back chip goes, or `null` to show the wordmark in its place. */
    back: string | null
    /** The right-hand pill, or `null` to fall back to whoever is signed in. */
    pill: HeaderPill | null
    /**
     * A game's square mark, drawn in the pill's place rather than next to it.
     *
     * Only a game's own front page sets this. The hero underneath it is the game's name
     * at 32pt, and a pill spelling that out again in 11pt caps is the same word twice.
     */
    mark?: HeaderMark
}

export interface HeaderMark {
    /** The game's initial. */
    letter: string
    /** The notch in the tile's corner. */
    accent: string
    /** What the tile is, for anyone who cannot see the letter. */
    label: string
}

export interface HeaderPill {
    label: string
    /** The dot's fill, or the whole pill's when `filled`. */
    accent: string
    /** Shown instead of the dot. */
    icon?: keyof typeof Feather.glyphMap
    /** Fills the pill with `accent` and drops the label to ink, for a loud one. */
    filled?: boolean
}

/**
 * A game's own front page — `/games/{slug}` exactly, not the screens under it.
 */
function isGameHub(pathname: string): boolean {
    return /^\/games\/[^/]+$/.test(pathname);
}

export function headerContextFor(pathname: string): HeaderContext | null {
    // A board in progress. See `HeaderContext` above for why it goes bare.
    if (pathname === ROUTES.leagueOfLettersSolo) return null;

    // A multiplayer room: `/room` and `/room/{code}`, lobby and board alike.
    //
    // Bare for a reason of its own, on top of the board's. The chip in this header is a
    // `Link`, and on a lobby screen going back deletes the room — so the way out has to
    // be a button that asks first, which means the lobby has to draw its own top row.
    // Two back arrows would be one too many, and the wrong one would be the quiet one.
    if (pathname.startsWith(ROUTES.leagueOfLettersCreateRoom)) return null;

    // Setting up a solo game. Loud lemon rather than the game's own accent: this screen
    // is about one mode of one game, and the pill is the only thing on it that says
    // which mode.
    if (pathname === ROUTES.leagueOfLettersSoloSettings) {
        return {
            back: ROUTES.leagueOfLettersIndex,
            pill: { label: 'Solo', accent: Brand.lemon, icon: 'cpu', filled: true }
        };
    }

    const game = gameForPathname(pathname);

    if (game === null) {
        // Off a game entirely: the wordmark, and the corner is about you.
        return { back: null, pill: null };
    }

    // A game's front page: out to the games list, and the corner wears the game's mark.
    // Anywhere deeper the mark would be competing with whatever that screen is about, so
    // those keep the name pill.
    if (isGameHub(pathname)) {
        return {
            back: ROUTES.home,
            pill: null,
            mark: { letter: game.name[0], accent: game.color, label: game.name }
        };
    }

    return {
        back: null,
        pill: { label: game.name, accent: game.color }
    };
}

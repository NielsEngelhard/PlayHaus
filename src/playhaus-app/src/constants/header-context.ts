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

    return {
        back: isGameHub(pathname) ? ROUTES.home : null,
        pill: { label: game.name, accent: game.color }
    };
}

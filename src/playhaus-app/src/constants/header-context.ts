import { gameForPathname } from '@/constants/games';
import { ROUTES } from '@/constants/routes';
import { Brand } from '@/constants/theme';
import type Feather from '@expo/vector-icons/Feather';
import type { ImageSource } from 'expo-image';
import type { TFunction } from 'i18next';

/**
 * What the header says about where you are.
 *
 * Worked out from the route rather than pushed up by each screen. A page that had to
 * announce itself is a page that can forget to, and the symptom of forgetting is the
 * *previous* page's name sitting in the chrome — which is exactly the bug this used to
 * have. The route always knows.
 *
 * Every route gets one, boards and lobbies included. Those screens draw a top row of
 * their own underneath this, and that row is where the way out lives: leaving one of them
 * either abandons a round or deletes a room, and the chip in this header is a plain
 * `Link` that cannot ask first. So they get the wordmark in the left slot rather than a
 * back chip — the header is here to say which game you are in and to keep the theme
 * toggle reachable, and the page's own row carries the leaving.
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
    /** The game's own icon. */
    icon: ImageSource
    /** What the tile is, for anyone who cannot see the icon. */
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

/**
 * Takes the translator rather than storing a key, unlike the registries next door.
 *
 * There is exactly one word here that comes out of the catalogue, and one caller to
 * hand it in: a `labelKey` on `HeaderPill` would mean every other label, all of which
 * are brand names that must never be translated, having to say so.
 */
export function headerContextFor(pathname: string, t: TFunction): HeaderContext {
    // Setting up a solo game. Loud lemon rather than the game's own accent: this screen
    // is about one mode of one game, and the pill is the only thing on it that says
    // which mode.
    if (pathname === ROUTES.leagueOfLettersSoloSettings) {
        return {
            back: ROUTES.leagueOfLettersIndex,
            pill: { label: t('reconnect.mode.solo'), accent: Brand.lemon, icon: 'cpu', filled: true }
        };
    }

    // Trading a guest account in for a real one. The only page off a game with a way
    // back, and it needs one: it is reached from the profile rather than from the tab
    // bar, so the bottom bar cannot say where it came from.
    if (pathname === ROUTES.upgradeAccount) {
        return { back: ROUTES.profile, pill: null };
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
            mark: { icon: game.icon, label: game.name }
        };
    }

    return {
        back: null,
        pill: { label: game.name, accent: game.color }
    };
}

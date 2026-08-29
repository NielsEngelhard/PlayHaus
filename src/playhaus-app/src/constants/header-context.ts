import { gameForPathname } from '@/constants/games';
import { ROUTES } from '@/constants/routes';
import type Feather from '@expo/vector-icons/Feather';
import type { ImageSource } from 'expo-image';

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
 * Whether the page at this route paints its own colour up behind the header.
 *
 * A game's front page does: its accent slab reaches past the gutters and up over the
 * header's 66dp (see `GameIndexPage`), and a band drawn from inside the page slot would
 * otherwise be laid over the chrome — the way out and the theme switch included. The
 * layout answers this by drawing the header *above* the page slot on these routes, which
 * is the one arrangement the slab needs and the one `HandoffScreen` must not have: that
 * screen covers the header on purpose.
 *
 * Read off the route rather than pushed up by the page, for the same reason as
 * everything else in this file.
 */
export function headerOverAccent(pathname: string): boolean {
    return isGameHub(pathname);
}

/**
 * Every label this can answer with is a brand name, so nothing here is translated. The
 * one word that used to be — the solo setup screen's mode pill — left with that screen's
 * header; a `labelKey` on `HeaderPill` is what a next one would want.
 */
export function headerContextFor(pathname: string): HeaderContext {
    // Nothing here for the solo setup screen, which is drawn without this header at all:
    // `SettingsPageBase` is the page, and the way out and the theme switch sit on the
    // band it draws itself. See `useChromeless`.

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

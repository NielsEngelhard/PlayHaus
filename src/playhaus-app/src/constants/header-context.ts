import { gameForPathname } from '@/constants/games';
import { ROUTES } from '@/constants/routes';
import type Feather from '@expo/vector-icons/Feather';
import type { ImageSource } from 'expo-image';

// What the header says about where you are.
export interface HeaderContext {
    /** Where the back chip goes, or `null` to show the wordmark in its place. */
    back: string | null
    /** The right-hand pill, or `null` to fall back to whoever is signed in. */
    pill: HeaderPill | null
    // A game's square mark, drawn in the pill's place rather than next to it.
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

// A game's own front page — `/games/{slug}` exactly, not the screens under it.
function isGameHub(pathname: string): boolean {
    return /^\/games\/[^/]+$/.test(pathname);
}

// Whether the page at this route paints its own colour up behind the header.
export function headerOverAccent(pathname: string): boolean {
    return isGameHub(pathname);
}

// Every label this can answer with is a brand name, so nothing here is translated.
export function headerContextFor(pathname: string): HeaderContext {
    // Nothing here for the solo setup or lobby screens, which are drawn without this header at all.

    // Trading a guest account in for a real one.
    if (pathname === ROUTES.upgradeAccount) {
        return { back: ROUTES.profile, pill: null };
    }

    const game = gameForPathname(pathname);

    if (game === null) {
        // Off a game entirely: the wordmark, and the corner is about you.
        return { back: null, pill: null };
    }

    // A game's front page: out to the games list, and the corner wears the game's mark.
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

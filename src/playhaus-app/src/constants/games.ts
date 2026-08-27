import { ROUTES } from '@/constants/routes';
import { Brand, Gradients, type AccentInk } from '@/constants/theme';
import type { TranslationKey } from '@/features/i18n/keys';
import type { ImageSource } from 'expo-image';

/**
 * The games' display names. Shared rather than per-feature: the home list, the game
 * pages' copy, and the header capsule all show the same string.
 */
export const LEAGUE_OF_LETTERS_NAME: string = "League of Letters";
export const PUBQUIZR_NAME: string = "PubquizR";
export const ONE_OF_US_NAME: string = "One of Us";

/**
 * How many devices a group needs to play.
 */
export type DeviceMode = 'perPlayer' | 'oneDevice' | 'perPlayerOrOneDevice';
export const DEVICE_MODE_KEYS: Record<DeviceMode, TranslationKey> = {
    perPlayer: 'games.device.perPlayer',
    oneDevice: 'games.device.oneDevice',
    perPlayerOrOneDevice: 'games.device.perPlayerOrOneDevice',
};

/**
 * The character a join code starts with, which is the whole of how a code says which
 * game it belongs to.
 *
 * Mirrors `Prefix()` in `internal/joincode/game.go`, and the mirroring is the point of
 * the literal union rather than `string`: there is no codegen between the two and no
 * test runner in this app, so this type is the only thing that will ever object to a
 * lowercase `'l'`, a `'0'`, or a fourth game quietly taking a letter that is already
 * spoken for.
 */
export type JoinCodePrefix = 'L' | 'P' | 'O';

export interface Game {
    slug: string,
    name: string,
    color: string,
    gradient: readonly [string, string, string],
    /**
     * Which ink the game's own pages set their copy in once they are standing on that
     * gradient. Two of the three are saturated enough for paper; the violet is not.
     */
    accentInk: AccentInk,
    glyphInk: Record<'light' | 'dark', string>,
    icon: ImageSource,
    descriptionKey: TranslationKey,
    mainCategoryIndicatorKey: TranslationKey,
    playable: boolean,
    /**
     * Wears the "new" badge on its home card. At most one game should carry this — the
     * badge is a pointer at the newest thing, and two of them point nowhere.
     */
    isNew?: boolean,
    navigationUrl: string,
    /**
     * The character a code for this game begins with. See `JoinCodePrefix`, and keep it
     * in step with `internal/joincode/game.go`.
     */
    joinCodePrefix: JoinCodePrefix,
    /**
     * The page a code for this game opens, or `null` for a game that has no rooms yet.
     *
     * Nullable rather than absent, because the prefix and the door are two different
     * questions: PubquizR and One of Us both have a letter reserved — the server will
     * hand out `P` and `O` codes the day they learn to play across several phones — and
     * until then a code for one of them is a real code with nowhere to go. Somewhere to
     * go is exactly what this field is, so it says so.
     */
    roomRoute: ((code: string) => string) | null,
    deviceMode: DeviceMode,
    minMaxPlayersIndicator: string
    minutesAverage: number
}

/*
 * The three entries, each exported on its own as well as through `GAMES` below.
 *
 * A game's own front page reads its entry directly (see `GameIndexPage`), and a page
 * that had to find itself in the list first would either be doing a lookup that can
 * come back empty or repeating the figures the list already holds.
 */
export const LEAGUE_OF_LETTERS: Game = {
    slug: 'league-of-letters',
    name: LEAGUE_OF_LETTERS_NAME,
    color: Brand.primary,
    gradient: Gradients.primary,
    accentInk: 'paper',
    glyphInk: { light: Brand.textOnAccent, dark: Brand.ink },
    icon: require('@/assets/icons/league-of-letters-icon.svg'),
    mainCategoryIndicatorKey: 'games.leagueOfLetters.mainCategory',
    descriptionKey: 'games.leagueOfLetters.description',
    deviceMode: 'perPlayer',
    playable: true,
    navigationUrl: ROUTES.leagueOfLettersIndex,
    joinCodePrefix: 'L',
    roomRoute: ROUTES.leagueOfLettersRoom,
    minMaxPlayersIndicator: "1-6",
    minutesAverage: 10
};

export const PUBQUIZR: Game = {
    slug: 'quizzer',
    name: PUBQUIZR_NAME,
    color: Brand.secondary,
    gradient: Gradients.secondary,
    accentInk: 'paper',
    glyphInk: { light: Brand.textOnAccent, dark: Brand.textOnAccent },
    icon: require('@/assets/icons/pubquizr-icon.svg'),
    mainCategoryIndicatorKey: 'games.quizzer.mainCategory',
    descriptionKey: 'games.quizzer.description',
    deviceMode: 'oneDevice',
    playable: true,
    isNew: true,
    navigationUrl: ROUTES.quizzerIndex,
    joinCodePrefix: 'P',
    roomRoute: null,
    minMaxPlayersIndicator: "3-8",
    minutesAverage: 25
};

// Violet rather than the mint it used to carry, which the icon never agreed with: the
// glyph has been violet since it was drawn, and the accent is what the header, the home
// card and the game's own page all take their colour from.
export const ONE_OF_US: Game = {
    slug: 'one-of-us',
    name: ONE_OF_US_NAME,
    color: Brand.violet,
    gradient: Gradients.violet,
    accentInk: 'ink',
    glyphInk: { light: Brand.ink, dark: Brand.ink },
    icon: require('@/assets/icons/one-of-us-icon.svg'),
    mainCategoryIndicatorKey: 'games.oneOfUs.mainCategory',
    descriptionKey: 'games.oneOfUs.description',
    deviceMode: 'perPlayer',
    playable: true,
    navigationUrl: ROUTES.oneOfUsIndex,
    joinCodePrefix: 'O',
    roomRoute: null,
    minMaxPlayersIndicator: "3-7",
    minutesAverage: 10
};

/**
 * Every game the app knows about. The home page renders this list, and `Header` looks
 * the current route up in it — one registry so a game's name and accent can't drift
 * between the card you tapped and the chrome you land in.
 */
export const GAMES: Game[] = [LEAGUE_OF_LETTERS, PUBQUIZR, ONE_OF_US];

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

/**
 * The game a join code belongs to, or `null` when no game has claimed its first
 * character.
 *
 * The third lookup beside `gameForPathname` and `gameBySlug`, and the only one that runs
 * on something a player typed. It reads the first character and nothing else — a code
 * does not have to be whole, or even valid, for this to answer: the join card asks after
 * a single keystroke so it can name the game beside the boxes, which is what turns the
 * `O`/`0` confusion into something you catch on character one rather than on a 404 a
 * screen later.
 *
 * Whether that game has anywhere to *take* the code is `roomRoute`, and a separate
 * question — see `resolveJoinCode`.
 */
export function gameForJoinCode(code: string): Game | null {
    const prefix = code.charAt(0).toUpperCase();

    return GAMES.find(game => game.joinCodePrefix === prefix) ?? null;
}

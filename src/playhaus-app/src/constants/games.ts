import { ROUTES } from '@/constants/routes';
import { Brand, Gradients, type Accent, type AccentInk } from '@/constants/theme';
import type { TranslationKey } from '@/features/i18n/keys';
import type { ImageSource } from 'expo-image';

export const LEAGUE_OF_LETTERS_NAME: string = "League of Letters";
export const PUBQUIZR_NAME: string = "PubquizR";
export const ONE_OF_US_NAME: string = "One of Us";
export const FAKE_FILLER_NAME: string = "Fake Filler";
export const SKETCH_OFF_NAME: string = "Sketch Off";

// How many devices a group needs to play.
export type DeviceMode = 'perPlayer' | 'oneDevice' | 'perPlayerOrOneDevice';
export const DEVICE_MODE_KEYS: Record<DeviceMode, TranslationKey> = {
    perPlayer: 'games.device.perPlayer',
    oneDevice: 'games.device.oneDevice',
    perPlayerOrOneDevice: 'games.device.perPlayerOrOneDevice',
};

export type JoinCodePrefix = 'L' | 'P' | 'O' | 'F' | 'S';

export interface Game {
    slug: string,
    name: string,
    color: string,
    gradient: readonly [string, string, string],
    accentInk: AccentInk,
    glyphInk: Record<'light' | 'dark', string>,
    icon: ImageSource | undefined,
    descriptionKey: TranslationKey,
    mainCategoryIndicatorKey: TranslationKey,
    playable: boolean,
    isNew?: boolean,
    navigationUrl: string,
    joinCodePrefix: JoinCodePrefix,
    roomRoute: ((code: string) => string) | null,
    deviceMode: DeviceMode,
    minMaxPlayersIndicator: string
    minutesAverage: number
}

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
    minMaxPlayersIndicator: "1-4",
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
    deviceMode: 'perPlayerOrOneDevice',
    playable: true,
    isNew: true,
    navigationUrl: ROUTES.quizzerIndex,
    joinCodePrefix: 'P',
    roomRoute: ROUTES.quizzerRoom,
    minMaxPlayersIndicator: "2-8",
    minutesAverage: 25
};

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
    deviceMode: 'perPlayerOrOneDevice',
    playable: true,
    navigationUrl: ROUTES.oneOfUsIndex,
    joinCodePrefix: 'O',
    roomRoute: ROUTES.oneOfUsRoom,
    minMaxPlayersIndicator: "3-9",
    minutesAverage: 10
};

export const FAKE_FILLER: Game = {
    slug: 'fake-filler',
    name: FAKE_FILLER_NAME,
    color: Brand.mint,
    gradient: Gradients.mint,
    accentInk: 'ink',
    glyphInk: { light: Brand.ink, dark: Brand.ink },
    icon: require('@/assets/icons/fake-filler.svg'),
    mainCategoryIndicatorKey: 'games.fakeFiller.mainCategory',
    descriptionKey: 'games.fakeFiller.description',
    deviceMode: 'perPlayer',
    playable: true,
    navigationUrl: ROUTES.fakeFillerIndex,
    joinCodePrefix: 'F',
    roomRoute: ROUTES.fakeFillerRoom,
    // The backend's own floor and ceiling.
    minMaxPlayersIndicator: "2-9",
    minutesAverage: 10
};

export const SKETCH_OFF: Game = {
    slug: 'sketch-off',
    name: SKETCH_OFF_NAME,
    color: Brand.pink,
    gradient: Gradients.pink,
    accentInk: 'ink',
    glyphInk: { light: Brand.ink, dark: Brand.ink },
    icon: require('@/assets/icons/sketch-off.svg'),
    mainCategoryIndicatorKey: 'games.sketchOff.mainCategory',
    descriptionKey: 'games.sketchOff.description',
    deviceMode: 'perPlayer',
    playable: false,
    navigationUrl: ROUTES.sketchOffIndex,
    // Not 'F' — that is Fake Filler's, and `gameForJoinCode` answers with the first game in `GAMES` that claims a character.
    joinCodePrefix: 'S',
    roomRoute: null,
    minMaxPlayersIndicator: "2-6",
    minutesAverage: 10,
};

// Every game the app knows about.
export const GAMES: Game[] = [LEAGUE_OF_LETTERS, PUBQUIZR, ONE_OF_US, FAKE_FILLER, SKETCH_OFF];

// A game's colour identity, in the shape the controls take it in.
export function accentOf(game: Game): Accent {
    return { color: game.color, gradient: game.gradient, ink: game.accentInk };
}

// The game a path sits inside, or `null` anywhere outside `/games/{slug}`.
export function gameForPathname(pathname: string): Game | null {
    const slug = /^\/games\/([^/]+)/.exec(pathname)?.[1];
    if (!slug) return null;

    return GAMES.find(game => game.slug === slug) ?? null;
}

// A game by its `/games/{slug}` segment, or `null` for a slug this build has no entry for.
export function gameBySlug(slug: string): Game | null {
    return GAMES.find(game => game.slug === slug) ?? null;
}

// The game a join code belongs to, or `null` when no game has claimed its first character.
export function gameForJoinCode(code: string): Game | null {
    const prefix = code.charAt(0).toUpperCase();

    return GAMES.find(game => game.joinCodePrefix === prefix) ?? null;
}

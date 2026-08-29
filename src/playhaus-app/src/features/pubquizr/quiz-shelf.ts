import { Brand } from "@/constants/theme";
import type { Phrase, TranslationKey } from "@/features/i18n/keys";
import { AVATAR_COLORS, type AvatarColor } from "@/utils/color-utils";
import type { QuizListItem } from "./pubquizr-quizzes";

/**
 * How a quiz turns into a row: the two letters on its swatch, the colour behind them,
 * and the line under its description.
 *
 * All three are worked out from what the list endpoint sends, which is deliberately
 * thin — a title, a description, a date. Nothing here asks the API for more.
 */

/**
 * The swatches a quiz can wear.
 *
 * The pale half of the profile palette, taken by the ink they carry rather than listed
 * again: a row's initials are small and dark, so a swatch that wanted paper letters
 * would need a different type size to stay readable, and the row has one.
 */
const SWATCHES: AvatarColor[] = AVATAR_COLORS.filter(color => color.foreground === Brand.ink);

/**
 * A number from a string, stable across runs and platforms.
 *
 * djb2, which is not a good hash and does not need to be: the only thing riding on it
 * is which of three colours a quiz gets, and the one property that matters is that it
 * is the same colour tomorrow. `Math.imul` keeps the arithmetic in 32 bits, where a
 * plain `*` would silently drift into doubles and stop being reproducible.
 */
function hash(value: string): number {
    let result = 5381;

    for (let index = 0; index < value.length; index++) {
        result = Math.imul(result, 33) + value.charCodeAt(index);
    }

    return Math.abs(result);
}

/** The colour behind a quiz's initials. The same quiz always gets the same one. */
export function swatchFor(quiz: QuizListItem): AvatarColor {
    return SWATCHES[hash(quiz.id) % SWATCHES.length];
}

/**
 * The two letters on that swatch: the initials of the first two words of the title,
 * or its first two characters when it is one word.
 *
 * Spread rather than sliced, because a title starting with an emoji or an accented pair
 * cut by index comes out as half a glyph.
 */
export function initialsFor(title: string): string {
    const words = title.trim().split(/\s+/).filter(Boolean);

    if (words.length >= 2) {
        return words.slice(0, 2).map(word => [...word][0]).join('').toUpperCase();
    }

    return [...(words[0] ?? '')].slice(0, 2).join('').toUpperCase() || '?';
}

/**
 * The month names, as catalogue keys in calendar order.
 *
 * `Intl` is still not what formats this — see `features/reconnect/game-kinds.ts`, which
 * says the same thing about the same problem: it is not something every runtime this
 * app ships to can be relied on for, and three-letter abbreviations are a thing the
 * catalogue can simply say.
 */
const MONTH_KEYS = [
    'common.time.months.jan', 'common.time.months.feb', 'common.time.months.mar',
    'common.time.months.apr', 'common.time.months.may', 'common.time.months.jun',
    'common.time.months.jul', 'common.time.months.aug', 'common.time.months.sep',
    'common.time.months.oct', 'common.time.months.nov', 'common.time.months.dec'
] as const satisfies readonly TranslationKey[];

/**
 * When a quiz went up, as the row shows it: "19 Aug 2025".
 *
 * An absolute date rather than the relative wording the reconnect list uses. These are
 * shelves rather than sessions — a weekly quiz is *the one from August* — and the list
 * is sorted by this, so the dates have to line up down the column to be worth reading at
 * all. The day is what a shelf is filed under; the hour it went up is not, so it is not
 * shown.
 *
 * Returns `null` for a quiz with no publication date, or one whose date does not parse:
 * the row then draws no date line rather than the word "Invalid".
 */
export function publishedAtPhrase(publishedAt: string | undefined): Phrase | null {
    if (!publishedAt) return null;

    const date = new Date(publishedAt);
    if (Number.isNaN(date.getTime())) return null;

    return {
        key: 'pubquizr.index.list.published',
        values: { day: date.getDate(), year: date.getFullYear() },
        keyValues: { month: MONTH_KEYS[date.getMonth()] }
    };
}

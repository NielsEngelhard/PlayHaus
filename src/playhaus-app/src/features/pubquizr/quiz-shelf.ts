import { Brand } from "@/constants/theme";
import type { Phrase, TranslationKey } from "@/features/i18n/keys";
import { AVATAR_COLORS, type AvatarColor } from "@/utils/color-utils";
import type { QuizListItem } from "./pubquizr-quizzes";

// How a quiz turns into a row: the two letters on its swatch, the colour behind them.

// The swatches a quiz can wear.
const SWATCHES: AvatarColor[] = AVATAR_COLORS.filter(color => color.foreground === Brand.ink);

// A number from a string, stable across runs and platforms. djb2, which is not a good hash and does not need to be.
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

/** The `YYYY-wNN` a weekly quiz's slug is built from — see `seed.go`'s `weeklySlug`. */
const WEEKLY_SLUG = /^\d{4}-w(\d{1,2})$/;

// What sits on a quiz's swatch: the week number for a weekly quiz.
export function initialsFor(quiz: QuizListItem): string {
    const week = quiz.category === 'weekly' ? WEEKLY_SLUG.exec(quiz.slug) : null;
    if (week) return week[1].padStart(2, '0');

    const words = quiz.title.trim().split(/\s+/).filter(Boolean);

    if (words.length >= 2) {
        return words.slice(0, 2).map(word => [...word][0]).join('').toUpperCase();
    }

    return [...(words[0] ?? '')].slice(0, 2).join('').toUpperCase() || '?';
}

// The one quiz the picker answers with instead of asking about.
export function featuredQuiz(items: QuizListItem[]): QuizListItem | null {
    return items.find(quiz => quiz.played !== true) ?? items[0] ?? null;
}

// The month names, as catalogue keys in calendar order.
const MONTH_KEYS = [
    'common.time.months.jan', 'common.time.months.feb', 'common.time.months.mar',
    'common.time.months.apr', 'common.time.months.may', 'common.time.months.jun',
    'common.time.months.jul', 'common.time.months.aug', 'common.time.months.sep',
    'common.time.months.oct', 'common.time.months.nov', 'common.time.months.dec'
] as const satisfies readonly TranslationKey[];

// When a quiz went up, as the row shows it: "19 Aug 2025".
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

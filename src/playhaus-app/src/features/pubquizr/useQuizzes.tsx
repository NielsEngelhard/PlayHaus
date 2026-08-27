import type { LanguageCode } from "@/constants/languages";
import { useUiLanguage } from "@/features/i18n/LanguageContext";
import { useCallback, useEffect, useRef, useState } from "react";
import { getQuizzesRequest, type QuizCategory, type QuizListItem } from "./pubquizr-quizzes";

export type QuizzesStatus = 'loading' | 'ready' | 'failed';

export interface Quizzes {
    status: QuizzesStatus,
    /** Every page fetched so far, newest first, in one list. */
    items: QuizListItem[],
    /**
     * How many quizzes are on this shelf altogether.
     *
     * The shelf's own size, which `items.length` is not — that is however many pages
     * have arrived. A list that names its own length has to say the first number, or
     * it counts down to "load older" and then contradicts itself.
     */
    total: number,
    /** Whether there is an older page to ask for. */
    hasMore: boolean,
    /** Whether one is being fetched right now. */
    loadingMore: boolean,
    loadMore: () => void,
    /** Ask for the first page again, for when the first attempt did not arrive. */
    reload: () => void
}

/**
 * A shelf, and the three things that say *which* shelf it is.
 *
 * The answer is kept next to the question on purpose. A list of quizzes means nothing
 * without knowing which tab and which language it came back for, and holding the two
 * apart is what makes a switched tab briefly show the last one's rows.
 */
interface Shelf {
    category: QuizCategory,
    locale: LanguageCode,
    attempt: number,

    status: QuizzesStatus,
    items: QuizListItem[],
    page: number,
    total: number,
    hasMore: boolean
}

function emptyShelf(category: QuizCategory, locale: LanguageCode, attempt: number): Shelf {
    return { category, locale, attempt, status: 'loading', items: [], page: 1, total: 0, hasMore: false };
}

/**
 * One shelf of quizzes, a page at a time.
 *
 * The list only ever grows downwards — "load older" appends rather than replaces, so the
 * rows someone has already scrolled past stay where they were. Switching shelf is the
 * one thing that empties it, since a new shelf is a different list rather than more of
 * this one.
 */
export function useQuizzes(category: QuizCategory): Quizzes {
    const locale = useUiLanguage();

    /**
     * Bumped by `reload`, and read below as one more thing that makes this a different
     * list.
     *
     * A counter rather than a boolean: two failed attempts in a row have to be two
     * distinct values, or the second press would change nothing and look like a dead
     * button.
     */
    const [attempt, setAttempt] = useState(0);

    const [shelf, setShelf] = useState<Shelf>(() => emptyShelf(category, locale, attempt));
    const [loadingMore, setLoadingMore] = useState(false);

    /*
     * Emptied during render rather than from an effect.
     *
     * Switching tab has to take the old rows with it in the same commit that switches
     * it — cleared afterwards, the new tab paints once holding the previous shelf's
     * quizzes and then corrects itself, which is a visible flash of the wrong list.
     * Same reason the page transition in `app/_layout.tsx` adjusts during render.
     */
    const stale = shelf.category !== category
        || shelf.locale !== locale
        || shelf.attempt !== attempt;

    if (stale) {
        setShelf(emptyShelf(category, locale, attempt));
    }

    // What this render is actually drawing. React restarts the render on the setState
    // above, so this only stands in for one discarded pass — but a hook has no way to
    // stop its caller reading the value in the meantime.
    const current = stale ? emptyShelf(category, locale, attempt) : shelf;

    /**
     * Which list is being drawn, as a number that changes whenever the answer to that
     * would.
     *
     * Both requests below are races: a shelf switched twice in a second, or an older
     * page still in flight when it is, would otherwise land in whatever list is on
     * screen by the time they come back. Every response checks that the generation it
     * was asked in is still the one being shown, and drops itself if it is not.
     */
    const generation = useRef(0);

    useEffect(() => {
        generation.current += 1;
        const mine = generation.current;

        getQuizzesRequest(category, locale)
            .then(response => {
                if (generation.current !== mine) return;

                setShelf(shown => ({
                    ...shown,
                    status: 'ready',
                    items: response.items,
                    page: response.page,
                    total: response.total,
                    hasMore: response.hasMore
                }));
            })
            .catch(() => {
                if (generation.current !== mine) return;

                setShelf(shown => ({ ...shown, status: 'failed' }));
            });

        // Nothing to abort — `request` has no signal — so the guard above is the whole
        // of the tidy-up. Bumping the generation here as well would make a re-run of
        // this effect invalidate its own request.
    }, [category, locale, attempt]);

    const loadMore = useCallback(() => {
        if (current.status !== 'ready' || !current.hasMore || loadingMore) return;

        const mine = generation.current;
        setLoadingMore(true);

        getQuizzesRequest(category, locale, current.page + 1)
            .then(response => {
                if (generation.current !== mine) return;

                setShelf(shown => ({
                    ...shown,
                    items: [...shown.items, ...response.items],
                    page: response.page,
                    // Taken from the older page as well: a quiz published while someone
                    // is reading moves the shelf's length, and the count on screen
                    // should be the one this list was actually paged out of.
                    total: response.total,
                    hasMore: response.hasMore
                }));
            })
            .catch(() => {
                // Deliberately quiet. What is already on screen is still correct, and
                // the row that failed is a row somebody can simply press again.
            })
            .finally(() => {
                if (generation.current !== mine) return;

                setLoadingMore(false);
            });
    }, [category, locale, current.status, current.hasMore, current.page, loadingMore]);

    const reload = useCallback(() => setAttempt(previous => previous + 1), []);

    return {
        status: current.status,
        items: current.items,
        total: current.total,
        hasMore: current.hasMore,
        loadingMore,
        loadMore,
        reload
    };
}

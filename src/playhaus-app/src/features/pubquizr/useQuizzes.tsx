import type { LanguageCode } from "@/constants/languages";
import { useUiLanguage } from "@/features/i18n/LanguageContext";
import { useCallback, useEffect, useRef, useState } from "react";
import { getQuizzesRequest, type QuizCategory, type QuizListItem, type QuizListResponse } from "./pubquizr-quizzes";

export type QuizzesStatus = 'loading' | 'ready' | 'failed';

export interface Quizzes {
    status: QuizzesStatus,
    /** Every page fetched so far, newest first, in one list. */
    items: QuizListItem[],
    // How many quizzes are on this shelf altogether.
    total: number,
    /** Whether there is an older page to ask for. */
    hasMore: boolean,
    /** Whether one is being fetched right now. */
    loadingMore: boolean,
    loadMore: () => void,
    /** Ask for the first page again, for when the first attempt did not arrive. */
    reload: () => void
}

// A shelf, and the three things that say *which* shelf it is.
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

/** A shelf as it was last seen, with the question it was the answer to stripped off. */
type CachedShelf = Pick<Shelf, 'items' | 'page' | 'total' | 'hasMore'>;

// The last known state of every shelf that has been looked at this session.
const CACHE = new Map<string, CachedShelf>();

function cacheKey(category: QuizCategory, locale: LanguageCode): string {
    return `${category}:${locale}`;
}

// First-page requests that have been sent and not yet answered, by shelf.
const INFLIGHT = new Map<string, Promise<QuizListResponse>>();

function firstPage(category: QuizCategory, locale: LanguageCode): Promise<QuizListResponse> {
    const key = cacheKey(category, locale);

    const running = INFLIGHT.get(key);
    if (running !== undefined) return running;

    // Cleared by whichever request put it there, and only if it is still the one on record.
    const started: Promise<QuizListResponse> = getQuizzesRequest(category, locale)
        .finally(() => {
            if (INFLIGHT.get(key) === started) INFLIGHT.delete(key);
        });

    INFLIGHT.set(key, started);

    return started;
}

// The shelf to start from: whatever was last seen, or nothing and a run of placeholders.
function startingShelf(category: QuizCategory, locale: LanguageCode, attempt: number): Shelf {
    const cached = CACHE.get(cacheKey(category, locale));

    return cached === undefined
        ? { category, locale, attempt, status: 'loading', items: [], page: 1, total: 0, hasMore: false }
        : { category, locale, attempt, status: 'ready', ...cached };
}

// The shelves there is anything on.
const PLAYABLE = ['weekly', 'official'] as const satisfies readonly QuizCategory[];

export interface QuizShelves {
    /** The newest weekly quizzes — what the index page shows a few of. */
    weekly: Quizzes,
    official: Quizzes,
    /** Every quiz there is to play, across both shelves. */
    total: number,
    /** Whether `total` is a real number yet rather than the zero it starts at. */
    ready: boolean
}

// Both playable shelves at once, and how many quizzes that adds up to.
export function usePlayableQuizzes(): QuizShelves {
    const weekly = useQuizzes(PLAYABLE[0]);
    const official = useQuizzes(PLAYABLE[1]);

    return {
        weekly,
        official,
        total: weekly.total + official.total,
        // Both, because a total half of whose shelves have answered is a number that is about to change.
        ready: weekly.status === 'ready' && official.status === 'ready'
    };
}

// One shelf of quizzes, a page at a time.
export function useQuizzes(category: QuizCategory): Quizzes {
    const locale = useUiLanguage();

    // Bumped by `reload`, and read below as one more thing that makes this a different list.
    const [attempt, setAttempt] = useState(0);

    const [shelf, setShelf] = useState<Shelf>(() => startingShelf(category, locale, attempt));
    const [loadingMore, setLoadingMore] = useState(false);

    // Reset during render rather than from an effect.
    const stale = shelf.category !== category
        || shelf.locale !== locale
        || shelf.attempt !== attempt;

    if (stale) {
        setShelf(startingShelf(category, locale, attempt));
    }

    // What this render is actually drawing.
    const current = stale ? startingShelf(category, locale, attempt) : shelf;

    // Which list is being drawn, as a number that changes whenever the answer to that would.
    const generation = useRef(0);

    useEffect(() => {
        generation.current += 1;
        const mine = generation.current;

        firstPage(category, locale)
            .then(response => {
                // Written whether or not this hook still wants the answer.
                CACHE.set(cacheKey(category, locale), {
                    items: response.items,
                    page: response.page,
                    total: response.total,
                    hasMore: response.hasMore
                });

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

                // Only an empty shelf is allowed to fail.
                setShelf(shown => ({
                    ...shown,
                    status: shown.items.length > 0 ? 'ready' : 'failed'
                }));
            });

        // Nothing to abort — `request` has no signal — so the guard above is the whole of the tidy-up.
    }, [category, locale, attempt]);

    const loadMore = useCallback(() => {
        if (current.status !== 'ready' || !current.hasMore || loadingMore) return;

        const mine = generation.current;
        setLoadingMore(true);

        getQuizzesRequest(category, locale, current.page + 1)
            .then(response => {
                if (generation.current !== mine) return;

                setShelf(shown => {
                    const grown = {
                        ...shown,
                        items: [...shown.items, ...response.items],
                        page: response.page,
                        // Taken from the older page as well.
                        total: response.total,
                        hasMore: response.hasMore
                    };

                    // Pages somebody has already asked for are part of what the shelf is now, so reopening it must not make them ask again.
                    CACHE.set(cacheKey(category, locale), {
                        items: grown.items,
                        page: grown.page,
                        total: grown.total,
                        hasMore: grown.hasMore
                    });

                    return grown;
                });
            })
            .catch(() => {
                // Deliberately quiet.
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

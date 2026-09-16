import type { LanguageCode } from "@/constants/languages";
import { useUiLanguage } from "@/features/i18n/LanguageContext";
import { useCallback, useEffect, useRef, useState } from "react";
import { getQuizzesRequest, type QuizCategory, type QuizListItem, type QuizListResponse } from "./pubquizr-quizzes";

export type QuizzesStatus = 'loading' | 'ready' | 'failed';

export interface Quizzes {
    status: QuizzesStatus,
    /** Every page fetched so far, newest first, in one list. */
    items: QuizListItem[],
    /** Whether there is an older page to ask for. */
    hasMore: boolean,
    /** Whether one is being fetched right now. */
    loadingMore: boolean,
    // Whether the last older page failed to arrive, so nothing asks again until somebody means it.
    moreFailed: boolean,
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
    hasMore: boolean,
    // Kept on the shelf so that switching shelves mid-request cannot leave the new one looking busy.
    loadingMore: boolean,
    moreFailed: boolean
}

/** A shelf as it was last seen, with the question it was the answer to stripped off. */
type CachedShelf = Pick<Shelf, 'items' | 'page' | 'hasMore'>;

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
    const idle = { category, locale, attempt, loadingMore: false, moreFailed: false };

    return cached === undefined
        ? { ...idle, status: 'loading', items: [], page: 1, hasMore: false }
        : { ...idle, status: 'ready', ...cached };
}

// One shelf of quizzes, a page at a time.
export function useQuizzes(category: QuizCategory): Quizzes {
    const locale = useUiLanguage();

    // Bumped by `reload`, and read below as one more thing that makes this a different list.
    const [attempt, setAttempt] = useState(0);

    const [shelf, setShelf] = useState<Shelf>(() => startingShelf(category, locale, attempt));

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

    // The generation an older page is on its way for; a ref because scroll events outrun re-renders.
    const fetchingFor = useRef<number | null>(null);

    useEffect(() => {
        generation.current += 1;
        const mine = generation.current;

        firstPage(category, locale)
            .then(response => {
                // Written whether or not this hook still wants the answer.
                CACHE.set(cacheKey(category, locale), {
                    items: response.items,
                    page: response.page,
                    hasMore: response.hasMore
                });

                if (generation.current !== mine) return;

                setShelf(shown => ({
                    ...shown,
                    status: 'ready',
                    items: response.items,
                    page: response.page,
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
        const mine = generation.current;
        if (current.status !== 'ready' || !current.hasMore || fetchingFor.current === mine) return;

        const after = current.page;
        fetchingFor.current = mine;
        setShelf(shown => ({ ...shown, loadingMore: true, moreFailed: false }));

        getQuizzesRequest(category, locale, after + 1)
            .then(response => {
                if (generation.current !== mine) return;

                setShelf(shown => {
                    // A refreshed first page landed meanwhile, and this page no longer follows what is shown.
                    if (shown.page !== after) return { ...shown, loadingMore: false };

                    const grown = {
                        ...shown,
                        items: [...shown.items, ...response.items],
                        page: response.page,
                        hasMore: response.hasMore,
                        loadingMore: false
                    };

                    // Pages somebody has already asked for are part of what the shelf is now, so reopening it must not make them ask again.
                    CACHE.set(cacheKey(category, locale), {
                        items: grown.items,
                        page: grown.page,
                        hasMore: grown.hasMore
                    });

                    return grown;
                });
            })
            .catch(() => {
                if (generation.current !== mine) return;

                setShelf(shown => ({ ...shown, loadingMore: false, moreFailed: true }));
            })
            .finally(() => {
                if (fetchingFor.current === mine) fetchingFor.current = null;
            });
    }, [category, locale, current.status, current.hasMore, current.page]);

    const reload = useCallback(() => setAttempt(previous => previous + 1), []);

    return {
        status: current.status,
        items: current.items,
        hasMore: current.hasMore,
        loadingMore: current.loadingMore,
        moreFailed: current.moreFailed,
        loadMore,
        reload
    };
}

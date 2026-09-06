import type { LanguageCode } from "@/constants/languages";
import { useUiLanguage } from "@/features/i18n/LanguageContext";
import { useCallback, useEffect, useRef, useState } from "react";
import { getQuizzesRequest, type QuizCategory, type QuizListItem, type QuizListResponse } from "./pubquizr-quizzes";

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

/** A shelf as it was last seen, with the question it was the answer to stripped off. */
type CachedShelf = Pick<Shelf, 'items' | 'page' | 'total' | 'hasMore'>;

/**
 * The last known state of every shelf that has been looked at this session.
 *
 * Module-level and deliberately never evicted: a shelf is at most a couple of pages of
 * titles, there are six of them altogether — three categories across two locales — and
 * they die with the tab.
 *
 * What it buys is the difference between a picker that opens and one that loads. Three
 * things on the quizzer index want the weekly shelf: the featured card, the peek under
 * it, and the browse sheet when it is opened. Without a cache each of those is its own
 * request and its own run of skeleton rows, so opening the sheet a second time would sit
 * on placeholders standing in for quizzes already drawn on the page behind it.
 *
 * Keyed by locale as well as category, so a language switch needs no invalidation: it is
 * simply a different shelf, which is what `Shelf` above already says.
 */
const CACHE = new Map<string, CachedShelf>();

function cacheKey(category: QuizCategory, locale: LanguageCode): string {
    return `${category}:${locale}`;
}

/**
 * First-page requests that have been sent and not yet answered, by shelf.
 *
 * The cache above makes the *second* look at a shelf free; this makes the second, third
 * and fourth look at it *at the same time* free, which is the case the index page
 * actually has. The featured card, the peek and the count under it all want the weekly
 * shelf, and they all mount in the same frame — so without this they would send three
 * identical requests, none of which can see the others' answer because none has arrived.
 *
 * Only page one is shared. Older pages are asked for by a person pressing a button, one
 * shelf at a time, in the sheet — there is nothing there to collide with.
 */
const INFLIGHT = new Map<string, Promise<QuizListResponse>>();

function firstPage(category: QuizCategory, locale: LanguageCode): Promise<QuizListResponse> {
    const key = cacheKey(category, locale);

    const running = INFLIGHT.get(key);
    if (running !== undefined) return running;

    // Cleared by whichever request put it there, and only if it is still the one on
    // record — a retry that started after this one finished owns the slot now.
    const started: Promise<QuizListResponse> = getQuizzesRequest(category, locale)
        .finally(() => {
            if (INFLIGHT.get(key) === started) INFLIGHT.delete(key);
        });

    INFLIGHT.set(key, started);

    return started;
}

/**
 * The shelf to start from: whatever was last seen, or nothing and a run of placeholders.
 *
 * A cached shelf opens `ready` rather than `loading`, which is the whole point of the
 * cache — but see the effect below, which asks again either way. Cached rows are a first
 * frame and never the final answer: `played` flips the moment a table finishes a quiz,
 * and a shelf that trusted its cache would go on saying they had not.
 */
function startingShelf(category: QuizCategory, locale: LanguageCode, attempt: number): Shelf {
    const cached = CACHE.get(cacheKey(category, locale));

    return cached === undefined
        ? { category, locale, attempt, status: 'loading', items: [], page: 1, total: 0, hasMore: false }
        : { category, locale, attempt, status: 'ready', ...cached };
}

/**
 * The shelves there is anything on.
 *
 * `community` is left out on purpose rather than by accident: it is empty by design —
 * nobody can write a quiz yet — and the browse answers that tab with "coming soon"
 * instead of an empty list. Counting a shelf that cannot have anything on it would put a
 * zero into every sum for the rest of time.
 */
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

/**
 * Both playable shelves at once, and how many quizzes that adds up to.
 *
 * The number is the point. "See all 11" under a sheet holding twenty-six is worse than no
 * number at all, and no single request can answer it — `GET /api/v1/pubquizr/quizzes`
 * pages one category at a time, so the only way to know how many quizzes there are is to
 * ask each shelf and add up what they say.
 *
 * Two requests, then, on a page whose entire subject is choosing a quiz — and they are
 * the same two the browse sheet needs the moment it opens, already answered by the time
 * it does. `INFLIGHT` above is what keeps that at two however many components ask.
 */
export function usePlayableQuizzes(): QuizShelves {
    const weekly = useQuizzes(PLAYABLE[0]);
    const official = useQuizzes(PLAYABLE[1]);

    return {
        weekly,
        official,
        total: weekly.total + official.total,
        // Both, because a total half of whose shelves have answered is a number that is
        // about to change, and one that changes under a label reads as a miscount.
        ready: weekly.status === 'ready' && official.status === 'ready'
    };
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

    const [shelf, setShelf] = useState<Shelf>(() => startingShelf(category, locale, attempt));
    const [loadingMore, setLoadingMore] = useState(false);

    /*
     * Reset during render rather than from an effect.
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
        setShelf(startingShelf(category, locale, attempt));
    }

    // What this render is actually drawing. React restarts the render on the setState
    // above, so this only stands in for one discarded pass — but a hook has no way to
    // stop its caller reading the value in the meantime.
    const current = stale ? startingShelf(category, locale, attempt) : shelf;

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

        firstPage(category, locale)
            .then(response => {
                // Written whether or not this hook still wants the answer. A shelf
                // nobody is looking at any more is still the freshest that shelf has
                // been, and whoever asks for it next should start from here.
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

                // Only an empty shelf is allowed to fail. A revalidation that did not
                // arrive leaves correct rows on screen, and replacing them with "the
                // quizzes could not be loaded" would be the one lie on the page.
                setShelf(shown => ({
                    ...shown,
                    status: shown.items.length > 0 ? 'ready' : 'failed'
                }));
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

                setShelf(shown => {
                    const grown = {
                        ...shown,
                        items: [...shown.items, ...response.items],
                        page: response.page,
                        // Taken from the older page as well: a quiz published while
                        // someone is reading moves the shelf's length, and the count on
                        // screen should be the one this list was actually paged out of.
                        total: response.total,
                        hasMore: response.hasMore
                    };

                    // Pages somebody has already asked for are part of what the shelf is
                    // now, so reopening it must not make them ask again.
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

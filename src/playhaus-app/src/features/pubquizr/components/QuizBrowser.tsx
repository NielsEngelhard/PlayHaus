import AppText from "@/components/text/AppText";
import InlineNotification from "@/components/ui/InlineNotification";
import Tabs from "@/components/ui/Tabs";
import TextButton from "@/components/ui/TextButton";
import { Spacing, fontFamilyForWeight } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import Feather from "@expo/vector-icons/Feather";
import { useCallback, useMemo, useRef, useState } from "react";
import {
    Platform,
    Pressable,
    ScrollView,
    TextInput,
    View,
    type LayoutChangeEvent,
    type NativeScrollEvent,
    type NativeSyntheticEvent,
    type ViewStyle
} from "react-native";
import { QUIZ_CATEGORIES, type QuizCategory, type QuizListItem } from "../pubquizr-quizzes";
import { useQuizzes } from "../useQuizzes";
import QuizRow from "./QuizRow";
import RuleButton from "./RuleButton";

/**
 * The shelf whose name is not a shelf yet.
 *
 * Community quizzes are the one tab with nothing behind it, so it is answered here
 * rather than by an empty list from the API — "nobody has written one" and "you cannot
 * write one yet" are different things to be told.
 */
const COMING_SOON: QuizCategory = 'community';

/** How many placeholder rows stand in for the first page while it is on its way. */
const SKELETON_ROWS = 5;

/**
 * What the web's scrollbar rules in `global.css` are hung on.
 *
 * An id rather than a class because react-native-web offers no way to set one, and only
 * ever one browser is mounted at a time — the sheet it lives in is the only thing that
 * opens it, and the peek on the index page has no scroller of its own.
 */
const SCROLLER_ID = 'quiz-shelf-scroller';

/** The wash over the bottom edge of the rows, saying they carry on past it. */
const FADE_HEIGHT = 34;

/**
 * How close to the bottom counts as the bottom.
 *
 * Sub-pixel layout means the last scroll of a list rarely lands exactly on its end, and
 * a fade that hangs on for the final half pixel reads as a list that will not finish.
 */
const END_SLACK = 4;

/**
 * The two orders the shelf can be in.
 *
 * `newest` is what the API already answers with, so both of these are local work — a
 * sort is not a reason to ask for the pages again.
 */
type Sort = 'newest' | 'alpha';

/**
 * The three ways the shelf can be split by whether a quiz has been played.
 *
 * `unplayed` is the default it opens on — what is left to play, not what has already
 * been.
 */
type PlayedFilter = 'all' | 'unplayed' | 'played';

const PLAYED_FILTERS = ['all', 'unplayed', 'played'] as const satisfies readonly PlayedFilter[];

/** What NFD leaves behind once an accent has been split off the letter it sat on. */
const COMBINING_MARKS = /[\u0300-\u036f]/g;

/**
 * A string reduced to what a search should care about: case folded, accents dropped.
 *
 * Someone typing "cafe" is looking for "Café", and someone typing on a phone keyboard is
 * not going to reach for the accent to find it. `Intl` is not what does this — see
 * `quiz-shelf.ts`, which says the same about the same runtimes — but `normalize` is a
 * plain string method, and decomposing to NFD is what turns an accent into a separate
 * combining mark that can simply be thrown away.
 */
function fold(value: string): string {
    return value.toLowerCase().normalize('NFD').replace(COMBINING_MARKS, '');
}

/**
 * A wash from a fill straight up into nothing.
 *
 * The far stop is that same colour at zero alpha rather than the keyword `transparent`,
 * which is transparent *black* — interpolating towards it pulls a grey through the
 * middle of the fade on paper. Every background in the palette is an opaque six-digit
 * hex, so `00` is the whole of what it takes to reach it with nothing left of it.
 *
 * Not `linearGradient` from `theme.ts`: that one is the house three-stop 160° tile
 * gradient every icon wears, and this is two stops going up.
 */
function washToTop(color: string): ViewStyle {
    const gradient = `linear-gradient(to top, ${color}, ${color}00)`;

    return Platform.select<ViewStyle>({
        web: { backgroundImage: gradient } as ViewStyle,
        default: { experimental_backgroundImage: gradient } as ViewStyle
    })!;
}

interface Props {
    /**
     * Turns the rows from links into a choice. Without it the rows are links into the
     * setup screen, carrying the quiz they were tapped on.
     */
    onSelect?: (quiz: QuizListItem) => void,
    /**
     * Where a row goes when it is not a choice — see `QuizRow`, which explains why a row
     * inside a `Modal` cannot simply be the link it is on the page.
     */
    onNavigate?: (quiz: QuizListItem) => void,
    /**
     * The quiz already chosen, drawn as the active row wherever it turns up.
     *
     * It is marked rather than removed. A shelf that drops the row you just tapped
     * leaves a gap where your own choice used to be and makes the list re-flow under
     * your finger — and coming back to change your mind, the one row you are looking
     * for is the one that is missing. Marked, the shelf stays a stable map of every
     * quiz there is, with a tick on the one in play.
     */
    selectedQuizId?: string,
    /**
     * The way out, drawn at the end of the header row.
     *
     * The browser's own line rather than the sheet's, so that the title, the count and
     * the close sit on one line instead of the sheet stacking a second header of its own
     * above the first.
     */
    onClose?: () => void
}

/**
 * Every quiz there is, filling whatever it has been given.
 *
 * This used to be a capped panel on the page — a box 336px tall with its own scroller,
 * fenced so that it visibly ended inside the viewport. The fence was the right answer to
 * the wrong question: a list inside a scrolling page has to be a box you can see the
 * bottom of, or it swallows the page's own gesture and pushes everything above it out of
 * reach. But that leaves two things to flick on every screen it appears on, and on the
 * index it left a small box at the end of a long page — scroll down, then scroll again.
 *
 * So the browse is not on a page any more. `QuizSheet` gives this the screen, and with
 * the screen the cap goes: the rows are `flex: 1` and are the only thing that scrolls
 * anywhere near them. What the panel got right is kept — "load older" still sits at the
 * end of the rows, because pages arriving on a press is what stops a shelf being
 * infinite, and the fade over the last row still says there is more under it.
 *
 * Search is the other half of the answer. It runs over the pages already loaded, because
 * that is all the endpoint offers — `GET /api/v1/pubquizr/quizzes` takes a category, a
 * locale and a page number and nothing else — which is why running out of matches with
 * more pages behind them says so instead of showing an empty shelf.
 */
export default function QuizBrowser({ onSelect, onNavigate, selectedQuizId, onClose }: Props) {
    const t = useT();
    const theme = useTheme();
    const styles = useStyles();

    const [category, setCategory] = useState<QuizCategory>('weekly');
    const [query, setQuery] = useState('');
    const [sort, setSort] = useState<Sort>('newest');
    // Defaults to the shelf's own reason for existing: what is left to play, not what
    // has already been.
    const [playedFilter, setPlayedFilter] = useState<PlayedFilter>('unplayed');

    const quizzes = useQuizzes(category);

    /**
     * A new shelf is a new question, so it is asked from scratch. Carrying the old words
     * (or the old played/unplayed split) across would open the tab already filtered by
     * something nobody chose on it, which looks like the new shelf is nearly empty.
     */
    function chooseCategory(next: QuizCategory) {
        setCategory(next);
        setQuery('');
        setPlayedFilter('unplayed');
    }

    const needle = fold(query.trim());
    const searching = needle !== '';

    // Sub-counts for the played/unplayed tabs. Unlike `quizzes.total`, which the server
    // reports for the whole shelf, these can only see pages already loaded — the same
    // honest approximation `matches` below already makes for a search.
    const unplayedCount = quizzes.items.filter(quiz => quiz.played !== true).length;
    const playedCount = quizzes.items.filter(quiz => quiz.played === true).length;

    const visible = useMemo(() => {
        const byPlayed = playedFilter === 'all'
            ? quizzes.items
            : quizzes.items.filter(quiz =>
                playedFilter === 'played' ? quiz.played === true : quiz.played !== true);

        const matched = needle === ''
            ? byPlayed
            : byPlayed.filter(quiz =>
                fold(quiz.title).includes(needle) || fold(quiz.description).includes(needle));

        if (sort === 'newest') return matched;

        // Compared on the folded title rather than through `localeCompare`, for the same
        // two reasons the fold exists: the collation a runtime brings is not something
        // this app can count on, and "Éclairs" belongs with the E's either way.
        return [...matched].sort((left, right) => {
            const a = fold(left.title);
            const b = fold(right.title);

            return a < b ? -1 : a > b ? 1 : 0;
        });
    }, [quizzes.items, playedFilter, needle, sort]);

    /*
     * The three measurements behind the fade, held as refs rather than as state.
     *
     * Only the answer they add up to is worth a render, and that answer is a boolean that
     * changes twice in a scroll. Kept in state, the offset alone would re-render the
     * whole shelf on every frame of every flick.
     */
    const viewport = useRef(0);
    const content = useRef(0);
    const offset = useRef(0);

    const [faded, setFaded] = useState(false);

    const measure = useCallback(() => {
        const below = content.current - viewport.current - offset.current;

        // Same value back means React bails out of the render entirely, which is what
        // makes calling this on every scroll event cheap.
        setFaded(previous => {
            const next = viewport.current > 0 && below > END_SLACK;

            return next === previous ? previous : next;
        });
    }, []);

    const onLayout = useCallback((event: LayoutChangeEvent) => {
        viewport.current = event.nativeEvent.layout.height;
        measure();
    }, [measure]);

    const onContentSizeChange = useCallback((_: number, height: number) => {
        content.current = height;
        measure();
    }, [measure]);

    const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
        offset.current = event.nativeEvent.contentOffset.y;
        measure();
    }, [measure]);

    const shelf = category !== COMING_SOON && quizzes.status === 'ready' && quizzes.items.length > 0;

    return (
        <View style={styles.browser}>
            <View style={styles.header}>
                {/* `Label`'s own typography, not the component: its bottom margin is
                    there to hold whatever it heads off, and in a row it would push the
                    count half a line off the label it belongs to. */}
                <AppText style={styles.headerLabel}>
                    {t('pubquizr.index.list.label')}
                </AppText>

                {shelf && (
                    <AppText style={styles.headerCount}>
                        {searching
                            ? t('pubquizr.index.list.matches', { quizzes: visible.length })
                            : t('pubquizr.index.list.total', { quizzes: quizzes.total })}
                    </AppText>
                )}

                <View style={styles.headerSpacer} />

                {onClose !== undefined && (
                    <Pressable
                        onPress={onClose}
                        accessibilityRole="button"
                        accessibilityLabel={t('common.close')}
                        style={styles.close}
                    >
                        <Feather name="x" size={17} color={theme.colors.textSecondary} />
                    </Pressable>
                )}
            </View>

            <Tabs
                tabs={QUIZ_CATEGORIES}
                activeTab={category}
                onClick={chooseCategory}
                getLabel={tab => t(`pubquizr.index.list.tabs.${tab}`)}
            />

            {shelf && (
                <Tabs
                    tabs={PLAYED_FILTERS}
                    activeTab={playedFilter}
                    onClick={setPlayedFilter}
                    getLabel={filter => t(`pubquizr.index.list.playedFilter.${filter}`, {
                        n: filter === 'all'
                            ? quizzes.total
                            : filter === 'played' ? playedCount : unplayedCount
                    })}
                />
            )}

            {!shelf ? (
                // Nothing to search and nothing to scroll: whatever there is to say
                // stands on its own, at the size it wants to be.
                <View style={styles.plain}>
                    {category === COMING_SOON ? (
                        <InlineNotification
                            icon="clock"
                            message={t('pubquizr.index.list.comingSoon')}
                        />
                    ) : quizzes.status === 'loading' ? (
                        <QuizSkeleton rows={SKELETON_ROWS} />
                    ) : quizzes.status === 'failed' ? (
                        <InlineNotification
                            icon="alert-triangle"
                            message={t('pubquizr.index.list.failed')}
                        >
                            <TextButton text={t('common.retry')} onPress={quizzes.reload} />
                        </InlineNotification>
                    ) : (
                        <InlineNotification
                            icon="inbox"
                            message={t('pubquizr.index.list.empty')}
                        />
                    )}
                </View>
            ) : (
                <>
                    <View style={styles.search}>
                        <Feather name="search" size={15} color={theme.colors.textMuted} />

                        <TextInput
                            value={query}
                            onChangeText={setQuery}
                            placeholder={t('pubquizr.index.list.search')}
                            placeholderTextColor={theme.colors.textMuted}
                            accessibilityLabel={t('pubquizr.index.list.searchLabel')}
                            autoCapitalize="none"
                            autoCorrect={false}
                            returnKeyType="search"
                            style={styles.searchInput}
                        />

                        {/* Spelled as the order it would put the shelf in rather than the
                            one it is in: one chip is a switch, and a switch labelled with
                            where you already are gives nothing to press it for. */}
                        <Pressable
                            onPress={() => setSort(current => current === 'newest' ? 'alpha' : 'newest')}
                            accessibilityRole="button"
                            style={styles.sortChip}
                        >
                            <AppText style={styles.sortChipText}>
                                {sort === 'newest'
                                    ? t('pubquizr.index.list.sortAlpha')
                                    : t('pubquizr.index.list.sortNewest')}
                            </AppText>
                        </Pressable>
                    </View>

                    {/* Takes the rest of the sheet, so the rows are what fills it and the
                        fade below has something to sit on the edge of. */}
                    <View style={styles.rows}>
                        <ScrollView
                            style={styles.scroller}
                            contentContainerStyle={styles.scrollerContent}
                            // Tapping a row with the keyboard up should be tapping a row,
                            // not dismissing the keyboard and losing the tap.
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator
                            // On the web that indicator is the browser's own, and an
                            // unstyled one over this sheet is invisible. What makes it
                            // show is in `global.css`, hung on this id.
                            id={SCROLLER_ID}
                            onLayout={onLayout}
                            onContentSizeChange={onContentSizeChange}
                            onScroll={onScroll}
                            scrollEventThrottle={16}
                        >
                            {visible.length === 0 ? (
                                // Not always a failed search — a shelf can simply have
                                // nothing on it yet, or nothing left on the tab the
                                // played/unplayed filter is sitting on — and "nothing
                                // matches" would be the wrong thing to say about a search
                                // nobody ran.
                                <InlineNotification
                                    icon={searching ? 'search' : playedFilter !== 'all' ? 'filter' : 'inbox'}
                                    message={searching
                                        ? (quizzes.hasMore
                                            ? t('pubquizr.index.list.noMatchesMore')
                                            : t('pubquizr.index.list.noMatches'))
                                        : playedFilter !== 'all'
                                            ? t('pubquizr.index.list.filterEmpty')
                                            : t('pubquizr.index.list.empty')}
                                />
                            ) : (
                                visible.map(quiz => (
                                    <QuizRow
                                        key={quiz.id}
                                        quiz={quiz}
                                        onSelect={onSelect}
                                        onNavigate={onNavigate}
                                        selected={quiz.id === selectedQuizId}
                                    />
                                ))
                            )}

                            {/* At the end of the rows — including the end of no rows at
                                all, which is the one case where the answer somebody
                                searched for is a page that has not arrived. */}
                            {quizzes.hasMore && (
                                <RuleButton
                                    text={quizzes.loadingMore ? t('common.busy') : t('pubquizr.index.list.loadOlder')}
                                    busy={quizzes.loadingMore}
                                    onPress={quizzes.loadMore}
                                />
                            )}
                        </ScrollView>

                        {faded && <View pointerEvents="none" style={styles.fade} />}
                    </View>
                </>
            )}
        </View>
    )
}

interface SkeletonProps {
    rows: number
}

/**
 * The shape of the list before there is one.
 *
 * Rows rather than a spinner: the sheet is about to be a column of these, so the wait
 * should be the same column with nothing written in it yet — the list arrives by filling
 * in rather than by replacing what was there.
 *
 * Exported because the peek on the index page waits for the same request and should wait
 * in the same way, just fewer rows deep.
 */
export function QuizSkeleton({ rows }: SkeletonProps) {
    const styles = useStyles();
    const theme = useTheme();

    return (
        <>
            {Array.from({ length: rows }, (_, index) => (
                <View
                    key={index}
                    // Nothing here to read out, and empty rows announced as anything at
                    // all would be several announcements of nothing.
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                    style={[
                        styles.skeletonRow,
                        // The rows fade as they go down, so the column reads as one
                        // thing loading rather than as several that failed.
                        { opacity: Math.max(1 - index * 0.2, 0.15) }
                    ]}
                >
                    <View style={[styles.skeletonAvatar, { backgroundColor: theme.colors.boardEmpty }]} />

                    <View style={styles.skeletonBody}>
                        <View style={[styles.skeletonLine, styles.skeletonTitle]} />
                        <View style={[styles.skeletonLine, styles.skeletonDescription]} />
                    </View>
                </View>
            ))}
        </>
    )
}

const useStyles = createThemedStyles(theme => ({
    // No fence of its own any more. The sheet around it is the container, and a bordered
    // panel inside a bordered sheet is a box drawn twice.
    browser: {
        flex: 1,
        // Without it a flex child on the web refuses to shrink below its content, so a
        // long shelf would push the scroller past the bottom of the sheet instead of
        // scrolling inside it.
        minHeight: 0,
        width: '100%',
        gap: 10
    },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two
    },

    headerLabel: {
        fontSize: 11,
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: 1.8,
        color: theme.colors.textMuted
    },

    headerCount: {
        fontSize: 11,
        fontWeight: 800,
        color: theme.colors.textSecondary
    },

    // Pushes the close to the far end without the label and the count drifting apart:
    // those two are one phrase and belong next to each other.
    headerSpacer: {
        flex: 1
    },

    close: {
        width: 30,
        height: 30,
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 999,
        backgroundColor: theme.colors.backgroundElement
    },

    plain: {
        gap: 9
    },

    // Sunken, the way every field in the app reads: somewhere to put something rather
    // than a button that does something.
    search: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 9,
        height: 42,
        paddingHorizontal: 12,
        borderRadius: 14,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.backgroundInput
    },

    searchInput: {
        flex: 1,
        minWidth: 0,
        fontSize: 13,
        // A `TextInput` is not an `AppText`, so the Outfit family is applied by hand.
        fontFamily: fontFamilyForWeight(700),
        color: theme.colors.text
    },

    sortChip: {
        flexShrink: 0,
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 7,
        backgroundColor: theme.colors.backgroundElement
    },

    sortChipText: {
        fontSize: 10,
        fontWeight: 900,
        letterSpacing: 0.6,
        color: theme.colors.textSecondary
    },

    rows: {
        flex: 1,
        minHeight: 0
    },

    scroller: {
        flex: 1
    },

    scrollerContent: {
        gap: 9,
        // The gutter the scrollbar lives in, and what keeps a row's hard shadow from
        // being clipped against the edge it is thrown towards.
        paddingRight: 8,
        // Room under the last row for the fade to sit over something.
        paddingBottom: 12
    },

    fade: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: FADE_HEIGHT,
        ...washToTop(theme.colors.background)
    },

    skeletonRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 12,
        borderRadius: 20,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.borderMuted,
        backgroundColor: theme.colors.backgroundSecondary
    },

    skeletonAvatar: {
        width: 44,
        height: 44,
        flexShrink: 0,
        borderRadius: 999
    },

    skeletonBody: {
        flex: 1,
        minWidth: 0,
        gap: 7
    },

    skeletonLine: {
        height: 10,
        borderRadius: 5,
        backgroundColor: theme.colors.boardEmpty
    },

    skeletonTitle: {
        width: '55%'
    },

    skeletonDescription: {
        width: '80%'
    }
}));

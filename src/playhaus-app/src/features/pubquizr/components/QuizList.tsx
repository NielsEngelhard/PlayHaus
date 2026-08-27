import AppText from "@/components/text/AppText";
import InlineNotification from "@/components/ui/InlineNotification";
import Tabs from "@/components/ui/Tabs";
import TextButton from "@/components/ui/TextButton";
import { Spacing, fontFamilyForWeight, hardShadow } from "@/constants/theme";
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

/**
 * The shelf whose name is not a shelf yet.
 *
 * Community quizzes are the one tab with nothing behind it, so it is answered here
 * rather than by an empty list from the API — "nobody has written one" and "you cannot
 * write one yet" are different things to be told.
 */
const COMING_SOON: QuizCategory = 'community';

/** How many placeholder rows stand in for the first page while it is on its way. */
const SKELETON_ROWS = 3;

/**
 * The ceiling on the shelf: five rows and the divider under them.
 *
 * Chosen against the shortest phone rather than against the content — the point is that
 * the panel ends well inside the viewport, so there is page above it and page below it
 * and the thing that scrolls is visibly a box rather than the screen.
 */
const LIST_MAX_HEIGHT = 336;

/**
 * What the web's scrollbar rules in `global.css` are hung on.
 *
 * An id rather than a class because react-native-web offers no way to set one, and a
 * screen only ever holds a single shelf — the index page has one, and the setup screen
 * renders the same component once.
 */
const SCROLLER_ID = 'quiz-shelf-scroller';

/** The wash over the bottom edge of the shelf, saying the rows carry on past it. */
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
     * Turns the rows from links into a choice. Without it this is the shelf on the
     * index page, and tapping a quiz goes to the setup screen.
     */
    onSelect?: (quiz: QuizListItem) => void,
    /**
     * A quiz to leave out of the rows.
     *
     * For the setup screen, where the chosen quiz is already drawn above the list — it
     * would otherwise appear twice on one screen, once as the answer and once as an
     * option, which reads as two different quizzes with the same name.
     */
    omitQuizId?: string
}

/**
 * Every quiz there is, in a box you can see the bottom of.
 *
 * This did not use to scroll. The argument against it was that the page is already
 * inside the app's one scroller and a list with its own would be a scroll area inside a
 * scroll area — two things to flick, one of which swallows the other. That objection is
 * about a list with no visible end: a shelf that filled the viewport would leave nowhere
 * to put a finger that is not the inner list, and forty quizzes down the page the two
 * mode cards and the weekly stamp had been pushed out of reach entirely.
 *
 * So the shelf is capped at `LIST_MAX_HEIGHT` and fenced by the panel's own border.
 * There is always page above it and page below it to flick instead, and the boundary is
 * something you see rather than something you find out about. What the button-paged
 * design got right is kept: "load older" still sits at the end of the rows, inside the
 * box, because pages arriving on a press is what stops a shelf being infinite.
 *
 * Search is the other half of the answer. It runs over the pages already loaded, because
 * that is all the endpoint offers — `GET /api/v1/pubquizr/quizzes` takes a category, a
 * locale and a page number and nothing else — which is why running out of matches with
 * more pages behind them says so instead of showing an empty shelf.
 */
export default function QuizList({ onSelect, omitQuizId }: Props) {
    const t = useT();
    const theme = useTheme();
    const styles = useStyles();

    const [category, setCategory] = useState<QuizCategory>('weekly');
    const [query, setQuery] = useState('');
    const [sort, setSort] = useState<Sort>('newest');

    const quizzes = useQuizzes(category);

    /**
     * A new shelf is a new question, so it is asked from scratch. Carrying the old words
     * across would open the tab already filtered by something nobody typed on it, which
     * looks like the new shelf is nearly empty.
     */
    function chooseCategory(next: QuizCategory) {
        setCategory(next);
        setQuery('');
    }

    const needle = fold(query.trim());
    const searching = needle !== '';

    const visible = useMemo(() => {
        const kept = omitQuizId === undefined
            ? quizzes.items
            : quizzes.items.filter(quiz => quiz.id !== omitQuizId);

        const matched = needle === ''
            ? kept
            : kept.filter(quiz =>
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
    }, [quizzes.items, omitQuizId, needle, sort]);

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
        <View style={styles.panel}>
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
            </View>

            <Tabs
                tabs={QUIZ_CATEGORIES}
                activeTab={category}
                onClick={chooseCategory}
                getLabel={tab => t(`pubquizr.index.list.tabs.${tab}`)}
            />

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
                        <Skeleton />
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

                    <View>
                        <ScrollView
                            style={styles.scroller}
                            contentContainerStyle={styles.scrollerContent}
                            // Without this Android hands every gesture over the shelf
                            // straight to the page behind it, and the inner list never
                            // moves at all.
                            nestedScrollEnabled
                            // Tapping a row with the keyboard up should be tapping a row,
                            // not dismissing the keyboard and losing the tap.
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator
                            // On the web that indicator is the browser's own, and an
                            // unstyled one over this panel is invisible. What makes it
                            // show is in `global.css`, hung on this id.
                            id={SCROLLER_ID}
                            onLayout={onLayout}
                            onContentSizeChange={onContentSizeChange}
                            onScroll={onScroll}
                            scrollEventThrottle={16}
                        >
                            {visible.length === 0 ? (
                                // Not always a failed search: `omitQuizId` can empty a
                                // one-quiz shelf on the setup screen, and "nothing
                                // matches" would be the wrong thing to say about a
                                // search nobody ran.
                                <InlineNotification
                                    icon={searching ? 'search' : 'inbox'}
                                    message={!searching
                                        ? t('pubquizr.index.list.empty')
                                        : quizzes.hasMore
                                            ? t('pubquizr.index.list.noMatchesMore')
                                            : t('pubquizr.index.list.noMatches')}
                                />
                            ) : (
                                visible.map(quiz => (
                                    <QuizRow key={quiz.id} quiz={quiz} onSelect={onSelect} />
                                ))
                            )}

                            {/* Inside the box, at the end of the rows — including the end
                                of no rows at all, which is the one case where the answer
                                someone searched for is a page that has not arrived. */}
                            {quizzes.hasMore && (
                                <LoadOlder
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

interface LoadOlderProps {
    busy: boolean,
    onPress: () => void
}

/**
 * The end of the list, and the way past it: a rule across the column with the label
 * sitting in the gap.
 *
 * Drawn as a divider rather than as a button because that is what it is — the line says
 * the list stops here, and the words say it does not have to.
 */
function LoadOlder({ busy, onPress }: LoadOlderProps) {
    const t = useT();
    const styles = useStyles();

    return (
        <Pressable
            onPress={onPress}
            disabled={busy}
            accessibilityRole="button"
            accessibilityState={{ disabled: busy, busy }}
            style={styles.loadOlder}
        >
            <View style={styles.rule} />

            <AppText style={styles.loadOlderText}>
                {busy ? t('common.busy') : t('pubquizr.index.list.loadOlder')}
            </AppText>

            <View style={styles.rule} />
        </Pressable>
    )
}

/**
 * The shape of the list before there is one.
 *
 * Rows rather than a spinner: the page is about to be a column of these, so the wait
 * should be the same column with nothing written in it yet — the list arrives by filling
 * in rather than by replacing what was there.
 */
function Skeleton() {
    const styles = useStyles();
    const theme = useTheme();

    return (
        <>
            {Array.from({ length: SKELETON_ROWS }, (_, index) => (
                <View
                    key={index}
                    // Nothing here to read out, and three empty rows announced as
                    // anything at all would be three announcements of nothing.
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                    style={[
                        styles.skeletonRow,
                        // The rows fade as they go down, so the column reads as one
                        // thing loading rather than as three that failed.
                        { opacity: 1 - index * 0.25 }
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
    // The fence. A shelf that scrolls has to look like a container before it is
    // scrolled, or the first flick is a surprise — light cuts it out of the page with
    // the same ink line and offset everything else on it wears, and dark, where that
    // line would be invisible, leaves the raised fill to do it.
    panel: {
        width: '100%',
        borderRadius: 24,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.background,
        padding: 14,
        gap: 10,
        ...(theme.scheme === 'dark' ? {} : hardShadow(4, theme.colors.border))
    },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
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

    scroller: {
        maxHeight: LIST_MAX_HEIGHT,
        // Not `flex`, which would stretch a two-row shelf to the full ceiling and leave
        // the panel mostly empty.
        flexGrow: 0
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

    loadOlder: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 9,
        paddingTop: Spacing.one,
        paddingBottom: 2
    },

    rule: {
        flex: 1,
        height: 2,
        backgroundColor: theme.colors.boardEmptyBorder
    },

    // The one accent that means "there is more of this" in either scheme: blue on
    // paper, lemon on the dark canvas, which is what `focus` already resolves to.
    loadOlderText: {
        fontSize: 12,
        fontWeight: 800,
        color: theme.colors.focus
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

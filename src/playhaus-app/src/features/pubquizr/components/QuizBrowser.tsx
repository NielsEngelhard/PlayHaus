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

// The shelf whose name is not a shelf yet.
const COMING_SOON: QuizCategory = 'community';

/** How many placeholder rows stand in for the first page while it is on its way. */
const SKELETON_ROWS = 5;

// What the web's scrollbar rules in `global.css` are hung on.
const SCROLLER_ID = 'quiz-shelf-scroller';

/** The wash over the bottom edge of the rows, saying they carry on past it. */
const FADE_HEIGHT = 34;

// How close to the bottom counts as the bottom.
const END_SLACK = 4;

// The two orders the shelf can be in.
type Sort = 'newest' | 'alpha';

// The three ways the shelf can be split by whether a quiz has been played.
type PlayedFilter = 'all' | 'unplayed' | 'played';

const PLAYED_FILTERS = ['all', 'unplayed', 'played'] as const satisfies readonly PlayedFilter[];

/** What NFD leaves behind once an accent has been split off the letter it sat on. */
const COMBINING_MARKS = /[\u0300-\u036f]/g;

// A string reduced to what a search should care about: case folded, accents dropped.
function fold(value: string): string {
    return value.toLowerCase().normalize('NFD').replace(COMBINING_MARKS, '');
}

// A wash from a fill straight up into nothing.
function washToTop(color: string): ViewStyle {
    const gradient = `linear-gradient(to top, ${color}, ${color}00)`;

    return Platform.select<ViewStyle>({
        web: { backgroundImage: gradient } as ViewStyle,
        default: { experimental_backgroundImage: gradient } as ViewStyle
    })!;
}

interface Props {
    // Turns the rows from links into a choice.
    onSelect?: (quiz: QuizListItem) => void,
    // What a row does when it is not a choice.
    onOpen?: (quiz: QuizListItem) => void,
    // The quiz already chosen, drawn as the active row wherever it turns up.
    selectedQuizId?: string,
    // The way out, drawn at the end of the header row.
    onClose?: () => void
}

// Every quiz there is, filling whatever it has been given.
export default function QuizBrowser({ onSelect, onOpen, selectedQuizId, onClose }: Props) {
    const t = useT();
    const theme = useTheme();
    const styles = useStyles();

    const [category, setCategory] = useState<QuizCategory>('weekly');
    const [query, setQuery] = useState('');
    const [sort, setSort] = useState<Sort>('newest');
    // Defaults to the shelf's own reason for existing: what is left to play, not what has already been.
    const [playedFilter, setPlayedFilter] = useState<PlayedFilter>('unplayed');

    const quizzes = useQuizzes(category);

    // A new shelf is a new question, so it is asked from scratch.
    function chooseCategory(next: QuizCategory) {
        setCategory(next);
        setQuery('');
        setPlayedFilter('unplayed');
    }

    const needle = fold(query.trim());
    const searching = needle !== '';

    // Sub-counts for the played/unplayed tabs.
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

        // Compared on the folded title rather than through `localeCompare`, for the same two reasons the fold exists.
        return [...matched].sort((left, right) => {
            const a = fold(left.title);
            const b = fold(right.title);

            return a < b ? -1 : a > b ? 1 : 0;
        });
    }, [quizzes.items, playedFilter, needle, sort]);

    // The three measurements behind the fade, held as refs rather than as state.
    const viewport = useRef(0);
    const content = useRef(0);
    const offset = useRef(0);

    const [faded, setFaded] = useState(false);

    const measure = useCallback(() => {
        const below = content.current - viewport.current - offset.current;

        // Same value back means React bails out of the render entirely.
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
                {/* `Label`'s own typography, not the component. */}
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
                // Nothing to search and nothing to scroll: whatever there is to say stands on its own, at the size it wants to be.
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

                        {/* Spelled as the order it would put the shelf in rather than the one it is in. */}
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

                    {/* Takes the rest of the sheet, so the rows are what fills it and the fade below has something to sit on the edge of. */}
                    <View style={styles.rows}>
                        <ScrollView
                            style={styles.scroller}
                            contentContainerStyle={styles.scrollerContent}
                            // Tapping a row with the keyboard up should be tapping a row, not dismissing the keyboard and losing the tap.
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator
                            // On the web that indicator is the browser's own, and an unstyled one over this sheet is invisible.
                            id={SCROLLER_ID}
                            onLayout={onLayout}
                            onContentSizeChange={onContentSizeChange}
                            onScroll={onScroll}
                            scrollEventThrottle={16}
                        >
                            {visible.length === 0 ? (
                                // Not always a failed search — a shelf can simply have nothing on it yet.
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
                                        onPress={onOpen}
                                        selected={quiz.id === selectedQuizId}
                                    />
                                ))
                            )}

                            {/* At the end of the rows — including the end of no rows at all. */}
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

// The shape of the list before there is one.
export function QuizSkeleton({ rows }: SkeletonProps) {
    const styles = useStyles();
    const theme = useTheme();

    return (
        <>
            {Array.from({ length: rows }, (_, index) => (
                <View
                    key={index}
                    // Nothing here to read out, and empty rows announced as anything at all would be several announcements of nothing.
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                    style={[
                        styles.skeletonRow,
                        // The rows fade as they go down, so the column reads as one thing loading rather than as several that failed.
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
    // No fence of its own any more.
    browser: {
        flex: 1,
        // Without it a flex child on the web refuses to shrink below its content.
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

    // Pushes the close to the far end without the label and the count drifting apart.
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

    // Sunken, the way every field in the app reads: somewhere to put something rather than a button that does something.
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
        // The gutter the scrollbar lives in.
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

import AppText from "@/components/text/AppText";
import InlineNotification from "@/components/ui/InlineNotification";
import Tabs from "@/components/ui/Tabs";
import TextButton from "@/components/ui/TextButton";
import { Brand, FontSizes, Radii, Spacing, fontFamilyForWeight } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import Feather from "@expo/vector-icons/Feather";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { newestQuizId } from "../quiz-shelf";
import { useQuizzes } from "../useQuizzes";
import QuizCard from "./QuizCard";
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

// How far short of the bottom the next page is already asked for.
const LOAD_AHEAD = 240;

// The two orders the shelf can be in.
type Sort = 'newest' | 'alpha';

const FIELD_HEIGHT = 42;
const CADENCE_DISC_SIZE = 26;
const SWITCH_WIDTH = 34;
const SWITCH_HEIGHT = 20;
const SWITCH_KNOB_SIZE = 13;
const SKELETON_AVATAR_SIZE = 34;
const SKELETON_LINE_HEIGHT = 10;
const SKELETON_HEADLINE_HEIGHT = 18;

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
    const [unplayedOnly, setUnplayedOnly] = useState(true);

    const quizzes = useQuizzes(category);

    // A new shelf is a new question, so it is asked from scratch.
    function chooseCategory(next: QuizCategory) {
        setCategory(next);
        setQuery('');
        setUnplayedOnly(true);
    }

    const needle = fold(query.trim());
    const searching = needle !== '';

    const visible = useMemo(() => {
        const byPlayed = unplayedOnly
            ? quizzes.items.filter(quiz => quiz.played !== true)
            : quizzes.items;

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
    }, [quizzes.items, unplayedOnly, needle, sort]);

    // The three measurements behind the fade, held as refs rather than as state.
    const viewport = useRef(0);
    const content = useRef(0);
    const offset = useRef(0);

    const [faded, setFaded] = useState(false);

    // The shelf as the last render saw it, for `measure` to read without being rebuilt on every page.
    const pager = useRef(quizzes);

    const measure = useCallback(() => {
        const below = content.current - viewport.current - offset.current;

        // Same value back means React bails out of the render entirely.
        setFaded(previous => {
            const next = viewport.current > 0 && below > END_SLACK;

            return next === previous ? previous : next;
        });

        // Also fires while the column is too short to scroll at all, so a filtered shelf keeps filling itself.
        const { hasMore, loadingMore, moreFailed, loadMore } = pager.current;
        if (viewport.current > 0 && below < LOAD_AHEAD && hasMore && !loadingMore && !moreFailed) {
            loadMore();
        }
    }, []);

    // Filtering can change what is shown without changing the content height, so the check runs again whenever either might have moved.
    useEffect(() => {
        pager.current = quizzes;
        measure();
    }, [quizzes, visible.length, measure]);

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
    const featuredId = category === 'weekly' ? newestQuizId(quizzes.items) : null;

    return (
        <View style={styles.browser}>
            <View style={styles.header}>
                {/* `Label`'s own typography, not the component. */}
                <AppText style={styles.headerLabel}>
                    {t('pubquizr.index.list.label')}
                </AppText>

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
                            {category === 'weekly' && (
                                <View style={styles.cadence}>
                                    <View style={styles.cadenceDisc}>
                                        <Feather name="calendar" size={14} color={Brand.ink} />
                                    </View>

                                    <AppText style={styles.cadenceText}>
                                        {t('pubquizr.index.list.weeklyCadence')}
                                    </AppText>
                                </View>
                            )}

                            <View style={styles.searchRow}>
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

                                <Pressable
                                    onPress={() => setUnplayedOnly(current => !current)}
                                    accessibilityRole="switch"
                                    accessibilityLabel={t('pubquizr.index.list.unplayedOnly')}
                                    accessibilityState={{ checked: unplayedOnly }}
                                    style={[styles.filter, unplayedOnly && styles.filterOn]}
                                >
                                    <AppText style={[styles.filterText, unplayedOnly && styles.filterTextOn]}>
                                        {t('pubquizr.index.list.unplayedOnly')}
                                    </AppText>

                                    <View style={[styles.switchTrack, unplayedOnly && styles.switchTrackOn]}>
                                        <View style={[styles.switchKnob, unplayedOnly && styles.switchKnobOn]} />
                                    </View>
                                </Pressable>
                            </View>

                            {visible.length === 0 ? (
                                // Not always a failed search — a shelf can simply have nothing on it yet.
                                <InlineNotification
                                    icon={searching ? 'search' : unplayedOnly ? 'filter' : 'inbox'}
                                    message={searching
                                        ? (quizzes.hasMore
                                            ? t('pubquizr.index.list.noMatchesMore')
                                            : t('pubquizr.index.list.noMatches'))
                                        : unplayedOnly
                                            ? t('pubquizr.index.list.filterEmpty')
                                            : t('pubquizr.index.list.empty')}
                                />
                            ) : (
                                visible.map(quiz => (
                                    <QuizCard
                                        key={quiz.id}
                                        quiz={quiz}
                                        featured={quiz.id === featuredId}
                                        onSelect={onSelect}
                                        onPress={onOpen}
                                        selected={quiz.id === selectedQuizId}
                                    />
                                ))
                            )}

                            {/* Older pages arrive on their own; the rule only shows one on its way, or offers a retry once one did not arrive. */}
                            {quizzes.hasMore && (quizzes.loadingMore || quizzes.moreFailed) && (
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
                    <View style={[styles.skeletonLine, styles.skeletonHeadline]} />

                    <View style={styles.skeletonFooter}>
                        <View style={[styles.skeletonAvatar, { backgroundColor: theme.colors.boardEmpty }]} />

                        <View style={styles.skeletonBody}>
                            <View style={[styles.skeletonLine, styles.skeletonTitle]} />
                            <View style={[styles.skeletonLine, styles.skeletonDescription]} />
                        </View>
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
        gap: Spacing.two
    },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two
    },

    headerLabel: {
        fontSize: FontSizes.xs,
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: 1.8,
        color: theme.colors.textMuted
    },

    // Pushes the close to the far end.
    headerSpacer: {
        flex: 1
    },

    close: {
        width: 30,
        height: 30,
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: Radii.full,
        backgroundColor: theme.colors.backgroundElement
    },

    plain: {
        gap: Spacing.two
    },

    cadence: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two,
        padding: Spacing.two,
        borderRadius: Radii.lg,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.backgroundSecondary
    },

    cadenceDisc: {
        width: CADENCE_DISC_SIZE,
        height: CADENCE_DISC_SIZE,
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: Radii.full,
        borderWidth: theme.borderWidth,
        borderColor: Brand.ink,
        backgroundColor: Brand.lemon
    },

    cadenceText: {
        flex: 1,
        minWidth: 0,
        fontSize: FontSizes.sm,
        fontWeight: 900,
        letterSpacing: -0.2,
        color: theme.colors.text
    },

    searchRow: {
        flexDirection: 'row',
        alignItems: 'stretch',
        gap: Spacing.two
    },

    // Sunken, the way every field in the app reads: somewhere to put something rather than a button that does something.
    search: {
        flex: 1,
        minWidth: 0,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two,
        height: FIELD_HEIGHT,
        paddingHorizontal: Spacing.two,
        borderRadius: Radii.md,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.backgroundInput
    },

    searchInput: {
        flex: 1,
        minWidth: 0,
        fontSize: FontSizes.sm,
        // A `TextInput` is not an `AppText`, so the Outfit family is applied by hand.
        fontFamily: fontFamilyForWeight(700),
        color: theme.colors.text
    },

    sortChip: {
        flexShrink: 0,
        paddingHorizontal: Spacing.two,
        paddingVertical: Spacing.one,
        borderRadius: Radii.sm,
        backgroundColor: theme.colors.backgroundElement
    },

    sortChipText: {
        fontSize: FontSizes.xs,
        fontWeight: 900,
        letterSpacing: 0.6,
        color: theme.colors.textSecondary
    },

    filter: {
        flexShrink: 0,
        height: FIELD_HEIGHT,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two,
        paddingHorizontal: Spacing.two,
        borderRadius: Radii.md,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.borderDashed,
        backgroundColor: theme.colors.backgroundSecondary
    },

    filterOn: {
        borderColor: theme.colors.border
    },

    filterText: {
        fontSize: FontSizes.xs,
        fontWeight: 900,
        letterSpacing: -0.1,
        color: theme.colors.textSecondary
    },

    filterTextOn: {
        color: theme.colors.text
    },

    switchTrack: {
        width: SWITCH_WIDTH,
        height: SWITCH_HEIGHT,
        flexShrink: 0,
        justifyContent: 'center',
        paddingHorizontal: Spacing.half,
        borderRadius: Radii.full,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.borderDashed,
        backgroundColor: theme.colors.backgroundElement
    },

    switchTrackOn: {
        alignItems: 'flex-end',
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.primary
    },

    switchKnob: {
        width: SWITCH_KNOB_SIZE,
        height: SWITCH_KNOB_SIZE,
        borderRadius: Radii.full,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.borderDashed,
        backgroundColor: theme.colors.backgroundSecondary
    },

    switchKnobOn: {
        borderColor: Brand.ink,
        backgroundColor: Brand.textOnAccent
    },

    rows: {
        flex: 1,
        minHeight: 0
    },

    scroller: {
        flex: 1
    },

    scrollerContent: {
        gap: Spacing.two,
        // The gutter the scrollbar lives in, which also leaves the cards' hard shadows room.
        paddingRight: Spacing.two,
        // Room under the last card for the fade to sit over something.
        paddingBottom: Spacing.two
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
        gap: Spacing.two,
        padding: Spacing.three,
        borderRadius: Radii.xl,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.borderMuted,
        backgroundColor: theme.colors.backgroundSecondary
    },

    skeletonFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two
    },

    skeletonAvatar: {
        width: SKELETON_AVATAR_SIZE,
        height: SKELETON_AVATAR_SIZE,
        flexShrink: 0,
        borderRadius: Radii.full
    },

    skeletonBody: {
        flex: 1,
        minWidth: 0,
        gap: Spacing.two
    },

    skeletonLine: {
        height: SKELETON_LINE_HEIGHT,
        borderRadius: Radii.sm,
        backgroundColor: theme.colors.boardEmpty
    },

    skeletonHeadline: {
        width: '90%',
        height: SKELETON_HEADLINE_HEIGHT
    },

    skeletonTitle: {
        width: '55%'
    },

    skeletonDescription: {
        width: '80%'
    }
}));

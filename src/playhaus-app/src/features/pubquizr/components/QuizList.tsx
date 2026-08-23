import AppText from "@/components/text/AppText";
import InlineNotification from "@/components/ui/InlineNotification";
import Tabs from "@/components/ui/Tabs";
import TextButton from "@/components/ui/TextButton";
import { Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import { useState } from "react";
import { Pressable, View } from "react-native";
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
 * Every quiz there is, one shelf at a time, newest first.
 *
 * Not a `FlatList`: the page it sits on is already inside the app's one scroller, and a
 * list with its own would be a scroll area inside a scroll area — two things to flick,
 * one of which swallows the other. The pages come in on a button instead, which is what
 * "load older" is for.
 */
export default function QuizList({ onSelect, omitQuizId }: Props) {
    const t = useT();
    const styles = useStyles();

    const [category, setCategory] = useState<QuizCategory>('weekly');
    const quizzes = useQuizzes(category);

    const rows = omitQuizId === undefined
        ? quizzes.items
        : quizzes.items.filter(quiz => quiz.id !== omitQuizId);

    return (
        <View style={styles.container}>
            <Tabs
                tabs={QUIZ_CATEGORIES}
                activeTab={category}
                onClick={setCategory}
                getLabel={tab => t(`pubquizr.index.list.tabs.${tab}`)}
            />

            <View style={styles.list}>
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
                ) : quizzes.items.length === 0 ? (
                    <InlineNotification
                        icon="inbox"
                        message={t('pubquizr.index.list.empty')}
                    />
                ) : (
                    <>
                        {rows.map(quiz => (
                            <QuizRow key={quiz.id} quiz={quiz} onSelect={onSelect} />
                        ))}

                        {quizzes.hasMore && (
                            <LoadOlder
                                busy={quizzes.loadingMore}
                                onPress={quizzes.loadMore}
                            />
                        )}
                    </>
                )}
            </View>
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
    container: {
        width: '100%',
        gap: 10
    },

    list: {
        gap: 9
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

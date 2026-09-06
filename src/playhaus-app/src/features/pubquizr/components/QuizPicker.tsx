import AppText from "@/components/text/AppText";
import Label from "@/components/text/Label";
import { Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import Feather from "@expo/vector-icons/Feather";
import { useEffect, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import type { QuizListItem } from "../pubquizr-quizzes";
import { usePlayableQuizzes } from "../useQuizzes";
import QuizRow from "./QuizRow";
import QuizSheet from "./QuizSheet";

interface Props {
    quiz: QuizListItem | null
    onSelect: (quiz: QuizListItem) => void
}

/**
 * Which quiz the table is about to play, and the way to every other one.
 *
 * The step used to be the whole shelf, inline: a bordered panel with its own 336px
 * scroller sitting inside the settings sheet's scroller. It owned the entire screen and
 * still only showed five rows of it, and both scrollers were live at once.
 *
 * Now the browse is `QuizSheet`, the same sheet the index page opens, so the picker
 * looks and behaves identically in both places — and what is left on the step is the
 * answer: the chosen quiz, and a line that opens the rest.
 *
 * Arriving with nothing chosen opens the sheet by itself. Step 2 has exactly one job, so
 * a step that showed a heading, an empty space and a greyed-out `Next` would be asking
 * somebody to press a button to be asked the question they came here for. Arriving with
 * a quiz already chosen — through the `?quizId=` deep link from the index, or stepping
 * back from step 3 — does not, because then the question has an answer already.
 */
export default function QuizPicker({ quiz, onSelect }: Props) {
    const t = useT();
    const theme = useTheme();
    const styles = useStyles();

    const [browsing, setBrowsing] = useState(false);

    // Only for the count on the row, which is about every shelf the sheet holds rather
    // than the one it opens on. Nothing extra is fetched to show it: these are the same
    // two requests the sheet makes, answered before it is opened.
    const shelves = usePlayableQuizzes();

    /*
     * Once, and only on the way in.
     *
     * Without the ref, closing the sheet without picking anything would satisfy the
     * condition again on the very next render and reopen it — a sheet that cannot be
     * dismissed, which is the opposite of what this one is for.
     */
    const opened = useRef(false);
    useEffect(() => {
        if (opened.current || quiz !== null) return;

        opened.current = true;
        setBrowsing(true);
    }, [quiz]);

    function choose(picked: QuizListItem) {
        onSelect(picked);
        setBrowsing(false);
    }

    return (
        <View style={styles.container}>
            {quiz !== null && (
                <View>
                    <Label label={t('pubquizr.oneDevice.quiz.selected')} />

                    {/* Still pressable, and it opens the browse: on a step whose whole
                        subject is this one row, the row is the most obvious thing to
                        press to change it. A button rather than a chosen radio, because
                        pressing it is not choosing it again — it is asking the question
                        the sheet answers. */}
                    <QuizRow quiz={quiz} onPress={() => setBrowsing(true)} selected />
                </View>
            )}

            {/*
              * A line of the page rather than a field: icon, what it is with the count
              * under it, a chevron saying there is more behind it. The same shape
              * `SelectInput`'s `row` variant uses, for the same reason — this is a
              * control that opens a list, and it should read like the others that do.
              */}
            <Pressable
                onPress={() => setBrowsing(true)}
                accessibilityRole="button"
                accessibilityLabel={t('pubquizr.index.list.browse')}
                style={styles.browse}
            >
                <View style={styles.browseIcon}>
                    <Feather name="book-open" size={18} color={theme.colors.textOnAccent} />
                </View>

                <View style={styles.browseBody}>
                    <AppText style={styles.browseTitle} numberOfLines={1}>
                        {quiz === null
                            ? t('pubquizr.oneDevice.quiz.pick')
                            : t('pubquizr.oneDevice.quiz.pickAnother')}
                    </AppText>

                    <AppText style={styles.browseValue} numberOfLines={1}>
                        {shelves.ready
                            ? t('pubquizr.index.list.total', { quizzes: shelves.total })
                            : t('pubquizr.index.list.label')}
                    </AppText>
                </View>

                <Feather name="chevron-right" size={18} color={theme.colors.textMuted} />
            </Pressable>

            <QuizSheet
                visible={browsing}
                onClose={() => setBrowsing(false)}
                onSelect={choose}
                selectedQuizId={quiz?.id}
            />
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    container: {
        width: '100%',
        gap: Spacing.three
    },

    browse: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 12,
        borderRadius: 20,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.backgroundSecondary,
        ...theme.shadows.hardSmall
    },

    // The same 56dp disc a quiz row wears, so the line sits on the grid the rows above
    // it set rather than half an avatar to the left of it.
    browseIcon: {
        width: 56,
        height: 56,
        flexShrink: 0,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.primary
    },

    browseBody: {
        flex: 1,
        minWidth: 0
    },

    browseTitle: {
        fontSize: 17,
        fontWeight: 900,
        letterSpacing: -0.5,
        color: theme.colors.text
    },

    browseValue: {
        marginTop: 3,
        fontSize: 12.5,
        fontWeight: 700,
        color: theme.colors.textSecondary
    }
}));

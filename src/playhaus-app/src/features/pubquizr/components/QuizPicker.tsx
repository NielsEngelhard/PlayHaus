import Label from "@/components/text/Label";
import TextButton from "@/components/ui/TextButton";
import { Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import type { QuizListItem } from "../pubquizr-quizzes";
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
    const styles = useStyles();

    const [browsing, setBrowsing] = useState(false);

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

            {/* Same plain button the index page opens its own browse sheet with, rather
                than a bordered row of its own — one shape for "there is a list behind
                this" across the game. */}
            <TextButton
                text={quiz === null
                    ? t('pubquizr.oneDevice.quiz.pick')
                    : t('pubquizr.oneDevice.quiz.pickAnother')}
                onPress={() => setBrowsing(true)}
                variant="neutral"
                fullWidth
            />

            <QuizSheet
                visible={browsing}
                onClose={() => setBrowsing(false)}
                onSelect={choose}
                selectedQuizId={quiz?.id}
            />
        </View>
    )
}

const useStyles = createThemedStyles(() => ({
    container: {
        width: '100%',
        gap: Spacing.three
    }
}));

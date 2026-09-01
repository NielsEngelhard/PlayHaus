import Label from "@/components/text/Label";
import { Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { View } from "react-native";
import type { QuizListItem } from "../pubquizr-quizzes";
import QuizList from "./QuizList";
import QuizRow from "./QuizRow";

interface Props {
    quiz: QuizListItem | null
    onSelect: (quiz: QuizListItem) => void
}

/**
 * Which quiz the table is about to play, and every other one they could have picked.
 *
 * The chosen quiz is pinned above the shelf because it may not be on the shelf at all
 * — it can have come from another tab, or from a page of older quizzes nobody has
 * loaded — and an answer you have to go looking for is not an answer.
 *
 * It is pinned *as well as* left in the rows, not instead of them. Both are drawn
 * selected, so the pair reads as one quiz seen twice rather than as two: the row above
 * is the answer, and the ticked row below is where that answer sits among the others.
 * Pulling it out of the list instead made the shelf re-flow under the finger that had
 * just tapped it, and left whoever came back to change their mind hunting for the one
 * row that was no longer there.
 */
export default function QuizPicker({ quiz, onSelect }: Props) {
    const t = useT();
    const styles = useStyles();

    return (
        <View style={styles.container}>
            {quiz !== null && (
                <View>
                    <Label label={t('pubquizr.oneDevice.quiz.selected')} />

                    {/* Selected and still pressable. Pressing it changes nothing, which
                        is the right answer to tapping the thing you already chose — the
                        alternative is a row that looks like the others and refuses. */}
                    <QuizRow quiz={quiz} onSelect={onSelect} selected />
                </View>
            )}

            <View>
                <Label
                    label={quiz === null
                        ? t('pubquizr.oneDevice.quiz.pick')
                        : t('pubquizr.oneDevice.quiz.pickAnother')}
                />

                <QuizList onSelect={onSelect} selectedQuizId={quiz?.id} />
            </View>
        </View>
    )
}

const useStyles = createThemedStyles(() => ({
    container: {
        width: '100%',
        gap: Spacing.three
    }
}))

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

// Which quiz the table is about to play, and the way to every other one.
export default function QuizPicker({ quiz, onSelect }: Props) {
    const t = useT();
    const styles = useStyles();

    const [browsing, setBrowsing] = useState(false);

    // Once, and only on the way in.
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

                    {/* Still pressable, and it opens the browse. */}
                    <QuizRow quiz={quiz} onPress={() => setBrowsing(true)} selected />
                </View>
            )}

            {/* Same plain button the index page opens its own browse sheet with, rather than a bordered row of its own. */}
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

import { Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import BoardNote from "@/features/pubquizr/components/board/BoardNote";
import BoardQuestionCard from "@/features/pubquizr/components/board/BoardQuestionCard";
import BoardSpotlight from "@/features/pubquizr/components/board/BoardSpotlight";
import type { HotSeatTurn } from "@/features/pubquizr/hot-seat";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { View } from "react-native";

interface Props {
    mySeat: number | null
    turn: HotSeatTurn
    /** How many seats the question has already beaten. */
    walked: number
}

// Rounds 1, 6 and 7 on every phone but the reader's: the question, whose it is, and who decides.
export default function WalkWatchBoard({ mySeat, turn, walked }: Props) {
    const t = useT();
    const styles = useStyles();

    const answering = turn.remaining[walked] ?? turn.answering;
    const nextUp = turn.remaining[walked + 1] ?? null;
    const beaten = walked > 0 ? turn.remaining[walked - 1] ?? null : null;
    const mine = answering.seat === mySeat;
    const beatenName = beaten === null ? '' : beaten.seat === mySeat ? t('pubquizr.board.you') : beaten.name;

    const master = turn.quizmaster.name;
    const verdict = nextUp === null
        ? t('pubquizr.board.judges', { master })
        : t('pubquizr.board.judgesThenNext', { master, next: nextUp.name });

    return (
        <View style={styles.board}>
            <BoardQuestionCard
                category={turn.question.category}
                cue={mine ? t('pubquizr.board.yourTurn') : t('pubquizr.board.theirTurn', { name: answering.name })}
                number={turn.number}
                prompt={turn.question.prompt}
                total={turn.total}
                worth={turn.worth}
            />

            {beaten !== null && (
                <BoardNote
                    seat={beaten}
                    tone="blush"
                    text={mine
                        ? t('pubquizr.board.missedToYou', { name: beatenName })
                        : t('pubquizr.board.missed', { name: beatenName, next: answering.name })}
                />
            )}

            <BoardSpotlight
                seat={answering}
                title={mine ? t('pubquizr.board.sayIt') : t('pubquizr.board.answerNow', { name: answering.name })}
                message={verdict}
            />

            <BoardNote
                seat={turn.quizmaster}
                tone="quiet"
                text={t('pubquizr.board.masterHasIt', { name: master })}
            />
        </View>
    )
}

const useStyles = createThemedStyles(() => ({
    board: {
        marginTop: Spacing.three,
        flex: 1,
        minHeight: 0,
        gap: Spacing.three
    }
}))

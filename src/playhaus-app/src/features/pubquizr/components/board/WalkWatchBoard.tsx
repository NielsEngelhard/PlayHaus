import { Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import BoardNote from "@/features/pubquizr/components/board/BoardNote";
import BoardSpotlight from "@/features/pubquizr/components/board/BoardSpotlight";
import PreviousQuestion from "@/features/pubquizr/components/board/PreviousQuestion";
import { MAX_HOT_SEAT_RUN, placeKeyOf, type HotSeatTurn, type PreviousRuling } from "@/features/pubquizr/hot-seat";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { View } from "react-native";

interface Props {
    mySeat: number | null
    /** How the question before this one ended, and null on the round's first. */
    previous: PreviousRuling | null
    turn: HotSeatTurn
    /** How many seats the question has already beaten. */
    walked: number
}

// Rounds 1, 6 and 7 on every phone but the reader's: the question is only heard, so this says who reads it and where you stand.
export default function WalkWatchBoard({ mySeat, previous, turn, walked }: Props) {
    const t = useT();
    const styles = useStyles();

    const answering = turn.remaining[walked] ?? turn.answering;
    const beaten = walked > 0 ? turn.remaining[walked - 1] ?? null : null;
    const mine = answering.seat === mySeat;
    const beatenName = beaten === null ? '' : beaten.seat === mySeat ? t('pubquizr.board.you') : beaten.name;
    const place = placeKeyOf(turn.remaining, mySeat);

    // The same number as the badge on the strip above, so the two never disagree.
    const standing = place === null
        ? t('pubquizr.board.isUp', { name: answering.name })
        : mine
            ? t('pubquizr.board.queuePlaceNow', { place: t(place) })
            : t('pubquizr.board.queuePlace', { place: t(place) });

    return (
        <View style={styles.board}>
            {turn.streakEnded !== null && (
                <BoardNote
                    seat={turn.streakEnded}
                    tone="lemon"
                    text={t('pubquizr.board.streakCapped', { name: turn.streakEnded.name, max: MAX_HOT_SEAT_RUN })}
                />
            )}

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
                seat={turn.quizmaster}
                title={t('pubquizr.board.readsAloud', { name: turn.quizmaster.name })}
                message={standing}
            />

            {previous !== null && <PreviousQuestion mySeat={mySeat} previous={previous} />}
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

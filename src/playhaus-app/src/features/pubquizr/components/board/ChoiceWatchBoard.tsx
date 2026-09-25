import AppText from "@/components/text/AppText";
import BleedScrollView from "@/components/ui/BleedScrollView";
import SeatAvatar from "@/components/ui/SeatAvatar";
import { Brand, FontSizes, Radii, Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import BoardNote from "@/features/pubquizr/components/board/BoardNote";
import BoardQuestionCard from "@/features/pubquizr/components/board/BoardQuestionCard";
import PreviousQuestion from "@/features/pubquizr/components/board/PreviousQuestion";
import type { HotSeatTurn, PreviousRuling } from "@/features/pubquizr/hot-seat";
import type { PQPick } from "@/features/pubquizr/multi-device/control";
import { seatAt, type Seat } from "@/features/pubquizr/seats";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { View } from "react-native";

const LETTER_TILE = 30;
const PICKER_AVATAR = 22;

interface Props {
    answering: Seat
    mySeat: number | null
    /** How the question before this one ended, and null on the round's first. */
    previous: PreviousRuling | null
    /** Every pick already spent on this question. */
    picks: PQPick[]
    seats: Seat[]
    turn: HotSeatTurn
}

// Round 2 on every phone but the one choosing: the whole card, nothing to tap, and the options already thrown away.
export default function ChoiceWatchBoard({ answering, mySeat, picks, previous, seats, turn }: Props) {
    const t = useT();
    const styles = useStyles();

    const spentBy = new Map(picks.map(pick => [pick.answerId, pick.seat]));

    return (
        <View style={styles.board}>
            <BoardQuestionCard
                cue={t('pubquizr.board.picking', { name: answering.name })}
                number={null}
                prompt={turn.question.prompt}
                total={turn.total}
                worth={turn.worth}
            />

            <BoardNote seat={answering} text={t('pubquizr.board.picksOnOwnPhone', { name: answering.name })} />

            <BleedScrollView style={styles.options} contentContainerStyle={styles.optionsInner}>
                {turn.options.map(option => {
                    const by = spentBy.get(option.id);
                    const picker = by === undefined ? null : seatAt(seats, by);
                    const right = picker !== null && option.correct;
                    const wrong = picker !== null && !option.correct;

                    return (
                        <View key={option.id} style={[styles.option, wrong && styles.optionSpent, right && styles.optionRight]}>
                            <View style={styles.letter}>
                                <AppText style={styles.letterText}>{option.letter}</AppText>
                            </View>

                            <AppText style={[styles.optionText, picker !== null && styles.optionTextOnFill, wrong && styles.optionTextSpent]} numberOfLines={2}>
                                {option.text}
                            </AppText>

                            {picker !== null && <SeatAvatar seat={picker} size={PICKER_AVATAR} />}
                        </View>
                    )
                })}
            </BleedScrollView>

            {previous !== null && <PreviousQuestion mySeat={mySeat} previous={previous} />}
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    board: {
        marginTop: Spacing.three,
        flex: 1,
        minHeight: 0,
        gap: Spacing.three
    },

    options: {
        flex: 1,
        minHeight: 0
    },

    optionsInner: {
        gap: Spacing.two
    },

    option: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.three,
        padding: Spacing.three,
        borderRadius: Radii.lg,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.borderMuted,
        backgroundColor: theme.colors.backgroundElement
    },

    optionSpent: {
        opacity: 0.55,
        backgroundColor: theme.colors.blush
    },

    optionRight: {
        borderColor: Brand.ink,
        backgroundColor: theme.colors.mint
    },

    letter: {
        width: LETTER_TILE,
        height: LETTER_TILE,
        borderRadius: Radii.sm,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.borderMuted,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.backgroundSecondary
    },

    letterText: {
        fontSize: FontSizes.sm,
        fontWeight: 900,
        color: theme.colors.textSecondary
    },

    optionText: {
        flex: 1,
        minWidth: 0,
        fontSize: FontSizes.md,
        fontWeight: 800,
        color: theme.colors.textSecondary
    },

    optionTextOnFill: {
        color: Brand.ink
    },

    optionTextSpent: {
        textDecorationLine: 'line-through',
        textDecorationColor: Brand.ink
    }
}))

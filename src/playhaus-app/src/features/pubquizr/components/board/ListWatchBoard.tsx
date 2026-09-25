import AppText from "@/components/text/AppText";
import ActionButton from "@/components/ui/ActionButton";
import BleedScrollView from "@/components/ui/BleedScrollView";
import SeatAvatar from "@/components/ui/SeatAvatar";
import { Brand, FontSizes, Radii, Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import BoardClock from "@/features/pubquizr/components/board/BoardClock";
import BoardNote from "@/features/pubquizr/components/board/BoardNote";
import BoardQuestionCard from "@/features/pubquizr/components/board/BoardQuestionCard";
import BoardSpotlight from "@/features/pubquizr/components/board/BoardSpotlight";
import { useSecondsLeft } from "@/features/pubquizr/components/board/useSecondsLeft";
import { LIST_SECONDS, type ListTurn } from "@/features/pubquizr/round-five";
import type { Seat } from "@/features/pubquizr/seats";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import Feather from "@expo/vector-icons/Feather";
import { View } from "react-native";

const ROSTER_AVATAR = 44;
const TICK = 18;
const SLOT_HEIGHT = 48;

interface Props {
    /** The answers the quizmaster has ticked, which are the only ones this phone may show. */
    awardedIds: string[]
    endsAt: number | null
    /** The round's name, for the rules screen's headline. */
    kind: string
    mySeat: number | null
    onReady: () => void
    /** Everybody who has to say they read the rules before the first turn, which is everybody but the quizmaster. */
    readers: Seat[]
    /** Which of them have. */
    ready: number[]
    /** Whether this turn opens the round, which is the only turn the rules are read out before. */
    opening: boolean
    turn: ListTurn
}

// Round 5 on every phone but the quizmaster's: the rules once, then the question, the clock, and each answer as it is ticked.
export default function ListWatchBoard({ awardedIds, endsAt, kind, mySeat, onReady, opening, readers, ready, turn }: Props) {
    const t = useT();
    const styles = useStyles();

    const left = useSecondsLeft(endsAt, LIST_SECONDS);
    const readySet = new Set(ready);
    const everyoneReady = readers.every(seat => readySet.has(seat.seat));
    const credited = new Set(awardedIds);

    if (opening && !everyoneReady && left === null) {
        const done = readers.filter(seat => readySet.has(seat.seat)).length;

        return (
            <View style={styles.board}>
                <View style={styles.rules}>
                    <AppText style={styles.title}>{kind}</AppText>

                    <AppText style={styles.message}>
                        {t('pubquizr.board.listRules', { seconds: LIST_SECONDS })}
                    </AppText>
                </View>

                <View style={styles.roster}>
                    <AppText style={styles.caps}>{t('pubquizr.board.readyToStart')}</AppText>

                    <View style={styles.faces}>
                        {readers.map(seat => (
                            <View key={seat.seat} style={!readySet.has(seat.seat) && styles.waiting}>
                                <SeatAvatar seat={seat} size={ROSTER_AVATAR} />

                                {readySet.has(seat.seat) && (
                                    <View style={styles.tick}>
                                        <Feather name="check" size={10} color={Brand.ink} />
                                    </View>
                                )}
                            </View>
                        ))}
                    </View>

                    <AppText style={styles.readyCount}>
                        {t('pubquizr.board.readyCount', { done, total: readers.length })}
                    </AppText>
                </View>

                {mySeat !== null && !readySet.has(mySeat) && (
                    <ActionButton size="large" text={t('pubquizr.board.gotIt')} onPress={onReady} />
                )}
            </View>
        )
    }

    const card = (
        <BoardQuestionCard
            cue={t('pubquizr.board.namesFour', { name: turn.guesser.name })}
            number={null}
            prompt={turn.question.prompt}
            total={turn.total}
            worth={0}
        />
    );

    // Before the clock and before anything has been ticked: read the question while there is time.
    if (left === null && credited.size === 0) {
        return (
            <View style={styles.board}>
                {card}

                <BoardSpotlight
                    seat={null}
                    title={t('pubquizr.board.clockSoon')}
                    message={t('pubquizr.board.readAhead', { seconds: LIST_SECONDS })}
                />
            </View>
        )
    }

    return (
        <View style={styles.board}>
            {card}

            {left !== null && <BoardClock left={left} seconds={LIST_SECONDS} />}

            <BleedScrollView style={styles.slots} contentContainerStyle={styles.slotsInner}>
                {turn.answers.map(answer => {
                    const got = credited.has(answer.id);

                    return (
                        <View key={answer.id} style={[styles.slot, got && styles.slotGot]}>
                            <AppText style={[styles.slotText, got && styles.slotTextGot]} numberOfLines={1}>
                                {got ? answer.text : '—'}
                            </AppText>
                        </View>
                    )
                })}
            </BleedScrollView>

            <BoardNote
                seat={turn.guesser}
                text={t('pubquizr.board.listFooter', { guesser: turn.guesser.name, master: turn.quizmaster.name })}
                trailing={<AppText style={styles.tally}>{`${credited.size} / ${turn.answers.length}`}</AppText>}
            />
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

    rules: {
        flex: 1,
        justifyContent: 'center',
        gap: Spacing.three
    },

    title: {
        fontSize: FontSizes.xxl,
        fontWeight: 900,
        letterSpacing: -1,
        textAlign: 'center',
        color: theme.colors.text
    },

    message: {
        fontSize: FontSizes.sm,
        lineHeight: FontSizes.sm * 1.5,
        fontWeight: 700,
        textAlign: 'center',
        color: theme.colors.textSecondary
    },

    roster: {
        alignItems: 'center',
        gap: Spacing.two
    },

    caps: {
        fontSize: FontSizes.xs,
        fontWeight: 900,
        letterSpacing: 1.6,
        textTransform: 'uppercase',
        color: theme.colors.textMuted
    },

    faces: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: Spacing.two
    },

    waiting: {
        opacity: 0.4
    },

    tick: {
        position: 'absolute',
        right: -Spacing.one,
        bottom: -Spacing.one,
        width: TICK,
        height: TICK,
        borderRadius: Radii.full,
        borderWidth: theme.borderWidth,
        borderColor: Brand.ink,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Brand.mint
    },

    readyCount: {
        fontSize: FontSizes.xs,
        fontWeight: 800,
        color: theme.colors.text
    },

    slots: {
        flex: 1,
        minHeight: 0
    },

    slotsInner: {
        gap: Spacing.two
    },

    slot: {
        height: SLOT_HEIGHT,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: Radii.lg,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.borderMuted,
        backgroundColor: theme.colors.backgroundElement
    },

    slotGot: {
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.mint,
        ...theme.shadows.hard
    },

    slotText: {
        fontSize: FontSizes.lg,
        fontWeight: 900,
        color: theme.colors.textMuted
    },

    // Mint in both schemes, so the answer on it is ink in both.
    slotTextGot: {
        color: Brand.ink
    },

    tally: {
        fontSize: FontSizes.xs,
        fontWeight: 900,
        color: theme.colors.text
    }
}))

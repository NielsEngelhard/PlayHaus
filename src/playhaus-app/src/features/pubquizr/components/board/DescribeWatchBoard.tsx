import AppText from "@/components/text/AppText";
import ActionButton from "@/components/ui/ActionButton";
import { FontSizes, Radii, Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import BoardClock from "@/features/pubquizr/components/board/BoardClock";
import BoardNote from "@/features/pubquizr/components/board/BoardNote";
import BoardSpotlight from "@/features/pubquizr/components/board/BoardSpotlight";
import { useSecondsLeft } from "@/features/pubquizr/components/board/useSecondsLeft";
import { DESCRIBE_SECONDS, type DescribeTurn } from "@/features/pubquizr/round-four";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { View } from "react-native";

const TILE_HEIGHT = 44;

interface Props {
    /** How many words the describer has ticked off so far. */
    awarded: number
    /** When the describer's clock runs out, and null when it is not running. */
    endsAt: number | null
    mySeat: number | null
    /** Says this phone is ready. Only the guesser's phone has anything to say. */
    onReady: () => void
    /** Whether the guesser has said they are ready. */
    ready: boolean
    turn: DescribeTurn
}

// Round 4 on every phone but the describer's: a count and a clock, and never one of the words.
export default function DescribeWatchBoard({ awarded, endsAt, mySeat, onReady, ready, turn }: Props) {
    const t = useT();
    const styles = useStyles();

    const left = useSecondsLeft(endsAt, DESCRIBE_SECONDS);
    const guessing = turn.guesser.seat === mySeat;
    const total = turn.words.length;

    if (left !== null) {
        return (
            <View style={styles.board}>
                <BoardClock left={left} seconds={DESCRIBE_SECONDS} trailing={`${awarded} / ${total}`} />

                <View style={styles.tiles}>
                    {turn.words.map((word, index) => (
                        <View key={word.dealt.id} style={[styles.tile, index < awarded && styles.tileGot]} />
                    ))}
                </View>

                <AppText style={styles.count}>
                    {t('pubquizr.board.wordsGuessed', { done: awarded, total })}
                </AppText>

                <BoardNote seat={null} tone="quiet" text={t('pubquizr.board.wordsSecret', { name: turn.describer.name })} />
            </View>
        )
    }

    if (guessing && !ready) {
        return (
            <View style={styles.board}>
                <BoardSpotlight
                    seat={turn.guesser}
                    title={t('pubquizr.board.mustGuess')}
                    message={t('pubquizr.board.mustGuessRules', {
                        describer: turn.describer.name,
                        words: total,
                        seconds: DESCRIBE_SECONDS
                    })}
                />

                <BoardNote seat={null} tone="quiet" text={t('pubquizr.board.neverSeeWords')} />

                <ActionButton size="large" icon="check" text={t('pubquizr.board.imReady')} onPress={onReady} />
            </View>
        )
    }

    return (
        <View style={styles.board}>
            <BoardSpotlight
                seat={turn.describer}
                title={t('pubquizr.board.describing', { describer: turn.describer.name, guesser: turn.guesser.name })}
                message={ready
                    ? t('pubquizr.board.readyWaiting', { name: turn.describer.name })
                    : t('pubquizr.board.notReadyYet', { name: turn.guesser.name })}
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

    tiles: {
        gap: Spacing.two
    },

    tile: {
        height: TILE_HEIGHT,
        borderRadius: Radii.md,
        borderWidth: theme.borderWidth,
        borderStyle: 'dashed',
        borderColor: theme.colors.borderDashed
    },

    tileGot: {
        borderStyle: 'solid',
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.mint,
        ...theme.shadows.hardSmall
    },

    count: {
        fontSize: FontSizes.lg,
        fontWeight: 900,
        textAlign: 'center',
        color: theme.colors.text
    }
}))

import TextHint from "@/components/text/TextHint";
import ActionButton from "@/components/ui/ActionButton";
import InlineNotification from "@/components/ui/InlineNotification";
import { Spacing } from "@/constants/theme";
import type { TranslationKey } from "@/features/i18n/keys";
import { useT } from "@/features/i18n/LanguageContext";
import ScriptCard from "@/features/pubquizr/components/play/ScriptCard";
import TurnStrip from "@/features/pubquizr/components/play/TurnStrip";
import { EASY_POINTS, HARD_POINTS, type DoubleDownPool } from "@/features/pubquizr/round-six";
import type { Seat } from "@/features/pubquizr/seats";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import { View } from "react-native";

interface Props {
    /** Whoever is being asked, which is whose phone this is. */
    answering: Seat
    /** A choice is already in the air. */
    busy: boolean
    error: TranslationKey | null
    /** 1-based, for the strip. */
    number: number
    // Called once, with the question this phone asked for.
    onChoose: (sessionQuestionId: string) => void
    /** What the round has left of each side. A side the table has spent is a button that will not press. */
    pool: DoubleDownPool
    quizmaster: Seat
    /** Which round this is, for the strip. */
    round: number
    total: number
}

// Round 6 on the phone whose turn it is: two buttons, and whichever one is pressed is the question that goes on the screen.
export default function DoubleDownControl({
    answering,
    busy,
    error,
    number,
    onChoose,
    pool,
    quizmaster,
    round,
    total
}: Props) {
    const styles = useStyles();
    const t = useT();
    const theme = useTheme();

    // Which question each side would ask, and null once that side is spent.
    const easy = pool.easy[0] ?? null;
    const hard = pool.hard[0] ?? null;

    return (
        <View style={styles.turn}>
            <TurnStrip
                quizmaster={quizmaster}
                answering={answering}
                lead=""
                run={0}
                round={round}
                number={number}
                total={total}
                // Nothing is decided yet: what it pays is the question being asked.
                worth={0}
            />

            <ScriptCard
                prompt={t('pubquizr.control.yourChoice')}
                cue={t('pubquizr.control.yourChoiceCue')}
            >
                <View style={styles.choice}>
                    <ActionButton
                        text={t('pubquizr.play.doubleDown.easy', { points: EASY_POINTS })}
                        icon="feather"
                        disabled={busy || easy === null}
                        style={styles.button}
                        onPress={() => { if (easy !== null) onChoose(easy); }}
                    />

                    <ActionButton
                        text={t('pubquizr.play.doubleDown.hard', { points: HARD_POINTS })}
                        icon="zap"
                        disabled={busy || hard === null}
                        style={styles.button}
                        onPress={() => { if (hard !== null) onChoose(hard); }}
                    />
                </View>
            </ScriptCard>

            {error !== null && (
                <InlineNotification
                    icon="alert-triangle"
                    color={theme.colors.blush}
                    message={t(error)}
                />
            )}

            <TextHint text={t('pubquizr.control.theScreenHasIt')} />
        </View>
    )
}

const useStyles = createThemedStyles(() => ({
    // The middle of the board grows and everything else does not.
    turn: {
        marginTop: 12,
        flex: 1,
        minHeight: 0,
        gap: 12
    },

    choice: {
        flexDirection: 'row',
        gap: Spacing.two
    },

    button: {
        flex: 1
    }
}))

import AppText from "@/components/text/AppText";
import ActionButton from "@/components/ui/ActionButton";
import { Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import SeatRing from "@/features/one-of-us/components/SeatRing";
import type { Seat } from "@/features/table/seats";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { View } from "react-native";

interface Props {
    /** 1-based position in this round's shuffled order. */
    number: number
    onNext: () => void
    nextUp: Seat | null
    seats: Seat[]
    speaker: Seat
    total: number
}

/**
 * Whose turn it is to say something.
 *
 * The whole turn happens out loud, so this screen holds nothing but a name — there is
 * nothing to type, nothing to score and nothing for the phone to check. What it is
 * really doing is keeping the order, which is the one thing a table cannot keep in its
 * head once it has started arguing.
 *
 * No hand-off in front of it, unlike the reveal. Nothing here is secret: this screen is
 * meant to be read by the whole table at once, and standing a wall in front of every
 * single turn would make a nine-player round nine taps longer for no reason.
 */
export default function SpeakingTurnScreen({
    number,
    onNext,
    nextUp,
    seats,
    speaker,
    total
}: Props) {
    const t = useT();
    const styles = useStyles();

    const last = number === total;

    return (
        <View style={styles.screen}>
            <View style={styles.middle}>
                <AppText style={styles.step}>
                    {t('oneOfUs.play.speak.step', { number, total })}
                </AppText>

                <SeatRing
                    seats={seats}
                    markOf={seat => seat.seat === speaker.seat ? 'focus' : 'muted'}
                    label={t('oneOfUs.play.speak.nowSpeaking')}
                    headline={speaker.name}
                />

                <AppText style={styles.hint}>
                    {t('oneOfUs.play.speak.hint')}
                </AppText>

                <View
                    style={styles.dashes}
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                >
                    {Array.from({ length: total }, (_, index) => (
                        <View
                            key={index}
                            style={[
                                styles.dash,
                                index < number - 1 && styles.dashDone,
                                index === number - 1 && styles.dashNow
                            ]}
                        />
                    ))}
                </View>
            </View>

            <ActionButton
                size="large"
                icon={last ? 'message-circle' : 'arrow-right'}
                text={last || nextUp === null
                    ? t('oneOfUs.play.speak.lastNext')
                    : t('oneOfUs.play.speak.next', { name: nextUp.name })}
                onPress={onNext}
            />
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    screen: {
        flex: 1,
        width: '100%'
    },

    // Centred in what is left after the header, so the ring sits where the eye already
    // is rather than at the top of a mostly empty screen.
    middle: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center'
    },

    step: {
        marginBottom: Spacing.three,
        fontSize: 11,
        fontWeight: 900,
        textTransform: 'uppercase',
        letterSpacing: 2.2,
        textAlign: 'center',
        color: theme.colors.textMuted
    },

    hint: {
        marginTop: Spacing.three,
        maxWidth: 280,
        fontSize: 14,
        fontWeight: 600,
        lineHeight: 14 * 1.5,
        textAlign: 'center',
        color: theme.colors.textSecondary
    },
    dashes: {
        marginTop: Spacing.three,
        flexDirection: 'row',
        gap: 5
    },
    dash: {
        width: 22,
        height: 5,
        borderRadius: 999,
        backgroundColor: theme.colors.boardEmptyBorder
    },
    dashDone: {
        backgroundColor: theme.colors.text
    },
    dashNow: {
        backgroundColor: theme.colors.violet
    }
}))

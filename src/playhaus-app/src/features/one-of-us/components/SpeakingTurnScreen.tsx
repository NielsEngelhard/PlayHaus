import AppText from "@/components/text/AppText";
import ActionButton from "@/components/ui/ActionButton";
import SeatAvatar from "@/components/ui/SeatAvatar";
import { useT } from "@/features/i18n/LanguageContext";
import type { Seat } from "@/features/table/seats";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { View } from "react-native";

interface Props {
    speaker: Seat
    round: number
    /** 1-based position in this round's shuffled order. */
    number: number
    total: number
    onNext: () => void
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
export default function SpeakingTurnScreen({ speaker, round, number, total, onNext }: Props) {
    const t = useT();
    const styles = useStyles();

    const last = number === total;

    return (
        <View style={styles.screen}>
            <View style={styles.middle}>
                <AppText style={styles.step}>
                    {t('oneOfUs.play.speak.step', { round, number, total })}
                </AppText>

                <SeatAvatar seat={speaker} size={112} raised style={styles.avatar} />

                <AppText style={styles.label}>
                    {t('oneOfUs.play.speak.nowSpeaking')}
                </AppText>

                <AppText style={styles.name}>{speaker.name}</AppText>

                <AppText style={styles.hint}>
                    {t('oneOfUs.play.speak.hint')}
                </AppText>
            </View>

            <ActionButton
                size="large"
                icon={last ? 'message-circle' : 'arrow-right'}
                text={last
                    ? t('oneOfUs.play.speak.lastNext')
                    : t('oneOfUs.play.speak.next')}
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

    // Centred in what is left after the header, so the name sits where the eye already
    // is rather than at the top of a mostly empty screen.
    middle: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0
    },

    step: {
        fontSize: 11,
        fontWeight: 900,
        textTransform: 'uppercase',
        letterSpacing: 2.2,
        textAlign: 'center',
        color: theme.colors.textMuted
    },

    avatar: {
        marginTop: 24
    },

    label: {
        marginTop: 22,
        fontSize: 11.5,
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: 1.6,
        color: theme.colors.textMuted
    },

    name: {
        marginTop: 6,
        fontSize: 40,
        fontWeight: 900,
        lineHeight: 40 * 1.05,
        letterSpacing: -1.6,
        textAlign: 'center',
        color: theme.colors.text
    },

    hint: {
        marginTop: 16,
        maxWidth: 280,
        fontSize: 14,
        fontWeight: 600,
        lineHeight: 14 * 1.5,
        textAlign: 'center',
        color: theme.colors.textSecondary
    }
}))

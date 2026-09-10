import AppText from "@/components/text/AppText";
import TextHint from "@/components/text/TextHint";
import SeatAvatar from "@/components/ui/SeatAvatar";
import { useT } from "@/features/i18n/LanguageContext";
import type { Seat } from "@/features/pubquizr/seats";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { View } from "react-native";

interface Props {
    /** What is going on, in a sentence. */
    message: string
    /** The question everybody can read off the screen, repeated here so it can be re-read. Null when nothing is up. */
    prompt: string | null
    /** Whoever the table is waiting on, and null when it is not one person. */
    seat: Seat | null
}

// What most phones show most of the time. Never the answer, and never the options with the right one marked.
export default function ControlWaiting({ message, prompt, seat }: Props) {
    const styles = useStyles();
    const t = useT();

    return (
        <View style={styles.stage}>
            {seat !== null && <SeatAvatar raised seat={seat} size={64} />}

            <AppText style={styles.message}>{message}</AppText>

            {prompt !== null && (
                <View style={styles.card}>
                    <AppText style={styles.label}>{t('pubquizr.control.onTheScreen')}</AppText>

                    <AppText style={styles.prompt}>{prompt}</AppText>
                </View>
            )}

            <TextHint text={t('pubquizr.control.theScreenHasIt')} />
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    stage: {
        marginTop: 12,
        flex: 1,
        minHeight: 0,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16
    },
    message: {
        fontSize: 20,
        fontWeight: 900,
        textAlign: 'center',
        color: theme.colors.text
    },
    card: {
        width: '100%',
        padding: 16,
        gap: 6,
        borderRadius: 18,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.borderMuted,
        backgroundColor: theme.colors.backgroundElement
    },
    label: {
        fontSize: 10,
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: 1.8,
        color: theme.colors.textMuted
    },
    prompt: {
        fontSize: 16,
        fontWeight: 600,
        color: theme.colors.textSecondary
    }
}))

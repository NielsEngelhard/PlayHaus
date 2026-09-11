import AppText from "@/components/text/AppText";
import StartGameButton from "@/components/ui/StartGameButton";
import { useT } from "@/features/i18n/LanguageContext";
import type { TranslationKey } from "@/features/i18n/keys";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { View } from "react-native";

interface Props {
    /** Whether this device is the host's, who is the only one who can open the rooms. */
    isHost: boolean,
    /** The host's name, for the line everybody else waits on. */
    hostName: string,
    /** How many matches this round has drawn. */
    matches: number,
    starting: boolean,
    onStart: () => void,
    /** The press was refused. Said under the button, which stays pressable. */
    error: TranslationKey | null
}

// The gate between the draw and the matches: the table reads the bracket until the host opens it.
export default function StageStartFooter({ isHost, hostName, matches, starting, onStart, error }: Props) {
    const styles = useStyles();
    const t = useT();

    return (
        <View>
            {isHost ? (
                <StartGameButton
                    text={starting ? t('common.busy') : t('lol.tournament.startMatches')}
                    onPress={onStart}
                    disabled={starting}
                />
            ) : (
                <AppText style={styles.waiting}>
                    {t('lol.tournament.waitingForStart', { name: hostName })}
                </AppText>
            )}

            {error !== null && (
                <AppText style={[styles.footnote, styles.error]}>{t(error)}</AppText>
            )}

            <AppText style={styles.footnote}>
                {matches === 1
                    ? t('lol.tournament.startGateOne')
                    : t('lol.tournament.startGateMany', { matches })}
            </AppText>
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    // Stands where the host's button stands, so the footer keeps its height.
    waiting: {
        height: 58,
        textAlign: 'center',
        textAlignVertical: 'center',
        lineHeight: 58,
        fontSize: 15,
        fontWeight: 800,
        color: theme.colors.textSecondary
    },
    footnote: {
        marginTop: 10,
        textAlign: 'center',
        fontSize: 11.5,
        fontWeight: 600,
        color: theme.colors.textMuted
    },
    error: {
        color: theme.colors.destructiveText
    }
}))

import AppText from "@/components/text/AppText";
import StartGameButton from "@/components/ui/StartGameButton";
import { useT } from "@/features/i18n/LanguageContext";
import type { TranslationKey } from "@/features/i18n/keys";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { View } from "react-native";

interface Props {
    /** Every match of this round has an answer, which is the whole of the gate. */
    stageOver: boolean,
    /** How many matches this round still has running. */
    outstanding: number,
    /** How many of this round's matches there are in total. */
    total: number,
    readyCount: number,
    readyNeeded: number,
    /** This player has already said they are ready, and is waiting on the rest. */
    ready: boolean,
    readying: boolean,
    onReady: () => void,
    /** The ready press was refused. Said under the button, which stays pressable. */
    error: TranslationKey | null
}

// The gate between one round of the bracket and the next.
export default function ReadyFooter({
    stageOver,
    outstanding,
    total,
    readyCount,
    readyNeeded,
    ready,
    readying,
    onReady,
    error
}: Props) {
    const styles = useStyles();
    const t = useT();

    const label = !stageOver
        ? outstanding === 1
            ? t('lol.tournament.waitingOnOne')
            : t('lol.tournament.waitingOnMany', { matches: outstanding })
        : ready
            ? t('lol.tournament.readyWaiting')
            : readying
                ? t('common.busy')
                : t('lol.tournament.ready');

    return (
        <View>
            <StartGameButton
                text={label}
                onPress={onReady}
                disabled={!stageOver || ready || readying}
            />

            {error !== null && (
                <AppText style={[styles.footnote, styles.error]}>{t(error)}</AppText>
            )}

            <AppText style={styles.footnote}>
                {stageOver
                    ? t('lol.tournament.readyCount', { ready: readyCount, total: readyNeeded })
                    : t('lol.tournament.readyGate', { matches: total })}
            </AppText>
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
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

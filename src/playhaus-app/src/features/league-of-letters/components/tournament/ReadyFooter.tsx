import AppText from "@/components/text/AppText";
import StartGameButton from "@/components/ui/StartGameButton";
import { FontSizes, Radii, Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import type { TranslationKey } from "@/features/i18n/keys";
import ReadyMark from "@/features/league-of-letters/components/tournament/ReadyMark";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { View } from "react-native";

export interface RosterEntry {
    userId: string,
    name: string,
    ready: boolean
}

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
    /** This player is drawn into the next stage. Knocked out or sitting it out, there is nothing to press. */
    playsNext: boolean,
    /** This player is out of the tournament, which is said differently from sitting one stage out. */
    eliminated: boolean,
    readying: boolean,
    onReady: () => void,
    /** The ready press was refused. Said under the button, which stays pressable. */
    error: TranslationKey | null,
    /** Everybody the gate is waiting on, and whether each has pressed. */
    roster: RosterEntry[],
    /** Whose screen this is, so their own chip says so. */
    userId: string | undefined
}

// The gate between one round of the bracket and the next.
export default function ReadyFooter({
    stageOver,
    outstanding,
    total,
    readyCount,
    readyNeeded,
    ready,
    playsNext,
    eliminated,
    readying,
    onReady,
    error,
    roster,
    userId
}: Props) {
    const styles = useStyles();
    const t = useT();

    const label = !stageOver
        ? outstanding === 1
            ? t('lol.tournament.waitingOnOne')
            : t('lol.tournament.waitingOnMany', { matches: outstanding })
        : !playsNext
            ? eliminated
                ? t('lol.tournament.readyNotNeededOut')
                : t('lol.tournament.readyNotNeededBye')
            : ready
                ? t('lol.tournament.readyWaiting')
                : readying
                    ? t('common.busy')
                    : t('lol.tournament.ready');

    return (
        <View>
            {stageOver && roster.length > 0 && (
                <View style={styles.roster}>
                    {roster.map(entry => (
                        <View key={entry.userId} style={styles.chip}>
                            <ReadyMark ready={entry.ready} />

                            <AppText style={styles.chipName} numberOfLines={1}>
                                {entry.userId === userId ? t('lol.tournament.you') : entry.name}
                            </AppText>
                        </View>
                    ))}
                </View>
            )}

            <StartGameButton
                text={label}
                onPress={onReady}
                disabled={!stageOver || !playsNext || ready || readying}
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
    roster: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: Spacing.one,
        marginBottom: Spacing.two
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.one,
        maxWidth: '100%',
        paddingVertical: Spacing.half,
        paddingLeft: Spacing.half,
        paddingRight: Spacing.two,
        borderRadius: Radii.full,
        backgroundColor: theme.colors.backgroundSecondary
    },
    chipName: {
        flexShrink: 1,
        fontSize: FontSizes.xs,
        fontWeight: 800,
        color: theme.colors.text
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

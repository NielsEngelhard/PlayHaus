import AppText from "@/components/text/AppText";
import { useT } from "@/features/i18n/LanguageContext";
import type { Seat } from "@/features/pubquizr/seats";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import Feather from "@expo/vector-icons/Feather";
import type { ReactNode } from "react";
import { View } from "react-native";

interface Props {
    prompt: string
    // The line above the question.
    cue?: string
    // How big the question is set.
    size?: number
    // Everybody at the table, in seating order, for the score strip along the bottom.
    seats?: Seat[]
    // Whatever else belongs inside this card: round 2's four options, round 3's stake and its guessers.
    children?: ReactNode
    // Where the content sits when there is room to spare.
    align?: 'centre' | 'top'
    // Whether the card takes every point it is given (the default) or grows only into room that is actually spare.
    fills?: boolean
}

// The line to say out loud, set as a line to say out loud — and whatever has to be read out with it.
export default function ScriptCard({
    prompt,
    cue,
    size = 27,
    seats,
    children,
    align = 'centre',
    fills = true
}: Props) {
    const t = useT();
    const theme = useTheme();
    const styles = useStyles();

    return (
        <View style={[styles.wrapper, !fills && styles.grows]}>
            <View style={styles.cue}>
                <Feather name="volume-2" size={15} color={theme.colors.primary} />

                <AppText style={styles.cueText}>
                    {cue ?? t('pubquizr.play.readAloud')}
                </AppText>
            </View>

            <View
                style={[
                    styles.card,
                    align === 'top' && styles.cardTop,
                    !fills && styles.grows
                ]}
            >
                <AppText
                    style={[styles.prompt, { fontSize: size, lineHeight: size * 1.16 }]}
                >
                    {prompt}
                </AppText>

                {children !== undefined && (
                    <View style={styles.extra}>{children}</View>
                )}

                {seats !== undefined && (
                    <View style={styles.scores}>
                        <AppText style={styles.scoresLabel}>
                            {t('pubquizr.play.scores')}
                        </AppText>

                        <View style={styles.scoreRow}>
                            {seats.map(seat => (
                                <AppText key={seat.seat} style={styles.score}>
                                    {seat.initials}{' '}
                                    <AppText style={styles.scoreValue}>{seat.score}</AppText>
                                </AppText>
                            ))}
                        </View>
                    </View>
                )}
            </View>
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    wrapper: {
        flex: 1,
        minHeight: 0
    },

    cue: {
        flexShrink: 0,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8
    },

    // The app's own orange rather than the grey it used to wear.
    cueText: {
        flex: 1,
        minWidth: 0,
        fontSize: 11,
        fontWeight: 900,
        textTransform: 'uppercase',
        letterSpacing: 1.4,
        color: theme.colors.primary
    },

    card: {
        marginTop: 10,
        flex: 1,
        minHeight: 0,
        justifyContent: 'center',
        padding: 16,
        borderRadius: 24,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.backgroundSecondary,
        ...theme.shadows.hardLarge
    },

    cardTop: {
        justifyContent: 'flex-start'
    },

    // The `fills={false}` half of both of the above: grown from the content's own height rather than from zero.
    grows: {
        flexGrow: 1,
        flexShrink: 0,
        flexBasis: 'auto'
    },

    prompt: {
        flexShrink: 0,
        fontWeight: 900,
        letterSpacing: -0.8,
        color: theme.colors.text
    },

    extra: {
        flexShrink: 0,
        marginTop: 16
    },

    scores: {
        flexShrink: 0,
        marginTop: 18,
        paddingTop: 14,
        borderTopWidth: 2,
        borderTopColor: theme.colors.borderMuted,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10
    },

    scoresLabel: {
        flexShrink: 0,
        fontSize: 11,
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: 1.4,
        color: theme.colors.textMuted
    },

    // Wraps rather than scrolls: eight seats is the most there can be.
    scoreRow: {
        flex: 1,
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-end',
        columnGap: 12,
        rowGap: 4
    },

    score: {
        fontSize: 12.5,
        fontWeight: 800,
        color: theme.colors.text
    },

    scoreValue: {
        fontWeight: 900
    }
}))

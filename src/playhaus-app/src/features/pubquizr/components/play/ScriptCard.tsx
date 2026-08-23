import AppText from "@/components/text/AppText";
import { useT } from "@/features/i18n/LanguageContext";
import type { Seat } from "@/features/pubquizr/round-one";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import Feather from "@expo/vector-icons/Feather";
import { View } from "react-native";

interface Props {
    prompt: string
    /**
     * Everybody at the table, in seating order, for the score strip along the bottom.
     *
     * Their running totals, which in round 1 is the same number as "this round" —
     * there has not been another round to score in yet. The moment round 2 lands this
     * needs a per-round breakdown from the server, because a total and a round score
     * stop being the same thing on the very first question of it.
     */
    seats: Seat[]
}

/**
 * The line to say out loud, set as a line to say out loud.
 *
 * Big, quoted, and given the rest of the card to breathe in, because this is the one
 * thing on the screen that leaves the phone as speech. Everything else here is for the
 * person holding it; this is for the room.
 *
 * The scores sit under a rule at the foot of the same card rather than in a panel of
 * their own — they are glanced at between questions, not read, and a card of their own
 * would make them look like something to act on.
 */
export default function ScriptCard({ prompt, seats }: Props) {
    const t = useT();
    const theme = useTheme();
    const styles = useStyles();

    return (
        <View style={styles.wrapper}>
            <View style={styles.cue}>
                <Feather name="volume-2" size={15} color={theme.colors.textSecondary} />

                <AppText style={styles.cueText}>{t('pubquizr.play.readAloud')}</AppText>
            </View>

            <View style={styles.card}>
                {/* Decoration, and skipped by screen readers for that reason — the
                    prompt underneath is the whole content of this card. */}
                <AppText
                    style={styles.quote}
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                >
                    &ldquo;
                </AppText>

                <AppText style={styles.prompt}>{prompt}</AppText>

                <View style={styles.scores}>
                    <AppText style={styles.scoresLabel}>
                        {t('pubquizr.play.scoresThisRound')}
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

    cueText: {
        fontSize: 12,
        fontWeight: 800,
        letterSpacing: 0.2,
        color: theme.colors.textSecondary
    },

    card: {
        marginTop: 10,
        flex: 1,
        minHeight: 0,
        justifyContent: 'center',
        padding: 20,
        borderRadius: 24,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.backgroundSecondary,
        ...(theme.scheme === 'dark' ? {} : theme.shadows.hardLarge)
    },

    quote: {
        fontSize: 38,
        fontWeight: 900,
        lineHeight: 38,
        color: theme.colors.boardEmptyBorder
    },

    prompt: {
        marginTop: -8,
        fontSize: 27,
        fontWeight: 900,
        lineHeight: 27 * 1.2,
        letterSpacing: -0.8,
        color: theme.colors.text
    },

    scores: {
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

    // Wraps rather than scrolls: eight seats is the most there can be, and a row of
    // eight initials that runs out of width should drop onto a second line rather
    // than hide the people at the end of the table.
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

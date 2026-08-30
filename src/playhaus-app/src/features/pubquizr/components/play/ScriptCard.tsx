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
    /**
     * The line above the question. Defaults to "read this out loud"; round 2 says more,
     * because a quizmaster who reads the question and stops is that round's whole
     * failure mode.
     */
    cue?: string
    /**
     * How big the question is set. The default suits a card with something under it;
     * round 3, whose card holds only a pill and a row of avatars, sets it larger.
     */
    size?: number
    /**
     * Everybody at the table, in seating order, for the score strip along the bottom —
     * and left out where there is no room for it.
     *
     * Their running totals, and labelled as such. It used to say "scores this round",
     * which was true for exactly as long as round 1 was the only round there was. A
     * per-round breakdown would mean the server totting up each seat's points per round
     * and sending them along; the scoreboard between rounds tells that story well enough
     * for now, and a label that lies is worse than a strip that only says the total.
     *
     * Round 1 is the only board that still passes them. Rounds 2 and 3 put something
     * taller under the question — four options, a row of guessers — and 40 points spent
     * on a fact nobody acts on is 40 points off the question.
     */
    seats?: Seat[]
    /**
     * Whatever else belongs inside this card: round 2's four options, round 3's stake and
     * its guessers.
     *
     * Inside rather than beside, and that is the whole point of this prop. This card is
     * the only thing on the board that flexes, so anything left outside it competes with
     * the question for height and wins — which is how round 2 ended up reading its
     * question at half the size of the options underneath it.
     *
     * No rule is drawn for it. Where one belongs is a question about what is being added:
     * round 2 rules off the question from its options, round 3 keeps its stake with the
     * question and rules off only the row of guessers.
     */
    children?: ReactNode
    /**
     * Where the content sits when there is room to spare. Centred by default, which is
     * what a card holding one question wants; a card holding a question and four options
     * starts at the top, so a long one grows downwards into the space instead of out of
     * both ends of it.
     */
    align?: 'centre' | 'top'
}

/**
 * The line to say out loud, set as a line to say out loud — and whatever has to be read
 * out with it.
 *
 * Big, quoted, and given the rest of the card to breathe in, because this is the one
 * thing on the screen that leaves the phone as speech. Everything else here is for the
 * person holding it; this is for the room.
 *
 * Anything the quizmaster reads in the same breath goes in `children`, inside the same
 * card, so the flexed space is shared between things that are all part of one utterance
 * rather than fought over by a card and its neighbours.
 */
export default function ScriptCard({
    prompt,
    cue,
    size = 27,
    seats,
    children,
    align = 'centre'
}: Props) {
    const t = useT();
    const theme = useTheme();
    const styles = useStyles();

    return (
        <View style={styles.wrapper}>
            <View style={styles.cue}>
                <Feather name="volume-2" size={15} color={theme.colors.primary} />

                <AppText style={styles.cueText}>
                    {cue ?? t('pubquizr.play.readAloud')}
                </AppText>
            </View>

            <View style={[styles.card, align === 'top' && styles.cardTop]}>
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

    // The app's own orange rather than the grey it used to wear. This line is an
    // instruction to speak, and it is the only one on the board — a grey caption above
    // a black question reads as a heading and gets skipped.
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

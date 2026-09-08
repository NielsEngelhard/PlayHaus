import AppText from "@/components/text/AppText";
import { Brand } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import { ROUND_OPEN, scoresAt } from "@/features/pubquizr/hot-seat";
import type { Seat } from "@/features/pubquizr/seats";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { View } from "react-native";

// A run of one is just somebody who answered a question, so the sentence a screen reader gets starts at two.
const RUN_WORTH_SAYING = 2;

interface Props {
    /** Who is reading the question out. */
    quizmaster: Seat
    // Who has to answer it, or null in the rounds where nobody in particular does.
    answering: Seat | null
    // What the strip says when `answering` is null: "Niels reads · everyone else guesses".
    lead: string
    /** How many questions in a row `answering` has taken, and 0 when they have taken none. */
    run: number
    /** Only for the pips' rhythm — the round's name lives up in the header now. */
    round: number
    /** 1-based: question 3 of 8. */
    number: number
    total: number
    /** What this turn pays whoever takes it. Zero is a question worth only the seat. */
    worth: number
}

// Everything about the turn that is not the question: who, how far in, and what for.
export default function TurnStrip({
    quizmaster,
    answering,
    lead,
    run,
    round,
    number,
    total,
    worth
}: Props) {
    const t = useT();
    const styles = useStyles();

    // Only round 1 alternates.
    const rhythmic = round === ROUND_OPEN;
    const scoring = worth > 0;

    // "3/8" on screen and "Question 3 of 8" to a screen reader.
    const count = (
        <AppText
            style={styles.count}
            accessibilityLabel={
                t('pubquizr.play.questionNumber', { number })
                + t('pubquizr.play.questionTotal', { total })
            }
        >
            {number}
            <AppText style={styles.countTotal}>
                {t('pubquizr.play.questionOutOf', { total })}
            </AppText>
        </AppText>
    );

    if (answering === null) {
        return (
            <View style={styles.card}>
                <View style={styles.soloRow}>
                    <Avatar seat={quizmaster} size="sm" decorative />

                    <AppText style={styles.lead} numberOfLines={1}>{lead}</AppText>

                    {count}
                </View>
            </View>
        )
    }

    return (
        <View style={styles.card}>
            {/* Who is running the turn, and how far into the round it is. */}
            <View style={styles.header}>
                <Avatar seat={quizmaster} size="sm" decorative />

                <AppText style={styles.headerLabel} numberOfLines={1}>
                    {t('pubquizr.play.turn.quizmasterLabel', { name: quizmaster.name })}
                </AppText>

                {count}
            </View>

            <View
                style={styles.spotlight}
                // Read out as the one sentence it is, rather than as three separate scraps.
                accessibilityRole="text"
                accessibilityLabel={run >= RUN_WORTH_SAYING
                    ? t('pubquizr.play.turn.spokenRun', {
                        master: quizmaster.name,
                        player: answering.name,
                        run
                    })
                    : t('pubquizr.play.turn.spoken', {
                        master: quizmaster.name,
                        player: answering.name
                    })}
            >
                <Avatar seat={answering} size="lg" />

                {/* `minWidth: 0` is what lets a long name truncate instead of pushing the badge off the end of the row. */}
                <View style={styles.spotlightBody}>
                    <AppText style={styles.spotlightLabel}>
                        {t('pubquizr.play.turn.answeringNow')}
                    </AppText>

                    <AppText style={styles.spotlightName} numberOfLines={1}>
                        {answering.name}
                    </AppText>
                </View>

                <View style={[styles.badge, scoring && styles.badgeScoring]}>
                    <AppText style={[styles.badgeLabel, scoring && styles.badgeLabelScoring]}>
                        {scoring
                            ? t('pubquizr.play.worthPoints', { worth })
                            : t('pubquizr.play.noPoint')}
                    </AppText>
                </View>
            </View>

            <View style={styles.progress}>
                {/* One pip per question, so the row is the round. */}
                <View
                    style={styles.pips}
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                >
                    {Array.from({ length: total }, (_, index) => (
                        <View
                            key={index}
                            style={[
                                styles.pip,
                                // index is 0-based; the pips count turns.
                                rhythmic && scoresAt(index + 1) && styles.pipScoring,
                                index < number && styles.pipDone
                            ]}
                        />
                    ))}
                </View>
            </View>
        </View>
    )
}

// One person, at one of the strip's two sizes.
function Avatar({ seat, size, decorative }: { seat: Seat, size: 'sm' | 'lg', decorative?: boolean }) {
    const styles = useStyles();

    return (
        <View
            style={[
                styles.avatar,
                size === 'lg' && styles.avatarLarge,
                { backgroundColor: seat.swatch.color }
            ]}
            accessibilityElementsHidden={decorative}
            importantForAccessibility={decorative ? 'no-hide-descendants' : undefined}
        >
            <AppText
                style={[
                    styles.initials,
                    size === 'lg' && styles.initialsLarge,
                    { color: seat.swatch.foreground }
                ]}
            >
                {seat.initials}
            </AppText>
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    // Unpadded: the header, spotlight and progress sections each carry their own.
    card: {
        flexShrink: 0,
        borderRadius: 16,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.backgroundSecondary,
        overflow: 'hidden',
        ...theme.shadows.hardSmall
    },

    // The one-line variant's own row — there is no header/spotlight split to give it padding.
    soloRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 8,
        paddingHorizontal: 10
    },

    // Who is running the turn, and how far into the round it is.
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderBottomWidth: theme.borderWidth,
        borderBottomColor: theme.colors.border
    },

    headerLabel: {
        flex: 1,
        minWidth: 0,
        fontSize: 12,
        fontWeight: 800,
        color: theme.colors.textMuted
    },

    avatar: {
        width: 22,
        height: 22,
        flexShrink: 0,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: theme.borderWidth,
        borderColor: theme.scheme === 'dark' ? theme.colors.border : Brand.ink
    },

    // The spotlight's own portrait, sized to be the one thing on the card a glance lands on first.
    avatarLarge: {
        width: 48,
        height: 48,
        ...theme.shadows.hardSmall
    },

    initials: {
        fontSize: 8.5,
        fontWeight: 900
    },

    initialsLarge: {
        fontSize: 16
    },

    // Who has to answer it: the portrait, its "answering now" label, and the name.
    spotlight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 10,
        paddingHorizontal: 10
    },

    spotlightBody: {
        flex: 1,
        minWidth: 0
    },

    spotlightLabel: {
        fontSize: 10.5,
        fontWeight: 900,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        color: theme.colors.focus
    },

    spotlightName: {
        marginTop: 1,
        fontSize: 20,
        fontWeight: 900,
        letterSpacing: -0.5,
        color: theme.colors.text
    },

    // The one-line variant carries the whole sentence.
    lead: {
        flex: 1,
        minWidth: 0,
        fontSize: 14,
        fontWeight: 900,
        letterSpacing: -0.3,
        color: theme.colors.text
    },

    badge: {
        flexShrink: 0,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 999,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.borderMuted,
        backgroundColor: theme.colors.backgroundElement
    },

    // Mint in both schemes, the same "yes, this one counts" the Correct button wears.
    badgeScoring: {
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.mint
    },

    badgeLabel: {
        fontSize: 10,
        fontWeight: 900,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        color: theme.colors.textMuted
    },

    // Ink on mint in both schemes, because the fill is mint in both.
    badgeLabelScoring: {
        color: Brand.ink
    },

    // Its own section now that the count moved up into the header.
    progress: {
        paddingHorizontal: 10,
        paddingBottom: 8
    },

    pips: {
        flexDirection: 'row',
        // Bottom-aligned so the taller scoring pips grow upwards off one baseline.
        alignItems: 'flex-end',
        gap: 3,
        height: 9
    },

    pip: {
        flex: 1,
        height: 5,
        borderRadius: 999,
        backgroundColor: theme.colors.boardEmptyBorder
    },

    // The ones that pay.
    pipScoring: {
        height: 9
    },

    // The scheme's own "this is done" accent.
    pipDone: {
        backgroundColor: theme.colors.focus
    },

    count: {
        flexShrink: 0,
        fontSize: 11.5,
        fontWeight: 800,
        color: theme.colors.text
    },

    countTotal: {
        color: theme.colors.textMuted
    }
}))

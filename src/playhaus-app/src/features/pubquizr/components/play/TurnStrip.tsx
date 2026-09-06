import AppText from "@/components/text/AppText";
import { Brand } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import { ROUND_OPEN, scoresAt } from "@/features/pubquizr/hot-seat";
import type { Seat } from "@/features/pubquizr/seats";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { View } from "react-native";

/**
 * A run of one is just somebody who answered a question, so the sentence a screen reader
 * gets starts at two. Below that it would be on screen almost permanently and would stop
 * meaning anything, which is the opposite of the job.
 */
const RUN_WORTH_SAYING = 2;

interface Props {
    /** Who is reading the question out. */
    quizmaster: Seat
    /**
     * Who has to answer it, or null in the rounds where nobody in particular does —
     * round 3 asks the whole table at once and round 4 asks nobody.
     */
    answering: Seat | null
    /**
     * What the strip says when `answering` is null: "Niels reads · everyone else
     * guesses". Passed in rather than worked out here, because the second half of that
     * sentence is the round rather than the strip, and this component draws all of them.
     */
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

/**
 * Everything about the turn that is not the question: who, how far in, and what for.
 *
 * This used to be one row wearing both people at the same size, which asked a glance to
 * work out which of the two names mattered right now. It now reads top to bottom instead
 * of left to right: a quiet header line says who is running the turn and how far into the
 * round the table is, and underneath it one spotlighted portrait says who the table is
 * actually waiting on. Nothing else on the card is drawn at that size, so there is never
 * a second thing to glance past to find it.
 *
 * What was dropped to get there is the round's rule ("X keeps being asked until they get
 * one wrong"). It is still said in full on the hand-off screen, which is where somebody
 * picking the phone up actually reads it; on the board it had become furniture.
 *
 * The one-line variant is not a smaller version of the two-line one — it is a different
 * sentence. A round with no seat being asked has no run, no "answers", and nothing to
 * spotlight, so drawing an empty header over an empty portrait would be worse than not
 * drawing either.
 */
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

    // Only round 1 alternates. Everywhere else every turn pays, so a taller pip would be
    // drawing a distinction the round does not make.
    const rhythmic = round === ROUND_OPEN;
    const scoring = worth > 0;

    // "3/8" on screen and "Question 3 of 8" to a screen reader. The strip has room for
    // one of those and not the other, and "3 slash 8" is not a sentence.
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
            {/* Who is running the turn, and how far into the round it is. Read as two
                separate scraps rather than folded into the sentence below — "quizmaster"
                and "question 3 of 8" are both true on their own, unlike the spotlight's
                "asking" sentence, which only means anything the two people together. */}
            <View style={styles.header}>
                <Avatar seat={quizmaster} size="sm" decorative />

                <AppText style={styles.headerLabel} numberOfLines={1}>
                    {t('pubquizr.play.turn.quizmasterLabel', { name: quizmaster.name })}
                </AppText>

                {count}
            </View>

            <View
                style={styles.spotlight}
                // Read out as the one sentence it is, rather than as three separate
                // scraps — the same label the two-avatar row this replaced built, so
                // nothing changes for a screen reader even though the quizmaster's own
                // portrait moved up into the header above. The run is folded in here
                // too, and the points pill after it is not: this stands in for its
                // children, so a pill inside it would go unread, and the points are
                // said nowhere near as often as they are seen.
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

                {/* `minWidth: 0` is what lets a long name truncate instead of pushing
                    the badge off the end of the row. */}
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
                {/* One pip per question, so the row is the round. Not read out: the
                    count up in the header and the badge above already say it in words. */}
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

/**
 * One person, at one of the strip's two sizes: `sm` for the header's own quizmaster line,
 * `lg` for the portrait the spotlight row is built around.
 *
 * `decorative` hides the swatch from a screen reader when the name beside it already says
 * the same thing in words — the header's avatar is exactly that case; the spotlight
 * portrait is not, because it is the only place `answering.name` appears outside the
 * accessibility label built above it.
 */
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
    // Unpadded: the header, spotlight and progress sections each carry their own, so the
    // header's bottom border can run edge to edge under the rounded corners.
    card: {
        flexShrink: 0,
        borderRadius: 16,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.backgroundSecondary,
        overflow: 'hidden',
        ...theme.shadows.hardSmall
    },

    // The one-line variant's own row — there is no header/spotlight split to give it
    // padding, so it carries what `card` used to.
    soloRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 8,
        paddingHorizontal: 10
    },

    // Who is running the turn, and how far into the round it is — quiet on purpose,
    // since the spotlight row underneath it is the thing worth a glance.
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

    // The spotlight's own portrait, sized to be the one thing on the card a glance lands
    // on first — everything else here is either text or a 22-point swatch.
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

    // Who has to answer it: the portrait, its "answering now" label, and the name —
    // spaced apart from `progress` and `header` by their own padding rather than a gap,
    // so the badge at the end can still sit flush with the row it belongs to.
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

    // The one-line variant carries the whole sentence, so it takes the slack the avatar
    // and the count would otherwise be sharing with it.
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

    // Mint in both schemes, the same "yes, this one counts" the Correct button wears,
    // so the two agree about what a scoring question looks like.
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

    // Its own section now that the count moved up into the header — just the pips,
    // padded like the sections above and below it.
    progress: {
        paddingHorizontal: 10,
        paddingBottom: 8
    },

    pips: {
        flexDirection: 'row',
        // Bottom-aligned so the taller scoring pips grow upwards off one baseline,
        // which is what makes the row read as a rhythm rather than as noise.
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

    // The ones that pay. Taller rather than another colour: colour is already saying
    // "done" along this row, and a second colour on the same bars would be two facts
    // fighting over one shape.
    pipScoring: {
        height: 9
    },

    // The scheme's own "this is done" accent — blue on paper, lemon on the dark
    // canvas — which is what `focus` already resolves to everywhere else.
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

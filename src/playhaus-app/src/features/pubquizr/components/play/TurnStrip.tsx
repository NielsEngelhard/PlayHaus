import AppText from "@/components/text/AppText";
import { Brand } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import { ROUND_OPEN, scoresAt } from "@/features/pubquizr/hot-seat";
import type { Seat } from "@/features/pubquizr/seats";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import Feather from "@expo/vector-icons/Feather";
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
 * This was two blocks — a banner of two person cards with the round's rule under it, and
 * a progress card under that — and together they cost about 150 points of a phone. That
 * was affordable in round 1 and it is not in rounds 2 and 3, where a tall block goes in
 * underneath the question as well: `ScriptCard` is the only thing on the board that
 * flexes, so every point spent up here comes off the question, and the question is the
 * one element that leaves the phone as speech. Two lines in one card says the same four
 * facts and gives the difference back.
 *
 * What was dropped to get there is the round's rule ("X keeps being asked until they get
 * one wrong"). It is still said in full on the hand-off screen, which is where somebody
 * picking the phone up actually reads it; on the board it had become furniture.
 *
 * The one-line variant is not a smaller version of the two-line one — it is a different
 * sentence. A round with no seat being asked has no run, no "answers", and nothing to
 * highlight, so drawing an empty second half of the row would be worse than not drawing
 * it.
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
    const theme = useTheme();
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
                <View style={styles.row}>
                    <Avatar seat={quizmaster} />

                    <AppText style={styles.lead} numberOfLines={1}>{lead}</AppText>

                    {count}
                </View>
            </View>
        )
    }

    return (
        <View style={styles.card}>
            <View
                style={styles.row}
                // Read out as the one sentence it is, rather than as five separate
                // scraps — the same label the banner this replaced built, so nothing
                // changes for a screen reader. The run is folded in here too: this
                // stands in for its children, so a pill inside it would go unread.
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
                <Avatar seat={quizmaster} />

                <AppText style={styles.reads}>{t('pubquizr.play.turn.reads')}</AppText>

                <Feather
                    name="arrow-right"
                    size={14}
                    color={theme.colors.textMuted}
                    style={styles.arrow}
                />

                <Avatar seat={answering} />

                {/* `minWidth: 0` is what lets a long name truncate instead of pushing
                    the badge off the end of the row. */}
                <AppText style={styles.name} numberOfLines={1}>
                    {t('pubquizr.play.turn.answers', { name: answering.name })}
                </AppText>

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
                    count beside it and the badge above already say it in words. */}
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

                {count}
            </View>
        </View>
    )
}

/**
 * One person, at strip size.
 *
 * 26 points rather than the 34 the banner used, and no name beside it — the name is said
 * once in the row rather than twice, and at this size the swatch is doing the work a
 * label would anyway.
 */
function Avatar({ seat }: { seat: Seat }) {
    const styles = useStyles();

    return (
        <View style={[styles.avatar, { backgroundColor: seat.swatch.color }]}>
            <AppText style={[styles.initials, { color: seat.swatch.foreground }]}>
                {seat.initials}
            </AppText>
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    card: {
        flexShrink: 0,
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 16,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.backgroundSecondary,
        ...(theme.scheme === 'dark' ? {} : theme.shadows.hardSmall)
    },

    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8
    },

    avatar: {
        width: 26,
        height: 26,
        flexShrink: 0,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: theme.borderWidth,
        borderColor: theme.scheme === 'dark' ? theme.colors.border : Brand.ink
    },

    initials: {
        fontSize: 9.5,
        fontWeight: 900
    },

    reads: {
        flexShrink: 0,
        fontSize: 12.5,
        fontWeight: 800,
        color: theme.colors.textSecondary
    },

    arrow: {
        flexShrink: 0
    },

    name: {
        flex: 1,
        minWidth: 0,
        fontSize: 14.5,
        fontWeight: 900,
        letterSpacing: -0.3,
        color: theme.colors.text
    },

    // The one-line variant carries the whole sentence, so it takes the slack the two
    // avatars and the badge would otherwise be sharing with it.
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

    progress: {
        marginTop: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 9
    },

    pips: {
        flex: 1,
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

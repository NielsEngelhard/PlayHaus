import AppText from "@/components/text/AppText";
import { Brand } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import type { Seat } from "@/features/pubquizr/round-one";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import Feather from "@expo/vector-icons/Feather";
import { View } from "react-native";

/**
 * A run of one is just somebody who answered a question, so the pill — and the sentence
 * a screen reader gets instead of it — start at two. Below that it would be on screen
 * almost permanently and would stop meaning anything, which is the opposite of the job.
 */
const RUN_WORTH_SAYING = 2;

interface Props {
    /** Who is reading the question out. */
    quizmaster: Seat
    /** Who has to answer it. */
    answering: Seat
    /** How many questions in a row they have taken, and 0 when they have taken none. */
    run: number
}

/**
 * The two people this turn is about, said once and said properly — and, underneath, why
 * it is those two.
 *
 * These used to be spread across the screen — the reader in a pill at the very top, the
 * answerer in small type above the buttons at the very bottom — which is the wrong way
 * round twice over. They are one fact ("X is asking Y"), so they belong next to each
 * other; and they are the fact the whole turn hangs on, so they belong above the
 * question rather than tucked under it.
 *
 * The answering half carries the accent. Both names have to be readable, but only one of
 * them is a thing the table is waiting on.
 *
 * The line underneath is the round's rule, and it is here rather than only on the
 * hand-off because it is the thing a table gets wrong: people expect the questions to go
 * round like a deal of cards, and they do not — get one right and the next one comes
 * straight back to you. The run counter beside the name is the same sentence with a
 * number on it, which is what turns the rule into something worth watching once somebody
 * is three questions deep in the seat.
 */
export default function TurnBanner({ quizmaster, answering, run }: Props) {
    const t = useT();
    const theme = useTheme();
    const styles = useStyles();

    return (
        <View style={styles.container}>
            <View
                style={styles.banner}
                // Read out as the one sentence it is, rather than as four separate
                // scraps. The run is folded in here too: this label stands in for its
                // children, so the pill below would otherwise go unread.
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
                <Person seat={quizmaster} role={t('pubquizr.play.turn.asking')} />

                <Feather
                    name="arrow-right"
                    size={16}
                    color={theme.colors.textMuted}
                    style={styles.arrow}
                />

                <Person
                    seat={answering}
                    role={t('pubquizr.play.turn.answering')}
                    run={run}
                    highlighted
                />
            </View>

            <AppText style={styles.rule}>
                {t('pubquizr.play.turn.staysWhileRight', { name: answering.name })}
            </AppText>
        </View>
    )
}

interface PersonProps {
    seat: Seat
    role: string
    highlighted?: boolean
    /** Only the answering half carries one, and only once there is one to carry. */
    run?: number
}

function Person({ seat, role, highlighted = false, run = 0 }: PersonProps) {
    const t = useT();
    const theme = useTheme();
    const styles = useStyles();

    return (
        <View style={[styles.person, highlighted && styles.highlighted]}>
            <View style={[styles.avatar, { backgroundColor: seat.swatch.color }]}>
                <AppText style={[styles.initials, { color: seat.swatch.foreground }]}>
                    {seat.initials}
                </AppText>
            </View>

            {/* `minWidth: 0` is what lets a long name truncate instead of pushing the
                other half of the banner off the row. */}
            <View style={styles.who}>
                <AppText style={styles.name} numberOfLines={1}>{seat.name}</AppText>

                <AppText style={styles.role}>{role}</AppText>

                {/* Stacked under the role rather than set beside it: the column is
                    barely a hundred points wide once the avatar has taken its share,
                    and a role and a pill fighting over that is how the banner ends up
                    two lines taller than it looks. */}
                {run >= RUN_WORTH_SAYING && (
                    <View style={styles.run}>
                        <Feather name="zap" size={9} color={theme.colors.text} />

                        <AppText style={styles.runLabel}>
                            {t('pubquizr.play.turn.run', { run })}
                        </AppText>
                    </View>
                )}
            </View>
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    container: {
        flexShrink: 0
    },

    banner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8
    },

    // The round's rule, in the same grey and at the same size as the small print under
    // the verdict buttons, because it is the same kind of sentence: what is about to
    // happen if this goes one way rather than the other.
    rule: {
        marginTop: 8,
        textAlign: 'center',
        fontSize: 11.5,
        fontWeight: 600,
        color: theme.colors.textMuted
    },

    person: {
        flex: 1,
        minWidth: 0,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 9,
        padding: 8,
        paddingRight: 12,
        borderRadius: 16,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.borderMuted,
        backgroundColor: theme.colors.backgroundSecondary
    },

    // Whose turn it is. The scheme's own accent — blue on paper, lemon on the dark
    // canvas — carried on the border and the fill, the same way a chosen quiz row is
    // marked on the setup screen.
    highlighted: {
        borderColor: theme.colors.focus,
        backgroundColor: theme.colors.backgroundFocus,
        ...(theme.scheme === 'dark' ? {} : theme.shadows.hardSmall)
    },

    avatar: {
        width: 34,
        height: 34,
        flexShrink: 0,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: theme.borderWidth,
        borderColor: theme.scheme === 'dark' ? theme.colors.border : Brand.ink
    },

    initials: {
        fontSize: 12,
        fontWeight: 900
    },

    who: {
        flex: 1,
        minWidth: 0
    },

    name: {
        fontSize: 15,
        fontWeight: 900,
        letterSpacing: -0.3,
        color: theme.colors.text
    },

    role: {
        marginTop: 1,
        fontSize: 10,
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        color: theme.colors.textMuted
    },

    // `alignSelf` keeps the pill the width of its own words rather than the width of the
    // column, which is what stops "RUN OF 2" reading as an empty bar with a label in the
    // corner of it.
    run: {
        marginTop: 4,
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 999,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.backgroundElement
    },

    runLabel: {
        fontSize: 9,
        fontWeight: 900,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        color: theme.colors.text
    },

    arrow: {
        flexShrink: 0
    }
}))

import AppText from "@/components/text/AppText";
import { Brand } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import type { Seat } from "@/features/pubquizr/round-one";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import Feather from "@expo/vector-icons/Feather";
import { View } from "react-native";

interface Props {
    /** Who is reading the question out. */
    quizmaster: Seat
    /** Who has to answer it. */
    answering: Seat
}

/**
 * The two people this turn is about, said once and said properly.
 *
 * These used to be spread across the screen — the reader in a pill at the very top, the
 * answerer in small type above the buttons at the very bottom — which is the wrong way
 * round twice over. They are one fact ("X is asking Y"), so they belong next to each
 * other; and they are the fact the whole turn hangs on, so they belong above the
 * question rather than tucked under it.
 *
 * The answering half carries the accent. Both names have to be readable, but only one
 * of them is a thing the table is waiting on.
 */
export default function TurnBanner({ quizmaster, answering }: Props) {
    const t = useT();
    const theme = useTheme();
    const styles = useStyles();

    return (
        <View
            style={styles.banner}
            // Read out as the one sentence it is, rather than as four separate scraps.
            accessibilityRole="text"
            accessibilityLabel={t('pubquizr.play.turn.spoken', {
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

            <Person seat={answering} role={t('pubquizr.play.turn.answering')} highlighted />
        </View>
    )
}

interface PersonProps {
    seat: Seat
    role: string
    highlighted?: boolean
}

function Person({ seat, role, highlighted = false }: PersonProps) {
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
            </View>
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    banner: {
        flexShrink: 0,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8
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

    arrow: {
        flexShrink: 0
    }
}))

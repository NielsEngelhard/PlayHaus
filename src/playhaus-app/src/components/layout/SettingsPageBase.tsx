import AppText from "@/components/text/AppText";
import { accentOf, type Game } from "@/constants/games";
import { accentInkColor, withAlpha } from "@/constants/theme";
import { AccentProvider } from "@/features/theme/AccentContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import Feather from "@expo/vector-icons/Feather";
import { Image } from "expo-image";
import { Children, Fragment, type ReactNode } from "react";
import { View } from "react-native";

interface Props {
    game: Game,
    title: string,
    eyebrow?: string,
    children: ReactNode,
    facts?: string,
    error?: string,
    action: ReactNode
}

export default function SettingsPageBase({ game, title, eyebrow, children, facts, error, action }: Props) {
    const styles = useStyles();
    const theme = useTheme();

    const accent = accentOf(game);
    const ink = accentInkColor(accent.ink);

    const sections = Children.toArray(children);

    return (
        <AccentProvider accent={accent}>
            <View style={styles.container}>
                <View style={[styles.card, theme.popShadow(accent.color)]}>
                    <View style={[styles.header, { backgroundColor: accent.color }]}>
                        <Image
                            source={game.icon}
                            style={styles.mark}
                            accessibilityRole='image'
                            accessibilityLabel={game.name}
                        />

                        <View style={styles.headerText}>
                            <AppText style={[styles.eyebrow, { color: withAlpha(ink, 0.8) }]}>
                                {eyebrow ?? game.name}
                            </AppText>

                            <AppText style={[styles.title, { color: ink }]}>{title}</AppText>
                        </View>
                    </View>

                    <View style={styles.body}>
                        {sections.map((section, index) => (
                            <Fragment key={index}>
                                {index > 0 && <View style={styles.divider} />}

                                <View style={styles.section}>{section}</View>
                            </Fragment>
                        ))}
                    </View>

                    <View style={styles.footer}>
                        {error !== undefined && (
                            <View style={styles.note}>
                                <Feather name='alert-triangle' size={14} color={theme.colors.destructiveText} />

                                <AppText style={[styles.noteText, styles.errorText]}>{error}</AppText>
                            </View>
                        )}

                        {facts !== undefined && (
                            <View style={styles.note}>
                                <Feather name='info' size={14} color={theme.colors.textMuted} />

                                <AppText style={styles.noteText}>{facts}</AppText>
                            </View>
                        )}

                        {action}
                    </View>
                </View>
            </View>
        </AccentProvider>
    )
}

const useStyles = createThemedStyles(theme => ({
    container: {
        width: '100%'
    },
    card: {
        width: '100%',
        borderRadius: 26,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.backgroundSecondary,
        // Holds the header's fill to the rounded top corners, which is the whole reason
        // the band has no radius of its own.
        overflow: 'hidden'
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        padding: 18,
        borderBottomWidth: theme.borderWidth,
        borderBottomColor: theme.colors.border
    },
    mark: {
        width: 62,
        height: 62,
        flexShrink: 0
    },
    headerText: {
        flex: 1,
        minWidth: 0
    },
    eyebrow: {
        fontSize: 10.5,
        fontWeight: 800,
        letterSpacing: 2,
        textTransform: 'uppercase'
    },
    title: {
        marginTop: 2,
        fontSize: 27,
        fontWeight: 900,
        lineHeight: 27 * 1.05,
        letterSpacing: -1
    },
    // The card's own padding at the sides; the sections carry the vertical rhythm, and
    // the first one's own top padding is most of what the design has above it.
    body: {
        paddingHorizontal: 16,
        paddingTop: 6,
        paddingBottom: 16
    },
    section: {
        paddingVertical: 16
    },
    // Between sections only. The header and the footer draw the two ends.
    divider: {
        height: 2,
        backgroundColor: theme.scheme === 'dark' ? theme.colors.border : 'rgba(15, 13, 18, 0.12)'
    },
    footer: {
        marginTop: 'auto',
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 16,
        gap: 9,
        borderTopWidth: 2,
        borderTopColor: theme.scheme === 'dark' ? theme.colors.border : 'rgba(15, 13, 18, 0.12)'
    },
    // A line about the button under it — centred on it rather than ranged left, because
    // it belongs to the button and not to the column above.
    note: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8
    },
    noteText: {
        flexShrink: 1,
        fontSize: 12,
        fontWeight: 600,
        color: theme.colors.textMuted
    },
    errorText: {
        color: theme.colors.destructiveText
    }
}))

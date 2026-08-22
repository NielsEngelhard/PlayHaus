import type { ReconnectableGame } from "@/api/calls/reconnect";
import AppText from "@/components/text/AppText";
import { Brand, Spacing } from "@/constants/theme";
import { usePhrase, useT } from "@/features/i18n/LanguageContext";
import { startedAgo, type GameKind } from "@/features/reconnect/game-kinds";
import { useTheme } from "@/features/theme/ThemeContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import Feather from "@expo/vector-icons/Feather";
import { Link } from "expo-router";
import { Pressable, View } from "react-native";

interface Props {
    game: ReconnectableGame,
    kind: GameKind
}

/**
 * The one-line reminder that a game is still open, sitting under the game list.
 *
 * Deliberately quieter than a game card: no gradient, no shadow in either scheme. It is
 * a way back into something already started, not another thing to start.
 */
export default function StillRunningCard({ game, kind }: Props) {
    const theme = useTheme();
    const styles = useStyles();
    const t = useT();
    const phrase = usePhrase();

    const started = startedAgo(game.createdAt);

    return (
        <Link href={kind.href(game)} asChild>
            <Pressable style={styles.card} accessibilityRole='link'>
                <View style={styles.tile}>
                    <Feather name='rotate-ccw' size={16} color={Brand.ink} />
                </View>

                <View style={styles.body}>
                    <AppText style={styles.label}>{t('home.stillRunning.label')}</AppText>

                    <AppText style={styles.title} numberOfLines={1}>
                        {started === null
                            ? kind.title
                            : t('home.stillRunning.line', {
                                title: kind.title,
                                mode: t(kind.modeKey),
                                time: phrase(started)
                            })}
                    </AppText>
                </View>

                <Feather name='arrow-right' size={18} color={theme.colors.text} />
            </Pressable>
        </Link>
    )
}

const useStyles = createThemedStyles(theme => ({
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.three - 4,
        paddingVertical: 11,
        paddingHorizontal: 13,
        borderRadius: 20,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.backgroundSecondary,
        // Light keeps the hard lift the rest of its chrome has; dark leaves this flat,
        // saving the coloured shadows for the cards that are the point of the page.
        ...(theme.scheme === 'dark' ? {} : theme.popShadow(theme.colors.border))
    },
    tile: {
        width: 34,
        height: 34,
        flexShrink: 0,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: theme.scheme === 'dark' ? 0 : theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.lemon
    },
    body: {
        flex: 1,
        minWidth: 0
    },
    label: {
        fontSize: 10.5,
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        color: theme.colors.textMuted
    },
    title: {
        fontSize: 14,
        fontWeight: 800,
        color: theme.colors.text
    }
}))

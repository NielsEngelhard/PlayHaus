import AppText from "@/components/text/AppText";
import AnimatedPressable from "@/components/ui/AnimatedPressable";
import { usePressPop } from "@/components/ui/usePressPop";
import { Brand, hardShadow, ShadowReach, withAlpha } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import Feather from "@expo/vector-icons/Feather";
import { useState } from "react";
import { View } from "react-native";

interface Props {
    onPress: () => void
}

// Matches the mode tiles above it rather than the app's `Radii` scale.
const CARD_RADIUS = 22;
const ICON_SIZE = 28;
const STACK_HEIGHT = 136;
const TILE_SIZE = 64;

// A stack of paper slips: two decorative ghosts behind one live front slip that opens the quiz library.
export default function QuizLibraryStack({ onPress }: Props) {
    const t = useT();
    const theme = useTheme();
    const styles = useStyles();
    // Its own hard-shadow press effect already carries the click, so the shared hook only adds the web hover.
    const pop = usePressPop({ pressEnabled: false });
    const [pressed, setPressed] = useState(false);

    return (
        <View style={styles.stack}>
            {/* The dark-mode surface steps read as one ghost, not two, so the fainter back layer is light-only. */}
            {theme.scheme === 'light' && (
                <View
                    pointerEvents="none"
                    accessible={false}
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                    style={styles.ghostBack}
                />
            )}

            <View
                pointerEvents="none"
                accessible={false}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                style={styles.ghostMiddle}
            />

            <AnimatedPressable
                onPress={onPress}
                onPressIn={() => setPressed(true)}
                onPressOut={() => setPressed(false)}
                onHoverIn={pop.onHoverIn}
                onHoverOut={pop.onHoverOut}
                accessibilityRole="button"
                accessibilityLabel={t('pubquizr.index.library.title')}
                // frontPressed comes last: its own translate must win over the hover scale, since a mouse is already hovering by the time it's down.
                style={[styles.front, pop.animatedStyle, pressed && styles.frontPressed]}
            >
                <View style={styles.iconTile}>
                    <Feather name="list" size={ICON_SIZE} color={Brand.ink} />
                </View>

                <View style={styles.body}>
                    <AppText style={styles.title}>
                        {t('pubquizr.index.library.title')}
                    </AppText>

                    <AppText style={styles.subtitle}>
                        {t('pubquizr.index.library.subtitle')}
                    </AppText>
                </View>

                <Feather name="chevron-right" size={19} color={Brand.ink} style={styles.chevron} />
            </AnimatedPressable>
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    stack: {
        marginTop: 'auto',
        position: 'relative',
        height: STACK_HEIGHT,
        flexShrink: 0
    },

    ghostBack: {
        position: 'absolute',
        left: 18,
        right: 18,
        bottom: 0,
        height: 118,
        borderRadius: CARD_RADIUS,
        borderWidth: theme.borderWidth,
        borderColor: withAlpha(Brand.ink, 0.26),
        backgroundColor: theme.colors.paperGhostBack
    },

    ghostMiddle: {
        position: 'absolute',
        left: 9,
        right: 9,
        bottom: 8,
        height: 120,
        borderRadius: CARD_RADIUS,
        borderWidth: theme.borderWidth,
        borderColor: theme.scheme === 'dark' ? theme.colors.borderStrong : withAlpha(Brand.ink, 0.42),
        backgroundColor: theme.colors.paperGhostMiddle
    },

    front: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        borderRadius: CARD_RADIUS,
        borderWidth: theme.borderWidth,
        borderColor: Brand.ink,
        backgroundColor: Brand.lemon,
        padding: 18,
        ...hardShadow(4, Brand.ink)
    },

    frontPressed: {
        transform: [{ translateX: 2 }, { translateY: 2 }],
        ...hardShadow(ShadowReach.hardSmall, Brand.ink)
    },

    iconTile: {
        width: TILE_SIZE,
        height: TILE_SIZE,
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 18,
        borderWidth: theme.borderWidth,
        borderColor: Brand.ink,
        backgroundColor: Brand.textOnAccent
    },

    body: {
        flex: 1,
        minWidth: 0
    },

    title: {
        fontSize: 19,
        lineHeight: 19 * 1.1,
        fontWeight: 900,
        letterSpacing: -0.5,
        color: Brand.ink
    },

    subtitle: {
        marginTop: 3,
        fontSize: 12,
        lineHeight: 12 * 1.35,
        fontWeight: 700,
        color: withAlpha(Brand.ink, 0.66)
    },

    chevron: {
        flexShrink: 0
    }
}));

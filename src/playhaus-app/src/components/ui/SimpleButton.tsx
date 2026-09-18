import AppText from "@/components/text/AppText";
import PopPressable from "@/components/ui/PopPressable";
import { FontSizes } from "@/constants/theme";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import Feather from "@expo/vector-icons/Feather";
import { View } from "react-native";

interface Props {
    action: string
    description: string
    icon: keyof typeof Feather.glyphMap
    onPress: () => void
    title: string
}

// A full-width row for a mode that doesn't fit ModeCard's shape: icon, then copy, then the action it leads to.
export default function SimpleButton({ action, description, icon, onPress, title }: Props) {
    const theme = useTheme();
    const styles = useStyles();

    return (
        <PopPressable
            accessibilityRole="button"
            accessibilityLabel={`${title}, ${description}`}
            onPress={onPress}
            style={styles.button}
        >
            <View style={styles.tile}>
                <Feather name={icon} size={17} color={theme.colors.text} />
            </View>

            <View style={styles.body}>
                <AppText style={styles.title} numberOfLines={1}>
                    {title}
                </AppText>

                <AppText style={styles.description} numberOfLines={2}>
                    {description}
                </AppText>
            </View>

            <View style={styles.actionRow}>
                <AppText style={styles.action} numberOfLines={1}>
                    {action}
                </AppText>

                <Feather name="arrow-right" size={14} color={theme.colors.text} />
            </View>
        </PopPressable>
    )
}

const useStyles = createThemedStyles(theme => ({
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: 11,
        borderRadius: 18,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.backgroundSecondary,
        ...theme.shadows.hardSmall
    },

    tile: {
        width: 34,
        height: 34,
        flexShrink: 0,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.background
    },

    body: {
        flex: 1,
        minWidth: 0
    },

    title: {
        fontSize: FontSizes.sm,
        fontWeight: 900,
        letterSpacing: -0.2,
        color: theme.colors.text
    },

    description: {
        marginTop: 1,
        fontSize: FontSizes.xs,
        lineHeight: FontSizes.xs * 1.35,
        color: theme.colors.textMuted
    },

    actionRow: {
        flexShrink: 0,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },

    action: {
        fontSize: FontSizes.xs,
        fontWeight: 900,
        color: theme.colors.text
    }
}));

import AppText from "@/components/text/AppText";
import PopPressable from "@/components/ui/PopPressable";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import Feather from "@expo/vector-icons/Feather";
import { View } from "react-native";

interface Props {
    icon: keyof typeof Feather.glyphMap
    /** Whether the button is disabled. Defaults to false. */
    isDisabled?: boolean
    onPress: () => void
    /** The quiet second line. Optional. */
    subtitle?: string
    title: string
}

// A thing you do rather than a way to play. Sized by the row it shares, not by its own contents.
export default function SmallButton({ icon, isDisabled = false, onPress, subtitle, title }: Props) {
    const theme = useTheme();
    const styles = useStyles();

    return (
        <PopPressable
            accessibilityRole="button"
            accessibilityLabel={subtitle === undefined ? title : `${title}, ${subtitle}`}
            accessibilityState={{ disabled: isDisabled }}
            disabled={isDisabled}
            onPress={onPress}
            style={styles.button}
        >
            <View style={styles.tile}>
                <Feather name={icon} size={17} color={isDisabled ? theme.colors.textMuted : theme.colors.text} />
            </View>

            <View style={styles.body}>
                <AppText style={[styles.title, isDisabled && styles.textDisabled]} numberOfLines={1}>
                    {title}
                </AppText>

                {subtitle !== undefined && (
                    <AppText style={styles.subtitle} numberOfLines={1}>
                        {subtitle}
                    </AppText>
                )}
            </View>
        </PopPressable>
    )
}

const useStyles = createThemedStyles(theme => ({
    button: {
        flex: 1,
        flexBasis: 0,
        minWidth: 0,
        minHeight: 56,
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

    // The page ground, so the tile reads as a hole.
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
        fontSize: 13.5,
        fontWeight: 900,
        letterSpacing: -0.2,
        color: theme.colors.text
    },

    subtitle: {
        marginTop: 1,
        fontSize: 11,
        fontWeight: 700,
        color: theme.colors.textMuted
    },

    textDisabled: {
        color: theme.colors.textMuted
    }
}));

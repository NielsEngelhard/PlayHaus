import AppText from "@/components/text/AppText";
import Card from "@/components/ui/Card";
import { FontSizes, Spacing } from "@/constants/theme";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import Feather from "@expo/vector-icons/Feather";
import { Link, type Href } from "expo-router";
import { Pressable, View } from "react-native";

interface Props {
    icon: keyof typeof Feather.glyphMap,
    /** Fill behind the icon. */
    color: string,
    /** Colour of the icon itself, for when it sits on a dark fill. */
    iconColor?: string,
    title: string,
    description: string,
    navigationUrl: Href
}

/**
 * A compact tappable card: icon tile, title, one line of explanation. The bigger
 * `NavigationCard` is for the game list; this one is for choices within a page.
 */
export default function SimpleNavigationCard({
    icon,
    color,
    iconColor,
    title,
    description,
    navigationUrl
}: Props) {
    const theme = useTheme();
    const styles = useStyles();

    // Defaulted here rather than in the parameter list: the resting colour comes from
    // the theme now, and a parameter default is evaluated too early to read a hook.
    const ink = iconColor ?? theme.colors.text;

    return (
        <Link href={navigationUrl} asChild>
            <Pressable style={styles.pressable}>
                <Card triggerOnHoverAnimation style={styles.card}>
                    <View style={[styles.iconTile, { backgroundColor: color }]}>
                        <Feather name={icon} size={24} color={ink} />
                    </View>

                    <AppText style={styles.title}>{title}</AppText>
                    <AppText style={styles.description}>{description}</AppText>
                </Card>
            </Pressable>
        </Link>
    )
}

const useStyles = createThemedStyles(theme => ({
    // `asChild` means this Pressable *is* the flex child of the row, so it claims an
    // equal share of the width; the Card then fills it, keeping side-by-side cards
    // the same height however their text wraps.
    pressable: {
        flex: 1
    },
    card: {
        flex: 1
    },
    iconTile: {
        width: 48,
        height: 48,
        marginBottom: Spacing.three,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: theme.colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        ...theme.shadows.hard
    },
    title: {
        fontSize: FontSizes.lg,
        fontWeight: 900,
        color: theme.colors.text
    },
    description: {
        marginTop: Spacing.one,
        fontSize: FontSizes.sm,
        lineHeight: FontSizes.sm * 1.45,
        color: theme.colors.textSecondary
    }
}))

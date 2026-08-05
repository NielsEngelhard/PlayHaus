import AppText from "@/components/text/AppText";
import Card from "@/components/ui/Card";
import { Colors, FontSizes, Shadows, Spacing } from "@/constants/theme";
import Feather from "@expo/vector-icons/Feather";
import { Link, type Href } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

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
    iconColor = Colors.light.text,
    title,
    description,
    navigationUrl
}: Props) {
    return (
        <Link href={navigationUrl} asChild>
            <Pressable style={styles.pressable}>
                <Card triggerOnHoverAnimation style={styles.card}>
                    <View style={[styles.iconTile, { backgroundColor: color }]}>
                        <Feather name={icon} size={24} color={iconColor} />
                    </View>

                    <AppText style={styles.title}>{title}</AppText>
                    <AppText style={styles.description}>{description}</AppText>
                </Card>
            </Pressable>
        </Link>
    )
}

const styles = StyleSheet.create({
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
        borderColor: Colors.light.border,
        alignItems: 'center',
        justifyContent: 'center',
        ...Shadows.hard
    },
    title: {
        fontSize: FontSizes.lg,
        fontWeight: 900,
        color: Colors.light.text
    },
    description: {
        marginTop: Spacing.one,
        fontSize: FontSizes.sm,
        lineHeight: FontSizes.sm * 1.45,
        color: Colors.light.textSecondary
    }
})

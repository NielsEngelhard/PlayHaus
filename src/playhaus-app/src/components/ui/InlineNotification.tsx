import AppText from "@/components/text/AppText";
import Card from "@/components/ui/Card";
import { Colors, FontSizes, Shadows, Spacing } from "@/constants/theme";
import Feather from "@expo/vector-icons/Feather";
import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

interface Props {
    /** Optional uppercase micro-label above the message. */
    title?: string,
    message: string,
    icon?: keyof typeof Feather.glyphMap,
    /** Fill behind the icon tile. */
    color?: string
    /**
     * Anything to do about it, under the message — usually a single button. A
     * notification that only says something needs none, which is why this is
     * optional rather than a second required half.
     */
    children?: ReactNode
}

/**
 * A calm inline message about the page you're already on — a heads-up, not an alarm.
 * `Tag` labels a thing in a word; this one has room to explain itself.
 */
export default function InlineNotification({
    title,
    message,
    icon = 'info',
    color = Colors.light.lemon,
    children
}: Props) {
    return (
        <Card>
            <View style={styles.row}>
                <View style={[styles.iconTile, { backgroundColor: color }]}>
                    <Feather name={icon} size={18} color={Colors.light.text} />
                </View>

                <View style={styles.body}>
                    {title && (
                        <AppText style={styles.title}>{title}</AppText>
                    )}

                    <AppText style={styles.message}>{message}</AppText>

                    {children && <View style={styles.actions}>{children}</View>}
                </View>
            </View>
        </Card>
    )
}

const styles = StyleSheet.create({
    // The wrapper is a `Card`, which lays its children out in a column — the icon and
    // the text sit side by side inside it.
    row: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: Spacing.three
    },
    iconTile: {
        width: 36,
        height: 36,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: Colors.light.border,
        alignItems: 'center',
        justifyContent: 'center',
        ...Shadows.hardSmall
    },
    body: {
        // Without this the text column refuses to wrap and pushes the tile off the card.
        flex: 1
    },
    title: {
        fontSize: FontSizes.xs,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: 2.2,
        color: Colors.light.textSecondary
    },
    message: {
        marginTop: Spacing.one,
        fontSize: FontSizes.sm,
        lineHeight: FontSizes.sm * 1.45,
        color: Colors.light.text
    },
    // A row, so a button inside hugs its label instead of being stretched across
    // the text column the way a column parent would stretch it.
    actions: {
        marginTop: Spacing.three,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.two
    }
})

import AppText from "@/components/text/AppText";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { View } from "react-native";

interface Props {
    /** Fill for the dot. Whatever the pill is about: a game's accent, your own swatch. */
    accent: string,
    label: string
}

/**
 * The pill at the right of the header: a coloured dot, then one line of uppercase.
 *
 * Says what the corner is about — which game you are inside, or who you are when you are
 * not inside one. Both wear this so the slot doesn't change shape as you move between
 * them; only the dot and the words change.
 *
 * Presentational on purpose. Anything that needs the pill to be tappable wraps it.
 */
export default function ContextPill({ accent, label }: Props) {
    const styles = useStyles();

    return (
        <View style={styles.pill}>
            <View style={[styles.dot, { backgroundColor: accent }]} />

            <AppText style={styles.label} numberOfLines={1}>{label}</AppText>
        </View>
    )
}

/** The pill's own chrome, so a wrapper that has to own the border can borrow it. */
export const useContextPillStyles = createThemedStyles(theme => ({
    pill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
        borderRadius: 999,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.backgroundSecondary,
        paddingVertical: 5,
        paddingHorizontal: 11,
        // The only thing on the header row that gives ground when a long name meets a
        // narrow phone — the toggle beside it is a fixed circle.
        flexShrink: 1,
        ...(theme.scheme === 'dark' ? {} : { boxShadow: '2px 2px 0 0 #0F0D12' })
    },
    dot: {
        width: 7,
        height: 7,
        flexShrink: 0,
        borderRadius: 999
    },
    label: {
        flexShrink: 1,
        fontSize: 11,
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        color: theme.colors.text
    }
}))

const useStyles = useContextPillStyles;

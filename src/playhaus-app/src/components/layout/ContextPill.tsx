import AppText from "@/components/text/AppText";
import { Brand } from "@/constants/theme";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import Feather from "@expo/vector-icons/Feather";
import { View } from "react-native";

interface Props {
    /** Fill for the dot — or for the whole pill when `filled`. */
    accent: string,
    label: string,
    /** Shown instead of the dot, for a pill naming a mode rather than a place. */
    icon?: keyof typeof Feather.glyphMap,
    /**
     * Fills the pill with `accent` and drops its contents to ink.
     *
     * For the one pill on a screen that is the screen's own subject. An outlined pill
     * reports where you are; a filled one is part of what you came for.
     */
    filled?: boolean
}

/**
 * The pill at the right of the header: a dot or an icon, then one line of uppercase.
 *
 * Says what the corner is about — which game you are inside, which mode you are setting
 * up, or who you are when you are not inside either. They all wear this so the slot
 * doesn't change shape as you move between them.
 *
 * Presentational on purpose. Anything that needs the pill to be tappable wraps it.
 */
export default function ContextPill({ accent, label, icon, filled = false }: Props) {
    const styles = useStyles();

    const ink = filled ? Brand.ink : undefined;

    return (
        <View style={[styles.pill, filled && { backgroundColor: accent, borderColor: accent }]}>
            {icon === undefined ? (
                <View style={[styles.dot, { backgroundColor: accent }]} />
            ) : (
                <Feather name={icon} size={13} color={ink ?? accent} />
            )}

            <AppText style={[styles.label, ink !== undefined && { color: ink }]} numberOfLines={1}>
                {label}
            </AppText>
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

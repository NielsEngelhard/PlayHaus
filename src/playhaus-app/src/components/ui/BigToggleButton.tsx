import AppText from "@/components/text/AppText";
import { Brand, Spacing, accentInkColor, hardShadow, withAlpha } from "@/constants/theme";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useAccent } from "@/features/theme/AccentContext";
import { useTheme } from "@/features/theme/ThemeContext";
import Feather from "@expo/vector-icons/Feather";
import { Pressable, StyleProp, View, ViewStyle } from "react-native";

export interface BigToggleOption<T> {
    icon: keyof typeof Feather.glyphMap,
    label: string,
    value: T
}

interface Props<T> {
    // A short word on the choice, next to the title.
    badge?: string,
    /** The line under the track, describing whichever option is in force. */
    description: string,
    onChange: (value: T) => void,
    options: readonly BigToggleOption<T>[],
    /** For layout only — how the card sits among its siblings. The look lives here. */
    style?: StyleProp<ViewStyle>,
    title: string,
    value: T
}

const TILE_HEIGHT = 46;

// A two-or-three-way choice loud enough to be the reason someone opens the settings screen.
export default function BigToggleButton<T>({ badge, description, onChange, options, style, title, value }: Props<T>) {
    const styles = useStyles();

    return (
        <View style={[styles.card, style]}>
            <View style={styles.titleRow}>
                <AppText style={styles.title}>{title}</AppText>

                {badge !== undefined && (
                    <AppText style={styles.badge}>{badge}</AppText>
                )}
            </View>

            <View style={styles.track} accessibilityRole="radiogroup">
                {options.map(option => (
                    <Tile
                        key={String(option.value)}
                        icon={option.icon}
                        label={option.label}
                        onPress={() => onChange(option.value)}
                        selected={option.value === value}
                    />
                ))}
            </View>

            <AppText style={styles.description}>{description}</AppText>
        </View>
    );
}

interface TileProps {
    icon: keyof typeof Feather.glyphMap,
    label: string,
    onPress: () => void,
    selected: boolean
}

// One half of the track: an icon and a word, filled with the screen's accent when it is the one in force.
function Tile({ icon, label, onPress, selected }: TileProps) {
    const styles = useStyles();
    const theme = useTheme();
    const accent = useAccent();

    const fill = accent?.color ?? Brand.primary;
    const ink = accentInkColor(accent?.ink ?? 'ink');

    return (
        <Pressable
            accessibilityLabel={label}
            accessibilityRole="radio"
            aria-checked={selected}
            onPress={onPress}
            style={[
                styles.tile,
                selected && styles.tileSelected,
                selected && { backgroundColor: fill },
                selected && hardShadow(2, theme.colors.shadow)
            ]}
        >
            <Feather name={icon} size={18} color={selected ? ink : theme.colors.textMuted} />

            <AppText style={[styles.tileLabel, selected && { color: ink }]}>{label}</AppText>
        </Pressable>
    );
}

const useStyles = createThemedStyles(theme => ({
    card: {
        gap: 11,
        padding: Spacing.three - 2,
        borderRadius: 20,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.borderStrong,
        backgroundColor: theme.colors.backgroundSecondary,
        ...theme.shadows.hard
    },

    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7
    },

    title: {
        fontSize: 15,
        fontWeight: 900,
        letterSpacing: -0.3,
        color: theme.colors.text
    },

    badge: {
        borderRadius: 999,
        borderWidth: 1.5,
        borderColor: theme.colors.borderStrong,
        backgroundColor: theme.colors.lemon,
        paddingHorizontal: 6,
        paddingVertical: 1,
        fontSize: 8.5,
        fontWeight: 900,
        letterSpacing: 0.6,
        textTransform: 'uppercase',
        color: Brand.ink
    },

    // The same shallow well `HorizontalButtonSelect` sinks its options into, drawn a shade harder.
    track: {
        flexDirection: 'row',
        gap: 4,
        padding: 4,
        borderRadius: 16,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.borderStrong,
        backgroundColor: theme.scheme === 'dark'
            ? withAlpha(theme.colors.text, 0.06)
            : withAlpha(theme.colors.border, 0.06)
    },

    tile: {
        flex: 1,
        height: TILE_HEIGHT,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        borderRadius: 12
    },

    tileSelected: {
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.borderStrong
    },

    tileLabel: {
        fontSize: 14,
        fontWeight: 900,
        color: theme.colors.textMuted
    },

    description: {
        fontSize: 12.5,
        lineHeight: 12.5 * 1.4,
        fontWeight: 500,
        color: theme.colors.textMuted
    }
}))

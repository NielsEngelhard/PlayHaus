import { FontSizes, Spacing, accentInkColor } from "@/constants/theme"
import { useAccent } from "@/features/theme/AccentContext"
import { createThemedStyles } from "@/features/theme/createThemedStyles"
import { useTheme } from "@/features/theme/ThemeContext"
import Feather from "@expo/vector-icons/Feather"
import { View } from "react-native"
import AppText from "../text/AppText"
import Toggle from "./Toggle"

interface Props {
    value: boolean,
    label: string,
    description: string
    onChange: (value: boolean) => void,
    icon: keyof typeof Feather.glyphMap,
    /**
     * Drops the row's own vertical padding, for a container that already spaces the
     * blocks inside it — `SettingsPageBase` rules its sections apart and pads them
     * itself, and a row padding itself again inside one sits low in its own band.
     */
    flush?: boolean
}

export default function ToggleRow({ value, label, description, icon, onChange, flush = false }: Props) {
    const styles = useStyles();
    const theme = useTheme();

    // The tile under the glyph takes the page's colour where one is lent; on its own it
    // stays the quiet sunken fill it has everywhere else.
    const accent = useAccent();

    return (
        <View
            style={[styles.row, flush && styles.rowFlush]}
        >
            <View style={styles.info}>
                <View style={[styles.iconTile, accent !== null && { backgroundColor: accent.color }]}>
                    <Feather
                        name={icon}
                        size={16}
                        color={accent === null ? theme.colors.text : accentInkColor(accent.ink)}
                    />
                </View>

                <View style={styles.text}>
                    <AppText style={styles.title}>{label}</AppText>
                    <AppText style={styles.description}>{description}</AppText>
                </View>
            </View>

            <Toggle
                value={value}
                onValueChange={value => onChange(value)}
                label={label}
            />
        </View>        
    )
}

const useStyles = createThemedStyles(theme => ({
    label: {
        fontSize: FontSizes.xs,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: 2.2,
        color: theme.colors.textSecondary
    },
    rows: {
        marginTop: Spacing.three
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.three,
        paddingVertical: Spacing.three
    },
    rowFlush: {
        paddingVertical: 0
    },
    // Only between rows — the card's own padding does the work at the two ends.
    rowDivided: {
        borderTopWidth: 2,
        borderTopColor: theme.colors.border
    },
    info: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: Spacing.two
    },
    iconTile: {
        width: 32,
        height: 32,
        flexShrink: 0,
        marginTop: Spacing.half,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: theme.colors.border,
        borderRadius: 10,
        backgroundColor: theme.colors.backgroundInput
    },
    text: {
        flex: 1,
        minWidth: 0
    },
    title: {
        fontSize: FontSizes.md,
        lineHeight: FontSizes.md * 1.2,
        fontWeight: 700,
        color: theme.colors.text
    },
    description: {
        marginTop: Spacing.half,
        fontSize: FontSizes.xs,
        lineHeight: FontSizes.xs * 1.4,
        color: theme.colors.textSecondary
    }
}))
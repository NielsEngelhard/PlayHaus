import { FontSizes, Spacing } from "@/constants/theme"
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
    icon: keyof typeof Feather.glyphMap
}

export default function ToggleRow({ value, label, description, icon, onChange }: Props) {
    const styles = useStyles();
    const theme = useTheme();

    return (
        <View
            style={[styles.row]}
        >
            <View style={styles.info}>
                <View style={styles.iconTile}>
                    <Feather name={icon} size={16} color={theme.colors.text} />
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
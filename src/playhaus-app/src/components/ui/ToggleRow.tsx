import { FontSizes, Spacing } from "@/constants/theme"
import { createThemedStyles } from "@/features/theme/createThemedStyles"
import { View } from "react-native"
import AppText from "../text/AppText"
import Toggle from "./Toggle"

interface Props {
    value: boolean,
    label: string,
    description: string
    onChange: (value: boolean) => void,
    /**
     * Drops the row's own vertical padding, for a container that already spaces the
     * blocks inside it — `SettingsPageBase` rules its sections apart and pads them
     * itself, and a row padding itself again inside one sits low in its own band.
     */
    flush?: boolean
}

/**
 * A named switch with a line saying what it does: label and description on the left,
 * the toggle on the right.
 *
 * There used to be an icon tile in front of the text, but a glyph in a box is one more
 * outlined object on a page that now keeps its outlines for the things you touch — the
 * words carry the meaning, and the switch's own colour carries whose setting it is.
 */
export default function ToggleRow({ value, label, description, onChange, flush = false }: Props) {
    const styles = useStyles();

    return (
        <View
            style={[styles.row, flush && styles.rowFlush]}
        >
            <View style={styles.text}>
                <AppText style={styles.title}>{label}</AppText>
                <AppText style={styles.description}>{description}</AppText>
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

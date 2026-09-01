import { Spacing } from "@/constants/theme"
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
        gap: 14,
        paddingVertical: Spacing.three
    },
    rowFlush: {
        paddingVertical: 0
    },
    text: {
        flex: 1,
        minWidth: 0
    },
    // A notch under the app's body size, and the line beneath it quieter still. The
    // switch beside them is a 66pt stamp now: at the old scale the row read as two things
    // shouting, where the setting's name only has to be findable.
    title: {
        fontSize: 15,
        lineHeight: 15 * 1.2,
        fontWeight: 800,
        color: theme.colors.text
    },
    description: {
        marginTop: 3,
        fontSize: 12.5,
        lineHeight: 12.5 * 1.4,
        fontWeight: 500,
        color: theme.colors.textMuted
    }
}))

import AppText from "@/components/text/AppText";
import SeatAvatar from "@/components/ui/SeatAvatar";
import { FontSizes, Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import { initialsOf, type Seat } from "@/features/table/seats";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { colorForSeat } from "@/utils/color-utils";
import { Pressable, View } from "react-native";

interface Props {
    // The name fields as typed.
    names: string[],
    /** Back to the step the names are on. The whole block is the way there. */
    onEdit: () => void
}

const SEAT = 26;

// Who is at the table, on the last step of the setup, as a row of named swatches.
export default function TableRecap({ names, onEdit }: Props) {
    const t = useT();
    const styles = useStyles();

    return (
        <Pressable
            accessibilityRole='button'
            accessibilityLabel="Tap to change"
            onPress={onEdit}
            style={styles.table}
        >
            {/* Indexed over the fields rather than over the names that survived them. */}
            {names.map((name, i) => name.trim() === '' ? null : (
                <View key={i} style={styles.seat}>
                    <SeatAvatar seat={seatFor(name, i)} size={SEAT} />

                    <AppText style={styles.name}>{name}</AppText>
                </View>
            ))}
        </Pressable>
    )
}

// A name and its position, as `SeatAvatar` wants them.
function seatFor(name: string, index: number): Seat {
    return {
        seat: index,
        name,
        score: 0,
        initials: initialsOf(name),
        swatch: colorForSeat(index)
    };
}

const useStyles = createThemedStyles(theme => ({
    table: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.two
    },
    // A pill rather than a bare pair, so a wrapped row still reads as a list of people instead of a paragraph of names with pictures in it.
    seat: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two,
        paddingLeft: 4,
        paddingRight: 12,
        paddingVertical: 4,
        borderRadius: 999,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.backgroundSecondary
    },
    name: {
        fontSize: FontSizes.sm,
        fontWeight: 800,
        color: theme.colors.text
    }
}))

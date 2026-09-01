import AppText from "@/components/text/AppText";
import SeatAvatar from "@/components/ui/SeatAvatar";
import { FontSizes, Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import { initialsOf, type Seat } from "@/features/table/seats";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { colorForSeat } from "@/utils/color-utils";
import { Pressable, View } from "react-native";

interface Props {
    /**
     * The name fields as typed. Blank ones are dropped rather than drawn: this is a
     * reading of who is actually playing, not of how many boxes the form has.
     */
    names: string[],
    /** Back to the step the names are on. The whole block is the way there. */
    onEdit: () => void
}

const SEAT = 26;

/**
 * Who is at the table, on the last step of the setup, as a row of named swatches.
 *
 * Deliberately not `TablePreview`, which is the same information for the band above it:
 * that one is a module-scope `Brand`-only sheet by design — it only ever sits on the
 * game's blue — and its empty seats are a dashed wash of `textOnAccent` that all but
 * disappears on paper. This one lives on the sheet, so it is themed, and it has names
 * beside the initials because a recap has room to be read rather than glanced at.
 *
 * The whole block is one press target rather than a row with an edit link on the end.
 * There is exactly one thing to do with a table you are looking at and disagree with,
 * and hiding it behind a small word at the end of the line is the version of that people
 * miss.
 */
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
            {/* Indexed over the fields rather than over the names that survived them, so
                a player wears the same colour here as in the table on the band directly
                above — `TablePreview` counts the same way, blanks included. */}
            {names.map((name, i) => name.trim() === '' ? null : (
                <View key={i} style={styles.seat}>
                    <SeatAvatar seat={seatFor(name, i)} size={SEAT} />

                    <AppText style={styles.name}>{name}</AppText>
                </View>
            ))}
        </Pressable>
    )
}

/**
 * A name and its position, as `SeatAvatar` wants them.
 *
 * `score` is the field a game is free to leave at zero — see `Seat` — and nothing here
 * has been played yet anyway.
 */
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
    // A pill rather than a bare pair, so a wrapped row still reads as a list of people
    // instead of a paragraph of names with pictures in it.
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

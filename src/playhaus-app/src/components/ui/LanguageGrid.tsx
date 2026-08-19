import AppText from "@/components/text/AppText";
import CountryFlag from "@/components/ui/CountryFlag";
import PopPressable from "@/components/ui/PopPressable";
import { LANGUAGES, type Language, type LanguageCode } from "@/constants/languages";
import { FontSizes, Spacing } from "@/constants/theme";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import { intoRows } from "@/utils/rows";
import Feather from "@expo/vector-icons/Feather";
import { View } from "react-native";

/**
 * Two, which is exactly how many languages there are. A third would land on its own
 * row at full width rather than half of one, which is the wrong shape for a tile —
 * revisit the number along with `LANGUAGES` rather than before it.
 */
const COLUMNS = 2;

/** Bigger than the 24px the dropdown uses: here the flag is the tile, not a bullet. */
const FLAG_WIDTH = 40;

const CHECK_SIZE = 26;

interface Props {
    /**
     * Optional, unlike `LanguageSelect`. The guest gate has nothing picked until you
     * pick it, and a grid can show that honestly where a field with a single line
     * cannot — it would have to invent a value to display.
     */
    value?: LanguageCode,
    onChange: (value: LanguageCode) => void,
    /** Left off to render the tiles bare, for a screen that titles them itself. */
    label?: string,
    /** Greyed out and unpressable — for a choice whose request is still in the air. */
    disabled?: boolean
}

/**
 * The languages, laid out as tiles you tap, with the flag and what choosing one
 * actually changes on each.
 *
 * The other way to pick a language is `LanguageSelect`, and the two are for different
 * moments. That one is a settings field: a value you already have, changed now and
 * then, worth one line. This one is for a choice being made for the first time, where
 * the alternatives should be on screen together rather than behind a tap.
 *
 * Bare rather than wrapped in a `Card`, which is where it differs from every other
 * picker here — the auth sheet is already a card, and a second one inside it would
 * read as a box in a box.
 */
export default function LanguageGrid({ value, onChange, label, disabled = false }: Props) {
    const styles = useStyles();

    return (
        <View>
            {label !== undefined && (
                <AppText style={[styles.label, disabled && styles.dimmed]}>{label}</AppText>
            )}

            <View style={[styles.grid, label !== undefined && styles.gridUnderLabel]}>
                {intoRows(LANGUAGES, COLUMNS).map((row, rowIndex) => (
                    <View key={rowIndex} style={styles.row}>
                        {row.map(language => (
                            <Tile
                                key={language.code}
                                language={language}
                                selected={language.code === value}
                                disabled={disabled}
                                onPress={() => onChange(language.code)}
                            />
                        ))}
                    </View>
                ))}
            </View>
        </View>
    )
}

interface TileProps {
    language: Language,
    selected: boolean,
    disabled: boolean,
    onPress: () => void
}

function Tile({ language, selected, disabled, onPress }: TileProps) {
    const theme = useTheme();
    const styles = useStyles();

    return (
        <PopPressable
            onPress={onPress}
            disabled={disabled}
            accessibilityRole='radio'
            accessibilityLabel={language.label}
            // `aria-checked` rather than `accessibilityState={{ checked }}`: the latter
            // never reaches the DOM in this version, so the chosen tile would look
            // picked without announcing that it was.
            aria-checked={selected}
            style={[
                styles.tile,
                selected ? styles.tileSelected : styles.tileUnselected,
                disabled && styles.tileDisabled
            ]}
        >
            <View style={styles.tileTop}>
                <CountryFlag code={language.flag} width={FLAG_WIDTH} />

                <View style={[styles.check, selected ? styles.checkOn : styles.checkOff]}>
                    {selected && (
                        <Feather name='check' size={15} color={theme.colors.textOnAccent} />
                    )}
                </View>
            </View>

            <AppText style={styles.tileLabel}>{language.label}</AppText>
            <AppText style={styles.tileDescription}>{language.description}</AppText>
        </PopPressable>
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
    grid: {
        gap: Spacing.two
    },
    gridUnderLabel: {
        marginTop: Spacing.three
    },
    row: {
        flexDirection: 'row',
        gap: Spacing.two
    },
    tile: {
        // Equal shares of the row, so two tiles of unequal copy still line up.
        flex: 1,
        minWidth: 0,
        padding: Spacing.three,
        backgroundColor: theme.colors.backgroundElement,
        borderWidth: 2,
        borderColor: theme.colors.border,
        borderRadius: 14
    },
    tileSelected: {
        backgroundColor: theme.colors.backgroundSelected,
        ...theme.shadows.hardLarge
    },
    // The ones you have not picked sit back a step, the way the swatch grid does it:
    // shallower shadow, a touch of the card showing through.
    tileUnselected: {
        opacity: 0.8,
        ...theme.shadows.hardSmall
    },
    // Applied last, so it wins the opacity over `tileUnselected` above.
    tileDisabled: {
        opacity: 0.5
    },
    tileTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.two
    },
    tileLabel: {
        marginTop: Spacing.three,
        fontSize: FontSizes.md,
        lineHeight: FontSizes.md * 1.2,
        fontWeight: 900,
        color: theme.colors.text
    },
    tileDescription: {
        marginTop: Spacing.half,
        fontSize: FontSizes.xs,
        lineHeight: FontSizes.xs * 1.4,
        color: theme.colors.textSecondary
    },
    check: {
        width: CHECK_SIZE,
        height: CHECK_SIZE,
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: theme.colors.border,
        borderRadius: 999
    },
    checkOn: {
        backgroundColor: theme.colors.primary
    },
    checkOff: {
        backgroundColor: theme.colors.muted
    },
    dimmed: {
        opacity: 0.5
    }
}))

import AppText from "@/components/text/AppText";
import Label from "@/components/text/Label";
import { Spacing, withAlpha } from "@/constants/theme";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { Pressable, View } from "react-native";

export interface HorizontalButtonSelectProps<T> {
    options: readonly T[];
    value: T;
    onChange: (value: T) => void;

    /**
     * Converts an option into the text displayed inside its button.
     */
    getLabel: (option: T) => string;

    /**
     * Used by screen readers to describe the selected option.
     * Defaults to the value returned by `getLabel`.
     */
    getAccessibilityLabel?: (option: T) => string;

    /**
     * `card` wraps the selector in its own card.
     * `inline` removes the card styling so the caller can provide its own container.
     */
    variant?: "card" | "inline";

    /**
     * Compact makes the buttons shorter and slightly smaller.
     */
    compact?: boolean;

    /**
     * Optional label displayed above the buttons.
     */
    label?: string;

    /**
     * What the chosen option is, spelled out at the other end of the label's line —
     * "5 letters" over a row that only says "5". Needs `label` to have somewhere to go.
     */
    valueLabel?: string;
}

const TILE_HEIGHT = 52;
const TILE_HEIGHT_COMPACT = 42;

export default function HorizontalButtonSelect<T>({
    options,
    value,
    onChange,
    getLabel,
    getAccessibilityLabel,
    variant = "card",
    compact = false,
    label,
    valueLabel
}: HorizontalButtonSelectProps<T>) {
    const styles = useStyles();

    const inline = variant === "inline";

    return (
        <View style={inline ? undefined : styles.card}>
            {label && <Label label={label} value={valueLabel} />}

            <View style={styles.track}>
                {options.map((option, index) => {
                    const selected = option === value;

                    return (
                        <ButtonTile
                            key={index}
                            label={getLabel(option)}
                            accessibilityLabel={
                                getAccessibilityLabel?.(option) ?? getLabel(option)
                            }
                            selected={selected}
                            compact={compact}
                            onPress={() => onChange(option)}
                        />
                    );
                })}
            </View>
        </View>
    );
}

interface ButtonTileProps {
    label: string;
    accessibilityLabel: string;
    selected: boolean;
    compact: boolean;
    onPress: () => void;
}

/*
 * One tab of the picker. The chosen one is a paper tile floating just above a sunken
 * track; the rest are nothing but their numbers, resting in it.
 *
 * The tile used to wear the page's accent, but a picker that shouts in the game's
 * colour competes with the one control on the page that is allowed to — the action.
 * Paper says "chosen" through elevation instead, which also means the picker needs no
 * ink-versus-paper decision and reads the same under every accent, violet included.
 */
function ButtonTile({
    label,
    accessibilityLabel,
    selected,
    compact,
    onPress
}: ButtonTileProps) {
    const styles = useStyles();

    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="radio"
            accessibilityLabel={accessibilityLabel}
            aria-checked={selected}
            style={[
                styles.tile,
                compact && styles.tileCompact,
                selected && styles.tileSelected
            ]}
        >
            <AppText
                style={[
                    selected ? styles.tileTextSelected : styles.tileText,
                    compact &&
                        (selected
                            ? styles.tileTextSelectedCompact
                            : styles.tileTextCompact)
                ]}
            >
                {label}
            </AppText>
        </Pressable>
    );
}

const useStyles = createThemedStyles(theme => ({
    card: {
        padding: Spacing.three,
        borderRadius: 22,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.borderStrong,
        backgroundColor: theme.colors.backgroundSecondary,
        ...theme.popShadow(theme.colors.shadow)
    },

    // A shallow well the options sit in, drawn as a wash of whichever ink the scheme
    // writes with. It is the only part of the control that touches the page, so it has
    // to stay quiet enough to sit on bare canvas with no card around it.
    track: {
        flexDirection: "row",
        gap: 4,
        padding: 4,
        borderRadius: 16,
        backgroundColor:
            theme.scheme === "dark"
                ? withAlpha(theme.colors.text, 0.06)
                : withAlpha(theme.colors.border, 0.06)
    },

    tile: {
        flex: 1,
        height: TILE_HEIGHT,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 12
    },

    tileCompact: {
        height: TILE_HEIGHT_COMPACT,
        borderRadius: 10
    },

    // Lifted out of the track on a soft shadow rather than cut out with an outline.
    // Dark's canvas swallows a faint shadow, so it casts harder into `shadow` and the
    // fill takes the selected rung, which sits higher off the track than a plain card.
    tileSelected: {
        backgroundColor:
            theme.scheme === "dark"
                ? theme.colors.backgroundSelected
                : theme.colors.backgroundSecondary,
        boxShadow: `0 3px 8px -2px ${withAlpha(theme.colors.shadow, theme.scheme === "dark" ? 0.8 : 0.28)}`
    },

    tileText: {
        fontSize: 17,
        fontWeight: 800,
        color: theme.colors.textFaint
    },

    tileTextSelected: {
        fontSize: 18,
        fontWeight: 900,
        color: theme.colors.text
    },

    tileTextCompact: {
        fontSize: 15
    },

    tileTextSelectedCompact: {
        fontSize: 16
    }
}));

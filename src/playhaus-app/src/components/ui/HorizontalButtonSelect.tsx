import AppText from "@/components/text/AppText";
import Label from "@/components/text/Label";
import { Brand, Gradients, Spacing, accentInkColor, linearGradient, withAlpha } from "@/constants/theme";
import { useAccent } from "@/features/theme/AccentContext";
import { useTheme } from "@/features/theme/ThemeContext";
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

const TILE_GRADIENT_MIDPOINT = 60;

const TILE_HEIGHT = 60;
const TILE_HEIGHT_COMPACT = 46;

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

            <View style={[styles.row, inline && styles.rowInline]}>
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

function ButtonTile({
    label,
    accessibilityLabel,
    selected,
    compact,
    onPress
}: ButtonTileProps) {
    const styles = useStyles();
    const theme = useTheme();

    /*
     * The colour the chosen tile wears, which is the page's if it lends one.
     *
     * Lemon is the standing answer and stays the answer everywhere nothing is lent —
     * the lobby's settings card, the time picker. Inside a settings card the game's own
     * colour is what "chosen" means, so the same picker is orange under League of
     * Letters and violet under One of Us.
     */
    const accent = useAccent();
    const fill = accent?.gradient ?? Gradients.lemon;
    const flat = accent?.color ?? Brand.lemon;
    const ink = accent === null ? Brand.ink : accentInkColor(accent.ink);

    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="radio"
            accessibilityLabel={accessibilityLabel}
            aria-checked={selected}
            style={[
                styles.tile,
                compact && styles.tileCompact,
                selected ? styles.tileSelected : styles.tileUnselected,
                selected && linearGradient(fill, TILE_GRADIENT_MIDPOINT),
                // Dark has no ink line to cut the tile out with, so the edge and the lift
                // are both drawn in the accent — see `tileSelected` for the light case.
                selected && theme.scheme === "dark" && {
                    borderColor: flat,
                    boxShadow: `0 10px 20px -12px ${withAlpha(flat, 0.8)}`
                }
            ]}
        >
            <AppText
                style={[
                    selected ? styles.tileTextSelected : styles.tileText,
                    selected && { color: ink },
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
        ...(theme.scheme === "dark"
            ? {}
            : theme.popShadow(theme.colors.border))
    },

    row: {
        flexDirection: "row",
        gap: Spacing.two
    },

    rowInline: {
        marginTop: 0,
        gap: 6
    },

    tile: {
        height: TILE_HEIGHT,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 16,
        borderWidth: theme.borderWidth
    },

    tileCompact: {
        height: TILE_HEIGHT_COMPACT,
        borderRadius: 13
    },

    tileSelected: {
        flex: 1.25,
        borderColor:
            theme.scheme === "dark"
                ? theme.colors.lemon
                : theme.colors.border,
        boxShadow:
            theme.scheme === "dark"
                ? "0 10px 20px -12px rgba(255, 229, 56, 0.8)"
                : "2px 2px 0 0 #0F0D12, 0 10px 18px -12px rgba(15, 13, 18, 0.6)"
    },

    tileUnselected: {
        flex: 1,
        borderColor: theme.colors.borderMuted,
        backgroundColor:
            theme.scheme === "dark"
                ? theme.colors.backgroundElement
                : theme.colors.background
    },

    tileText: {
        fontSize: 22,
        fontWeight: 900,
        color: theme.colors.textFaint
    },

    tileTextSelected: {
        fontSize: 26,
        fontWeight: 900,
        color: Brand.ink
    },

    tileTextCompact: {
        fontSize: 17
    },

    tileTextSelectedCompact: {
        fontSize: 20
    }
}));
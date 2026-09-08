import AppText from "@/components/text/AppText";
import PopPressable from "@/components/ui/PopPressable";
import { useT } from "@/features/i18n/LanguageContext";
import { withAlpha } from "@/constants/theme";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import { haptic } from "@/utils/haptics";
import Feather from "@expo/vector-icons/Feather";
import { View, useWindowDimensions, type StyleProp, type ViewStyle } from "react-native";

interface Props {
    /** A digit or a minus sign to append to whatever is being typed. */
    onKey: (character: string) => void
    onBackspace: () => void
    disabled?: boolean
    /** For layout only — how the pad sits among its siblings. The look lives here. */
    style?: StyleProp<ViewStyle>
}

/** Three columns of four, the way a phone draws a number. */
const ROWS = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9']
] as const;

// How tall a key is, off the window rather than off a measurement.
function keyHeightFor(windowHeight: number): number {
    if (windowHeight < 640) return 46;
    if (windowHeight < 780) return 50;
    return 54;
}

// The pad round 3 types its numbers on, instead of the phone's own keyboard.
export default function NumberPad({ onKey, onBackspace, disabled = false, style }: Props) {
    const t = useT();
    const styles = useStyles();

    const { height } = useWindowDimensions();
    const keyHeight = keyHeightFor(height);

    return (
        <View style={[styles.pad, style]}>
            {ROWS.map(row => (
                <View key={row[0]} style={styles.row}>
                    {row.map(digit => (
                        <Key
                            key={digit}
                            label={digit}
                            height={keyHeight}
                            disabled={disabled}
                            onPress={() => onKey(digit)}
                        />
                    ))}
                </View>
            ))}

            <View style={styles.row}>
                {/* Minus and backspace take the canvas rather than the paper the digits wear. */}
                <Key
                    label="−"
                    spoken={t('pubquizr.play.pad.minus')}
                    height={keyHeight}
                    disabled={disabled}
                    muted
                    onPress={() => onKey('-')}
                />

                <Key
                    label="0"
                    height={keyHeight}
                    disabled={disabled}
                    onPress={() => onKey('0')}
                />

                <Key
                    spoken={t('pubquizr.play.pad.backspace')}
                    icon="delete"
                    height={keyHeight}
                    disabled={disabled}
                    muted
                    onPress={onBackspace}
                />
            </View>
        </View>
    )
}

interface KeyProps {
    label?: string
    /** What a screen reader says, where the label is a glyph or an icon. */
    spoken?: string
    icon?: keyof typeof Feather.glyphMap
    height: number
    disabled: boolean
    /** The two keys that are not a digit. */
    muted?: boolean
    onPress: () => void
}

function Key({ label, spoken, icon, height, disabled, muted = false, onPress }: KeyProps) {
    const theme = useTheme();
    const styles = useStyles();

    return (
        <PopPressable
            onPress={onPress}
            // The bubble comes from `PopPressable`.
            onPressIn={() => haptic('tap')}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={spoken ?? label}
            accessibilityState={{ disabled }}
            style={[
                styles.key,
                { height },
                muted ? styles.keyMuted : styles.keyDigit,
                disabled && styles.keyDisabled
            ]}
        >
            {icon !== undefined
                ? <Feather name={icon} size={20} color={theme.colors.text} />
                : <AppText style={[styles.keyText, muted && styles.keyTextMuted]}>{label}</AppText>}
        </PopPressable>
    )
}

const useStyles = createThemedStyles(theme => ({
    // Sits on a fill of its own rather than on the page, so the board above it has a bottom edge.
    pad: {
        flexShrink: 1,
        gap: 6,
        paddingVertical: 8,
        paddingHorizontal: 8,
        borderTopWidth: theme.borderWidth,
        borderTopColor: theme.colors.borderSubtle,
        backgroundColor: theme.colors.muted
    },

    row: {
        flexDirection: 'row',
        gap: 6
    },

    key: {
        // Every key shares the row evenly.
        flex: 1,
        minWidth: 0,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 10
    },

    keyDigit: {
        backgroundColor: theme.colors.backgroundSecondary,
        // Seated rather than floating: the shadow is directly underneath.
        boxShadow: `0 2px 0 0 ${withAlpha(theme.colors.shadow, 0.2)}`
    },

    keyMuted: {
        backgroundColor: theme.colors.backgroundElement
    },

    keyText: {
        fontSize: 22,
        fontWeight: 700,
        color: theme.colors.text
    },

    keyTextMuted: {
        fontSize: 20,
        color: theme.colors.textSecondary
    },

    keyDisabled: {
        opacity: 0.5
    }
}))

import AppText from "@/components/text/AppText";
import { Spacing } from "@/constants/theme";
import { splitPrompt } from "@/features/fake-filler/prompt";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import { TextInput, View } from "react-native";

interface Props {
    /** The prompt, blanks and all — the `line` exactly as the server sent it. */
    line: string,
    // What goes in the blanks.
    fills: string[] | null,
    // Editable turns the blanks into fields and makes this the writing screen.
    editable?: boolean,
    onChangeFill?: (index: number, value: string) => void,
    placeholder?: string,
    /** Accessibility label for a field, given its 1-based position. */
    blankLabel?: (position: number) => string,
    disabled?: boolean
}

// One prompt, with something in its gaps.
export default function PromptLine({
    line,
    fills,
    editable = false,
    onChangeFill,
    placeholder,
    blankLabel,
    disabled = false
}: Props) {
    const theme = useTheme();
    const styles = useStyles();

    const parts = splitPrompt(line);

    return (
        <View style={styles.line}>
            {parts.map((part, at) => {
                if (part.kind === 'text') {
                    return (
                        <AppText key={`text-${at}`} style={styles.text}>
                            {part.text}
                        </AppText>
                    )
                }

                const value = fills?.[part.index] ?? '';

                if (!editable) {
                    return (
                        <View
                            key={`blank-${part.index}`}
                            style={[styles.slot, value === '' && styles.slotEmpty]}
                        >
                            <AppText style={styles.filled}>{value}</AppText>
                        </View>
                    )
                }

                return (
                    <TextInput
                        key={`blank-${part.index}`}
                        style={[styles.text, styles.input]}
                        value={value}
                        onChangeText={next => onChangeFill?.(part.index, next)}
                        placeholder={placeholder}
                        placeholderTextColor={theme.colors.textMuted}
                        editable={!disabled}
                        accessibilityLabel={blankLabel?.(part.index + 1)}
                        // The blanks are mid-sentence, so the keyboard must not treat each one as the start of a new one.
                        autoCapitalize='none'
                        autoCorrect={false}
                        returnKeyType='done'
                    />
                )
            })}
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    // Wrapping row rather than a paragraph: the blanks are views, and a `Text` cannot lay an input out inline on native.
    line: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'baseline',
        rowGap: Spacing.two,
        columnGap: 2
    },
    text: {
        fontSize: 19,
        lineHeight: 19 * 1.6,
        fontWeight: 700,
        color: theme.colors.text
    },
    // Underlined rather than boxed, so it reads as a gap in a sentence rather than as a form field dropped into one.
    input: {
        minWidth: 96,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderBottomWidth: 2,
        borderBottomColor: theme.colors.text,
        color: theme.colors.text
    },
    slot: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderBottomWidth: 2,
        borderBottomColor: theme.colors.borderStrong
    },
    // Nothing to show.
    slotEmpty: {
        minWidth: 72
    },
    filled: {
        fontSize: 19,
        lineHeight: 19 * 1.6,
        fontWeight: 900,
        color: theme.colors.text
    }
}))

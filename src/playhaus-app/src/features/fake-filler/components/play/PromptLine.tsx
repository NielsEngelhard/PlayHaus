import AppText from "@/components/text/AppText";
import { Brand, Spacing } from "@/constants/theme";
import { splitPrompt } from "@/features/fake-filler/prompt";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import { TextInput, View, type TextStyle } from "react-native";

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
    disabled?: boolean,
    /** The sentence's type size. Everything else is scaled off it. */
    size?: number
}

// One prompt, with something in its gaps — written in, or waiting to be.
export default function PromptLine({
    line,
    fills,
    editable = false,
    onChangeFill,
    placeholder,
    blankLabel,
    disabled = false,
    size = 19
}: Props) {
    const theme = useTheme();
    const styles = useStyles();

    const type: TextStyle = { fontSize: size, lineHeight: Math.round(size * 1.5) };
    const parts = splitPrompt(line);

    return (
        <View style={styles.line}>
            {parts.map((part, at) => {
                if (part.kind === 'text') {
                    return (
                        <AppText key={`text-${at}`} style={[styles.text, type]}>
                            {part.text}
                        </AppText>
                    )
                }

                const value = fills?.[part.index] ?? '';
                const filled = value.trim() !== '';

                if (!editable) {
                    return (
                        <View
                            key={`blank-${part.index}`}
                            style={[styles.blank, filled ? styles.blankFilled : styles.blankEmpty]}
                        >
                            <AppText style={[styles.text, type, filled ? styles.written : styles.waiting]}>
                                {filled ? value : '…'}
                            </AppText>
                        </View>
                    )
                }

                return (
                    <TextInput
                        key={`blank-${part.index}`}
                        style={[
                            styles.text,
                            type,
                            styles.blank,
                            styles.field,
                            filled ? styles.blankFilled : styles.blankEmpty,
                            filled ? styles.written : styles.typing
                        ]}
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

/** How heavy the rule under a blank is. Thicker than a border, because it is a marker stroke. */
const STROKE = 3;

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
        fontWeight: 700,
        letterSpacing: -0.4,
        color: theme.colors.text
    },
    blank: {
        minWidth: 96,
        paddingHorizontal: 5,
        borderBottomWidth: STROKE
    },
    // Highlighted, the way a marker pen would leave it.
    blankFilled: {
        borderBottomColor: theme.colors.text,
        backgroundColor: theme.colors.mint
    },
    blankEmpty: {
        borderBottomColor: theme.colors.borderDashed
    },
    // A field is laid out by its own text, so it needs the height a wrapping view gets for free.
    field: {
        paddingVertical: 2
    },
    // Ink in both schemes: it is sitting on the mint, not beside it.
    written: {
        fontWeight: 900,
        color: Brand.ink
    },
    waiting: {
        fontWeight: 900,
        color: theme.colors.textMuted
    },
    typing: {
        fontWeight: 900,
        color: theme.colors.text
    }
}))

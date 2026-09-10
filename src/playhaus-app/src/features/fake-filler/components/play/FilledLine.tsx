import AppText from "@/components/text/AppText";
import { Brand } from "@/constants/theme";
import { splitPrompt } from "@/features/fake-filler/prompt";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import type { TextStyle } from "react-native";

interface Props {
    /** The prompt, blanks and all — the `line` exactly as the server sent it. */
    line: string,
    /** What goes in the blanks, or null to leave them standing as gaps. */
    fills: string[] | null,
    size?: number,
    /** The wash behind each filled-in word. */
    mark?: string,
    // Underline the fills rather than washing them.
    underline?: boolean,
    /** The ink of the words between the blanks. The fills are always full strength. */
    color?: string,
    /** How many lines it may run to before it is cut. */
    lines?: number
}

// A prompt with its blanks answered, and the answers marked so the sentence shows its seams.
export default function FilledLine({
    line,
    fills,
    size = 16,
    mark,
    underline = false,
    color,
    lines
}: Props) {
    const styles = useStyles();

    const type: TextStyle = { fontSize: size, lineHeight: Math.round(size * 1.45) };

    return (
        <AppText style={[styles.line, type, color !== undefined && { color }]} numberOfLines={lines}>
            {splitPrompt(line).map((part, at) => {
                if (part.kind === 'text') return part.text;

                const value = fills?.[part.index];

                // No answer to show, so the gap itself is the thing to draw.
                if (value === undefined || value.trim() === '') {
                    return (
                        <AppText key={`blank-${part.index}`} style={[styles.gap, type]}>
                            ___
                        </AppText>
                    )
                }

                return (
                    <AppText
                        key={`fill-${part.index}`}
                        style={[
                            styles.fill,
                            type,
                            // Ink on the wash in both schemes: the marked word sits on the mark, not beside it.
                            mark !== undefined && { backgroundColor: mark, color: Brand.ink },
                            underline && styles.underlined
                        ]}
                    >
                        {value}
                    </AppText>
                )
            })}
        </AppText>
    )
}

const useStyles = createThemedStyles(theme => ({
    line: {
        fontWeight: 700,
        color: theme.colors.text
    },
    fill: {
        fontWeight: 900,
        color: theme.colors.text
    },
    // Ink whatever the surrounding sentence is set in: an unanswered gap is the loudest thing in it.
    gap: {
        fontWeight: 900,
        color: theme.colors.text
    },
    underlined: {
        textDecorationLine: 'underline'
    }
}))

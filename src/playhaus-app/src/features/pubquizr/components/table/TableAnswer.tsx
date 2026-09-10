import AppText from "@/components/text/AppText";
import { Brand, withAlpha } from "@/constants/theme";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { View } from "react-native";

interface Props {
    /** Wordings that also counted. Never the headline answer. */
    aliases?: string[]
    answer: string
    /** The line above it, since an answer alone does not say what it is. */
    label: string
    /** The shared screen's type scale -- see `table-scale.ts`. */
    scale: number
}

// The answer, out in the open. Not `AnswerReveal`, which is a press-to-uncover control: the screen has nothing pressable on it, ever.
export default function TableAnswer({ aliases = [], answer, label, scale }: Props) {
    const styles = useStyles();

    return (
        <View
            style={[
                styles.card,
                {
                    paddingHorizontal: Math.round(26 * scale),
                    paddingVertical: Math.round(16 * scale),
                    gap: Math.round(4 * scale)
                }
            ]}
        >
            <AppText style={[styles.label, { fontSize: Math.round(10 * scale) }]}>{label}</AppText>

            <AppText style={[styles.answer, { fontSize: Math.round(26 * scale) }]}>{answer}</AppText>

            {aliases.length > 0 && (
                <AppText style={[styles.aliases, { fontSize: Math.round(13 * scale) }]}>
                    {aliases.join(' \u00b7 ')}
                </AppText>
            )}
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    card: {
        alignItems: 'center',
        borderRadius: 20,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.borderStrong,
        backgroundColor: theme.colors.mint,
        ...theme.popShadow(theme.colors.shadow)
    },
    // Ink on mint in both schemes, because the fill is mint in both.
    label: {
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: 1.8,
        color: withAlpha(Brand.ink, 0.6)
    },
    answer: {
        fontWeight: 900,
        textAlign: 'center',
        color: Brand.ink
    },
    aliases: {
        fontWeight: 600,
        textAlign: 'center',
        color: withAlpha(Brand.ink, 0.7)
    }
}))

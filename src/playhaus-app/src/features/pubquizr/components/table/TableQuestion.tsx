import AppText from "@/components/text/AppText";
import { Brand } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import type { ReactNode } from "react";
import { View } from "react-native";

interface Props {
    // Whatever belongs under the question: the walk it has been on, the reveal, round 2's options.
    children?: ReactNode
    /** 1-based: question 3 of 8. */
    number: number
    prompt: string
    /** The shared screen's type scale -- see `table-scale.ts`. */
    scale: number
    total: number
    /** What taking it pays, and zero for a question worth only the seat. */
    worth: number
}

// The question as the whole table reads it. No cue: "read this out" belongs on the quizmaster's phone.
export default function TableQuestion({ children, number, prompt, scale, total, worth }: Props) {
    const styles = useStyles();
    const t = useT();

    return (
        <View style={[styles.stage, { gap: Math.round(20 * scale), maxWidth: Math.round(880 * scale) }]}>
            <View style={[styles.meta, { gap: Math.round(12 * scale) }]}>
                <AppText style={[styles.count, { fontSize: Math.round(11 * scale) }]}>
                    {t('pubquizr.play.questionNumber', { number })}
                    {t('pubquizr.play.questionTotal', { total })}
                </AppText>

                {worth > 0 && (
                    <View
                        style={[
                            styles.chip,
                            {
                                paddingHorizontal: Math.round(10 * scale),
                                paddingVertical: Math.round(4 * scale)
                            }
                        ]}
                    >
                        <AppText style={[styles.worth, { fontSize: Math.round(11 * scale) }]}>
                            {t('pubquizr.play.worthPoints', { worth })}
                        </AppText>
                    </View>
                )}
            </View>

            <AppText
                style={[
                    styles.prompt,
                    { fontSize: Math.round(30 * scale), lineHeight: Math.round(37 * scale) }
                ]}
            >
                {prompt}
            </AppText>

            {children}
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    stage: {
        alignItems: 'center'
    },
    meta: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    count: {
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: 1.8,
        color: theme.colors.textMuted
    },
    chip: {
        borderRadius: 999,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.borderStrong,
        backgroundColor: theme.colors.lemon
    },
    // Ink on lemon in both schemes, because the fill is lemon in both.
    worth: {
        fontWeight: 900,
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        color: Brand.ink
    },
    prompt: {
        fontWeight: 900,
        textAlign: 'center',
        color: theme.colors.text
    }
}))

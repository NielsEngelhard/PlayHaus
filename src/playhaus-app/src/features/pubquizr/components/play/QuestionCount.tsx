import AppText from "@/components/text/AppText";
import { FontSizes } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";

interface Props {
    number: number
    total: number
}

// "3/8" on screen and "Question 3 of 8" to a screen reader.
export default function QuestionCount({ number, total }: Props) {
    const t = useT();
    const styles = useStyles();

    return (
        <AppText
            style={styles.count}
            accessibilityLabel={
                t('pubquizr.play.questionNumber', { number })
                + t('pubquizr.play.questionTotal', { total })
            }
        >
            {number}
            <AppText style={styles.total}>
                {t('pubquizr.play.questionOutOf', { total })}
            </AppText>
        </AppText>
    )
}

const useStyles = createThemedStyles(theme => ({
    count: {
        flexShrink: 0,
        fontSize: FontSizes.xs,
        fontWeight: 800,
        color: theme.colors.text
    },

    total: {
        color: theme.colors.textMuted
    }
}))

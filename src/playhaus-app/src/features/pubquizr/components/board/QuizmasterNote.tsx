import AppText from "@/components/text/AppText";
import { FontSizes, Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import type { Seat } from "@/features/pubquizr/seats";
import { createThemedStyles } from "@/features/theme/createThemedStyles";

interface Props {
    mySeat: number | null
    quizmaster: Seat | null
}

// The line at the foot of a phone that is not the quizmaster's, so nobody has to ask who is reading.
export default function QuizmasterNote({ mySeat, quizmaster }: Props) {
    const styles = useStyles();
    const t = useT();

    if (quizmaster === null || quizmaster.seat === mySeat) return null;

    return (
        <AppText style={styles.note} numberOfLines={1}>
            {t('pubquizr.board.currentQuizmaster', { name: quizmaster.name })}
        </AppText>
    )
}

const useStyles = createThemedStyles(theme => ({
    // `auto` pins it to the bottom even on a board whose content does not fill the phone.
    note: {
        marginTop: 'auto',
        paddingTop: Spacing.two,
        textAlign: 'center',
        fontSize: FontSizes.xs,
        fontWeight: 500,
        color: theme.colors.textMuted
    }
}))

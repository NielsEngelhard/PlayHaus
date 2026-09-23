import AppText from "@/components/text/AppText";
import { FontSizes, Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import type { PreviousRuling } from "@/features/pubquizr/hot-seat";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { StyleSheet, View } from "react-native";

const CAPS_SIZE = 10;

interface Props {
    mySeat: number | null
    previous: PreviousRuling
}

// The foot of a watching phone: the question that was just read out, its answer, and who took it.
export default function PreviousQuestion({ mySeat, previous }: Props) {
    const t = useT();
    const styles = useStyles();

    const { winner } = previous;
    const verdict = winner === null
        ? t('pubquizr.board.previous.nobody')
        : winner.seat === mySeat
            ? t('pubquizr.board.previous.youGotIt')
            : t('pubquizr.board.previous.gotIt', { name: winner.name });

    return (
        <View style={styles.foot}>
            <AppText style={styles.label}>{t('pubquizr.board.previous.label')}</AppText>

            <AppText style={styles.prompt} numberOfLines={2}>{previous.prompt}</AppText>

            <AppText style={styles.ruling} numberOfLines={1}>
                <AppText style={styles.answer}>{previous.answer}</AppText>
                {` · ${verdict}`}
            </AppText>
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    foot: {
        flexShrink: 0,
        gap: Spacing.half,
        paddingTop: Spacing.two,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: theme.colors.borderMuted
    },

    label: {
        fontSize: CAPS_SIZE,
        fontWeight: 800,
        letterSpacing: 1,
        textTransform: 'uppercase',
        color: theme.colors.textMuted
    },

    prompt: {
        fontSize: FontSizes.xs,
        fontWeight: 600,
        color: theme.colors.textSecondary
    },

    ruling: {
        fontSize: FontSizes.xs,
        fontWeight: 600,
        color: theme.colors.textMuted
    },

    answer: {
        fontWeight: 800,
        color: theme.colors.textSecondary
    }
}))

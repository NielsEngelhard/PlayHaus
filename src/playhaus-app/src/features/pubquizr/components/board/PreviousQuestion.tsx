import AppText from "@/components/text/AppText";
import { Brand, FontSizes, Radii, Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import type { PreviousRuling } from "@/features/pubquizr/hot-seat";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { View } from "react-native";

const CAPS_SIZE = 10;

// Ink at reduced strength, for the quieter lines on the lemon card.
const SOFT_INK = `${Brand.ink}CC`;
const MUTED_INK = `${Brand.ink}99`;

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
        paddingVertical: Spacing.two,
        paddingHorizontal: Spacing.three,
        borderRadius: Radii.lg,
        borderWidth: theme.borderWidth,
        borderColor: Brand.ink,
        backgroundColor: Brand.lemon
    },

    label: {
        fontSize: CAPS_SIZE,
        fontWeight: 800,
        letterSpacing: 1,
        textTransform: 'uppercase',
        color: MUTED_INK
    },

    prompt: {
        fontSize: FontSizes.xs,
        fontWeight: 600,
        color: SOFT_INK
    },

    ruling: {
        fontSize: FontSizes.xs,
        fontWeight: 600,
        color: MUTED_INK
    },

    answer: {
        fontWeight: 800,
        color: Brand.ink
    }
}))

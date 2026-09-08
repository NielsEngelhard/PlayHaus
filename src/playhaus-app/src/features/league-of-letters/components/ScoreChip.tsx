import AppText from "@/components/text/AppText";
import { Brand } from "@/constants/theme";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useT } from "@/features/i18n/LanguageContext";
import Feather from "@expo/vector-icons/Feather";
import { View } from "react-native";

interface Props {
    /** The reader's own running total across every round of this game. */
    score: number
}

// The player's own score, next to the board rather than only in the scoreboard below it.
export default function ScoreChip({ score }: Props) {
    const styles = useStyles();
    const t = useT();

    return (
        <View
            style={styles.chip}
            accessibilityRole='text'
            accessibilityLabel={t('lol.game.scoreCompactLabel', { score })}
        >
            <Feather name='star' size={13} color={Brand.ink} />

            <AppText style={styles.score}>{score}</AppText>
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    chip: {
        flexShrink: 0,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 11,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.borderStrong,
        backgroundColor: theme.colors.backgroundSecondary
    },
    score: {
        fontSize: 11,
        fontWeight: 900,
        color: theme.colors.text
    }
}))

import AppText from "@/components/text/AppText";
import { Brand } from "@/constants/theme";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useT } from "@/features/i18n/LanguageContext";
import type { WordLength } from "@/features/league-of-letters/solo-settings";
import Feather from "@expo/vector-icons/Feather";
import { View } from "react-native";

interface Props {
    /** How many letters the round's word has. Fixed for the whole round. */
    wordLength: WordLength
}

/**
 * How long the word is, sat beside `RoundChip` in the round's top row.
 *
 * The one difficulty signal the board never states outright otherwise: the grid shows it
 * by its width, but a row of empty tiles is not something a glance across a crowded table
 * reads as a number the way this chip is.
 */
export default function WordLengthChip({ wordLength }: Props) {
    const styles = useStyles();
    const t = useT();

    return (
        <View style={styles.chip}>
            <Feather name='hash' size={13} color={Brand.ink} />

            <AppText style={styles.label}>
                {t('lol.game.wordLengthLabel', { letters: wordLength })}
            </AppText>
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
    label: {
        fontSize: 11,
        fontWeight: 900,
        color: theme.colors.text
    }
}))

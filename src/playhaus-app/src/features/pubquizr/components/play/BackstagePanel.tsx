import AppText from "@/components/text/AppText";
import { Brand } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import Feather from "@expo/vector-icons/Feather";
import { View } from "react-native";

interface Props {
    answer: string
    /** Wordings that also count. "Tarantino" for "Quentin Tarantino". */
    aliases: string[]
}

/**
 * The back of the card: what the answer actually is.
 *
 * Ink in both schemes, and that is the whole design. Every other surface in this app
 * is paper or near-black depending on the scheme; this one is always the dark slab, so
 * "the part nobody else may see" is a thing you recognise by its colour before you have
 * read a word of it. The lemon eye-off line above it says the same thing in words for
 * anyone who has not learned the shape yet.
 *
 * The aliases matter more than they look. A quizmaster who cannot see that "the Meuse"
 * also counts will wave off a right answer, and the table will argue about it.
 */
export default function BackstagePanel({ answer, aliases }: Props) {
    const t = useT();
    const styles = useStyles();

    return (
        <View style={styles.panel}>
            <View style={styles.warning}>
                <Feather name="eye-off" size={14} color={Brand.lemon} />

                <AppText style={styles.warningText}>
                    {t('pubquizr.play.onlyYouSeeThis')}
                </AppText>
            </View>

            <AppText style={styles.answer}>{answer}</AppText>

            {aliases.length > 0 && (
                <AppText style={styles.aliases}>
                    {t('pubquizr.play.alsoAccept', { answers: aliases.join(', ') })}
                </AppText>
            )}
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    panel: {
        flexShrink: 0,
        padding: 15,
        borderRadius: 20,
        borderWidth: theme.borderWidth,
        // Ink on ink in the dark scheme would be an invisible edge, so the border
        // steps up to the scheme's own rather than staying the slab's colour.
        borderColor: theme.scheme === 'dark' ? theme.colors.border : Brand.ink,
        backgroundColor: Brand.ink
    },

    warning: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7
    },

    warningText: {
        fontSize: 10.5,
        fontWeight: 900,
        textTransform: 'uppercase',
        letterSpacing: 1.4,
        color: Brand.lemon
    },

    // Paper in both schemes: the slab under it is ink in both.
    answer: {
        marginTop: 9,
        fontSize: 26,
        fontWeight: 900,
        letterSpacing: -0.7,
        color: Brand.textOnAccent
    },

    aliases: {
        marginTop: 6,
        fontSize: 12,
        fontWeight: 600,
        lineHeight: 12 * 1.4,
        // Quieter than the answer without being a second colour: the same paper,
        // stepped back, so the two read as one thing said twice.
        color: 'rgba(254, 251, 248, 0.6)'
    }
}))

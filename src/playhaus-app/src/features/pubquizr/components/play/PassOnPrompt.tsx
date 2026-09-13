import AppText from "@/components/text/AppText";
import TextHint from "@/components/text/TextHint";
import PopPressable from "@/components/ui/PopPressable";
import { Brand } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import type { Seat } from "@/features/pubquizr/seats";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import Feather from "@expo/vector-icons/Feather";
import { View } from "react-native";

interface Props {
    /** Who just had it wrong. */
    from: Seat
    /** Who can now guess the same question. */
    to: Seat
    /** The ruling that got us here is still in the air. */
    busy: boolean
    onContinue: () => void
}

// The beat between one player getting it wrong and the next one being handed the same question.
export default function PassOnPrompt({
    from,
    to,
    busy,
    onContinue
}: Props) {
    const t = useT();
    const styles = useStyles();

    return (
        <View style={styles.container}>
            <PopPressable
                onPress={onContinue}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel={t('pubquizr.play.passOnSpoken', {
                    to: to.name,
                    from: from.name
                })}
                accessibilityState={{ disabled: busy }}
                style={[styles.button, busy && styles.busy]}
            >
                <View style={[styles.avatar, { backgroundColor: to.swatch.color }]}>
                    <AppText style={[styles.initials, { color: to.swatch.foreground }]}>
                        {to.initials}
                    </AppText>
                </View>

                {/* Shrinks rather than pushing the icon off the end. */}
                <AppText style={styles.label} numberOfLines={1}>
                    {t('pubquizr.play.passOn', { name: to.name })}
                </AppText>

                <Feather name="arrow-right" size={16} color={Brand.ink} />
            </PopPressable>

            <TextHint text={t('pubquizr.play.passOnHint', { name: from.name })} />
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    container: {
        flexShrink: 0
    },

    // Lemon, the same accent `VerdictButtons`' own hand-off pill wears.
    button: {
        height: 66,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        borderRadius: 18,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.lemon,
        ...theme.shadows.hard
    },

    busy: {
        opacity: 0.5
    },

    avatar: {
        width: 26,
        height: 26,
        flexShrink: 0,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: theme.borderWidth,
        borderColor: theme.scheme === 'dark' ? theme.colors.border : Brand.ink
    },

    initials: {
        fontSize: 9.5,
        fontWeight: 900
    },

    // Ink on lemon in both schemes, because the fill is lemon in both.
    label: {
        flexShrink: 1,
        minWidth: 0,
        fontSize: 16,
        fontWeight: 900,
        color: Brand.ink
    }
}))

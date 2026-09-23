import AppText from "@/components/text/AppText";
import TextHint from "@/components/text/TextHint";
import SeatAvatar from "@/components/ui/SeatAvatar";
import { FontSizes, Radii, Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import type { Seat } from "@/features/pubquizr/seats";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import Feather from "@expo/vector-icons/Feather";
import { View } from "react-native";

const GLYPH = 96;
const AVATAR = 26;
const MESSAGE_MAX_WIDTH = 280;

interface Props {
    /** What is going on, in a sentence. */
    message: string
    /** Where this phone comes in the walk, already said as a word, and null when it is not in one. */
    place: string | null
    /** Whoever the table is waiting on, and null when it is not one person. */
    seat: Seat | null
}

// What most phones show most of the time when there is a screen: an instruction to look at it, and where you come in.
export default function ControlWatch({ message, place, seat }: Props) {
    const t = useT();
    const theme = useTheme();
    const styles = useStyles();

    return (
        <View style={styles.stage}>
            <View style={styles.glyph}>
                <Feather name="tv" size={GLYPH / 2} color={theme.colors.textMuted} />
            </View>

            <AppText style={styles.title}>{t('pubquizr.control.watchScreen')}</AppText>

            <AppText style={styles.message}>{message}</AppText>

            {seat !== null && (
                <View style={styles.pill}>
                    <SeatAvatar seat={seat} size={AVATAR} />

                    <AppText style={styles.pillText} numberOfLines={1}>
                        {t('pubquizr.control.isUpNow', { name: seat.name })}
                    </AppText>
                </View>
            )}

            {place !== null && <TextHint text={t('pubquizr.control.yourPlace', { place })} />}
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    stage: {
        flex: 1,
        minHeight: 0,
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.three
    },

    glyph: {
        width: GLYPH,
        height: GLYPH,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: Radii.xl,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.backgroundElement,
        ...theme.shadows.hardSmall
    },

    title: {
        fontSize: FontSizes.xl,
        fontWeight: 900,
        letterSpacing: -0.8,
        textAlign: 'center',
        color: theme.colors.text
    },

    message: {
        maxWidth: MESSAGE_MAX_WIDTH,
        fontSize: FontSizes.sm,
        lineHeight: FontSizes.sm * 1.45,
        fontWeight: 700,
        textAlign: 'center',
        color: theme.colors.textSecondary
    },

    pill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two,
        paddingVertical: Spacing.one,
        paddingHorizontal: Spacing.three,
        borderRadius: Radii.full,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.backgroundSecondary,
        ...theme.shadows.hardSmall
    },

    pillText: {
        fontSize: FontSizes.xs,
        fontWeight: 900,
        color: theme.colors.text
    }
}))

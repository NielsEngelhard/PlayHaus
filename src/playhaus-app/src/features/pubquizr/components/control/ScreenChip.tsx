import AppText from "@/components/text/AppText";
import { Brand, Radii, Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import Feather from "@expo/vector-icons/Feather";
import { View } from "react-native";

const LABEL_SIZE = 10;
const DOT = 6;

// On the band, all evening: this table has a screen, so the phone is a controller.
export default function ScreenChip() {
    const t = useT();
    const styles = useStyles();

    return (
        <View style={styles.chip}>
            <View style={styles.dot} />

            <Feather name="tv" size={12} color={Brand.ink} />

            <AppText style={styles.label}>{t('pubquizr.control.onScreen')}</AppText>
        </View>
    )
}

const useStyles = createThemedStyles(() => ({
    // Paper and ink whatever the band behind it is doing, because the band is a game's gradient and not a scheme.
    chip: {
        flexShrink: 0,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.one,
        paddingVertical: Spacing.half,
        paddingHorizontal: Spacing.two,
        borderRadius: Radii.full,
        backgroundColor: Brand.textOnAccent
    },

    dot: {
        width: DOT,
        height: DOT,
        borderRadius: Radii.full,
        backgroundColor: Brand.mint
    },

    label: {
        fontSize: LABEL_SIZE,
        fontWeight: 900,
        letterSpacing: 1.2,
        color: Brand.ink
    }
}))

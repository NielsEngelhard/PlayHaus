import AppText from "@/components/text/AppText";
import { Brand, type AccentInk } from "@/constants/theme";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import Feather from "@expo/vector-icons/Feather";
import { View } from "react-native";

/**
 * The three tones a band's contents wear, per ink.
 *
 * The secondary two are the ink at reduced strength rather than colours of their own, so
 * the whole band reads as one surface: the pitch is the title gone quiet, and the fact
 * pills are outlined in the same ink again, quieter still.
 *
 * Exported because a band needs all three and the pill only uses two of them — the title
 * and the pitch above it are the page's own text, drawn from the same table.
 */
export const ON_ACCENT: Record<AccentInk, OnAccent> = {
    ink: {
        text: Brand.ink,
        muted: 'rgba(15, 13, 18, 0.72)',
        border: 'rgba(15, 13, 18, 0.35)'
    },
    paper: {
        text: Brand.textOnAccent,
        muted: 'rgba(254, 251, 248, 0.85)',
        border: 'rgba(254, 251, 248, 0.55)'
    }
};

export interface OnAccent {
    text: string,
    muted: string,
    border: string
}

/**
 * One fact about a game — how many can play, how many phones, how long it runs — as an
 * outlined pill on an accent band.
 *
 * `Chip` next door is the same shape in the page's own colours, and this one is standing
 * on an accent: every tone it wears has to come from the slab rather than from the theme,
 * which is the whole difference between them. That is also why `on` is a parameter — the
 * band knows which ink survives its own fill, and the pill does not.
 *
 * Shared by `GameIndexPage`'s hero and `GameModePageBase`'s band, which are the same band
 * seen one step apart.
 */
export default function AccentFact({
    icon,
    text,
    on
}: {
    icon: keyof typeof Feather.glyphMap,
    text: string,
    on: Pick<OnAccent, 'text' | 'border'>
}) {
    const styles = useStyles();

    return (
        <View style={[styles.fact, { borderColor: on.border }]}>
            <Feather name={icon} size={13} color={on.text} />

            <AppText style={[styles.factText, { color: on.text }]}>{text}</AppText>
        </View>
    );
}

const useStyles = createThemedStyles(() => ({
    fact: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        borderWidth: 1.5,
        borderRadius: 999,
        paddingVertical: 4,
        paddingHorizontal: 11
    },

    factText: {
        fontSize: 11.5,
        fontWeight: 700
    }
}))

import AppText from "@/components/text/AppText";
import { Brand, type AccentInk } from "@/constants/theme";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import Feather from "@expo/vector-icons/Feather";
import { View } from "react-native";

// The three tones a band's contents wear, per ink.
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

// One fact about a game — how many can play, how many phones, how long it runs — as an outlined pill on an accent band.
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

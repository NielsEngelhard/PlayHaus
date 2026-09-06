import AppText from "@/components/text/AppText";
import PopPressable from "@/components/ui/PopPressable";
import VerdictButtons from "@/features/pubquizr/components/play/VerdictButtons";
import { initialsOf } from "@/features/table/seats";
import type { Seat } from "@/features/pubquizr/seats";
import { useScheme } from "@/features/theme/ThemeContext";
import { colorForSeat } from "@/utils/color-utils";
import { View } from "react-native";

function seat(name: string, n: number): Seat {
    return { seat: n, name, score: 0, initials: initialsOf(name), swatch: colorForSeat(n) };
}

const niels = seat("Niels", 0);
const fleur = seat("Fleur", 1);

export default function VerdictPreview() {
    const { toggle } = useScheme();

    return (
        <View style={{ gap: 24, padding: 16 }}>
            <PopPressable onPress={toggle} style={{ padding: 8, backgroundColor: '#ccc', borderRadius: 8 }}>
                <AppText>Toggle theme</AppText>
            </PopPressable>

            <View style={{ gap: 8 }}>
                <AppText>Round 1/6, nextUp set</AppText>
                <VerdictButtons answering={niels} nextUp={fleur} worth={2} onVerdict={() => {}} />
            </View>

            <View style={{ gap: 8 }}>
                <AppText>Round 1/6, nextUp null (last seat)</AppText>
                <VerdictButtons answering={niels} nextUp={null} worth={0} onVerdict={() => {}} />
            </View>

            <View style={{ gap: 8 }}>
                <AppText>Round 2, alwaysNextUp set</AppText>
                <VerdictButtons answering={niels} nextUp={fleur} alwaysNextUp={fleur} worth={1} onVerdict={() => {}} />
            </View>

            <View style={{ gap: 8 }}>
                <AppText>Busy</AppText>
                <VerdictButtons answering={niels} nextUp={fleur} worth={2} onVerdict={() => {}} busy />
            </View>
        </View>
    )
}

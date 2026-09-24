import JoinCodeHero from "@/components/ui/JoinCodeHero";
import PopPressable from "@/components/ui/PopPressable";
import AppText from "@/components/text/AppText";
import { ONE_OF_US, PUBQUIZR } from "@/constants/games";
import { useScheme } from "@/features/theme/ThemeContext";
import { View } from "react-native";

export default function JoinCodePreview() {
    const { toggle } = useScheme();

    return (
        <View style={{ gap: 24, padding: 16 }}>
            <PopPressable onPress={toggle} style={{ padding: 8, backgroundColor: '#ccc', borderRadius: 8 }}>
                <AppText>Toggle theme</AppText>
            </PopPressable>

            <JoinCodeHero game={PUBQUIZR} code="K7QM" />
            <JoinCodeHero game={ONE_OF_US} code="R2XD" />
        </View>
    )
}

import { useHeaderTag } from "@/components/layout/HeaderTagContext";
import { LEAGUE_OF_LETTERS_NAME } from "@/constants/games";
import { useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";

export default function LeagueOfLettersSoloPage() {
    useHeaderTag(LEAGUE_OF_LETTERS_NAME);

    // Handed over by the settings screen. Temporary scaffolding — it's here so the
    // settings hand-off is visible until the real game screen exists.
    const { gameId, lang, length } = useLocalSearchParams<{
        gameId: string,
        lang: string,
        length: string
    }>();

    return (
        <View>
            <Text>
                TODO — solo game {gameId} ({length} letters, {lang})
            </Text>
        </View>
    )
}

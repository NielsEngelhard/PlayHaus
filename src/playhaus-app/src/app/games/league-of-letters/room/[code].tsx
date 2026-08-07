import { useHeaderTag } from "@/components/layout/HeaderTagContext";
import { LEAGUE_OF_LETTERS_NAME } from "@/constants/games";
import { useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";

export default function LeagueOfLettersRoomPage() {
    useHeaderTag(LEAGUE_OF_LETTERS_NAME);

    const { code } = useLocalSearchParams<{ code: string }>();

    return (
        <View>
            <Text>
                TODO — join room {code}
            </Text>
        </View>
    )
}

import { useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";

export default function LeagueOfLettersRoomPage() {
    const { code } = useLocalSearchParams<{ code: string }>();

    return (
        <View>
            <Text>
                TODO — join room {code}
            </Text>
        </View>
    )
}

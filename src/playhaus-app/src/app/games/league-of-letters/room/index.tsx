import { useHeaderTag } from "@/components/layout/HeaderTagContext";
import { LEAGUE_OF_LETTERS_NAME } from "@/constants/games";
import { Text, View } from "react-native";

export default function LeagueOfLettersCreateRoomPage() {
    useHeaderTag(LEAGUE_OF_LETTERS_NAME);

    return (
        <View>
            <Text>
                TODO
            </Text>
        </View>
    )
}

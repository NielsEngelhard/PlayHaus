import BackButton from "@/components/ui/BackButton";
import InlineNotification from "@/components/ui/InlineNotification";
import TextButton from "@/components/ui/TextButton";
import { ROUTES } from "@/constants/routes";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import { useRouter } from "expo-router";
import { View } from "react-native";

interface Props {
    /**
     * What the host actually did. A room being shut while people wait in it and a game
     * being stopped out from under the people playing it are the same event on the wire
     * — the code stops working — and quite different things to be told.
     */
    message: string
}

/**
 * The end of the road for everybody who was not the host: the code no longer works.
 *
 * Shared by the lobby and the board, because the host can pull the room out from under
 * either one and the answer is the same both times — there is nothing to retry, only a
 * way out. A retry would find the same 404.
 */
export default function RoomClosedNotice({ message }: Props) {
    const theme = useTheme();
    const styles = useStyles();

    const router = useRouter();

    return (
        <View style={styles.screen}>
            <BackButton href={ROUTES.leagueOfLettersIndex} />

            <InlineNotification
                icon='x'
                color={theme.colors.blush}
                title='Kamer gesloten'
                message={message}
            >
                <TextButton
                    text='Terug naar de spellen'
                    onPress={() => router.replace(ROUTES.leagueOfLettersIndex)}
                />
            </InlineNotification>
        </View>
    )
}

const useStyles = createThemedStyles(() => ({
    screen: {
        flex: 1,
        width: '100%'
    }
}))

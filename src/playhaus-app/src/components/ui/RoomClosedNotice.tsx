import BackButton from "@/components/ui/BackButton";
import InlineNotification from "@/components/ui/InlineNotification";
import TextButton from "@/components/ui/TextButton";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import { useT } from "@/features/i18n/LanguageContext";
import { useRouter, type Href } from "expo-router";
import { View } from "react-native";

interface Props {
    /**
     * What the host actually did. A room being shut while people wait in it and a game
     * being stopped out from under the people playing it are the same event on the wire
     * — the code stops working — and quite different things to be told.
     */
    message: string,
    /**
     * The game to send them back to.
     *
     * A prop rather than League of Letters' index, which is what this hardcoded while it
     * lived in that game's folder: the way out of a dead room is back to the game whose
     * room it was, and every game that grows a lobby needs its own.
     */
    href: Href
}

/**
 * The end of the road for everybody who was not the host: the code no longer works.
 *
 * Shared by the lobby and the board, because the host can pull the room out from under
 * either one and the answer is the same both times — there is nothing to retry, only a
 * way out. A retry would find the same 404.
 */
export default function RoomClosedNotice({ message, href }: Props) {
    const t = useT();
    const theme = useTheme();
    const styles = useStyles();

    const router = useRouter();

    return (
        <View style={styles.screen}>
            <BackButton href={href} />

            <InlineNotification
                icon='x'
                color={theme.colors.blush}
                title={t('lobby.closedTitle')}
                message={message}
            >
                <TextButton
                    text={t('common.backToGames')}
                    onPress={() => router.replace(href)}
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

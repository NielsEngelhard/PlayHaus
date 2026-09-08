import BackButton from "@/components/ui/BackButton";
import InlineNotification from "@/components/ui/InlineNotification";
import TextButton from "@/components/ui/TextButton";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import { useT } from "@/features/i18n/LanguageContext";
import { useRouter, type Href } from "expo-router";
import { View } from "react-native";

interface Props {
    // What the host actually did.
    message: string,
    // The game to send them back to.
    href: Href
}

// The end of the road for everybody who was not the host: the code no longer works.
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

import { gameForPathname } from "@/constants/games";
import { APP_VERSION } from "@/constants/global-constants";
import { DEFAULT_LANGUAGE, languageByCode } from "@/constants/languages";
import { ROUTES } from "@/constants/routes";
import { Colors, Spacing } from "@/constants/theme";
import { useAuth } from "@/features/auth/useAuth";
import { Link, RelativePathString, usePathname } from "expo-router";
import { StyleSheet, View } from "react-native";
import HeaderStatus from "./HeaderStatus";
import Logo from "./Logo";

export default function Header() {
    const pathname = usePathname();
    const { user } = useAuth();

    // Read off the route rather than pushed up by each page: the header already knows
    // where it is, and a page that forgot to say so used to leave the previous page's
    // name sitting in the chrome.
    const game = gameForPathname(pathname);

    // The account's language, or the default while the session is still being
    // restored — the header is on screen before anyone is signed in, and a capsule
    // with a hole where the flag goes would be a worse way to say so.
    const language = languageByCode(user?.locale ?? DEFAULT_LANGUAGE);

    return (
        <View style={styles.container}>
            {/* Left. Inside a game the wordmark steps back to just the mark — the game
                is the headline there, and it's what leaves the capsule room to breathe
                on a narrow phone. */}
            <View style={styles.logo}>
                <Link href={ROUTES.home as RelativePathString}>
                    <Logo includeAppName={game === null} />
                </Link>
            </View>

            {/* Right — the game you're inside, or the app version. */}
            <HeaderStatus
                label={game?.name ?? APP_VERSION}
                accent={game?.color ?? Colors.light.available}
                language={language}
            />
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        height: 75,
        flexDirection: 'row',
        justifyContent: "space-between",
        alignItems: 'center',
        width: '100%',
        gap: Spacing.two
    },
    logo: {
        flexShrink: 0
    }
})

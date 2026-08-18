import { gameForPathname } from "@/constants/games";
import { DEFAULT_LANGUAGE, languageByCode } from "@/constants/languages";
import { ROUTES } from "@/constants/routes";
import { Spacing } from "@/constants/theme";
import { useAuth } from "@/features/auth/useAuth";
import { Link, RelativePathString, usePathname } from "expo-router";
import { StyleSheet, View } from "react-native";
import HeaderStatus from "./HeaderStatus";
import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";
import UserPill from "./UserPill";

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
                is the headline there, and it's what leaves the right-hand side room to
                breathe on a narrow phone. */}
            <View style={styles.logo}>
                <Link href={ROUTES.home as RelativePathString}>
                    <Logo includeAppName={game === null} />
                </Link>
            </View>

            <View style={styles.right}>
                {/* Outside a game the corner is about you; inside one it is about the
                    game you are in. Both wear the same pill, so the slot doesn't jump
                    as you move between them. */}
                {game === null ? (
                    <UserPill />
                ) : (
                    <HeaderStatus
                        label={game.name}
                        accent={game.color}
                        language={language}
                    />
                )}

                <ThemeToggle />
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        height: 66,
        flexDirection: 'row',
        justifyContent: "space-between",
        alignItems: 'center',
        width: '100%',
        gap: Spacing.two
    },
    logo: {
        flexShrink: 0
    },
    right: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two,
        // The pill inside this is the only thing on the row that gives ground, so this
        // has to be shrinkable for it to have anything to shrink into.
        flexShrink: 1
    }
})

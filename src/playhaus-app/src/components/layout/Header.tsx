import { gameForPathname } from "@/constants/games";
import { ROUTES } from "@/constants/routes";
import { Spacing } from "@/constants/theme";
import { Link, RelativePathString, usePathname } from "expo-router";
import { StyleSheet, View } from "react-native";
import BackChip from "./BackChip";
import ContextPill from "./ContextPill";
import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";
import UserPill from "./UserPill";

/**
 * A game's own front page — `/games/{slug}` exactly, not the screens under it.
 *
 * That page is the one the design gives a back chip to, because it is the only one whose
 * way out is the home list. The screens below it already carry their own way back, and a
 * second one in the chrome would be two answers to the same question.
 */
function isGameHub(pathname: string): boolean {
    return /^\/games\/[^/]+$/.test(pathname);
}

export default function Header() {
    const pathname = usePathname();

    // Read off the route rather than pushed up by each page: the header already knows
    // where it is, and a page that forgot to say so used to leave the previous page's
    // name sitting in the chrome.
    const game = gameForPathname(pathname);

    return (
        <View style={styles.container}>
            {/* Left. A game's front page swaps the wordmark for the way out of it —
                inside a game the app's name is not the thing you need. */}
            <View style={styles.left}>
                {game !== null && isGameHub(pathname) ? (
                    <BackChip href={ROUTES.home as RelativePathString} />
                ) : (
                    <Link href={ROUTES.home as RelativePathString}>
                        <Logo includeAppName={game === null} />
                    </Link>
                )}
            </View>

            <View style={styles.right}>
                {/* Outside a game the corner is about you; inside one it is about the
                    game you are in. Both wear the same pill, so the slot doesn't jump
                    as you move between them. */}
                {game === null ? (
                    <UserPill />
                ) : (
                    <ContextPill accent={game.color} label={game.name} />
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
    left: {
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

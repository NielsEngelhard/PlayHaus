import { headerContextFor } from "@/constants/header-context";
import { ROUTES } from "@/constants/routes";
import { Spacing } from "@/constants/theme";
import { Link, RelativePathString, usePathname } from "expo-router";
import { StyleSheet, View } from "react-native";
import BackChip from "./BackChip";
import ContextPill from "./ContextPill";
import GameMark from "./GameMark";
import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";
import UserPill from "./UserPill";

export default function Header() {
    const pathname = usePathname();

    // Everything the header knows about where it is, worked out from the route. See
    // `header-context.ts` for why it is read rather than pushed.
    const context = headerContextFor(pathname);

    // A screen that draws its own chrome, like a board mid-round. Nothing here at all,
    // so the page starts at the top of the viewport rather than 66pt down it.
    if (context === null) return null;

    const { back, pill, mark } = context;

    return (
        <View style={styles.container}>
            {/* Left. A screen with a way out swaps the wordmark for it — once you are
                inside something, the app's name is not what you need. */}
            <View style={styles.left}>
                {back === null ? (
                    <Link href={ROUTES.home as RelativePathString}>
                        <Logo includeAppName={pill === null} />
                    </Link>
                ) : (
                    <BackChip href={back as RelativePathString} />
                )}
            </View>

            <View style={styles.right}>
                {/* On a game's own front page the corner is the game's mark; inside
                    something else it is about that; outside either, about you. */}
                {mark !== undefined ? (
                    <GameMark letter={mark.letter} accent={mark.accent} label={mark.label} />
                ) : pill === null ? (
                    <UserPill />
                ) : (
                    <ContextPill
                        accent={pill.accent}
                        label={pill.label}
                        icon={pill.icon}
                        filled={pill.filled}
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

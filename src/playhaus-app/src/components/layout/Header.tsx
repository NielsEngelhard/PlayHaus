import { headerContextFor } from "@/constants/header-context";
import { ROUTES } from "@/constants/routes";
import { HeaderHeight, Spacing } from "@/constants/theme";
import { Link, RelativePathString, usePathname } from "expo-router";
import { StyleSheet, View } from "react-native";
import BackChip from "./BackChip";
import ContextPill from "./ContextPill";
import GameMark from "./GameMark";
import Logo from "./Logo";
import MusicToggle from "./MusicToggle";
import ThemeToggle from "./ThemeToggle";
import UserPill from "./UserPill";

export default function Header() {
    const pathname = usePathname();

    // Everything the header knows about where it is, worked out from the route.
    const { back, pill, mark } = headerContextFor(pathname);

    return (
        <View style={styles.container}>
            {/* Left. */}
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
                {/* On a game's own front page the corner is the game's mark. */}
                {mark !== undefined ? (
                    <GameMark icon={mark.icon} label={mark.label} />
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

                {/* Renders nothing unless there is music to silence. */}
                <MusicToggle />

                <ThemeToggle />
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        height: HeaderHeight,
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
        // The pill inside this is the only thing on the row that gives ground.
        flexShrink: 1
    }
})

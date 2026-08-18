import { ROUTES } from "@/constants/routes";
import { BottomBarHeight, Spacing } from "@/constants/theme";
import { useTheme } from "@/features/theme/ThemeContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import Feather from "@expo/vector-icons/Feather";
import { Link, RelativePathString, usePathname, type Href } from "expo-router";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Tab {
    icon: keyof typeof Feather.glyphMap,
    /** The bar is icon-only, so this exists for screen readers rather than the eye. */
    label: string,
    href: Href,
    /** Extra path prefixes that should also light this tab up. */
    alsoMatches?: string[]
}

const TABS: Tab[] = [
    { icon: 'grid', label: 'Alle games', href: ROUTES.home as RelativePathString, alsoMatches: ['/games'] },
    { icon: 'wifi', label: 'Reconnect', href: ROUTES.reconnect as RelativePathString  },
    { icon: 'users', label: 'Vrienden', href: ROUTES.friends as RelativePathString },
    { icon: 'settings', label: 'Profiel', href: ROUTES.profile as RelativePathString }
]

/** Does `pathname` sit at `prefix` or somewhere underneath it? */
function isUnder(pathname: string, prefix: string): boolean {
    return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

function isActive(tab: Tab, pathname: string): boolean {
    const path = String(tab.href)

    // '/' is a prefix of every route, so home has to match exactly — its `alsoMatches`
    // then claims the game pages, which are what the games list navigates into.
    const own = path === '/' ? pathname === '/' : isUnder(pathname, path)

    return own || (tab.alsoMatches?.some(prefix => isUnder(pathname, prefix)) ?? false)
}

/**
 * The app's primary navigation: a floating pill fixed to the bottom of every screen.
 * Where `Header` is the identity row and `BackButton` walks back up one page, this is how
 * you move between the app's four sections.
 *
 * It overlays the page instead of sitting in the layout flow, so anything scrollable
 * has to pad past `BottomBarHeight` — the root layout does this for the shared ScrollView.
 */
export default function BottomBar() {
    const theme = useTheme();
    const styles = useStyles();

    const insets = useSafeAreaInsets()
    const pathname = usePathname()

    return (
        // `box-none` so the empty margins either side of the pill stay transparent to
        // touches and the page keeps scrolling underneath.
        <View
            pointerEvents="box-none"
            style={[styles.wrapper, { paddingBottom: Spacing.three + insets.bottom }]}
        >
            <View style={styles.bar}>
                {TABS.map(tab => {
                    const active = isActive(tab, pathname)

                    return (
                        <Link key={tab.label} href={tab.href} asChild>
                            <Pressable
                                style={styles.item}
                                accessibilityRole='link'
                                accessibilityLabel={tab.label}
                                accessibilityState={{ selected: active }}
                            >
                                <View style={[styles.icon, active && styles.iconActive]}>
                                    <Feather
                                        name={tab.icon}
                                        size={22}
                                        color={active ? theme.colors.textOnAccent : theme.colors.textSecondary}
                                    />
                                </View>
                            </Pressable>
                        </Link>
                    )
                })}
            </View>
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    wrapper: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        paddingHorizontal: Spacing.three
    },
    bar: {
        width: '100%',
        // Lines the pill up with the content column in the root layout.
        maxWidth: 600,
        height: BottomBarHeight,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingHorizontal: Spacing.two,
        borderRadius: 999,
        borderWidth: 2,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.backgroundSecondary,
        ...theme.shadows.hardLarge
    },
    item: {
        flex: 1,
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center'
    },
    icon: {
        width: 44,
        height: 44,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center'
    },
    iconActive: {
        backgroundColor: theme.colors.primary,
        borderWidth: 2,
        borderColor: theme.colors.border,
        ...theme.shadows.hard
    }
}))
